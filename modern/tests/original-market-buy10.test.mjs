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
async function sourceModule(){
  const files=[
    'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
    'modern/tests/original-perl/core-inc-admin-func.cgi',
    'modern/tests/original-perl/inc-func.cgi','modern/tests/original-perl/write.cgi',
    'modern/tests/original-perl/inc-turn.cgi','modern/tests/original-perl/whole.cgi',
    '_config.cgi','modern/tests/original-perl/inc-makeitem.cgi',
    'modern/tests/original-perl/buy-s.cgi','modern/tests/original-perl/item.cgi',
    'modern/tests/original-perl/calc.cgi',
  ];
  const values=await Promise.all(files.map(read));
  return createStandardStreetModule(Object.fromEntries([
    'itemDsl','rebelDsl','originalAdminInitSource','originalDataReadSource',
    'originalDataWriteSource','originalTurnSource','originalWholeSource',
    'originalConfigSource','originalCompilerSource',
    'originalBuySource','originalBuyItemSource','originalBuyCalcSource',
  ].map((k,i)=>[k,values[i]])));
}
const perl=JSON.parse(execFileSync('perl',['original-market-buy10-probe.pl'],{
  cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
}));

test('B-40 actual Perl PLUS + buy-s.cgi: no stock rejected and successful purchase matches Node WorldState',async()=>{
  const streetModule=await sourceModule();
  assert.ok(streetModule.capabilities.includes('buy-market-item-10'));
  const repository=createMemoryWorldAdapter(createMemoryWorld({
    worldId:'b40-source-test',streetId:'standard-street',nowSeconds:1_000_000,
  }));
  const run=(kind,expectedRevision,props={})=>executeMemoryCommand({
    repository,streetModule,command:{kind,expectedRevision,...props},
  });
  assert.ok(run('initialize-source-market',0).ok);
  const created=run('open-shop',1,{shopId:1,ownerName:'原版驗收店主',
    shopName:'原版驗收店'});
  assert.ok(created.ok);
  assert.equal(repository.read().shops[0].money,100000);
  const empty=run('buy-market-item-10',2,{shopId:1,requestedCount:1,
    marketShelf:0,expectedPrice:5000});
  assert.equal(empty.ok,false);
  assert.match(empty.details.reason,/市場無貨/);
  assert.match(perl.initialEmpty.reason,/GAME_ERROR/);
  assert.equal(repository.read().revision,2);
  const supplied=run('reviewed-sparse-all-plus',2,{
    timespanSeconds:60,randomDraws:perl.supply.draws,
  });
  assert.ok(supplied.ok,JSON.stringify(supplied.details));
  assert.deepEqual(supplied.world.market.wholesale,perl.supply.marketBefore);
  const quote=streetModule.quoteMarketItem10(repository.read());
  assert.equal(quote.price,perl.price);
  assert.equal(quote.shelf,perl.shelf);
  const success=run('buy-market-item-10',3,{shopId:1,requestedCount:1,
    marketShelf:quote.shelf,expectedPrice:quote.price});
  assert.ok(success.ok,JSON.stringify(success.details));
  assert.equal(success.world.revision,4);
  assert.equal(perl.success.passed,true,JSON.stringify(perl.success));
  assert.equal(perl.success.commits,1,JSON.stringify(perl.success));
  assert.equal(success.world.shops[0].money,perl.success.money);
  assert.equal(success.world.shops[0].paytoday,perl.success.paid);
  assert.equal(success.world.shops[0].item[9],perl.success.stock);
  assert.equal(success.world.shops[0].time,perl.success.time);
  assert.equal(success.world.market.wholesale[9],perl.success.market);
  assert.equal(success.world.market.originalWholesaleCsv,perl.afterMarket.wholesaleCsv);
  assert.deepEqual(success.world.market.sparseWrittenSlots,
    perl.afterMarket.sparseWrittenSlots);
  assert.equal(success.details.totalPaid,5000);
  assert.equal(success.details.timeConsumedSeconds,600);
  assert.equal(success.details.moneyBefore,100000);
  assert.equal(success.details.moneyAfter,95000);
  assert.equal(success.details.stockAfter,1);
  assert.equal(perl.success.commits,1);
  assert.equal(perl.success.passed,true);
});

test('B-40 rejected stale quote, invalid quantity and isolated no-money do not commit',async()=>{
  const streetModule=await sourceModule();
  const repository=createMemoryWorldAdapter(createMemoryWorld({
    worldId:'b40-negative',streetId:'standard-street',nowSeconds:1_000_000,
  }));
  const run=(kind,expectedRevision,props={})=>executeMemoryCommand({
    repository,streetModule,command:{kind,expectedRevision,...props},
  });
  run('initialize-source-market',0);
  run('open-shop',1,{shopId:1,ownerName:'來源店主',shopName:'來源店'});
  run('reviewed-sparse-all-plus',2,{timespanSeconds:60,
    randomDraws:perl.supply.draws});
  const quote=streetModule.quoteMarketItem10(repository.read());
  for(const props of [
    {requestedCount:0,marketShelf:quote.shelf,expectedPrice:5000},
    {requestedCount:1,marketShelf:quote.shelf,expectedPrice:4999},
    {requestedCount:1,marketShelf:quote.shelf+1,expectedPrice:5000},
  ]){
    const before=JSON.stringify(repository.read());
    const rejection=run('buy-market-item-10',3,{shopId:1,...props});
    assert.equal(rejection.ok,false);
    assert.equal(JSON.stringify(repository.read()),before);
  }
  assert.equal(perl.invalidCount.passed,false);
  assert.equal(perl.invalidCount.commits,0);
  assert.equal(perl.noMoney.passed,false);
  assert.equal(perl.noMoney.commits,0);
  const base=repository.read();
  const zeroCash={...base,shops:base.shops.map(s=>({...s,money:0}))};
  const lowCashRepository=createMemoryWorldAdapter(zeroCash);
  const rejected=executeMemoryCommand({repository:lowCashRepository,streetModule,
    command:{kind:'buy-market-item-10',expectedRevision:3,shopId:1,
      requestedCount:1,marketShelf:quote.shelf,expectedPrice:5000}});
  assert.equal(rejected.ok,false);
  assert.match(rejected.details.reason,/現金不足/);
  assert.equal(lowCashRepository.read().revision,3);
});

test('B-40 HTTP UI serves Traditional Chinese pages and actual CAS market purchase',async(t)=>{
  const child=spawn(process.execPath,['scripts/dev-local.mjs'],{
    cwd:path.join(root,'modern'),env:{...process.env,AKIMONO_PORT:'0'},
    stdio:['ignore','pipe','pipe'],
  });
  t.after(()=>{child.kill();});
  const url=await Promise.race([
    new Promise((resolve,reject)=>{
      let buffer='';
      child.stdout.on('data',chunk=>{
        buffer+=chunk;
        const match=buffer.match(/http:\/\/127\.0\.0\.1:\d+/);
        if(match)resolve(match[0]);
      });
      child.on('exit',code=>reject(Error('server exited '+code)));
      child.on('error',reject);
    }),
    new Promise((_,reject)=>setTimeout(()=>reject(Error('server boot timeout')),10000)),
  ]);
  const html=await (await fetch(url)).text();
  assert.match(html,/lang="zh-Hant"/);
  assert.match(html,/店內/);assert.match(html,/市場／進貨/);
  assert.match(html,/倉庫/);
  assert.match(html,/disabled/);
  const post=async(path,body={})=>{
    const res=await fetch(url+path,{method:'POST',
      headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    return {status:res.status,...await res.json()};
  };
  const initial=await (await fetch(url+'/api/state')).json();
  assert.equal(initial.world,null);
  const initialized=await post('/api/initialize');
  assert.equal(initialized.ok,true,JSON.stringify(initialized));
  assert.equal(initialized.state.world.revision,1);
  const opened=await post('/api/open-shop',{expectedRevision:1,
    ownerName:'本機測試店主',shopName:'本機測試店'});
  assert.equal(opened.ok,true,JSON.stringify(opened));
  assert.equal(opened.state.shop.money,100000);
  const missing=await post('/api/buy',{expectedRevision:2,
    requestedCount:1,marketShelf:0,expectedPrice:5000});
  assert.equal(missing.ok,false);
  assert.equal(missing.state.world.revision,2);
  const supplied=await post('/api/supply',{expectedRevision:2,
    timespanSeconds:60});
  assert.equal(supplied.ok,true,JSON.stringify(supplied));
  assert.ok(supplied.state.item10.marketStock>0);
  const before=supplied.state.item10.marketStock;
  const bought=await post('/api/buy',{expectedRevision:3,
    requestedCount:1,marketShelf:supplied.state.item10.shelf,
    expectedPrice:supplied.state.item10.price});
  assert.equal(bought.ok,true,JSON.stringify(bought));
  assert.equal(bought.state.shop.money,95000);
  assert.equal(bought.state.shop.item[9],1);
  assert.equal(bought.state.item10.marketStock,before-1);
  assert.equal(bought.state.world.revision,4);
  const replay=await post('/api/buy',{expectedRevision:3,
    requestedCount:1,marketShelf:supplied.state.item10.shelf,
    expectedPrice:supplied.state.item10.price});
  assert.equal(replay.ok,false);
  assert.equal(replay.state.world.revision,4);
  const js=await (await fetch(url+'/app.js')).text();
  assert.match(js,/\/api\/buy/);
});
