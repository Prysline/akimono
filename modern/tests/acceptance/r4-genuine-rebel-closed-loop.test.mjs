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
import {prepareGenuineMissionRecipe} from '../support/r4-genuine-mission-recipe.mjs';
import {createIndependentPeriodDiskStore} from '../../src/r4-independent-period-disk-store.mjs';
import {encodeMemorySnapshot} from '../../src/game-core-contract.mjs';
import {parseArmyFile} from '../../src/original-r4-army-files.mjs';
import {R4_EXTERNAL_COMMAND_HASH_POLICY} from '../../src/original-r4-perl-hash-replay.mjs';
import {calculateSourceShopPoint} from '../../src/original-period-solo-sort.mjs';

const sha=s=>createHash('sha256').update(s,'utf8').digest('hex');
// Reuse the actual #22 four-category, buffered 120% commerce route.
// Different source types cover the original specialty-demand break;
// the whole sale pipeline is still the server's reviewed source path.
const goods=[
  {id:40,book:17,useId:0,raw:3,input:20,output:20},
  {id:57,book:17,useId:1,raw:3,input:20,output:20},
  {id:45,book:16,useId:0,raw:2,input:24,output:30},
  {id:51,book:16,useId:1,raw:2,input:24,output:32},
];
const saleIds=goods.map(g=>g.id);
const PRICE_PER=120;
const shelfOf=id=>goods.findIndex(g=>g.id===id);
const saleTarget=120,lowStock=64;
const missionRoutes={
  57:{book:17,useId:1,materials:[[3,20]]},
  68:{book:66,useId:1,materials:[[6,20],[8,2]],gate:250},
  31:{book:15,useId:1,materials:[[30,10]],gate:200},
  41:{book:20,useId:0,materials:[[5,20]]},
  53:{book:22,useId:0,materials:[[5,20]]},
  47:{book:21,useId:0,materials:[[5,20]]},
};
test('R4 actual player: 20000 source points, palace missions, 2500 paid soldiers, two-slice rebel CAS and durable replay',{timeout:3300000},async t=>{
  let ticks=0,proceeds=0,maxPoint=0,missions=0,generation=0,fundsCheckpoint=false;
  const p=await genuinePlayer(t,{crossPeriod:true,rebelTime:true,fullCommerce:true,fundMarketWithWork:true,now:null,onTick(r,before){
    const old=before.shops[0],next=r.state.shop,d=r.details;
    assert.ok(++ticks<=2300,'bounded genuine time experiment exhausted');
    const sold=d.naturalSaleCount;
    assert.ok(Number.isSafeInteger(sold)&&sold>=0);
    const rows=d.shelfSales;
    assert.ok(Array.isArray(rows),'combined source per-shelf receipt');
    assert.equal(rows.reduce((sum,row)=>sum+row.count,0),sold);
    const byItem={},boundaryRows=[],residualRows=[];
    for(const row of rows){
      assert.ok(saleIds.includes(row.itemId),'only acquired commerce stock may sell');
      assert.equal(row.itemId,old.showcase[row.shelf]);assert.equal(row.unitPrice,old.price[row.shelf]);
      assert.equal(row.gross,row.count*row.unitPrice);
      assert.equal(row.stockAfter,row.stockBefore-row.count);
      byItem[row.itemId]=(byItem[row.itemId]??0)+row.count;proceeds+=row.gross;
      if(d.settlementReceipt&&row.sliceIndex===0)boundaryRows.push(row);else residualRows.push(row);
    }
    assert.deepEqual(byItem,d.soldByItem);
    const counts=rr=>{const out={};for(const row of rr)out[row.itemId]=(out[row.itemId]??0)+row.count;return out;};
    const gross=rr=>rr.reduce((n,row)=>n+row.gross,0);
    if(d.settlementReceipt){
      const q=d.settlementReceipt,bc=counts(boundaryRows),rc=counts(residualRows);
      assert.deepEqual(q.soldByItem,bc);
      assert.equal(q.saleBeforeLedger,old.saletoday+gross(boundaryRows));
      assert.equal(next.saletoday,gross(residualRows));
      for(const id of saleIds){
        assert.equal(next.itemyesterday?.[id]??0,(old.itemtoday?.[id]??0)+(bc[id]??0));
        assert.equal(next.itemtoday?.[id]??0,rc[id]??0);
      }
    }else{
      assert.equal(next.saletoday-old.saletoday,gross(rows));
      for(const id of saleIds)assert.equal((next.itemtoday?.[id]??0)-(old.itemtoday?.[id]??0),byItem[id]??0);
    }
    assert.equal(r.state.palace.point,calculateSourceShopPoint(next),'source GetDTPoint, not cash balance');
    maxPoint=Math.max(maxPoint,r.state.palace.point);
    if(d.settlementReceipt)t.diagnostic('R4 genuine period '+JSON.stringify({
      period:r.state.world.period.settledCount,revision:r.state.world.revision,point:r.state.palace.point,
      rank:next.rank,money:next.money,profit:next.profitstock,dignity:next.dignity,
      staff:next.item[56],swords:next.item[39],iron:next.item[40],mithril:next.item[42],proceeds,maxPoint,
      population:r.state.world.period.dtPeople,upkeep:d.settlementReceipt.maintenance,cashBeforeLedger:d.settlementReceipt.cashBeforeLedger,stock:next.item.map((n,i)=>[i+1,n]).filter(([,n])=>n)
    }));
  }});
  const snapshot=()=>p.state.world;
  const shop=()=>p.state.shop;
  const diagnostic=()=>JSON.stringify({revision:snapshot().revision,period:snapshot().period.settledCount,
    point:p.state.palace.point,maxPoint,rank:shop().rank,money:shop().money,profit:shop().profitstock,
    dignity:shop().dignity,mission:p.state.palace,ticks,proceeds,missions,population:snapshot().period.dtPeople,
    upkeep:shop().costtoday,rankingcount:shop().rankingcount,saletoday:shop().saletoday,paytoday:shop().paytoday,taxtoday:shop().taxtoday,
    pointAtMaximumRank:calculateSourceShopPoint({...shop(),rank:10000}),exp:shop().exp,stock:shop().item.map((n,i)=>[i+1,n]).filter(([,n])=>n)});
  function bounded(){assert.ok(snapshot().revision<6500,'genuine command budget '+diagnostic());}
  async function command(route,body={}){
    bounded();
    const before=snapshot();
    const r=await p.post(route,{expectedRevision:before.revision,...body});
    assert.equal(r.code,'COMMITTED',JSON.stringify({route,reason:r.details?.reason,error:r.error,state:diagnostic()}));
    assert.equal(snapshot().revision,before.revision+1);
    return r;
  }
  async function list(id,shelf=shelfOf(id)){
    assert.ok(id===0||saleIds.includes(id));assert.ok(shelf>=0&&shelf<shop().showcasecount);
    if(shop().showcase[shelf]===id)return;
    await p.enoughTime(p.state.showcaseEditTimeSeconds);
    await command('/api/showcase',{itemId:id,shelf,per:id===0?100:PRICE_PER});
    assert.equal(shop().showcase[shelf],id);
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
    assert.equal(p.quote(id,useId).canUse,true,'source USE gate '+id+'/'+useId+' '+JSON.stringify(p.quote(id,useId))+' '+diagnostic());
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
    const train=useId>0&&id===15?()=>craft(15,0,30,[[1,10]]):
      useId>0&&id===66?()=>craft(66,0,67,[[5,20]]):null;
    const ready=await prepareGenuineMissionRecipe({p,book:id,useId,materials,acquireBook:book,
      acquireMaterial:material,train,diagnostic,onRetry:info=>t.diagnostic('R4 genuine recipe retry '+JSON.stringify(info))});
    const prior=snapshot(),exp=p.exp(id);
    assert.ok(exp>=ready.requiredProficiency,'actual source EXP at command submission');
    const result=await p.use(id,useId);
    assert.equal(snapshot().revision,prior.revision+1,'ready recipe submits without an intervening time advance');
    assert.equal(result.details.sourceUseItemId,id);
    assert.equal(result.details.useNo,useId);
    assert.equal(result.details.effectiveCount,1);
    for(const [item,count] of materials)assert.ok(result.details.originalUseItem.some(([i,n])=>i===item&&n===count),'actual material deduction');
    const output=result.details.acquired.find(x=>x.itemId===product);
    assert.ok(output&&Number.isSafeInteger(output.produced)&&output.produced>=0,'actual craft output receipt');
    return output.produced;
  }
  let reserved=null;
  const heldForMission=id=>reserved?.itemId===id?reserved.count:0;
  const surplus=id=>Math.max(0,p.stock(id)-heldForMission(id));
  async function produce(g,goal=saleTarget+heldForMission(g.id)){
    bounded();
    await book(g.book);
    const count=Math.min(6,Math.max(1,Math.ceil((goal-p.stock(g.id))/(g.output*0.8))));
    await p.gather(g.raw,g.input*count);
    const r=await p.use(g.book,g.useId,count);
    assert.equal(r.details.effectiveCount,count);
    assert.ok(r.details.originalUseItem.some(([id,n])=>id===g.raw&&n===g.input*count));
    assert.ok(r.details.originalAddItem.some(([id,n])=>id===g.id&&n>=Math.floor(g.output*count*0.8)));
  }
  async function trimInputs(){
    // Keep upstream skill/mission ingredients; remove genuinely unused
    // raw byproducts only. Source upkeep is never waived.
    const keep={1:reserved?.itemId===31?40:10,2:48,3:40,4:0,5:40,6:40,7:3,8:32};
    for(const [key,max] of Object.entries(keep)){
      const id=Number(key);if(p.stock(id)>max)await p.discard(id,p.stock(id)-max);
    }
  }
  async function economyStock(){
    bounded();
    await trimInputs();
    // Keep a real stock buffer, especially when goods double as mission
    // inventory. Never count a reserved item as sold or granted.
    const g=goods.reduce((a,b)=>surplus(a.id)<=surplus(b.id)?a:b);
    if(surplus(g.id)<lowStock)await produce(g);
    for(const [shelf,product] of goods.entries()){
      if(heldForMission(product.id)>0&&surplus(product.id)<lowStock){
        if(shop().showcase[shelf]!==0)await list(0,shelf);
      }else if(p.stock(product.id)>0)await list(product.id,shelf);
    }
  }
  async function economyTurn(){
    await economyStock();
    const before=snapshot(),history=p.state.historyCommands;
    try{await p.tick(60)}catch(error){
      assert.deepEqual(snapshot(),before);assert.equal(p.state.historyCommands,history);
      t.diagnostic('R4 genuine rejected economy tick '+diagnostic());throw error;
    }
  }
  async function checkpointFunds(){
    if(fundsCheckpoint||shop().money<2700000||p.state.palace.owned<p.state.palace.count||missions!==0)return;
    // A separately reported milestone in the SAME real player trajectory.
    // The parent acceptance still fails unless every original gate succeeds.
    await t.test('genuine 2.7m reserve and actual first mission inventory survive authenticated restart',async()=>{
      assert.equal(shop().dignity,0);
      const prior=snapshot(),history=p.state.historyCommands,task=p.state.palace;
      assert.equal(task.point,calculateSourceShopPoint(shop()));
      assert.ok(task.owned>=task.count&&shop().money>=2700000);
      const denied=await p.post('/api/army-hire',{expectedRevision:prior.revision,requestedCount:2500});
      assert.equal(denied.ok,false,'money alone cannot manufacture army capacity');
      assert.deepEqual(snapshot(),prior);
      assert.equal(p.state.historyCommands,history);
      if(task.point<20000){
        const audience=await p.post('/api/palace-complete',{expectedRevision:prior.revision});
        assert.equal(audience.ok,false,'money and goods cannot bypass the source point gate');
        assert.deepEqual(snapshot(),prior);
        assert.equal(p.state.historyCommands,history);
      }
      const saved=await p.saveAndRestart(generation++);
      assert.deepEqual(saved,prior);
      assert.equal(createIndependentPeriodDiskStore({directory:p.directory}).verify(saved),true);
      assert.equal(p.state.palace.owned,task.owned);
      assert.equal(p.state.palace.point,task.point);
      assert.equal(p.state.army.count,0);
      assert.equal(Object.hasOwn(saved.period.disk.live,'army.cgi'),false);
      t.diagnostic('R4 genuine FUNDS_AND_GOODS_CHECKPOINT '+diagnostic());
    });
    fundsCheckpoint=true;
  }
  async function scoreAndCash(cash){
    for(let n=0;p.state.palace.point<20000||shop().money<cash||p.state.palace.owned<p.state.palace.count;n++){
      assert.ok(n<1400,'genuine point/cash budget '+diagnostic());
      if(p.state.palace.owned<p.state.palace.count)await missionStock();
      await economyTurn();
      await checkpointFunds();
    }
    assert.ok(p.state.palace.point>=20000&&shop().money>=cash&&p.state.palace.owned>=p.state.palace.count);
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
    reserved={itemId:task.itemId,count:task.count};
    const shelf=shop().showcase.indexOf(task.itemId);
    if(shelf>=0&&p.stock(task.itemId)<task.count+lowStock)await list(0,shelf);
    assert.ok(route,'actual source palace task '+task.itemId);
    if(p.stock(task.itemId)>=task.count)return;
    if(route.book>=20)await forgeSkill();
    if(route.book===66)await magicSkill();
    await book(route.book);
    // The actual server-chosen task is followed. Never force next evt.
    for(let n=0;p.stock(task.itemId)<task.count;n++){
      assert.ok(n<360,'genuine mission material budget '+diagnostic());
      if(n%2===0)await economyStock();
      await craft(route.book,route.useId,task.itemId,route.materials);
    }
    assert.equal(p.state.palace.itemId,task.itemId);
    assert.ok(p.state.palace.owned>=task.count);
  }

  async function completeMission(){
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
    reserved=null;
    t.diagnostic('R4 genuine palace completion '+JSON.stringify(result.details)+' '+diagnostic());
  }

  assert.equal(shop().money,100000);
  assert.equal(shop().dignity,0);
  assert.equal(p.state.palace.index,0);
  assert.equal(p.state.army.count,0);
  assert.equal(Object.hasOwn(snapshot().period.disk.live,'army.cgi'),false);
  assert.equal(p.state.reviewedFullCommerce,true);
  await p.use(79,1); // original five vouchers exchanged for three books
  await p.market(13);await p.market(12);
  for(let n=0;;n++){
    assert.ok(n<40,'four-shelf funding budget '+diagnostic());
    await p.enoughTime(p.quote(63,3).timePerUseSeconds);
    if(shop().money>=40000+Math.max(10000,Math.ceil(shop().costtoday)+10000))break;
    const work=await p.use(13,1);assert.equal(work.details.moneyEarned,10000);
  }
  await p.use(63,3);
  assert.equal(shop().showcasecount,4);assert.equal(p.stock(63),0);
  for(const g of goods){
    for(let n=0;p.stock(g.id)<saleTarget;n++){
      assert.ok(n<6,'initial source manufacturing budget '+g.id);
      await produce(g);
    }
  }
  await p.enoughTime(2400);
  for(const [shelf,g] of goods.entries())await list(g.id,shelf);
  assert.deepEqual(shop().showcase,saleIds);
  // Earn an audience and complete the first task before insisting on the
  // full recruitment reserve; a high score in the early city need not be
  // wasted while waiting for 2.7m cash. All subsequent goals remain exact.
  await missionStock();
  await scoreAndCash(100000);
  t.diagnostic('R4 genuine first audience eligibility '+diagnostic());
  await p.saveAndRestart(generation++);
  for(let rounds=0;;rounds++){
    assert.ok(rounds<1000,'genuine dignity and recruitment reserve budget '+diagnostic());
    if(shop().dignity>=3){
      // Palace itself consumes no stock time. Earn reserve and recruitment
      // time AFTER obtaining dignity; if real settlement decay removes
      // eligibility, immediately resume the original mission path.
      if(shop().money<2700000){await economyTurn();continue;}
      if(p.remaining()<4200){await p.enoughTime(4200);continue;}
      break;
    }
    assert.ok(missions<15,'genuine palace dignity budget '+diagnostic());
    await missionStock();
    await scoreAndCash(100000);
    if(!p.state.palace.canComplete)continue;
    // Use the actual source eligibility now, not after gratuitous time
    // passage or waiting for the full army reserve. The original command
    // has no time charge; a fresh subsequent quote selects the next task.
    await completeMission();
  }
  assert.ok(missions>=3&&shop().dignity>=3&&shop().money>=2500000);
  assert.equal(shop().showcasecount,4,'same legal expanded shop enters rebellion');
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
  assert.equal(after.shops[0].showcasecount,4);
  assert.ok(Array.isArray(crossed.details.shelfSales));
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
  // Continue the SAME real player through the original terminal outcome.
  // A 2500-soldier attack need not win against a larger source city army.
  // The test must accept a genuine defeat as well as a genuine victory.
  await t.test('same legal player reaches source rebel outcome, persists it and resumes commerce',async()=>{
    let terminal=null;
    for(let n=0;Object.hasOwn(snapshot().period.eventState,'rebel');n++){
      assert.ok(n<12,'bounded real battle outcome '+diagnostic());
      const prior=snapshot(),result=await p.tick(60),next=snapshot(),trace=result.details.sourceTrace;
      assert.equal(trace.hashPolicy,R4_EXTERNAL_COMMAND_HASH_POLICY);
      assert.equal(trace.liveArmySha256,sha(prior.period.disk.live['army.cgi'].bytes));
      assert.equal(Object.hasOwn(next.shops[0],'army'),false);
      assert.equal(trace.slices.at(-1).stagedArmySha256,sha(next.period.disk.live['army.cgi'].bytes));
      const logs=trace.slices.flatMap(s=>s.logs);
      if(!Object.hasOwn(next.period.eventState,'rebel')){
        const suppressed=logs.some(row=>row[2]==='叛亂被護衛軍鎮壓了。');
        const defeated=logs.some(row=>row[2]==='護衛軍被叛軍殲滅了。領主被趕出了城堡。');
        assert.notEqual(suppressed,defeated,'exact source terminal log');
        terminal=suppressed?'suppressed':next.period.town.leader===1?'player-victory':'npc-victory';
        assert.deepEqual(parseArmyFile(next.period.disk.live['army.cgi'].bytes,[1]).riotIds,[]);
        assert.equal(p.state.army.riot,false);
        assert.equal(next.period.town.leader,terminal==='player-victory'?1:0);
        assert.ok(next.period.disk.live['log0.cgi'].bytes.includes(suppressed?'叛亂被護衛軍鎮壓了。':'護衛軍被叛軍殲滅了。領主被趕出了城堡。'));
      }
    }
    // In the unlikely case the initial two-slice crossing already ended
    // the event, classify that same source callback, never reroll.
    if(terminal===null){
      const logs=trace.slices.flatMap(s=>s.logs);
      assert.ok(logs.some(row=>row[2]==='叛亂被護衛軍鎮壓了。'||row[2]==='護衛軍被叛軍殲滅了。領主被趕出了城堡。'));
      terminal=logs.some(row=>row[2]==='叛亂被護衛軍鎮壓了。')?'suppressed':after.period.town.leader===1?'player-victory':'npc-victory';
    }
    const outcome=snapshot(),loaded=await p.saveAndRestart(generation++);
    assert.deepEqual(loaded,outcome);
    assert.equal(createIndependentPeriodDiskStore({directory:p.directory}).verify(loaded),true);
    assert.equal(Object.hasOwn(loaded.period.eventState,'rebel'),false);
    assert.equal(p.state.army.riot,false);
    const army=loaded.period.disk.live['army.cgi'];
    await p.tick(1);
    if(!Object.hasOwn(snapshot().period.eventState,'rebel')){
      assert.deepEqual(snapshot().period.disk.live['army.cgi'],army,'inactive NOW does not rewrite army');
    }
    assert.equal(shop().showcasecount,4);
    const resumed=await p.saveAndRestart(generation++);
    assert.equal(createIndependentPeriodDiskStore({directory:p.directory}).verify(resumed),true);
    t.diagnostic('R4 genuine battle outcome ACCEPTED '+JSON.stringify({terminal,leader:outcome.period.town.leader,
      army:army.bytes,revision:resumed.revision,period:resumed.period.settledCount,generation}));
  });
  // Keep the independently verified first battle and its genuine outcome.
  // If the same player lost, regroup through actual economy/palace/hiring
  // commands and challenge the current city once, with a sufficient army.
  // Never reset identity, town, RNG, soldiers, dignity or save history.
  await t.test('same legal player wins leadership and continues source economy across a later settlement',async()=>{
    const town=()=>snapshot().period.town;
    const target=()=>Math.max(2500,town().army+town().robina+Math.max(1000,town().robinb+800));
    const active=()=>Object.hasOwn(snapshot().period.eventState,'rebel');
    const guardCount=()=>town().army+town().robina;
    assert.ok(!active(),'first source outcome must be settled');
    if(town().leader!==1){
      assert.equal(town().leader,0);
      for(let n=0;;n++){
        assert.ok(n<1000,'genuine victory preparation budget '+diagnostic());
        assert.ok(!active()&&town().leader===0,'no unrelated leader or forced rebel');
        const required=target(),additional=Math.max(0,required-p.state.army.count);
        if(p.state.army.maximum<required){
          assert.ok(missions<25,'genuine additional dignity budget '+diagnostic());
          await missionStock();await scoreAndCash(100000);
          await completeMission();continue;
        }
        if(shop().money<additional*1000+250000){await economyTurn();continue;}
        if(p.remaining()<4200){await p.enoughTime(4200);continue;}
        // Fight within the current period so guard treasury settlement does
        // not change the just-checked force ratio or trigger a new NPC event.
        // Source guards lose at least int(span/3), plus rand(5) each step.
        // Ten-minute steps limit discarded militia overflow at phase changes.
        const plannedSeconds=(Math.ceil(town().robina/200)+Math.ceil(town().army/200)+3)*600;
        if(p.boundary()<=plannedSeconds){
          await economyTurn();continue;
        }
        if(additional){
          assert.ok(p.state.army.canHire&&p.state.army.hireMaximum>=additional);
          const old=shop(),priorCount=p.state.army.count;
          const hire=await command('/api/army-hire',{requestedCount:additional});
          assert.equal(hire.details.count,additional);
          assert.equal(hire.details.cost,additional*1000);
          assert.equal(shop().money,old.money-additional*1000);
          assert.equal(p.state.army.count,priorCount+additional);
        }
        assert.ok(p.state.army.count>=required&&p.state.armyConflict.canStart);
        assert.equal(p.state.army.riot,false);
        const pre=snapshot(),count=p.state.army.count;
        const battle=await command('/api/army-start-rebellion',{confirmation:'rebel'});
        assert.equal(battle.details.armyBefore,count);
        assert.equal(battle.details.armyAfter,count);
        assert.equal(snapshot().period.eventState.rebel,pre.nowSeconds+259200);
        t.diagnostic('R4 genuine victory attempt '+JSON.stringify({count,guard:guardCount(),
          town:town(),point:p.state.palace.point,dignity:shop().dignity,cash:shop().money}));
        await p.saveAndRestart(generation++);
        for(let step=0;active();step++){
          assert.ok(step<Math.ceil(plannedSeconds/600),'bounded real victory fight '+diagnostic());
          assert.ok(p.boundary()>600,'no unplanned settlement in victory fight');
          const before=snapshot(),r=await p.tick(10),after=snapshot();
          assert.equal(r.details.sourceTrace.hashPolicy,R4_EXTERNAL_COMMAND_HASH_POLICY);
          assert.equal(r.details.sourceTrace.liveArmySha256,sha(before.period.disk.live['army.cgi'].bytes));
          assert.equal(r.details.sourceTrace.slices.at(-1).stagedArmySha256,sha(after.period.disk.live['army.cgi'].bytes));
          assert.equal(Object.hasOwn(shop(),'army'),false);
          if(!active()){
            assert.ok(r.details.sourceTrace.slices.flatMap(s=>s.logs)
              .some(row=>row[2]==='護衛軍被叛軍殲滅了。領主被趕出了城堡。'),'actual guard defeat');
            assert.equal(town().leader,1,'source player victory, not suppressed or NPC victory');
          }
        }
        break;
      }
    }
    assert.equal(town().leader,1);assert.equal(active(),false);
    assert.ok(town().army>=200,'surviving rebels become actual city guards');
    assert.equal(p.state.army.riot,false);assert.equal(p.state.army.count,0);
    assert.equal(p.state.armyConflict.isLeader,true);
    assert.equal(p.state.armyConflict.canStart,false,'current lord cannot start own rebellion');
    const won=await p.saveAndRestart(generation++);
    assert.equal(won.period.town.leader,1);
    assert.equal(createIndependentPeriodDiskStore({directory:p.directory}).verify(won),true);
    assert.ok(won.period.disk.live['log0.cgi'].bytes.includes('成為了新的領主。'));
    // Test actual ordinary operations as lord with original zero tax, not
    // merely a state read. No unreviewed city treasury/tax mutation.
    await p.enoughTime(p.quote(13,1).timePerUseSeconds);
    assert.equal(town().leader,1);
    const cash=shop().money,work=await p.use(13,1);
    assert.equal(work.details.moneyEarned,10000);assert.equal(shop().money,cash+10000);
    const priorPeriod=snapshot().period.settledCount;
    for(let n=0;snapshot().period.settledCount===priorPeriod;n++){
      assert.ok(n<37,'bounded post-victory period');
      await economyTurn();
    }
    assert.equal(snapshot().period.settledCount,priorPeriod+1);
    assert.equal(town().leader,1,'ordinary post-victory source period retains current leader');
    const final=await p.saveAndRestart(generation++);
    assert.equal(final.period.town.leader,1);
    assert.equal(final.shops[0].showcasecount,4);
    assert.equal(createIndependentPeriodDiskStore({directory:p.directory}).verify(final),true);
    t.diagnostic('R4 genuine leader ACCEPTED '+JSON.stringify({leader:final.period.town.leader,
      town:final.period.town,revision:final.revision,period:final.period.settledCount,
      missions,generation,cash:final.shops[0].money}));
  });
});
