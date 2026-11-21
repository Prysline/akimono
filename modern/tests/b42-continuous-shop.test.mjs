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
const read=relative=>readFile(path.join(root,relative),'utf8');
const names=[
  'itemDsl','rebelDsl','originalAdminInitSource','originalDataReadSource',
  'originalDataWriteSource','originalTurnSource','originalWholeSource',
  'originalConfigSource','originalCompilerSource',
  'originalBuySource','originalBuyItemSource','originalBuyCalcSource',
  'originalMarketSource','originalItemSource','originalDetailSource',
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
];
const originals=await Promise.all(paths.map(read));
const street=createStandardStreetModule(Object.fromEntries(names.map((k,i)=>[k,originals[i]])));
const probe=JSON.parse(execFileSync('perl',['original-b41-real-sale-probe.pl'],{
  cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
}));
const supply=JSON.parse(execFileSync('perl',['original-market-buy10-probe.pl'],{
  cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
})).supply;

function setup(){
  const repository=createMemoryWorldAdapter(createMemoryWorld({
    worldId:'b42-two-real-trades',streetId:'standard-street',nowSeconds:1000000,
  }));
  const command=(kind,props={})=>executeMemoryCommand({
    repository,streetModule:street,command:{
      kind,expectedRevision:repository.read().revision,...props,
    },
  });
  assert.ok(command('initialize-source-market').ok);
  assert.ok(command('open-shop',{shopId:1,ownerName:'來源店主',shopName:'來源商店'}).ok);
  assert.ok(command('reviewed-sparse-all-plus',{
    timespanSeconds:60,randomDraws:supply.draws,
  }).ok);
  function buy(){
    const quote=street.quoteMarketItem10(repository.read());
    assert.ok(quote.marketStock>0,'sale was followed by actual source PLUS supply');
    const result=command('buy-market-item-10',{
      shopId:1,requestedCount:1,marketShelf:quote.shelf,expectedPrice:quote.price,
    });
    assert.ok(result.ok,JSON.stringify(result.details));
    return result;
  }
  buy();
  assert.ok(command('edit-showcase',{
    shopId:1,shelf:0,itemId:10,per:100,priceOverride:5000,
  }).ok);
  return {repository,command,buy};
}
function checkShop(world,expected){
  const shop=world.shops[0];
  for(const [key,val] of Object.entries({
    money:expected.money,rank:expected.rank,saletoday:expected.saletoday,
    paytoday:expected.paytoday,trush:expected.trush,temprank:expected.temprank,
  })){
    if(val!==undefined) assert.equal(shop[key],val,key);
  }
  assert.equal(shop.item[9],expected.stock);
  assert.ok(Math.abs(shop.costtoday-expected.costtoday)<1e-8,'source costtoday');
  assert.deepEqual(world.market.wholesale,expected.wholesale);
  assert.deepEqual(world.market.sparseWrittenSlots,expected.definedIndices);
  assert.equal(world.market.originalWholesaleCsv,expected.originalWholesaleCsv);
}
test('B-42 actual two market acquisitions and two natural sales share a single WorldState, then idle',()=>{
  const expected=probe.two30;
  const {repository,command,buy}=setup();
  const one=command('advance-source-time',{
    shopId:1,minutes:30,randomDraws:expected.first.consumedSamples,
  });
  assert.ok(one.ok,JSON.stringify(one.details));
  checkShop(one.world,expected.first);
  assert.equal(one.world.shops[0].itemtoday[10],1);
  assert.equal(one.world.revision,6);
  const secondBuy=buy();
  assert.equal(secondBuy.world.revision,7);
  for(const key of ['money','paytoday','time']){
    assert.equal(secondBuy.world.shops[0][key],expected.secondPurchase[key],key);
  }
  assert.equal(secondBuy.world.shops[0].item[9],expected.secondPurchase.stock);
  assert.equal(secondBuy.world.market.wholesale[9],expected.secondPurchase.market10);
  assert.equal(secondBuy.world.shops[0].showcase[0],10);
  const two=command('advance-source-time',{
    shopId:1,minutes:30,randomDraws:expected.second.consumedSamples,
  });
  assert.ok(two.ok,JSON.stringify(two.details));
  checkShop(two.world,expected.second);
  assert.equal(two.world.revision,8);
  assert.equal(two.world.shops[0].itemtoday[10],2);
  assert.equal(two.world.shops[0]._sale_count_[10].count,1);
  assert.equal(two.world.nowSeconds,1003600);
  const empty=command('advance-source-time',{
    shopId:1,minutes:10,randomDraws:expected.empty.consumedSamples,
  });
  assert.ok(empty.ok,JSON.stringify(empty.details));
  checkShop(empty.world,expected.empty);
  assert.equal(empty.world.revision,9);
  assert.equal(empty.world.nowSeconds,1004200);
  assert.equal(empty.details.naturalSaleCount,0);
  assert.deepEqual(empty.world.shops[0]._sale_count_,{});
  assert.equal(empty.world.shops[0].itemtoday[10],2);
  assert.equal(empty.world.shops[0].temprank,two.world.shops[0].rank+1000);
  const before=JSON.stringify(repository.read());
  const stale=executeMemoryCommand({repository,streetModule:street,
    command:{kind:'advance-source-time',expectedRevision:8,
      shopId:1,minutes:10,randomDraws:expected.empty.consumedSamples}});
  assert.equal(stale.code,'REVISION_CONFLICT');
  assert.equal(JSON.stringify(repository.read()),before);
});
test('B-42 browser HTTP can truly sell, repurchase, sell and advance empty shelf without fake stock',async t=>{
  const child=spawn(process.execPath,['scripts/dev-local.mjs'],{
    cwd:path.join(root,'modern'),
    env:{...process.env,AKIMONO_PORT:'0',AKIMONO_E2E_FIXED_NOW:'1000000',
      AKIMONO_E2E_DETERMINISTIC_RNG:'1'},
    stdio:['ignore','pipe','pipe'],
  });
  t.after(()=>child.kill());
  const url=await Promise.race([
    new Promise((resolve,reject)=>{
      let output='';
      child.stdout.on('data',chunk=>{
        output+=chunk;
        const m=output.match(/http:\/\/127\.0\.0\.1:\d+/);
        if(m)resolve(m[0]);
      });
      child.on('error',reject);
      child.on('exit',code=>reject(Error('B42 server exited '+code)));
    }),
    new Promise((_,reject)=>setTimeout(()=>reject(Error('B42 HTTP startup timeout')),10000)),
  ]);
  const post=async(endpoint,data={})=>{
    const response=await fetch(url+endpoint,{
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify(data),
    });
    return {status:response.status,...await response.json()};
  };
  assert.ok((await post('/api/initialize')).ok);
  assert.ok((await post('/api/open-shop',{
    expectedRevision:1,ownerName:'測試店主',shopName:'第二輪商店',
  })).ok);
  assert.ok((await post('/api/supply',{
    expectedRevision:2,timespanSeconds:60,
  })).ok);
  let current=await (await fetch(url+'/api/state')).json();
  assert.ok(current.item10.marketStock>0);
  const purchase=async revision=>{
    const state=await (await fetch(url+'/api/state')).json();
    return post('/api/buy',{expectedRevision:revision,requestedCount:1,
      marketShelf:state.item10.shelf,expectedPrice:state.item10.price});
  };
  assert.ok((await purchase(3)).ok);
  assert.ok((await post('/api/showcase',{
    expectedRevision:4,itemId:10,priceOverride:5000,
  })).ok);
  const first=await post('/api/advance-time',{expectedRevision:5,minutes:30});
  assert.ok(first.ok,JSON.stringify(first));
  assert.equal(first.state.shop.item[9],0);
  const secondBuy=await purchase(6);
  assert.ok(secondBuy.ok,JSON.stringify(secondBuy));
  assert.equal(secondBuy.state.shop.item[9],1);
  assert.equal(secondBuy.state.shop.paytoday,10000);
  const second=await post('/api/advance-time',{expectedRevision:7,minutes:30});
  assert.ok(second.ok,JSON.stringify(second));
  assert.equal(second.state.shop.item[9],0);
  assert.equal(second.state.shop.saletoday,10000);
  assert.equal(second.state.shop.itemtoday[10],2);
  assert.equal(second.state.shop.money,100000);
  const idle=await post('/api/advance-time',{expectedRevision:8,minutes:10});
  assert.ok(idle.ok,JSON.stringify(idle));
  assert.equal(idle.state.world.revision,9);
  assert.equal(idle.details.naturalSaleCount,0);
  assert.equal(idle.state.shop.temprank,second.state.shop.rank+1000);
  assert.equal(idle.state.shop.money,100000);
  assert.equal(idle.state.shop.itemtoday[10],2);
  const stale=await post('/api/buy',{expectedRevision:6,requestedCount:1,
    marketShelf:0,expectedPrice:5000});
  assert.equal(stale.status,409);
  assert.equal(stale.state.world.revision,9);
});
