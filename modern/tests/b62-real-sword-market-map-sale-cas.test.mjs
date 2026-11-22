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
import {reviewOriginalB62SwordMap,B62_MAP_SOURCE}
  from '../src/original-b62-sword-map-acquisition.mjs';

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
];
const sourceRows=await Promise.all(pairs.map(async ([k,p])=>[k,await read(p)]));
const src=Object.fromEntries(sourceRows);
const street=createStandardStreetModule(src);
const reviewed=street.reviewedB62Map;
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
    worldId:'b62-original-map-to-real-wood-sword-shop',
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
function makeWoodSwords(){
  const {repository,act}=newShop();
  const initial=repository.read();
  assert.equal(initial.market.wholesale[39],0,
    'a fresh source market MUST NOT have #40 swords for a fake purchase');
  const quote=street.quoteMarketItem14(initial);
  assert.equal(quote.itemId,14);
  assert.equal(quote.price,10000);
  assert.ok(quote.marketStock>0,'original PLUS +1h must actually stock map 14');
  assert.ok(act('buy-market-item-14',{
    shopId:1,requestedCount:1,
    marketShelf:quote.shelf,expectedPrice:quote.price,
  }).ok);
  const bought=repository.read();
  assert.equal(bought.shops[0].item[13],1);
  assert.equal(bought.shops[0].item[39],0);
  const useDraws=[
    999999, // original USE funcb: no doubling
    ...Array(10).fill(0), // original #40 40% success all ten
    ...Array(40).fill(999999), // no other sword creations
    999999, // original lostbook: does not destroy the map
  ];
  const used=act('use-original-sword-map-14',{
    shopId:1,randomDraws:useDraws,
  });
  assert.equal(used.ok,true,JSON.stringify(used));
  assert.equal(used.world.shops[0].item[39],10);
  assert.equal(used.world.shops[0].item[13],1);
  assert.equal(used.world.shops[0].exp['14'],20);
  assert.equal(used.world.shops[0].paytoday,bought.shops[0].paytoday+12000);
  assert.equal(used.world.shops[0].money,bought.shops[0].money-12000);
  const edited=act('edit-showcase',{
    shopId:1,shelf:0,itemId:40,per:100,priceOverride:1200,
  });
  assert.equal(edited.ok,true,JSON.stringify(edited));
  assert.equal(edited.world.shops[0].showcase[0],40);
  return {repository,act,quote,useDraws};
}
function saleDraws(world,minutes,{first=500000,second=500000}={}){
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
        reviewedB62Map:reviewed,
        reviewedEventTimeSlice:true,
      });
      return draws;
    }catch(e){
      if(e.message.includes('crosses original period settlement'))throw e;
    }
  }
  throw Error('B-62 original natural/PLUS sample prefix not found');
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
test('B-62 source review locks the only LEGITIMATE initial #14 market path, five probabilistic rewards and callbacks',()=>{
  assert.equal(reviewed.source,B62_MAP_SOURCE);
  assert.equal(street.reviewedB41.swordMapSource,B62_MAP_SOURCE);
  assert.equal(street.reviewedB56.swordMap,B62_MAP_SOURCE);
  assert.equal(reviewed.mapItemId,14);
  assert.equal(reviewed.swordItemId,40);
  assert.equal(reviewed.mapUsePrice,12000);
  assert.equal(reviewed.mapUseTimeSeconds,7200);
  assert.equal(reviewed.mapUseExp,20);
  assert.deepEqual(reviewed.outputs.map(x=>x.probabilityPermille),
    [400,350,150,60,30]);
  const {repository}=newShop();
  assert.equal(repository.read().market.wholesale[39],0);
  assert.equal(street.quoteMarketItem14(repository.read()).canBuy,true);
  const args={
    itemDsl:src.itemDsl,
    model:loadStandardStreetModel(src.itemDsl,src.rebelDsl),
    compiled:street.reviewedGiftMapUse,
    reviewedMarket10:street.reviewedMarketBuy10,
    buySource:src.originalBuySource,
    wholeSource:src.originalWholeSource,
    calcSource:src.originalBuyCalcSource,
    itemSource:src.originalBuyItemSource,
    compilerSource:src.originalCompilerSource,
    useSource:src.originalUseSource,
    readSource:src.originalDataReadSource,
  };
  for(const drift of [
    {itemDsl:src.itemDsl.replace(
      'get\t\t10\t木刀\t\t\t40%',
      'get\t\t10\t木刀\t\t\t41%')},
    {useSource:src.originalUseSource.replace(
      'sub MakeAmount','sub ChangedAmount')},
  ]){
    assert.throws(()=>reviewOriginalB62SwordMap({...args,...drift}),/B-62/);
  }
});
test('B-62 true map-market #14 buy, source USE yields #40, then ken-sale START and next-slice real wooden sword SALES increase',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'akimono-b62-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  const {repository}=makeWoodSwords();
  const opened=repository.read();
  assert.equal(opened.shops[0].item[39],10);
  assert.equal(opened.shops[0].showcase[0],40);
  const started=runSlice(repository,30,true);
  assert.equal(started.ok,true,JSON.stringify(started.details));
  assert.equal(started.details.soldItemId,40);
  assert.equal(started.details.naturalSaleCount,2);
  assert.equal(started.details.swordDemandWasActiveAtDataRead,false);
  assert.equal(started.world.shops[0].item[39],8);
  assert.equal(started.world.period.eventState['ken-sale'],
    opened.nowSeconds+21600);
  assert.equal(started.world.shops[0].money-opened.shops[0].money,2400);
  assert.equal(started.world.shops[0].itemtoday['40'],2);
  assert.equal(started.details.eventStarts.includes('ken-sale'),true);
  const disk=createLocalWorldSaveStore({directory:dir});
  disk.save(started.world,{expectedGeneration:0});
  assert.deepEqual(disk.load().world,started.world);
  const resumed=createMemoryWorldAdapter(disk.load().world);
  const after=resumed.read();
  const noEvent={...after,period:{...after.period,eventState:{}}};
  const normal=projectB41Sale({
    world:noEvent,reviewed:street.reviewedB41,
    reviewedAllPlus:street.reviewedAllPlus,
    compiled:street.reviewedGiftMapUse,
    shopId:1,minutes:30,randomDraws:saleDraws(noEvent,30),
    reviewedB59Iron:street.reviewedB59Iron,
    reviewedB60Happy:street.reviewedB60Happy,
    reviewedB61Sword:street.reviewedB61Sword,
    reviewedB62Map:reviewed,reviewedEventTimeSlice:true,
  });
  const activeProjection=projectB41Sale({
    world:after,reviewed:street.reviewedB41,
    reviewedAllPlus:street.reviewedAllPlus,
    compiled:street.reviewedGiftMapUse,
    shopId:1,minutes:30,randomDraws:saleDraws(after,30),
    reviewedB59Iron:street.reviewedB59Iron,
    reviewedB60Happy:street.reviewedB60Happy,
    reviewedB61Sword:street.reviewedB61Sword,
    reviewedB62Map:reviewed,reviewedEventTimeSlice:true,
  });
  assert.equal(normal.receipt.naturalSaleCount,2);
  assert.equal(activeProjection.receipt.naturalSaleCount,5);
  assert.equal(activeProjection.receipt.naturalSaleCount>
    normal.receipt.naturalSaleCount,true);
  assert.equal(activeProjection.receipt.moneyAfter-
    after.shops[0].money,6000);
  assert.equal(normal.receipt.moneyAfter-after.shops[0].money,2400);
  const active=runSlice(resumed,30);
  assert.equal(active.ok,true,JSON.stringify(active.details));
  assert.equal(active.details.swordDemandWasActiveAtDataRead,true);
  assert.equal(active.details.naturalSaleCount,5);
  assert.equal(active.world.shops[0].item[39],3);
  assert.equal(active.world.shops[0].itemtoday['40'],7);
  assert.equal(active.world.shops[0].money-after.shops[0].money,6000);
  assert.equal(active.world.period.eventState['ken-sale'],
    started.world.period.eventState['ken-sale']);
  assert.equal(active.world.market.wholesale[39],0);
  disk.save(active.world,{expectedGeneration:1});
  assert.deepEqual(disk.load().world,active.world);
});
test('B-62 forbidden map callback outcomes, foreign swords, stale purchase/old CAS all reject without mutation',()=>{
  const {repository,quote,useDraws}=makeWoodSwords();
  const world=repository.read();
  const run=(draws)=>executeMemoryCommand({
    repository,streetModule:street,
    command:{kind:'use-original-sword-map-14',
      expectedRevision:world.revision,
      shopId:1,randomDraws:draws},
  });
  for(const modified of [
    useDraws.slice(0,-1),
    [0,...useDraws.slice(1)],
    [...useDraws.slice(0,11),0,...useDraws.slice(12)],
    [...useDraws.slice(0,-1),0],
    [1000000,...useDraws.slice(1)],
  ]){
    const response=run(modified);
    assert.equal(response.ok,false);
    assert.equal(response.code,'SOURCE_BOUNDARY_REJECTED');
    assert.deepEqual(repository.read(),world);
  }
  const old=applyGameCommand({world,streetModule:street,
    command:{kind:'buy-market-item-14',
      expectedRevision:world.revision,shopId:1,requestedCount:1,
      marketShelf:quote.shelf+1,expectedPrice:quote.price}});
  assert.equal(old.ok,false);
  const stale=applyGameCommand({world,streetModule:street,
    command:{kind:'use-original-sword-map-14',
      expectedRevision:world.revision+1,
      shopId:1,randomDraws:useDraws}});
  assert.equal(stale.code,'REVISION_CONFLICT');
  assert.deepEqual(repository.read(),world);
});
