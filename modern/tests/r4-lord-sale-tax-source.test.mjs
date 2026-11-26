import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createStandardStreetModule}
  from '../src/standard-street-module.mjs';
import {projectSharedNaturalSale}
  from '../src/shared-natural-sale-core.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const paths=[
  ['itemDsl','custom/inc-item-data.cgi'],
  ['rebelDsl','custom/inc-rebel-data.cgi'],
  ['originalAdminInitSource','modern/tests/original-perl/core-inc-admin-func.cgi'],
  ['originalDataReadSource','modern/tests/original-perl/inc-func.cgi'],
  ['originalDataWriteSource','modern/tests/original-perl/write.cgi'],
  ['originalTurnSource','modern/tests/original-perl/inc-turn.cgi'],
  ['originalWholeSource','modern/tests/original-perl/whole.cgi'],
  ['originalConfigSource','_config.cgi'],
  ['originalCompilerSource','modern/tests/original-perl/inc-makeitem.cgi'],
  ['originalBuySource','modern/tests/original-perl/buy-s.cgi'],
  ['originalBuyItemSource','modern/tests/original-perl/item.cgi'],
  ['originalBuyCalcSource','modern/tests/original-perl/calc.cgi'],
  ['originalMarketSource','modern/tests/original-perl/market.cgi'],
  ['originalItemSource','modern/tests/original-perl/item.cgi'],
  ['originalDetailSource','modern/tests/original-perl/core-detail.cgi'],
  ['originalUseSource','modern/tests/original-perl/use.cgi'],
  ['originalItemHelperSource','modern/tests/original-perl/core-inc-item.cgi'],
];
const source=Object.fromEntries(await Promise.all(paths.map(
  async ([k,p])=>[k,await readFile(path.join(root,p),'utf8')])));
const street=createStandardStreetModule(source);
import {reviewR4LordSaleTax,createR4LordSaleTaxContext,projectR4LordSaleTax}
  from '../src/original-r4-lord-sale-tax.mjs';
const pins={detail:source.originalDetailSource,item:source.originalItemSource,turn:source.originalTurnSource};
const reviewed=reviewR4LordSaleTax(pins);
const originalDir=path.join(root,'modern/tests/original-perl');
const cases=[];
for(const townTaxRate of [0,1,20,40])
 for(const taxMode of [undefined,0,1,2])
  for(const eventState of [{},{rebel:1259200}])
   for(const listed of [1,50,99,100,101,150,200,500]){
    cases.push({townTaxRate,taxMode,eventState,basePrice:100,count:3,gross:listed*3});
   }
const oracle=JSON.parse(execFileSync('perl',['original-r4-lord-sale-tax-probe.pl'],{
 cwd:originalDir,input:JSON.stringify(cases),encoding:'utf8'}));
test('R4 frozen GetUserTaxRate/GetSaleTax: 256 exact source combinations',()=>{
 assert.equal(cases.length,256);assert.equal(oracle.length,cases.length);
 for(const [i,row] of cases.entries()){
  const context=createR4LordSaleTaxContext({reviewed,...row});
  assert.deepEqual(projectR4LordSaleTax({context,...row}),oracle[i],JSON.stringify(row));
 }
 // Exemption/war removes only lord tax; price markup still taxed.
 assert.equal(oracle[cases.findIndex(c=>c.townTaxRate===40&&c.taxMode===1&&!c.eventState.rebel&&c.gross===600)].taxRate,5);
 assert.equal(oracle[cases.findIndex(c=>c.townTaxRate===40&&c.taxMode===2&&!c.eventState.rebel&&c.gross===1500)].taxRate,99);
});
test('R4 lord tax source and context reject unknown inputs',()=>{
 for(const k of Object.keys(pins))assert.throws(()=>reviewR4LordSaleTax({...pins,[k]:pins[k]+' '}),/source drift/);
 const args={reviewed,townTaxRate:40,taxMode:2,eventState:{}};
 for(const change of [{reviewed:{...reviewed}},{townTaxRate:41},{townTaxRate:'40'},{taxMode:3},{eventState:null},{eventState:{rebel:0}},{eventState:{guildbattle:1}}])
  assert.throws(()=>createR4LordSaleTaxContext({...args,...change}),/R4 lord sale tax/);
 const context=createR4LordSaleTaxContext(args);
 for(const change of [{context:{...context}},{count:0},{gross:5,count:2},{basePrice:0},{gross:Number.MAX_SAFE_INTEGER}])
  assert.throws(()=>projectR4LordSaleTax({context,count:2,gross:200,basePrice:100,...change}),/R4 lord sale tax/);
});
const rows=JSON.parse(execFileSync('perl',['original-r3-multi-shelf-sale-probe.pl','--lord-tax-audit'],{
 cwd:originalDir,encoding:'utf8'})).cases;
test('R4 actual frozen natural-sale tax oracle covers 2/4/8 shelves and five policies each',()=>{
 assert.equal(rows.length,15);
 for(const n of [2,4,8]){
  const group=rows.filter(r=>r.shown.length===n);
  assert.equal(group.length,5);
  assert.ok(group.every(r=>r.saletoday>0),'must actually sell in each source fixture');
  const [zero,normal,free,double,war]=group;
  assert.equal(zero.taxtoday,free.taxtoday);assert.equal(zero.taxtoday,war.taxtoday);
  assert.ok(normal.taxtoday>zero.taxtoday);assert.ok(double.taxtoday>normal.taxtoday);
  for(const r of group)assert.equal(r.saletoday,zero.saletoday);
 }
});
for(const row of rows)test('R4 original natural-sale tax: '+row.name,()=>{
 const item=Array(79).fill(0);
 for(const [id,stock] of Object.entries(row.startingStocks))item[Number(id)-1]=stock;
 item[78]=5;
 const shop={id:1,status:1,rank:5010,money:100000-10000*row.shown.length,
  paytoday:10000*row.shown.length,item,showcasecount:row.shown.length,
  showcase:[...row.shown],price:[...row.prices],trush:0,saletoday:0,taxtoday:0,
  costtoday:0,itemtoday:{},itemyesterday:{},taxmode:row.taxMode};
 const before=structuredClone(shop);
 const lordTaxContext=createR4LordSaleTaxContext({reviewed,townTaxRate:row.taxRate,taxMode:row.taxMode,
  eventState:row.rebel?{rebel:1259200}:{}});
 const args={shop,saleRules:street.reviewedB41.saleRules,upkeepCosts:street.reviewedB41.upkeepCosts,
  spanSeconds:1800,randomDraws:row.consumedSamples,recordShelfSales:true};
 const result=projectSharedNaturalSale({...args,lordTaxContext});
 const legacy=projectSharedNaturalSale(args);
 for(const key of ['money','rank','temprank','trush','saletoday','taxtoday'])
  assert.equal(result.shop[key],row[key],key);
 for(const id of [10,40,41]){
  assert.equal(result.shop.item[id-1],row.stockAfter[id]);
  assert.equal(result.shop.itemtoday[id]??0,row.soldByItem[id]);
  assert.equal(result.shop._sale_count_[id]?.price??0,row.saleRecordGross[id]);
 }
 assert.ok(Math.abs(result.shop.costtoday-row.costtoday)<1e-9);
 assert.equal(result.drawsUsed,row.naturalDrawsUsed);
 assert.equal(result.drawsUsed,legacy.drawsUsed);
 assert.equal(result.shop.saletoday,legacy.shop.saletoday);
 assert.equal(result.shop.money+result.shop.taxtoday,legacy.shop.money+legacy.shop.taxtoday);
 assert.equal(result.shelfSales.reduce((sum,s)=>sum+s.tax,0),result.shop.taxtoday);
 assert.deepEqual(shop,before);
 assert.throws(()=>projectSharedNaturalSale({...args,lordTaxContext:{...lordTaxContext}}),/reviewed context/);
 assert.throws(()=>projectSharedNaturalSale({...args,shop:{...shop,taxmode:3},lordTaxContext}),/reviewed context/);
});

import {loadStandardStreetModel} from '../src/standard-street-model.mjs';
import {compileReviewedGiftMapUse} from '../src/reviewed-gift-map-use.mjs';
import {reviewOriginalCompiledEventCatalog} from '../src/original-event-compiled-catalog.mjs';
import {reviewR4RebelNow} from '../src/original-r4-rebel-now.mjs';
import {reviewOriginalSoloPeriodPhaseChain,projectOriginalSoloPeriodPhaseChain} from '../src/original-period-solo-chain.mjs';
import {reviewLordInside,projectLordInside} from './support/r4-lord-inside-candidate.mjs';

test('R4 original lord inside -> actual natural sales -> two original period prefixes: same taxes credited once',async()=>{
 const periodSources={
  periodSource:await readFile(path.join(originalDir,'period.cgi'),'utf8'),
  configSource:source.originalConfigSource,itemDsl:source.itemDsl,rebelDsl:source.rebelDsl,
  compilerSource:source.originalCompilerSource,originalAddItemSource:source.originalUseSource,
  detailSource:source.originalDetailSource,readSource:source.originalDataReadSource,
  adminSource:source.originalAdminInitSource,turnSource:source.originalTurnSource,
 };
 const model=loadStandardStreetModel(source.itemDsl,source.rebelDsl);
 const compiled=compileReviewedGiftMapUse({itemDsl:source.itemDsl,rebelDsl:source.rebelDsl,model});
 const compiledCatalog=reviewOriginalCompiledEventCatalog(periodSources);
 const reviewedRebelNow=reviewR4RebelNow({...periodSources,compiledCatalog});
 const periodReview=reviewOriginalSoloPeriodPhaseChain({...periodSources,model,
  bootstrapMeta:'500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0',
  compiledLimits:compiled.limits.map(it=>it.limit),
  includeReviewedDignity:true,includeReviewedShopExpiry:true,includeReviewedSaleTax:true,
  includeReviewedMultiShelf:true,reviewedRebelNow});
 const insideReview=reviewLordInside(await readFile(path.join(originalDir,'pinned-lord-s.cgi'),'utf8'));
 const requests=[],jsSales=[];
 for(const sale of rows){
  const fixture={revision:5,taxRate:0,
   town:{leader:1,money:5000000,in:0,out:0,develop:5001,devem:0,safety:5001,safem:0,army:10000,robina:2000,robinb:0},
   actor:{id:1,name:'Owner',money:100000,time:956800},eventState:sale.rebel?{rebel:1259200}:{}};
  const command={kind:'lord-inside',expectedRevision:5,actorId:1,taxrate:String(sale.taxRate),devem:'123',safem:'456'};
  const original=JSON.parse(execFileSync('perl',['original-r4-lord-inside-probe.pl'],{
   cwd:originalDir,input:JSON.stringify({fixture,command}),encoding:'utf8'}));
  const got=projectLordInside({reviewed:insideReview,fixture,command});
  assert.equal(original.ok,1);
  assert.deepEqual(got.fixture,original.fixture);
  assert.equal(got.fixture.town.money,fixture.town.money,'budgets not charged during policy change');
  const item=Array(79).fill(0);
  for(const [id,stock] of Object.entries(sale.startingStocks))item[Number(id)-1]=stock;
  item[78]=5;
  const shop={id:1,status:1,rank:5010,money:100000-10000*sale.shown.length,
   paytoday:10000*sale.shown.length,item,showcasecount:sale.shown.length,showcase:[...sale.shown],price:[...sale.prices],
   trush:0,saletoday:0,taxtoday:0,costtoday:0,itemtoday:{},itemyesterday:{},taxmode:sale.taxMode};
  const lordTaxContext=createR4LordSaleTaxContext({reviewed,townTaxRate:got.fixture.taxRate,
   taxMode:shop.taxmode,eventState:got.fixture.eventState});
  const natural=projectSharedNaturalSale({shop,saleRules:street.reviewedB41.saleRules,
   upkeepCosts:street.reviewedB41.upkeepCosts,spanSeconds:1800,randomDraws:sale.consumedSamples,
   lordTaxContext,recordShelfSales:true});
  assert.equal(natural.shop.taxtoday,sale.taxtoday);
  requests.push({sale,town:original.fixture.town});jsSales.push(natural.shop);
 }
 const result=JSON.parse(execFileSync('perl',['original-b50-period-chain-probe.pl','--sale-tax-stdin'],{
  cwd:originalDir,input:JSON.stringify(requests),encoding:'utf8'})).saleTaxCases;
 assert.equal(result.length,rows.length);
 for(const [i,row] of result.entries()){
  const sale=rows[i],natural=jsSales[i];
  assert.equal(row.name,sale.name);assert.equal(row.periods.length,2);
  const first=row.periods[0],second=row.periods[1];
  const { _sale_count_:temporary,...naturalShop}=natural;
  const firstInput={...first.input,shop:{...first.input.shop,...naturalShop}};
  assert.deepEqual(firstInput.shop,first.input.shop,'exact sale-to-ledger input handoff');
  let previous=null;
  for(const [j,period] of row.periods.entries()){
   const input=j===0?firstInput:{...period.input,shop:previous.shop,town:previous.town,dtPeople:previous.dtPeople};
   assert.deepEqual(input,period.input,'same-state period continuation');
   const before=structuredClone(input);
   const got=projectOriginalSoloPeriodPhaseChain({reviewed:periodReview,...input});
   for(const k of ['shop','town','dtPeople','pointsBefore','pointsAfter'])assert.deepEqual(got[k],period.output[k],row.name+' '+k);
   for(const k of ['activeUntilSeconds','eventState','logs'])assert.deepEqual(got.conflictTerritory[k],period.output[k],row.name+' '+k);
   assert.deepEqual([9,100,...got.conflictTerritory.randomDrawRanges],period.output.ranges);
   const taxes=j===0?sale.taxtoday:0;
   assert.equal(got.shop.taxyesterday,taxes);assert.equal(got.shop.taxtoday,0);
   assert.equal(got.town.in,taxes);assert.equal(got.town.money,input.town.money+taxes-got.town.out);
   assert.equal(got.nonCommittable,true);assert.equal(got.worldStateWritten,false);
   assert.deepEqual(input,before);
   previous=got;
  }
 }
});
