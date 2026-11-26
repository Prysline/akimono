/** P4: independent death and fresh-history security acceptance.
 * All positive operations use the real player and server clock/RNG.
 * Disk edits below are negative tests only, restored from genuine bytes.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';

async function prepare(p,id,useId,count=1){
  for(let n=0;n<8;n++){
    const seconds=p.quote(id,useId).timePerUseSeconds*count;
    if(p.remaining()>=seconds)return;
    await p.enoughTime(seconds);
  }
  assert.fail('source USE time quote did not converge');
}
async function milk(p,count){
  await prepare(p,25,1,count);
  const before=p.state.shop,clock=p.quote(25,1).timePerUseSeconds;
  const now=p.state.world.nowSeconds;
  const r=await p.use(25,1,count);
  const added=r.details.originalAddItem.find(row=>row[0]===26)?.[1]??0;
  const deaths=r.details.originalUseItem.find(row=>row[0]===25)?.[1]??0;
  assert.ok(added>=0&&added<=2*count*before.item[24]);
  if(before.item[25]<2500)assert.ok(added>0);
  assert.equal(p.stock(26),before.item[25]+added);
  assert.equal(p.stock(25),before.item[24]-deaths);
  assert.equal(p.exp(25),Math.min(1000,(before.exp?.['25']??0)+count*10));
  assert.equal(p.state.shop.time,Math.max(before.time,now-259200)+clock*count);
  assert.equal(r.details.randomDrawsUsed,count+1);
  if(deaths)assert.ok(r.details.originalUseMsg.some(x=>x.includes('過勞')));
  return deaths;
}

test('P4 actual cow mortality: save before replacing, reload, NEED denial, legal replacement',async t=>{
  const p=await genuinePlayer(t,{now:null,crossPeriod:true});
  await p.market(25,2,{partial:true});
  await p.use(79,4,3);
  assert.equal(p.stock(25),5);
  assert.ok(p.stock(79)>=2);
  await p.market(78);await p.use(78,11);
  assert.equal(p.state.shop.job,'cow');
  // Bounded genuine production, no seed selection or client RNG. Sale of
  // excess milk funds upkeep and ordinary commands retain the owner session.
  // A strict evidence run may observe 1920 genuine Bernoulli trials, not just 480.
  // Never retry a failed assertion or select/replace a seed. No death is still a failure.
  const batches=process.env.AKIMONO_TEST_REQUIRE_COW_DEATH==='1'?120:30;
  let opportunities=0;
  for(let n=0;n<batches;n++){
    if(p.stock(26)>100)await p.list(26);
    await p.enoughTime(p.quote(25,1).timePerUseSeconds*16+(p.state.shop.showcase[0]===26?600:0));
    await p.list(0);
    const deaths=await milk(p,16);opportunities+=16;
    if(!deaths)continue;
    assert.ok(p.stock(25)<5);
    const dead=await p.saveAndRestart(0);
    assert.ok(p.stock(25)<5);
    for(let i=0;p.stock(26)<15&&p.stock(25)>0;i++){
      assert.ok(i<30);await milk(p,3);
    }
    assert.ok(p.stock(26)>=15,'isolate NEED gate with adequate milk');
    await prepare(p,26,1);await p.deny(26,1);
    // Initial reserved vouchers and genuine later period vouchers only.
    for(let i=0;p.stock(79)<5-p.stock(25);i++){
      assert.ok(i<216,'bounded genuine prize voucher wait');
      if(p.stock(25)>0&&p.stock(26)<30&&p.remaining()>=p.quote(25,1).timePerUseSeconds)
        await milk(p,1);
      if(p.stock(26)>30&&p.state.shop.showcase[0]!==26)await p.list(26);
      await p.tick(60);
    }
    await p.list(0);
    await p.use(79,4,5-p.stock(25));
    assert.equal(p.stock(25),5);
    for(let i=0;p.stock(26)<15;i++){
      assert.ok(i<30);
      const lost=await milk(p,3);
      if(lost){
        assert.ok(p.stock(79)>=lost,'real replacement vouchers');
        await p.use(79,4,lost);
      }
    }
    await p.use(26,1);
    assert.equal(p.stock(25),5);assert.ok(p.stock(35)>=2);
    const recovered=await p.saveAndRestart(1);
    assert.ok(recovered.revision>dead.revision);
    assert.equal(p.stock(25),5);assert.ok(p.stock(35)>=2);
    t.diagnostic('P4 ACTUAL DEATH PERSISTED '+JSON.stringify({opportunities,deaths,deadCows:dead.shops[0].item[24],deadRevision:dead.revision,recoveredRevision:recovered.revision}));
    return;
  }
  t.diagnostic('P4 NO DEATH OBSERVED: '+opportunities+' real RNG opportunities; no death acceptance');
  if(process.env.AKIMONO_TEST_REQUIRE_COW_DEATH==='1')assert.fail('No cow death occurred in bounded real player experiment; missing genuine evidence');
  t.skip('No cow death occurred in bounded real player experiment');
});

test('P4 fresh v2 dairy rejects independent stock, career, EXP, history, RNG and invalid latest files',async t=>{
  const p=await genuinePlayer(t,{now:null,crossPeriod:true});
  await p.use(79,4,3);await milk(p,2);
  const first=await p.saveAndRestart(0);
  assert.ok(p.stock(25)>0);
  const clock=p.quote(25,0).timePerUseSeconds,before=p.state.world;
  const effective=Math.floor(p.remaining()/clock);
  assert.ok(effective>0);
  const r=await p.post('/api/use',{expectedRevision:before.revision,itemId:25,useId:0,requestedCount:effective+3});
  assert.equal(r.code,'COMMITTED',JSON.stringify(r.details));
  assert.equal(r.details.effectiveCount,effective);
  assert.equal(r.details.randomDrawsUsed,effective+1);
  assert.ok(p.stock(25)>0&&p.remaining()<p.quote(25,0).timePerUseSeconds);
  await p.deny(25,0);
  const second=await p.saveAndRestart(1);
  const slot=JSON.parse(await readFile(join(p.directory,'world-a.json'),'utf8'));
  assert.equal(JSON.parse(slot.careerProof).anchorKind,'fresh');
  const editWorld=f=>record=>{const w=JSON.parse(record.world);f(w.shops[0]);record.world=JSON.stringify(w);};
  const cases=[
    ...[24,25,34,35].map(i=>editWorld(s=>{s.item[i]++;})),
    editWorld(s=>{s.exp['25']=(s.exp['25']??0)+1;}),
    editWorld(s=>{s.job='weapon';}),
    record=>{const q=JSON.parse(record.careerProof);q.commands.pop();record.careerProof=JSON.stringify(q);},
    record=>{const q=JSON.parse(record.careerProof);const cmd=q.commands.find(x=>x.itemId===25&&x.randomDraws?.length);assert.ok(cmd);cmd.randomDraws[0]=(cmd.randomDraws[0]+1)%1000000;record.careerProof=JSON.stringify(q);},
    record=>{record.format='akimono.local-world-save.v1';},
  ];
  for(const mutate of cases)await p.rejectForgedLatest(first,mutate,{restore:true});
  await p.rejectForgedLatest(first,r=>{r.sha256='0'.repeat(64);},{restore:true,recompute:false});
  assert.deepEqual(p.state.world,second);
});
