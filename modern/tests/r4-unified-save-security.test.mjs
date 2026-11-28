import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,rename,readFile,writeFile,link,lstat,utimes,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';
import {createIndependentPeriodDiskStore,independentPeriodDiskDigest,PERIOD_DISK_DIRECTORY} from '../src/r4-independent-period-disk-store.mjs';
import {createReviewedHistoryCheckpointStore,CHECKPOINT_DIRECTORY} from '../src/reviewed-history-checkpoint-store.mjs';

// Controlled storage fault injection with real v2 HTTP, real world history
// and actual independent generations. No award, RNG injection or player
// acceptance claim; the pre-existing P3 single-shop crossing mode is enough.
test('D5 real v2 HTTP recovers prior immutable generation on missing, corrupt or hard-linked files',async t=>{
  const p=await genuinePlayer(t,{crossPeriod:true});
  const first=await p.saveAndRestart(0);
  await p.use(63,1);
  const second=await p.saveAndRestart(1);
  assert.equal(second.shops[0].showcasecount,2);
  assert.notEqual(independentPeriodDiskDigest(first),independentPeriodDiskDigest(second));
  const store=createIndependentPeriodDiskStore({directory:p.directory});
  const newest=join(p.directory,PERIOD_DISK_DIRECTORY,independentPeriodDiskDigest(second));
  const play=join(newest,'play.cgi'),moved=join(p.directory,'saved-play-for-test');
  const slot=join(p.directory,'world-a.json'),envelope=await readFile(slot,'utf8');
  await p.rejectDamagedLatestDisk(first,second,async()=>{
    await rename(play,moved);
    try{
      assert.throws(()=>store.verify(second));
      assert.throws(()=>store.stage(second),'existing incomplete generation must not be repaired');
      assert.equal(await readFile(slot,'utf8'),envelope);
      assert.equal(store.verify(first),true);
      return async()=>{
        await assert.rejects(lstat(play),{code:'ENOENT'});
        await rename(moved,play);
      };
    }catch(error){await rename(moved,play);throw error;}
  });
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
  const linked=join(p.directory,'linked-save-for-test');
  await p.rejectDamagedLatestDisk(first,second,async()=>{
    await link(slot,linked);
    return async()=>{
      assert.equal((await lstat(slot)).nlink,2);
      assert.equal(await readFile(linked,'utf8'),envelope);
      await rm(linked);
    };
  });
  await p.rejectDamagedLatestDisk(first,second,async()=>{
    await link(play,moved);
    try{
      assert.throws(()=>store.verify(second),/regular independent source file/);
      assert.throws(()=>store.stage(second),/regular independent source file/);
      return async()=>{
        assert.equal((await lstat(play)).nlink,2);
        await rm(moved);
      };
    }catch(error){await rm(moved);throw error;}
  });
  assert.equal(await readFile(slot,'utf8'),envelope);
  assert.equal(store.verify(second),true);
  assert.deepEqual(p.state.world,second);
});

// Use a child with a hard timeout so a regression opening a FIFO for blocking
// reads fails the test instead of wedging the entire test runner.
test('D5 FIFO file substitutes in save, checkpoint and source disk reads fail without blocking',{skip:process.platform==='win32'?'POSIX FIFO unavailable on Windows':false},async t=>{
  const directory=await mkdtemp(join(tmpdir(),'akimono-d5-fifo-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const checkpoint=join(directory,CHECKPOINT_DIRECTORY);
  await mkdir(checkpoint,{mode:0o700});
  const names=['log0.cgi','log1.cgi','log2.cgi','guildbal.cgi','play.cgi'];
  const file=()=>({bytes:'controlled wire\n',mtime:100});
  const entries=ns=>Object.fromEntries(ns.map(n=>[n,file()]));
  // Isolated disk-store layout fixture, not WorldState or gameplay evidence.
  const world={nowSeconds:100,period:{disk:{source:'r4-independent-source-disk.v1',
    live:entries([...names,'guild.cgi','lasttime.cgi']),backup:entries(names),
    generations:[null,null,null]}}};
  const store=createIndependentPeriodDiskStore({directory});
  assert.equal(store.stage(world),true);
  const play=join(directory,PERIOD_DISK_DIRECTORY,independentPeriodDiskDigest(world),'play.cgi');
  await rm(play);
  for(const name of [join(directory,'world-a.json'),join(checkpoint,'key'),play])
    execFileSync('mkfifo',[name],{timeout:3000});
  const imports={
    slot:new URL('../src/local-world-save-store.mjs',import.meta.url).href,
    checkpoint:new URL('../src/reviewed-history-checkpoint-store.mjs',import.meta.url).href,
    disk:new URL('../src/r4-independent-period-disk-store.mjs',import.meta.url).href,
  };
  const script=[
    'import assert from "node:assert/strict";',
    'import {createLocalWorldSaveStore} from '+JSON.stringify(imports.slot)+';',
    'import {createReviewedHistoryCheckpointStore} from '+JSON.stringify(imports.checkpoint)+';',
    'import {createIndependentPeriodDiskStore} from '+JSON.stringify(imports.disk)+';',
    'const directory='+JSON.stringify(directory)+';',
    'const world='+JSON.stringify(world)+';',
    'const historyReplay={checkpointStore:{},verify(){throw Error("unexpected replay");}};',
    'const slot=createLocalWorldSaveStore({directory,historyReplay});',
    'assert.equal(slot.status().unreadable,true);',
    'assert.throws(()=>slot.load(),/存檔損毀/);',
    'const c=createReviewedHistoryCheckpointStore({directory,sourceFingerprint:"a".repeat(64),interpreter:"controlled"});',
    'assert.throws(()=>c.recordAuth({generation:1,world:"x",careerProof:"x"}),/unsafe checkpoint file/);',
    'const disk=createIndependentPeriodDiskStore({directory});',
    'assert.throws(()=>disk.verify(world),/regular independent source file/);',
    'assert.throws(()=>disk.stage(world),/regular independent source file/);',
  ].join('\n');
  execFileSync(process.execPath,['--input-type=module','-e',script],{timeout:5000,stdio:'pipe'});
  for(const name of [join(directory,'world-a.json'),join(checkpoint,'key'),play])
    assert.equal((await lstat(name)).isFIFO(),true);
});

test('D5 checkpoint key rejects hard-link even with unchanged valid key bytes',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'akimono-d5-key-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const dir=join(directory,CHECKPOINT_DIRECTORY),key=join(dir,'key'),alias=join(directory,'alias');
  await mkdir(dir,{mode:0o700});
  await writeFile(key,Buffer.alloc(32,1),{mode:0o600});
  const store=createReviewedHistoryCheckpointStore({directory,sourceFingerprint:'a'.repeat(64),interpreter:'controlled'});
  const input={generation:1,world:'controlled',careerProof:'controlled'};
  const auth=store.recordAuth(input);
  assert.match(auth,/^[0-9a-f]{64}$/);
  await link(key,alias);
  assert.throws(()=>store.recordAuth(input),/unsafe checkpoint file/);
  assert.deepEqual(await readFile(alias),Buffer.alloc(32,1));
  await rm(alias);
  assert.equal(store.recordAuth(input),auth);
});
