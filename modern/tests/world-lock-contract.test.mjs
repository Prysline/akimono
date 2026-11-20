import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CORE_LOCK_RETRY, reviewStaleWorldLocks, projectWorldLockTransition,
  projectCheckedRenameAttempts, projectCheckedOpenAttempts,
} from '../src/world-lock-contract.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [original, cfg, writer] = await Promise.all([
  'modern/tests/original-perl/lock.cgi',
  '_config.cgi',
  'modern/tests/original-perl/write.cgi',
].map(f=>readFile(path.join(root,f),'utf8')));
const transition=(operation,heldDepth,observedRename)=>
  projectWorldLockTransition({operation,heldDepth,observedRename});
const stale=(entries,nowSeconds=1000,autoUnlockSeconds=60)=>
  reviewStaleWorldLocks({entries,nowSeconds,autoUnlockSeconds});

test('B-14 pinned Core lock source and actual Standard Street config agree',()=>{
  assert.ok(original.includes('sub Lock'));
  assert.ok(original.includes('sub UnLock'));
  assert.ok(original.includes('sub LockSub'));
  assert.ok(original.includes('sub RenameAndCheck'));
  assert.ok(original.includes('sub OpenAndCheck'));
  assert.ok(original.includes('LockSub();'));
  assert.ok(original.includes('DataCommitOrAbort(1); # abort'));
  assert.ok(original.includes('$LOCKED_LEVEL++,return if $LOCKED ne'));
  assert.ok(original.includes('return if $LOCKED eq'));
  assert.ok(original.includes('foreach(1..5)'));
  assert.ok(original.includes('my $count=5;'));
  assert.ok(original.includes('while(!open(OUT,">:encoding(UTF-8)",$_[0]))'));
  assert.ok(writer.includes('return if $LOCKED eq') && writer.includes('|| -e $LOCKED;'));
  assert.match(cfg,/\$LOCK_FILE\s*=\s*'lockfile'\s*;/);
  assert.match(cfg,/\$AUTO_UNLOCK_TIME\s*=\s*60\s*;/);
});

test('B-14 pinned attempt counts distinguish five rename attempts and six open failures',()=>{
  assert.deepEqual(CORE_LOCK_RETRY,{
    acquireRenameAttempts:5,
    checkedRenameAttempts:5,
    checkedOpenAttempts:6,
    waitAfterFailedRenameMs:200,
    waitAfterFailedOpenMs:200,
    waitAfterStaleReclaimMs:100,
  });
  assert.ok(Object.isFrozen(CORE_LOCK_RETRY));
});

test('B-14 first successful acquire must recover pending commit before use',()=>{
  const r=transition('acquire',0,true);
  assert.equal(r.mode,'acquired');
  assert.equal(r.nextHeldDepth,1);
  assert.equal(r.lockPathRetained,true);
  assert.equal(r.invokeDataCommitOrAbort1,true);
  assert.equal(r.safeForNewWrite,false);
});

test('B-14 busy failed acquire cannot invoke world commit recovery',()=>{
  const r=transition('acquire',0,false);
  assert.equal(r.mode,'busy');
  assert.equal(r.nextHeldDepth,0);
  assert.equal(r.invokeDataCommitOrAbort1,false);
  assert.equal(r.error,'busy');
});

test('B-14 nested acquire increments depth without extra rename or recovery',()=>{
  const r=transition('acquire',1);
  assert.equal(r.mode,'nested-acquire');
  assert.equal(r.nextHeldDepth,2);
  assert.equal(r.invokeDataCommitOrAbort1,false);
  assert.equal(r.safeForNewWrite,true);
});

test('B-14 nested release only decrements depth and leaves ownership',()=>{
  const r=transition('release',3);
  assert.equal(r.mode,'nested-release');
  assert.equal(r.nextHeldDepth,2);
  assert.equal(r.lockPathRetained,true);
});

test('B-14 outermost release succeeded: owned lock path cleared',()=>{
  const r=transition('release',1,true);
  assert.equal(r.mode,'released');
  assert.equal(r.nextHeldDepth,0);
  assert.equal(r.lockPathRetained,false);
  assert.equal(r.error,null);
});

test('B-14 outermost release failure retains path despite zero depth',()=>{
  const r=transition('release',1,false);
  assert.equal(r.mode,'release-failed');
  assert.equal(r.nextHeldDepth,0);
  assert.equal(r.lockPathRetained,true);
  assert.equal(r.safeForNewWrite,false);
  assert.equal(r.error,'unlock error');
});

test('B-14 unlock when not holding does not attempt rename',()=>{
  const r=transition('release',0);
  assert.equal(r.mode,'no-op');
  assert.equal(r.lockPathRetained,false);
});

test('B-14 invalid lock actions, depths, or missing rename result fail closed',()=>{
  for(const depth of [-1,1.4,NaN,Number.MAX_SAFE_INTEGER+1]){
    assert.throws(()=>transition('acquire',depth,true),/heldDepth/);
  }
  assert.throws(()=>transition('invalid',0,true),/operation/);
  assert.throws(()=>transition('acquire',0),/observedRename/);
  assert.throws(()=>transition('release',1),/observedRename/);
  assert.throws(()=>transition('release',2,true),/does not rename/);
  assert.throws(()=>transition('acquire',2,false),/does not rename/);
  assert.throws(()=>transition('release',0,false),/does not rename/);
});

test('B-14 stale age threshold is inclusive at exactly 60 seconds',()=>{
  const r=stale(['lockfile940_11_192.0.2.25','lockfile941_12_192.0.2.25']);
  assert.deepEqual(r.map(x=>x.name),['lockfile940_11_192.0.2.25']);
  assert.equal(r[0].ageSeconds,60);
  assert.equal(r[0].timestampSeconds,940);
  assert.equal(r[0].processId,11);
});

test('B-14 recent and future source locks remain ineligible',()=>{
  const r=stale([
    'lockfile999_11_198.51.100.7',
    'lockfile1100_11_198.51.100.7',
    'lockfile',
    'notes.cgi',
  ]);
  assert.deepEqual(r,[]);
});

test('B-14 stale proposals do not depend on input ordering',()=>{
  const a=['lockfile800_23_192.0.2.1','lockfile700_25_2001:db8::1'];
  const b=[...a].reverse();
  const one=stale(a),two=stale(b);
  assert.deepEqual(one,two);
  assert.ok(Object.isFrozen(one));
  assert.ok(Object.isFrozen(one[0]));
  assert.deepEqual(a,['lockfile800_23_192.0.2.1','lockfile700_25_2001:db8::1']);
});

test('B-14 source regex might steal malformed stale suffixes; projection rejects',()=>{
  const sourceRegex=/^lockfile(\d+)/;
  assert.equal(sourceRegex.test('lockfile900garbage'),true);
  for(const name of ['lockfile900garbage','lockfile900_0_remote','lockfile900_5_',
    'lockfile900_5_remote..invalid','lockfile9_5_!!!']){
    assert.throws(()=>stale([name]),/Ambiguous|Unsafe/);
  }
});

test('B-14 stale review rejects huge timestamp and duplicate filenames',()=>{
  assert.throws(()=>stale(['lockfile9007199254740992_9_remote']),/Unsafe stale/);
  assert.throws(()=>stale(['lockfile900_9_remote','lockfile900_9_remote']),/Duplicate/);
});

test('B-14 stale review refuses unreviewed lock basename and unsafe inputs',()=>{
  assert.throws(()=>reviewStaleWorldLocks({
    entries:['lockfile900_9_remote'],nowSeconds:1000,
    autoUnlockSeconds:60,lockFile:'lock',
  }),/Unexpected lock basename/);
  for(const name of ['../lockfile900_9_remote','lockfile900_9_a/b','lockfile900_9_a\nb']){
    assert.throws(()=>stale([name]),/Unsafe/);
  }
  for(const entries of [null,'lockfile900_9_remote',{}]){
    assert.throws(()=>stale(entries),/array/);
  }
});

test('B-14 stale review rejects invalid now and timeout inputs',()=>{
  for(const bad of [-1,NaN,1.5,undefined]){
    assert.throws(()=>stale([],bad,60),/nowSeconds/);
  }
  for(const bad of [0,-1,NaN,1.5]){
    assert.throws(()=>stale([],1000,bad),/autoUnlockSeconds/);
  }
});

test('B-14 RenameAndCheck immediate success checks both source and target',()=>{
  const result=projectCheckedRenameAttempts([{
    renamed:true,sourceExists:false,destinationExists:true,
  }]);
  assert.deepEqual(result,{mode:'success',attempts:1,waits:0,reportError:false});
});

test('B-14 RenameAndCheck waits 200ms for each failed rename only',()=>{
  const result=projectCheckedRenameAttempts([
    {renamed:false},{renamed:false},
    {renamed:true,sourceExists:false,destinationExists:true},
  ]);
  assert.equal(result.mode,'success');
  assert.equal(result.attempts,3);
  assert.equal(result.waits,2);
});

test('B-14 rename returned success but validation failed causes retry without sleep',()=>{
  const r=projectCheckedRenameAttempts([
    {renamed:true,sourceExists:true,destinationExists:true},
    {renamed:true,sourceExists:false,destinationExists:true},
  ]);
  assert.deepEqual(r,{mode:'success',attempts:2,waits:0,reportError:false});
});

test('B-14 five failed renames report original OutError rather than success',()=>{
  const r=projectCheckedRenameAttempts(Array(5).fill({renamed:false}));
  assert.deepEqual(r,{mode:'error',attempts:5,waits:5,reportError:true});
});

test('B-14 last permissible fifth successful rename passes',()=>{
  const r=projectCheckedRenameAttempts([
    ...Array(4).fill({renamed:false}),
    {renamed:true,sourceExists:false,destinationExists:true},
  ]);
  assert.deepEqual(r,{mode:'success',attempts:5,waits:4,reportError:false});
});

test('B-14 RenameAndCheck incomplete retries and contradictory probes fail closed',()=>{
  assert.throws(()=>projectCheckedRenameAttempts([{renamed:false}]),/all five probes/);
  assert.throws(()=>projectCheckedRenameAttempts([{renamed:true}]),/needs source/);
  assert.throws(()=>projectCheckedRenameAttempts([]),/1..5/);
  assert.throws(()=>projectCheckedRenameAttempts(Array(6).fill({renamed:false})),/1..5/);
  assert.throws(()=>projectCheckedRenameAttempts([
    {renamed:true,sourceExists:false,destinationExists:true},{renamed:false},
  ]),/Extra probes/);
});

test('B-14 OpenAndCheck immediate success is truncate-mode UTF8 source semantics',()=>{
  const r=projectCheckedOpenAttempts([true]);
  assert.deepEqual(r,{
    mode:'success',attempts:1,waits:0,reportError:false,truncatesFile:true,
  });
});

test('B-14 OpenAndCheck permits a sixth open attempt after five failures',()=>{
  const r=projectCheckedOpenAttempts([false,false,false,false,false,true]);
  assert.deepEqual(r,{
    mode:'success',attempts:6,waits:5,reportError:false,truncatesFile:true,
  });
});

test('B-14 OpenAndCheck sixth failure logs source error',()=>{
  const r=projectCheckedOpenAttempts(Array(6).fill(false));
  assert.deepEqual(r,{
    mode:'error',attempts:6,waits:5,reportError:true,truncatesFile:false,
  });
});

test('B-14 OpenAndCheck rejects unfinished retries, invalid observations and extra events',()=>{
  assert.throws(()=>projectCheckedOpenAttempts([false,false]),/six failures/);
  assert.throws(()=>projectCheckedOpenAttempts([true,false]),/Extra probes/);
  assert.throws(()=>projectCheckedOpenAttempts([true,'false']),/booleans/);
  assert.throws(()=>projectCheckedOpenAttempts([]),/1..6/);
  assert.throws(()=>projectCheckedOpenAttempts(Array(7).fill(false)),/1..6/);
});

test('B-14 all returned transition and retry records remain immutable',()=>{
  for(const item of [
    transition('acquire',0,true),
    transition('release',1,false),
    projectCheckedOpenAttempts([true]),
    projectCheckedRenameAttempts([{renamed:false},{renamed:false},{renamed:false},{renamed:false},{renamed:false}]),
  ]){
    assert.ok(Object.isFrozen(item));
    assert.throws(()=>{item.mode='changed';},TypeError);
  }
});
