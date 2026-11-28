/** R4 acquisition milestone, NOT a successful palace mission proof.
 * Start an actual local player from the server clock and fresh save directory.
 * Use only the existing source HTTP commands, server RNG and normal time.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';

const MATERIAL=3,MAP=12,BOOK=17,STAFF=57;
// Source #40 has no FUNCTURN and no positive PLUS for player holdings.
// inc-turn processes natural sale before settlement and EVENT in each slice.
// Source manbiki/goutou STARTFUNC remove floor(stock/10) or floor(stock/4)
// from the showcased item, without recording a natural sale. Reconstruct
// every slice independently from the sales ledger and ordered EVENT logs,
// checking the monetary equivalent, not accepting an unexplained delta.
const SWORD=40;
function accountSwordTick(before,result){
  const shop=before.shops[0],after=result.state.shop,d=result.details;
  const total=d.naturalSaleCount,trace=d.sourceTrace;
  assert.ok(Number.isSafeInteger(total)&&total>=0);
  assert.equal(shop.showcasecount,1);
  let robots=shop.item[63];
  assert.deepEqual(after.showcase,shop.showcase);
  assert.deepEqual(after.price,shop.price);
  const listed=shop.showcase[0]===SWORD;
  if(!listed){
    assert.equal(shop.showcase[0],0,'only this path\'s sword may be displayed');
    assert.equal(total,0);
  }
  const crossing=Boolean(d.settlementReceipt);
  const slices=trace.slices??[{dateupdate:0,logs:trace.logs}];
  assert.ok(slices.length>=1&&slices.length<=2);
  assert.equal(slices[0].dateupdate,crossing?1:0);
  if(slices.length===2)assert.equal(slices[1].dateupdate,0);
  const first=crossing?d.settlementReceipt.naturalSaleCount:total;
  assert.ok(Number.isSafeInteger(first)&&first>=0&&first<=total);
  if(slices.length===1)assert.equal(first,total);
  if(crossing){
    if(first>0)assert.equal(d.settlementReceipt.soldItemId,SWORD);
    assert.equal(after.itemyesterday?.[SWORD]??0,(shop.itemtoday?.[SWORD]??0)+first);
    assert.equal(after.itemtoday?.[SWORD]??0,total-first);
  }else{
    assert.equal(after.itemtoday?.[SWORD]??0,(shop.itemtoday?.[SWORD]??0)+total);
  }
  let expected=shop.item[SWORD-1],lost=0;
  for(const [i,slice] of slices.entries()){
    const sold=i===0?first:total-first;
    assert.ok(sold<=expected,'natural sales cannot exceed slice stock');
    expected-=sold;
    if(slice.dateupdate===1){
      const prize=d.settlementReceipt.prize;
      if(prize?.itemId===64){
        assert.equal(prize.stockBefore,robots);
        assert.equal(prize.granted,Math.min(1,1-robots));
        robots+=prize.granted;
        assert.equal(prize.stockAfter,robots);
      }
      assert.notEqual(prize?.itemId,SWORD,'#40 is not a source top prize');
    }
    assert.ok(Array.isArray(slice.logs));
    for(const [, ,message] of slice.logs){
      assert.equal(typeof message,'string');
      const blocked=message===shop.shopname+'有人企圖入室行竊，但被制止了。';
      const broken=message===shop.shopname+'有人企圖入室行竊，看門機器人被破壊了。'||
        message===shop.shopname+'有強盜闖入，看門機器人被破壞了。';
      if(blocked||broken){
        assert.ok(robots>0,'source robot protection requires real stock');
        if(broken)robots--;
        continue;
      }
      if(!listed)continue;
      const stolen=message.startsWith(shop.shopname+'被偷了相當於總額');
      const robbed=message.startsWith(shop.shopname+'被搶了相當於總額');
      const emptyTheft=message==='闖入'+shop.shopname+'的小偷什麼都沒拿就逃走了。';
      const emptyRobbery=message==='闖入'+shop.shopname+'的強盜什麼都沒拿就逃走了。';
      if(!stolen&&!robbed&&!emptyTheft&&!emptyRobbery)continue;
      assert.equal(robots,0,'source unprotected theft requires no guard robot');
      const count=Math.trunc(expected/((stolen||emptyTheft)?10:4));
      if(emptyTheft||emptyRobbery)assert.equal(count,0);
      else{
        assert.ok(count>0&&shop.price[0]>0);
        assert.equal(message,shop.shopname+(stolen?'被偷了相當於總額':'被搶了相當於總額')+count*shop.price[0]+'的商品。');
      }
      expected-=count;lost+=count;
    }
  }
  assert.equal(after.item[63],robots,'source guard robot prize/loss accounting');
  assert.equal(after.item[SWORD-1],expected,'unexplained #40 stock delta: '+JSON.stringify({
    revision:before.revision,before:shop.item[SWORD-1],sold:total,lost,
    after:after.item[SWORD-1],settlement:d.settlementReceipt,trace
  }));
  return {sold:total,lost};
}

// Isolated receipt-accounting regression; not a genuine player achievement.
// Reproduce the observed arithmetic and reject an incorrect event amount or
// unexplained loss. A two-slice case also checks the split sale ledger.
test('R4 sword accounting separates source EVENT loss from sales and settlement',()=>{
  const shop={shopname:'帳本測試',showcasecount:1,showcase:[SWORD],price:[1200],item:Array(79).fill(0),itemtoday:{40:3}};
  shop.item[SWORD-1]=18;
  const before={revision:1,shops:[shop]};
  const after=structuredClone(shop);
  after.item[SWORD-1]=12;after.itemtoday={40:5};
  const result={state:{shop:after},details:{naturalSaleCount:2,settlementReceipt:null,sourceTrace:{logs:[[2,0,'帳本測試被搶了相當於總額4800的商品。']]}}};
  assert.deepEqual(accountSwordTick(before,result),{sold:2,lost:4});
  result.details.sourceTrace.logs[0][2]='帳本測試被搶了相當於總額3600的商品。';
  assert.throws(()=>accountSwordTick(before,result),assert.AssertionError);
  result.details.sourceTrace.logs=[];
  assert.throws(()=>accountSwordTick(before,result),/unexplained #40 stock delta/);
  result.details={naturalSaleCount:4,settlementReceipt:{naturalSaleCount:2,soldItemId:SWORD},sourceTrace:{slices:[
    {dateupdate:1,logs:[[2,0,'帳本測試被搶了相當於總額4800的商品。']]},
    {dateupdate:0,logs:[[2,0,'帳本測試被偷了相當於總額1200的商品。']]}
  ]}};
  after.item[SWORD-1]=9;after.itemyesterday={40:5};after.itemtoday={40:2};
  assert.deepEqual(accountSwordTick(before,result),{sold:4,lost:5});
  // A real boundary can award #64 before EVENT, so protection must not
  // assume that a player starting without a robot can never acquire one.
  result.details.settlementReceipt.prize={itemId:64,stockBefore:0,granted:1,stockAfter:1};
  result.details.sourceTrace.slices[0].logs=[[2,0,'帳本測試有強盜闖入，看門機器人被破壞了。']];
  after.item[SWORD-1]=13;
  assert.deepEqual(accountSwordTick(before,result),{sold:4,lost:1});
});
function diagnostic(p){
  const s=p.state.shop;
  return JSON.stringify({period:p.state.world.period.settledCount,
    revision:p.state.world.revision,point:p.state.shopSummary.point,
    rank:s.rank,money:s.money,branches:p.stock(MATERIAL),staff:p.stock(STAFF),
    woodExp:p.exp(BOOK),gatherExp:p.exp(MAP)});
}
test('R4 genuine player acquires 300 wooden staffs via forest and woodcraft, then v2 save/restart (acquisition only)',async t=>{
  let totalSales=0,eventLoss=0;
  const p=await genuinePlayer(t,{crossPeriod:true,now:null,onTick:(result,before)=>{
    const {sold,lost}=accountSwordTick(before,result);
    totalSales+=sold;eventLoss+=lost;
    if(lost)t.diagnostic('R4 source #40 EVENT loss '+JSON.stringify({
      revision:before.revision,sold,lost,trace:result.details.sourceTrace
    }));
  }});
  const born=p.state.world;
  assert.equal(p.stock(STAFF),0);
  assert.equal(p.stock(MATERIAL),0);
  assert.equal(p.stock(BOOK),0);
  assert.equal(p.stock(MAP),0);
  assert.equal(p.state.shop.dignity,0);
  assert.equal(p.state.palace.index,0);
  assert.deepEqual(born.period.disk.townData,{});
  // Normal starter gift: two vouchers exchanged for actual maps.
  await p.use(79,0);
  assert.equal(p.stock(MAP),1);
  await p.market(BOOK);
  assert.equal(p.stock(BOOK),1);
  let produced=0,branchesUsed=0;
  for(let attempt=0;p.stock(STAFF)<300;attempt++){
    assert.ok(attempt<48,'source staff craft budget exhausted '+diagnostic(p));
    await p.gather(MATERIAL,20);
    assert.ok(p.stock(MATERIAL)>=20);
    const beforeStaff=p.stock(STAFF),beforeBranches=p.stock(MATERIAL);
    const result=await p.use(BOOK,1);
    const receipt=result.details;
    assert.equal(receipt.sourceUseItemId,BOOK);
    assert.equal(receipt.useNo,1);
    assert.equal(receipt.effectiveCount,1);
    assert.deepEqual(receipt.originalUseItem.find(([id])=>id===MATERIAL),[MATERIAL,20]);
    assert.equal(p.stock(MATERIAL),beforeBranches-20);
    assert.equal(p.stock(BOOK),1,'source woodcraft book is retained');
    const output=receipt.acquired.find(row=>row.itemId===STAFF);
    assert.ok(output,'source MakeAmount receipt for wooden staff');
    assert.equal(output.attemptedCount,20);
    assert.ok(Number.isSafeInteger(output.produced)&&output.produced>=0);
    assert.equal(p.stock(STAFF)-beforeStaff,output.produced);
    produced+=output.produced;branchesUsed+=20;
    assert.equal(p.stock(STAFF),produced,'all held staffs are genuine craft outputs');
  }
  assert.ok(produced>=300&&produced<=600);
  assert.ok(branchesUsed>=300);
  assert.ok(p.exp(BOOK)>0&&p.exp(MAP)>0);
  assert.equal(p.state.shop.dignity,0);
  assert.equal(p.state.palace.owned,produced);
  assert.equal(p.state.palace.requiredPoint,20000);
  assert.equal(p.state.palace.point,p.state.shopSummary.point);
  assert.equal(p.state.palace.canComplete,p.state.palace.point>=20000);
  // No gate bypass. This is a legal acquisition checkpoint, not a forced
  // grant of dignity and not a claim that the score requirement is met.
  assert.deepEqual(p.state.world.period.disk.townData,{});
  const snapshot=await p.saveAndRestart(0);
  assert.equal(snapshot.shops[0].item[STAFF-1],produced);
  assert.equal(p.state.palace.owned,produced);
  assert.equal(p.state.palace.dignity,0);
  assert.deepEqual(snapshot.period.disk.townData,{});
  assert.equal(snapshot.period.disk.live['play.cgi'].bytes.split('\n')[4],'');
  t.diagnostic('R4 real craft acquisition: '+branchesUsed+' branches consumed, '+produced+
    ' staffs retained; '+diagnostic(p)+'; palace completion not attempted');
  // Second milestone: actual normal commerce in the same world, while all
  // mission staffs remain reserved. Sell independently crafted wood swords.
  // A bounded observation is not a proof of reaching the palace threshold.
  const economyStart=p.state.world;
  const targetPeriod=economyStart.period.settledCount+1;
  let crafts=0,turns=0,maxPoint=p.state.palace.point;
  const observe=()=>{maxPoint=Math.max(maxPoint,p.state.palace.point);
    assert.equal(p.stock(STAFF),produced,'mission stock never listed or sold');
    assert.equal(p.state.palace.point,p.state.shopSummary.point);
    assert.equal(p.state.shop.dignity,0);};
  while(p.state.world.period.settledCount<targetPeriod||totalSales===0){
    assert.ok(++turns<=100,'source commerce budget '+diagnostic(p));
    if(p.stock(SWORD)<12){
      await p.gather(MATERIAL,20);
      for(let n=0;;n++){
        const offer=p.quote(BOOK,0);
        assert.ok(offer&&n<8,'source wood sword quote');
        if(p.remaining()>=offer.timePerUseSeconds)break;
        await p.enoughTime(offer.timePerUseSeconds);
      }
      const before=p.stock(SWORD);
      const made=await p.use(BOOK,0);
      assert.equal(made.details.sourceUseItemId,BOOK);
      assert.equal(made.details.useNo,0);
      assert.equal(p.stock(SWORD)-before,made.details.acquired.find(x=>x.itemId===SWORD).produced);
      crafts++;
    }
    if(p.stock(SWORD)>0){
      await p.list(SWORD);
      // onTick also checks implicit waits during gather/use/list, not only
      // the explicit tick here. Natural sales and EVENT losses stay distinct.
      await p.tick(Math.min(60,Math.max(1,Math.ceil(p.boundary()/60))));
    }else await p.tick(10);
    observe();
  }
  assert.ok(crafts>0&&totalSales>0);
  assert.ok(p.state.world.period.settledCount>economyStart.period.settledCount);
  const second=await p.saveAndRestart(1);
  assert.equal(second.shops[0].item[STAFF-1],produced);
  assert.equal(second.shops[0].dignity,0);
  assert.deepEqual(second.period.disk.townData,{});
  t.diagnostic('R4 economy observation (not 20,000-point acceptance): sword crafts='+crafts+
    ', directly observed sales='+totalSales+', source EVENT sword losses='+eventLoss+', maximum observed point='+maxPoint+
    ', '+diagnostic(p));
});
