import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {createPeriodMemoryWorld,createMemoryWorldAdapter,
  executeMemoryCommand,applyGameCommand,createSourceReviewedMemoryWorldAdapter} from '../src/game-core-contract.mjs';
import {reviewOriginalPeriodBootstrap,createOriginalPeriodSeed}
  from '../src/original-period-world-seed.mjs';
import {projectB41Sale,projectP3PreEventTurn} from '../src/original-b41-playable-sale.mjs';

import {reviewR4SortedPreEvent,projectR4SortedInventoryPreEventTurn} from '../src/original-r4-sorted-pre-event.mjs';
import {reviewR4PreEventItemOverlay,projectR4PreEventItemOverlay,reviewR4ExternalPreEventItemOverlay,validateR4PreEventPeriod} from '../src/original-r4-pre-event-item-overlay.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const locations=[
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
 ['originalPeriodSource','modern/tests/original-perl/period.cgi'],
 ['originalUseSource','modern/tests/original-perl/use.cgi'],
 ['originalItemHelperSource','modern/tests/original-perl/core-inc-item.cgi'],
];
const source=Object.fromEntries(await Promise.all(locations.map(
 async ([k,p])=>[k,await readFile(path.join(root,p),'utf8')])));
const street=createStandardStreetModule(source);
const reviewedR4=reviewR4SortedPreEvent({turnSource:source.originalTurnSource,detailSource:source.originalDetailSource,readSource:source.originalDataReadSource});
const reviewedDataRead=reviewR4PreEventItemOverlay({itemDsl:source.itemDsl,rebelDsl:source.rebelDsl,compilerSource:source.originalCompilerSource,turnSource:source.originalTurnSource,readSource:source.originalDataReadSource});

function fresh(fullMarket=false){
  const period=createOriginalPeriodSeed(reviewOriginalPeriodBootstrap({
    periodSource:source.originalPeriodSource,
    adminSource:source.originalAdminInitSource,
    readSource:source.originalDataReadSource,
    writeSource:source.originalDataWriteSource,
    reviewedB41:street.reviewedB41,
  }));
  const repository=createMemoryWorldAdapter(createPeriodMemoryWorld({
    worldId:'p3-real-source',streetId:'standard-street',nowSeconds:1000000,period,
  }));
  const command=(kind,fields={},samples=null)=>{
    const world=repository.read();
    const base={kind,expectedRevision:world.revision,...fields};
    let request=base;
    if(samples!==null){
      let found=false;
      for(let n=0;n<=samples.length;n++){
        const candidate={...base,...(n?{randomDraws:samples.slice(0,n)}:{})};
        if(applyGameCommand({world,streetModule:street,command:candidate}).ok){
          request=candidate;found=true;break;
        }
      }
      assert.ok(found,'source draw prefix for '+kind+' '+JSON.stringify(fields));
    }
    const result=executeMemoryCommand({repository,streetModule:street,command:request});
    assert.equal(result.ok,true,JSON.stringify(result.details));
    return result;
  };
  command('initialize-source-market');
  command('open-shop',{shopId:1,ownerName:'來源工匠',shopName:'來源鍛造店'});
  command('reviewed-sparse-all-plus',{timespanSeconds:3600},Array(118).fill(0));
  if(fullMarket){
    const offer=street.quoteMarketOffer(repository.read(),10);
    assert.ok(offer.canBuy);
    command('market-buy',{shopId:1,itemId:10,requestedCount:1,
      marketShelf:offer.shelf,expectedPrice:offer.price});
  }
  return {repository,command};
}
function args(world,minutes,randomDraws){
  return {world,shopId:1,minutes,randomDraws,reviewed:street.reviewedB41,
    reviewedAllPlus:street.reviewedAllPlus,compiled:street.reviewedGiftMapUse,
    reviewedB59Iron:street.reviewedB59Iron,reviewedB60Happy:street.reviewedB60Happy,
    reviewedB61Sword:street.reviewedB61Sword,reviewedB62Map:street.reviewedB62Map,
    reviewedB63Map:street.reviewedB63Map,reviewedNayuta:street.reviewedNayuta};
}
function compare(world,minutes,draws=Array(121).fill(0)){
  const prior=JSON.stringify(world);
  const perl=JSON.parse(execFileSync('perl',['original-r4-p3-pre-event-overlay-probe.pl'],{
    cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
    input:JSON.stringify({shop:world.shops[0],csv:world.market.originalWholesaleCsv,
      span:minutes*60,draws,events:world.period.eventState}),
  }));
  const result=projectR4SortedInventoryPreEventTurn({...args(world,minutes,perl.consumed),reviewedR4,reviewedDataRead,activeOrder:perl.activeOrder});
  const overlay=projectR4PreEventItemOverlay({reviewed:reviewedDataRead,world,activeOrder:perl.activeOrder,saleReview:street.reviewedB41,plusReview:street.reviewedAllPlus});
  assert.deepEqual(overlay.plusSeconds,perl.plus);
  assert.equal(result.committable,false);assert.equal(result.receipt.originalSortApplied,true);
  assert.equal(JSON.stringify(world),prior,'pure stage cannot mutate input');
  assert.equal(Object.hasOwn(result,'period'),false,'no EVENT successor claimed');
  assert.equal(Object.hasOwn(result,'revision'),false,'not a committed WorldState');
  assert.equal(result.nowSeconds,world.nowSeconds+minutes*60);
  const shop=result.shops[0];
  for(const key of ['money','rank','temprank','trush','saletoday','taxtoday','paytoday','time','point'])
    assert.equal(shop[key]??0,perl.shop[key]??0,key);
  assert.ok(Math.abs(shop.costtoday-perl.shop.costtoday)<1e-8);
  for(const key of ['item','itemtoday','exp','job'])
    assert.deepEqual(shop[key]??{},perl.shop[key]??{},key);
  assert.equal(shop._sale_count_,undefined);
  assert.deepEqual(result.market.wholesale,perl.wholesale);
  assert.deepEqual(result.market.sparseWrittenSlots,perl.defined);
  assert.equal(result.market.originalWholesaleCsv,perl.csv);
  assert.equal(result.receipt.totalDraws,perl.used);
  return result;
}

test('R4 common P3 inventory stage handles all P3 source costs and source sale/callback after old EVENT overlay; not acquisition evidence',()=>{
  const {repository}=fresh(true),world=structuredClone(repository.read()),shop=world.shops[0];
  for(const id of Object.keys(street.reviewedB41.p3TurnItems.costs).map(Number))shop.item[id-1]=1;
  shop.item[78]=2;shop.exp={'9':180,'20':600,'21':400,'22':200,'23':700,'25':100,'37':250,'66':500};shop.job='cow';
  const rules=street.reviewedB41.p3TurnItems.rules;
  const groups=new Set(),events={};
  for(const e of reviewedDataRead.catalog.compiled){
    if(!reviewedDataRead.params.rules[e.code].length&&e.code!=='happy')continue;
    if(groups.has(e.group))continue;
    groups.add(e.group);events[e.code]=world.nowSeconds+100000;
  }
  for(const id of [0,25,26,30,31,32,33,34,35,36,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,67,68,69,70]){
    const candidate=structuredClone(world);candidate.period.eventState={...events};
    candidate.shops[0].showcase=[id];candidate.shops[0].price=[id?rules[id].unitPrice:0];
    const result=compare(candidate,1);
    if(id===70)assert.equal(result.receipt.itemCallbackStage.itemTurnAffectedShops,1);
    if([41,47,58,67,70].includes(id)){
      candidate.shops[0].price=[Math.trunc(rules[id].unitPrice/2)];
      const sold=compare(candidate,60,[999999,...Array(120).fill(0)]);
      assert.equal(sold.receipt.naturalSaleCount,1);
      if(id===70)assert.equal(sold.receipt.itemCallbackStage.itemTurnAffectedShops,0);
    }
  }
});
test('R4 each of the nine compiled active ITEM overlays is consumed by actual source pre-EVENT stage, expiry does not remove it early',()=>{
  const {repository}=fresh(true),world=structuredClone(repository.read());
  for(const e of reviewedDataRead.catalog.compiled.filter(e=>reviewedDataRead.params.rules[e.code].length)){
    const candidate=structuredClone(world);
    candidate.period.eventState={[e.code]:world.nowSeconds+1};
    const id=reviewedDataRead.params.rules[e.code].find(r=>Object.hasOwn(street.reviewedB41.p3TurnItems.rules,r.itemId))?.itemId;
    if(id){
      candidate.shops[0].item[id-1]=3;
      candidate.shops[0].showcase=[id];candidate.shops[0].price=[street.reviewedB41.p3TurnItems.rules[id].unitPrice];
    }
    compare(candidate,60,Array(121).fill(500000));
  }
});
test('R4 actual legal market buy/open source state works and legacy P3/R3 guards remain distinct',()=>{
  const {repository}=fresh(true),world=repository.read();
  const pre=compare(world,1),samples=Array(121).fill(0);
  assert.equal(pre.nowSeconds,world.nowSeconds+60);assert.deepEqual(repository.read(),world);
  for(const state of [null,{rebel:1000001},{guildbattle:1000001},{madeup:1000001}]){
    const w=structuredClone(world);w.period.eventState=state;
    assert.throws(()=>projectR4SortedInventoryPreEventTurn({...args(w,1,samples),reviewedR4,reviewedDataRead,activeOrder:Object.keys(state??{})}),/EVENT/);
  }
  const w=structuredClone(world);w.period.eventState={'ken-sale':1000001};
  assert.throws(()=>projectR4SortedInventoryPreEventTurn({...args(w,1,samples),reviewedR4,reviewedDataRead,activeOrder:[]}),/EVENT order/);
  assert.throws(()=>projectP3PreEventTurn(args(w,1,samples)),/EVENT/);
  const bad=structuredClone(world);bad.shops[0].exp={'20':1001};
  assert.throws(()=>projectR4SortedInventoryPreEventTurn({...args(bad,1,samples),reviewedR4,reviewedDataRead,activeOrder:[]}),/LIMIT_EXP/);
  const crossing=structuredClone(world);crossing.nowSeconds=1025980;
  assert.throws(()=>projectR4SortedInventoryPreEventTurn({...args(crossing,1,samples),reviewedR4,reviewedDataRead,activeOrder:[]}),/period settlement/);
});


// Candidate composition: no HTTP/CAS/persistence authority. Source oracle
// receives only the exact sampled tape from the server-owned policy.
import {reviewR4HashPolicy} from '../src/original-r4-perl-hash-replay.mjs';
import {reviewOriginalR4DeclarativeEventCycle} from '../src/original-r4-declarative-event-cycle.mjs';
import {reviewOriginalR4MultiEventFixture} from '../src/original-r4-multi-event-order-fixture.mjs';
import {projectR4NormalTurnCandidate} from '../src/original-r4-normal-turn-candidate.mjs';
const hashReview=reviewR4HashPolicy({
  itemDsl:source.itemDsl,rebelDsl:source.rebelDsl,compilerSource:source.originalCompilerSource,
  turnSource:source.originalTurnSource,readSource:source.originalDataReadSource,writeSource:source.originalDataWriteSource});
const seven=reviewOriginalR4DeclarativeEventCycle({
  compiledCatalog:street.reviewedEventCatalog,reviewedParams:reviewedDataRead.params,
  itemDsl:source.itemDsl,turnSource:source.originalTurnSource,readSource:source.originalDataReadSource});
const eventReview=reviewOriginalR4MultiEventFixture({
  compiledCatalog:street.reviewedEventCatalog,reviewedSeven:seven,turnSource:source.originalTurnSource,
  readSource:source.originalDataReadSource,reviewedSupportCallbacks:street.reviewedSupportEventCallbacks,
  reviewedInstantCallbacks:street.reviewedInstantEventCallbacks,reviewedLotoCallbacks:street.reviewedLoto,
  reviewedHappyEvent:street.reviewedB60Happy,reviewedIronEvent:street.reviewedB59Iron,
  reviewedSwordEvent:street.reviewedB61Sword});
const project=(world,minutes)=>projectR4NormalTurnCandidate({world,minutes,street,reviewedR4,reviewedDataRead,reviewedHash:hashReview,reviewedEvents:eventReview});
const wire=state=>Object.entries(state).flat().join(',');
function compareNormal(world,minutes){
  const candidate=project(world,minutes),e=candidate.evidence;
  const env={...process.env,PERL_HASH_SEED:e.seed,PERL_PERTURB_KEYS:'0'};
  const run=(script,input,argv=[])=>JSON.parse(execFileSync('perl',[script,...argv],{
    cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',env,input:JSON.stringify(input)
  }));
  const pre=run('original-r4-p3-pre-event-overlay-probe.pl',{
    shop:world.shops[0],csv:world.market.originalWholesaleCsv,span:minutes*60,
    draws:e.preEventDraws,events:world.period.eventState,eventWire:wire(world.period.eventState)});
  assert.deepEqual(pre.activeOrder,e.activeOrder);
  assert.equal(pre.used,e.preEventDraws.length);
  assert.deepEqual(candidate.market.wholesale,pre.wholesale);
  assert.equal(candidate.market.originalWholesaleCsv,pre.csv);
  const after=run('original-r4-mixed-support-gate-probe.pl',{
    shop:pre.shop,eventWire:wire(world.period.eventState),startSeconds:world.nowSeconds,
    spanSeconds:minutes*60,samples:e.eventSamples},['--normal-turn']);
  assert.deepEqual(after.activeOrder,e.activeOrder);
  assert.deepEqual(after.eventOrder,e.eventOrder);
  assert.deepEqual(after.nowOrder,e.nowOrder);
  assert.deepEqual(after.ranges,e.eventDrawRanges);
  assert.deepEqual(after.logs,e.logs);
  assert.equal(wire(candidate.period.eventState),after.eventWire);
  assert.deepEqual(candidate.period.eventState,after.eventState);
  for(const [key,value] of Object.entries(candidate.shops[0])){
    if(key==='costtoday'){assert.ok(Math.abs(value-after.shop[key])<1e-8);continue;}
    if(key==='exp'&&value===undefined)continue;
    assert.deepEqual(value,after.shop[key],key);
  }
  assert.equal(candidate.committable,false);
  assert.deepEqual(candidate,project(world,minutes),'same world/command is restart replayable');
  return candidate;
}
test('R4 normal turn candidate shares one deterministic trace and actual Perl pre-EVENT and EVENT successor across source world',()=>{
  const {repository}=fresh(true);let world=structuredClone(repository.read());
  const initial=structuredClone(world);
  const first=compareNormal(world,1);
  assert.deepEqual(world,initial);
  world={...world,shops:first.shops,market:first.market,period:first.period,nowSeconds:first.nowSeconds,revision:world.revision+1};
  compareNormal(world,60);
  assert.throws(()=>project({...world,nowSeconds:1025980},1),/period settlement/);
  assert.throws(()=>project({...world,period:{...world.period,eventState:null}},1),/known/);
});
test('R4 candidate executes normal EVENT callbacks on reviewed P3-shaped stock, not initial-only B55 inventory',()=>{
  const {repository}=fresh(true);let world=structuredClone(repository.read());
  const shop=world.shops[0];shop.item[46]=40;shop.item[10]=10;shop.item[17]=1;shop.item[19]=1;
  shop.exp={'20':200,'37':300};shop.job='tool';
  shop.showcase=[47];shop.price=[street.reviewedB41.p3TurnItems.rules[47].unitPrice];
  // Deterministic source-seed coverage, not an acquisition or player command.
  // Active happy and ore expire or persist while every normal gate is run.
  world.period.eventState={'happy':1000001,'plusup-tetu':1007200};
  const actual=compareNormal(world,60);
  assert.equal(actual.shops[0].job,'tool');
  assert.deepEqual(actual.shops[0].exp,shop.exp);
});

test('R4 reviewed normal-time opt-in uses exact GameCore CAS replay, not a fixture or editable clock',()=>{
  const reviewedStreet=createStandardStreetModule({...source,enableReviewedNormalTime:true});
  const period=createOriginalPeriodSeed(reviewOriginalPeriodBootstrap({
    periodSource:source.originalPeriodSource,adminSource:source.originalAdminInitSource,
    readSource:source.originalDataReadSource,writeSource:source.originalDataWriteSource,reviewedB41:reviewedStreet.reviewedB41}));
  const repository=createSourceReviewedMemoryWorldAdapter({
    initialWorld:createPeriodMemoryWorld({worldId:'r4-normal-legal',streetId:'standard-street',nowSeconds:1000000,period}),
    streetModule:reviewedStreet});
  const commit=(kind,args={})=>{
    const result=executeMemoryCommand({repository,streetModule:reviewedStreet,command:{kind,expectedRevision:repository.read().revision,...args}});
    assert.equal(result.ok,true,JSON.stringify(result.details));return result;
  };
  commit('initialize-source-market');
  commit('open-shop',{shopId:1,ownerName:'合法店主',shopName:'合法商店'});
  const before=repository.read();
  const time=commit('advance-reviewed-world-time',{minutes:60});
  assert.equal(time.world.nowSeconds,before.nowSeconds+3600);
  assert.equal(time.world.revision,before.revision+1);
  assert.notEqual(time.world.period.eventState,null);
  assert.equal(time.details.sourceTrace.eventOrder.length,17);
  assert.equal(time.details.sourceTrace.eventSamples.length,time.details.sourceTrace.eventDrawRanges.length);
  const current=repository.read();
  const next=applyGameCommand({world:current,streetModule:reviewedStreet,
    command:{kind:'advance-reviewed-world-time',expectedRevision:current.revision,minutes:1}});
  assert.equal(next.ok,true,JSON.stringify(next.details));
  const forged=structuredClone(next.world);forged.shops[0].money++;
  assert.equal(repository.compareAndSwap({expectedRevision:current.revision,nextWorld:forged,advanceSeconds:60,
    command:{kind:'advance-reviewed-world-time',expectedRevision:current.revision,minutes:1}}).ok,false);
  assert.equal(repository.compareAndSwap({expectedRevision:current.revision,nextWorld:next.world,advanceSeconds:60}).ok,false);
  assert.deepEqual(repository.read(),current);
  for(const fields of [{randomDraws:[0]},{nowSeconds:1001000},{eventState:{}},{minutes:0}]){
    assert.equal(executeMemoryCommand({repository,streetModule:reviewedStreet,
      command:{kind:'advance-reviewed-world-time',expectedRevision:current.revision,minutes:1,...fields}}).ok,false);
  }
  assert.deepEqual(repository.read(),current);
  assert.equal(executeMemoryCommand({repository,streetModule:reviewedStreet,
    command:{kind:'advance-reviewed-world-time',expectedRevision:current.revision-1,minutes:1}}).code,'REVISION_CONFLICT');
  assert.equal(executeMemoryCommand({repository,streetModule:reviewedStreet,
    command:{kind:'advance-source-time',expectedRevision:current.revision,shopId:1,minutes:1,randomDraws:[]}}).ok,false);
  assert.equal(repository.compareAndSwap({expectedRevision:current.revision,nextWorld:{...current,revision:current.revision+1,nowSeconds:current.nowSeconds+60},advanceSeconds:60}).ok,false);
  const gift=commit('use-item',{shopId:1,itemId:79,useId:0,requestedCount:1});
  assert.equal(gift.world.nowSeconds,current.nowSeconds);
  assert.ok(gift.world.shops[0].item[78]<current.shops[0].item[78]);
  const continued=commit('advance-reviewed-world-time',{minutes:60});
  assert.equal(continued.world.nowSeconds,gift.world.nowSeconds+3600);
  assert.equal(continued.world.shops[0].time,gift.world.shops[0].time);
});

 
// Source-only boundary composition: actual frozen period prefix executes
// between SortDT and PLUS, with one uninterrupted source draw tape.
// No runtime commit, EVENT successor or disk effects are claimed here.
import {projectR4BoundaryPreEventCandidate} from '../src/original-b41-playable-sale.mjs';
import {reviewOriginalSoloPeriodPhaseChain} from '../src/original-period-solo-chain.mjs';
import {loadStandardStreetModel} from '../src/standard-street-model.mjs';
const boundarySources={
  periodSource:source.originalPeriodSource,configSource:source.originalConfigSource,
  itemDsl:source.itemDsl,model:loadStandardStreetModel(source.itemDsl,source.rebelDsl),
  compilerSource:source.originalCompilerSource,originalAddItemSource:source.originalUseSource,
  detailSource:source.originalDetailSource,readSource:source.originalDataReadSource,
  adminSource:source.originalAdminInitSource,
  bootstrapMeta:'500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0',
  compiledLimits:street.reviewedGiftMapUse.limits.map(x=>x.limit),
  includeReviewedDignity:true,includeReviewedShopExpiry:true,
};
const reviewedBoundaryPeriod=reviewOriginalSoloPeriodPhaseChain(boundarySources);
const reviewedTaxPeriod=reviewOriginalSoloPeriodPhaseChain({...boundarySources,includeReviewedSaleTax:true});
test('R4 source boundary prefix runs settlement before dynamic-population PLUS with exact residual seconds',()=>{
  for(const [start,minutes,span,active,dignity] of [
    [1025940,1,60,{},0],
    [1025980,1,20,{'plusup-tetu':1030000},12],
  ]){
    const {repository}=fresh(true),world=structuredClone(repository.read());
    world.nowSeconds=start;world.period.eventState=active;
    // Original play wire materializes an empty blocklogin column; the
    // modern initial shop projection has not yet acquired that field.
    // Explicit source fixture only, not a live-history acquisition proof.
    world.shops[0].blocklogin='';
    world.shops[0].dignity=dignity;
    const before=JSON.stringify(world);
    const draws=Array.from({length:125},(_,i)=>(i*7919+170000)%1000000);
    const oracle=JSON.parse(execFileSync('perl',['original-r4-p3-pre-event-overlay-probe.pl'],{
      cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
      input:JSON.stringify({shop:world.shops[0],csv:world.market.originalWholesaleCsv,
        span,draws,events:active,settlement:{town:world.period.town,
          dtPeople:world.period.dtPeople,commandNowSeconds:start+minutes*60}}),
    }));
    const input={...args(world,minutes,oracle.consumed),reviewedPeriod:reviewedBoundaryPeriod,
      r4ReviewedSort:reviewedR4.sort,r4DataRead:{reviewed:reviewedDataRead,activeOrder:oracle.activeOrder}};
    const got=projectR4BoundaryPreEventCandidate(input);
    assert.equal(got.committable,false);assert.equal(got.worldStateWritten,false);
    assert.equal(got.nowSeconds,1026000);assert.equal(got.plan.nowAfter,start+minutes*60);
    assert.equal(got.plan.effectiveSlices[0].timespanSeconds,span);
    assert.equal(got.receipt.periodDraws,dignity?4:3);
    assert.equal(got.receipt.totalDraws,oracle.used);
    assert.equal(got.receipt.plusPopulation,oracle.dtPeople);
    assert.notEqual(oracle.dtPeople,world.period.dtPeople);
    assert.deepEqual(got.settlement.town,oracle.town);
    assert.deepEqual(got.market.wholesale,oracle.wholesale);
    assert.equal(got.market.originalWholesaleCsv,oracle.csv);
    for(const [key,value] of Object.entries(got.shops[0])){
      if(key==='costtoday'){assert.ok(Math.abs(value-oracle.shop[key])<1e-8);continue;}
      assert.deepEqual(value,oracle.shop[key],key);
    }
    assert.equal(JSON.stringify(world),before);
    assert.throws(()=>projectR4BoundaryPreEventCandidate({...input,randomDraws:oracle.consumed.slice(0,-1)}),/missing/);
    assert.throws(()=>projectR4SortedInventoryPreEventTurn({...args(world,minutes,draws.slice(0,121)),reviewedR4,reviewedDataRead,activeOrder:oracle.activeOrder}),/period settlement/);
  }
});

import {projectR4CrossPeriodCandidate,continueR4CrossPeriodCandidate} from '../src/original-r4-cross-period-candidate.mjs';
test('R4 candidate preserves original DataRead overlay and native EVENT hash across both boundary slices',()=>{
  const {repository}=fresh(true),world=structuredClone(repository.read());
  world.nowSeconds=1025980;
  world.period.eventState={'plusup-tetu':1025990,'happy':1030000};
  world.shops[0].blocklogin='';world.shops[0].dignity=0;
  const before=JSON.stringify(world);
  const result=projectR4CrossPeriodCandidate({world,minutes:1,street,reviewedR4,reviewedDataRead,
    reviewedHash:hashReview,reviewedEvents:eventReview,reviewedPeriod:reviewedBoundaryPeriod});
  assert.equal(result.committable,false);assert.equal(result.worldStateWritten,false);
  assert.equal(result.nowSeconds,1026040);
  assert.equal(result.period.settledCount,1);assert.equal(result.period.lastSettledBoundarySeconds,1026000);
  assert.deepEqual(result.evidence.slices.map(s=>[s.dateupdate,s.spanSeconds]),[[1,20],[0,40]]);
  assert.equal(result.evidence.plusSeconds[4],720);
  const env={...process.env,PERL_HASH_SEED:result.evidence.seed,PERL_PERTURB_KEYS:'0'};
  const run=(script,input,argv=[])=>JSON.parse(execFileSync('perl',[script,...argv],{
    cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',env,input:JSON.stringify(input)
  }));
  const wire=Object.entries(world.period.eventState).flat().join(',');
  const e=result.evidence.slices;
  const actual=run('original-r4-mixed-support-gate-probe.pl',{
    eventWire:wire,startSeconds:world.nowSeconds,shop:world.shops[0],
    csv:world.market.originalWholesaleCsv,
    settlement:{town:world.period.town,dtPeople:world.period.dtPeople,commandNowSeconds:result.nowSeconds},
    slices:e.map(s=>({spanSeconds:s.spanSeconds,dateupdate:s.dateupdate})),
    samples:e.flatMap(s=>[...s.preEventDraws,...s.eventSamples]),
  },['--cross-period-turn']);
  assert.equal(actual.nowSeconds,result.nowSeconds);
  assert.deepEqual(actual.dataReadOrder,result.evidence.dataReadOrder);
  const events=actual.slices;
  for(const [i,s] of e.entries()){
    const pre=events[i].preEvent;
    assert.equal(pre.preEventDrawCount,s.preEventDraws.length);
    assert.deepEqual(pre.wholesale,s.preEvent.market.wholesale);
    assert.equal(pre.csv,s.preEvent.market.originalWholesaleCsv);
    assert.deepEqual(pre.plus,result.evidence.plusSeconds);
    assert.equal(pre.dtPeople,result.period.dtPeople);
    assert.deepEqual(pre.town,result.period.town);
    for(const [key,value] of Object.entries(s.preEvent.shops[0])){
      if(key==='costtoday'){assert.ok(Math.abs(value-pre.shop[key])<1e-8);continue;}
      assert.deepEqual(value,pre.shop[key],key+' pre-EVENT slice '+i);
    }
  }
  for(const [i,s] of e.entries()){
    assert.deepEqual(events[i].activeOrder,s.activeOrder);
    assert.deepEqual(events[i].eventOrder,s.eventOrder);
    assert.deepEqual(events[i].nowOrder,s.nowOrder);
    assert.deepEqual(events[i].eventState,s.eventState);
    assert.deepEqual(events[i].ranges,s.eventDrawRanges);
    assert.deepEqual(events[i].logs,s.eventLogs);
    for(const [key,value] of Object.entries(s.shop)){
      if(key==='costtoday'){assert.ok(Math.abs(value-events[i].shop[key])<1e-8);continue;}
      assert.deepEqual(value,events[i].shop[key],key);
    }
  }
  // The original DataRead overlay remains in effect AFTER the ore event
  // expires in slice 1. Residual natural sale and PLUS see the new people.
  const residual=run('original-r4-p3-pre-event-overlay-probe.pl',{
    shop:e[0].shop,csv:e[0].preEvent.market.originalWholesaleCsv,
    span:e[1].spanSeconds,draws:e[1].preEventDraws,eventWire:wire,
    dtPeople:result.period.dtPeople});
  assert.equal(residual.plus[4],720);
  assert.deepEqual(e[1].preEvent.market.wholesale,residual.wholesale);
  assert.equal(e[1].preEvent.market.originalWholesaleCsv,residual.csv);
  assert.equal(e[1].preEvent.receipt.totalDraws,residual.used);
  for(const [key,value] of Object.entries(e[1].preEvent.shops[0])){
    if(key==='costtoday'){assert.ok(Math.abs(value-residual.shop[key])<1e-8);continue;}
    assert.deepEqual(value,residual.shop[key],key);
  }
  assert.equal(JSON.stringify(world),before);
  assert.equal(e[0].eventDrawRanges.includes(0),true,'subminute happy consumes one source rand(0)');
  assert.equal(execFileSync('perl',['-e','print int(rand(0))'],{encoding:'utf8'}),'0');
  assert.deepEqual(result,projectR4CrossPeriodCandidate({world,minutes:1,street,reviewedR4,reviewedDataRead,
    reviewedHash:hashReview,reviewedEvents:eventReview,reviewedPeriod:reviewedBoundaryPeriod}));
  // A new command reloads the final EVENT wire, not the expired overlay.
  const next=continueR4CrossPeriodCandidate({previous:result,minutes:1});
  assert.equal(next.nowSeconds,result.nowSeconds+60);
  assert.equal(next.period.settledCount,1);
  assert.equal(next.period.dtPeople,result.period.dtPeople);
  assert.deepEqual(next.period.town,result.period.town);
  const n=next.evidence.slices[0];
  assert.equal(n.dateupdate,0);
  assert.equal(n.preEvent.receipt.plusPopulation,result.period.dtPeople);
  const restarted=JSON.parse(execFileSync('perl',['original-r4-mixed-support-gate-probe.pl','--cross-period-turn'],{
    cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
    env:{...process.env,PERL_HASH_SEED:next.evidence.seed,PERL_PERTURB_KEYS:'0'},
    input:JSON.stringify({postSettlement:true,eventWire:Object.entries(result.period.eventState).flat().join(','),
      startSeconds:result.nowSeconds,shop:result.shops[0],csv:result.market.originalWholesaleCsv,
      settlement:{town:result.period.town,dtPeople:result.period.dtPeople,commandNowSeconds:next.nowSeconds},
      slices:[{spanSeconds:60,dateupdate:0}],samples:[...n.preEventDraws,...n.eventSamples]})
  })).slices[0];
  assert.deepEqual(restarted.preEvent.wholesale,next.market.wholesale);
  assert.equal(restarted.preEvent.csv,next.market.originalWholesaleCsv);
  assert.deepEqual(restarted.eventState,next.period.eventState);
  assert.deepEqual(restarted.ranges,n.eventDrawRanges);
  for(const [key,value] of Object.entries(next.shops[0])){
    if(key==='costtoday'){assert.ok(Math.abs(value-restarted.shop[key])<1e-8);continue;}
    assert.deepEqual(value,restarted.shop[key],key);
  }
  assert.throws(()=>continueR4CrossPeriodCandidate({previous:structuredClone(result),minutes:1}),/lineage/);
  assert.throws(()=>project({...world,period:result.period,shops:result.shops,market:result.market,nowSeconds:result.nowSeconds},1),/known/);
  const expected=structuredClone(next);
  result.shops[0]={...result.shops[0],money:result.shops[0].money+12345};
  assert.deepEqual(continueR4CrossPeriodCandidate({previous:result,minutes:1}),expected,'public candidate mutation cannot alter private lineage');
});


test('R4 boundary source tax history becomes exact town income before PLUS, without weakening the old zero-tax scope',()=>{
  const {repository}=fresh(true),world=structuredClone(repository.read());
  world.nowSeconds=1025940;
  // Source ledger fixture, not a claim that this sum was acquired by HTTP.
  world.shops[0].blocklogin='';world.shops[0].dignity=0;world.shops[0].taxtoday=321;
  world.shops[0].saletoday=1000;
  const before=JSON.stringify(world);
  const draws=Array.from({length:125},(_,i)=>(i*7919+170000)%1000000);
  const oracle=JSON.parse(execFileSync('perl',['original-r4-p3-pre-event-overlay-probe.pl'],{
    cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
    input:JSON.stringify({shop:world.shops[0],csv:world.market.originalWholesaleCsv,
      span:60,draws,events:{},settlement:{town:world.period.town,
        dtPeople:world.period.dtPeople,commandNowSeconds:1026000}}),
  }));
  const input={...args(world,1,oracle.consumed),reviewedPeriod:reviewedTaxPeriod,
    r4ReviewedSort:reviewedR4.sort,r4DataRead:{reviewed:reviewedDataRead,activeOrder:oracle.activeOrder}};
  const got=projectR4BoundaryPreEventCandidate(input);
  assert.equal(got.committable,false);
  assert.equal(got.shops[0].taxyesterday,321);assert.equal(got.shops[0].taxtoday,0);
  assert.equal(got.settlement.town.in,321);assert.equal(got.settlement.town.money,321);
  assert.deepEqual(got.settlement.town,oracle.town);
  assert.deepEqual(got.market.wholesale,oracle.wholesale);
  assert.equal(got.market.originalWholesaleCsv,oracle.csv);
  for(const [key,value] of Object.entries(got.shops[0])){
    if(key==='costtoday'){assert.ok(Math.abs(value-oracle.shop[key])<1e-8);continue;}
    assert.deepEqual(value,oracle.shop[key],key);
  }
  assert.equal(JSON.stringify(world),before);
  assert.throws(()=>projectR4BoundaryPreEventCandidate({...input,reviewedPeriod:reviewedBoundaryPeriod}),/reviewed-tax/);
});

import {writeFile,mkdir,mkdtemp,rm,utimes,readdir,stat} from 'node:fs/promises';
import os from 'node:os';
import {reviewPeriodPlay,serializePeriodPlay,parsePeriodPlay,readPeriodPlay} from '../src/original-r4-period-play-file.mjs';
import {reviewTownFiles} from '../src/original-r4-town-files.mjs';
import {reviewBackupDisk} from '../src/original-r4-backup-disk.mjs';
import {reviewPeriodLog} from '../src/original-r4-period-log-disk.mjs';
import {reviewGuildFiles} from '../src/original-r4-guild-files.mjs';
import {reviewExternalFiles} from '../src/original-r4-external-files-sandbox.mjs';
import {stageR4CrossPeriodDisk} from '../src/original-r4-cross-period-disk.mjs';
import {commitB50PeriodDisk} from '../src/original-r4-b50-period-disk.mjs';
const perlDir=path.join(root,'modern/tests/original-perl');
const readPerl=n=>readFile(path.join(perlDir,n),'utf8');
const diskGuildSources=Object.fromEntries(await Promise.all(['guildsub','config','sub','guild','write','turn','period'].map(async k=>[k,await readPerl(k==='turn'?'inc-turn.cgi':['write','period'].includes(k)?k+'.cgi':'pinned-'+k+'.cgi')])));
const diskReviews={
  play:reviewPeriodPlay({writeSource:source.originalDataWriteSource,incFuncSource:source.originalDataReadSource,detailSource:source.originalDetailSource,configSource:source.originalConfigSource},{crossPeriod:true}),
  town:reviewTownFiles({custom:await readPerl('pinned-custom.cgi'),read:source.originalDataReadSource,write:source.originalDataWriteSource}),
  backup:reviewBackupDisk({period:source.originalPeriodSource,write:source.originalDataWriteSource,config:source.originalConfigSource}),
  log:reviewPeriodLog({log:await readPerl('pinned-log.cgi'),period:source.originalPeriodSource,dsl:source.itemDsl,config:source.originalConfigSource}),
  guild:reviewGuildFiles(diskGuildSources),
  external:reviewExternalFiles({write:source.originalDataWriteSource,guild:diskGuildSources.guild,turn:source.originalTurnSource})
};
test('R4 actual crossing and residual EVENT feed four-file source commit, backup generations, sessions and original DataRead',async()=>{
  const {repository}=fresh(true),world=structuredClone(repository.read());
  world.nowSeconds=1025980;
  world.period.eventState={'plusup-tetu':1025990,'happy':1030000};
  // Explicit source disk fixture, NOT player acquisition or production login.
  Object.assign(world.shops[0],{pass:'',comment:'',remoteaddr:'',dignity:0,rankingcount:0,
    profitstock:0,taxmode:0,drmoney:0,trush:0,guild:'',blocklogin:'',nocheckip:'',
    job:'weapon',exp:{14:20,37:200},user:{first:'a',second:'b'},
    itemtoday:{10:1,40:2},itemyesterday:{41:1,42:2},saletoday:1000,taxtoday:321});
  const initial={lasttime:world.nowSeconds,people:world.period.dtPeople,nextid:100,blockip:'',taxRate:0,
    state:world.period.town,town:{},events:world.period.eventState,wholesale:world.market.wholesale,
    wholesaleCsv:world.market.originalWholesaleCsv,shops:world.shops};
  const codec={reviewed:diskReviews.play,townReview:diskReviews.town};
  const initialPlay=serializePeriodPlay({...codec,world:initial});
  const commandArgs={world,minutes:1,street,reviewedR4,reviewedDataRead,reviewedHash:hashReview,
    reviewedEvents:eventReview,reviewedPeriod:reviewedTaxPeriod};
  const result=projectR4CrossPeriodCandidate(commandArgs);
  const e=result.evidence.slices;
  const sourceDisk=JSON.parse(execFileSync('perl',['original-r4-mixed-support-gate-probe.pl','--cross-period-turn'],{
    cwd:perlDir,encoding:'utf8',maxBuffer:8*1024*1024,
    env:{...process.env,PERL_HASH_SEED:result.evidence.seed,PERL_PERTURB_KEYS:'0'},
    input:JSON.stringify({eventWire:wire(world.period.eventState),startSeconds:world.nowSeconds,shop:world.shops[0],
      csv:world.market.originalWholesaleCsv,settlement:{town:world.period.town,dtPeople:world.period.dtPeople,commandNowSeconds:result.nowSeconds},
      slices:e.map(s=>({spanSeconds:s.spanSeconds,dateupdate:s.dateupdate})),
      samples:e.flatMap(s=>[...s.preEventDraws,...s.eventSamples]),disk:{initialPlay,nextid:100}})
  })).disk;
  assert.ok(sourceDisk);
  const directory=await mkdtemp(path.join(os.tmpdir(),'akimono-r4-period-disk-'));
  const put=(n,v)=>writeFile(path.join(directory,n),v);
  const get=n=>readFile(path.join(directory,n),'utf8');
  const backupNames=['log0.cgi','log1.cgi','log2.cgi','guildbal.cgi','play.cgi'];
  try{
    for(const n of ['stage','backup','backup1','backup2','backup3','common','session'])await mkdir(path.join(directory,n));
    await put('play.cgi',initialPlay);
    await put('guild.cgi',"use utf8;\n$GUILDIDX_name=0;$GUILDIDX_dealrate=1;$GUILDIDX_feerate=2;%GUILD=();1;");
    await put('guildbal.cgi','');await put('lasttime.cgi','clock');
    for(let i=0;i<3;i++)await put('log'+i+'.cgi','live-'+i+'\n');
    for(const g of ['',1,2,3])for(const n of backupNames)await put('backup'+g+'/'+n,'prior-'+g+'/'+n+'\n');
    await utimes(path.join(directory,'backup/play.cgi'),world.nowSeconds-7200,world.nowSeconds-7200);
    await utimes(path.join(directory,'log1.cgi'),world.nowSeconds-129600,world.nowSeconds-129600);
    for(const n of ['old.cgi','edge.cgi','keep.txt']){
      await put('session/'+n,'source session');
      const time=result.nowSeconds-604800-(n==='old.cgi'?1:0);
      await utimes(path.join(directory,'session',n),time,time);
    }
    const wrong=structuredClone(world);wrong.shops[0].money++;
    await assert.rejects(stageR4CrossPeriodDisk({directory,reviews:diskReviews,commandArgs:{...commandArgs,world:wrong}}),/differs from live/);
    await assert.rejects(stat(path.join(directory,'period-attempt')),{code:'ENOENT'});
    // Independently compare the actual runtime disk projection with the
    // same frozen Perl result, rather than only testing the isolated writer.
    const {createIndependentDiskProjection,R4_INDEPENDENT_DISK}=await import('../src/original-r4-independent-world-disk.mjs');
    const projection=createIndependentDiskProjection({sources:{itemDsl:source.itemDsl,
      writeSource:source.originalDataWriteSource,readSource:source.originalDataReadSource,
      detailSource:source.originalDetailSource,configSource:source.originalConfigSource,
      periodSource:source.originalPeriodSource,newSource:await readPerl('new.cgi'),
      customSource:await readPerl('pinned-custom.cgi'),logSource:await readPerl('pinned-log.cgi')},sort:reviewedR4.sort,street});
    const liveFiles={};
    for(const n of [...backupNames,'guild.cgi','lasttime.cgi'])
      liveFiles[n]={bytes:n==='lasttime.cgi'?'':await get(n),mtime:n==='log1.cgi'?world.nowSeconds-129600:world.nowSeconds};
    const runtimeBefore={...world,period:{...world.period,disk:{source:R4_INDEPENDENT_DISK,live:liveFiles,
      backup:Object.fromEntries(backupNames.map(n=>[n,{bytes:liveFiles[n].bytes,mtime:world.nowSeconds-7200}])),
      generations:[null,null,null]}}};
    projection.validate(runtimeBefore);
    const finalized=projection.finalize({before:runtimeBefore,command:{kind:'advance-reviewed-world-time'},
      applied:{shops:result.shops,market:result.market,period:result.period,nowSeconds:result.nowSeconds,receipt:{}},
      logRows:projection.crossLogs(result)});
    const projected=finalized.period.disk;
    for(const n of ['guild.cgi','guildbal.cgi','log0.cgi','log1.cgi','log2.cgi'])
      assert.equal(projected.live[n].bytes,sourceDisk.live[n],'runtime '+n);
    for(const n of backupNames){
      assert.equal(projected.generations[0][n].bytes,sourceDisk.generations[0][n],'runtime newest backup '+n);
      assert.equal(projected.backup[n].bytes,sourceDisk.backup[n],'runtime regular backup '+n);
    }
    const runtimePlay=parsePeriodPlay({...codec,bytes:projected.live['play.cgi'].bytes});
    const actualPlay=parsePeriodPlay({...codec,bytes:sourceDisk.live['play.cgi']});
    assert.ok(Math.abs(runtimePlay.shops[0].costtoday-actualPlay.shops[0].costtoday)<1e-8);
    runtimePlay.shops[0].costtoday=actualPlay.shops[0].costtoday;
    assert.deepEqual(runtimePlay,actualPlay);
    assert.equal(projected.live['lasttime.cgi'].mtime,sourceDisk.lasttimeMtime);
    const stage=await stageR4CrossPeriodDisk({directory,reviews:diskReviews,commandArgs});
    assert.equal(stage.committable,false);assert.equal(stage.worldStateWritten,false);
    const parse=bytes=>parsePeriodPlay({...codec,bytes});
    const node=parse(stage.play.bytes),perl=parse(sourceDisk.stage['play.cgi']);
    const cost=node.shops[0].costtoday;
    assert.ok(Math.abs(cost-perl.shops[0].costtoday)<1e-8);
    node.shops[0].costtoday=perl.shops[0].costtoday;
    assert.deepEqual(node,perl);
    assert.equal(stage.play.bytes.split('\n')[3],sourceDisk.stage['play.cgi'].split('\n')[3],'actual native EVENT wire order');
    assert.equal(node.people,sourceDisk.reloaded.people);
    assert.equal(node.lasttime,sourceDisk.reloaded.lasttime);
    assert.equal(node.wholesaleCsv,sourceDisk.reloaded.csv);
    assert.deepEqual(node.state,sourceDisk.reloaded.state);
    assert.deepEqual(node.events,sourceDisk.reloaded.events);
    for(const k of ['item','exp','itemtoday','itemyesterday','user'])assert.deepEqual(node.shops[0][k],sourceDisk.reloaded[k]);
    for(const n of ['guild.cgi','guildbal.cgi','log0.cgi'])assert.equal(await get('stage/'+n),sourceDisk.stage[n],n);
    for(const [i,g] of sourceDisk.generations.entries())for(const n of backupNames)assert.equal(await get('backup'+(i+1)+'/'+n),g[n]);
    for(const n of backupNames)assert.equal(await get('backup/'+n),sourceDisk.backup[n]);
    assert.equal(Math.floor((await stat(path.join(directory,'lasttime.cgi'))).mtimeMs/1000),sourceDisk.lasttimeMtime);
    assert.deepEqual((await readdir(path.join(directory,'session'))).sort(),sourceDisk.sessions);
    assert.deepEqual(sourceDisk.sessions,['edge.cgi','keep.txt']);
    assert.equal(await get('play.cgi'),initialPlay);
    // Failure during the last rename must preserve the verified stage and
    // cannot redo the period, rotate backups or consume another prize.
    const live=path.join(directory,'play.cgi');await rm(live);await mkdir(live);
    await assert.rejects(commitB50PeriodDisk({directory,reviewed:diskReviews.external}));
    await assert.rejects(stageR4CrossPeriodDisk({directory,reviews:diskReviews,commandArgs}),/prior attempt/);
    await assert.rejects(readPeriodPlay({...codec,directory}),/pending commit/);
    await rm(live,{recursive:true});
    await commitB50PeriodDisk({directory,reviewed:diskReviews.external,recover:true});
    const loaded=await readPeriodPlay({...codec,directory});
    assert.equal(loaded.shops[0].costtoday,cost);
    loaded.shops[0].costtoday=perl.shops[0].costtoday;
    assert.deepEqual(loaded,perl);
    for(const n of ['guild.cgi','guildbal.cgi','log0.cgi','log1.cgi','log2.cgi'])assert.equal(await get(n),sourceDisk.live[n]);
    for(const [i,g] of sourceDisk.generations.entries())for(const n of backupNames)assert.equal(await get('backup'+(i+1)+'/'+n),g[n]);
    assert.deepEqual(await readdir(path.join(directory,'stage')),[]);
    await assert.rejects(stat(path.join(directory,'commit.cgi')),{code:'ENOENT'});
  }finally{await rm(directory,{recursive:true,force:true});}
});

test('R4 reviewed CAS settles two consecutive source boundaries from legal opening and rejects fabricated settled initial state',async()=>{
  const crossStreet=createStandardStreetModule({...source,originalNewSource:await readPerl('new.cgi'),
    originalCustomSource:await readPerl('pinned-custom.cgi'),originalLogSource:await readPerl('pinned-log.cgi'),
    enableReviewedNormalTime:true,enableReviewedCrossPeriod:true});
  const seed=createOriginalPeriodSeed(reviewOriginalPeriodBootstrap({
    periodSource:source.originalPeriodSource,adminSource:source.originalAdminInitSource,
    readSource:source.originalDataReadSource,writeSource:source.originalDataWriteSource,reviewedB41:crossStreet.reviewedB41}));
  const repository=createSourceReviewedMemoryWorldAdapter({initialWorld:createPeriodMemoryWorld({
    worldId:'r4-real-two-periods',streetId:crossStreet.id,nowSeconds:1025980,period:seed}),streetModule:crossStreet});
  function command(kind,fields={}){
    const result=executeMemoryCommand({repository,streetModule:crossStreet,command:{kind,expectedRevision:repository.read().revision,...fields}});
    assert.equal(result.ok,true,JSON.stringify(result.details));return result;
  }
  command('initialize-source-market');
  command('open-shop',{shopId:1,ownerName:'跨期來源',shopName:'連續結算'});
  const initial=repository.read();
  command('advance-reviewed-world-time',{minutes:1});
  const first=repository.read();
  assert.equal(first.period.settledCount,1);
  assert.equal(first.period.disk.generations[0]['play.cgi'].bytes,initial.period.disk.live['play.cgi'].bytes);
  const forgedZero={...structuredClone(first),revision:0};
  assert.throws(()=>createSourceReviewedMemoryWorldAdapter({initialWorld:forgedZero,streetModule:crossStreet}),/revision zero/);
  const forged=structuredClone(first);forged.period.disk.live['log0.cgi'].bytes+='forged\n';
  assert.throws(()=>createSourceReviewedMemoryWorldAdapter({initialWorld:forged,streetModule:crossStreet}),/provenance/);
  const rejected=applyGameCommand({world:forged,streetModule:crossStreet,command:{kind:'advance-reviewed-world-time',expectedRevision:forged.revision,minutes:1}});
  assert.equal(rejected.ok,false);
  let beforeSecond;
  for(let i=0;i<36;i++){
    beforeSecond=repository.read();
    command('advance-reviewed-world-time',{minutes:60});
  }
  const second=repository.read();
  assert.equal(second.nowSeconds,1155640);
  assert.equal(second.period.settledCount,2);
  assert.equal(second.period.lastSettledBoundarySeconds,1155600);
  assert.equal(second.period.disk.generations[0]['play.cgi'].bytes,beforeSecond.period.disk.live['play.cgi'].bytes);
  assert.equal(second.period.disk.generations[1]['play.cgi'].bytes,initial.period.disk.live['play.cgi'].bytes);
  assert.notEqual(second.period.dtPeople,first.period.dtPeople);
  assert.ok(second.shops[0].rankingcount>=2);
  const final=command('advance-reviewed-world-time',{minutes:1});
  assert.equal(final.world.period.settledCount,2);
});


test('external candidate full pre-EVENT prefix uses actual natural sale, ledger, rebel period and dynamic-population PLUS on the same state',()=>{
  const external=reviewR4ExternalPreEventItemOverlay({itemDsl:source.itemDsl,rebelDsl:source.rebelDsl,
    compilerSource:source.originalCompilerSource,turnSource:source.originalTurnSource,
    readSource:source.originalDataReadSource,periodSource:source.originalPeriodSource});
  const reviewedPeriod=reviewOriginalSoloPeriodPhaseChain({...boundarySources,includeReviewedSaleTax:true,reviewedRebelNow:external.rebel});
  for(const existing of [false,true]){
    const {repository}=fresh(true),world=structuredClone(repository.read());
    world.nowSeconds=1155540;
    world.period={...world.period,state:'source-cross-period-candidate-not-committed',settledCount:1,
      lastSettledBoundarySeconds:1026000,dtPeople:350000,
      town:{...world.period.town,leader:1,money:5000000,develop:9000,safety:9000,army:10000,robina:2000,people:500000},
      eventState:{'plusup-tetu':1200000,...(existing?{rebel:1155500}:{})}};
    Object.assign(world.shops[0],{blocklogin:'',dignity:13,taxtoday:321,saletoday:1000});
    const before=JSON.stringify(world);
    // Zeros intentionally drive invasion and award/dignity thresholds in
    // a source differential, never a genuine player trajectory.
    const draws=Array(125).fill(0);
    const oracle=JSON.parse(execFileSync('perl',['original-r4-p3-pre-event-overlay-probe.pl'],{
      cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
      input:JSON.stringify({shop:world.shops[0],csv:world.market.originalWholesaleCsv,
        span:60,draws,events:world.period.eventState,externalCandidate:true,
        settlement:{town:world.period.town,dtPeople:world.period.dtPeople,commandNowSeconds:1155600}}),
    }));
    const input={...args(world,1,oracle.consumed),reviewedPeriod,candidateSettled:true,
      conflictNames:{balJob:'外敵',balName:'首領'},r4ReviewedSort:reviewedR4.sort,
      r4DataRead:{reviewed:external,activeOrder:oracle.activeOrder}};
    const got=projectR4BoundaryPreEventCandidate(input);
    assert.equal(got.committable,false);assert.equal(got.worldStateWritten,false);
    assert.equal(got.receipt.periodDraws,existing?4:7);
    assert.equal(got.receipt.totalDraws,oracle.used);
    assert.equal(got.receipt.plusPopulation,oracle.dtPeople);
    assert.deepEqual(got.settlement.town,oracle.town);
    assert.equal(got.settlement.conflictTerritory.activeUntilSeconds,oracle.eventState.rebel);
    assert.equal(oracle.eventState.rebel,1155600+259200);
    assert.equal(got.settlement.town.in,321);
    assert.equal(got.shops[0].dignity,11);
    assert.deepEqual(got.market.wholesale,oracle.wholesale);
    assert.equal(got.market.originalWholesaleCsv,oracle.csv);
    for(const [key,value] of Object.entries(got.shops[0])){
      if(key==='costtoday'){assert.ok(Math.abs(value-oracle.shop[key])<1e-8);continue;}
      assert.deepEqual(value,oracle.shop[key],key);
    }
    assert.equal(JSON.stringify(world),before);
    assert.throws(()=>validateR4PreEventPeriod({reviewed:external,period:world.period,activeOrder:oracle.activeOrder,candidateSettled:true}),/explicit external candidate/);
    assert.throws(()=>projectR4BoundaryPreEventCandidate({...input,reviewedPeriod:reviewedTaxPeriod,conflictNames:null}),/external candidate/);
    assert.throws(()=>projectR4BoundaryPreEventCandidate({...input,randomDraws:oracle.consumed.slice(0,2)}),/missing/);
  }
});


import {projectR4ExternalCrossPeriodCandidate} from '../src/original-r4-external-cross-period-candidate.mjs';
import {parseArmyFile} from '../src/original-r4-army-files.mjs';
test('full actual two-slice source prefix, territory, mixed EVENT and real original army live/stage stay in one transaction',()=>{
  const external=reviewR4ExternalPreEventItemOverlay({itemDsl:source.itemDsl,rebelDsl:source.rebelDsl,
    compilerSource:source.originalCompilerSource,turnSource:source.originalTurnSource,
    readSource:source.originalDataReadSource,periodSource:source.originalPeriodSource});
  const reviewedPeriod=reviewOriginalSoloPeriodPhaseChain({...boundarySources,includeReviewedSaleTax:true,reviewedRebelNow:external.rebel});
  const reviewedEvents=reviewOriginalR4MultiEventFixture({
    compiledCatalog:street.reviewedEventCatalog,reviewedSeven:seven,turnSource:source.originalTurnSource,
    readSource:source.originalDataReadSource,reviewedSupportCallbacks:street.reviewedSupportEventCallbacks,
    reviewedInstantCallbacks:street.reviewedInstantEventCallbacks,reviewedLotoCallbacks:street.reviewedLoto,
    reviewedHappyEvent:street.reviewedB60Happy,reviewedIronEvent:street.reviewedB59Iron,
    reviewedSwordEvent:street.reviewedB61Sword,reviewedRebelEvent:external.rebel});
  for(const armed of [false,true]){
    const {repository}=fresh(true),world=structuredClone(repository.read());
    world.nowSeconds=1155580;
    world.period={...world.period,state:'source-cross-period-candidate-not-committed',settledCount:1,
      lastSettledBoundarySeconds:1026000,dtPeople:350000,
      town:{...world.period.town,leader:1,money:5000000,develop:5001,safety:5001,army:10000,robina:2000,people:500000},
      eventState:{'plusup-tetu':1155590,happy:1200000,rebel:1155500}};
    Object.assign(world.shops[0],{blocklogin:'',dignity:13,taxtoday:321,saletoday:1000});
    const liveArmyBytes=armed?'1,4000\n1\n':'\n\n';
    const input={world,minutes:1,street,reviewedR4,reviewedDataRead:external,reviewedHash:hashReview,
      reviewedEvents,reviewedPeriod,liveArmyBytes};
    const before=JSON.stringify(world),got=projectR4ExternalCrossPeriodCandidate(input);
    assert.equal(got.committable,false);assert.equal(got.worldStateWritten,false);
    assert.equal(got.nowSeconds,1155640);
    assert.equal(got.period.settledCount,2);
    assert.deepEqual(got.evidence.slices.map(s=>[s.dateupdate,s.spanSeconds]),[[1,20],[0,40]]);
    const slices=got.evidence.slices;
    const actual=JSON.parse(execFileSync('perl',['original-r4-mixed-support-gate-probe.pl','--cross-period-turn'],{
      cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
      env:{...process.env,PERL_HASH_SEED:got.evidence.seed,PERL_PERTURB_KEYS:'0'},
      input:JSON.stringify({externalCandidate:true,liveArmyBytes,eventWire:Object.entries(world.period.eventState).flat().join(','),
        startSeconds:world.nowSeconds,shop:world.shops[0],csv:world.market.originalWholesaleCsv,
        settlement:{town:world.period.town,dtPeople:world.period.dtPeople,commandNowSeconds:got.nowSeconds},
        slices:slices.map(s=>({spanSeconds:s.spanSeconds,dateupdate:s.dateupdate})),
        samples:slices.flatMap(s=>[...s.preEventDraws,...s.eventSamples])})
    }));
    assert.deepEqual(actual.dataReadOrder,got.evidence.dataReadOrder);
    for(const [i,s] of slices.entries()){
      const a=actual.slices[i];
      for(const k of ['activeOrder','eventOrder','nowOrder','afterOrder','eventState','town','transientArmy'])assert.deepEqual(s[k],a[k],i+' '+k);
      assert.equal(s.armyRead,Boolean(a.armyRead));
      assert.equal(a.liveArmyBytes,liveArmyBytes);
      assert.deepEqual(parseArmyFile(s.stagedArmyBytes,[1]),parseArmyFile(a.stagedArmyBytes,[1]));
      assert.deepEqual(s.eventDrawRanges,a.ranges);
      assert.deepEqual(s.eventLogs,a.logs);
      assert.equal(s.preEvent.receipt.totalDraws,a.preEvent.preEventDrawCount);
      assert.deepEqual(s.preEvent.market.wholesale,a.preEvent.wholesale);
      assert.equal(s.preEvent.market.originalWholesaleCsv,a.preEvent.csv);
      assert.deepEqual(a.preEvent.plus,got.evidence.plusSeconds);
      for(const [k,v] of Object.entries(s.shop)){
        if(k==='costtoday'){assert.ok(Math.abs(v-a.shop[k])<1e-8);continue;}
        assert.deepEqual(v,a.shop[k],i+' '+k);
      }
    }
    assert.equal(slices[0].armyRead,true);
    assert.equal(slices[1].armyRead,armed);
    assert.equal(Object.hasOwn(got.shops[0],'army'),false);
    assert.equal(got.liveArmyBytes,liveArmyBytes);
    assert.equal(got.stagedArmyBytes,armed?'1,3987\n1\n':'\n\n');
    assert.equal(JSON.stringify(world),before);
    assert.deepEqual(projectR4ExternalCrossPeriodCandidate(input),got);
    assert.throws(()=>projectR4ExternalCrossPeriodCandidate({...input,taxRate:1}),/no tax-rate/);
  }
});


import {stageR4ExternalCrossPeriodDisk} from '../src/original-r4-cross-period-disk.mjs';
import {commitR4ExternalCrossPeriodDisk} from '../src/original-r4-b50-period-disk.mjs';
test('R4 two-slice external source fixture stages five files and recovers the same army/play/log transaction',async()=>{
  const external=reviewR4ExternalPreEventItemOverlay({itemDsl:source.itemDsl,rebelDsl:source.rebelDsl,
    compilerSource:source.originalCompilerSource,turnSource:source.originalTurnSource,
    readSource:source.originalDataReadSource,periodSource:source.originalPeriodSource});
  const reviewedPeriod=reviewOriginalSoloPeriodPhaseChain({...boundarySources,includeReviewedSaleTax:true,reviewedRebelNow:external.rebel});
  const reviewedEvents=reviewOriginalR4MultiEventFixture({
    compiledCatalog:street.reviewedEventCatalog,reviewedSeven:seven,turnSource:source.originalTurnSource,
    readSource:source.originalDataReadSource,reviewedSupportCallbacks:street.reviewedSupportEventCallbacks,
    reviewedInstantCallbacks:street.reviewedInstantEventCallbacks,reviewedLotoCallbacks:street.reviewedLoto,
    reviewedHappyEvent:street.reviewedB60Happy,reviewedIronEvent:street.reviewedB59Iron,
    reviewedSwordEvent:street.reviewedB61Sword,reviewedRebelEvent:external.rebel});
  for(const armed of [false,true]){
    const {repository}=fresh(true),world=structuredClone(repository.read());
    world.nowSeconds=1155580;
    world.period={...world.period,state:'source-cross-period-candidate-not-committed',settledCount:1,
      lastSettledBoundarySeconds:1026000,dtPeople:350000,
      town:{...world.period.town,leader:1,money:5000000,develop:5001,safety:5001,army:10000,robina:2000,people:500000},
      eventState:{'plusup-tetu':1155590,happy:1200000,rebel:1155500}};
    Object.assign(world.shops[0],{blocklogin:'',dignity:13,taxtoday:321,saletoday:1000});
    const liveArmyBytes=armed?'1,4000\n1\n':'\n\n';
    const input={world,minutes:1,street,reviewedR4,reviewedDataRead:external,reviewedHash:hashReview,
      reviewedEvents,reviewedPeriod,liveArmyBytes};

    Object.assign(world.shops[0],{pass:'',comment:'',remoteaddr:'',rankingcount:0,profitstock:0,taxmode:0,drmoney:0,trush:0,guild:'',nocheckip:'',job:'weapon',exp:{14:20,37:200},user:{first:'a',second:'b'},itemtoday:{10:1,40:2},itemyesterday:{41:1,42:2}});
    const reviews={...diskReviews,play:reviewPeriodPlay({writeSource:source.originalDataWriteSource,incFuncSource:source.originalDataReadSource,detailSource:source.originalDetailSource,configSource:source.originalConfigSource},{crossPeriod:true,externalRebel:true})};
    const codec={reviewed:reviews.play,townReview:reviews.town};
    const initial={lasttime:world.nowSeconds,people:world.period.dtPeople,nextid:100,blockip:'',taxRate:0,state:world.period.town,town:{},events:world.period.eventState,wholesale:world.market.wholesale,wholesaleCsv:world.market.originalWholesaleCsv,shops:world.shops};
    const initialPlay=serializePeriodPlay({...codec,world:initial});
    assert.throws(()=>serializePeriodPlay({reviewed:diskReviews.play,townReview:reviews.town,world:initial}),/unreviewed EVENT/);
    const result=projectR4ExternalCrossPeriodCandidate(input);
    const e=result.evidence.slices;
    const sourceDisk=JSON.parse(execFileSync('perl',['original-r4-mixed-support-gate-probe.pl','--cross-period-turn'],{
      cwd:perlDir,encoding:'utf8',maxBuffer:8*1024*1024,
      env:{...process.env,PERL_HASH_SEED:result.evidence.seed,PERL_PERTURB_KEYS:'0'},
      input:JSON.stringify({externalCandidate:true,liveArmyBytes,eventWire:wire(world.period.eventState),startSeconds:world.nowSeconds,shop:world.shops[0],csv:world.market.originalWholesaleCsv,
        settlement:{town:world.period.town,dtPeople:world.period.dtPeople,commandNowSeconds:result.nowSeconds},
        slices:e.map(s=>({spanSeconds:s.spanSeconds,dateupdate:s.dateupdate})),samples:e.flatMap(s=>[...s.preEventDraws,...s.eventSamples]),disk:{initialPlay,nextid:100}})
    })).disk;
    const directory=await mkdtemp(path.join(os.tmpdir(),'akimono-r4-period-disk-'));
    const put=(n,v)=>writeFile(path.join(directory,n),v);
    const get=n=>readFile(path.join(directory,n),'utf8');
    const backupNames=['log0.cgi','log1.cgi','log2.cgi','guildbal.cgi','play.cgi'];
    try{
      for(const n of ['stage','backup','backup1','backup2','backup3','common','session'])await mkdir(path.join(directory,n));
      await put('play.cgi',initialPlay);await put('army.cgi',liveArmyBytes);
      await put('guild.cgi',"use utf8;\n$GUILDIDX_name=0;$GUILDIDX_dealrate=1;$GUILDIDX_feerate=2;%GUILD=();1;");
      await put('guildbal.cgi','');await put('lasttime.cgi','clock');
      for(let i=0;i<3;i++)await put('log'+i+'.cgi','live-'+i+'\n');
      for(const g of ['',1,2,3])for(const n of backupNames)await put('backup'+g+'/'+n,'prior-'+g+'/'+n+'\n');
      await utimes(path.join(directory,'backup/play.cgi'),world.nowSeconds-7200,world.nowSeconds-7200);
      await utimes(path.join(directory,'log1.cgi'),world.nowSeconds-129600,world.nowSeconds-129600);
      for(const n of ['old.cgi','edge.cgi','keep.txt']){
        await put('session/'+n,'source session');
        const time=result.nowSeconds-604800-(n==='old.cgi'?1:0);
        await utimes(path.join(directory,'session',n),time,time);
      }
      // Same frozen full-source fixture exercises the production projection
      // and history format, NOT an admitted player or an authenticated anchor.
      const {createIndependentDiskProjection,R4_INDEPENDENT_DISK,R4_SETTLED_STATE}=await import('../src/original-r4-independent-world-disk.mjs');
      const {projectExternalTimeTrace}=await import('../src/original-r4-external-time-trace.mjs');
      const {makeReviewedTimeHistoryEntry,isReviewedTimeHistoryEntry,replayReviewedTimeHistoryEntry}=await import('../src/reviewed-world-time-history.mjs');
      const projection=createIndependentDiskProjection({sources:{itemDsl:source.itemDsl,writeSource:source.originalDataWriteSource,
        readSource:source.originalDataReadSource,detailSource:source.originalDetailSource,configSource:source.originalConfigSource,
        periodSource:source.originalPeriodSource,newSource:await readPerl('new.cgi'),customSource:await readPerl('pinned-custom.cgi'),
        logSource:await readPerl('pinned-log.cgi'),armyViewSource:await readPerl('pinned-army-view.cgi'),
        armyCommandSource:await readPerl('pinned-army-s.cgi'),armyFileSource:await readPerl('pinned-army.cgi'),
        armyCalcSource:await readPerl('calc.cgi')},sort:reviewedR4.sort,street,externalRebel:true});
      const liveFiles={};
      for(const n of [...backupNames,'guild.cgi','lasttime.cgi','army.cgi'])
        liveFiles[n]={bytes:n==='lasttime.cgi'?'':await get(n),mtime:n==='log1.cgi'?world.nowSeconds-129600:world.nowSeconds};
      const runtimeBefore={...world,period:{...world.period,state:R4_SETTLED_STATE,disk:{source:R4_INDEPENDENT_DISK,live:liveFiles,
        backup:Object.fromEntries(backupNames.map(n=>[n,{bytes:liveFiles[n].bytes,mtime:world.nowSeconds-7200}])),generations:[null,null,null]}}};
      projection.validate(runtimeBefore);
      const command={kind:'advance-reviewed-world-time',expectedRevision:world.revision,minutes:1};
      const sourceTrace=projectExternalTimeTrace(result);
      const finalized=projection.finalize({before:runtimeBefore,command,applied:{shops:result.shops,market:result.market,period:result.period,
        nowSeconds:result.nowSeconds,armyBytes:result.stagedArmyBytes,receipt:{action:command.kind,source:result.source,sourceTrace}},logRows:projection.externalLogs(result)});
      const runtimeAfter={...runtimeBefore,shops:finalized.shops,market:finalized.market,period:finalized.period,nowSeconds:result.nowSeconds,revision:world.revision+1};
      projection.validate(runtimeAfter);
      for(const n of ['army.cgi','guild.cgi','guildbal.cgi','log0.cgi','log1.cgi','log2.cgi'])
        assert.equal(runtimeAfter.period.disk.live[n].bytes,sourceDisk.live[n],'immutable projection '+n);
      assert.equal(runtimeAfter.period.disk.live['lasttime.cgi'].mtime,sourceDisk.lasttimeMtime);
      for(const n of backupNames){
        assert.equal(runtimeAfter.period.disk.generations[0][n].bytes,sourceDisk.generations[0][n]);
        assert.equal(runtimeAfter.period.disk.backup[n].bytes,sourceDisk.backup[n]);
      }
      assert.equal(Object.hasOwn(runtimeAfter.period.disk.backup,'army.cgi'),false);
      assert.equal(Object.hasOwn(runtimeAfter.shops[0],'army'),false);
      const runtimePlay=parsePeriodPlay({...codec,bytes:runtimeAfter.period.disk.live['play.cgi'].bytes});
      const oraclePlay=parsePeriodPlay({...codec,bytes:sourceDisk.live['play.cgi']});
      assert.ok(Math.abs(runtimePlay.shops[0].costtoday-oraclePlay.shops[0].costtoday)<1e-8);
      runtimePlay.shops[0].costtoday=oraclePlay.shops[0].costtoday;
      assert.deepEqual(runtimePlay,oraclePlay);
      const fixtureResult={ok:true,world:runtimeAfter,details:finalized.receipt};
      const historyEntry=makeReviewedTimeHistoryEntry({before:runtimeBefore,command,result:fixtureResult});
      assert.equal(isReviewedTimeHistoryEntry(historyEntry),true);
      assert.equal(historyEntry.trace.slices[0].armyRead,true);
      assert.equal(historyEntry.trace.slices[1].armyRead,armed);
      assert.deepEqual(historyEntry.trace.slices.map(s=>s.afterOrder),e.map(s=>s.afterOrder));
      const tampered=structuredClone(historyEntry);
      tampered.trace.slices[1].activeOrder.push('rebel');
      assert.equal(isReviewedTimeHistoryEntry(tampered),false);
      const forgedResult=structuredClone(fixtureResult);
      forgedResult.world.period.disk.live['army.cgi'].bytes='1,9999\n1\n';
      assert.throws(()=>makeReviewedTimeHistoryEntry({before:runtimeBefore,command,result:forgedResult}),/army or EVENT successor mismatch/);
      assert.throws(()=>replayReviewedTimeHistoryEntry({repository:{read:()=>runtimeBefore},streetModule:{reviewedNormalTime:true},entry:historyEntry}),/not authorized/);
      const {liveArmyBytes:ignored,...commandArgs}=input;
      await assert.rejects(stageR4ExternalCrossPeriodDisk({directory,reviews,commandArgs:input}),/actual live army/);
      const stage=await stageR4ExternalCrossPeriodDisk({directory,reviews,commandArgs});
      assert.equal(stage.committable,false);assert.equal(stage.worldStateWritten,false);
      assert.equal(await get('army.cgi'),liveArmyBytes);
      assert.equal(await get('play.cgi'),initialPlay);
      assert.equal(await get('stage/army.cgi'),result.stagedArmyBytes);
      for(const n of ['army.cgi','guild.cgi','guildbal.cgi','log0.cgi'])assert.equal(await get('stage/'+n),sourceDisk.stage[n],n);
      const parse=bytes=>parsePeriodPlay({...codec,bytes});
      const node=parse(stage.play.bytes),perl=parse(sourceDisk.stage['play.cgi']);
      const cost=node.shops[0].costtoday;
      assert.ok(Math.abs(cost-perl.shops[0].costtoday)<1e-8);
      node.shops[0].costtoday=perl.shops[0].costtoday;
      assert.deepEqual(node,perl);
      assert.equal(stage.play.bytes.split('\n')[3],sourceDisk.stage['play.cgi'].split('\n')[3]);
      assert.equal(sourceDisk.transientArmyPersisted,0);
      assert.equal(Object.hasOwn(node.shops[0],'army'),false);
      for(const [i,g] of sourceDisk.generations.entries())for(const n of backupNames)assert.equal(await get('backup'+(i+1)+'/'+n),g[n]);
      for(const n of backupNames)assert.equal(await get('backup/'+n),sourceDisk.backup[n]);
      assert.deepEqual((await readdir(path.join(directory,'session'))).sort(),sourceDisk.sessions);
      await assert.rejects(commitB50PeriodDisk({directory,reviewed:reviews.external}),/attempt mode/);
      const stagedArmy=await get('stage/army.cgi');
      await put('stage/army.cgi','tampered');
      await assert.rejects(commitR4ExternalCrossPeriodDisk({directory,reviewed:reviews.external}),/differs from ready receipt/);
      await put('stage/army.cgi',stagedArmy);
      await put('army.cgi','1,9999\n1\n');
      await assert.rejects(commitR4ExternalCrossPeriodDisk({directory,reviewed:reviews.external}),/live preimage changed army/);
      await put('army.cgi',liveArmyBytes);
      await put('play.cgi',initialPlay+'tampered\n');
      await assert.rejects(commitR4ExternalCrossPeriodDisk({directory,reviewed:reviews.external}),/live preimage changed play/);
      await put('play.cgi',initialPlay);
      await assert.rejects(stat(path.join(directory,'commit.cgi')),{code:'ENOENT'});
      // army is the first reviewed rename; guild failure must leave marker and already-moved army.
      const live=path.join(directory,'guild.cgi');await rm(live);await mkdir(live);
      await assert.rejects(commitR4ExternalCrossPeriodDisk({directory,reviewed:reviews.external}));
      assert.equal(await get('army.cgi'),stagedArmy);
      await assert.rejects(stageR4ExternalCrossPeriodDisk({directory,reviews,commandArgs}),/prior attempt/);
      await assert.rejects(readPeriodPlay({...codec,directory}),/pending commit/);
      await rm(live,{recursive:true});
      await commitR4ExternalCrossPeriodDisk({directory,reviewed:reviews.external,recover:true});
      const loaded=await readPeriodPlay({...codec,directory});
      assert.equal(loaded.shops[0].costtoday,cost);
      loaded.shops[0].costtoday=perl.shops[0].costtoday;
      assert.deepEqual(loaded,perl);
      assert.deepEqual(loaded.events,sourceDisk.reloaded.events);
      assert.deepEqual(loaded.state,sourceDisk.reloaded.state);
      assert.equal(Math.floor((await stat(path.join(directory,'lasttime.cgi'))).mtimeMs/1000),sourceDisk.lasttimeMtime);
      const reloadedArmy=parseArmyFile(await get('army.cgi'),[1]);
      assert.deepEqual(reloadedArmy,{armyById:sourceDisk.reloadedArmy.army,riotIds:sourceDisk.reloadedArmy.riot});
      for(const n of ['army.cgi','guild.cgi','guildbal.cgi','log0.cgi','log1.cgi','log2.cgi'])assert.equal(await get(n),sourceDisk.live[n],n);
      assert.deepEqual(await readdir(path.join(directory,'stage')),[]);
      await assert.rejects(stat(path.join(directory,'commit.cgi')),{code:'ENOENT'});
    }finally{await rm(directory,{recursive:true,force:true});}
  }
});
