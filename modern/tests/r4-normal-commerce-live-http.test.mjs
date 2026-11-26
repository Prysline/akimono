/** Actual server-generated clock, RNG, market/USE actions and v2 persistence.
 * Not a fixture world. Only negative stale CAS request is forged. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';

test('R4 full commerce player expands, lists mixed/repeated items, sells, settles and obtains the resize tool again via real HTTP',async t=>{
  const sales={},boundaries=[];
  let mixedReady=false,observedMixedStock=false;
  const p=await genuinePlayer(t,{now:null,crossPeriod:true,fullCommerce:true,
    onTick(r,before){
      const d=r.details;
      assert.equal(Object.values(d.soldByItem).reduce((a,b)=>a+b,0),d.naturalSaleCount);
      if(mixedReady){
        assert.deepEqual(before.shops[0].showcase,[30,30,10]);
        if(before.shops[0].item[29]>0&&before.shops[0].item[9]>0)observedMixedStock=true;
        for(const [id,n] of Object.entries(d.soldByItem))sales[id]=(sales[id]??0)+n;
      }
      if(d.settlementReceipt)boundaries.push({shelves:before.shops[0].showcasecount,receipt:d.settlementReceipt});
    }});
  const edit=async(shelf,itemId,per=100)=>{
    await p.enoughTime(600);
    const r=await p.post('/api/showcase',{expectedRevision:p.state.world.revision,shelf,itemId,per});
    assert.equal(r.code,'COMMITTED',JSON.stringify(r.details??r.error));
    assert.equal(p.state.shop.showcase[shelf],itemId);
  };
  await p.market(10,2);
  // #30 POP=20m, #10 POP=20d. The duplicate first group shares its
  // demand denominator; #10 in the unlike third shelf is outside that
  // initial scan, giving genuine demand at the original 10% listing.
  await p.market(30,2,{partial:true});
  await p.use(63,2); // exactly three shelves, no injected assets
  assert.equal(p.state.shop.showcasecount,3);
  assert.equal(p.stock(63),0);
  // Have the full edit clock available BEFORE displaying either item,
  // so no setup tick can deplete one of the two goods prematurely.
  await p.enoughTime(1800);
  await edit(0,30,10);
  await edit(1,30,10);
  await edit(2,10,10);
  const mixed=[30,30,10];
  assert.deepEqual(p.state.shop.showcase,mixed);
  assert.ok(p.stock(30)>=2&&p.stock(10)>=2);
  mixedReady=true;
  for(let n=0;(!sales[30]||!sales[10])&&n<10;n++)await p.tick(60);
  assert.ok(observedMixedStock&&sales[30]>0&&sales[10]>0,JSON.stringify({sales,stock30:p.stock(30),stock10:p.stock(10),period:p.state.world.period.settledCount}));
  assert.equal(p.state.shop.showcasecount,3);
  const prior=p.state.world;
  const stale=await p.post('/api/advance-reviewed-time',{expectedRevision:prior.revision-1,minutes:1});
  assert.equal(stale.ok,false);
  assert.deepEqual(p.state.world,prior);
  for(let n=0;!boundaries.some(x=>x.shelves===3)&&n<37;n++)await p.tick(60);
  assert.ok(boundaries.some(x=>x.shelves===3&&x.receipt.maintenance>=4000));
  assert.deepEqual(p.state.shop.showcase,mixed);
  await p.saveAndRestart(0);
  await p.market(63);
  assert.equal(p.stock(63),1);
  mixedReady=false;
  await p.use(63,0);
  assert.equal(p.state.shop.showcasecount,1);
  assert.equal(p.stock(63),0);
  assert.deepEqual(p.state.shop.showcase,[30]);
  const last=await p.saveAndRestart(1);
  assert.equal(last.shops[0].showcasecount,1);
  await p.tick(1);
});

test('R4 eight shelves charge original maintenance; negative cash survives v2 and zero-cost commerce',async t=>{
  const boundaries=[];
  const purchases=[];
  const p=await genuinePlayer(t,{now:null,crossPeriod:true,fullCommerce:true,
    onTick(r,before){
      if(r.details.settlementReceipt)boundaries.push({shelves:before.shops[0].showcasecount,...r.details.settlementReceipt});
    },
    onPurchase(r,before,offer){
      purchases.push({id:offer.itemId,price:offer.price,before:before.shops[0].money,after:r.state.shop.money});
    }});
  await p.market(13);
  await p.use(63,7);
  assert.equal(p.state.shop.showcasecount,8);
  assert.equal(p.stock(63),0);
  for(let n=0;p.state.shop.money>=0&&n<145;n++)await p.tick(60);
  assert.ok(boundaries.some(b=>b.shelves===8&&b.maintenance>=128000&&b.cashAfterLedger<0));
  assert.ok(p.state.shop.money<0,'eight shelves must not clamp negative cash to zero');
  const debt=p.state.shop.money;
  const saved=await p.saveAndRestart(0);
  assert.equal(saved.shops[0].money,debt);
  // No debt injection or free-time fixture. A zero-price book already
  // obtained through the actual market can earn money with an ordinary USE.
  await p.enoughTime(14400);
  const before=p.state.shop.money;
  const earned=await p.use(13,0);
  assert.equal(earned.details.moneyEarned,3000);
  assert.equal(p.state.shop.money,before+3000);
  await p.market(63);
  const purchase=purchases.find(p=>p.id===63);
  assert.equal(purchase.price,0);
  assert.equal(purchase.after,purchase.before);
  assert.equal(p.stock(63),1);
  await p.saveAndRestart(1);
  await p.tick(1);
});

// Each size gets one independent fresh player. No selected seed, injected
// assets, rerolled failure or fixture clock. #30 high-price sales exercise
// the original tax branch; #32 is another medicine, #10 a different type.
const shelfCosts=[0,2000,4000,8000,16000,32000,64000,128000];
for(let count=1;count<=8;count++){
  test('R4 genuine '+count+'-shelf construction, sale/tax, maintenance, shrink, tool reacquisition and regrowth across four v2 generations',async t=>{
    const layout=([30,32,30,10,32,10,30,32]).slice(0,count);
    let ready=false,settlement=null,positiveTax=0,afterShrink=false,shrunkSettlement=null;const sales={};
    const p=await genuinePlayer(t,{now:null,crossPeriod:true,fullCommerce:true,fundMarketWithWork:true,onTick(r,before){
      const d=r.details,shop=before.shops[0],rows=d.shelfSales;
      assert.ok(Array.isArray(rows),'formal per-shelf source receipt');
      assert.equal(rows.reduce((sum,x)=>sum+x.count,0),d.naturalSaleCount);
      const byItem={},remaining=new Map();
      for(const row of rows){
        assert.ok(row.shelf>=0&&row.shelf<shop.showcasecount);
        assert.equal(row.itemId,shop.showcase[row.shelf]);
        assert.equal(row.unitPrice,shop.price[row.shelf]);
        assert.equal(row.gross,row.count*row.unitPrice);
        assert.equal(row.stockAfter,row.stockBefore-row.count);
        assert.ok(row.stockAfter>=0&&row.count>0);
        const key=row.sliceIndex+':'+row.itemId;
        if(remaining.has(key))assert.equal(row.stockBefore,remaining.get(key),'duplicate shelves share inventory within one source slice');
        else if(row.sliceIndex===0)assert.equal(row.stockBefore,shop.item[row.itemId-1]);
        remaining.set(key,row.stockAfter);
        byItem[row.itemId]=(byItem[row.itemId]??0)+row.count;
        if(ready){
          sales[row.itemId]=(sales[row.itemId]??0)+row.count;
          if(row.itemId===30){
            const rate=Math.min(99,Math.trunc((row.unitPrice/100-1)*5+0.5));
            assert.equal(row.tax,Math.trunc(row.gross*rate/100));
            positiveTax+=row.tax;
          }else assert.equal(row.tax,0);
        }
      }
      assert.deepEqual(byItem,d.soldByItem);
      if(ready&&d.settlementReceipt){
        const q=d.settlementReceipt;
        assert.equal(typeof q.costBeforeLedger,'string','lossless decimal receipt wire');
        const sourceCost=Number(q.costBeforeLedger);
        assert.ok(Number.isFinite(sourceCost)&&sourceCost>=0&&String(sourceCost)===q.costBeforeLedger);
        assert.equal(q.maintenance,Math.trunc(sourceCost)+shelfCosts[count-1]);
        assert.equal(q.cashBeforeLedger-q.cashAfterLedger,q.maintenance);
        assert.equal(shop.showcasecount,count);
        settlement=q;
      }
      if(afterShrink&&d.settlementReceipt){
        const q=d.settlementReceipt;
        assert.equal(shop.showcasecount,1);
        assert.equal(q.maintenance,Math.trunc(Number(q.costBeforeLedger))+shelfCosts[0]);
        assert.equal(q.cashBeforeLedger-q.cashAfterLedger,q.maintenance);
        shrunkSettlement=q;
      }
    }});
    // The source starter grant is five vouchers; the beginner book
    // exchange consumes all five. Obtain the gathering map by real market
    // purchase rather than attempting a second incompatible exchange.
    await p.use(79,1);
    await p.market(13);
    // Manufacture rather than wait for a large random wholesale delivery.
    await p.gather(1,10);await p.use(15,0);
    assert.ok(p.stock(30)>=10);
    if(layout.includes(32))await p.market(32,2,{partial:true});
    if(layout.includes(10))await p.market(10,2,{partial:true});
    const quote=p.quote(63,count-1);
    assert.equal(quote.moneyPerUse,count*10000);
    assert.equal(quote.timePerUseSeconds,count*1800);
    // Earn both construction fees, the shrink fee and a conservative
    // three-period large-shelf reserve BEFORE expanding. At size eight,
    // upkeep may exceed full-time work income; trying to earn the same
    // reserve only after expansion could trap the real player in debt.
    const resizeReserve=2*count*10000+10000+3*shelfCosts[count-1];
    for(let n=0;;n++){
      assert.ok(n<72,'source construction funding budget '+JSON.stringify({count,money:p.state.shop.money,resizeReserve,period:p.state.world.period.settledCount}));
      await p.enoughTime(p.quote(63,count-1).timePerUseSeconds);
      const reserve=Math.max(10000,Math.ceil(p.state.shop.costtoday)+10000);
      if(p.state.shop.money>=resizeReserve+reserve)break;
      const work=await p.use(13,1);
      assert.equal(work.details.moneyEarned,10000);
    }
    assert.equal(p.quote(63,count-1).canUse,true);
    const prior=p.state.shop,resize=await p.use(63,count-1);
    assert.equal(resize.details.effectiveCount,1);
    assert.deepEqual(resize.details.originalInlineLogCalls,[[0,1,'展示架已經改成'+count+'個了'],[3,0,p.state.shop.shopname+'的展示架已經變成'+count+'個了']]);
    const resizeLogs=resize.details.originalInlineLogCalls.map(row=>[p.state.world.nowSeconds,...row].join('\t')+'\n').reverse().join('');
    assert.ok(p.state.world.period.disk.live['log0.cgi'].bytes.startsWith(resizeLogs));
    assert.equal(p.stock(63),0);assert.equal(p.state.shop.money,prior.money-count*10000);
    assert.deepEqual(p.state.shop.showcase,Array(count).fill(0));
    assert.deepEqual(p.state.shop.price,Array(count).fill(0));
    await p.enoughTime(count*600);
    for(const [shelf,itemId] of layout.entries()){
      const per=itemId===30?(shelf===0?200:150):itemId===10?10:100;
      const r=await p.post('/api/showcase',{expectedRevision:p.state.world.revision,shelf,itemId,per});
      assert.equal(r.code,'COMMITTED',JSON.stringify(r.details??r.error));
    }
    assert.deepEqual(p.state.shop.showcase,layout);
    const first=await p.saveAndRestart(0);
    assert.deepEqual(first.shops[0].showcase,layout);
    ready=true;
    // The original #30/#32 POP is 20m/50m; unlike #10 bypasses the
    // initial denominator and is priced at 10%. Observe a full period,
    // not a selected winning draw. The actual tax branch must occur.
    for(let n=0;(!settlement||!layout.every(id=>sales[id]>0))&&n<37;n++)await p.tick(60);
    assert.ok(settlement&&layout.every(id=>sales[id]>0)&&positiveTax>0,
      JSON.stringify({count,sales,positiveTax,settlement:!!settlement,stock:p.state.shop.item}));
    const second=await p.saveAndRestart(1);
    assert.deepEqual(second.shops[0].showcase,layout);
    assert.deepEqual(second.shops[0].price,first.shops[0].price);
    assert.ok(second.period.settledCount>first.period.settledCount);
    // The same player (and the same save history) must obtain a new tool.
    // The source shrink splices showcase/price, never the shared inventory.
    ready=false;
    async function resizeTo(target){
      assert.equal(p.stock(63),0);
      await p.deny(63,target-1);
      await p.market(63);
      assert.equal(p.stock(63),1);
      const q=p.quote(63,target-1);
      assert.equal(q.moneyPerUse,target*10000);
      assert.equal(q.timePerUseSeconds,target*1800);
      await p.enoughTime(q.timePerUseSeconds);
      assert.equal(p.quote(63,target-1).canUse,true);
      const prior=p.state.shop,revision=p.state.world.revision,now=p.state.world.nowSeconds;
      const r=await p.use(63,target-1);
      assert.equal(r.details.effectiveCount,1);
      assert.equal(r.details.moneySpent,target*10000);
      assert.equal(r.details.timeSpentSeconds,target*1800);
      assert.equal(p.state.shop.money,prior.money-target*10000);
      assert.equal(p.state.shop.paytoday,prior.paytoday+target*10000);
      assert.equal(p.state.shop.showcasecount,target);
      const expectedItems=[...prior.item];expectedItems[62]--;
      assert.deepEqual(p.state.shop.item,expectedItems,'resize must not discard inventory');
      const expectedShowcase=prior.showcase.slice(0,target),expectedPrice=prior.price.slice(0,target);
      while(expectedShowcase.length<target){expectedShowcase.push(0);expectedPrice.push(0);}
      assert.deepEqual(p.state.shop.showcase,expectedShowcase);
      assert.deepEqual(p.state.shop.price,expectedPrice);
      assert.deepEqual(r.details.originalInlineLogCalls,[[0,1,'展示架已經改成'+target+'個了'],[3,0,p.state.shop.shopname+'的展示架已經變成'+target+'個了']]);
      const logBytes=r.details.originalInlineLogCalls.map(row=>[now,...row].join('\t')+'\n').reverse().join('');
      assert.ok(p.state.world.period.disk.live['log0.cgi'].bytes.startsWith(logBytes));
      const committed=p.state.world;
      const stale=await p.post('/api/use',{expectedRevision:revision,itemId:63,useId:target-1,requestedCount:1});
      assert.equal(stale.ok,false);
      assert.deepEqual(p.state.world,committed);
      await p.deny(63,target-1);
      return {expectedShowcase,expectedPrice,logBytes};
    }
    const shrunk=await resizeTo(1);
    assert.deepEqual(shrunk.expectedShowcase,layout.slice(0,1));
    const third=await p.saveAndRestart(2);
    assert.deepEqual(third.shops[0].showcase,shrunk.expectedShowcase);
    assert.deepEqual(third.shops[0].price,shrunk.expectedPrice);
    assert.ok(third.period.disk.live['log0.cgi'].bytes.startsWith(shrunk.logBytes));
    afterShrink=true;
    for(let n=0;!shrunkSettlement&&n<37;n++)await p.tick(60);
    assert.ok(shrunkSettlement,'next real period must charge only one shelf');
    afterShrink=false;
    const regrown=await resizeTo(count);
    assert.deepEqual(regrown.expectedShowcase,[layout[0],...Array(count-1).fill(0)]);
    assert.deepEqual(regrown.expectedPrice,[shrunk.expectedPrice[0],...Array(count-1).fill(0)]);
    const fourth=await p.saveAndRestart(3);
    assert.deepEqual(fourth.shops[0].showcase,regrown.expectedShowcase);
    assert.deepEqual(fourth.shops[0].price,regrown.expectedPrice);
    assert.ok(fourth.period.disk.live['log0.cgi'].bytes.startsWith(regrown.logBytes));
    await p.tick(1);
    t.diagnostic(JSON.stringify({shelves:count,layout,sales,positiveTax,maintenance:settlement.maintenance,
      shrunkMaintenance:shrunkSettlement.maintenance,regrown:fourth.shops[0].showcase,revision:fourth.revision,generations:4}));
  });
}
