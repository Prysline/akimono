/** Genuine wholesale career: actual HTTP work, supply, CAS and reload. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';
import {independentPeriodDiskDigest,PERIOD_DISK_DIRECTORY} from '../src/r4-independent-period-disk-store.mjs';
test('R4 genuine wholesale #64 FUNCBUY grants #79 from actual payment, logs once and survives two v2 generations',async t=>{
  const p=await genuinePlayer(t,{now:null,crossPeriod:true,fullCommerce:true});
  if(!p.stock(13))await p.market(13);
  let purchase=null,works=0;
  // One career; normal work funds the purchase and refreshes activity.
  // Re-quote after any time-consuming action or settlement.
  for(let n=0;n<240&&!purchase;n++){
    const offer=p.state.marketOffers.find(x=>x.itemId===64);
    if(p.stock(64)){await p.discard(64);continue;}
    if(p.stock(79)===10){await p.discard(79,1);continue;}
    if(offer?.canBuy&&offer.marketStock>0&&offer.price===500000&&p.state.shop.money>=offer.price+45000){
      if(p.remaining()<offer.timeSeconds){await p.enoughTime(offer.timeSeconds);continue;}
      const before=p.state.world;
      const cmd={expectedRevision:before.revision,itemId:64,requestedCount:2,marketShelf:offer.shelf,expectedPrice:offer.price};
      const r=await p.post('/api/buy',cmd);
      assert.equal(r.code,'COMMITTED',JSON.stringify(r.details??r.error));
      const d=r.details,shop=before.shops[0],after=p.state.world;
      assert.equal(d.purchasedCount,1);assert.equal(d.totalPaid,500000);
      assert.equal(p.state.shop.money,shop.money-500000);
      assert.equal(p.state.shop.paytoday,shop.paytoday+500000);
      assert.equal(p.state.shop.time,Math.max(shop.time,before.nowSeconds-259200)+offer.timeSeconds);
      assert.equal(after.nowSeconds,before.nowSeconds);
      assert.equal(d.timeConsumedSeconds,offer.timeSeconds);
      assert.equal(p.stock(64),1);assert.equal(p.stock(79),shop.item[78]+1);
      assert.equal(after.market.wholesale[63],before.market.wholesale[63]-1);
      assert.deepEqual(d.voucherReward,{source:'custom/inc-item-data.cgi:3369',itemId:79,requestedCount:1,
        grantedCount:1,stockBefore:shop.item[78],stockAfter:shop.item[78]+1});
      assert.deepEqual(d.originalBuyLogCalls,[[0,1,'收到了市場贈送的禮物卷1枚']]);
      assert.equal(after.revision,before.revision+1);
      const row=[after.nowSeconds,0,1,'收到了市場贈送的禮物卷1枚'].join('\t')+'\n';
      const bytes=after.period.disk.live['log0.cgi'].bytes;
      const purchaseRow=[after.nowSeconds,0,1,'購買市場的看門機器人1架@\\500,000(合計\\500,000)購買於/消費時間'+(offer.timeSeconds<60?String(offer.timeSeconds).padStart(2,'0')+'秒':Math.trunc(offer.timeSeconds/60)+'分')].join('\t')+'\n';
      assert.ok(bytes.startsWith(row+purchaseRow));
      assert.equal(bytes.split(row).length-1,1);
      const disk=join(p.directory,PERIOD_DISK_DIRECTORY,independentPeriodDiskDigest(after),'log0.cgi');
      assert.equal(await readFile(disk,'utf8'),bytes);
      const history=p.state.historyCommands,checkpoint=p.state.historyCheckpointRevision;
      const stale=await p.post('/api/buy',cmd);assert.equal(stale.ok,false);
      assert.deepEqual(p.state.world,after);assert.equal(p.state.historyCommands,history);
      assert.equal(p.state.historyCheckpointRevision,checkpoint);
      purchase={after,row,purchaseRow,bytes};break;
    }
    if(p.state.shop.money<545000){
      assert.ok(works<120,'bounded actual work budget');
      if(!p.stock(13)){await p.market(13);continue;}
      const work=await p.use(13,1);assert.equal(work.details.moneyEarned,10000);works++;
    }else await p.tick(60);
  }
  assert.ok(purchase,'bounded source supply / funding '+JSON.stringify({works,money:p.state.shop.money,robot:p.stock(64),voucher:p.stock(79),period:p.state.world.period.settledCount}));
  const first=await p.saveAndRestart(0);assert.deepEqual(first,purchase.after);
  const discarded=await p.post('/api/discard',{expectedRevision:first.revision,itemId:64,count:1});
  assert.equal(discarded.code,'COMMITTED',JSON.stringify(discarded.details??discarded.error));
  const afterDiscard=p.state.world;
  // Frozen item-t.cgi calls PushLog and RenewLog. A source-reviewed
  // discard adds exactly one row, unlike the old local stub.
  const discardRow=[first.nowSeconds,0,1,discarded.details.originalMessage].join('\t')+'\n';
  assert.equal(discarded.details.originalMessage,'看門機器人1架被丟棄了');
  const old=first.period.disk.live,next=afterDiscard.period.disk.live;
  if(old['log1.cgi'].mtime<first.nowSeconds-129600){
    assert.equal(next['log0.cgi'].bytes,discardRow);
    assert.deepEqual(next['log1.cgi'],old['log0.cgi']);
    assert.deepEqual(next['log2.cgi'],old['log1.cgi']);
  }else{
    assert.equal(next['log0.cgi'].bytes,discardRow+purchase.bytes);
    assert.deepEqual(next['log1.cgi'],old['log1.cgi']);
    assert.deepEqual(next['log2.cgi'],old['log2.cgi']);
  }
  assert.equal(next['log0.cgi'].mtime,first.nowSeconds);
  const second=await p.saveAndRestart(1);
  assert.deepEqual(second,afterDiscard);
  assert.equal(second.shops[0].item[63],0);assert.equal(second.shops[0].item[78],first.shops[0].item[78]);
  const retained=['log0.cgi','log1.cgi','log2.cgi'].map(n=>second.period.disk.live[n].bytes).join('');
  assert.equal(retained.split(purchase.row).length-1,1);
  assert.equal(retained.split(discardRow).length-1,1);
  assert.equal(retained.split(purchase.purchaseRow).length-1,1);
  t.diagnostic(JSON.stringify({works,paid:500000,granted:1,revision:first.revision,secondRevision:second.revision}));
});
