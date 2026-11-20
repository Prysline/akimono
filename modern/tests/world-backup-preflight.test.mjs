import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  BACKUP_SOURCE_NAMES,CORE_BACKUP_INTERVAL_SECONDS,
  reviewWorldBackupAge,reviewWorldWritePreconditions,
} from '../src/world-backup-preflight.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [core,cfg,coreFunc]=await Promise.all([
  'modern/tests/original-perl/write.cgi','_config.cgi',
  'modern/tests/original-perl/inc-func.cgi',
].map(file=>readFile(path.join(root,file),'utf8')));
const goodEvidence=()=>BACKUP_SOURCE_NAMES.map(name=>({
  name,sourceReadable:true,destinationWritable:true,copyVerified:true,
}));
const base=()=>({
  ownershipVerified:true,ownedLockPathExists:true,heldDepth:1,
  recoveryComplete:true,nowSeconds:10000,backupMtimeSeconds:0,
  backupEvidence:goodEvidence(),
});

test('B-15 sources: Core lock check permits empty LOCKED, and backup opens are unchecked',()=>{
  assert.ok(core.includes("return if $LOCKED eq '' || -e $LOCKED;"));
  assert.ok(core.includes('DataFilesBackup() if (stat(GetPath($BACKUP_DIR,$DATA_FILE)))[9]<$NOW_TIME-$BACKUP_TIME;'));
  assert.ok(core.includes('open(IN,"<:encoding(UTF-8)",GetPath($filetype));'));
  assert.ok(core.includes('open(OUT,">:encoding(UTF-8)",GetPath($BACKUP_DIR,$filetype));'));
  assert.ok(core.includes('while(<IN>){print OUT $_;}'));
  assert.ok(core.includes('close(OUT);'));
  assert.ok(core.includes('close(IN);'));
  assert.ok(coreFunc.includes('return $DATA_DIR."/".$ _')===false); // guard against guessed syntax
  assert.ok(coreFunc.includes('return $DATA_DIR."/".$'+'_[0].$FILE_EXT if @_==1;'));
});

test('B-15 source list and interval remain pinned to actual _config.cgi',()=>{
  assert.match(cfg,/\$BACKUP_TIME\s*=\s*3600\s*;/);
  assert.match(cfg,/@BACKUP_FILES\s*=\s*\(/);
  for (const name of BACKUP_SOURCE_NAMES) {
    assert.match(cfg,new RegExp('\\$'+(name==='guildbal'?'GUILDBAL_FILE':name==='play'?'DATA_FILE':'LOG_FILE')));
  }
  assert.deepEqual(BACKUP_SOURCE_NAMES,['log0','log1','log2','guildbal','play']);
  assert.equal(CORE_BACKUP_INTERVAL_SECONDS,3600);
  assert.ok(Object.isFrozen(BACKUP_SOURCE_NAMES));
});

test('B-15 Core backup mtime threshold uses strict less-than, not at equality',()=>{
  const x=reviewWorldBackupAge({nowSeconds:10000,backupMtimeSeconds:6400});
  assert.equal(x.needsBackup,false);
  assert.equal(x.sourceThreshold,6400);
  assert.equal(x.reason,'mtime-not-older');
  assert.ok(Object.isFrozen(x));
});

test('B-15 an older-by-one-second backup requires new verified copy',()=>{
  const r=reviewWorldBackupAge({nowSeconds:10000,backupMtimeSeconds:6399});
  assert.equal(r.needsBackup,true);
  assert.equal(r.reason,'backup-older-than-interval');
});

test('B-15 missing backup mtime is explicit, not assumed safe and fresh',()=>{
  const r=reviewWorldBackupAge({nowSeconds:10000,backupMtimeSeconds:null});
  assert.equal(r.needsBackup,true);
  assert.equal(r.reason,'missing-or-unknown-backup-mtime');
});

test('B-15 future backup mtime is fail-closed even if Core would skip backup',()=>{
  const r=reviewWorldBackupAge({nowSeconds:10000,backupMtimeSeconds:10001});
  assert.equal(r.needsBackup,true);
  assert.equal(r.reason,'future-backup-mtime-requires-review');
});

test('B-15 missing timestamp and invalid numeric times reject assumptions',()=>{
  for(const bad of [undefined,NaN,-1,1.25,Number.MAX_SAFE_INTEGER+1]){
    assert.throws(()=>reviewWorldBackupAge({nowSeconds:bad,backupMtimeSeconds:0}),
      /nowSeconds/);
    if(bad!==undefined)assert.throws(()=>
      reviewWorldBackupAge({nowSeconds:10000,backupMtimeSeconds:bad}),
      /backupMtimeSeconds/);
  }
  assert.throws(()=>reviewWorldBackupAge({nowSeconds:10000}),
    /backupMtimeSeconds/);
});

test('B-15 fully reviewed lock and five backups permits only isolated next step',()=>{
  const r=reviewWorldWritePreconditions(base());
  assert.equal(r.allowNextIsolatedStep,true);
  assert.equal(r.reason,'preconditions-reviewed');
  assert.equal(r.lockSafe,true);
  assert.equal(r.needsBackup,true);
  assert.equal(r.backupVerified,true);
  assert.ok(Object.isFrozen(r));
  assert.ok(Object.isFrozen(r.reviewedBackupEvidence));
  assert.equal(r.scope.includes('NO FS IO'),true);
});

test('B-15 no lock ownership never grants write, unlike original CheckLockStatus',()=>{
  const r=reviewWorldWritePreconditions({...base(),ownershipVerified:false});
  assert.equal(r.allowNextIsolatedStep,false);
  assert.equal(r.reason,'lock-ownership-or-recovery-not-proven');
});

test('B-15 owned path missing denies next write even if other preconditions pass',()=>{
  const r=reviewWorldWritePreconditions({...base(),ownedLockPathExists:false});
  assert.equal(r.allowNextIsolatedStep,false);
  assert.equal(r.lockSafe,false);
});

test('B-15 nesting depth zero denies next write',()=>{
  const r=reviewWorldWritePreconditions({...base(),heldDepth:0});
  assert.equal(r.allowNextIsolatedStep,false);
  assert.equal(r.reason,'lock-ownership-or-recovery-not-proven');
});

test('B-15 incomplete commit recovery under lock denies next write',()=>{
  const r=reviewWorldWritePreconditions({...base(),recoveryComplete:false});
  assert.equal(r.allowNextIsolatedStep,false);
  assert.equal(r.lockSafe,false);
});

test('B-15 fresh backup mtime does not need to copy again in this limited scope',()=>{
  const r=reviewWorldWritePreconditions({
    ...base(),backupMtimeSeconds:9999,backupEvidence:undefined,
  });
  assert.equal(r.allowNextIsolatedStep,true);
  assert.equal(r.needsBackup,false);
  assert.equal(r.backupVerified,true);
  assert.equal(r.reviewedBackupEvidence,null);
});

test('B-15 missing backup requires ALL five explicit source copies',()=>{
  const r=reviewWorldWritePreconditions({...base(),backupEvidence:undefined});
  assert.equal(r.allowNextIsolatedStep,false);
  assert.equal(r.reason,'required-backup-not-verified');
});

test('B-15 each missing source, unwritable backup, unverified copy causes refusal',()=>{
  for(const field of ['sourceReadable','destinationWritable','copyVerified']){
    for(let i=0;i<BACKUP_SOURCE_NAMES.length;i++){
      const evidence=goodEvidence();evidence[i][field]=false;
      const r=reviewWorldWritePreconditions({...base(),backupEvidence:evidence});
      assert.equal(r.allowNextIsolatedStep,false,BACKUP_SOURCE_NAMES[i]+' '+field);
      assert.equal(r.reason,'required-backup-not-verified');
    }
  }
});

test('B-15 reject duplicate, missing, extra and renamed backup list sources',()=>{
  const all=goodEvidence();
  for(const records of [
    all.slice(0,4),
    [...all,{name:'other',sourceReadable:true,destinationWritable:true,copyVerified:true}],
    [...all.slice(0,4),{...all[0]}],
    [...all.slice(0,4),{...all[4],name:'wrong-file'}],
  ]){
    assert.throws(()=>reviewWorldWritePreconditions({...base(),backupEvidence:records}),
      /five-entry|Unexpected or duplicate/);
  }
});

test('B-15 evidence order is canonical and immutable without modifying input',()=>{
  const original=goodEvidence().reverse();
  const snap=structuredClone(original);
  const r=reviewWorldWritePreconditions({...base(),backupEvidence:original});
  assert.deepEqual(original,snap);
  assert.deepEqual(r.reviewedBackupEvidence.map(v=>v.name),BACKUP_SOURCE_NAMES);
  assert.ok(Object.isFrozen(r.reviewedBackupEvidence[0]));
});

test('B-15 unverified future backup mtime refuses even after complete copies',()=>{
  const r=reviewWorldWritePreconditions({...base(),backupMtimeSeconds:10001});
  assert.equal(r.allowNextIsolatedStep,false);
  assert.equal(r.reason,'future-backup-mtime-requires-review');
});

test('B-15 rejects implicit booleans, invalid heldDepth and unknown copy evidence',()=>{
  for(const name of ['ownershipVerified','ownedLockPathExists','recoveryComplete']){
    assert.throws(()=>reviewWorldWritePreconditions({...base(),[name]:undefined}),
      /explicit boolean/);
  }
  for(const heldDepth of [-1,0.5,NaN]){
    assert.throws(()=>reviewWorldWritePreconditions({...base(),heldDepth}),/heldDepth/);
  }
  const evidence=goodEvidence();delete evidence[0].copyVerified;
  assert.throws(()=>reviewWorldWritePreconditions({...base(),backupEvidence:evidence}),
    /explicit boolean/);
});

test('B-15 model is read-only plan and never declares verified durable commit',()=>{
  const r=reviewWorldWritePreconditions(base());
  assert.equal('fsync' in r,false);
  assert.equal('atomicCommit' in r,false);
  assert.equal('durableBackup' in r,false);
  assert.throws(()=>{r.allowNextIsolatedStep=false;},TypeError);
});
