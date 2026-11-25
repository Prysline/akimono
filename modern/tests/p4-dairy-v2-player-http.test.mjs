/** P4 candidate: fresh real-clock player, server RNG, source market and reviewed time.
 * All positive stock/EXP/cash/clock changes come from HTTP/CAS. The last
 * operation is deliberately a negative disk forgery, never an acquisition.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';
import {inspectDairyCheckpoint} from './support/p4-dairy-proof.mjs';

// Original whole.cgi::CheckWholeStore counts held cows against the
// single-shop wholesale total int(1.5+0.99)=2. Buy market cows FIRST.
// Beyond this street cap, use real #79 vouchers, including period prizes.
async function maintainCows(p,target,observed){
  await p.list(0);
  for(let n=0;p.stock(25)<target;n++){
    assert.ok(n<32,'bounded legal replacement');
    if(!p.stock(79)){
      // Earn vouchers through the existing reviewed rank-one settlement.
      // Keep selling legitimately produced milk to pay upkeep while waiting.
      for(let h=0;!p.stock(79);h++){
        assert.ok(h<432,'bounded real period prize acquisition');
        if(p.stock(25)>0&&p.stock(26)<30){
          const count=Math.min(6,Math.floor(p.remaining()/p.quote(25,1).timePerUseSeconds));
          if(count>0){
            const result=await p.use(25,1,count);
            observed.deaths+=result.details.originalUseItem.find(row=>row[0]===25)?.[1]??0;
          }
        }
        if(p.stock(26)>0&&p.state.shop.showcase[0]!==26&&p.remaining()>=p.state.showcaseEditTimeSeconds)
          await p.list(26);
        const before=p.state.world;
        const r=await p.tick(60);
        const s=r.details.settlementReceipt;
        if(s){
          assert.equal(s.cashAfterLedger,s.cashBeforeLedger-s.maintenance);
          assert.equal(p.state.shop.costyesterday,s.maintenance);
          assert.equal(s.prize.stockAfter-s.prize.stockBefore,s.prize.granted);
          if(s.prize.itemId===79)assert.equal(p.stock(79),before.shops[0].item[78]+s.prize.granted);
        }
      }
      await p.list(0);
    }
    const count=Math.min(target-p.stock(25),p.stock(79));
    const before=p.stock(25);
    await p.use(79,4,count);
    assert.equal(p.stock(25),before+count);
    observed.giftCows+=count;
  }
  assert.equal(p.stock(25),target,'actual cow ownership, not a fixture');
}

async function milkTo(p,target,cows,level,observed){
  await maintainCows(p,cows,observed);
  for(let n=0;p.stock(26)<target;n++){
    assert.ok(n<60,'bounded real milk acquisition: '+JSON.stringify({
      target,milk:p.stock(26),cows:p.stock(25),money:p.state.shop.money,
    }));
    const count=3;
    await p.enoughTime(p.quote(25,level).timePerUseSeconds*count);
    const before=p.state.shop;
    const clock=p.quote(25,level).timePerUseSeconds;
    const now=p.state.world.nowSeconds;
    const result=await p.use(25,level,count);
    const added=result.details.originalAddItem.find(row=>row[0]===26)?.[1]??0;
    const deaths=result.details.originalUseItem.find(row=>row[0]===25)?.[1]??0;
    assert.ok(added>=1&&added<=(level+1)*count*before.item[24]);
    assert.ok(deaths>=0&&deaths<=Math.min(count,before.item[24]));
    assert.equal(p.stock(26),before.item[25]+added);
    assert.equal(p.stock(25),before.item[24]-deaths);
    assert.equal(p.exp(25),Math.min(1000,(before.exp?.['25']??0)+count*10));
    assert.equal(p.state.shop.time,Math.max(before.time,now-259200)+clock*count);
    assert.equal(result.details.randomDrawsUsed,count+1);
    observed.deaths+=deaths;
    await maintainCows(p,cows,observed);
  }
}

async function ferment(p,useId,cows){
  await p.enoughTime(p.quote(26,useId).timePerUseSeconds);
  const milk=p.stock(26),before=p.stock(useId===1?35:36);
  assert.ok(milk>=15);
  assert.equal(p.stock(25),cows);
  await p.use(26,useId);
  assert.equal(p.stock(25),cows,'NEED cattle must not be consumed');
  assert.equal(p.stock(26),milk-15);
  assert.equal(p.stock(useId===1?35:36),before+(useId===1?2:1));
}

async function eat(p,id){
  const count=p.stock(id);
  assert.ok(count>0);
  await p.use(id,0);
  assert.equal(p.stock(id),count-1);
}

async function drink(p,count){
  await p.enoughTime(p.quote(26,0).timePerUseSeconds*count);
  const rank=p.state.shop.rank,milk=p.stock(26);
  assert.ok(milk>=count);
  const result=await p.use(26,0,count);
  assert.equal(p.stock(26),milk-count);
  if(count<10){
    assert.ok(p.state.shop.rank>=Math.min(10000,rank+count));
    assert.ok(p.state.shop.rank<=Math.min(10000,rank+count*2));
    assert.equal(result.details.randomDrawsUsed,1);
  }else{
    assert.equal(p.state.shop.rank,count<30?rank:Math.max(0,rank-count*2));
    assert.equal(result.details.randomDrawsUsed,0);
  }
}

async function sell(p,id){
  assert.ok(p.stock(id)>0);
  await p.list(id);
  for(let n=0;n<36;n++){
    const before=p.state.shop;
    const period=p.state.world.period.settledCount;
    const result=await p.tick(60);
    const sold=result.details.naturalSaleCount;
    if(sold>0){
      assert.ok(sold<=before.item[id-1]);
      assert.ok(before.item[id-1]-p.stock(id)>=sold,
        'source sale and possible reviewed EVENT losses');
      if(p.state.world.period.settledCount===period){
        assert.equal((p.state.shop.itemtoday[id]??0)-(before.itemtoday[id]??0),sold);
        assert.equal(p.state.shop.saletoday-before.saletoday,sold*before.price[0]);
      }
      await p.list(0);
      return sold;
    }
    assert.ok(p.stock(id)>0,'no source sale receipt before stock vanished');
  }
  assert.fail('bounded real natural sale not observed #'+id);
}

async function maintenance(p){
  await p.list(0);
  if(p.boundary()<=60)await p.tick(1);
  const before=p.state.shop;
  const dairyCosts={25:1000,26:50,35:100,36:200};
  const daily=before.item.reduce((sum,count,i)=>{
    if(!count)return sum;
    const entry=p.state.itemCatalog.find(row=>row.itemId===i+1);
    assert.ok(entry,'source catalog for held stock');
    const cost=entry.costRaw===null||entry.costRaw===undefined||entry.costRaw===''?
      Math.trunc(entry.basePrice/10):Number(entry.costRaw);
    assert.ok(Number.isSafeInteger(cost)&&cost>=0);
    if(Object.hasOwn(dairyCosts,i+1))assert.equal(cost,dairyCosts[i+1]);
    return sum+count*cost;
  },0);
  const period=p.state.world.period.settledCount;
  await p.tick(1);
  assert.equal(p.state.world.period.settledCount,period);
  assert.ok(Math.abs(p.state.shop.costtoday-before.costtoday-daily/1440)<1e-7,
    'frozen inc-turn cost accrual on held stock, empty shelf');
}

test('P4 real-clock dairy: ten legal cows, seven USEs, reviewed sale, two v2 saves and checkpoint replay',async t=>{
  const observed={deaths:0,giftCows:0,prizeVouchers:0,marketCows:0,settlements:0};
  const p=await genuinePlayer(t,{now:null,crossPeriod:true,
    onTick(r,before){
      const s=r.details.settlementReceipt;
      if(!s)return;
      observed.settlements++;
      assert.equal(s.cashAfterLedger,s.cashBeforeLedger-s.maintenance);
      assert.equal(r.state.shop.costyesterday,s.maintenance);
      assert.equal(s.prize.stockAfter-s.prize.stockBefore,s.prize.granted);
      if(s.prize.itemId===79){
        observed.prizeVouchers+=s.prize.granted;
        assert.equal(r.state.shop.item[78],before.shops[0].item[78]+s.prize.granted);
      }
    },
    onPurchase(r,before,offer){
      const d=r.details,old=before.shops[0],after=r.state.shop;
      assert.equal(d.unitPrice,offer.price);
      assert.equal(d.totalPaid,d.purchasedCount*offer.price);
      assert.equal(d.timeConsumedSeconds,offer.timeSeconds);
      assert.equal(after.money,old.money-d.totalPaid);
      assert.equal(after.paytoday,old.paytoday+d.totalPaid);
      assert.equal(after.item[d.itemId-1],old.item[d.itemId-1]+d.purchasedCount);
      assert.equal(r.state.world.market.wholesale[d.itemId-1],offer.marketStock-d.purchasedCount);
      assert.equal(after.time,Math.max(old.time,before.nowSeconds-259200)+offer.timeSeconds);
      assert.equal(r.state.world.revision,before.revision+1);
      if(d.itemId===25)observed.marketCows+=d.purchasedCount;
    }
  });
  assert.equal(p.state.shop.money,100000);
  assert.equal(p.stock(25),0);
  assert.equal(p.stock(79),5);
  await p.deny(25,0);
  await p.deny(25,1);
  // Before redeeming any vouchers, legally purchase the full two-cow
  // single-shop street cap using real PLUS, market quote and CAS.
  await p.market(25,2,{partial:true});
  assert.equal(p.stock(25),2);
  await p.tick(60);
  assert.equal(p.state.world.market.wholesale[24],0);
  const beforeBlocked=p.state.world;
  const blocked=await p.post('/api/buy',{expectedRevision:beforeBlocked.revision,
    itemId:25,requestedCount:1,marketShelf:0,expectedPrice:10000});
  assert.equal(blocked.ok,false);
  assert.deepEqual(p.state.world,beforeBlocked);
  await maintainCows(p,4,observed);
  assert.equal(p.quote(25,0).timePerUseSeconds,3600);
  await milkTo(p,15,4,0,observed);
  await p.enoughTime(p.quote(26,1).timePerUseSeconds);
  await p.deny(26,1);
  await maintainCows(p,5,observed);
  await milkTo(p,30,5,1,observed);
  await p.enoughTime(p.quote(26,2).timePerUseSeconds);
  await p.deny(26,2);
  await p.market(78);
  await p.use(78,11);
  assert.equal(p.state.shop.job,'cow');
  assert.equal(p.quote(25,0).timePerUseSeconds,2400);
  assert.equal(p.stock(78),0);
  await ferment(p,1,5);
  await maintainCows(p,9,observed);
  await milkTo(p,15,9,1,observed);
  await p.enoughTime(p.quote(26,2).timePerUseSeconds);
  await p.deny(26,2);
  await maintainCows(p,10,observed);
  assert.equal(observed.marketCows,2);
  assert.ok(observed.giftCows>=8&&observed.prizeVouchers>=3,'at least three real rank prize vouchers beyond the initial five');
  assert.ok(p.state.world.period.settledCount>0,'genuine rank-prize settlements');
  await milkTo(p,31,10,1,observed);
  await ferment(p,2,10);
  assert.ok(p.stock(35)>0&&p.stock(36)>0&&p.stock(26)>0&&p.exp(25)>0);
  await maintenance(p);
  const first=await p.saveAndRestart(0);
  assert.equal(p.stock(25),10);
  assert.equal(p.state.shop.job,'cow');
  assert.ok(p.stock(35)>0&&p.stock(36)>0);
  // Both products are used and produced again after a real Node restart.
  await eat(p,35);
  await eat(p,36);
  await milkTo(p,71,10,0,observed);
  await drink(p,1);await drink(p,10);await drink(p,30);
  await ferment(p,1,10);await ferment(p,2,10);
  if(p.stock(26)>14)await p.discard(26,p.stock(26)-14);
  await p.enoughTime(p.quote(26,2).timePerUseSeconds);
  await p.deny(26,1);await p.deny(26,2);
  await milkTo(p,30,10,1,observed);
  const sales={26:await sell(p,26),35:await sell(p,35),36:await sell(p,36),25:await sell(p,25)};
  await maintainCows(p,10,observed);
  // Real ordinary discard commands, not inserted history or fake stock.
  // Force a checkpoint through the same shared P3 source replay path.
  await milkTo(p,160,10,1,observed);
  const prior=p.state.historyCheckpointRevision;
  for(let i=0;i<129;i++)await p.discard(26,1);
  assert.ok(Number.isSafeInteger(p.state.historyCheckpointRevision));
  assert.ok(prior===null||p.state.historyCheckpointRevision>prior);
  await milkTo(p,31,10,1,observed);
  await ferment(p,1,10);await ferment(p,2,10);
  await p.deny(25,0,{requestedCount:0});
  await p.deny(25,0,{requestedCount:1.5});
  await p.deny(25,0,{expectedRevision:p.state.world.revision-1});
  await p.deny(25,0,{randomDraws:[0]});
  await maintenance(p);
  const second=await p.saveAndRestart(1);
  assert.ok(second.revision>first.revision);
  assert.equal(p.stock(25),10);
  assert.ok(p.stock(35)>0&&p.stock(36)>0);
  const proof=await inspectDairyCheckpoint(p,2);
  assert.ok(proof.segments>=1);
  await eat(p,35);await eat(p,36);
  const before=p.state.world;
  const rejected=await p.post('/api/save',{expectedRevision:before.revision,expectedGeneration:1});
  assert.equal(rejected.ok,false);
  assert.deepEqual(p.state.world,before);
  t.diagnostic('P4 real player sales='+JSON.stringify(sales)+
    ' observed cow deaths='+observed.deaths+' gift cows='+observed.giftCows+
    ' prize vouchers='+observed.prizeVouchers+' periods='+observed.settlements+
    ' checkpoint='+p.state.historyCheckpointRevision+' authenticated prefixes='+proof.segments+
    ' revisions='+first.revision+'→'+second.revision);
  await p.rejectDamagedNewestPrefix(first,second);
  for(const mutate of [
    r=>{r.checkpointAuth='0'.repeat(64);},
    r=>{const proof=JSON.parse(r.careerProof);proof.checkpoint.mac='0'.repeat(64);r.careerProof=JSON.stringify(proof);},
    r=>{const proof=JSON.parse(r.careerProof);proof.checkpoint.sourceFingerprint='0'.repeat(64);r.careerProof=JSON.stringify(proof);},
    r=>{const proof=JSON.parse(r.careerProof);proof.checkpoint.prefixSha256='0'.repeat(64);r.careerProof=JSON.stringify(proof);},
  ])await p.rejectForgedLatest(first,mutate,{restore:true});
  await p.rejectForgedLatest(first,record=>{
    const world=JSON.parse(record.world);
    world.shops[0].item[24]++;
    world.shops[0].item[25]++;
    world.shops[0].item[34]++;
    world.shops[0].item[35]++;
    world.shops[0].exp['25']=999;
    world.shops[0].job='weapon';
    record.world=JSON.stringify(world);
  });
});
