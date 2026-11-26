/** Source rank-one prizes -> #39/18 -> #77.
 * All prizes come from committed 36-hour periods using server-owned RNG.
 * The test never selects an identity, rerolls a world, or injects a prize.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';

test('R4 genuine rank prizes produce #77 party goods, actual popup and natural sale with two v2 generations',async t=>{
  const prizes=[],sales={};
  const required=[27,28,29];
  const p=await genuinePlayer(t,{now:null,crossPeriod:true,fullCommerce:true,fundMarketWithWork:true,
    onTick(r,before){
      const d=r.details;
      assert.equal(Object.values(d.soldByItem).reduce((sum,x)=>sum+x,0),d.naturalSaleCount);
      for(const [id,n] of Object.entries(d.soldByItem))sales[id]=(sales[id]??0)+n;
      if(d.settlementReceipt){
        const prize=d.settlementReceipt.prize;
        assert.ok(prize&&prize.index>=0&&prize.index<=8);
        assert.equal(prize.stockAfter-prize.stockBefore,prize.granted);
        assert.equal(prize.granted+prize.discarded,prize.wanted);
        assert.equal(d.settlementReceipt.rankingCount,before.shops[0].rankingcount+1);
        prizes.push({...prize,period:r.state.world.period.settledCount});
      }
    }});
  // Read-only HTTP hint before collection: never award an item or choose RNG.
  const initial=p.quote(39,18);
  for(const id of required){
    assert.equal(p.stock(id),0);
    const route=initial.materialRoutes.find(row=>row.itemId===id);
    assert.equal(route.kind,'source-rank-one-prize');
    assert.equal(route.missing,1);
    assert.deepEqual(route.rankOnePrize,{choices:[{index:id-21,count:1}],totalChoices:9});
  }
  await p.market(13);
  assert.ok(required.every(id=>p.stock(id)===0)||prizes.length>0);
  const ready=()=>required.every(id=>p.stock(id)===1);
  async function collect(){
    const start=p.state.world.period.settledCount,offset=prizes.length;
    // Each of the three prize types occupies one of nine original choices.
    // 96 boundaries: union-bound for a missing type is 3*(8/9)^96.
    // If the budget is exhausted, preserve the actual result as a failure.
    while(!ready()){
      assert.ok(p.state.world.period.settledCount-start<96,
        'rank-prize collection budget '+JSON.stringify({period:p.state.world.period.settledCount,held:required.map(id=>p.stock(id)),prizes:prizes.slice(offset)}));
      // Actual paid work refreshes owner activity; no lastlogin mutation.
      await p.use(13,0);
      for(let n=0;n<37&&!ready();n++){
        const before=p.state.world.period.settledCount;
        await p.tick(60);
        if(p.state.world.period.settledCount!==before)break;
      }
    }
    for(const id of required)assert.ok(prizes.some(x=>x.itemId===id&&x.granted===1),'source award receipt #'+id);
  }
  async function pack(){
    await collect();
    if(!p.stock(39))await p.market(39);
    await p.enoughTime(p.quote(39,18).timePerUseSeconds);
    assert.equal(p.stock(77),0);
    const r=await p.use(39,18);
    assert.equal(r.details.effectiveCount,1);
    assert.equal(p.stock(39),0);
    assert.ok(required.every(id=>p.stock(id)===0));
    assert.equal(p.stock(77),1);
  }
  await pack();
  const first=await p.saveAndRestart(0);
  assert.equal(first.shops[0].item[76],1);
  assert.equal(p.quote(77,0).timePerUseSeconds,7200);
  await p.enoughTime(7200);
  const before=p.state.shop;
  const party=await p.use(77,0);
  assert.equal(p.stock(77),0);
  const up=Math.trunc(1000*(2-before.rank/5000));
  assert.equal(p.state.shop.rank,Math.min(10000,before.rank+up));
  assert.equal(party.details.originalFunctionReturn,'開了派對：人氣提升了'+Math.trunc(up/100)+'%');
  assert.equal(party.details.randomDrawsUsed,0);
  assert.equal(party.details.originalInlineLogCalls.length,2);
  await pack();
  await p.enoughTime(600);
  const list=await p.post('/api/showcase',{expectedRevision:p.state.world.revision,shelf:0,itemId:77,per:10});
  assert.equal(list.code,'COMMITTED',JSON.stringify(list.details??list.error));
  for(let n=0;!sales[77]&&n<144;n++){
    await p.tick(60);
    // Maintain legitimate owner activity if a long natural-sale wait crosses
    // several periods. A one-copy item cannot be lost to percentage theft.
    if(n%24===23&&!sales[77])await p.use(13,0);
  }
  assert.equal(sales[77],1,JSON.stringify({sales,held:p.stock(77),period:p.state.world.period.settledCount}));
  assert.equal(p.stock(77),0);
  const second=await p.saveAndRestart(1);
  assert.equal(second.shops[0].item[76],0);
  assert.equal(second.shops[0].showcase[0],77);
  assert.ok(second.period.settledCount>=first.period.settledCount);
  await p.tick(1);
  t.diagnostic(JSON.stringify({awards:prizes.length,party:true,naturalSale:sales[77],periods:second.period.settledCount,revisions:second.revision}));
});
