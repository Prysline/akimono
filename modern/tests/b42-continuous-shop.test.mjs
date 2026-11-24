import test from 'node:test';
import {mkdtemp as mkHistoricalDir,rm as removeHistoricalDir} from 'node:fs/promises';
import {tmpdir as historicalTmpdir} from 'node:os';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync,spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createMemoryWorld,createMemoryWorldAdapter,executeMemoryCommand,applyGameCommand}
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
    const quote=street.quoteMarketOffer(repository.read(),10);
    assert.ok(quote.marketStock>0,'sale was followed by actual source PLUS supply');
    const result=command('market-buy',{
      itemId:10,shopId:1,requestedCount:1,marketShelf:quote.shelf,expectedPrice:quote.price,
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
  assert.equal(two.world.shops[0]._sale_count_,undefined,
    'source FUNCSALE clears per-turn temporary sale counts');
  assert.equal(two.world.nowSeconds,1003600);
  const empty=command('advance-source-time',{
    shopId:1,minutes:10,randomDraws:expected.empty.consumedSamples,
  });
  assert.ok(empty.ok,JSON.stringify(empty.details));
  checkShop(empty.world,expected.empty);
  assert.equal(empty.world.revision,9);
  assert.equal(empty.world.nowSeconds,1004200);
  assert.equal(empty.details.naturalSaleCount,0);
  assert.equal(empty.world.shops[0]._sale_count_,undefined,
    'source callback cleanup also runs for empty showcase');
  assert.equal(empty.world.shops[0].itemtoday[10],2);
  assert.equal(empty.world.shops[0].temprank,two.world.shops[0].rank+1000);
  const before=JSON.stringify(repository.read());
  const stale=executeMemoryCommand({repository,streetModule:street,
    command:{kind:'advance-source-time',expectedRevision:8,
      shopId:1,minutes:10,randomDraws:expected.empty.consumedSamples}});
  assert.equal(stale.code,'REVISION_CONFLICT');
  assert.equal(JSON.stringify(repository.read()),before);
});
test('B-42 original +3h clock shift gates the real 36-hour settlement boundary',()=>{
  const {repository}=setup();
  const world=repository.read();
  const period=36*3600,shift=9*3600-6*3600;
  assert.equal(street.reviewedB41.periodSeconds,period);
  assert.equal(street.reviewedB41.clockShiftSeconds,shift);
  const next=(Math.floor((world.nowSeconds+shift)/period)+1)*period-shift;
  assert.equal(next,1026000);
  const near={...world,nowSeconds:next-300};
  const before=JSON.stringify(repository.read());
  const result=applyGameCommand({world:near,streetModule:street,
    command:{kind:'advance-source-time',expectedRevision:near.revision,
      shopId:1,minutes:10,randomDraws:[]}});
  assert.equal(result.ok,false);
  assert.match(result.details.reason,/crosses original period settlement/);
  assert.equal(JSON.stringify(repository.read()),before);
});

test('B-42 browser HTTP buys two real units, sells twice, rejects unreviewed EVENT repurchase and advances empty shelf without fake stock',async t=>{
  const directory=await mkHistoricalDir(path.join(historicalTmpdir(),'akimono-b42-historical-'));
  t.after(()=>removeHistoricalDir(directory,{recursive:true,force:true}));
  const child=spawn(process.execPath,['tests/support/legacy-dev-local.mjs'],{
    cwd:path.join(root,'modern'),
    env:{...process.env,AKIMONO_PORT:'0',AKIMONO_SAVE_DIR:directory,AKIMONO_E2E_FIXED_NOW:'1000000',
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
  const initialized=await post('/api/initialize');
  assert.ok(initialized.ok);
  assert.equal(initialized.state.nextSettlementAtSeconds,1026000);
  assert.equal(initialized.state.secondsUntilSettlement,26000);
  const page=await (await fetch(url)).text();
  assert.match(page,/id="settlement-status"/);
  assert.ok((await post('/api/open-shop',{
    expectedRevision:1,ownerName:'測試店主',shopName:'第二輪商店',
  })).ok);
  assert.ok((await post('/api/supply',{
    expectedRevision:2,timespanSeconds:3600,
  })).ok);
  let current=await (await fetch(url+'/api/state')).json();
  assert.ok(current.marketOffers.find(o=>o.itemId===10).marketStock>=2,
    'reviewed 1h PLUS must make at least two genuine #10 goods available');
  const purchase=async revision=>{
    const state=await (await fetch(url+'/api/state')).json();
    return post('/api/buy',{expectedRevision:revision,itemId:10,requestedCount:2,
      marketShelf:state.marketOffers.find(o=>o.itemId===10).shelf,expectedPrice:state.marketOffers.find(o=>o.itemId===10).price});
  };
  assert.ok((await purchase(3)).ok);
  assert.ok((await post('/api/showcase',{
    expectedRevision:4,itemId:10,priceOverride:5000,
  })).ok);
  const first=await post('/api/advance-time',{expectedRevision:5,minutes:30});
  assert.ok(first.ok,JSON.stringify(first));
  assert.equal(first.state.shop.item[9],1);
  // R2-C: source EVENT state becomes unknown after a partial time slice;
  // no new buy is silently authorized then. Buy two before the first slice
  // and prove two subsequent genuine sales from that reviewed stock.
  assert.equal(first.state.shop.item[9],1);
  assert.equal(first.state.shop.paytoday,10000);
  const unsafe=await purchase(6);
  assert.equal(unsafe.status,409);
  assert.equal(unsafe.state.world.revision,6);
  assert.match(unsafe.details.reason,/unsupported market, event or shop configuration/);
  const second=await post('/api/advance-time',{expectedRevision:6,minutes:30});
  assert.ok(second.ok,JSON.stringify(second));
  assert.equal(second.state.shop.item[9],0);
  assert.equal(second.state.shop.saletoday,10000);
  assert.equal(second.state.shop.itemtoday[10],2);
  assert.equal(second.state.shop.money,100000);
  const idle=await post('/api/advance-time',{expectedRevision:7,minutes:10});
  assert.ok(idle.ok,JSON.stringify(idle));
  assert.equal(idle.state.world.revision,8);
  assert.equal(idle.state.secondsUntilSettlement,21800);
  assert.equal(idle.details.naturalSaleCount,0);
  assert.equal(idle.state.shop.temprank,second.state.shop.rank+1000);
  assert.equal(idle.state.shop.money,100000);
  assert.equal(idle.state.shop.itemtoday[10],2);
  const stale=await post('/api/buy',{expectedRevision:6,itemId:10,requestedCount:1,
    marketShelf:0,expectedPrice:5000});
  assert.equal(stale.status,409);
  assert.equal(stale.state.world.revision,8);
});
