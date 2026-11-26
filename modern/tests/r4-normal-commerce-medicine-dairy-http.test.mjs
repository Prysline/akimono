/** Genuine source careers, real clock and server RNG. No fixture assets,
 * selected seed, deterministic tape, or restarted failed career.
 * Bounded normal acquisition, production, consumption, sales and replay. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';

async function ready(p,id,useId,count=1){
  for(let n=0;n<8;n++){
    const offer=p.quote(id,useId);
    assert.ok(offer,'source USE '+id+'/'+useId);
    if(p.remaining()>=offer.timePerUseSeconds*count)return;
    await p.enoughTime(offer.timePerUseSeconds*count);
  }
  assert.fail('source time quote did not converge '+id+'/'+useId);
}
async function checkedUse(p,id,useId,count=1){
  await ready(p,id,useId,count);
  const before=p.state.world,shop=before.shops[0],offer=p.quote(id,useId);
  const request={expectedRevision:before.revision,itemId:id,useId,requestedCount:count};
  const r=await p.use(id,useId,count),d=r.details,after=p.state.world;
  assert.equal(after.revision,before.revision+1);
  assert.equal(after.nowSeconds,before.nowSeconds);
  assert.equal(d.effectiveCount,count);
  assert.equal(d.timeSpentSeconds,offer.timePerUseSeconds*count);
  assert.equal(p.state.shop.time,Math.max(shop.time,before.nowSeconds-259200)+d.timeSpentSeconds);
  assert.equal(p.state.shop.money,shop.money-d.moneySpent);
  assert.equal(p.state.shop.paytoday,shop.paytoday+d.moneySpent);
  const expected=[...shop.item];
  for(const [item,n] of d.originalUseItem)expected[item-1]-=n;
  for(const [item,n] of d.originalAddItem)expected[item-1]+=n;
  assert.deepEqual(p.state.shop.item,expected,'source receipt reconciles all 79 holdings');
  const rows=(d.originalInlineLogCalls??[]).map(row=>[after.nowSeconds,...row].join('\t')+'\n').reverse().join('');
  if(rows)assert.ok(after.period.disk.live['log0.cgi'].bytes.startsWith(rows),'source callback log order');
  else if(!Object.hasOwn(d,'originalInlineLogCalls'))assert.ok(after.period.disk.live['log0.cgi'].bytes.startsWith([after.nowSeconds,0,1,'local use-item'].join('\t')+'\n'));
  return {shop,before,after,d,request};
}
async function stale(p,request){
  const before=p.state.world,history=p.state.historyCommands,checkpoint=p.state.historyCheckpointRevision;
  const r=await p.post('/api/use',request);
  assert.equal(r.status,409);assert.equal(r.code,'REVISION_CONFLICT');
  assert.deepEqual(p.state.world,before);
  assert.equal(p.state.historyCommands,history);assert.equal(p.state.historyCheckpointRevision,checkpoint);
}
async function sellOne(p,id,hours=144){
  await p.enoughTime(600);
  assert.ok(p.stock(id)>0,'genuine manufactured stock #'+id);
  const listed=await p.post('/api/showcase',{expectedRevision:p.state.world.revision,itemId:id,shelf:0,per:10});
  assert.equal(listed.code,'COMMITTED',JSON.stringify(listed.details??listed.error));
  assert.equal(p.state.shop.showcase[0],id);
  let sold=0,losses=0;
  for(let n=0;n<hours&&!sold&&p.stock(id)>0;n++){
    const shop=p.state.shop,r=await p.tick(60),d=r.details;
    assert.equal(Object.values(d.soldByItem).reduce((a,b)=>a+b,0),d.naturalSaleCount);
    const trace=d.sourceTrace,logs=trace.slices?trace.slices.flatMap(x=>x.logs):trace.logs;
    const value=logs.reduce((total,row)=>{
      const m=String(row[2]).match(/(?:被偷了|被搶了)相當於總額(\d+)的商品。/);
      return total+(m?Number(m[1]):0);
    },0);
    assert.equal(value%shop.price[0],0);
    const lost=value/shop.price[0],quantity=d.soldByItem[id]??0;
    assert.equal(p.stock(id),shop.item[id-1]-quantity-lost,'natural sale is separate from event loss');
    sold+=quantity;losses+=lost;
    if(!sold&&n%24===23)await p.use(13,0);
  }
  assert.ok(sold>0,'bounded natural sale '+JSON.stringify({id,hours,sold,losses,held:p.stock(id),period:p.state.world.period.settledCount}));
  return {id,sold,losses};
}

test('R4 genuine medicine #15 all five recipes, #30-34 natural sales and two v2 generations',async t=>{
  const p=await genuinePlayer(t,{now:null,crossPeriod:true,fullCommerce:true,fundMarketWithWork:true});
  await p.use(79,1);
  assert.equal(p.stock(15),1);
  await p.market(13);
  const recipes=[
    {inputs:[[1,10]],output:30,gate:0,amount:20,prob:800},
    {inputs:[[30,10]],output:31,gate:200,amount:20,prob:800},
    {inputs:[[1,20]],output:32,gate:200,amount:20,prob:640},
    {inputs:[[32,10]],output:33,gate:400,amount:10,prob:900},
    {inputs:[[31,10],[33,10]],output:34,gate:600,amount:5,prob:1000},
  ];
  const counts=[0,0,0,0,0];let losses=0,last;
  await p.deny(15,4);
  async function craft(useId){
    const spec=recipes[useId];
    if(!p.stock(15)){
      if(p.stock(79)>=5)await p.use(79,1);
      else await p.market(15);
    }
    for(const [id,n] of spec.inputs)if(id===1)await p.gather(1,n);
    await ready(p,15,useId);
    if(p.exp(15)<spec.gate||spec.inputs.some(([id,n])=>p.stock(id)<n))return false;
    const r=await checkedUse(p,15,useId),{shop,d}=r;
    const exp=shop.exp?.['15']??0;
    assert.equal(d.experienceGain,Math.min(20,1000-exp));
    assert.equal(p.exp(15),Math.min(1000,exp+20));
    const inputs=spec.inputs.map(x=>[...x]);
    if(d.mapDestroyed)inputs.push([15,1]);
    assert.deepEqual(d.originalUseItem,inputs);
    if([0,2].includes(useId))assert.equal(d.mapDestroyed,false);
    assert.equal(p.stock(15),shop.item[14]-(d.mapDestroyed?1:0));
    const generated=d.acquired.find(x=>x.itemId===spec.output);
    assert.equal(generated?.attemptedCount,spec.amount);
    assert.equal(generated?.probabilityPermille,spec.prob);
    const added=d.originalAddItem.find(([id])=>id===spec.output)?.[1]??0;
    assert.equal(added,generated.produced);
    assert.equal(p.stock(spec.output),shop.item[spec.output-1]+added);
    if(useId===4)assert.equal(added,5);
    counts[useId]++;if(d.mapDestroyed)losses++;
    last=r;
    return true;
  }
  // Stock only crafted goods, not wholesale substitutes. Keep reserves
  // for each intermediate's separate natural sale after the final recipe.
  for(let n=0;!p.stock(34)&&n<120;n++){
    const e=p.exp(15),s=id=>p.stock(id);
    let recipe=0;
    if(e>=600&&s(31)>=11&&s(33)>=11&&s(30)>0&&s(32)>0)recipe=4;
    else if(e>=400&&s(33)<11&&s(32)>=11)recipe=3;
    else if(e>=200&&s(31)<11&&s(30)>=11)recipe=1;
    else if(e>=200&&(s(32)<11||s(33)<11))recipe=2;
    if(!await craft(recipe))await craft(0);
  }
  assert.ok(counts.every(n=>n>0)&&p.stock(34)===5&&[30,31,32,33].every(id=>p.stock(id)>0),
    'bounded genuine production '+JSON.stringify({counts,losses,exp:p.exp(15),held:[30,31,32,33,34].map(id=>p.stock(id)),period:p.state.world.period.settledCount}));
  await stale(p,last.request);
  const first=await p.saveAndRestart(0);
  assert.equal(first.shops[0].item[33],5);
  const sales=[];
  for(const id of [30,31,32,33,34])sales.push(await sellOne(p,id));
  const second=await p.saveAndRestart(1);
  assert.equal(second.shops[0].showcase[0],34);
  t.diagnostic(JSON.stringify({counts,losses,sales,first:first.revision,second:second.revision,fundingWorks:p.fundingWorks}));
});

test('R4 genuine dairy #25-26 all USEs, #35-36 consumption, natural sales and two v2 generations',async t=>{
  const prizes=[];
  const p=await genuinePlayer(t,{now:null,crossPeriod:true,fullCommerce:true,fundMarketWithWork:true,onTick(r){
    const prize=r.details.settlementReceipt?.prize;
    if(prize?.itemId===79)prizes.push(prize);
  }});
  await p.market(13);
  await p.market(78);
  await checkedUse(p,78,11);
  assert.equal(p.state.shop.job,'cow');assert.equal(p.stock(78),0);
  const firstPeriod=p.state.world.period.settledCount;
  let cowExchanges=0;
  // Source wholesale inventory is limited independently of the holding
  // cap. Use initial and actual settlement-awarded vouchers for the herd.
  async function herd(target){
    for(let n=0;p.stock(25)<target;n++){
      assert.ok(n<150&&p.state.world.period.settledCount-firstPeriod<48,
        'bounded genuine herd '+JSON.stringify({cows:p.stock(25),vouchers:p.stock(79),prizes,cowExchanges,period:p.state.world.period.settledCount}));
      if(p.stock(79)){
        const old=p.stock(25);
        await checkedUse(p,79,4);
        assert.equal(p.stock(25),old+1);
        cowExchanges++;
      }else{
        // Four-hour paid work and a normal one-hour advance keep the
        // owner active while waiting for the source rank prize.
        await p.use(13,1);
        await p.tick(60);
      }
    }
  }
  await herd(12);
  assert.ok(cowExchanges>=12&&prizes.some(x=>x.granted>0));
  const milkCounts=[0,0];let deaths=0;
  async function milk(useId,count){
    await herd(12);
    const {shop,d}=await checkedUse(p,25,useId,count);
    const beforeExp=shop.exp?.['25']??0;
    const produced=d.originalAddItem.find(([id])=>id===26)?.[1];
    const dead=d.originalUseItem.find(([id])=>id===25)?.[1]??0;
    assert.ok(produced>=1&&produced<=(useId+1)*count*shop.item[24]);
    assert.ok(dead>=0&&dead<=count);
    assert.equal(p.stock(25),shop.item[24]-dead);
    assert.equal(p.stock(26),shop.item[25]+produced);
    assert.equal(d.randomDrawsUsed,count+1);
    assert.equal(d.timeSpentSeconds,2400*count);
    assert.equal(d.experienceGain,Math.min(10*count,1000-beforeExp));
    assert.equal(p.exp(25),Math.min(1000,beforeExp+10*count));
    assert.deepEqual(d.originalInlineLogCalls,[[0,shop.id,'精製了'+produced+'瓶米諾牛乳']]);
    milkCounts[useId]+=count;deaths+=dead;
  }
  await milk(0,1);
  await milk(1,3);
  for(let n=0;p.stock(26)<111&&n<30;n++)await milk(1,3);
  assert.ok(p.stock(26)>=111,'bounded actual milk production');
  // All three original drinking branches, using actual produced milk.
  for(const count of [1,10,30]){
    const {shop,d}=await checkedUse(p,26,0,count);
    assert.equal(p.stock(26),shop.item[25]-count);
    assert.equal(d.randomDrawsUsed,count<10?1:0);
    if(count===1)assert.ok([Math.min(10000,shop.rank+1),Math.min(10000,shop.rank+2)].includes(p.state.shop.rank));
    else assert.equal(p.state.shop.rank,count===10?shop.rank:Math.max(0,shop.rank-60));
  }
  await herd(12);
  for(const [useId,output,amount,uses] of [[1,35,2,1],[2,36,1,2]]){
    for(let n=0;n<uses;n++){
      const {shop,d}=await checkedUse(p,26,useId);
      assert.equal(p.stock(26),shop.item[25]-15);
      assert.equal(p.stock(25),shop.item[24]);
      assert.equal(p.stock(output),shop.item[output-1]+amount);
      assert.deepEqual(d.originalAddItem,[[output,amount]]);
    }
    const eaten=await checkedUse(p,output,0);
    assert.deepEqual(eaten.d.originalUseItem,[[output,1]]);
    assert.equal(p.stock(output),eaten.shop.item[output-1]-1);
    await stale(p,eaten.request);
  }
  assert.ok([25,26,35,36].every(id=>p.stock(id)>0));
  const first=await p.saveAndRestart(0);
  assert.equal(first.shops[0].job,'cow');
  const sales=[];
  for(const id of [35,36,26,25])sales.push(await sellOne(p,id));
  const second=await p.saveAndRestart(1);
  assert.equal(second.shops[0].job,'cow');assert.equal(second.shops[0].showcase[0],25);
  t.diagnostic(JSON.stringify({cowExchanges,prizes:prizes.length,milkCounts,deaths,sales,first:first.revision,second:second.revision}));
});
