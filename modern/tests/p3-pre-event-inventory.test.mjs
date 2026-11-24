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
  const perl=JSON.parse(execFileSync('perl',['original-p3-pre-event-inventory-probe.pl'],{
    cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
    input:JSON.stringify({shop:world.shops[0],csv:world.market.originalWholesaleCsv,
      span:minutes*60,draws}),
  }));
  const result=projectP3PreEventTurn(args(world,minutes,perl.consumed));
  assert.equal(JSON.stringify(world),prior,'pure stage cannot mutate input');
  assert.equal(Object.hasOwn(result,'period'),false,'no EVENT successor claimed');
  assert.equal(Object.hasOwn(result,'revision'),false,'not a committed WorldState');
  assert.equal(result.nowSeconds,world.nowSeconds+minutes*60);
  const shop=result.shops[0];
  for(const key of ['money','rank','temprank','trush','saletoday','taxtoday','paytoday','time'])
    assert.equal(shop[key]??0,perl.shop[key]??0,key);
  assert.ok(Math.abs(shop.costtoday-perl.shop.costtoday)<1e-8);
  for(const key of ['item','itemtoday','exp','job'])
    assert.deepEqual(shop[key],perl.shop[key],key);
  assert.equal(shop._sale_count_,undefined);
  assert.deepEqual(result.market.wholesale,perl.wholesale);
  assert.deepEqual(result.market.sparseWrittenSlots,perl.defined);
  assert.equal(result.market.originalWholesaleCsv,perl.csv);
  assert.equal(result.receipt.totalDraws,perl.used);
  return result;
}
test('P3 real GameCore iron forge with spent vouchers, skills and EXP enters pure pre-EVENT stage',()=>{
  const {repository,command}=fresh();
  const use=(itemId,useId,requestedCount=1)=>command('use-item',
    {shopId:1,itemId,useId,requestedCount},Array(128).fill(500000));
  use(79,0);use(9,0,3);
  const offer=street.quoteMarketOffer(repository.read(),20);
  assert.ok(offer.canBuy);
  command('market-buy',{shopId:1,itemId:20,requestedCount:1,
    marketShelf:offer.shelf,expectedPrice:offer.price});
  use(79,3);use(37,0);use(20,0);
  const world=repository.read(),shop=world.shops[0];
  assert.equal(shop.item[17],1);
  assert.equal(shop.item[78],1);
  assert.equal(shop.exp['20'],20);
  assert.ok(shop.item[40]>0);
  const before=JSON.stringify(world);
  assert.throws(()=>projectB41Sale(args(world,1,[])),/inventory|shelf/);
  const projected=compare(world,1);
  assert.deepEqual(projected.shops[0].item,shop.item);
  assert.deepEqual(projected.shops[0].exp,shop.exp);
  assert.equal(JSON.stringify(repository.read()),before,'no memory CAS');
  assert.equal(world.nowSeconds,1000000);
});
test('P3 mixed-stock oracle: every reviewed manufacture product and source costs; stocked Nayuta dispatch',()=>{
  const {repository}=fresh(true);
  // Explicit arithmetic/differential fixture only, never a player world/save.
  const world=structuredClone(repository.read()),shop=world.shops[0];
  for(const id of Object.keys(street.reviewedB41.p3TurnItems.costs).map(Number))
    shop.item[id-1]=1;
  shop.item[78]=2;
  shop.exp={'9':180,'20':600,'21':400,'22':200,'23':700,'37':250,'66':500};
  shop.job='tool';
  const rules=street.reviewedB41.p3TurnItems.rules;
  for(const id of [0,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,67,68,69,70]){
    const candidate=structuredClone(world);
    candidate.shops[0].showcase=[id];candidate.shops[0].price=[id?rules[id].unitPrice:0];
    const result=compare(candidate,1);
    if(id===70)assert.equal(result.receipt.itemCallbackStage.itemTurnAffectedShops,1);
  }
});
test('P3 pure handoff rejects overflow, unknown stock, EXP overflow, unknown EVENT, 36h boundary and extra shelves',()=>{
  const {repository}=fresh(true);
  const world=structuredClone(repository.read());
  const badCases=[
    [w=>{w.shops[0].item[17]=2;},/holding cap/],
    [w=>{w.shops[0].item[64]=1;},/holding cap/],
    [w=>{w.shops[0].exp={'20':1001};},/LIMIT_EXP/],
    [w=>{w.shops[0].exp={'20':1000,'21':1000,'22':1000,'23':1000};},/LIMIT_EXP/],
    [w=>{w.shops[0].job='invented';},/career/],
    [w=>{w.period.eventState=null;},/EVENT/],
    [w=>{w.nowSeconds=1025980;},/period settlement/],
    [w=>{w.shops[0].showcasecount=2;w.shops[0].item[62]=0;
      w.shops[0].showcase=[0,0];w.shops[0].price=[0,0];},/single shelf/],
  ];
  for(const [mutate,message] of badCases){
    const candidate=structuredClone(world);mutate(candidate);
    const prior=JSON.stringify(candidate);
    assert.throws(()=>projectP3PreEventTurn(args(candidate,1,Array(121).fill(0))),message);
    assert.equal(JSON.stringify(candidate),prior);
  }
});
