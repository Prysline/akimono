/** Real normal commerce careers: no fixed time, asset fixtures, RNG tape,
 * selected identity, injected EXP or discarded failed world. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';

async function prepareTime(p,id,useId){
  for(let n=0;n<8;n++){
    const offer=p.quote(id,useId);
    assert.ok(offer,'source USE #'+id+'/'+useId);
    if(p.remaining()>=offer.timePerUseSeconds)return offer;
    await p.enoughTime(offer.timePerUseSeconds);
  }
  assert.fail('source USE clock did not converge #'+id+'/'+useId);
}
async function use(p,id,useId){
  const offer=await prepareTime(p,id,useId),before=p.state.world,shop=before.shops[0];
  assert.equal(offer.canUse,true,JSON.stringify({id,useId,offer,exp:shop.exp,stock:shop.item}));
  const result=await p.use(id,useId),d=result.details;
  assert.equal(d.effectiveCount,1);
  assert.equal(d.timeSpentSeconds,offer.timePerUseSeconds);
  assert.equal(p.state.world.revision,before.revision+1);
  assert.equal(p.state.world.nowSeconds,before.nowSeconds);
  assert.equal(p.state.shop.time,Math.max(shop.time,before.nowSeconds-259200)+d.timeSpentSeconds);
  const holdings=[...shop.item];
  for(const [i,n] of d.originalUseItem)holdings[i-1]-=n;
  for(const [i,n] of d.originalAddItem)holdings[i-1]+=n;
  assert.deepEqual(p.state.shop.item,holdings);
  return {d,shop,before};
}
async function acquire(p,id){
  if(!p.stock(id))await p.market(id);
}
async function trainSmith(p){
  await acquire(p,37);
  await p.ore(5,20);await p.ore(6,5);await p.ore(7,3);
  const {shop,d}=await use(p,37,0);
  assert.deepEqual(d.originalUseItem,[[37,1],[5,20],[6,5],[7,3]]);
  assert.deepEqual(d.originalAddItem,[[18,1]]);
  assert.equal(p.stock(18),1);assert.equal(p.stock(37),0);
  assert.equal(p.stock(5),shop.item[4]-20);
}
async function trainMagic(p){
  await acquire(p,37);await p.stones(30);
  if(p.stock(19))await p.discard(19,1);
  const {d}=await use(p,37,1);
  assert.deepEqual(d.originalUseItem,[[37,1],[8,30]]);
  assert.deepEqual(d.originalAddItem,[[19,1]]);
  assert.equal(p.stock(19),1);assert.equal(p.stock(37),0);
}
async function trainAppraiser(p){
  for(let n=0;!p.stock(24);n++){
    assert.ok(n<24,'actual training budget '+JSON.stringify({exp:p.exp(37),period:p.state.world.period.settledCount}));
    await acquire(p,37);
    if(p.exp(37)<200){await trainMagic(p);continue;}
    for(const id of [1,2,3,4])await p.gather(id,3);
    for(const id of [5,6,7])await p.ore(id,3);
    await p.stones(3);
    await prepareTime(p,37,2);
    if(p.exp(37)<200)continue;
    const {shop,d}=await use(p,37,2);
    assert.equal(d.experienceGain,50);assert.deepEqual(d.originalAddItem,[[24,1]]);
    for(let id=1;id<=8;id++)assert.equal(p.stock(id),shop.item[id-1]-3);
  }
  for(const id of [18,19,24])assert.equal(p.stock(id),1);
}
async function list(p,id,per,sales){
  const beforeStock=p.stock(id),beforeSales=sales[id]??0;
  assert.ok(beforeStock>0,'source stock before listing #'+id);
  await p.enoughTime(600);
  // Waiting is a real turn. An already displayed, newly crafted item can
  // sell out before the next repricing command. Require real sale receipts;
  // never replace stock, discard this career, or suppress a failed command.
  if(!p.stock(id)){
    assert.equal(p.state.shop.showcase[0],id,'sold during wait on existing shelf');
    assert.equal((sales[id]??0)-beforeSales,beforeStock,'real sale during listing wait #'+id);
    return false;
  }
  const r=await p.post('/api/showcase',{expectedRevision:p.state.world.revision,shelf:0,itemId:id,per});
  assert.equal(r.code,'COMMITTED',JSON.stringify(r.details??r.error));
  assert.equal(p.state.shop.showcase[0],id);
  return true;
}
async function naturalSale(p,id,sales,hours=288){
  const before=sales[id]??0;
  await list(p,id,10,sales);
  for(let n=0;(sales[id]??0)===before&&n<hours&&p.stock(id)>0;n++){
    await p.tick(60);
    if(n%24===23&&(sales[id]??0)===before)await p.use(13,0);
  }
  assert.ok((sales[id]??0)>before,'actual source sale #'+id+' '+JSON.stringify({sales,hours,stock:p.stock(id)}));
}

test('R4 genuine #66/0-3 accessory manufacture, #67-70 natural sales, positive FUNCTURN and lostbook with dual v2 reload',async t=>{
  const sales={},crafts=[0,0,0,0];let callbackHits=0,losses=0;
  const p=await genuinePlayer(t,{now:null,crossPeriod:true,fullCommerce:true,fundMarketWithWork:true,
    fundingWorkBudget:240,fundingSaleItems:[67],onTick(r,before){
      assert.equal(r.details.shelfSales.reduce((sum,row)=>sum+row.count,0),r.details.naturalSaleCount);
      for(const [id,n] of Object.entries(r.details.soldByItem))sales[id]=(sales[id]??0)+n;
      if(r.details.itemTurnAffectedSlices>0){
        assert.equal(before.shops[0].showcase[0],70);
        assert.ok(before.shops[0].item[69]>0&&before.shops[0].price[0]<=50000);
        callbackHits+=r.details.itemTurnAffectedSlices;
      }
    }});
  await p.market(13);
  await p.use(79,0);await p.use(79,3);
  await trainSmith(p);await trainMagic(p);await trainAppraiser(p);
  await acquire(p,66);await acquire(p,78);await use(p,78,3);
  assert.equal(p.state.shop.job,'tool');
  const recipes=[
    {inputs:[[5,20]],gate:0,output:67,amount:20,prob:800},
    {inputs:[[6,20],[8,2]],gate:250,output:68,amount:20,prob:600},
    {inputs:[[7,20],[8,2]],gate:500,output:69,amount:20,prob:400},
    {inputs:[[5,20],[6,20],[7,20],[8,6]],gate:500,output:70,amount:1,prob:1000},
  ];
  async function craft(useId){
    const spec=recipes[useId];
    await acquire(p,66);
    for(const [id,n] of spec.inputs){
      if(id===8)await p.stones(n);else await p.ore(id,n);
    }
    await prepareTime(p,66,useId);
    if(p.exp(66)<spec.gate)return null;
    if(useId===0&&p.stock(67)>460)await p.discard(67,p.stock(67)-100);
    const {shop,d}=await use(p,66,useId);
    for(const [id,n] of spec.inputs)assert.equal(p.stock(id),shop.item[id-1]-n);
    for(const id of [18,19,24])assert.equal(p.stock(id),1);
    assert.equal(d.experienceGain,Math.min(20,1000-(shop.exp?.['66']??0)));
    const made=d.acquired.find(x=>x.itemId===spec.output);
    assert.equal(made?.attemptedCount,spec.amount);assert.equal(made?.probabilityPermille,spec.prob);
    assert.equal(p.stock(spec.output),shop.item[spec.output-1]+made.produced);
    assert.equal(p.stock(66),shop.item[65]-(d.mapDestroyed?1:0));
    if(useId===0)assert.equal(d.mapDestroyed,false);
    if(useId>=1)assert.ok(d.callbackOrder.includes('after-use'));
    if(useId===3)assert.equal(made.produced,1);
    crafts[useId]++;if(d.mapDestroyed)losses++;
    return d;
  }
  async function reach(gate){
    for(let n=0;p.exp(66)<gate;n++){
      assert.ok(n<90,'genuine accessory EXP budget '+JSON.stringify({gate,exp:p.exp(66),period:p.state.world.period.settledCount}));
      await craft(0);
      if(p.stock(67)>0)await p.list(67);
    }
  }
  // Manufacture each intermediate with its actual gate. Time procurement
  // may cross settlement and decay EXP, so re-check before sending USE.
  for(const useId of [1,2]){
    const spec=recipes[useId];
    for(let n=0;!p.stock(spec.output);n++){
      assert.ok(n<32,'actual intermediate recipe budget #'+spec.output);
      await reach(spec.gate);await craft(useId);
    }
  }
  assert.ok(crafts[0]>0);
  if(!sales[67]){
    if(!p.stock(67))await craft(0);
    await naturalSale(p,67,sales);
  }
  await naturalSale(p,68,sales);await naturalSale(p,69,sales);
  let generation=0,necklaceLoss=false;
  for(let n=0;!necklaceLoss||!callbackHits||!sales[70];n++){
    assert.ok(n<32,'genuine necklace career budget '+JSON.stringify({crafts,losses,callbackHits,sales,period:p.state.world.period.settledCount}));
    assert.equal(p.stock(70),0);
    let d=null;
    for(let attempt=0;!d;attempt++){
      assert.ok(attempt<24,'source final recipe readiness');
      await reach(500);d=await craft(3);
    }
    necklaceLoss ||= d.mapDestroyed===true;
    // First generation holds a genuinely crafted necklace before listing.
    if(generation===0){
      const first=await p.saveAndRestart(generation++);
      assert.equal(first.shops[0].item[69],1);
    }
    const listed=await list(p,70,100,sales);
    // Two minutes produces a positive integer rank gain on an eligible,
    // unsold necklace. If the shop is capped or a real sale occurs first,
    // continue normal sale/manufacture on this SAME career.
    if(listed&&p.boundary()>120){
      const before=p.state.shop,r=await p.tick(2);
      if(before.rank<10000&&r.details.naturalSaleCount===0&&p.stock(70)===1)
        assert.equal(r.details.itemTurnAffectedSlices,1);
    }
    if(p.stock(70)>0)await naturalSale(p,70,sales,576);
    assert.equal(p.stock(70),0,'one-copy item genuinely sold');
  }
  assert.ok(crafts.every(n=>n>0)&&[67,68,69,70].every(id=>sales[id]>0));
  assert.ok(necklaceLoss&&callbackHits>0);
  const last=await p.saveAndRestart(generation++);
  assert.equal(generation,2);
  assert.equal(last.shops[0].item[69],0);
  for(const id of [18,19,24])assert.equal(last.shops[0].item[id-1],1);
  t.diagnostic(JSON.stringify({crafts,sales,losses,necklaceLoss,callbackHits,revision:last.revision,fundingWorks:p.fundingWorks}));
});

test('R4 genuine #10/4-7 advanced writing from crafted equipment and learned skills, natural sales and dual v2 reload',async t=>{
  const sales={},written=[];
  const p=await genuinePlayer(t,{now:null,crossPeriod:true,fullCommerce:true,fundMarketWithWork:true,onTick(r){
    for(const [id,n] of Object.entries(r.details.soldByItem))sales[id]=(sales[id]??0)+n;
  }});
  await p.use(79,1);await p.market(13);
  await trainSmith(p);await trainMagic(p);
  const basic={40:[17,0,3,20],45:[16,0,2,24],51:[16,1,2,24],57:[17,1,3,20]};
  async function component(id){
    const [book,useId,raw,n]=basic[id];
    for(let k=0;!p.stock(id);k++){
      assert.ok(k<12,'actual component production #'+id);
      await acquire(p,book);await p.gather(raw,n);
      await use(p,book,useId);
    }
  }
  async function learnWriting(){
    for(let n=0;p.exp(10)<200;n++){
      assert.ok(n<40,'source writing EXP budget '+JSON.stringify({exp:p.exp(10),period:p.state.world.period.settledCount}));
      await acquire(p,10);await p.gather(2,50);
      if(p.stock(16)>30)await p.discard(16,p.stock(16)-1);
      const {d}=await use(p,10,1);
      assert.equal(d.experienceGain,20);
    }
  }
  await learnWriting();
  for(const [useId,output,part,skill] of [[4,20,40,18],[5,21,45,18],[6,22,51,18],[7,23,57,19]]){
    assert.equal(p.stock(output),0,'no alternative grant or market purchase of the written book');
    for(let n=0;!p.stock(output);n++){
      assert.ok(n<24,'advanced writing budget #'+output);
      await learnWriting();await acquire(p,10);await p.ore(5,20);await component(part);
      await prepareTime(p,10,useId);
      if(p.exp(10)<200)continue;
      const {shop,d}=await use(p,10,useId);
      assert.equal(p.stock(skill),shop.item[skill-1]);assert.equal(p.stock(skill),1);
      assert.equal(p.stock(part),shop.item[part-1]-1);
      assert.equal(p.stock(5),shop.item[4]-20);assert.equal(p.stock(10),shop.item[9]-1);
      const made=d.acquired.find(x=>x.itemId===output);
      assert.equal(made?.attemptedCount,5);assert.equal(made?.probabilityPermille,400);
      assert.equal(p.stock(output),shop.item[output-1]+made.produced);
      written.push({useId,output,produced:made.produced});
    }
  }
  const first=await p.saveAndRestart(0);
  for(const id of [20,21,22,23])assert.ok(first.shops[0].item[id-1]>0);
  for(const id of [20,21,22,23])await naturalSale(p,id,sales,576);
  const last=await p.saveAndRestart(1);
  assert.equal(last.shops[0].showcase[0],23);
  t.diagnostic(JSON.stringify({written,sales,first:first.revision,last:last.revision,fundingWorks:p.fundingWorks}));
});
