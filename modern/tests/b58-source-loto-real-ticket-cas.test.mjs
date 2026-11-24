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
import {sourceCommandDraws} from '../src/local-source-command-draws.mjs';
import {reviewOriginalLotoStartfunc,projectOriginalLotoStartfunc,
  LOTO_RANGE,B58_LOTO_SOURCE} from '../src/original-b58-loto-startfunc.mjs';
import {reviewOriginalMarketBuy11,B58_MARKET11_SOURCE}
  from '../src/original-market-buy11.mjs';

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
const sourceList=await Promise.all(paths.map(read));
const fixed=Object.fromEntries(names.map((key,i)=>[key,sourceList[i]]));
const street=createStandardStreetModule(fixed);
const perlDir=join(root,'modern/tests/original-perl');
const perl=JSON.parse(execFileSync('perl',[
  'original-b58-loto-event-probe.pl',
],{cwd:perlDir,encoding:'utf8'}));
const buyOracle=JSON.parse(execFileSync('perl',[
  'original-market-buy11-probe.pl',
],{cwd:perlDir,encoding:'utf8'}));
const plusOracle=JSON.parse(execFileSync('perl',[
  'original-market-buy10-probe.pl',
],{cwd:perlDir,encoding:'utf8'})).supply;
const saleOracle=JSON.parse(execFileSync('perl',[
  'original-b41-real-sale-probe.pl',
],{cwd:perlDir,encoding:'utf8'}));
const saleDraws=saleOracle.sale30.consumedSamples;
const order=street.reviewedEventCatalog.compiled.map(e=>e.code).toReversed();

function eventDraws({lottery=[],triggerLoto=false,others=[]}={}){
  const out=[];
  for(const code of order){
    const trigger=(triggerLoto&&code==='loto')||others.includes(code);
    out.push(trigger?0:999999);
    if(trigger){
      if(code==='loto')out.push(...lottery.map(result=>({
        range:LOTO_RANGE,result,
      })));
      else out.push(0);
    }
  }
  return out;
}
function setupWorld({tickets=2}={}){
  const reviewedPeriod=reviewOriginalPeriodBootstrap({
    periodSource:fixed.originalPeriodSource,
    adminSource:fixed.originalAdminInitSource,
    readSource:fixed.originalDataReadSource,
    writeSource:fixed.originalDataWriteSource,
    reviewedB41:street.reviewedB41,
  });
  const adapter=createMemoryWorldAdapter(createPeriodMemoryWorld({
    worldId:'b58-real-source-lottery-world',
    streetId:'standard-street',nowSeconds:1000000,
    period:createOriginalPeriodSeed(reviewedPeriod),
  }));
  const act=(kind,fields={})=>executeMemoryCommand({
    repository:adapter,streetModule:street,
    command:{kind,expectedRevision:adapter.read().revision,...fields},
  });
  assert.equal(act('initialize-source-market').ok,true);
  assert.equal(act('open-shop',{
    shopId:1,ownerName:'實際店主',shopName:'B58 已買真實抽獎卷的商店',
  }).ok,true);
  assert.equal(act('reviewed-sparse-all-plus',{
    timespanSeconds:60,randomDraws:plusOracle.draws,
  }).ok,true);
  const original10=street.quoteMarketOffer(adapter.read(),10);
  assert.equal(act('market-buy',{itemId:10,
    shopId:1,requestedCount:1,
    marketShelf:original10.shelf,expectedPrice:original10.price,
  }).ok,true);
  const offer11=street.quoteMarketOffer(adapter.read(),11);
  assert.equal(offer11.itemId,11);
  assert.equal(offer11.price,2000);
  assert.ok(offer11.marketStock>=2,
    'original B-37 wholesale PLUS with pinned Perl samples stocks real tickets');
  const purchase=act('market-buy',{itemId:11,
    shopId:1,requestedCount:tickets,
    marketShelf:offer11.shelf,expectedPrice:offer11.price,
  });
  assert.ok(purchase.ok,JSON.stringify(purchase.details));
  assert.equal(purchase.details.purchasedCount,tickets);
  assert.equal(act('edit-showcase',{
    shopId:1,shelf:0,itemId:10,per:100,priceOverride:5000,
  }).ok,true);
  return {adapter,act,offer11,purchase};
}

function exactNaturalSaleDraws(world,minutes=30){
  // Inventory #11 affects world/cap state. Require an exact B-41 runtime
  // prefix rather than reusing unexamined randomness from the #10-only oracle.
  const candidates=[saleDraws,sourceCommandDraws({
    world,kind:'advance-source-time',args:{shopId:1,minutes},count:121,
  })];
  for(const samples of candidates){
    for(let n=1;n<=samples.length;n++){
      const prefix=samples.slice(0,n);
      const trial=applyGameCommand({
        world,streetModule:street,
        command:{kind:'advance-source-time',expectedRevision:world.revision,
          shopId:1,minutes,randomDraws:prefix},
      });
      if(trial.ok)return prefix;
    }
  }
  throw new Error('no exact source B-41 natural-sale / PLUS prefix for the real ticket shop');
}

test('B-58 real Perl original loto STARTFUNC agrees with Node for all five tiers, boundaries, losses, cap, logs and tickets',()=>{
  assert.equal(street.reviewedLoto.source,B58_LOTO_SOURCE);
  assert.equal(street.reviewedB56.loto,B58_LOTO_SOURCE);
  assert.equal(street.reviewedLoto.ticketId,11);
  assert.equal(street.reviewedLoto.startProba,500);
  assert.equal(street.reviewedLoto.publicGameplay,false);
  assert.equal(perl.cases.length,15);
  assert.equal(perl.originalRange,6096454);
  for(const row of perl.cases){
    const initial=structuredClone(row.input.shop);
    const got=projectOriginalLotoStartfunc({
      reviewed:street.reviewedLoto,shop:initial,
      randomDraws:row.input.randomDraws,
    });
    assert.equal(got.returnCode,row.output.returnCode,row.name);
    assert.equal(got.message,row.output.message,row.name);
    assert.equal(got.randomDrawsUsed,row.output.randomDrawsUsed,row.name);
    assert.equal(got.ticketCountConsumed,row.input.shop.item[10],row.name);
    assert.equal(got.shop.money,row.output.money,row.name+' money');
    assert.equal(got.shop.rank,row.output.rank,row.name+' rank');
    assert.deepEqual(got.shop.item,row.output.item,row.name+' original inventory');
    assert.deepEqual(got.logs,row.output.logs,row.name+' original emitted logs');
    assert.equal(got.eventPersisted,false);
    assert.deepEqual(initial,row.input.shop,'projection must not modify input');
  }
});

test('B-58 strict ITEM #11 source review / callback contract rejects drift or missing draws',()=>{
  const original=street.reviewedLoto;
  const market=street.reviewedMarketBuy11;
  assert.equal(market.source,B58_MARKET11_SOURCE);
  assert.equal(market.itemId,11);
  assert.equal(market.upkeepPerTicket,10);
  assert.equal(street.reviewedB41.ticketSourceReviewed,true);
  const reviewLoto=fields=>reviewOriginalLotoStartfunc({
    itemDsl:fixed.itemDsl,turnSource:fixed.originalTurnSource,
    compiledCatalog:street.reviewedEventCatalog,
    reviewedMarket11:market,
    reviewedSupportCallbacks:street.reviewedSupportEventCallbacks,...fields,
  });
  for(const changed of [
    {itemDsl:fixed.itemDsl.replace(
      'my $rnd=rand(6096454);','my $rnd=rand(6096453);')},
    {itemDsl:fixed.itemDsl.replace(
      '$hit=4 if $rnd<10000;','$hit=4 if $rnd<=10000;')},
    {itemDsl:fixed.itemDsl.replace(
      '$DT->{item}[11-1]=0;','$DT->{item}[11-1]=1;')},
    {itemDsl:fixed.itemDsl.replace(
      'return 0;\n\t_local_\n\n@@FUNCINIT',
      'return 1;\n\t_local_\n\n@@FUNCINIT')},
    {reviewedMarket11:{...market,stockLimit:51}},
    {reviewedSupportCallbacks:{
      ...street.reviewedSupportEventCallbacks,maxMoney:1000000}},
  ])
    assert.throws(()=>reviewLoto(changed),/B-58/);
  const srcMarketReview=fields=>reviewOriginalMarketBuy11({
    reviewedBuy10:street.reviewedMarketBuy10,
    model:street.model??undefined,
    compiled:street.reviewedGiftMapUse,
    itemDsl:fixed.itemDsl,...fields,
  });
  // Review function is strict and public metadata never exposes loose
  // uncompiled ITEM grants as a replacement for genuine fixed model.
  assert.throws(()=>srcMarketReview({
    reviewedBuy10:{...street.reviewedMarketBuy10,unitPrice:999},
  }),/B-58/);
  const shop=perl.cases.find(x=>x.name==='mixed-three').input.shop;
  for(const change of [
    {randomDraws:[]},
    {randomDraws:[0]},
    {randomDraws:[0,0,0,0]},
    {randomDraws:[0,0,LOTO_RANGE]},
    {randomDraws:[0,-1,0]},
    {randomDraws:[0,NaN,0]},
    {shop:{...shop,item:Array(79).fill(0).map((v,i)=>i===10?51:v)}},
    {shop:{...shop,money:1000000000}},
    {reviewed:{...original,maxMoney:999999998}},
  ]){
    assert.throws(()=>projectOriginalLotoStartfunc({
      reviewed:original,shop,randomDraws:[0,0,0],...change,
    }),/B-58/);
  }
});

test('B-58 true Core ITEM #11 purchase follows original Perl buy-s source quantity, unit price, shelf and cost',()=>{
  assert.equal(buyOracle.success.passed,true);
  assert.equal(buyOracle.success.stock,1);
  assert.equal(buyOracle.success.money,98000);
  assert.equal(buyOracle.success.paid,2000);
  assert.equal(buyOracle.success.time,957400);
  assert.equal(buyOracle.price,2000);
  const {adapter,purchase,offer11}=setupWorld();
  // B-58 shop buys #10 first; #10's single wholesale unit then disappears
  // from the positive-only original market shelf sequence.
  assert.equal(offer11.shelf,buyOracle.shelf-1);
  assert.equal(purchase.details.unitPrice,buyOracle.price);
  assert.equal(purchase.details.purchasedCount,2);
  assert.equal(purchase.details.totalPaid,4000);
  assert.equal(purchase.details.timeConsumedSeconds,600);
  const store=adapter.read().shops[0];
  assert.equal(store.item[10],2);
  assert.equal(store.item[9],1);
  assert.equal(store.paytoday,9000);
  assert.equal(store.money,91000);
  assert.equal(store.showcase[0],10);
  assert.equal(store.price[0],5000);
});

test('B-58 real bought tickets: source natural sale/59 PLUS -> original lotto ticket burn and award in one CAS; save/restart retains result',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'akimono-b58-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const {adapter,act}=setupWorld();
  const before=adapter.read();
  const chosenSaleDraws=exactNaturalSaleDraws(before);
  const normalSale=applyGameCommand({
    world:before,streetModule:street,
    command:{kind:'advance-source-time',expectedRevision:before.revision,
      shopId:1,minutes:30,randomDraws:chosenSaleDraws},
  });
  assert.ok(normalSale.ok,JSON.stringify(normalSale.details));
  const beforeAward=normalSale.world.shops[0];
  assert.equal(beforeAward.item[10],2);
  const actualPerl=perl.cases.find(c=>c.name==='mixed-three');
  const lotteryDraws=[152410,9999];
  const expected=projectOriginalLotoStartfunc({
    reviewed:street.reviewedLoto,shop:beforeAward,randomDraws:lotteryDraws,
  });
  assert.equal(expected.shop.money,beforeAward.money+110000);
  const result=act('advance-source-time-reviewed-events',{
    shopId:1,minutes:30,saleDraws:chosenSaleDraws,
    eventHashOrderFixture:order,
    eventDraws:eventDraws({triggerLoto:true,lottery:lotteryDraws}),
  });
  assert.ok(result.ok,JSON.stringify(result.details));
  assert.equal(result.world.revision,before.revision+1);
  assert.equal(result.world.nowSeconds,before.nowSeconds+1800);
  assert.deepEqual(result.world.shops[0].item,expected.shop.item);
  assert.equal(result.world.shops[0].money,expected.shop.money);
  assert.equal(result.world.shops[0].item[10],0);
  assert.deepEqual(result.world.market,normalSale.world.market,
    'lotto consumes owned tickets only, not market supply');
  assert.equal(result.world.shops[0].saletoday,beforeAward.saletoday,
    'lotto prizes do not count as merchandise sales');
  assert.equal(result.world.shops[0].costtoday,beforeAward.costtoday,
    'lottery event occurs after original upkeep calculation');
  assert.equal(result.details.lotteryTicketsConsumed,2);
  assert.deepEqual(result.details.lotteryWins.map(w=>w.rank),[5,4]);
  assert.equal(result.details.instantCallbacksRun,1);
  assert.equal(result.details.eventDrawsUsed,19);
  assert.deepEqual(result.details.eventLogEmissions,
    expected.logs.map(log=>({eventCode:'loto',...log})));
  assert.equal(result.details.eventMessages.length,0,
    'source callback emits WriteLog but no return message');
  assert.deepEqual(result.world.period.eventState,{});
  const save=createLocalWorldSaveStore({directory});
  save.save(adapter.read(),{expectedGeneration:0});
  assert.deepEqual(save.load().world,result.world);
  // Source sale draws change when the previous slice sold out #10;
  // discover only the exact valid prefix, like B-56's durable re-entry test.
  const reloadedAdapter=createMemoryWorldAdapter(save.load().world);
  const second=reloadedAdapter.read();
  const sourceDrawCandidates=sourceCommandDraws({
    world:second,kind:'advance-source-time',
    args:{shopId:1,minutes:10},count:121,
  });
  let noLoto=null;
  for(let n=1;n<=121;n++){
    const fields={shopId:1,minutes:10,
      saleDraws:sourceDrawCandidates.slice(0,n),
      eventHashOrderFixture:order,
      eventDraws:eventDraws({triggerLoto:true,lottery:[]})};
    const trial=applyGameCommand({
      world:second,streetModule:street,
      command:{kind:'advance-source-time-reviewed-events',
        expectedRevision:second.revision,...fields},
    });
    if(trial.ok){
      noLoto=executeMemoryCommand({repository:reloadedAdapter,
        streetModule:street,
        command:{kind:'advance-source-time-reviewed-events',
          expectedRevision:second.revision,...fields}});
      break;
    }
  }
  assert.ok(noLoto?.ok,'valid next source slice can open empty lottery after restart');
  assert.equal(noLoto.details.lotteryTicketsConsumed,0);
  assert.deepEqual(noLoto.details.eventLogEmissions.map(x=>x.message),
    ['抽獎卷的開獎開始了']);
  assert.equal(noLoto.world.shops[0].item[10],0);
  assert.equal(actualPerl.output.logs.length,3);
});

test('B-58 lotto missing, malformed, swapped, excess RNG or other source EVENT cannot partially commit ticket burn',()=>{
  const {adapter,act}=setupWorld();
  const before=adapter.read();
  const chosenSaleDraws=exactNaturalSaleDraws(before);
  const correct=eventDraws({triggerLoto:true,lottery:[152410,9999]});
  const args={shopId:1,minutes:30,saleDraws:chosenSaleDraws,
    eventHashOrderFixture:order,eventDraws:correct};
  const ticketIndex=correct.findIndex(x=>typeof x==='object');
  assert.ok(ticketIndex>=0);
  for(const override of [
    {eventDraws:correct.filter((_,i)=>i!==ticketIndex)},
    {eventDraws:[...correct,0]},
    {eventDraws:correct.map((x,i)=>i===ticketIndex?0:x)},
    {eventDraws:correct.map((x,i)=>i===ticketIndex?
      {range:LOTO_RANGE,result:LOTO_RANGE}:x)},
    {eventDraws:correct.map((x,i)=>i===ticketIndex?
      {range:1000,result:0}:x)},
    {eventDraws:correct.map((x,i)=>i===0?
      {range:LOTO_RANGE,result:0}:x)},
    {eventDraws:eventDraws({
      triggerLoto:true,lottery:[152410,9999],others:['happy']})},
    {eventHashOrderFixture:order.slice(1)},
  ]){
    const got=act('advance-source-time-reviewed-events',{...args,...override});
    assert.equal(got.ok,false,JSON.stringify(override));
    assert.equal(got.code,'SOURCE_BOUNDARY_REJECTED');
    assert.deepEqual(adapter.read(),before,
      'full live world/market/time/revision unchanged on source refusal');
  }
  const stale=applyGameCommand({
    world:before,streetModule:street,
    command:{kind:'advance-source-time-reviewed-events',
      expectedRevision:before.revision+1,...args},
  });
  assert.equal(stale.code,'REVISION_CONFLICT');
  assert.deepEqual(adapter.read(),before);
});
