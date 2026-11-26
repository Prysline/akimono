/** Long-running positive R4 acceptance. No fixture WorldState, client RNG,
 * forged save, rank/dignity grant or repeated seed selection. All progress
 * comes from the same fresh real-clock HTTP player and server source commands.
 * Run separately from the short regression suite; bounded exhaustion FAILS.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {genuinePlayer} from '../support/p3-genuine-v2-player.mjs';
import {createIndependentPeriodDiskStore} from '../../src/r4-independent-period-disk-store.mjs';
import {encodeMemorySnapshot} from '../../src/game-core-contract.mjs';
import {parseArmyFile} from '../../src/original-r4-army-files.mjs';
import {R4_EXTERNAL_COMMAND_HASH_POLICY} from '../../src/original-r4-perl-hash-replay.mjs';

const sha=s=>createHash('sha256').update(s,'utf8').digest('hex');
const WOOD=40,MITHRIL=43,PRICE_PER=75;
const missionRoutes={
  57:{book:17,useId:1,materials:[[3,20]]},
  68:{book:66,useId:1,materials:[[6,20],[8,2]],gate:250},
  31:{book:15,useId:1,materials:[[30,10]],gate:200},
  41:{book:20,useId:0,materials:[[5,20]]},
  53:{book:22,useId:0,materials:[[5,20]]},
  47:{book:21,useId:0,materials:[[5,20]]},
};
test('R4 actual player: 20000 source points, palace missions, 2500 paid soldiers, two-slice rebel CAS and durable replay',{timeout:3300000},async t=>{
  let ticks=0,proceeds=0,maxPoint=0,missions=0;
  const p=await genuinePlayer(t,{crossPeriod:true,rebelTime:true,now:null,onTick(r,before){
    const old=before.shops[0],next=r.state.shop,d=r.details;
    assert.ok(++ticks<=2300,'bounded genuine time experiment exhausted');
    const sold=d.naturalSaleCount;
    assert.ok(Number.isSafeInteger(sold)&&sold>=0);
    if(sold){
      assert.ok([WOOD,MITHRIL].includes(old.showcase[0]),'only actual economy stock may sell');
      const id=old.showcase[0],receipt=d.settlementReceipt;
      if(receipt){
        assert.equal(next.itemyesterday?.[id]??0,(old.itemtoday?.[id]??0)+receipt.naturalSaleCount);
        assert.equal(next.itemtoday?.[id]??0,sold-receipt.naturalSaleCount);
        assert.equal(receipt.saleBeforeLedger,old.saletoday+receipt.naturalSaleCount*old.price[0]);
        assert.equal(next.saletoday,(sold-receipt.naturalSaleCount)*old.price[0]);
      }else{
        assert.equal((next.itemtoday?.[id]??0)-(old.itemtoday?.[id]??0),sold);
        assert.equal(next.saletoday-old.saletoday,sold*old.price[0]);
      }
      proceeds+=sold*old.price[0];
    }
    maxPoint=Math.max(maxPoint,r.state.palace.point);
    if(d.settlementReceipt)t.diagnostic('R4 genuine period '+JSON.stringify({
      period:r.state.world.period.settledCount,revision:r.state.world.revision,point:r.state.palace.point,
      rank:next.rank,money:next.money,profit:next.profitstock,dignity:next.dignity,
      staff:next.item[56],swords:next.item[39],mithril:next.item[42],proceeds,maxPoint
    }));
  }});
  const snapshot=()=>p.state.world;
  const shop=()=>p.state.shop;
  const diagnostic=()=>JSON.stringify({revision:snapshot().revision,period:snapshot().period.settledCount,
    point:p.state.palace.point,maxPoint,rank:shop().rank,money:shop().money,profit:shop().profitstock,
    dignity:shop().dignity,mission:p.state.palace,ticks,proceeds,missions,stock:[p.stock(WOOD),p.stock(MITHRIL)]});
  function bounded(){assert.ok(snapshot().revision<6500,'genuine command budget '+diagnostic());}
  async function command(route,body={}){
    bounded();
    const before=snapshot();
    const r=await p.post(route,{expectedRevision:before.revision,...body});
    assert.equal(r.code,'COMMITTED',JSON.stringify({route,reason:r.details?.reason,error:r.error,state:diagnostic()}));
    assert.equal(snapshot().revision,before.revision+1);
    return r;
  }
  async function list(id){
    const price=id===WOOD?900:id===MITHRIL?6000:0;
    assert.ok([0,WOOD,MITHRIL].includes(id));
    if(shop().showcase[0]===id&&shop().price[0]===price)return;
    await p.enoughTime(p.state.showcaseEditTimeSeconds);
    await command('/api/showcase',{itemId:id,shelf:0,per:id===0?100:PRICE_PER});
    assert.equal(shop().showcase[0],id);
    assert.equal(shop().price[0],price);
  }
  async function book(id){if(!p.stock(id))await p.market(id);}
  async function useReady(id,useId){
    for(let n=0;;n++){
      bounded();
      const q=p.quote(id,useId);
      assert.ok(q&&n<8,'live USE quote '+id+'/'+useId+' '+diagnostic());
      if(p.remaining()>=q.timePerUseSeconds)break;
      await p.enoughTime(q.timePerUseSeconds);
    }
    assert.equal(p.quote(id,useId).canUse,true,'source USE gate '+id+'/'+useId+' '+diagnostic());
    return p.use(id,useId);
  }
  async function material(id,count){
    if(p.stock(id)>=count)return;
    if(id>=1&&id<=4)await p.gather(id,count);
    else if(id>=5&&id<=7)await p.ore(id,count);
    else if(id===8)await p.stones(count);
    else if(id===30){
      await book(15);
      for(let n=0;p.stock(30)<count;n++){
        assert.ok(n<12,'healing input budget '+diagnostic());
        await craft(15,0,30,[[1,10]]);
      }
    }else assert.fail('unreviewed mission material '+id);
  }
  async function craft(id,useId,product,materials){
    bounded();
    await book(id);
    for(const [item,count] of materials)await material(item,count);
    // Requote after all upstream acquisition and any time advance.
    const result=await useReady(id,useId);
    assert.equal(result.details.sourceUseItemId,id);
    assert.equal(result.details.useNo,useId);
    assert.equal(result.details.effectiveCount,1);
    for(const [item,count] of materials)assert.ok(result.details.originalUseItem.some(([i,n])=>i===item&&n===count),'actual material deduction');
    const output=result.details.acquired.find(x=>x.itemId===product);
    assert.ok(output&&Number.isSafeInteger(output.produced)&&output.produced>=0,'actual craft output receipt');
    return output.produced;
  }
  let advanced=false;
  async function economyStock(){
    bounded();
    // Maintain a small sale pool so source stock-based rank gain is not
    // suppressed by huge stock. Higher-value mithril brings actual proceeds;
    // wooden swords rebuild popularity whenever it falls.
    const useMithril=advanced&&shop().rank>=8200;
    if(useMithril){
      if(p.stock(MITHRIL)<12){
        for(let n=0;p.exp(20)<400;n++){
          assert.ok(n<30,'mithril gate recovery '+diagnostic());
          await craft(20,0,41,[[5,20]]);
        }
        await craft(20,2,MITHRIL,[[6,20]]);
      }
      if(p.stock(MITHRIL)>0){await list(MITHRIL);return;}
    }
    for(let n=0;p.stock(WOOD)<36&&n<4;n++)await craft(17,0,WOOD,[[3,20]]);
    if(p.stock(WOOD)>0)await list(WOOD);
  }
  async function economyTurn(){
    await economyStock();
    await p.tick(60);
  }
  async function scoreAndCash(cash){
    for(let n=0;p.state.palace.point<20000||shop().money<cash;n++){
      assert.ok(n<1000,'genuine point/cash budget '+diagnostic());
      await economyTurn();
    }
    assert.ok(p.state.palace.point>=20000&&shop().money>=cash);
  }
  async function forgeSkill(){
    if(p.stock(18))return;
    await material(5,20);await material(6,5);await material(7,3);
    if(!p.stock(37))await p.market(37);
    await useReady(37,0);
    assert.equal(p.stock(18),1);
  }
  async function magicSkill(){
    if(p.stock(19))return;
    await material(8,30);
    if(!p.stock(37))await p.market(37);
    await useReady(37,1);
    assert.equal(p.stock(19),1);
  }
  async function missionStock(){
    const task=p.state.palace,route=missionRoutes[task.itemId];
    assert.ok(route,'actual source palace task '+task.itemId);
    if(route.book>=20)await forgeSkill();
    if(route.book===66)await magicSkill();
    await book(route.book);
    // The actual server-chosen task is followed. Never force next evt.
    for(let n=0;p.stock(task.itemId)<task.count;n++){
      assert.ok(n<360,'genuine mission material budget '+diagnostic());
      if(n%2===0)await economyStock();
      if(route.gate&&p.exp(route.book)<route.gate){
        const [product,inputs]=route.book===15?[30,[[1,10]]]:[67,[[5,20]]];
        await craft(route.book,0,product,inputs);
        continue;
      }
      await craft(route.book,route.useId,task.itemId,route.materials);
    }
    assert.equal(p.state.palace.itemId,task.itemId);
    assert.ok(p.state.palace.owned>=task.count);
  }

  assert.equal(shop().money,100000);
  assert.equal(shop().dignity,0);
  assert.equal(p.state.palace.index,0);
  assert.equal(p.state.army.count,0);
  assert.equal(Object.hasOwn(snapshot().period.disk.live,'army.cgi'),false);
  await p.use(79,0);await p.use(79,3);
  await book(17);
  for(let n=0;shop().money<160000;n++){
    assert.ok(n<180,'starter commerce budget '+diagnostic());
    await economyTurn();
  }
  await forgeSkill();await book(20);
  for(let n=0;p.exp(20)<400;n++){
    assert.ok(n<40,'earned forge EXP budget '+diagnostic());
    await economyStock();
    await craft(20,0,41,[[5,20]]);
  }
  advanced=true;
  // Earn the actual cash and source score before donating large stocks.
  // The 2.7m reserve includes 2.5m recruitment plus ordinary upkeep.
  await scoreAndCash(2700000);
  t.diagnostic('R4 genuine 20000 point / recruitment reserve reached '+diagnostic());
  let generation=0;
  await p.saveAndRestart(generation++);
  while(shop().dignity<3||p.remaining()<4200){
    if(shop().dignity>=3){
      await p.enoughTime(4200);
      if(shop().dignity>=3)break;
    }
    assert.ok(missions<15,'genuine palace dignity budget '+diagnostic());
    await missionStock();
    await scoreAndCash(2700000);
    // The score can change while time is replenished; obtain it again if
    // necessary, and never permit a below-threshold audience.
    await p.enoughTime(4200);
    if(!p.state.palace.canComplete||shop().money<2700000)continue;
    const task=p.state.palace,before=shop(),world=snapshot();
    assert.ok(task.point>=20000&&task.canComplete);
    const result=await command('/api/palace-complete');
    assert.equal(result.details.point,task.point);
    assert.equal(result.details.missionIndex,task.index);
    assert.equal(result.details.itemId,task.itemId);
    assert.equal(result.details.consumedCount,task.count);
    assert.equal(shop().item[task.itemId-1],before.item[task.itemId-1]-task.count);
    assert.equal(shop().dignity,before.dignity+1);
    assert.equal(snapshot().period.disk.townData.evt,String(result.details.nextMissionIndex));
    assert.equal(snapshot().nowSeconds,world.nowSeconds);
    missions++;
    t.diagnostic('R4 genuine palace completion '+JSON.stringify(result.details)+' '+diagnostic());
  }
  assert.ok(missions>=3&&shop().dignity>=3&&shop().money>=2500000);
  const beforeHire=shop(),now=snapshot().nowSeconds;
  assert.ok(p.state.army.canHire&&p.state.army.hireMaximum>=2500);
  const hired=await command('/api/army-hire',{requestedCount:2500});
  assert.equal(hired.details.count,2500);
  assert.equal(hired.details.unitPrice,1000);
  assert.equal(hired.details.cost,2500000);
  assert.equal(shop().money,beforeHire.money-2500000);
  assert.equal(shop().time,Math.max(beforeHire.time,now-259200)+2400);
  assert.equal(p.state.army.count,2500);
  assert.equal(snapshot().period.disk.live['army.cgi'].bytes,'1,2500\n\n');
  assert.equal(Object.hasOwn(shop(),'army'),false);
  await p.saveAndRestart(generation++);
  assert.equal(p.state.army.count,2500);
  // Move within the last 59 minutes without crossing; then the genuine
  // rebellion is active in the next two-slice command. No clock setter.
  while(p.boundary()>3540){
    await p.tick(Math.min(60,Math.floor((p.boundary()-120)/60)));
  }
  assert.ok(p.boundary()>0&&p.boundary()<=3540);
  assert.ok(p.state.armyConflict.canStart&&p.remaining()>=1800);
  const beforeStart=snapshot(),startTime=shop().time;
  const started=await command('/api/army-start-rebellion',{confirmation:'rebel'});
  assert.equal(started.details.armyBefore,2500);
  assert.equal(started.details.armyAfter,2500);
  assert.equal(shop().time,Math.max(startTime,beforeStart.nowSeconds-259200)+1800);
  assert.equal(snapshot().period.eventState.rebel,beforeStart.nowSeconds+259200);
  assert.equal(snapshot().period.disk.live['army.cgi'].bytes,'1,2500\n1\n');
  await p.saveAndRestart(generation++);
  assert.equal(p.state.army.riot,true);
  const beforeCross=snapshot(),minutes=Math.floor(p.boundary()/60)+1;
  const crossed=await p.tick(minutes),after=snapshot(),trace=crossed.details.sourceTrace;
  assert.equal(after.period.settledCount,beforeCross.period.settledCount+1);
  assert.equal(trace.hashPolicy,R4_EXTERNAL_COMMAND_HASH_POLICY);
  assert.deepEqual(trace.slices.map(s=>s.dateupdate),[1,0]);
  assert.equal(trace.slices.reduce((n,s)=>n+s.spanSeconds,0),minutes*60);
  assert.equal(trace.slices[0].armyRead,true);
  assert.equal(trace.liveArmySha256,sha(beforeCross.period.disk.live['army.cgi'].bytes));
  assert.equal(trace.slices.at(-1).stagedArmySha256,sha(after.period.disk.live['army.cgi'].bytes));
  assert.equal(Object.hasOwn(shop(),'army'),false);
  assert.equal(after.period.disk.generations[0]['play.cgi'].bytes,beforeCross.period.disk.live['play.cgi'].bytes);
  assert.equal(Object.hasOwn(after.period.disk.generations[0],'army.cgi'),false);
  assert.equal(after.period.disk.live['lasttime.cgi'].mtime,after.nowSeconds);
  const parsed=parseArmyFile(after.period.disk.live['army.cgi'].bytes,[1]);
  assert.ok((parsed.armyById[1]??0)<=2500,'no unearned soldiers in battle');
  const saved=await p.saveAndRestart(generation++);
  assert.deepEqual(saved,after);
  assert.equal(createIndependentPeriodDiskStore({directory:p.directory}).verify(saved),true);
  const slot=JSON.parse(await readFile(join(p.directory,generation%2?'world-b.json':'world-a.json'),'utf8'));
  const proof=JSON.parse(slot.careerProof),entry=proof.commands.at(-1);
  assert.equal(entry.kind,'advance-reviewed-world-time');
  assert.equal(entry.trace.hashPolicy,R4_EXTERNAL_COMMAND_HASH_POLICY);
  assert.equal(entry.trace.liveArmySha256,trace.liveArmySha256);
  assert.equal(entry.trace.afterSha256,sha(encodeMemorySnapshot(saved)));
  assert.deepEqual(entry.trace.slices.map(s=>s.afterOrder),trace.slices.map(s=>s.afterOrder));
  assert.equal(entry.trace.slices.at(-1).stagedArmySha256,sha(saved.period.disk.live['army.cgi'].bytes));
  t.diagnostic('R4 genuine closed-loop ACCEPTED '+JSON.stringify({missions,ticks,proceeds,maxPoint,
    hired:2500,revision:saved.revision,period:saved.period.settledCount,generation,
    army:saved.period.disk.live['army.cgi'].bytes,eventState:saved.period.eventState,leader:saved.period.town.leader}));
});
