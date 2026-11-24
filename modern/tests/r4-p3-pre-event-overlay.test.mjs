import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {createPeriodMemoryWorld,createMemoryWorldAdapter,
  executeMemoryCommand,applyGameCommand} from '../src/game-core-contract.mjs';
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
