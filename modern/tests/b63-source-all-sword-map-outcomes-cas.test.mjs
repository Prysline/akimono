import test from 'node:test';
import assert from 'node:assert/strict';
import path,{join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {loadStandardStreetModel} from '../src/standard-street-model.mjs';
import {createMemoryWorldAdapter,createPeriodMemoryWorld,
  executeMemoryCommand,applyGameCommand} from '../src/game-core-contract.mjs';
import {createLocalWorldSaveStore} from '../src/local-world-save-store.mjs';
import {reviewOriginalPeriodBootstrap,createOriginalPeriodSeed}
  from '../src/original-period-world-seed.mjs';
import {projectB41Sale} from '../src/original-b41-playable-sale.mjs';
import {B63_MAP_SOURCE,reviewOriginalB63SwordMapOutcomes}
  from '../src/original-b63-sword-map-all-outcomes.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFile(join(root,p),'utf8');
const pairs=[
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
const sourceRows=await Promise.all(pairs.map(async ([k,p])=>[k,await read(p)]));
const src=Object.fromEntries(sourceRows);
const street=createStandardStreetModule(src);
const reviewed=street.reviewedB63Map;
const eventOrder=street.reviewedEventCatalog.compiled.map(x=>x.code).toReversed();
const supply=JSON.parse(execFileSync('perl',
  ['original-market-buy10-probe.pl'],
  {cwd:join(root,'modern/tests/original-perl'),encoding:'utf8'})).supply;

function seed(){
  return createOriginalPeriodSeed(reviewOriginalPeriodBootstrap({
    periodSource:src.originalPeriodSource,
    adminSource:src.originalAdminInitSource,
    readSource:src.originalDataReadSource,
    writeSource:src.originalDataWriteSource,
    reviewedB41:street.reviewedB41,
  }));
}
function newShop(){
  const repository=createMemoryWorldAdapter(createPeriodMemoryWorld({
    worldId:'b63-source-map-all-outcomes',
    streetId:'standard-street',nowSeconds:897400,
    period:seed(),
  }));
  const act=(kind,fields={})=>executeMemoryCommand({
    repository,streetModule:street,
    command:{kind,expectedRevision:repository.read().revision,...fields},
  });
  assert.equal(act('initialize-source-market').ok,true);
  assert.equal(act('open-shop',{
    shopId:1,ownerName:'原版劍商玩家',shopName:'B62 原版木刀商店',
  }).ok,true);
  assert.equal(act('reviewed-sparse-all-plus',{
    timespanSeconds:60,randomDraws:supply.draws,
  }).ok,true);
  return {repository,act};
}
function saleDraws(world,minutes,{first=500000,second=500000}={}){
  let lastReason='none';
  for(let i=0;i<=118;i++){
    const draws=[first,second,...Array(i).fill(0)];
    try{
      projectB41Sale({
        world,reviewed:street.reviewedB41,
        reviewedAllPlus:street.reviewedAllPlus,
        compiled:street.reviewedGiftMapUse,
        shopId:1,minutes,randomDraws:draws,
        reviewedB59Iron:street.reviewedB59Iron,
        reviewedB60Happy:street.reviewedB60Happy,
        reviewedB61Sword:street.reviewedB61Sword,
        reviewedB62Map:street.reviewedB62Map,
        reviewedB63Map:reviewed,
        reviewedEventTimeSlice:true,
      });
      return draws;
    }catch(e){
      lastReason=e?.message??String(e);
      if(lastReason.includes('crosses original period settlement'))throw e;
    }
  }
  throw Error('B-62 original natural/PLUS sample prefix not found: '+lastReason);
}
function eventDraws(world,minutes,enable=false){
  const occupied=Object.entries(world.period.eventState).filter(
    ([,at])=>at>=world.nowSeconds+minutes*60).map(([code])=>code);
  const draws=[];
  for(const code of eventOrder){
    if(occupied.includes(code))continue;
    draws.push(enable&&code==='ken-sale'?0:999999);
    if(enable&&code==='ken-sale')draws.push(0,0);
  }
  return draws;
}
function runSlice(repository,minutes,trigger=false){
  const world=repository.read();
  return executeMemoryCommand({
    repository,streetModule:street,
    command:{
      kind:'advance-source-time-reviewed-events',
      expectedRevision:world.revision,
      shopId:1,minutes,
      saleDraws:saleDraws(world,minutes),
      eventDraws:eventDraws(world,minutes,trigger),
      eventHashOrderFixture:eventOrder,
    },
  });
}

function oracle(scenario){
  return JSON.parse(execFileSync('perl',[
    'original-b63-sword-map-all-outcomes-probe.pl',scenario,
  ],{
    cwd:join(root,'modern/tests/original-perl'),encoding:'utf8',
  }));
}
function buyMap(){
  const {repository,act}=newShop();
  assert.equal(repository.read().market.wholesale[39],0,
    'cannot invent wood swords from negative market PLUS');
  const quote=street.quoteMarketOffer(repository.read(),14);
  assert.equal(quote.price,street.marketBuy.quote({rule:street.marketBuy.getRule(14),marketStock:quote.marketStock}).price);
  assert.ok(quote.marketStock>0);
  const purchased=act('market-buy',{itemId:14,
    shopId:1,requestedCount:1,
    marketShelf:quote.shelf,expectedPrice:quote.price,
  });
  assert.equal(purchased.ok,true,JSON.stringify(purchased.details));
  assert.equal(purchased.world.shops[0].item[13],1);
  return {repository,act,quote};
}
function useScenario(scenario){
  const evidence=oracle(scenario);
  const {repository,act,quote}=buyMap();
  const before=repository.read();
  const response=act('use-item',{
    shopId:1,itemId:14,useId:0,requestedCount:1,
    randomDraws:evidence.originalSamples,
  });
  assert.equal(response.ok,true,JSON.stringify(response.details));
  const shop=response.world.shops[0];
  const rows=[40,41,42,43,44].map(id=>shop.item[id-1]);
  assert.deepEqual(rows,evidence.result.swords,'original Perl five actual swords '+scenario);
  assert.deepEqual(response.details.originalAddItem,evidence.result.created,
    'original Core created array same as source executed Perl '+scenario);
  assert.equal(shop.item[13],evidence.result.maps);
  assert.equal(shop.money,before.shops[0].money-12000);
  assert.equal(shop.paytoday,before.shops[0].paytoday+12000);
  assert.equal(shop.time,before.shops[0].time+7200);
  assert.equal(shop.exp['14'],20);
  assert.equal(response.details.randomDrawsUsed,evidence.consumedDraws);
  assert.deepEqual(response.details.originalUseItem,
    evidence.result.originalUseItem??[]);
  assert.deepEqual(response.details.originalUseMsg,
    evidence.result.originalUseMsg??[]);
  assert.equal(response.details.originalResultOk,
    evidence.result.originalResultOk??null);
  assert.equal(response.details.originalFunctionReturn,
    evidence.result.callbackResult);
  assert.equal(response.details.mapDestroyed,scenario.endsWith('loss'));
  assert.equal(response.details.doubleRewardTriggered,
    scenario.startsWith('doubled')||scenario==='boundary');
  assert.equal(response.world.market.wholesale[39],0);
  return {repository,act,quote,evidence,response};
}
test('B-63 source review is opt-in; verifies exact Core UseItemSub, original five sword slots and default costs',()=>{
  assert.equal(reviewed.source,B63_MAP_SOURCE);
  assert.equal(street.reviewedB41.swordOutcomesSource,B63_MAP_SOURCE);
  assert.equal(street.reviewedB56.swordOutcomes,B63_MAP_SOURCE);
  assert.deepEqual(reviewed.items,[40,41,42,43,44]);
  assert.deepEqual(reviewed.probabilities,[400,350,150,60,30]);
  assert.deepEqual(reviewed.limits,[600,500,300,100,75]);
  assert.deepEqual(reviewed.cost,[120,150,320,800,1200]);
  const base={
    reviewedB62Map:street.reviewedB62Map,
    itemDsl:src.itemDsl,originalUseSource:src.originalUseSource,
    originalHelperSource:src.originalItemHelperSource,
    originalCalcSource:src.originalBuyCalcSource,
    originalWholeSource:src.originalWholeSource,
  };
  assert.throws(()=>reviewOriginalB63SwordMapOutcomes({
    ...base,
    originalHelperSource:src.originalItemHelperSource.replace(
      '$DT->{item}[$itemno-1]-=$count;',
      '$DT->{item}[$itemno-1]-=$count-1;'),
  }),/B-63/);
  assert.throws(()=>reviewOriginalB63SwordMapOutcomes({
    ...base,
    itemDsl:src.itemDsl.replace(
      'UseItem($itemno,1,$ITEM[$itemno]->{name}',
      'UseItem($itemno,2,$ITEM[$itemno]->{name}'),
  }),/B-63/);
  assert.throws(()=>reviewOriginalB63SwordMapOutcomes({
    ...base,
    itemDsl:src.itemDsl.replace(
      'return 0 if rand(1000)>100;',
      'return 0 if rand(1000)>100;\n$DT->{money}+=100;'),
  }),/B-63/);
});
test('B-63 original Perl oracle: no double five sword successes, map kept and map destroyed, no reward destroys map',()=>{
  for(const scenario of ['mixed','mixed-loss','zero-loss']){
    const {response,evidence}=useScenario(scenario);
    if(scenario.startsWith('mixed')){
      assert.deepEqual(evidence.result.swords,[2,2,2,2,2]);
      assert.equal(response.details.randomDrawsUsed,52);
    }else{
      assert.deepEqual(evidence.result.swords,[0,0,0,0,0]);
      assert.equal(response.details.originalAddItem.length,0);
    }
  }
});
test('B-63 original Perl oracle: inclusive funcb doubling uses 20-count Gaussian MakeAmount and lostbook may remove one actual map',()=>{
  for(const scenario of ['doubled','doubled-loss','boundary']){
    const {response,evidence}=useScenario(scenario);
    assert.deepEqual(evidence.result.swords,[8,7,3,1,1]);
    assert.equal(response.details.randomDrawsUsed,12);
    assert.equal(response.details.originalResultOk,'這次我們收穫的比平時多。');
    assert.ok(response.details.acquired.every(x=>
      x.attemptedCount===20&&x.branch==='large-sqrt-absolute'));
    if(scenario==='boundary'){
      assert.equal(evidence.originalSamples[0],100000);
      assert.equal(evidence.originalSamples.at(-1),100000);
      assert.equal(response.details.mapDestroyed,false,
        'source lostbook <100 does not destroy at equality');
      assert.equal(response.details.doubleRewardTriggered,true,
        'source funcb >100 means equality still doubles');
    }
  }
});
test('B-63 all five sword inventory persists across B43 checkpoint and remains legitimate for full B56 event/PLUS time slice',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'akimono-b63-outcomes-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  const {repository}=useScenario('doubled');
  const save=createLocalWorldSaveStore({directory:dir});
  const original=repository.read();
  save.save(original,{expectedGeneration:0});
  assert.deepEqual(save.load().world,original);
  const reload=createMemoryWorldAdapter(save.load().world);
  const result=runSlice(reload,30,false);
  assert.equal(result.ok,true,JSON.stringify(result.details));
  const shop=result.world.shops[0];
  assert.deepEqual([40,41,42,43,44].map(id=>shop.item[id-1]),
    [8,7,3,1,1],'unshowcased sword stock survives natural turn');
  assert.ok(shop.costtoday>original.shops[0].costtoday,
    'original source cost of all five owned sword stocks accrues');
  save.save(result.world,{expectedGeneration:1});
  assert.deepEqual(save.load().world,result.world);
});
test('B-63 old B-62 constrained action still refuses wider outputs; all-outcome action fails closed on missing/extra draws, replay, unowned map, stale CAS',()=>{
  const {repository,act,quote,evidence}=useScenario('mixed');
  const saved=repository.read();
  const command=(draws)=>executeMemoryCommand({
    repository,streetModule:street,
    command:{kind:'use-item',itemId:14,useId:0,requestedCount:1,
      expectedRevision:saved.revision,shopId:1,randomDraws:draws},
  });
  for(const draws of [
    evidence.originalSamples.slice(0,-1),
    [...evidence.originalSamples,999999],
    [1000000,...evidence.originalSamples.slice(1)],
    [0,...evidence.originalSamples.slice(1)],
  ]){
    const outcome=command(draws);
    assert.equal(outcome.ok,false);
    assert.equal(outcome.code,'SOURCE_BOUNDARY_REJECTED');
    assert.deepEqual(repository.read(),saved);
  }
  const legacy=executeMemoryCommand({repository,streetModule:street,
    command:{kind:'use-original-sword-map-14',
      expectedRevision:saved.revision,shopId:1,
      randomDraws:evidence.originalSamples},
  });
  assert.equal(legacy.ok,false,'B62 no-second-use remains fail-closed');
  const stale=applyGameCommand({world:saved,streetModule:street,
    command:{kind:'use-item',itemId:14,useId:0,requestedCount:1,
      expectedRevision:saved.revision-1,shopId:1,
      randomDraws:evidence.originalSamples},
  });
  assert.equal(stale.code,'REVISION_CONFLICT');
  const badQuote=applyGameCommand({world:saved,streetModule:street,
    command:{kind:'market-buy',itemId:14,expectedRevision:saved.revision,
      shopId:1,requestedCount:1,
      marketShelf:quote.shelf+1,expectedPrice:quote.price},
  });
  assert.equal(badQuote.ok,false);
  assert.deepEqual(repository.read(),saved);
});

test('B-63 original lostbook destroyed-map world remains a source-bounded durable B43 checkpoint, no map can be reused',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'akimono-b63-loss-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  const {repository,evidence}=useScenario('mixed-loss');
  const before=repository.read();
  assert.equal(before.shops[0].item[13],0);
  assert.deepEqual(evidence.result.swords,[2,2,2,2,2]);
  const save=createLocalWorldSaveStore({directory:dir});
  save.save(before,{expectedGeneration:0});
  assert.deepEqual(save.load().world,before);
  const reloaded=createMemoryWorldAdapter(save.load().world);
  const fail=executeMemoryCommand({
    repository:reloaded,streetModule:street,
    command:{kind:'use-item',itemId:14,useId:0,requestedCount:1,
      expectedRevision:before.revision,shopId:1,
      randomDraws:evidence.originalSamples},
  });
  assert.equal(fail.ok,false);
  assert.equal(fail.code,'SOURCE_BOUNDARY_REJECTED');
  assert.deepEqual(reloaded.read(),before);
});
