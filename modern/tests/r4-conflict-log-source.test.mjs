import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdtemp,rm,mkdir,writeFile,readFile,utimes,rename} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import {reviewR4ArmyConflict,projectR4ArmyConflictCommand} from '../src/original-r4-army-conflict.mjs';
import {reviewPeriodLog,projectReviewedArmyConflictLogRows,projectReviewedEventLogRows,renewPeriodLogDisk} from '../src/original-r4-period-log-disk.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const commandSources={armyCommand:read('./original-perl/pinned-army-s.cgi'),army:read('./original-perl/pinned-army.cgi'),
 calc:read('./original-perl/calc.cgi'),config:read('../../_config.cgi'),view:read('./original-perl/pinned-army-view.cgi')};
const logSources={log:read('./original-perl/pinned-log.cgi'),period:read('./original-perl/period.cgi'),
 dsl:read('../../custom/inc-item-data.cgi'),config:commandSources.config};
const reviewed=reviewPeriodLog({...logSources,armyCommand:commandSources.armyCommand});
const plain=reviewPeriodLog(logSources),conflict=reviewR4ArmyConflict(commandSources);
const probe=(p,input)=>JSON.parse(execFileSync('perl',[fileURLToPath(new URL('./original-perl/'+p,import.meta.url))],
 {encoding:'utf8',...(input?{input:JSON.stringify(input)}:{})}));
const oracle=probe('original-r4-army-conflict-probe.pl');
const modes={rebelon:'start-rebellion',rside:'join-rebellion',lside:'dispatch-guard'};
const selected=['start-exact','join-exact','guard-volunteer','guard-leader'];
const rows=selected.map(n=>{
 const r=oracle.cases.find(x=>x.name===n);assert.ok(r?.ok,n);
 const candidate=projectR4ArmyConflictCommand({reviewed:conflict,world:r.world,armyBytes:r.armyBytes,
  command:{kind:modes[r.mode],expectedRevision:r.world.revision,shopId:1,...(r.mode==='lside'?{}:{confirmation:'rebel'})},requireFacility:true});
 assert.deepEqual(candidate.receipt.logs,r.logs);
 return {candidate,calls:r.logs};
});
const now=1000000,calls=rows.flatMap(r=>r.calls);
const expected=rows.flatMap(r=>projectReviewedArmyConflictLogRows({reviewed,candidate:r.candidate,nowSeconds:now})).reverse();
assert.deepEqual(calls.map(c=>c[0]),[2,3,3]);
for(const rotate of [false,true])test('original conflict mode 3 log '+(rotate?'rotation':'append')+' and filtered read',async()=>{
 const initial=['999000\t0\t1\tprior personal\n','998000\t3\t0\tprior public\n','997000\t2\t0\tolder\n'];
 const mtime=rotate?now-129601:now-129600;
 const original=probe('original-r4-conflict-log-probe.pl',{initial,mtime,calls,nowSeconds:now});
 assert.deepEqual(expected,original.rows);
 const directory=await mkdtemp(path.join(os.tmpdir(),'akimono-r4-period-disk-'));
 try{
  await mkdir(path.join(directory,'stage'));
  for(let i=0;i<3;i++)await writeFile(path.join(directory,'log'+i+'.cgi'),initial[i]);
  await utimes(path.join(directory,'log1.cgi'),mtime,mtime);
  await assert.rejects(renewPeriodLogDisk({reviewed:plain,directory,rows:expected,nowSeconds:now}),/explicit accumulated log rows/);
  const got=await renewPeriodLogDisk({reviewed,directory,rows:expected,nowSeconds:now});
  assert.equal(got.rotated,rotate);assert.equal(got.bytes,original.staged);
  for(let i=0;i<3;i++){
    const actual=await readFile(path.join(directory,'log'+i+'.cgi'),'utf8').catch(e=>{if(e.code==='ENOENT')return null;throw e;});
    assert.equal(actual,original.before[i]);
  }
  // Isolated Node publication adapter, original Perl uses real DataCommitOrAbort.
  await rename(path.join(directory,'stage','log0.cgi'),path.join(directory,'log0.cgi'));
  const final=await Promise.all([0,1,2].map(i=>readFile(path.join(directory,'log'+i+'.cgi'),'utf8')));
  assert.deepEqual(final,original.after);
  assert.deepEqual([...final[0].matchAll(/^\d+\t3\t(?:0|1)\t[^\n]*\n/gm),...final[1].matchAll(/^\d+\t3\t(?:0|1)\t[^\n]*\n/gm)].map(m=>m[0]),original.messages);
 }finally{await rm(directory,{recursive:true,force:true})}
});
test('mode 3 requires conflict source review and never widens normal EVENT log authority',()=>{
 assert.throws(()=>reviewPeriodLog({...logSources,armyCommand:commandSources.armyCommand+' '}),/source drift armyCommand/);
 const candidate=rows[1].candidate;
 assert.throws(()=>projectReviewedArmyConflictLogRows({reviewed:plain,candidate,nowSeconds:now}),/reviewed army conflict/);
 assert.throws(()=>projectReviewedEventLogRows({reviewed,logs:candidate.receipt.logs,nowSeconds:now}),/unreviewed log row/);
 assert.throws(()=>projectReviewedArmyConflictLogRows({reviewed,candidate:{...candidate,receipt:{...candidate.receipt,logs:[[2,0,'wrong mode']]}},nowSeconds:now}),/original conflict log mode/);
});
