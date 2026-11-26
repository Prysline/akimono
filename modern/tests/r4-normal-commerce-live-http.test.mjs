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
