import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';
import {createIndependentPeriodDiskStore,independentPeriodDiskDigest,PERIOD_DISK_DIRECTORY} from '../src/r4-independent-period-disk-store.mjs';
import {rename,readFile,writeFile,rm,stat,utimes} from 'node:fs/promises';
import {join} from 'node:path';
import {encodeMemorySnapshot} from '../src/game-core-contract.mjs';

// Actual HTTP commands, no fixture awards. This proves negative eligibility
// and authenticated save/restart only; it does not prove legal army acquisition.
test('opt-in R4 conflict endpoints require actual soldiers, exact requests and replayable save history',async t=>{
  const p=await genuinePlayer(t,{now:'1025980',crossPeriod:true,rebelTime:true});
  assert.equal(p.state.reviewedRebelTime,true);
  assert.equal(p.state.armyConflict,null);
  await p.tick(1);
  await p.enoughTime(1800);
  assert.equal(p.state.world.period.settledCount,1);
  assert.equal(p.state.armyConflict.canStart,false);
  assert.equal(p.state.armyConflict.canJoin,false);
  assert.equal(p.state.armyConflict.canDispatch,false);
  assert.equal(p.state.army.count,0);
  const before=p.state.world,history=p.state.historyCommands;
  for(const [action,body] of [
    ['start-rebellion',{confirmation:'rebel'}],
    ['join-rebellion',{confirmation:'rebel'}],
    ['dispatch-guard',{}],
    ['start-rebellion',{confirmation:'wrong'}],
    ['start-rebellion',{confirmation:'rebel',armyBytes:'1,4000\n1\n'}],
    ['start-rebellion',{confirmation:'rebel',armyCount:4000}],
    ['dispatch-guard',{town:{leader:1}}],
    ['dispatch-guard',{randomDraws:[0]}],
    ['start-rebellion',{confirmation:'rebel',expectedRevision:before.revision-1}]
  ]){
    const result=await p.post('/api/army-'+action,{expectedRevision:before.revision,...body});
    assert.equal(result.ok,false,action);
    assert.deepEqual(p.state.world,before);
    assert.equal(p.state.historyCommands,history);
    assert.equal(Object.hasOwn(p.state.world.period.disk.live,'army.cgi'),false);
    assert.equal(Object.hasOwn(p.state.world.period.eventState,'rebel'),false);
  }
  const first=await p.saveAndRestart(0);
  assert.deepEqual(p.state.world,before);
  assert.equal(p.state.armyConflict.canStart,false);
  await p.tick(1);
  const second=await p.saveAndRestart(1);
  // The real generation pointer must recover from corruption of the newest
  // materialized source files, even with intact world-a.json and its history.
  const store=createIndependentPeriodDiskStore({directory:p.directory});
  const newest=join(p.directory,PERIOD_DISK_DIRECTORY,independentPeriodDiskDigest(second));
  const play=join(newest,'play.cgi'),moved=join(p.directory,'saved-play-for-test');
  const envelope=await readFile(join(p.directory,'world-a.json'),'utf8');
  await p.rejectDamagedLatestDisk(first,second,async()=>{
    await rename(play,moved);
    try{
      assert.throws(()=>store.verify(second));
      assert.throws(()=>store.stage(second),'existing incomplete generation must not be repaired');
      assert.equal(await readFile(join(p.directory,'world-a.json'),'utf8'),envelope);
      assert.equal(store.verify(first),true);
      return async()=>{
        // Failed stage/load must leave the absent member absent.
        try{await stat(play);assert.fail('corrupt generation unexpectedly repaired');}
        catch(error){assert.equal(error.code,'ENOENT');}
        await rename(moved,play);
      };
    }catch(error){await rename(moved,play);throw error;}
  });
  assert.equal(store.verify(second),true);
  await p.rejectDamagedLatestDisk(first,second,async()=>{
    await rename(play,moved);
    try{
      await writeFile(play,'invalid source play');
      const mtime=second.period.disk.live['play.cgi'].mtime;
      await utimes(play,mtime,mtime);
      assert.throws(()=>store.verify(second),/bytes or clock mismatch/);
      assert.throws(()=>store.stage(second),/bytes or clock mismatch/);
      return async()=>{
        assert.equal(await readFile(play,'utf8'),'invalid source play');
        await rm(play);await rename(moved,play);
      };
    }catch(error){await rm(play,{force:true});await rename(moved,play);throw error;}
  });
  assert.equal(await readFile(join(p.directory,'world-a.json'),'utf8'),envelope);
  assert.equal(store.verify(second),true);
  // A structurally valid, materialized file generation still cannot create
  // army/rebel state that is absent from the actual player's command history.
  await p.rejectForgedLatest(first,record=>{
    const forged=JSON.parse(record.world);
    const {disk,eventState}=forged.period;
    eventState.rebel=forged.nowSeconds+259200;
    disk.live['army.cgi']={bytes:'1,4000\n1\n',mtime:forged.nowSeconds};
    const lines=disk.live['play.cgi'].bytes.split('\n');
    lines[3]=Object.entries(eventState).flat().join(',');
    disk.live['play.cgi'].bytes=lines.join('\n');
    const store=createIndependentPeriodDiskStore({directory:p.directory});
    assert.equal(store.stage(forged),true);
    assert.equal(store.verify(forged),true);
    record.world=encodeMemorySnapshot(forged);
  },{restore:true});
  assert.deepEqual(p.state.world,second);
  assert.equal(p.state.armyConflict.canStart,false);
  assert.equal(Object.hasOwn(p.state.world.period.eventState,'rebel'),false);
});

test('R4 combined full commerce and rebellion flags retain real four-shelf sales, boundary and save provenance',async t=>{
  let total=0,boundaryReceipt=null;
  const p=await genuinePlayer(t,{crossPeriod:true,rebelTime:true,fullCommerce:true,now:null,fundMarketWithWork:true,
    onTick(r,before){
      const d=r.details,old=before.shops[0];
      assert.ok(Array.isArray(d.shelfSales));
      assert.equal(d.shelfSales.reduce((n,x)=>n+x.count,0),d.naturalSaleCount);
      for(const row of d.shelfSales){
        assert.equal(row.itemId,old.showcase[row.shelf]);
        assert.equal(row.gross,row.count*old.price[row.shelf]);
      }
      if(old.showcasecount===4){total+=d.naturalSaleCount;if(d.settlementReceipt)boundaryReceipt=d.settlementReceipt;}
    }});
  assert.equal(p.state.reviewedRebelTime,true);assert.equal(p.state.reviewedFullCommerce,true);
  await p.use(79,1);
  await p.market(13);await p.market(12);
  await p.gather(1,10);await p.use(15,0);
  for(let n=0;;n++){
    assert.ok(n<40,'source construction funding budget');
    await p.enoughTime(p.quote(63,3).timePerUseSeconds);
    if(p.state.shop.money>=40000+Math.max(10000,Math.ceil(p.state.shop.costtoday)+10000))break;
    await p.use(13,1);
  }
  await p.use(63,3);
  assert.equal(p.state.shop.showcasecount,4);
  await p.enoughTime(2400);
  for(let shelf=0;shelf<4;shelf++){
    const r=await p.post('/api/showcase',{expectedRevision:p.state.world.revision,shelf,itemId:30,per:100});
    assert.equal(r.code,'COMMITTED',JSON.stringify(r.details??r.error));
  }
  for(let n=0;(!boundaryReceipt||total===0)&&n<37;n++)await p.tick(60);
  assert.ok(total>0&&boundaryReceipt,'real sale and four-shelf settlement');
  assert.equal(boundaryReceipt.maintenance,Math.trunc(Number(boundaryReceipt.costBeforeLedger))+8000);
  const before=p.state.world,history=p.state.historyCommands;
  const denied=await p.post('/api/army-start-rebellion',{expectedRevision:before.revision,confirmation:'rebel'});
  assert.equal(denied.ok,false);assert.deepEqual(p.state.world,before);assert.equal(p.state.historyCommands,history);
  const saved=await p.saveAndRestart(0);
  assert.deepEqual(saved,before);assert.deepEqual(saved.shops[0].showcase,[30,30,30,30]);
  assert.equal(createIndependentPeriodDiskStore({directory:p.directory}).verify(saved),true);
  assert.equal(p.state.army.count,0);
  await p.tick(1);
  assert.equal(p.state.shop.showcasecount,4);
});
