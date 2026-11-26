import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadNormalCommerceAuditSources} from '../scripts/audit-normal-commerce.mjs';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {createPeriodMemoryWorld,createSourceReviewedMemoryWorldAdapter,executeMemoryCommand} from '../src/game-core-contract.mjs';
import {reviewOriginalPeriodBootstrap,createOriginalPeriodSeed} from '../src/original-period-world-seed.mjs';
import {originalMarketBalance} from '../src/original-r4-warehouse-view.mjs';

// Actual frozen compiler numeric ITEM metadata and original GetMarketStatus,
// GetMarketStatusGraph. Only the locale formatter is a stub. No player proof.
const perl=[
 'use utf8;use JSON::PP;no strict;no warnings;',
 'local $/;my $in=decode_json(<STDIN>);',
 'sub l {$_[0]}',
 'eval $in->{source};die $@ if $@;',
 '$DTpeople=$in->{people};$SALE_SPEED=12;$MOBILE=1;',
 '@DT=($in->{shop});@ITEM=({},@{$in->{items}});',
 'if($in->{boom}){for my $id (@{$in->{boomIds}}){$ITEM[$id]{popular}=int($ITEM[$id]{popular}/1.5)}}',
 'GetMarketStatus();my @rows;',
 'for my $id (1..79){my $it=$ITEM[$id];my $p=$it->{uppoint}||10;',
 'push @rows,{id=>$id,stock=>0+$it->{todaystock},price=>0+$it->{marketprice},point=>$p,graph=>GetMarketStatusGraph($p,1)};}',
 'print encode_json(\\@rows);',
].join('\n');
test('R4 warehouse retail status follows original weighted shelves and active EVENT with pure read-only state',async()=>{
 const input=await loadNormalCommerceAuditSources();
 const opts={...input,enableReviewedNormalTime:true,enableReviewedFullCommerce:true};
 const street=createStandardStreetModule(opts);
 assert.equal(typeof street.describeWarehouse,'function');
 assert.equal(createStandardStreetModule(input).describeWarehouse,undefined);
 assert.throws(()=>createStandardStreetModule({...opts,originalMarketSource:input.originalMarketSource+'\n'}),/source drift/);
 const period=createOriginalPeriodSeed(reviewOriginalPeriodBootstrap({periodSource:input.originalPeriodSource,adminSource:input.originalAdminInitSource,readSource:input.originalDataReadSource,writeSource:input.originalDataWriteSource,reviewedB41:street.reviewedB41}));
 const repo=createSourceReviewedMemoryWorldAdapter({initialWorld:createPeriodMemoryWorld({worldId:'controlled-warehouse-view',streetId:street.id,nowSeconds:1000000,period}),streetModule:street});
 for(const [kind,fields] of [['initialize-source-market',{}],['open-shop',{shopId:1,ownerName:'來源測試',shopName:'受控倉庫'}]]){
   const r=executeMemoryCommand({repository:repo,streetModule:street,command:{kind,expectedRevision:repo.read().revision,...fields}});
   assert.equal(r.ok,true,JSON.stringify(r.details));
 }
 const numeric=JSON.parse(execFileSync('perl',['original-normal-commerce-item-compiler.pl'],{cwd:fileURLToPath(new URL('./original-perl/',import.meta.url)),encoding:'utf8'}));
 const source=input.originalStockViewSource;
 assert.ok(source.includes('next if (!$DTitem->[$no-1] && !$DTitemtoday->{$no} && !$DTexp->{$no});'));
 assert.ok(source.includes('if ($ITEM->{flag}=~/s/)'));
 assert.ok(source.includes('if ($DT->{trush} > 5000000)'));
 for(const boom of [false,true]){
   const world=structuredClone(repo.read()),shop=world.shops[0];
   shop.item.fill(0);shop.item[0]=30;shop.item[39]=10;shop.item[64]=1;shop.item[8]=1;
   shop.showcasecount=4;shop.showcase=[40,40,1,65];shop.price=[1200,1800,50,50000];
   shop.itemtoday={'41':2};shop.itemyesterday={'42':3,'41':1};shop.exp={'43':29};
   if(boom)world.period.eventState={'boom-posyon':world.nowSeconds+3600};
   const before=structuredClone(world),view=street.describeWarehouse(world);
   assert.deepEqual(world,before);
   const byId=new Map(view.rows.map(row=>[row.itemId,row]));
   assert.deepEqual([...byId.keys()].sort((a,b)=>a-b),[1,9,40,41,43,65]);
   assert.equal(byId.get(9).storage,true);assert.equal(byId.get(41).count,0);
   assert.equal(byId.get(41).soldToday,2);assert.equal(byId.get(41).soldYesterday,1);
   assert.equal(byId.get(43).experience,29);assert.equal(byId.has(42),false);
   assert.equal(byId.get(40).displayedStock,20);assert.equal(byId.get(40).marketPrice,1500);
   assert.equal(byId.get(40).compiledCost,120);assert.equal(byId.get(65).supplyPoint,100);
   const oracle=JSON.parse(execFileSync('perl',['-e',perl],{encoding:'utf8',input:JSON.stringify({source:input.originalMarketSource,people:world.period.dtPeople,shop,items:numeric,boom,boomIds:[1]})}));
   for(const row of view.rows){
     const expected=oracle[row.itemId-1];
     assert.deepEqual([row.displayedStock,row.marketPrice??0,row.supplyPoint],[expected.stock,expected.price,expected.point]);
     const label={飽和:'飽和',不足:'不足',平衡:'均衡'}[row.balance.label];
     assert.equal(label+(row.balance.percent===null?' ':'  '+row.balance.percent+'%'),expected.graph);
     assert.equal(row.compiledCost,numeric[row.itemId-1].cost);
   }
   world.shops[0].trush=5000000;assert.equal(street.describeWarehouse(world).blocked,false);
   world.shops[0].trush++;assert.deepEqual(street.describeWarehouse(world).rows,[]);
 }
});
test('source retail balance thresholds and mobile percentage preserve original discontinuities',()=>{
 assert.deepEqual([10,90,91,100,109,110,1000].map(originalMarketBalance),[
  {label:'不足',percent:100},{label:'不足',percent:20},{label:'平衡',percent:null},
  {label:'平衡',percent:null},{label:'平衡',percent:null},{label:'飽和',percent:11},{label:'飽和',percent:100},
 ]);
});
