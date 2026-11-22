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
import {createLocalWorldSaveStore} from '../src/local-world-save-store.mjs';
import {sourceCommandDraws} from '../src/local-source-command-draws.mjs';
import {projectR3PreEventTurn} from '../src/original-b41-playable-sale.mjs';
import {reviewB56EventSlice,B56_EVENT_SLICE_SOURCE}
  from '../src/original-b56-event-time-slice.mjs';

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
const texts=await Promise.all(paths.map(read));
const source=Object.fromEntries(names.map((key,i)=>[key,texts[i]]));
const street=createStandardStreetModule(source);
const reviewed=reviewB56EventSlice({
  turnSource:source.originalTurnSource,
  reviewedB41:street.reviewedB41,
  reviewedCatalog:street.reviewedEventCatalog,
  reviewedCallbacks:street.reviewedInstantEventCallbacks,
});
const order=street.reviewedEventCatalog.compiled.map(e=>e.code).toReversed();
const eventDraws=(trigger=null)=>{
  const draws=[];
  for(const code of order){
    draws.push(code===trigger?0:999999);
    if(code===trigger)draws.push(0);
  }
  return draws;
};
const perlDir=join(root,'modern/tests/original-perl');
const plusOracle=JSON.parse(execFileSync('perl',[
  'original-market-buy10-probe.pl',
],{cwd:perlDir,encoding:'utf8'})).supply;
const saleOracle=JSON.parse(execFileSync('perl',[
  'original-b41-real-sale-probe.pl',
],{cwd:perlDir,encoding:'utf8'}));

function setupWorld(){
  const review=reviewOriginalPeriodBootstrap({
    periodSource:source.originalPeriodSource,
    adminSource:source.originalAdminInitSource,
    readSource:source.originalDataReadSource,
    writeSource:source.originalDataWriteSource,
    reviewedB41:street.reviewedB41,
  });
  const adapter=createMemoryWorldAdapter(createPeriodMemoryWorld({
    worldId:'b56-live-natural-event-world',streetId:'standard-street',
    nowSeconds:1000000,period:createOriginalPeriodSeed(review),
  }));
  const act=(kind,extra={})=>executeMemoryCommand({
    repository:adapter,streetModule:street,
    command:{kind,expectedRevision:adapter.read().revision,...extra},
  });
  assert.ok(act('initialize-source-market').ok);
  assert.ok(act('open-shop',{
    shopId:1,ownerName:'真實店主',shopName:'B56 真商店',
  }).ok);
  assert.ok(act('reviewed-sparse-all-plus',{
    timespanSeconds:60,randomDraws:plusOracle.draws,
  }).ok);
  const offer=street.quoteMarketOffer(adapter.read(),10);
  assert.ok(act('market-buy',{itemId:10,
    shopId:1,requestedCount:1,marketShelf:offer.shelf,
    expectedPrice:offer.price,
  }).ok);
  assert.ok(act('edit-showcase',{
    shopId:1,shelf:0,itemId:10,per:100,priceOverride:5000,
  }).ok);
  assert.deepEqual(adapter.read().period.eventState,{});
  return {adapter,act};
}
const saleDraws=saleOracle.sale30.consumedSamples;

test('B-56 source order review and explicit 17-event key permutation',()=>{
  assert.equal(reviewed.source,B56_EVENT_SLICE_SOURCE);
  assert.equal(reviewed.eventCodes.length,17);
  assert.equal(reviewed.publicGameplay,false);
  assert.equal(reviewed.orderMode,'explicit-17-key-permutation-not-Perl-hash-order');
  assert.ok(street.capabilities.includes('advance-source-time-reviewed-events'));
  assert.throws(()=>reviewB56EventSlice({
    turnSource:source.originalTurnSource,
    reviewedB41:street.reviewedB41,
    reviewedCatalog:{...street.reviewedEventCatalog,compiledCount:16},
    reviewedCallbacks:street.reviewedInstantEventCallbacks,
  }),/B-56/);
  assert.throws(()=>reviewB56EventSlice({
    turnSource:source.originalTurnSource.replace('#イベント開始処理','#事件啟動已改寫'),
    reviewedB41:street.reviewedB41,
    reviewedCatalog:street.reviewedEventCatalog,
    reviewedCallbacks:street.reviewedInstantEventCallbacks,
  }),/B-56/);
});

test('B-56 one GameCore CAS executes source sale, PLUS and genuine robbery, saves and resumes a second full gate',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'akimono-b56-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const {adapter,act}=setupWorld();
  const before=adapter.read();
  const originalB41=applyGameCommand({
    world:before,streetModule:street,
    command:{kind:'advance-source-time',expectedRevision:before.revision,
      shopId:1,minutes:30,randomDraws:saleDraws},
  });
  assert.ok(originalB41.ok,JSON.stringify(originalB41.details));
  assert.equal(originalB41.world.period.eventState,null,'existing B-41 remains honestly unknown');
  const preEvent=projectR3PreEventTurn({
    world:before,reviewed:street.reviewedB41,
    reviewedAllPlus:street.reviewedAllPlus,
    compiled:street.reviewedGiftMapUse,
    shopId:1,minutes:30,randomDraws:saleDraws,
    reviewedB59Iron:street.reviewedB59Iron,
    reviewedB60Happy:street.reviewedB60Happy,
    reviewedB61Sword:street.reviewedB61Sword,
    reviewedB62Map:street.reviewedB62Map,
    reviewedB63Map:street.reviewedB63Map,
    reviewedEventTimeSlice:true,
  });
  assert.equal(Object.hasOwn(preEvent,'period'),false,
    'R3 stage does not forge any EVENT or period successor');
  assert.deepEqual(preEvent.shops,originalB41.world.shops);
  assert.deepEqual(preEvent.market,originalB41.world.market);
  assert.equal(preEvent.nowSeconds,originalB41.world.nowSeconds);
  assert.deepEqual(before.period.eventState,{});
  assert.throws(()=>projectR3PreEventTurn({
    world:{...before,period:{...before.period,eventState:null}},
    reviewed:street.reviewedB41,
    reviewedAllPlus:street.reviewedAllPlus,
    compiled:street.reviewedGiftMapUse,
    shopId:1,minutes:30,randomDraws:saleDraws,
  }),/known original incoming EVENT/);
  const slice=act('advance-source-time-reviewed-events',{
    shopId:1,minutes:30,saleDraws,eventDraws:eventDraws('goutou'),
    eventHashOrderFixture:order,
  });
  assert.ok(slice.ok,JSON.stringify(slice.details));
  assert.equal(slice.world.nowSeconds,before.nowSeconds+1800);
  assert.equal(slice.world.revision,before.revision+1);
  assert.equal(slice.world.shops[0].rank,originalB41.world.shops[0].rank-
    Math.trunc(originalB41.world.shops[0].rank/5));
  assert.deepEqual(slice.world.shops[0].item,originalB41.world.shops[0].item);
  assert.equal(slice.world.shops[0].money,originalB41.world.shops[0].money);
  assert.deepEqual(slice.world.market,originalB41.world.market);
  assert.deepEqual(slice.world.period.eventState,{});
  assert.deepEqual(slice.details.eventStarts.slice().sort(),
    ['guildbattle','goutou','rebel'].sort());
  assert.equal(slice.details.instantCallbacksRun,1);
  assert.equal(slice.details.eventDrawsUsed,18);
  assert.equal(slice.details.eventHashOrderSupplied,true);
  const store=createLocalWorldSaveStore({directory});
  store.save(adapter.read(),{expectedGeneration:0});
  assert.deepEqual(store.load().world,slice.world);

  // No fake activation: the next slice can still run all 17 gates.
  const secondWorld=store.load().world;
  const secondAdapter=createMemoryWorldAdapter(secondWorld);
  const candidateDraws=sourceCommandDraws({
    world:secondWorld,kind:'advance-source-time',
    args:{shopId:1,minutes:10},count:121,
  });
  let next=null;
  for(let n=1;n<=121;n++){
    const command={kind:'advance-source-time-reviewed-events',
      expectedRevision:secondWorld.revision,shopId:1,minutes:10,
      saleDraws:candidateDraws.slice(0,n),eventDraws:eventDraws(),
      eventHashOrderFixture:order};
    const trial=applyGameCommand({world:secondWorld,streetModule:street,command});
    if(trial.ok){
      next=executeMemoryCommand({repository:secondAdapter,streetModule:street,command});
      break;
    }
  }
  assert.ok(next?.ok,'can execute a second source-safe EVENT gate after reload');
  assert.deepEqual(next.world.period.eventState,{});
  assert.equal(next.world.nowSeconds,secondWorld.nowSeconds+600);
  assert.equal(next.details.eventStarts.includes('manbiki'),false);
});

test('B-56 unsupported started event, incomplete key order and incorrect RNG reject transaction without writing',()=>{
  const {adapter,act}=setupWorld();
  const before=adapter.read();
  const call=x=>act('advance-source-time-reviewed-events',{
    shopId:1,minutes:30,saleDraws,eventDraws:eventDraws(),
    eventHashOrderFixture:order,...x,
  });
  for(const extra of [
    {eventDraws:eventDraws('happy')},
    {eventHashOrderFixture:order.slice(1)},
    {eventHashOrderFixture:[...order.slice(1),'fake']},
    {eventDraws:[...eventDraws(),0]},
    {eventDraws:eventDraws().slice(1)},
  ]){
    const result=call(extra);
    assert.equal(result.ok,false,JSON.stringify(extra));
    assert.equal(result.code,'SOURCE_BOUNDARY_REJECTED');
    assert.deepEqual(adapter.read(),before);
  }
  const unknown=applyGameCommand({
    world:before,streetModule:street,
    command:{kind:'advance-source-time',expectedRevision:before.revision,
      shopId:1,minutes:30,randomDraws:saleDraws},
  });
  assert.ok(unknown.ok);
  const result=applyGameCommand({world:unknown.world,streetModule:street,
    command:{kind:'advance-source-time-reviewed-events',
      expectedRevision:unknown.world.revision,
      shopId:1,minutes:10,saleDraws,eventDraws:eventDraws(),
      eventHashOrderFixture:order},
  });
  assert.equal(result.code,'SOURCE_BOUNDARY_REJECTED');
  assert.deepEqual(result.world,unknown.world);
});
