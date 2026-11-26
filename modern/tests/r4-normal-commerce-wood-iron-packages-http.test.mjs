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
  // Original #8 LIMIT 200/50 means a 200 holding limit, but
  // CheckWholeStore caps this one-shop street (shop + wholesale) at 50.
  // Accumulate at most 50 before the skill consumes 30, then refill.
  // The source PLUS 6h is population-scaled, not a one-unit timer.
  const stoneStreetCap=50;
  while(p.state.shop.money<3000000||p.stock(8)<stoneStreetCap||p.exp(16)+p.exp(17)<1600){
    assert.ok(++steps<=700&&p.state.world.nowSeconds-start<=12*129600,
      'advanced capital/stone supply budget '+JSON.stringify(status()));
    if(lastPeriod!==p.state.world.period.settledCount){
      lastPeriod=p.state.world.period.settledCount;t.diagnostic('advanced capital '+JSON.stringify(status()));
    }
    assert.ok(p.stock(8)+p.state.world.market.wholesale[7]<=stoneStreetCap,'source CheckWholeStore total #8 cap');
    if(p.stock(8)<stoneStreetCap){
      const offer=p.state.marketOffers.find(x=>x.itemId===8);
      const plan=planGenuineMarketStep({offer,owned:p.stock(8),needed:stoneStreetCap-p.stock(8),partial:true,
        money:p.state.shop.money,remaining:p.remaining(),reserve:reserve()});
      if(plan.kind==='buy'){
        await p.market(8,plan.quantity,{partial:true});stonePurchases+=plan.quantity;continue;
      }
    }
    const g=goods.reduce((a,b)=>p.stock(a.id)<=p.stock(b.id)?a:b);
    if(p.stock(g.id)<64)await produce(g);else await p.tick(60);
  }
  assert.equal(stonePurchases,stoneStreetCap);
  assert.equal(p.stock(8),stoneStreetCap);
  assert.equal(p.state.world.market.wholesale[7],0);
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
  await p.market(37);assert.equal(p.stock(8),50);
  await p.use(37,1);assert.equal(p.stock(19),1);assert.equal(p.stock(8),20);
  // Consuming the skill materials opens 30 slots for real PLUS supply.
  // Refill while the donor EXP and multi-shelf revenue are still live.
  await p.stones(50);assert.equal(p.stock(8),50);
  assert.equal(p.state.world.market.wholesale[7],0);
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
      const gain=Math.min(20,1000-previous);
      assert.equal(r.details.experienceGain,gain);
      assert.equal(p.exp(book),previous+gain);
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


// Separate from the package careers. A single genuine player retains
// at least eleven of each actual manufactured component: ten consumed by
// the original dismantling recipe, a positive remainder for natural sale.
test('R4 genuine #39/3-11 advanced dismantling, all sixteen manufactured components, robot recovery, natural sales and v2 reload',async t=>{
  const sales={},crafts=[],recovered=[];
  const p=await genuinePlayer(t,{now:null,crossPeriod:true,fullCommerce:true,fundMarketWithWork:true,
    fundingWorkBudget:240,fundingSaleItems:[40,45,51,57],onTick(r){
      assert.equal(r.details.shelfSales.reduce((n,row)=>n+row.count,0),r.details.naturalSaleCount);
      for(const [id,n] of Object.entries(r.details.soldByItem))sales[id]=(sales[id]??0)+n;
    }});
  await prepareAdvancedCapital(t,p);
  // Retain the genuinely earned working capital, reduce recurring shelf
  // maintenance and protect the dismantling training materials from sales.
  await p.market(63);await p.use(63,0);
  assert.equal(p.state.shop.showcasecount,1);
  await p.list(0);
  for(const [book,useId,id,raw,amount] of [[17,0,40,3,20],[17,1,57,3,20],[16,0,45,2,24],[16,1,51,2,24]]){
    for(let n=0;p.stock(id)<20;n++){
      assert.ok(n<12,'dismantling skill component #'+id);
      if(!p.stock(book))await p.market(book);
      await p.gather(raw,amount);await p.use(book,useId);
    }
  }
  async function tool(id){if(!p.stock(id))await p.market(id);}
  async function time(id,useId){
    for(let n=0;n<8;n++){
      const offer=p.quote(id,useId);
      assert.ok(offer,'source USE #'+id+'/'+useId);
      if(p.remaining()>=offer.timePerUseSeconds)return offer;
      await p.enoughTime(offer.timePerUseSeconds);
    }
    assert.fail('source time quote convergence #'+id+'/'+useId);
  }
  await tool(37);await time(37,3);
  assert.ok([40,57,45,51].every(id=>p.stock(id)>=20));
  const skillBefore=p.state.shop;
  const learned=await p.use(37,3);
  assert.deepEqual(learned.details.originalAddItem,[[38,1]]);
  for(const id of [40,57,45,51])assert.equal(p.stock(id),skillBefore.item[id-1]-20);
  assert.equal(p.stock(38),1);
  await tool(37);await p.ore(5,20);await p.ore(6,5);await p.ore(7,3);
  await p.use(37,0);assert.equal(p.stock(18),1);
  await tool(37);await p.stones(30);await p.use(37,1);assert.equal(p.stock(19),1);
  // Stock and EXP are still acquired by the existing genuine helpers.
  for(const [book,basic,career,gates] of [[23,58,7,[0,250,500,700]],[20,41,4,[0,200,400,600]],[21,47,5,[0,200,400,600]],[22,53,6,[0,200,400,600]]]){
    await tool(book);await tool(78);await p.ore(5,160);await p.use(78,career);
    async function craft(useId){
      await tool(book);
      const raw=[5,5,6,7][useId],qty=useId===1?40:20,stone=book===23?[2,4,6,10][useId]:0;
      await p.ore(raw,qty);if(stone)await p.stones(stone);
      const offer=await time(book,useId);
      if(p.exp(book)<gates[useId])return false;
      assert.equal(offer.canUse,true);
      const before=p.state.shop,id=basic+useId;
      const r=await p.use(book,useId),d=r.details;
      assert.equal(d.effectiveCount,1);
      assert.equal(d.timeSpentSeconds,offer.timePerUseSeconds);
      assert.equal(p.stock(raw),before.item[raw-1]-qty);
      if(stone)assert.equal(p.stock(8),before.item[7]-stone);
      const made=d.acquired.find(row=>row.itemId===id);
      assert.equal(made?.attemptedCount,20);assert.equal(made?.probabilityPermille,[800,800,600,400][useId]);
      assert.equal(p.stock(id),before.item[id-1]+made.produced);
      assert.equal(p.exp(book),Math.min(1000,(before.exp?.[book]??0)+20));
      assert.equal(p.stock(book),before.item[book-1]-(d.mapDestroyed?1:0));
      assert.ok([18,19,38].every(i=>p.stock(i)===1));
      crafts.push({book,useId,id,produced:made.produced,destroyed:d.mapDestroyed});
      return true;
    }
    for(const useId of [0,1,2,3]){
      for(let n=0;p.stock(basic+useId)<11;n++){
        assert.ok(n<80,'source disassembly component budget '+JSON.stringify({book,useId,exp:p.exp(book),held:p.stock(basic+useId),period:p.state.world.period.settledCount,money:p.state.shop.money}));
        if(p.exp(book)>=gates[useId]&&await craft(useId))continue;
        // Train on source iron before checking the gate again; never
        // import an already-skilled character or rewrite its EXP.
        await craft(0);
      }
    }
  }
  const components=[41,42,43,44,47,48,49,50,53,54,55,56,58,59,60,61];
  assert.ok(components.every(id=>p.stock(id)>=11));
  const recipes=[
    [3,[41,58],[[5,50,800],[8,10,500]]],
    [4,[47,53],[[5,50,800]]],
    [5,[42,59],[[5,100,800],[8,10,500]]],
    [6,[48,54],[[5,100,800]]],
    [7,[43,60],[[6,50,700],[8,20,500]]],
    [8,[49,55],[[6,50,700]]],
    [9,[44,61],[[7,50,600],[8,30,500]]],
    [10,[50,56],[[7,50,600]]],
  ];
  const limits={5:1000,6:800,7:600,8:200};
  for(const [useId,inputs,outputs] of recipes){
    await tool(39);
    for(const [id,amount] of outputs)if(p.stock(id)>limits[id]-amount)await p.discard(id,p.stock(id)-(limits[id]-amount));
    const offer=await time(39,useId),before=p.state.shop;
    assert.equal(offer.canUse,true);
    const r=await p.use(39,useId),d=r.details;
    assert.equal(d.effectiveCount,1);assert.equal(d.timeSpentSeconds,offer.timePerUseSeconds);
    assert.equal(p.stock(39),before.item[38]-1);assert.equal(p.stock(38),1);
    for(const id of inputs)assert.equal(p.stock(id),before.item[id-1]-10);
    for(const [id,amount,prob] of outputs){
      const got=d.acquired.find(row=>row.itemId===id);
      assert.equal(got?.attemptedCount,amount);assert.equal(got?.probabilityPermille,prob);
      assert.equal(p.stock(id),before.item[id-1]+got.produced);
      assert.ok(got.produced>0);
    }
    assert.equal(d.experienceGain,Math.min(10,1000-(before.exp?.['39']??0)));
    recovered.push({useId,added:d.originalAddItem});
  }
  // Robot is either an actual prize or an actual paid wholesale offer.
  // Keep the whole action clock available before acquisition so a natural
  // EVENT cannot be silently bypassed between purchase and disassembly.
  await tool(39);
  for(const id of [4,5,6,7,8,65])if(p.stock(id))await p.discard(id);
  let robot=null;
  for(let n=0;!robot;n++){
    assert.ok(n<240,'genuine robot readiness '+JSON.stringify({money:p.state.shop.money,stock:p.stock(64),period:p.state.world.period.settledCount}));
    const seconds=p.quote(39,11).timePerUseSeconds;
    await p.enoughTime(seconds+600);
    if(p.stock(64)){
      const before=p.state.shop,done=await p.use(39,11);
      assert.deepEqual(done.details.originalUseItem,[[39,1],[64,1]]);
      assert.deepEqual(done.details.originalAddItem,[[5,300],[6,50],[7,10],[8,30],[65,1],[4,1]]);
      assert.equal(p.stock(64),0);assert.equal(p.stock(38),1);
      for(const [id,n] of done.details.originalAddItem)assert.equal(p.stock(id),before.item[id-1]+n);
      robot={added:done.details.originalAddItem,revision:p.state.world.revision};
      break;
    }
    const offer=p.state.marketOffers.find(x=>x.itemId===64);
    const plan=planGenuineMarketStep({offer,owned:0,needed:1,partial:false,money:p.state.shop.money,
      remaining:p.remaining()-seconds,reserve:Math.max(45000,Math.ceil(p.state.shop.costtoday)+10000)});
    if(plan.kind==='buy'){await p.market(64);continue;}
    if(p.state.shop.money<545000)await p.use(13,1);else await p.tick(60);
  }
  const first=await p.saveAndRestart(0);
  assert.equal(first.shops[0].item[63],0);assert.equal(first.shops[0].item[64],1);
  await tool(39);
  // Actual remaining components and an actual spare dismantling tool are
  // displayed and sold individually; neither theft nor a static listing
  // substitutes for the natural sale receipt.
  for(const id of [...components,39]){
    const prior=sales[id]??0;
    await p.enoughTime(600);
    assert.ok(p.stock(id)>0,'real manufactured remainder #'+id);
    const list=await p.post('/api/showcase',{expectedRevision:p.state.world.revision,shelf:0,itemId:id,per:10});
    assert.equal(list.code,'COMMITTED',JSON.stringify(list.details??list.error));
    for(let n=0;(sales[id]??0)===prior&&n<576&&p.stock(id)>0;n++){
      await p.tick(60);
      if(n%24===23&&(sales[id]??0)===prior)await p.use(13,0);
    }
    assert.ok((sales[id]??0)>prior,'actual natural component sale #'+id);
  }
  const last=await p.saveAndRestart(1);
  assert.equal(last.shops[0].item[37],1);assert.equal(last.shops[0].showcase[0],39);
  t.diagnostic(JSON.stringify({crafts:crafts.length,recovered,robot,sales,first:first.revision,last:last.revision,fundingWorks:p.fundingWorks}));
});
