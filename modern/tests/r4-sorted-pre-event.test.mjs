import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {createPeriodMemoryWorld,createMemoryWorldAdapter,
  executeMemoryCommand} from '../src/game-core-contract.mjs';
import {reviewOriginalPeriodBootstrap,createOriginalPeriodSeed}
  from '../src/original-period-world-seed.mjs';
import {projectR3PreEventTurn}
  from '../src/original-b41-playable-sale.mjs';
import {reviewR4SortedPreEvent,projectR4SortedPreEventTurn,
  R4_SORTED_PRE_EVENT_SOURCE} from '../src/original-r4-sorted-pre-event.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=relative=>readFile(path.join(root,relative),'utf8');
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
  async ([k,p])=>[k,await read(p)])));
const street=createStandardStreetModule(source);
const reviewed=reviewR4SortedPreEvent({
  turnSource:source.originalTurnSource,
  detailSource:source.originalDetailSource,
  readSource:source.originalDataReadSource,
});
const cwd=path.join(root,'modern/tests/original-perl');
const plus=JSON.parse(execFileSync('perl',
  ['original-market-buy10-probe.pl'],{cwd,encoding:'utf8'})).supply;
const sale=JSON.parse(execFileSync('perl',
  ['original-b41-real-sale-probe.pl'],{cwd,encoding:'utf8'}));

function buildPurchasedWorld(){
  const bootstrap=reviewOriginalPeriodBootstrap({
    periodSource:source.originalPeriodSource,
    adminSource:source.originalAdminInitSource,
    readSource:source.originalDataReadSource,
    writeSource:source.originalDataWriteSource,
    reviewedB41:street.reviewedB41,
  });
  const adapter=createMemoryWorldAdapter(createPeriodMemoryWorld({
    worldId:'r4-source-sorted-world',streetId:'standard-street',
    nowSeconds:1000000,period:createOriginalPeriodSeed(bootstrap),
  }));
  const act=(kind,props={})=>executeMemoryCommand({
    repository:adapter,streetModule:street,
    command:{kind,expectedRevision:adapter.read().revision,...props},
  });
  for(const [kind,props] of [
    ['initialize-source-market',{}],
    ['open-shop',{shopId:1,ownerName:'來源商人',shopName:'R4 原版排序店'}],
    ['reviewed-sparse-all-plus',{timespanSeconds:60,randomDraws:plus.draws}],
  ]){
    const outcome=act(kind,props);
    assert.equal(outcome.ok,true,kind+' '+JSON.stringify(outcome.details));
  }
  const quote=street.quoteMarketOffer(adapter.read(),10);
  const bought=act('market-buy',{
    itemId:10,shopId:1,requestedCount:1,
    marketShelf:quote.shelf,expectedPrice:quote.price,
  });
  assert.equal(bought.ok,true,JSON.stringify(bought.details));
  const shown=act('edit-showcase',{
    shopId:1,shelf:0,itemId:10,per:100,priceOverride:5000,
  });
  assert.equal(shown.ok,true,JSON.stringify(shown.details));
  return adapter.read();
}
function args(world){
  return {
    world,reviewed:street.reviewedB41,
    reviewedAllPlus:street.reviewedAllPlus,
    compiled:street.reviewedGiftMapUse,
    shopId:1,minutes:30,
    randomDraws:sale.sale30.consumedSamples,
    reviewedB59Iron:street.reviewedB59Iron,
    reviewedB60Happy:street.reviewedB60Happy,
    reviewedB61Sword:street.reviewedB61Sword,
    reviewedB62Map:street.reviewedB62Map,
    reviewedB63Map:street.reviewedB63Map,
  };
}
function originalSort(shop){
  return JSON.parse(execFileSync('perl',
    ['original-r4-sorted-pre-event-probe.pl'],{
      cwd,encoding:'utf8',input:JSON.stringify(shop),
    }));
}
test('R4 frozen inc-turn order and source reviewed SortDT guard',()=>{
  assert.equal(reviewed.source,R4_SORTED_PRE_EVENT_SOURCE);
  assert.equal(reviewed.committable,false);
  assert.throws(()=>reviewR4SortedPreEvent({
    turnSource:source.originalTurnSource.replace('SortDT();',''),
    detailSource:source.originalDetailSource,
    readSource:source.originalDataReadSource,
  }),/source phase order drift/);
});
test('R4 reuses R3 market+natural sale+callbacks and adds real Perl SortDT before PLUS',()=>{
  const world=buildPurchasedWorld(),snapshot=JSON.stringify(world);
  const originalPreEvent=projectR3PreEventTurn(args(world));
  const sortedPreEvent=projectR4SortedPreEventTurn({
    ...args(world),reviewed,
  });
  const realPerl=originalSort(originalPreEvent.shops[0]);
  assert.deepEqual(sortedPreEvent.shops[0],realPerl.shop,
    'full shop matches real original Core SortDT');
  assert.equal(realPerl.idIndex,0);
  assert.equal(realPerl.nameIndex,0);
  assert.equal(sortedPreEvent.receipt.originalSortApplied,true);
  assert.equal(sortedPreEvent.receipt.r4Committable,false);
  assert.equal(sortedPreEvent.receipt.originalSortPoint,realPerl.shop.point);
  assert.equal(sortedPreEvent.receipt.totalDraws,
    originalPreEvent.receipt.totalDraws);
  assert.deepEqual(sortedPreEvent.market,originalPreEvent.market);
  assert.equal(Object.hasOwn(sortedPreEvent,'period'),false);
  assert.deepEqual(world.period.eventState,{});
  assert.equal(JSON.stringify(world),snapshot,'pure stage never mutates world');
});
test('R4 sorted phase rejects forged source or unknown prior EVENT without mutations',()=>{
  const world=buildPurchasedWorld(),snapshot=JSON.stringify(world);
  assert.throws(()=>projectR4SortedPreEventTurn({
    ...args(world),reviewed:{...reviewed,sort:{source:'not-a-source'}},
  }));
  assert.throws(()=>projectR4SortedPreEventTurn({
    ...args(world),reviewed,
    world:{...world,period:{...world.period,eventState:null}},
  }));
  assert.equal(JSON.stringify(world),snapshot);
});
