/** Actual full-commerce manufacture -> packing -> natural sale -> v2.
 * Source item amounts, money, time and RNG are all produced via HTTP.
 * No retries of a failed world, selected identity, injected stock or EXP.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';
import {planGenuineMarketStep} from './support/genuine-market-plan.mjs';

async function packageAndSell(t,p,{id,useId,components,sales,losses,generation=0,expectedTools=1,saleHours=36}){
  assert.equal(p.stock(id),0,'no pre-existing package');
  assert.ok(components.every(x=>p.stock(x)>=10));
  assert.equal(p.stock(39),expectedTools);
  const offer=p.quote(39,useId);
  assert.ok(offer?.canUse||offer?.timePerUseSeconds>p.remaining(),'source package eligibility');
  await p.enoughTime(offer.timePerUseSeconds);
  const prior=p.state.shop,receipt=await p.use(39,useId);
  assert.equal(receipt.details.effectiveCount,1);
  assert.equal(receipt.details.experienceGain,10);
  assert.equal(p.stock(39),prior.item[38]-1);
  for(const x of components)assert.equal(p.stock(x),prior.item[x-1]-10,'material #'+x);
  assert.equal(p.stock(id),10);
  assert.ok(p.state.showcaseOffers.some(o=>o.itemId===id&&o.owned===10));
  const first=await p.saveAndRestart(generation);
  assert.equal(first.shops[0].item[id-1],10);
  await p.enoughTime(600);
  const listed=await p.post('/api/showcase',{expectedRevision:p.state.world.revision,shelf:0,itemId:id,per:10});
  assert.equal(listed.code,'COMMITTED',JSON.stringify(listed.details??listed.error));
  // A rare package is not expected to sell within one 36h settlement.
  // Advance one continuous real world, never replay a failed draw or
  // replace event losses. The caller supplies a finite source-POP window.
  for(let n=0;!sales[id]&&p.stock(id)>0&&n<saleHours;n++)await p.tick(60);
  assert.ok(sales[id]>0,JSON.stringify({id,saleHours,sales,losses,held:p.stock(id),rank:p.state.shop.rank,period:p.state.world.period.settledCount}));
  // Losses from a real theft/robbery EVENT are not natural sales.
  // Reconcile both from the same command receipts before checking disk.
  assert.equal(p.stock(id),10-sales[id]-(losses[id]??0));
  const second=await p.saveAndRestart(generation+1);
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
    if(book===20){
      await p.enoughTime(p.quote(book,1).timePerUseSeconds);
      assert.equal(p.exp(book),0);
      const route=p.quote(39,15).materialRoutes.find(x=>x.itemId===product);
      assert.equal(route.kind,'upstream-use-not-ready');
      assert.equal(route.provider,null);
      assert.match(route.providerCandidates.find(x=>x.itemId===book&&x.useId===1).reason,/熟練度不足/);
      await p.deny(book,1);
    }
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
      if(useId===1&&p.stock(product)===0){
        const route=p.quote(39,15).materialRoutes.find(x=>x.itemId===product);
        assert.equal(route.kind,'registered-use');
        assert.deepEqual(route.provider,{itemId:book,useId:1});
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

/** Build working capital and donor EXP with the same four legal product
 * routes already exercised by the genuine high-point test. Buy scarce
 * magic stones while the shop is productive, rather than waiting on a
 * sold-out iron shelf after all the expensive components are accumulated.
 * Targets are client strategy only; all money, stock and EXP come from HTTP.
 */
async function prepareAdvancedCapital(t,p){
  const goods=[
    {id:40,book:17,useId:0,raw:3,input:20,output:20},
    {id:57,book:17,useId:1,raw:3,input:20,output:20},
    {id:45,book:16,useId:0,raw:2,input:24,output:30},
    {id:51,book:16,useId:1,raw:2,input:24,output:32},
  ];
  const reserve=()=>Math.max(45000,Math.ceil(p.state.shop.costtoday)+10000);
  await p.use(79,1);
  await p.market(13);await p.market(12);
  for(let n=0;;n++){
    assert.ok(n<32,'advanced capital construction budget');
    await p.enoughTime(p.quote(63,3).timePerUseSeconds);
    if(p.state.shop.money>=40000+reserve())break;
    await p.use(13,1);
  }
  await p.use(63,3);assert.equal(p.state.shop.showcasecount,4);
  async function produce(g){
    const count=Math.min(6,Math.max(1,Math.ceil((120-p.stock(g.id))/(g.output*0.8))));
    await p.gather(g.raw,g.input*count);
    const r=await p.use(g.book,g.useId,count);
    assert.equal(r.details.effectiveCount,count);
    assert.ok(r.details.originalUseItem.some(([id,n])=>id===g.raw&&n===g.input*count));
    assert.ok(r.details.originalAddItem.some(([id,n])=>id===g.id&&n>=Math.floor(g.output*count*0.8)));
  }
  for(const g of goods)for(let n=0;p.stock(g.id)<120;n++){
    assert.ok(n<4,'advanced capital initial manufacture #'+g.id);await produce(g);
  }
  await p.enoughTime(4*600);
  for(const [shelf,g] of goods.entries()){
    const r=await p.post('/api/showcase',{expectedRevision:p.state.world.revision,shelf,itemId:g.id,per:120});
    assert.equal(r.code,'COMMITTED',JSON.stringify(r.details??r.error));
  }
  const start=p.state.world.nowSeconds;
  let steps=0,stonePurchases=0,lastPeriod=-1;
  const status=()=>({money:p.state.shop.money,stones:p.stock(8),exp16:p.exp(16),exp17:p.exp(17),
    period:p.state.world.period.settledCount,steps,stonePurchases,stock:goods.map(g=>[g.id,p.stock(g.id)])});
  // 30 for the skill, 6 for one mid recipe, up to 20 for two high
  // recipes, and 24 for source EXP recovery or additional batches.
  // #8 PLUS is 6h; buy every affordable arrival during actual trade.
  while(p.state.shop.money<3000000||p.stock(8)<80||p.exp(16)+p.exp(17)<1600){
    assert.ok(++steps<=1800&&p.state.world.nowSeconds-start<=28*129600,
      'advanced capital/stone supply budget '+JSON.stringify(status()));
    if(lastPeriod!==p.state.world.period.settledCount){
      lastPeriod=p.state.world.period.settledCount;t.diagnostic('advanced capital '+JSON.stringify(status()));
    }
    if(p.stock(8)<80){
      const offer=p.state.marketOffers.find(x=>x.itemId===8);
      const plan=planGenuineMarketStep({offer,owned:p.stock(8),needed:80-p.stock(8),partial:true,
        money:p.state.shop.money,remaining:p.remaining(),reserve:reserve()});
      if(plan.kind==='buy'){
        await p.market(8,plan.quantity,{partial:true});stonePurchases+=plan.quantity;continue;
      }
    }
    const g=goods.reduce((a,b)=>p.stock(a.id)<=p.stock(b.id)?a:b);
    if(p.stock(g.id)<64)await produce(g);else await p.tick(60);
  }
  assert.ok(stonePurchases>=80);
  // Keep the showcases earning while procuring the skill materials and
  // the first career. The packing sale oracle requires a single shelf;
  // shrink later with a separately acquired original #63 tool.
  t.diagnostic('advanced capital ready '+JSON.stringify(status()));
}

/** #75 and #76 share one actual player so the #76 progression reuses
 * legitimately earned EXP rather than re-creating a trained shop.
 * Four books: thresholds 40%/60%, except staff 50%/70%.
 * #76 may require a second 20-unit recipe because source output is 40%.
 */
test('R4 genuine #75 and #76 advanced package progression, lostbook, natural sales and four v2 generations',async t=>{
  const sales75={},loss75={},sales76={},loss76={};
  const watch75=onSale(sales75,loss75,75),watch76=onSale(sales76,loss76,76);
  // One finite fallback budget, unchanged from the previous run. The
  // primary funding is now real multi-shelf natural commerce. Reserved
  // advanced components are never displayed until they are packed.
  const p=await genuinePlayer(t,{now:null,crossPeriod:true,fullCommerce:true,fundMarketWithWork:true,
    fundingWorkBudget:240,fundingSaleItems:[41,47,53,58],
    onTick(r,before){watch75(r,before);watch76(r,before);}});
  await prepareAdvancedCapital(t,p);
  await p.market(39,2,{partial:true});assert.equal(p.stock(39),2);
  await p.market(63);
  await p.ore(5,20);await p.ore(6,5);await p.ore(7,3);
  await p.market(37);await p.use(37,0);assert.equal(p.stock(18),1);
  await p.market(37);await p.stones(30);await p.use(37,1);assert.equal(p.stock(19),1);
  // Prepare the rare staff inputs before converting the donor EXP.
  // First finish the stone-dependent career, then the three iron-only
  // training routes. Do not reset/retry a world or select a draw.
  await p.ore(6,20);await p.ore(7,40);
  for(const [book,basic,career,midGate,highGate] of [[23,58,7,500,700],[20,41,4,400,600],[21,47,5,400,600],[22,53,6,400,600]]){
    await p.market(book);await p.market(78);
    await p.ore(5,160);
    await p.use(78,career);
    assert.equal(p.stock(78),0);
    async function craft(useId,gate){
      // Lostbook is the actual source callback; acquire any replacement.
      if(!p.stock(book))await p.market(book);
      const oreId=useId===0?5:useId===2?6:7;
      const stone=book===23?({0:2,2:6,3:10})[useId]:0;
      await p.ore(oreId,20);
      if(stone)await p.stones(stone);
      for(let n=0;;n++){
        assert.ok(n<8,'source recipe clock convergence #'+book+'/'+useId);
        const offer=p.quote(book,useId);
        if(p.exp(book)<gate)return false;
        if(p.remaining()>=offer.timePerUseSeconds)break;
        await p.enoughTime(offer.timePerUseSeconds);
      }
      const before=p.state.shop,previous=p.exp(book),out=basic+useId;
      assert.equal(p.quote(book,useId).canUse,true);
      const r=await p.use(book,useId);
      assert.equal(r.details.experienceGain,20);
      assert.equal(p.exp(book),previous+20);
      assert.equal(p.stock(oreId),before.item[oreId-1]-20);
      if(stone)assert.equal(p.stock(8),before.item[7]-stone);
      assert.ok(p.stock(out)>before.item[out-1],'original MakeAmount #'+out);
      assert.equal(p.stock(book),before.item[book-1]-(r.details.mapDestroyed?1:0));
      if(useId>=2)assert.ok(r.details.callbackOrder.includes('after-use'));
      assert.equal(p.stock(18),1);assert.equal(p.stock(19),1);
      return true;
    }
    for(const [useId,gate] of [[2,midGate],[3,highGate]]){
      const product=basic+useId;
      for(let n=0;p.stock(product)<10;n++){
        assert.ok(n<64,'source advanced recipe readiness '+JSON.stringify({book,useId,gate,exp:p.exp(book),held:p.stock(product),money:p.state.shop.money,period:p.state.world.period.settledCount}));
        if(p.exp(book)>=gate&&await craft(useId,gate))continue;
        await craft(0,0);
        // Fund future books and ore by genuine ordinary sales, without
        // exposing the protected packing materials to EVENT losses.
        if(p.stock(basic)>0)await p.list(basic);
      }
      t.diagnostic(JSON.stringify({book,product,held:p.stock(product),exp:p.exp(book),period:p.state.world.period.settledCount,
        money:p.state.shop.money,costtoday:p.state.shop.costtoday,fundingWorks:p.fundingWorks}));
    }
  }
  await p.use(63,0);
  assert.equal(p.state.shop.showcasecount,1);
  await packageAndSell(t,p,{id:75,useId:16,components:[43,49,55,60],sales:sales75,losses:loss75,generation:0,expectedTools:2,saleHours:2*108});
  assert.equal(p.stock(39),1);
  await packageAndSell(t,p,{id:76,useId:17,components:[44,50,56,61],sales:sales76,losses:loss76,generation:2,saleHours:2*148});
  assert.equal(p.stock(39),0);
  t.diagnostic(JSON.stringify({fundingWorks:p.fundingWorks,finalMoney:p.state.shop.money,period:p.state.world.period.settledCount}));
});
