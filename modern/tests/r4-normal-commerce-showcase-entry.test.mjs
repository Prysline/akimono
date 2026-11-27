import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';
test('source inc-sc.cgi actual HTML carries stocked shelf number and price, not sold-out links',async()=>{
 const source=await readFile(new URL('./original-perl/core-inc-sc.cgi',import.meta.url),'utf8');
 assert.equal(createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0').update(source).digest('hex'),'2e328443f3f83bd862f56a540e1357b31917651d');
 const script=await readFile(new URL('../local-ui/app.js',import.meta.url),'utf8');
 const code=script.slice(script.indexOf('function sourceShelfItemTarget('),script.indexOf('function openItem('));
 const target=new Function(code+';return sourceShelfItemTarget;')();
 const perl=[
 'use utf8;use JSON::PP;no strict;no warnings;local $/;my $in=decode_json(<STDIN>);',
 'sub l {$_[0]} sub GetMoneyString {$_[0]} sub GetUserTaxRate {0} sub GetSaleTax {return (0,0)} sub GetTagImgItemType {""}',
 '$DT=$in->{shop};$Q{key}="main";$USERPASSURL="u=f";$ITEM[79]={name=>"gift",price=>10000,scale=>"x"};$ITEM[10]={name=>"book",price=>5000,scale=>"x"};',
 'eval $in->{source};die $@ if $@;my @out;while($disp =~ /key=item&u=f&no=(\\d+)&sc=(\\d+)&pr=(\\d+)&bk=main/g){push @out,{itemId=>0+$1,shelf=>$2-1,price=>0+$3}}print encode_json(\\@out);',
 ].join('\n');
 const shop={showcasecount:4,showcase:[79,79,10,0],price:[10000,12345,5000,0],item:Array(79).fill(0)};
 shop.item[78]=3;
 const original=JSON.parse(execFileSync('perl',['-e',perl],{encoding:'utf8',input:JSON.stringify({source,shop})}));
 assert.deepEqual(original,[{itemId:79,shelf:0,price:10000},{itemId:79,shelf:1,price:12345}]);
 assert.deepEqual(shop.showcase.map((_,i)=>target({reviewedFullCommerce:true,shop},i)).filter(Boolean),original);
});
test('controlled HTTP reprices only selected stocked shelf and retains CAS and reload',async t=>{
 const p=await genuinePlayer(t,{now:'896401',crossPeriod:true,fullCommerce:true});
 assert.ok(p.stock(79)>0);
 await p.use(63,1);
 assert.equal(p.state.shop.showcasecount,2);
 for(const [shelf,priceOverride] of [[0,10000],[1,12345]]){
  await p.enoughTime(p.state.showcaseEditTimeSeconds);
  const result=await p.post('/api/showcase',{expectedRevision:p.state.world.revision,itemId:79,shelf,per:100,priceOverride});
  assert.equal(result.ok,true,JSON.stringify(result.details));
 }
 assert.deepEqual(p.state.shop.showcase,[79,79]);assert.deepEqual(p.state.shop.price,[10000,12345]);
 await p.enoughTime(p.state.showcaseEditTimeSeconds);
 const before=structuredClone(p.state.world);
 const fields={itemId:79,shelf:1,per:100,priceOverride:13579};
 const stale=await p.post('/api/showcase',{...fields,expectedRevision:before.revision-1});
 assert.equal(stale.ok,false);assert.deepEqual(p.state.world,before);
 const edited=await p.post('/api/showcase',{...fields,expectedRevision:before.revision});
 assert.equal(edited.ok,true,JSON.stringify(edited.details));
 assert.deepEqual(p.state.shop.price,[10000,13579]);assert.deepEqual(p.state.shop.showcase,[79,79]);
 assert.deepEqual(p.state.shop.item,before.shops[0].item);
 assert.equal(p.state.shop.time,Math.max(before.shops[0].time,before.nowSeconds-72*3600)+p.state.showcaseEditTimeSeconds);
 const reloaded=await p.saveAndRestart(0);assert.deepEqual(reloaded.shops[0].price,[10000,13579]);
});
