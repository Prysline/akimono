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
import {reviewR4PreEventItemOverlay,projectR4PreEventItemOverlay} from '../src/original-r4-pre-event-item-overlay.mjs';
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
  shop.item[78]=2;shop.exp={'9':180,'20':600,'21':400,'22':200,'23':700,'37':250,'66':500};shop.job='tool';
  const rules=street.reviewedB41.p3TurnItems.rules;
  const groups=new Set(),events={};
  for(const e of reviewedDataRead.catalog.compiled){
    if(!reviewedDataRead.params.rules[e.code].length&&e.code!=='happy')continue;
    if(groups.has(e.group))continue;
    groups.add(e.group);events[e.code]=world.nowSeconds+100000;
  }
  for(const id of [0,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,67,68,69,70]){
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

import {projectR4CrossPeriodCandidate} from '../src/original-r4-cross-period-candidate.mjs';
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
