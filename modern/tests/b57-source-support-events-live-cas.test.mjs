import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path,{join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {createMemoryWorldAdapter,createPeriodMemoryWorld,
  applyGameCommand,executeMemoryCommand} from '../src/game-core-contract.mjs';
import {reviewOriginalPeriodBootstrap,createOriginalPeriodSeed}
  from '../src/original-period-world-seed.mjs';
import {createLocalWorldSaveStore} from './support/legacy-world-save-store.mjs';
import {reviewOriginalSupportEventCallbacks,projectOriginalSupportEventCallback,
  B57_SUPPORT_SOURCE} from '../src/original-b57-support-event-callbacks.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFile(join(root,p),'utf8');
const names=[
  'itemDsl','rebelDsl','originalAdminInitSource','originalDataReadSource',
  'originalDataWriteSource','originalTurnSource','originalWholeSource',
  'originalConfigSource','originalCompilerSource',
  'originalBuySource','originalBuyItemSource','originalBuyCalcSource',
  'originalMarketSource','originalItemSource','originalDetailSource',
  'originalPeriodSource',
];
const paths=[
  'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
  'modern/tests/original-perl/core-inc-admin-func.cgi',
  'modern/tests/original-perl/inc-func.cgi',
  'modern/tests/original-perl/write.cgi',
  'modern/tests/original-perl/inc-turn.cgi',
  'modern/tests/original-perl/whole.cgi','_config.cgi',
  'modern/tests/original-perl/inc-makeitem.cgi',
  'modern/tests/original-perl/buy-s.cgi',
  'modern/tests/original-perl/item.cgi',
  'modern/tests/original-perl/calc.cgi',
  'modern/tests/original-perl/market.cgi',
  'modern/tests/original-perl/item.cgi',
  'modern/tests/original-perl/core-detail.cgi',
  'modern/tests/original-perl/period.cgi',
];
const sources=await Promise.all(paths.map(read));
const fixed=Object.fromEntries(names.map((name,i)=>[name,sources[i]]));
const street=createStandardStreetModule(fixed);
const perlDir=join(root,'modern/tests/original-perl');
const perl=JSON.parse(execFileSync('perl',[
  'original-b57-support-event-probe.pl',
],{cwd:perlDir,encoding:'utf8'}));
const originalReview=reviewOriginalSupportEventCallbacks({
  itemDsl:fixed.itemDsl,turnSource:fixed.originalTurnSource,
  compilerSource:fixed.originalCompilerSource,
  compiledCatalog:street.reviewedEventCatalog,
});
const order=street.reviewedEventCatalog.compiled.map(x=>x.code).toReversed();
const eventDraws=(triggers=[])=>{
  const out=[];
  for(const code of order){
    const selected=triggers.includes(code);
    out.push(selected?0:999999);
    if(selected)out.push(0);
  }
  return out;
};
const plusOracle=JSON.parse(execFileSync('perl',[
  'original-market-buy10-probe.pl',
],{cwd:perlDir,encoding:'utf8'})).supply;
const saleOracle=JSON.parse(execFileSync('perl',[
  'original-b41-real-sale-probe.pl',
],{cwd:perlDir,encoding:'utf8'}));
const saleDraws=saleOracle.sale30.consumedSamples;
function setupWorld(){
  const seed=reviewOriginalPeriodBootstrap({
    periodSource:fixed.originalPeriodSource,
    adminSource:fixed.originalAdminInitSource,
    readSource:fixed.originalDataReadSource,
    writeSource:fixed.originalDataWriteSource,
    reviewedB41:street.reviewedB41,
  });
  const adapter=createMemoryWorldAdapter(createPeriodMemoryWorld({
    worldId:'b57-live-support-events',streetId:'standard-street',
    nowSeconds:1000000,period:createOriginalPeriodSeed(seed),
  }));
  const act=(kind,fields={})=>executeMemoryCommand({
    repository:adapter,streetModule:street,
    command:{kind,expectedRevision:adapter.read().revision,...fields},
  });
  assert.equal(act('initialize-source-market').ok,true);
  assert.equal(act('open-shop',{
    shopId:1,ownerName:'原版店主',shopName:'受援助的真實商店',
  }).ok,true);
  assert.equal(act('reviewed-sparse-all-plus',{
    timespanSeconds:60,randomDraws:plusOracle.draws,
  }).ok,true);
  const offer=street.quoteMarketOffer(adapter.read(),10);
  assert.equal(act('market-buy',{itemId:10,
    shopId:1,requestedCount:1,
    marketShelf:offer.shelf,expectedPrice:offer.price,
  }).ok,true);
  assert.equal(act('edit-showcase',{
    shopId:1,shelf:0,itemId:10,per:100,priceOverride:5000,
  }).ok,true);
  return {adapter,act};
}

test('B-57 original funding and popularity actual Perl callbacks match Node, including exact return, message, cap and random draws',()=>{
  assert.equal(originalReview.source,B57_SUPPORT_SOURCE);
  assert.equal(originalReview.maxMoney,999999999);
  assert.equal(originalReview.chance,300);
  assert.equal(originalReview.publicGameplay,false);
  assert.equal(street.reviewedSupportEventCallbacks.source,B57_SUPPORT_SOURCE);
  assert.equal(street.reviewedB56.support,B57_SUPPORT_SOURCE);
  assert.equal(perl.cases.length,11);
  assert.equal(perl.maxMoney,999999999);
  for(const row of perl.cases){
    const copy=structuredClone(row.input.shop);
    const effect=projectOriginalSupportEventCallback({
      reviewed:originalReview,shop:copy,
      eventCode:row.input.eventCode,
      randomDraws:row.input.randomDraws,
    });
    assert.deepEqual(effect.shop.item,row.output.item,row.name+' inventory untouched');
    assert.equal(effect.shop.money,row.output.money,row.name+' original money');
    assert.equal(effect.shop.rank,row.output.rank,row.name+' original rank');
    assert.equal(effect.returnCode,row.output.returnCode,row.name+' original return');
    assert.equal(effect.message,row.output.message,row.name+' original stub-formatted message');
    assert.equal(effect.randomDrawsUsed,row.output.randomDrawsUsed,row.name+' exact RNG');
    assert.equal(effect.eventPersisted,false,'source return=0 never adds active EVENT');
    assert.deepEqual(copy,row.input.shop,'Node callback must not mutate input');
  }
  const initial=perl.cases[0].input.shop;
  const funding=projectOriginalSupportEventCallback({
    reviewed:originalReview,shop:initial,
    eventCode:'getmoney',randomDraws:[0],
  });
  const boosted=projectOriginalSupportEventCallback({
    reviewed:originalReview,shop:funding.shop,
    eventCode:'getpop',randomDraws:[0],
  });
  assert.equal(boosted.shop.money,perl.combined.money);
  assert.equal(boosted.shop.rank,perl.combined.rank);
  assert.equal(funding.randomDrawsUsed+boosted.randomDrawsUsed,
    perl.combined.randomDrawsUsed);
  assert.deepEqual([funding.message,boosted.message],perl.combined.messages);
});

test('B-57 fail closed on source drift, callback parameters, invalid samples and unreviewed shops',()=>{
  const review=change=>reviewOriginalSupportEventCallbacks({
    itemDsl:fixed.itemDsl,
    turnSource:fixed.originalTurnSource,
    compilerSource:fixed.originalCompilerSource,
    compiledCatalog:street.reviewedEventCatalog,...change,
  });
  const changes=[
    {itemDsl:fixed.itemDsl.replace(
      'MaxMoney\t999999999','MaxMoney\t100000')},
    {itemDsl:fixed.itemDsl.replace(
      '$_->{money}+=$money;','$_->{money}+=$money*2;')},
    {itemDsl:fixed.itemDsl.replace(
      'next if rand(1000)>300;','next if rand(1000)>=300;')},
    {itemDsl:fixed.itemDsl.replace(
      'startfunc\t_local_(1000)','startfunc\t_local_(2000)')},
    {compilerSource:fixed.originalCompilerSource.replace(
      '$g_define->{maxmoney}=GetNumber($1);','$g_define->{maxmoney}=0;')},
  ];
  for(const change of changes)
    assert.throws(()=>review(change),/B-57/);
  const shop=perl.cases[0].input.shop;
  for(const options of [
    {eventCode:'loto'},
    {randomDraws:[]},
    {randomDraws:[0,0]},
    {randomDraws:[1000000]},
    {randomDraws:[-1]},
    {shop:{...shop,money:1000000000}},
    {shop:{...shop,rank:10001}},
    {shop:{...shop,item:[0]}},
  ])
    assert.throws(()=>projectOriginalSupportEventCallback({
      reviewed:originalReview,shop,
      eventCode:'getmoney',randomDraws:[0],...options,
    }),/B-57/);
});

test('B-57 after genuine purchase and natural sale, both real support callbacks update one CAS; B-43 restart is durable',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'akimono-b57-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const {adapter,act}=setupWorld();
  const before=adapter.read();
  const priorSale=applyGameCommand({
    world:before,streetModule:street,
    command:{kind:'advance-source-time',expectedRevision:before.revision,
      shopId:1,minutes:30,randomDraws:saleDraws},
  });
  assert.ok(priorSale.ok,JSON.stringify(priorSale.details));
  const result=act('advance-source-time-reviewed-events',{
    shopId:1,minutes:30,saleDraws,
    eventDraws:eventDraws(['getmoney','getpop']),
    eventHashOrderFixture:order,
  });
  assert.ok(result.ok,JSON.stringify(result.details));
  assert.equal(result.world.revision,before.revision+1);
  assert.equal(result.world.nowSeconds,before.nowSeconds+1800);
  assert.equal(result.world.shops[0].money,
    Math.min(999999999,priorSale.world.shops[0].money+100000));
  assert.equal(result.world.shops[0].rank,
    Math.min(10000,priorSale.world.shops[0].rank+1000));
  assert.equal(result.world.shops[0].item[9],priorSale.world.shops[0].item[9]);
  assert.deepEqual(result.world.market,priorSale.world.market,
    'source funding is NOT natural sales or wholesale supply');
  assert.equal(result.world.shops[0].saletoday,priorSale.world.shops[0].saletoday,
    'source funding must not be added to sales revenue');
  assert.deepEqual(result.world.period.eventState,{},
    'both original return=0 never persist active events');
  assert.equal(result.details.instantCallbacksRun,2);
  assert.equal(result.details.eventDrawsUsed,19);
  assert.deepEqual(result.details.eventStarts.slice().sort(),
    ['getmoney','getpop','guildbattle','rebel'].sort());
  assert.deepEqual(result.details.eventMessages.map(x=>x.eventCode).sort(),
    ['getmoney','getpop'].sort());
  const store=createLocalWorldSaveStore({directory});
  store.save(adapter.read(),{expectedGeneration:0});
  assert.deepEqual(store.load().world,result.world);
});

test('B-57 unmet source callback draw, unrelated true event and revision conflict cannot partially commit assistance',()=>{
  const {adapter,act}=setupWorld();
  const before=adapter.read();
  const args={
    shopId:1,minutes:30,saleDraws,
    eventDraws:eventDraws(['getmoney','getpop']),
    eventHashOrderFixture:order,
  };
  for(const fields of [
    {eventDraws:args.eventDraws.slice(0,-1)},
    {eventDraws:[...args.eventDraws,999999]},
    {eventDraws:eventDraws(['getmoney','getpop','happy'])},
    {eventHashOrderFixture:order.slice(0,-1)},
  ]){
    const result=act('advance-source-time-reviewed-events',{...args,...fields});
    assert.equal(result.ok,false,JSON.stringify(fields));
    assert.equal(result.code,'SOURCE_BOUNDARY_REJECTED');
    assert.deepEqual(adapter.read(),before);
  }
  const stale=applyGameCommand({
    world:before,streetModule:street,
    command:{kind:'advance-source-time-reviewed-events',
      expectedRevision:before.revision+1,...args},
  });
  assert.equal(stale.code,'REVISION_CONFLICT');
  assert.deepEqual(adapter.read(),before);
});
