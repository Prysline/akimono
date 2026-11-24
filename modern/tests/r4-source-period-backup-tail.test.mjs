import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  reviewR4PeriodBackupTail,projectR4PeriodBackupTail,
  R4_PERIOD_BACKUP_SOURCE,
} from '../src/original-r4-period-backup-tail.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [periodSource,configSource]=await Promise.all([
  readFile(path.join(root,'modern/tests/original-perl/period.cgi'),'utf8'),
  readFile(path.join(root,'_config.cgi'),'utf8'),
]);
const reviewed=reviewR4PeriodBackupTail({periodSource,configSource});
const oracle=()=>JSON.parse(execFileSync('perl',
  ['original-r4-period-backup-tail-probe.pl'],{
    cwd:path.join(root,'modern/tests/original-perl'),
    encoding:'utf8',
  }));
const byName=(arr)=>[...arr].sort((a,b)=>a.name.localeCompare(b.name,'en'));
test('R4 actual original backup tail rotates three real temp directories and expires sessions by exact strict stat mtime',()=>{
  assert.equal(reviewed.source,R4_PERIOD_BACKUP_SOURCE);
  assert.equal(reviewed.committable,false);
  assert.equal(reviewed.actualFileIOCommitted,false);
  assert.equal(reviewed.backupGenerations,3);
  assert.deepEqual(reviewed.files,['log0','log1','log2','guildbal','play']);
  const original=oracle();
  assert.deepEqual(original.files,reviewed.files);
  assert.equal(original.cases.length,2);
  for(const [i,entry] of original.cases.entries()){
    const input=JSON.stringify(entry.input);
    const got=projectR4PeriodBackupTail({
      reviewed,...entry.input,
    });
    assert.deepEqual(got.backupGenerations,entry.output.backupGenerations,
      'round '+(i+1)+' full actual source file contents over three directories');
    assert.deepEqual([...got.deletedSessions].sort(),
      [...entry.output.deletedSessions].sort(),
      'round '+(i+1)+' actual unlink decisions on sandbox files');
    assert.deepEqual(byName(got.remainingSessions),
      byName(entry.output.remainingSessions),
      'round '+(i+1)+' remaining original stat mtime and names');
    assert.equal(got.makeGuildFileCalls,entry.output.makeGuildFileCalls);
    assert.equal(got.cutoffSeconds,entry.output.cutoffSeconds);
    assert.equal(got.committable,false);
    assert.equal(got.actualFileIOCommitted,false);
    assert.equal(got.actualGuildFileWritten,false);
    assert.equal(JSON.stringify(entry.input),input,'do not mutate source state');
  }
  const [a,b]=original.cases;
  assert.deepEqual(a.output.deletedSessions,['expired.cgi']);
  assert.deepEqual(b.output.deletedSessions,['edge.cgi']);
  assert.ok(a.output.remainingSessions.some(x=>x.name==='.cgi'),
    'original ^.+\.cgi$ does not match bare .cgi');
  assert.ok(a.output.remainingSessions.some(x=>x.name==='CAPS.CGI'),
    'original lower-case session extension is case sensitive');
  assert.ok(a.output.remainingSessions.some(x=>x.name==='note.txt'),
    'original does not remove non CGI files');
  assert.equal(b.output.backupGenerations[1].play,
    a.output.backupGenerations[0].play,
    'second real period rolls prior generation one to generation two');
  assert.equal(b.output.backupGenerations[2].play,
    a.output.backupGenerations[1].play,
    'second real period rolls prior generation two to three');
});
test('R4 real original file backup and cleanup replays under two independent Perl temporary-directory processes',()=>{
  for(let k=0;k<2;k++)for(const row of oracle().cases){
    const got=projectR4PeriodBackupTail({reviewed,...row.input});
    assert.deepEqual(got.backupGenerations,row.output.backupGenerations);
    assert.deepEqual(byName(got.remainingSessions),byName(row.output.remainingSessions));
  }
});
test('R4 backup tail source review rejects edits to rotation, session strict inequality or original config',()=>{
  assert.throws(()=>reviewR4PeriodBackupTail({
    periodSource:periodSource.replace(
      'rename($BACKUP_DIR."_work",$BACKUP_DIR."1");',
      'rename($BACKUP_DIR."_work",$BACKUP_DIR."2");'),
    configSource,
  }),/phase or call order drift/);
  assert.throws(()=>reviewR4PeriodBackupTail({
    periodSource:periodSource.replace(
      'unlink $_ if (stat($_))[9]<$sessiontimeout;',
      'unlink $_ if (stat($_))[9]<=$sessiontimeout;'),
    configSource,
  }),/phase or call order drift/);
  assert.throws(()=>reviewR4PeriodBackupTail({
    periodSource,configSource:configSource.replace(
      '$BACKUP\t\t=3;','$BACKUP\t\t=2;'),
  }),/original three generations/);
});
test('R4 backup fixture cannot confer durable WorldState or invent partial/unsafe file and session records',()=>{
  const sample=oracle().cases[0].input;
  const before=JSON.stringify(sample);
  for(const extra of [
    {backupGenerations:[sample.backupGenerations[0]]},
    {sessionFiles:[{name:'../escape.cgi',modifiedSeconds:1}]},
    {sessionFiles:[{name:'duplicate.cgi',modifiedSeconds:1},
      {name:'duplicate.cgi',modifiedSeconds:2}]},
    {sessionFiles:[{name:'negative.cgi',modifiedSeconds:-1}]},
    {activeFiles:{...sample.activeFiles,play:42}},
    {activeFiles:{play:'partial'}},
    {nowSeconds:-1},
  ])assert.throws(()=>projectR4PeriodBackupTail({
    reviewed,...sample,...extra,
  }),/R4 original period backup/);
  assert.throws(()=>projectR4PeriodBackupTail({
    reviewed:{...reviewed,committable:true},...sample,
  }),/source-reviewed original backup tail/);
  assert.equal(JSON.stringify(sample),before);
});
