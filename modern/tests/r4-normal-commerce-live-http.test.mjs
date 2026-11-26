/** Actual server-generated clock, RNG, market/USE actions and v2 persistence.
 * Not a fixture world. Only negative stale CAS request is forged. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';

test('R4 full commerce player expands, lists mixed/repeated items, sells, settles and obtains the resize tool again via real HTTP',async t=>{
  const sales={},boundaries=[];
  const p=await genuinePlayer(t,{now:null,crossPeriod:true,fullCommerce:true,
    onTick(r,before){
      const d=r.details;
      assert.equal(Object.values(d.soldByItem).reduce((a,b)=>a+b,0),d.naturalSaleCount);
      for(const [id,n] of Object.entries(d.soldByItem))sales[id]=(sales[id]??0)+n;
      if(d.settlementReceipt)boundaries.push({shelves:before.shops[0].showcasecount,receipt:d.settlementReceipt});
    }});
  const edit=async(shelf,itemId,per=100)=>{
    await p.enoughTime(600);
    const r=await p.post('/api/showcase',{expectedRevision:p.state.world.revision,shelf,itemId,per});
    assert.equal(r.code,'COMMITTED',JSON.stringify(r.details??r.error));
    assert.equal(p.state.shop.showcase[shelf],itemId);
  };
  await p.market(10,2);
  await p.market(8,2,{partial:true});
  await p.use(63,2); // exactly three shelves, no injected assets
  assert.equal(p.state.shop.showcasecount,3);
  assert.equal(p.stock(63),0);
  await edit(0,10,10);
  await edit(1,10,10);
  await edit(2,8,10);
  const mixed=[10,10,8];
  assert.deepEqual(p.state.shop.showcase,mixed);
  for(let n=0;(!sales[10]||!sales[8])&&n<10;n++)await p.tick(60);
  assert.ok(sales[10]>0&&sales[8]>0,JSON.stringify(sales));
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
  await p.use(63,0);
  assert.equal(p.state.shop.showcasecount,1);
  assert.equal(p.stock(63),0);
  assert.deepEqual(p.state.shop.showcase,[10]);
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
