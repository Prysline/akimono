/** Actual full-commerce manufacture -> packing -> natural sale -> v2.
 * Source item amounts, money, time and RNG are all produced via HTTP.
 * No retries of a failed world, selected identity, injected stock or EXP.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';

async function packageAndSell(t,p,{id,useId,components,sales}){
  assert.equal(p.stock(id),0,'no pre-existing package');
  assert.ok(components.every(x=>p.stock(x)>=10));
  assert.equal(p.stock(39),1);
  const offer=p.quote(39,useId);
  assert.ok(offer?.canUse||offer?.timePerUseSeconds>p.remaining(),'source package eligibility');
  await p.enoughTime(offer.timePerUseSeconds);
  const prior=p.state.shop,receipt=await p.use(39,useId);
  assert.equal(receipt.details.effectiveCount,1);
  assert.equal(receipt.details.experienceGain,10);
  assert.equal(p.stock(39),0);
  for(const x of components)assert.equal(p.stock(x),prior.item[x-1]-10,'material #'+x);
  assert.equal(p.stock(id),10);
  assert.ok(p.state.showcaseOffers.some(o=>o.itemId===id&&o.owned===10));
  const first=await p.saveAndRestart(0);
  assert.equal(first.shops[0].item[id-1],10);
  await p.enoughTime(600);
  const listed=await p.post('/api/showcase',{expectedRevision:p.state.world.revision,shelf:0,itemId:id,per:10});
  assert.equal(listed.code,'COMMITTED',JSON.stringify(listed.details??listed.error));
  for(let n=0;!sales[id]&&n<36;n++)await p.tick(60);
  assert.ok(sales[id]>0,JSON.stringify({id,sales,held:p.stock(id),period:p.state.world.period.settledCount}));
  assert.equal(p.stock(id),10-sales[id]);
  const second=await p.saveAndRestart(1);
  assert.equal(second.shops[0].item[id-1],10-sales[id]);
  assert.equal(second.shops[0].showcase[0],id);
  await p.tick(1);
  t.diagnostic(JSON.stringify({package:id,manufactured:10,naturalSales:sales[id],saved:second.shops[0].item[id-1],revision:second.revision}));
}
function onSale(sales){
  return r=>{
    assert.equal(Object.values(r.details.soldByItem).reduce((sum,x)=>sum+x,0),r.details.naturalSaleCount);
    for(const [id,n] of Object.entries(r.details.soldByItem))sales[id]=(sales[id]??0)+n;
  };
}
test('R4 genuine #72 wooden equipment package uses all four crafted components, sells and survives two v2 generations',async t=>{
  const sales={},p=await genuinePlayer(t,{now:null,crossPeriod:true,fullCommerce:true,fundMarketWithWork:true,onTick:onSale(sales)});
  await p.use(79,1); // source starter ticket exchange -> books #15, #16, #17
  assert.equal(p.stock(17),1);
  await p.market(13);
  for(const [useId,id,raw,count] of [[0,40,3,20],[1,57,3,20],[2,46,4,10],[3,52,4,10]]){
    for(let n=0;p.stock(id)<10;n++){
      assert.ok(n<12,'source wood production #'+id);
      await p.gather(raw,count);
      await p.use(17,useId);
    }
  }
  await p.market(39);
  await packageAndSell(t,p,{id:72,useId:13,components:[40,46,52,57],sales});
});
test('R4 genuine #73 iron equipment package from two source skills and four books, actual sale and dual v2 restart',async t=>{
  const sales={},p=await genuinePlayer(t,{now:null,crossPeriod:true,fullCommerce:true,fundMarketWithWork:true,onTick:onSale(sales)});
  await p.use(79,0);await p.use(79,3);
  await p.market(13);
  // Buy expensive source books before mining the full inventory. The
  // market planner earns actual work money and reserves accrued upkeep.
  for(const id of [20,21,22,23])await p.market(id);
  await p.ore(5,20);await p.ore(6,5);await p.ore(7,3);
  await p.use(37,0);assert.equal(p.stock(18),1);
  await p.market(37);await p.stones(30);await p.use(37,1);assert.equal(p.stock(19),1);
  for(const [book,id] of [[20,41],[21,47],[22,53],[23,58]]){
    for(let n=0;p.stock(id)<10;n++){
      assert.ok(n<12,'source iron production #'+id);
      await p.ore(5,20);
      if(book===23)await p.stones(2);
      await p.use(book,0);
      assert.equal(p.stock(18),1);assert.equal(p.stock(19),1);
    }
  }
  await p.market(39);
  await packageAndSell(t,p,{id:73,useId:14,components:[41,47,53,58],sales});
});
