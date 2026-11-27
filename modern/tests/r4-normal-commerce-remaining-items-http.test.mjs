/** Remaining normal ITEM/USE routes; all assets and results from genuine
 * HTTP play, actual server clock and RNG. Never replace a failed world.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';

async function time(p,id,useId){
  for(let n=0;n<8;n++){
    const q=p.quote(id,useId);
    assert.ok(q,'source USE #'+id+'/'+useId);
    if(p.remaining()>=q.timePerUseSeconds)return q;
    await p.enoughTime(q.timePerUseSeconds);
  }
  assert.fail('source time quote convergence #'+id+'/'+useId);
}
async function use(p,id,useId){
  const offer=await time(p,id,useId),before=p.state.world,shop=before.shops[0];
  assert.equal(offer.canUse,true,JSON.stringify({id,useId,offer,money:shop.money,stock:shop.item}));
  const r=await p.use(id,useId),d=r.details;
  assert.equal(d.effectiveCount,1);assert.equal(d.timeSpentSeconds,offer.timePerUseSeconds);
  assert.equal(p.state.world.revision,before.revision+1);assert.equal(p.state.world.nowSeconds,before.nowSeconds);
  assert.equal(p.state.shop.time,Math.max(shop.time,before.nowSeconds-259200)+d.timeSpentSeconds);
  const expected=[...shop.item];
  for(const [id,n] of d.originalUseItem)expected[id-1]-=n;
  for(const [id,n] of d.originalAddItem)expected[id-1]+=n;
  assert.deepEqual(p.state.shop.item,expected,'actual source receipt reconciles all 79 holdings');
  return {d,shop,before};
}
async function acquire(p,id){
  if(!p.stock(id))await p.market(id);
}
async function sell(p,id,sales,hours=576){
  const prior=sales[id]??0;
  await p.enoughTime(600);
  assert.ok(p.stock(id)>0,'lawful stock to list #'+id);
  const r=await p.post('/api/showcase',{expectedRevision:p.state.world.revision,shelf:0,itemId:id,per:10});
  assert.equal(r.code,'COMMITTED',JSON.stringify(r.details??r.error));
  assert.equal(p.state.shop.showcase[0],id);
  for(let n=0;(sales[id]??0)===prior&&n<hours&&p.stock(id)>0;n++){
    await p.tick(60);
    if(n%24===23&&(sales[id]??0)===prior)await p.use(13,0);
  }
  assert.ok((sales[id]??0)>prior,'actual natural sale #'+id+' '+JSON.stringify({sales,hours,held:p.stock(id),period:p.state.world.period.settledCount}));
}
const saleWatcher=sales=>r=>{
  assert.equal(r.details.shelfSales.reduce((n,row)=>n+row.count,0),r.details.naturalSaleCount);
  for(const [id,n] of Object.entries(r.details.soldByItem))sales[id]=(sales[id]??0)+n;
};

test('R4 genuine all mining and mountain maps, sword-market doubled and lostbook, paid work and eight raw material sales',async t=>{
  const sales={},maps=[],swordTrips=[];
  const p=await genuinePlayer(t,{now:null,crossPeriod:true,fullCommerce:true,fundMarketWithWork:true,
    fundingWorkBudget:240,fundingSaleItems:[40,41,42,43,44],onTick:saleWatcher(sales)});
  await p.use(79,0);await p.market(13);
  for(const id of [9,12,14])assert.equal(p.stock(id),1);
  const work=await use(p,13,1);
  assert.equal(work.d.moneyEarned,10000);assert.equal(p.state.shop.money,work.shop.money+10000);
  assert.equal(work.d.originalInlineLogCalls.length,2);
  const workLogs=work.d.originalInlineLogCalls.map(row=>[p.state.world.nowSeconds,...row].join('\t')+'\n').reverse().join('');
  assert.ok(p.state.world.period.disk.live['log0.cgi'].bytes.startsWith(workLogs));
  const recipes=[
    [9,0,[[5,30,800],[6,2,600],[7,1,800]]],
    [9,1,[[5,3,800],[6,20,600],[7,1,800]]],
    [9,2,[[5,3,800],[6,2,600],[7,10,800]]],
    [12,0,[[1,80,900],[2,2,900],[3,2,900],[4,2,450]]],
    [12,1,[[1,4,900],[2,2,900],[3,40,900],[4,2,450]]],
    [12,2,[[1,4,900],[2,40,900],[3,2,900],[4,2,450]]],
    [12,3,[[1,4,900],[2,2,900],[3,2,900],[4,40,450]]],
  ];
  for(const [id,useId,outputs] of recipes){
    await acquire(p,id);
    const {shop,d}=await use(p,id,useId);
    assert.equal(d.experienceGain,Math.min(20,1000-(shop.exp?.[id]??0)));
    assert.ok(d.callbackOrder.includes('after-use'));
    assert.equal(p.stock(id),shop.item[id-1]-(d.mapDestroyed?1:0));
    for(const [item,amount,prob] of outputs){
      const got=d.acquired.find(row=>row.itemId===item);
      assert.equal(got?.attemptedCount,amount);assert.equal(got?.probabilityPermille,prob);
      assert.equal(p.stock(item),shop.item[item-1]+got.produced);
    }
    maps.push({id,useId,added:d.originalAddItem,destroyed:d.mapDestroyed});
  }
  for(const id of [1,2,3,4])if(!p.stock(id))await p.gather(id,10);
  for(const id of [5,6,7])if(!p.stock(id))await p.ore(id,10);
  await p.stones(10);
  const first=await p.saveAndRestart(0);
  for(let id=1;id<=8;id++)assert.ok(first.shops[0].item[id-1]>0);
  for(let id=1;id<=8;id++)await sell(p,id,sales);
  // The raw-material acquisition and natural-sale phase is complete.
  // Do not carry unused costly ore/wood into a separate sword-market
  // career phase. Original discard is a real command; no fixture write.
  assert.ok(Array.from({length:8},(_,i)=>i+1).every(id=>sales[id]>0));
  await p.list(0);
  const disposed=[];
  for(let id=1;id<=8;id++){
    const count=p.stock(id);
    if(!count)continue;
    const before=p.state.world;
    await p.discard(id,count);
    assert.equal(p.stock(id),0);
    assert.equal(p.state.world.revision,before.revision+1);
    assert.equal(p.state.world.nowSeconds,before.nowSeconds);
    disposed.push([id,count]);
  }
  t.diagnostic('raw material sale phase complete '+JSON.stringify({sales,disposed,money:p.state.shop.money,costtoday:p.state.shop.costtoday}));
  // #14 is an actual paid acquisition with a 10% pre-callback doubling
  // and a separate 10% post-callback book loss, neither a selected tape.
  await acquire(p,78);await use(p,78,12);
  assert.equal(p.state.shop.job,'peddle');
  let normal=false,double=false,lost=false;
  for(let n=0;!(normal&&double&&lost);n++){
    assert.ok(n<120,'actual sword market outcome budget '+JSON.stringify({normal,double,lost,swordTrips}));
    await acquire(p,14);
    for(let j=0;;j++){
      const status=()=>({trip:n,fundingWorks:p.fundingWorks,money:p.state.shop.money,
        costtoday:p.state.shop.costtoday,period:p.state.world.period.settledCount,
        showcase:p.state.shop.showcase,stock:[40,41,42,43,44].map(id=>[id,p.stock(id)])});
      assert.ok(j<120,'actual sword trip funding '+JSON.stringify(status()));
      await time(p,14,0);
      if(p.state.shop.money>=12000+Math.max(45000,Math.ceil(p.state.shop.costtoday)+10000))break;
      // Same finite shared funding-work budget as the market planner.
      // List a legitimately acquired surplus sword when the shelf is empty,
      // so paid work and waiting also support natural commerce.
      await p.earnMarketFunds({kind:'sword-trip',trip:n,...status()});
    }
    const {shop,d}=await use(p,14,0);
    assert.equal(d.moneySpent,12000);assert.equal(p.state.shop.money,shop.money-12000);
    assert.equal(p.state.shop.paytoday,shop.paytoday+12000);
    assert.ok(d.callbackOrder.includes('before-use')&&d.callbackOrder.includes('after-use'));
    assert.equal(p.stock(14),shop.item[13]-(d.mapDestroyed?1:0));
    const amount=d.doubleRewardTriggered?20:10;
    if(d.doubleRewardTriggered){double=true;assert.equal(d.originalResultOk,'這次我們收穫的比平時多。');}
    else normal=true;
    lost ||= d.mapDestroyed===true;
    for(const [id,prob] of [[40,400],[41,350],[42,150],[43,60],[44,30]]){
      const got=d.acquired.find(row=>row.itemId===id);
      assert.equal(got?.attemptedCount,amount);assert.equal(got?.probabilityPermille,prob);
      assert.equal(p.stock(id),shop.item[id-1]+got.produced);
    }
    swordTrips.push({amount,lost:d.mapDestroyed,added:d.originalAddItem});
    // Maintain an earning shelf rather than accumulate unused products.
    // Only the sword outputs are surplus in this phase.
    if(!p.state.shop.showcase[0]||!p.stock(p.state.shop.showcase[0])){
      const surplus=[40,41,42,43,44].find(id=>p.stock(id)>0);
      if(surplus!==undefined)await p.list(surplus);
    }
  }
  assert.ok(normal&&double&&lost&&swordTrips.some(row=>row.added.length>0));
  const last=await p.saveAndRestart(1);
  assert.equal(last.shops[0].job,'peddle');
  t.diagnostic(JSON.stringify({maps,swordTrips,sales,first:first.revision,last:last.revision,fundingWorks:p.fundingWorks}));
});

test('R4 genuine six basic equipment and six source book/tool natural sales with dual v2 reload',async t=>{
  const sales={},produced=[];
  const p=await genuinePlayer(t,{now:null,crossPeriod:true,fullCommerce:true,fundMarketWithWork:true,onTick:saleWatcher(sales)});
  await p.use(79,1);await p.market(13);
  const goods=[[17,0,40,3,20],[17,1,57,3,20],[16,0,45,2,24],[16,1,51,2,24],[17,2,46,4,10],[17,3,52,4,10]];
  for(const [book,useId,id,raw,count] of goods){
    for(let n=0;!p.stock(id);n++){
      assert.ok(n<12,'actual basic manufacture #'+id);
      await p.gather(raw,count);
      const {shop,d}=await use(p,book,useId);
      assert.equal(p.stock(raw),shop.item[raw-1]-count);
      assert.equal(p.stock(book),shop.item[book-1]);
      produced.push({id,added:d.originalAddItem});
    }
  }
  const first=await p.saveAndRestart(0);
  for(const [, ,id] of goods)assert.ok(first.shops[0].item[id-1]>0);
  for(const [,,id] of goods)await sell(p,id,sales);
  for(const id of [15,16,17,66,78,62]){
    await acquire(p,id);
    await sell(p,id,sales);
  }
  const last=await p.saveAndRestart(1);
  assert.equal(last.shops[0].showcase[0],62);
  t.diagnostic(JSON.stringify({produced,sales,first:first.revision,last:last.revision,fundingWorks:p.fundingWorks}));
});

test('R4 genuine source rank prizes, individual celebration USEs and sales, ten-voucher advanced books and voucher sale',async t=>{
  const awards=[],sales={},consumed=[];
  const p=await genuinePlayer(t,{now:null,crossPeriod:true,fullCommerce:true,fundMarketWithWork:true,onTick(r){
    saleWatcher(sales)(r);
    const prize=r.details.settlementReceipt?.prize;
    if(prize){
      assert.equal(prize.stockAfter-prize.stockBefore,prize.granted);
      awards.push({...prize,period:r.state.world.period.settledCount});
    }
  }});
  await p.market(13);
  await p.deny(79,2);
  const start=p.state.world.period.settledCount;
  // A finite continuous prize collection. Each prize is the actual rank
  // settlement receipt; do not inject or reroll when the wrong prize lands.
  async function collect(predicate){
    for(let n=0;!predicate();n++){
      assert.ok(n<160&&p.state.world.period.settledCount-start<160,
        'actual rank prize collection budget '+JSON.stringify({period:p.state.world.period.settledCount,awards:awards.length,stock:[27,28,29,79].map(id=>p.stock(id))}));
      await p.use(13,1);
      for(let i=0;i<37&&!predicate();i++){
        const period=p.state.world.period.settledCount;
        await p.tick(60);
        if(p.state.world.period.settledCount!==period)break;
      }
    }
  }
  await collect(()=>p.stock(79)===10);
  assert.ok(awards.some(row=>row.itemId===79&&row.granted>0));
  for(const id of [20,21,22,23])assert.equal(p.stock(id),0);
  const exchanged=await use(p,79,2);
  assert.deepEqual(exchanged.d.originalUseItem,[[79,10]]);
  assert.deepEqual(exchanged.d.originalAddItem,[[20,1],[21,1],[22,1],[23,1]]);
  assert.equal(p.stock(79),0);
  assert.equal(p.state.shop.money,exchanged.shop.money);
  assert.equal(p.state.shop.paytoday,exchanged.shop.paytoday);
  const exchangeWorld=structuredClone(p.state.world),exchangeHistory=p.state.historyCommands;
  const logNames=['log0.cgi','log1.cgi','log2.cgi'];
  for(const name of logNames)assert.deepEqual(exchangeWorld.period.disk.live[name],exchanged.before.period.disk.live[name]);
  assert.ok(!Object.hasOwn(exchanged.d,'originalInlineLogCalls'));
  const stale=await p.post('/api/use',{expectedRevision:exchanged.before.revision,itemId:79,useId:2,requestedCount:1});
  assert.equal(stale.ok,false);assert.deepEqual(p.state.world,exchangeWorld);assert.equal(p.state.historyCommands,exchangeHistory);
  t.diagnostic(JSON.stringify({sourceExchange:'79/2',revision:exchangeWorld.revision,period:exchangeWorld.period.settledCount,spent:exchanged.d.originalUseItem,acquired:exchanged.d.originalAddItem,silentFiles:logNames,staleRejected:true}));
  for(const [id,msg] of [[27,'肚子真飽'],[28,'感覺很好'],[29,'獨占了所有人的視線']]){
    await collect(()=>p.stock(id)===1);
    assert.ok(awards.some(row=>row.itemId===id&&row.granted===1));
    const {d}=await use(p,id,0);
    assert.deepEqual(d.originalUseItem,[[id,1]]);assert.equal(p.stock(id),0);
    assert.ok(d.originalUseMsg.some(text=>text.includes(msg)));
    consumed.push(id);
  }
  const first=await p.saveAndRestart(0);
  for(const id of [27,28,29]){
    const before=awards.filter(row=>row.itemId===id&&row.granted===1).length;
    await collect(()=>p.stock(id)===1);
    assert.ok(before>=1&&awards.filter(row=>row.itemId===id&&row.granted===1).length>=2);
    await sell(p,id,sales);
  }
  await collect(()=>p.stock(79)>0);
  await sell(p,79,sales);
  const last=await p.saveAndRestart(1);
  assert.equal(last.shops[0].showcase[0],79);
  assert.ok([27,28,29,79].every(id=>sales[id]>0));
  t.diagnostic(JSON.stringify({awards:awards.length,consumed,sales,first:first.revision,last:last.revision,period:last.period.settledCount}));
});
