/** Actual full-commerce manufacture -> packing -> natural sale -> v2.
 * Source item amounts, money, time and RNG are all produced via HTTP.
 * No retries of a failed world, selected identity, injected stock or EXP.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';

async function packageAndSell(t,p,{id,useId,components,sales,losses}){
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
  // Losses from a real theft/robbery EVENT are not natural sales.
  // Reconcile both from the same command receipts before checking disk.
  assert.equal(p.stock(id),10-sales[id]-(losses[id]??0));
  const second=await p.saveAndRestart(1);
  assert.equal(second.shops[0].item[id-1],10-sales[id]-(losses[id]??0));
  assert.equal(second.shops[0].showcase[0],id);
  await p.tick(1);
  t.diagnostic(JSON.stringify({package:id,manufactured:10,naturalSales:sales[id],eventLoss:losses[id]??0,saved:second.shops[0].item[id-1],revision:second.revision}));
}
function onSale(sales,losses,packageId){
  return (r,before)=>{
    assert.equal(Object.values(r.details.soldByItem).reduce((sum,x)=>sum+x,0),r.details.naturalSaleCount);
    for(const [id,n] of Object.entries(r.details.soldByItem))sales[id]=(sales[id]??0)+n;
    const shop=before.shops[0];
    if(shop.showcase[0]!==packageId)return;
    assert.equal(shop.showcasecount,1);
    const trace=r.details.sourceTrace;
    const logs=trace.slices?trace.slices.flatMap(x=>x.logs):trace.logs;
    const stolenValue=logs.reduce((total,row)=>{
      const match=String(row[2]).match(/(?:被偷了|被搶了)相當於總額(\d+)的商品。/);
      return total+(match?Number(match[1]):0);
    },0);
    assert.equal(stolenValue%shop.price[0],0,'original single-shelf event loss value');
    const stolen=stolenValue/shop.price[0];
    losses[packageId]=(losses[packageId]??0)+stolen;
    assert.equal(r.state.shop.item[packageId-1],shop.item[packageId-1]-(r.details.soldByItem[packageId]??0)-stolen);
  };
}
test('R4 genuine #72 wooden equipment package uses all four crafted components, sells and survives two v2 generations',async t=>{
  const sales={},losses={},p=await genuinePlayer(t,{now:null,crossPeriod:true,fullCommerce:true,fundMarketWithWork:true,onTick:onSale(sales,losses,72)});
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
  await packageAndSell(t,p,{id:72,useId:13,components:[40,46,52,57],sales,losses});
});
test('R4 genuine #73 iron equipment package from two source skills and four books, actual sale and dual v2 restart',async t=>{
  const sales={},losses={},p=await genuinePlayer(t,{now:null,crossPeriod:true,fullCommerce:true,fundMarketWithWork:true,onTick:onSale(sales,losses,73)});
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
  await packageAndSell(t,p,{id:73,useId:14,components:[41,47,53,58],sales,losses});
});

// #74 uses actual manufacture: its components have negative PLUS and a
// fresh sparse world has no wholesale stock to buy. Train one source book
// at a time, leaving the four steel components off the showcase until packing.
test('R4 genuine #74 steel equipment package from four trained production books, natural sale and dual v2 restart',async t=>{
  const sales={},losses={},p=await genuinePlayer(t,{now:null,crossPeriod:true,fullCommerce:true,fundMarketWithWork:true,onTick:onSale(sales,losses,74)});
  await p.use(79,0);await p.use(79,3);
  await p.market(13);
  await p.ore(5,20);await p.ore(6,5);await p.ore(7,3);
  await p.use(37,0);assert.equal(p.stock(18),1);
  await p.market(37);await p.stones(30);await p.use(37,1);assert.equal(p.stock(19),1);
  for(const [book,product,career,gate] of [[20,42,4,200],[21,48,5,200],[22,54,6,200],[23,59,7,250]]){
    await p.market(book);await p.market(78);
    // Acquire real ore and donor EXP before converting to this profession.
    // A 36h boundary may reduce EXP, so the live gate is rechecked below.
    await p.ore(5,320);
    if(book===23)await p.stones(40);
    await p.use(78,career);
    assert.equal(p.stock(78),0);
    async function craft(useId){
      const raw=useId===0?20:40,stone=book===23?(useId===0?2:4):0;
      await p.ore(5,raw);
      if(stone)await p.stones(stone);
      for(let n=0;;n++){
        assert.ok(n<8,'live source crafting quote must converge #'+book+'/'+useId);
        const offer=p.quote(book,useId);
        if(useId===1&&p.exp(book)<gate)return false;
        if(p.remaining()>=offer.timePerUseSeconds)break;
        await p.enoughTime(offer.timePerUseSeconds);
      }
      const prior=p.state.shop,previousExp=p.exp(book),out=product-(useId===0?1:0);
      const done=await p.use(book,useId);
      assert.equal(done.details.experienceGain,20);
      assert.equal(p.exp(book),previousExp+20);
      assert.equal(p.stock(5),prior.item[4]-raw);
      if(stone)assert.equal(p.stock(8),prior.item[7]-stone);
      assert.ok(p.stock(out)>prior.item[out-1],'actual source output #'+out);
      assert.equal(p.stock(book),1,'steel recipe does not destroy book');
      assert.equal(p.stock(18),1);assert.equal(p.stock(19),1);
      return true;
    }
    for(let n=0;p.stock(product)<10;n++){
      assert.ok(n<48,'source steel readiness budget '+JSON.stringify({book,product,exp:p.exp(book),gate,held:p.stock(product),money:p.state.shop.money,period:p.state.world.period.settledCount}));
      if(p.exp(book)>=gate&&await craft(1))continue;
      await craft(0);
      // Only the basic output is sold, never the steel packing components.
      if(p.stock(product-1)>0)await p.list(product-1);
    }
    t.diagnostic(JSON.stringify({book,product,exp:p.exp(book),held:p.stock(product),period:p.state.world.period.settledCount}));
  }
  await p.market(39);
  await packageAndSell(t,p,{id:74,useId:15,components:[42,48,54,59],sales,losses});
});
