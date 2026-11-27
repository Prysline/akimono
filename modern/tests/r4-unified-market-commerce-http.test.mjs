import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';
import {independentPeriodDiskDigest,PERIOD_DISK_DIRECTORY} from '../src/r4-independent-period-disk-store.mjs';

// Necessary controlled HTTP integration, fixed start clock and server RNG.
// This is not C's formal player acceptance or full commerce activation.
test('D9 reviewed market HTTP replenishes #63, retains stale CAS rejection and two v2 generations',async t=>{
  const p=await genuinePlayer(t,{crossPeriod:true,marketCommerce:true});
  assert.equal(p.state.reviewedMarketCommerce,true);
  assert.equal(p.state.marketPageRows,25);
  assert.deepEqual(p.state.marketOffers.map(x=>x.shelf),p.state.marketOffers.map((_,i)=>i));
  assert.equal(p.stock(63),1);
  const openingRow=[p.state.world.nowSeconds,1,0,'高階鍛造實測開設新商店了。'].join('\t')+'\n';
  assert.equal(p.state.world.period.disk.live['log0.cgi'].bytes,openingRow,'source new.cgi public log after FUNCNEW');
  await p.discard(63);
  let q;
  for(let n=0;n<120;n++){
    q=p.state.marketOffers.find(x=>x.itemId===63);
    if(q?.canBuy)break;
    await p.tick(60);
  }
  assert.equal(q?.canBuy,true,'bounded source PLUS supply');
  assert.equal(q.price,0);assert.equal(q.timeSeconds,600);
  await p.enoughTime(q.timeSeconds);
  q=p.state.marketOffers.find(x=>x.itemId===63);
  assert.equal(q.form.source,'r4-frozen-buy-form.v1');
  assert.equal(q.form.available,true);
  assert.deepEqual(q.form.options,[{count:1,label:'1（倉庫最多）'}]);
  const before=p.state.world,cmd={expectedRevision:before.revision,itemId:63,requestedCount:2,marketShelf:q.shelf,expectedPrice:q.price};
  const bought=await p.post('/api/buy',cmd);
  assert.equal(bought.code,'COMMITTED',JSON.stringify(bought.details));
  assert.equal(bought.details.purchasedCount,1);assert.equal(bought.details.tax,0);
  assert.equal(p.stock(63),1);assert.equal(p.state.shop.money,before.shops[0].money);
  assert.equal(p.state.shop.time,Math.max(before.shops[0].time,before.nowSeconds-259200)+600);
  const after=p.state.world,history=p.state.historyCommands;
  const expectedBuyRow=[after.nowSeconds,0,1,'購買市場的展示架擴建拆卸工具1組@\\0(合計\\0)購買於/消費時間10分'].join('\t')+'\n';
  assert.ok(after.period.disk.live['log0.cgi'].bytes.startsWith(expectedBuyRow),'actual source purchase log');
  const stale=await p.post('/api/buy',cmd);assert.equal(stale.ok,false);
  assert.deepEqual(p.state.world,after);assert.equal(p.state.historyCommands,history);
  assert.equal(await readFile(join(p.directory,PERIOD_DISK_DIRECTORY,independentPeriodDiskDigest(after),'play.cgi'),'utf8'),after.period.disk.live['play.cgi'].bytes);
  assert.deepEqual(await p.saveAndRestart(0),after);
  assert.equal(['log0.cgi','log1.cgi','log2.cgi'].flatMap(k=>p.state.world.period.disk.live[k].bytes.split('\n')).filter(row=>row===openingRow.trimEnd()).length,1,'opening source log appears once after reload');
  await p.discard(63);
  await p.enoughTime(600);
  const beforeClear=p.state.world;
  const cleared=await p.post('/api/showcase',{expectedRevision:beforeClear.revision,itemId:0,per:100,shelf:0});
  assert.equal(cleared.code,'COMMITTED',JSON.stringify(cleared.details));
  assert.ok(p.state.world.period.disk.live['log0.cgi'].bytes.startsWith([beforeClear.nowSeconds,0,1,'從展示架1下架了。'].join('\t')+'\n'));
  assert.equal(Object.values(p.state.world.period.disk.live).filter(x=>typeof x.bytes==='string').flatMap(x=>x.bytes.split('\n')).filter(line=>line===expectedBuyRow.trimEnd()).length,1);
  const second=await p.saveAndRestart(1);
  assert.equal(second.shops[0].item[62],0);
  assert.equal(second.shops[0].item[78],after.shops[0].item[78]);
});
