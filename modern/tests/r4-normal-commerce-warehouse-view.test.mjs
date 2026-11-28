import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadNormalCommerceAuditSources as loadBaseSources} from './support/r4-source-inputs.mjs';
import {readFile} from 'node:fs/promises';
import {normalizeLocalSourceText} from '../src/local-source-text.mjs';
async function loadNormalCommerceAuditSources(){
 const read=async n=>normalizeLocalSourceText(await readFile(new URL('./original-perl/'+n,import.meta.url),'utf8'));
 const base=Object.fromEntries(Object.entries(await loadBaseSources()).map(([k,v])=>[k,normalizeLocalSourceText(v)]));
 return {...base,originalStockViewSource:await read('core-stock.cgi'),originalMarketSurveySource:await read('core-shop-c.cgi'),originalItemDetailViewSource:await read('core-item-detail.cgi'),originalShowcaseViewSource:await read('core-inc-sc.cgi')};
}
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {createPeriodMemoryWorld,createSourceReviewedMemoryWorldAdapter,executeMemoryCommand} from '../src/game-core-contract.mjs';
import {reviewOriginalPeriodBootstrap,createOriginalPeriodSeed} from '../src/original-period-world-seed.mjs';
import {calculateSourceMarketStatus} from '../src/shared-source-market-status.mjs';
import {originalMarketBalance,originalMarketGraph} from '../src/original-r4-warehouse-view.mjs';

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
 'push @rows,{id=>$id,stock=>0+$it->{todaystock},price=>0+$it->{marketprice},point=>$p,graph=>GetMarketStatusGraph($p,1),rawPoint=>0+$it->{uppoint},low=>0+$it->{marketpricelow},high=>0+$it->{marketpricehigh},today=>0+$it->{todaysale},yesterday=>0+$it->{yesterdaysale},survey=>exists($marketitemlist{$id})?1:0};}',
 'print encode_json(\\@rows);',
].join('\n');
test('R4 warehouse retail status follows original weighted shelves and active EVENT with pure read-only state',async()=>{
 const input=await loadNormalCommerceAuditSources();
 const opts={...input,enableReviewedNormalTime:true,enableReviewedCrossPeriod:true,enableReviewedMarketCommerce:true};
 const street=createStandardStreetModule(opts);
 assert.equal(typeof street.describeWarehouse,'function');
 assert.equal(createStandardStreetModule(input).describeWarehouse,undefined);
 assert.throws(()=>createStandardStreetModule({...opts,originalMarketSource:input.originalMarketSource+'\n'}),/source drift/);
 assert.throws(()=>createStandardStreetModule({...opts,originalMarketSurveySource:input.originalMarketSurveySource+'\n'}),/source drift marketSurveySource/);
 assert.ok(input.originalMarketSurveySource.includes('values(%marketitemlist)'));
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
   assert.equal(view.marketItems.length,79);
   assert.equal(view.marketItems.find(x=>x.itemId===9).saleWarning,'not-listable');
   assert.equal(view.marketItems.find(x=>x.itemId===65).saleWarning,'no-sales');
   assert.equal(view.marketItems.find(x=>x.itemId===1).saleWarning,boom?null:'rare-sales');
   assert.equal(view.marketItems.find(x=>x.itemId===40).saleWarning,null);
   const shelves=street.describeShowcase(world);
   assert.deepEqual(shelves.rows.map(x=>[x.shelf,x.itemId,x.taxRate,x.tax]),[[0,40,0,0],[1,40,3,54],[2,1,0,0],[3,65,0,0]]);
   assert.deepEqual(view.survey.map(x=>x.itemId).sort((a,b)=>a-b),[1,40,65]);
   for(const row of view.marketItems){
     const expected=oracle[row.itemId-1];
     assert.deepEqual([row.displayedStock,row.marketPrice??0,row.supplyPoint,row.lowestPrice??0,row.highestPrice??0,row.soldToday,row.soldYesterday],[expected.stock,expected.price,expected.rawPoint,expected.low,expected.high,expected.today,expected.yesterday]);
     assert.equal(view.survey.some(x=>x.itemId===row.itemId),Boolean(expected.survey));
     if(row.displayedStock){
       const shared=calculateSourceMarketStatus({stock:row.displayedStock,weightedPrice:row.itemId===40?30000:row.displayedStock*row.marketPrice,popular:row.popularSeconds,population:world.period.dtPeople,saleSpeed:12});
       assert.deepEqual(shared,{marketprice:row.marketPrice,uppoint:row.supplyPoint});
     }
   }
   assert.equal(view.marketItems.find(x=>x.itemId===41).supplyPoint,0);
   assert.deepEqual(view.marketItems.find(x=>x.itemId===41).balance,{label:'不足',percent:110});
   for(const row of view.rows){
     const expected=oracle[row.itemId-1];
     assert.deepEqual([row.displayedStock,row.marketPrice??0,row.supplyPoint],[expected.stock,expected.price,expected.point]);
     const label={飽和:'飽和',不足:'不足',平衡:'均衡'}[row.balance.label];
     assert.equal(label+(row.balance.percent===null?' ':'  '+row.balance.percent+'%'),expected.graph);
     assert.equal(row.compiledCost,numeric[row.itemId-1].cost);
   }
   world.shops[0].trush=5000000;assert.equal(street.describeWarehouse(world).blocked,false);
   world.shops[0].trush++;const blocked=street.describeWarehouse(world);assert.deepEqual(blocked.rows,[]);assert.deepEqual(blocked.survey,view.survey);
 }
});
test('source retail balance thresholds and mobile percentage preserve original discontinuities',()=>{
 assert.deepEqual([0,10,90,91,100,109,110,1000].map(originalMarketBalance),[
  {label:'不足',percent:110},{label:'不足',percent:100},{label:'不足',percent:20},{label:'平衡',percent:null},
  {label:'平衡',percent:null},{label:'平衡',percent:null},{label:'飽和',percent:11},{label:'飽和',percent:100},
 ]);
});


test('source desktop supply graph matches all 1001 original widths, labels and compact text',async()=>{
 const input=await loadNormalCommerceAuditSources();
 const perl=['use utf8;use JSON::PP;no strict;no warnings;local $/;my $s=decode_json(<STDIN>);','sub l {$_[0]} eval $s;die $@ if $@;','$MOBILE=0;$IMAGE_URL="/original";my @out;','for my $p (0..1000){push @out,[GetMarketStatusGraph($p),GetMarketStatusGraph($p,1)]}print encode_json(\\@out);'].join('\n');
 const expected=JSON.parse(execFileSync('perl',['-e',perl],{encoding:'utf8',input:JSON.stringify(input.originalMarketSource)}));
 for(let p=0;p<=1000;p++){
  const {type,left,bar,right}=originalMarketGraph(p),b=originalMarketBalance(p);
  const image=(kind,width)=>'<img src="/original/'+kind+'.gif" width="'+width+'" height="12">';
  const html=type?(left?image('t',left):'')+(left===50?' 飽和 ':'')+image(type===1?'b':'r',bar)+(right===50?' 不足 ':'')+(right?image('t',right):''):image('t',50)+' 均衡 '+image('t',50);
  assert.deepEqual([html,(b.label==='平衡'?'均衡':b.label)+' '+(b.percent===null?'':' '+b.percent+'%')],expected[p],'source point '+p);
 }
});
