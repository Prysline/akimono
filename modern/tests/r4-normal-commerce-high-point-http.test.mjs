/** Genuine high-score commerce: source gathering, manufacture, mixed
 * showcases, actual natural sales and ledger. No asset, score, clock,
 * selected identity or random input is injected. One world, bounded work. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';
import {calculateSourceShopPoint} from '../src/original-period-solo-sort.mjs';

const goods=[
  {id:40,book:17,useId:0,raw:3,input:20,output:20},
  {id:57,book:17,useId:1,raw:3,input:20,output:20},
  {id:45,book:16,useId:0,raw:2,input:24,output:30},
  {id:51,book:16,useId:1,raw:2,input:24,output:32},
];

test('R4 genuine 20000 points from four-type natural commerce, #65 self-theft and rumor, two v2 generations',async t=>{
  let gross=0,tax=0,saleCount=0,steps=0,bestPoint=0,lastPeriod=-1;
  const p=await genuinePlayer(t,{now:null,crossPeriod:true,fullCommerce:true,fundMarketWithWork:true,
    onTick(r){
      const rows=r.details.shelfSales;
      assert.ok(Array.isArray(rows));
      assert.equal(rows.reduce((sum,row)=>sum+row.count,0),r.details.naturalSaleCount);
      for(const row of rows){gross+=row.gross;tax+=row.tax;saleCount+=row.count;}
    }});
  const snapshot=()=>({point:p.state.shop.point,rank:p.state.shop.rank,money:p.state.shop.money,
    profitstock:p.state.shop.profitstock,saletoday:p.state.shop.saletoday,
    taxtoday:p.state.shop.taxtoday,paytoday:p.state.shop.paytoday,
    period:p.state.world.period.settledCount,clock:p.state.world.nowSeconds,
    remaining:p.remaining(),exp:p.state.shop.exp,stock:goods.map(g=>[g.id,p.stock(g.id)]),
    book:p.stock(65),gross,tax,saleCount,steps,bestPoint});
  const checkPoint=()=>{
    const s=p.state.shop;
    assert.equal(s.point,calculateSourceShopPoint(s),'original GetDTPoint from actual ledger, not cached test points');
    bestPoint=Math.max(bestPoint,s.point);
    if(s.rankingcount!==lastPeriod){
      lastPeriod=s.rankingcount;t.diagnostic(JSON.stringify(snapshot()));
    }
  };
  assert.ok(p.state.shop.point<20000);
  await p.use(79,1); // legal beginner books #15, #16, #17
  assert.equal(p.stock(16),1);assert.equal(p.stock(17),1);
  await p.market(13);await p.market(12);
  // Construction uses starter #63. Work only provides cash, not sale points.
  for(let n=0;;n++){
    assert.ok(n<32,'four-shelf construction budget '+JSON.stringify(snapshot()));
    await p.enoughTime(p.quote(63,3).timePerUseSeconds);
    if(p.state.shop.money>=40000+Math.max(10000,Math.ceil(p.state.shop.costtoday)+10000))break;
    await p.use(13,1);
  }
  await p.use(63,3);
  assert.equal(p.state.shop.showcasecount,4);assert.equal(p.stock(63),0);

  // Source MakeAmount uses a nonnegative addition to count*0.8 for
  // count >= 20. Four distinct categories share no inventory; the first
  // shelf has original fourth-power demand, others third-power. A 120%
  // listed price lowers replenishment demand while retaining real margin.
  // Avoid sellout popularity penalties with a stock buffer, not fake rank.
  const target=120,low=64;
  async function produce(g){
    const count=Math.min(6,Math.max(1,Math.ceil((target-p.stock(g.id))/(g.output*0.8))));
    await p.gather(g.raw,g.input*count);
    const r=await p.use(g.book,g.useId,count);
    assert.equal(r.details.effectiveCount,count);
    assert.ok(r.details.originalUseItem.some(([id,n])=>id===g.raw&&n===g.input*count));
    assert.ok(r.details.originalAddItem.some(([id,n])=>id===g.id&&n>=Math.floor(g.output*count*0.8)),
      'actual source output #'+g.id);
    assert.equal(p.stock(g.book),1);
  }
  for(const g of goods){
    for(let n=0;p.stock(g.id)<target;n++){
      assert.ok(n<4,'source initial manufacturing budget #'+g.id);
      await produce(g);
    }
  }
  await p.enoughTime(4*600);
  for(const [shelf,g] of goods.entries()){
    const r=await p.post('/api/showcase',{expectedRevision:p.state.world.revision,shelf,itemId:g.id,per:120});
    assert.equal(r.code,'COMMITTED',JSON.stringify(r.details??r.error));
  }
  assert.deepEqual(p.state.shop.showcase,goods.map(g=>g.id));

  const startClock=p.state.world.nowSeconds;
  async function ready(useId){
    for(;;){
      checkPoint();
      if(p.stock(65)&&p.quote(65,useId).canUse)return;
      // At most twelve source periods and 700 business decisions across
      // BOTH forbidden books. Do not reset world, clock, score or RNG.
      assert.ok(++steps<=700&&p.state.world.nowSeconds-startClock<=12*129600,
        'source commercial point/market/time budget #65/'+useId+' '+JSON.stringify(snapshot()));
      const offer=p.state.marketOffers.find(x=>x.itemId===65);
      const reserve=Math.max(45000,Math.ceil(p.state.shop.costtoday)+10000);
      if(!p.stock(65)&&offer?.canBuy&&p.state.shop.money>=offer.price+reserve&&p.remaining()>=offer.timeSeconds){
        await p.market(65);continue;
      }
      // Replenish the least stocked category while all showcases remain
      // live; when sufficient stock exists, actual clock passage produces
      // both natural sales and the action time required by the source USE.
      const g=goods.reduce((a,b)=>p.stock(a.id)<=p.stock(b.id)?a:b);
      if(p.stock(g.id)<low)await produce(g);
      else await p.tick(60);
    }
  }
  await ready(1);
  assert.ok(gross>0&&saleCount>0&&p.state.shop.point>=20000);
  const beforeTheft=p.state.shop,priorTown=p.state.world.period.town,priorEvents=p.state.world.period.eventState;
  const theft=await p.use(65,1);
  assert.equal(theft.details.originalFunctionReturn,'無法從自己店裡偷東西。偷竊失敗了。');
  assert.equal(theft.details.targetShopId,1);assert.equal(theft.details.randomDrawsUsed,0);
  assert.equal(theft.details.moneySpent,50000);assert.equal(theft.details.experienceGain,250);
  assert.deepEqual(theft.details.originalInlineLogCalls,[]);
  assert.equal(p.stock(65),0);
  assert.equal(p.state.shop.money,beforeTheft.money-50000);
  assert.equal(p.state.shop.paytoday,beforeTheft.paytoday+50000);
  assert.equal(p.state.shop.rank,beforeTheft.rank);
  assert.deepEqual(p.state.world.period.town,priorTown);assert.deepEqual(p.state.world.period.eventState,priorEvents);
  const first=await p.saveAndRestart(0);
  assert.equal(first.shops[0].item[64],0);
  t.diagnostic('genuine #65/1 '+JSON.stringify({beforePoint:beforeTheft.point,after:snapshot()}));

  await ready(0);
  const beforeRumor=p.state.shop;
  assert.ok(beforeRumor.point>=20000);
  const rumor=await p.use(65,0);
  assert.equal(rumor.details.targetShopId,1);assert.equal(rumor.details.moneySpent,0);
  assert.equal(rumor.details.experienceGain,200);assert.equal(rumor.details.randomDrawsUsed,1);
  assert.equal(p.stock(65),0);assert.equal(p.state.shop.money,beforeRumor.money);
  const ret=rumor.details.originalFunctionReturn;
  const success=ret.endsWith('作戰成功了。');
  assert.ok(success||ret.endsWith('作戰失敗了。'));
  assert.equal(p.state.shop.rank,beforeRumor.rank-Math.trunc(beforeRumor.rank/(success?3:4)));
  assert.equal(rumor.details.originalInlineLogCalls.length,2);
  const logged=rumor.details.originalInlineLogCalls.map(row=>[p.state.world.nowSeconds,...row].join('\t')+'\n').reverse().join('');
  assert.ok(p.state.world.period.disk.live['log0.cgi'].bytes.startsWith(logged));
  const second=await p.saveAndRestart(1);
  assert.ok(second.revision>first.revision);
  assert.equal(second.shops[0].item[64],0);
  assert.ok(second.period.disk.live['log0.cgi'].bytes.startsWith(logged));
  t.diagnostic('genuine #65/0 '+JSON.stringify({beforePoint:beforeRumor.point,success,after:snapshot()}));
});
