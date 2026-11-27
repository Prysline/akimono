import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
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
 assert.deepEqual(shop.showcase.map((_,i)=>target({shop},i)).filter(Boolean),original);
});

test('F1 opening two shelves of the same product retains each actual price and return target',async()=>{
 const script=await readFile(new URL('../local-ui/app.js',import.meta.url),'utf8');
 const code=script.slice(script.indexOf('function openItem('),script.indexOf('function renderItemInfo('));
 const run=new Function(code+`
 let selectedItemId=null,selectedUseId=null,selectedShelfIndex=0,pendingShelfIndex=2,
     itemBackTab='stock',lastPricingItemId=79;
 const fields={};let tab;
 const $=id=>fields[id]??=( {});
 const text=(id,value)=>$(id).textContent=value;
 const selectTab=name=>{tab=name;};
 const result=()=>({selectedItemId,selectedShelfIndex,pendingShelfIndex,itemBackTab,lastPricingItemId,
  tab,label:fields['back-to-stock'].textContent,price:fields['shelf-price-direct']?.value});
 return {openItem,result};
 `)();
 run.openItem(79,{shelf:0,price:10000});
 assert.deepEqual(run.result(),{selectedItemId:79,selectedShelfIndex:0,pendingShelfIndex:null,itemBackTab:'shop',lastPricingItemId:null,tab:'item',label:'［返回店內］',price:'10000'});
 run.openItem(79,{shelf:1,price:12345});
 assert.equal(run.result().selectedShelfIndex,1);
 assert.equal(run.result().price,'12345');
 run.openItem(10);
 assert.equal(run.result().selectedShelfIndex,0);
 assert.equal(run.result().itemBackTab,'stock');
 assert.equal(run.result().label,'［返回倉庫］');
 assert.match(script,/selectTab\(itemBackTab\)/);
 assert.match(script,/pendingShelfIndex=shelf;/);
 assert.match(script,/if\(target\)openItem\(target.itemId,target\)/);
});
