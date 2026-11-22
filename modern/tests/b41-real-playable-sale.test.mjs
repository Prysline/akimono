import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync,spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createMemoryWorld,createMemoryWorldAdapter,executeMemoryCommand}
  from '../src/game-core-contract.mjs';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=rel=>readFile(path.join(root,rel),'utf8');
const keys=[
  'itemDsl','rebelDsl','originalAdminInitSource','originalDataReadSource',
  'originalDataWriteSource','originalTurnSource','originalWholeSource',
  'originalConfigSource','originalCompilerSource',
  'originalBuySource','originalBuyItemSource','originalBuyCalcSource',
  'originalMarketSource','originalItemSource','originalDetailSource',
];
const locations=[
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
];
const originals=await Promise.all(locations.map(read));
const street=createStandardStreetModule(Object.fromEntries(keys.map((key,i)=>[key,originals[i]])));
const source=JSON.parse(execFileSync('perl',['original-b41-real-sale-probe.pl'],{
  cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
}));
const sourceSupply=JSON.parse(execFileSync('perl',['original-market-buy10-probe.pl'],{
  cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
})).supply;
function createFlow(){
  const repository=createMemoryWorldAdapter(createMemoryWorld({
    worldId:'b41-real-flow',streetId:'standard-street',nowSeconds:1000000,
  }));
  const command=(kind,props={})=>executeMemoryCommand({
    repository,streetModule:street,command:{kind,
      expectedRevision:repository.read().revision,...props},
  });
  assert.ok(command('initialize-source-market').ok);
  assert.ok(command('open-shop',{shopId:1,ownerName:'來源店主',
    shopName:'來源商店'}).ok);
  const supplied=command('reviewed-sparse-all-plus',{
    timespanSeconds:60,randomDraws:sourceSupply.draws});
  assert.ok(supplied.ok,JSON.stringify(supplied.details));
  const quote=street.quoteMarketOffer(repository.read(),10);
  const bought=command('market-buy',{
    itemId:10,shopId:1,requestedCount:1,marketShelf:quote.shelf,
    expectedPrice:quote.price,
  });
  assert.ok(bought.ok,JSON.stringify(bought.details));
  assert.equal(bought.world.shops[0].item[9],1);
  const shown=command('edit-showcase',{shopId:1,shelf:0,itemId:10,
    per:100,priceOverride:5000});
  assert.ok(shown.ok,JSON.stringify(shown.details));
  assert.equal(shown.world.shops[0].showcase[0],10);
  assert.equal(shown.world.shops[0].time,958000);
  return {repository,command};
}
test('B-41 reviewed B-40 purchase + B-38 natural module are gated, no artificial stock',()=>{
  assert.ok(street.capabilities.includes('advance-source-time'));
  const missingMarket=createStandardStreetModule(Object.fromEntries(
    keys.map((key,i)=>[key,keys[i].startsWith('originalMarketSource')||
      keys[i].startsWith('originalItemSource')||
      keys[i].startsWith('originalDetailSource')?null:originals[i]])));
  assert.ok(!missingMarket.capabilities.includes('advance-source-time'));
  const {repository,command}=createFlow();
  const snapshot=JSON.stringify(repository.read());
  for(const attempt of [
    {shopId:1,minutes:0,randomDraws:[]},
    {shopId:1,minutes:61,randomDraws:[]},
    {shopId:9,minutes:30,randomDraws:[]},
    {shopId:1,minutes:30,randomDraws:[-1]},
    {shopId:1,minutes:30,randomDraws:source.sale30.consumedSamples.slice(0,-1)},
  ]){
    const result=command('advance-source-time',attempt);
    assert.equal(result.ok,false,JSON.stringify(attempt));
    assert.equal(JSON.stringify(repository.read()),snapshot);
  }
});
for(const [minutes,perl] of [[30,source.sale30],[60,source.sale60]]){
  test('B-41 actually bought #10, displayed via source sc-s, sells through original natural '+minutes+'m',()=>{
    const {repository,command}=createFlow();
    const before=repository.read();
    assert.equal(before.revision,5);
    assert.equal(before.shops[0].money,perl.afterBuy.money);
    assert.equal(before.shops[0].item[9],perl.afterBuy.stock);
    assert.equal(before.shops[0].paytoday,perl.afterBuy.paytoday);
    assert.equal(before.shops[0].time,perl.afterBuy.time);
    assert.equal(before.shops[0].showcase[0],perl.afterBuy.shelf);
    assert.equal(before.market.wholesale[9],perl.afterBuy.wholesale10);
    const result=command('advance-source-time',{
      shopId:1,minutes,randomDraws:perl.consumedSamples,
    });
    assert.ok(result.ok,JSON.stringify(result.details));
    assert.equal(result.world.nowSeconds,1000000+minutes*60);
    assert.equal(result.world.revision,6);
    assert.equal(result.details.naturalSaleCount,perl.saleCount);
    assert.equal(result.details.totalDraws,perl.randomDrawsUsed);
    assert.equal(result.world.shops[0].money,perl.money);
    assert.equal(result.world.shops[0].item[9],perl.stock);
    assert.equal(result.world.shops[0].rank,perl.rank);
    assert.equal(result.world.shops[0].saletoday,perl.saletoday);
    assert.equal(result.world.shops[0].paytoday,perl.paytoday);
    assert.equal(result.world.shops[0].taxtoday,perl.taxtoday);
    assert.equal(result.world.shops[0].trush,perl.trush);
    assert.ok(Math.abs(result.world.shops[0].costtoday-perl.costtoday)<1e-9);
    assert.equal(result.world.shops[0].temprank,perl.temprank);
    assert.equal(result.world.shops[0].time,perl.time);
    // B-38 original natural-only probe retains the temporary sale map.
    // Full original inc-turn FUNCSALE stage deletes it before PLUS.
    assert.equal(result.world.shops[0]._sale_count_,undefined);
    assert.equal(result.details.itemCallbackStage.itemSaleCallbackCount,0);
    assert.deepEqual(result.world.market.wholesale,perl.wholesale);
    assert.deepEqual(result.world.market.sparseWrittenSlots,perl.definedIndices);
    assert.equal(result.world.market.originalWholesaleCsv,perl.originalWholesaleCsv);
  });
}
test('B-41 no showcase and stale CAS cannot fabricate sales',()=>{
  const {repository,command}=createFlow();
  const cleared=command('edit-showcase',{shopId:1,shelf:0,itemId:0,
    per:100,priceOverride:0});
  assert.ok(cleared.ok);
  const before=repository.read();
  const rejected=executeMemoryCommand({repository,streetModule:street,
    command:{kind:'advance-source-time',expectedRevision:5,shopId:1,
      minutes:30,randomDraws:source.sale30.consumedSamples}});
  assert.equal(rejected.code,'REVISION_CONFLICT');
  assert.equal(repository.read().revision,6);
  assert.equal(JSON.stringify(repository.read()),JSON.stringify(before));
});
test('B-41 HTTP interface performs real CAS buy -> shelf -> sourced sale, with visible minute controls',async t=>{
  const child=spawn(process.execPath,['scripts/dev-local.mjs'],{
    cwd:path.join(root,'modern'),
    env:{...process.env,AKIMONO_PORT:'0',AKIMONO_E2E_FIXED_NOW:'1000000',
      AKIMONO_E2E_DETERMINISTIC_RNG:'1'},
    stdio:['ignore','pipe','pipe'],
  });
  t.after(()=>child.kill());
  const url=await Promise.race([
    new Promise((resolve,reject)=>{
      let stdout='';
      child.stdout.on('data',data=>{
        stdout+=data;
        const match=stdout.match(/http:\/\/127\.0\.0\.1:\d+/);
        if(match)resolve(match[0]);
      });
      child.on('error',reject);
      child.on('exit',code=>reject(Error('server exited '+code)));
    }),
    new Promise((_,reject)=>setTimeout(()=>reject(Error('B41 server timed out')),10000)),
  ]);
  const html=await (await fetch(url)).text();
  for(const text of ['【交易】','id="showcase-form"','id="advance-time-form"',
    'data-minutes="60"','自填分鐘','第 1 架','原版自然販售']){
    assert.ok(html.includes(text),'missing original-style B41 UI '+text);
  }
  const js=await (await fetch(url+'/app.js')).text();
  assert.match(js,/\/api\/showcase/);assert.match(js,/\/api\/advance-time/);
  const post=async(path,body={})=>{
    const res=await fetch(url+path,{method:'POST',
      headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    return {status:res.status,...await res.json()};
  };
  const started=await post('/api/initialize');assert.ok(started.ok);
  const opened=await post('/api/open-shop',{expectedRevision:1,
    ownerName:'HTTP店主',shopName:'來源店'});assert.ok(opened.ok);
  const premature=await post('/api/showcase',{expectedRevision:2,
    itemId:10,priceOverride:5000});
  assert.equal(premature.ok,false);
  assert.equal(premature.state.world.revision,2);
  const supplied=await post('/api/supply',{expectedRevision:2,timespanSeconds:60});
  assert.ok(supplied.ok,JSON.stringify(supplied));
  const bought=await post('/api/buy',{expectedRevision:3,itemId:10,requestedCount:1,
    marketShelf:supplied.state.marketOffers.find(o=>o.itemId===10).shelf,expectedPrice:5000});
  assert.ok(bought.ok,JSON.stringify(bought));
  assert.equal(bought.state.shop.money,95000);
  assert.equal(bought.state.shop.item[9],1);
  const shown=await post('/api/showcase',{expectedRevision:4,itemId:10,
    priceOverride:5000});
  assert.ok(shown.ok,JSON.stringify(shown));
  assert.equal(shown.state.shop.showcase[0],10);
  const sold=await post('/api/advance-time',{expectedRevision:5,minutes:30});
  assert.ok(sold.ok,JSON.stringify(sold));
  assert.equal(sold.state.world.revision,6);
  assert.equal(sold.state.world.nowSeconds,1000000+1800);
  assert.equal(sold.details.naturalSaleCount,1);
  assert.equal(sold.state.shop.item[9],0);
  assert.equal(sold.state.shop.money,100000);
  assert.equal(sold.state.shop.saletoday,5000);
  assert.equal(sold.state.shop.paytoday,5000);
  assert.equal(sold.state.shop.showcase[0],10);
  assert.equal(sold.state.shop.price[0],5000);
  assert.ok(sold.state.shop.costtoday>0);
  const stale=await post('/api/advance-time',{expectedRevision:5,minutes:30});
  assert.equal(stale.ok,false);assert.equal(stale.state.world.revision,6);
  const newState=await (await fetch(url+'/api/state')).json();
  assert.equal(newState.shop.item[9],0);
  assert.equal(newState.shop.money,100000);
  assert.equal(newState.world.revision,6);
});
