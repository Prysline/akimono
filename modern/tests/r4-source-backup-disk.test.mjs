import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,rm,stat,utimes,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {reviewBackupDisk,dataWriteBackupDisk,rotatePeriodBackupDisk} from '../src/original-r4-backup-disk.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),perl=path.join(root,'modern/tests/original-perl');
const [period,write,config]=await Promise.all(['modern/tests/original-perl/period.cgi','modern/tests/original-perl/write.cgi','_config.cgi'].map(p=>readFile(path.join(root,p),'utf8')));
const reviewed=reviewBackupDisk({period,write,config});
const run=n=>JSON.parse(execFileSync('perl',[n],{cwd:perl,encoding:'utf8'}));
async function sandbox(fn){const directory=await mkdtemp(path.join(os.tmpdir(),'akimono-r4-period-disk-'));try{await fn(directory)}finally{await rm(directory,{recursive:true,force:true})}}
async function seed(dir,files){await mkdir(dir,{recursive:true});for(const [k,v] of Object.entries(files))await writeFile(path.join(dir,k+'.cgi'),v)}
async function snapshot(dir,keys){const out={};for(const k of keys)out[k]=await readFile(path.join(dir,k+'.cgi'),'utf8');return out}
test('actual DataFilesBackup and DataWrite prelude mtime older/equal/newer and lasttime match Node disk',async()=>{
  for(const row of run('original-r4-data-files-backup-probe.pl').cases.slice(0,3))await sandbox(async directory=>{
    await seed(directory,row.live);await seed(path.join(directory,'backup'),row.prior);
    await writeFile(path.join(directory,'lasttime.cgi'),'clock');await utimes(path.join(directory,'backup','play.cgi'),row.mtime,row.mtime);
    const r=await dataWriteBackupDisk({reviewed,directory,nowSeconds:row.now,lasttime:row.lasttime});
    assert.equal(r.copied,row.mode==='older');
    assert.deepEqual(await snapshot(path.join(directory,'backup'),Object.keys(row.prior)),row.after);
    assert.equal(Math.floor((await stat(path.join(directory,'lasttime.cgi'))).mtimeMs/1000),row.clock);
  });
});
test('real original backup partial copy on missing input or invalid destination, Node preflight rejects before writes',async()=>{
  const rows=run('original-r4-data-files-backup-probe.pl').cases.slice(3);
  assert.equal(rows[0].after.log1,'');assert.equal(rows[0].after.log2,rows[0].live.log2);
  assert.equal(rows[1].after.log1,null);assert.equal(rows[1].after.log2,rows[1].live.log2);
  for(const row of rows)await sandbox(async directory=>{
    await seed(directory,row.live);const backup=path.join(directory,'backup');await seed(backup,row.prior);
    if(row.mode==='destination-directory')await mkdir(path.join(backup,'log1.cgi'));
    await writeFile(path.join(directory,'lasttime.cgi'),'clock');await utimes(path.join(directory,'lasttime.cgi'),1,1);
    await utimes(path.join(backup,'play.cgi'),row.mtime,row.mtime);
    await assert.rejects(dataWriteBackupDisk({reviewed,directory,nowSeconds:row.now,lasttime:row.lasttime}));
    assert.deepEqual(await snapshot(backup,Object.keys(row.prior)),row.prior);
    assert.equal(Math.floor((await stat(path.join(directory,'lasttime.cgi'))).mtimeMs/1000),1);
  });
});
test('real Node rotation and session mtime unlink match two original Perl source tails',()=>sandbox(async directory=>{
  const proof=run('original-r4-period-backup-tail-probe.pl'),first=proof.cases[0].input;
  for(const [i,files] of first.backupGenerations.entries())await seed(path.join(directory,'backup'+(i+1)),files);
  const session=path.join(directory,'session');await mkdir(session);
  for(const s of first.sessionFiles){const p=path.join(session,s.name);await writeFile(p,'session');await utimes(p,s.modifiedSeconds,s.modifiedSeconds)}
  for(const row of proof.cases){
    await seed(directory,row.input.activeFiles);
    const r=await rotatePeriodBackupDisk({reviewed,directory,nowSeconds:row.input.nowSeconds});
    assert.deepEqual(r.deletedSessions.sort(),row.output.deletedSessions.sort());
    for(const [i,files] of row.output.backupGenerations.entries())assert.deepEqual(await snapshot(path.join(directory,'backup'+(i+1)),Object.keys(files)),files);
    assert.deepEqual((await readdir(session)).sort(),row.output.remainingSessions.map(s=>s.name).sort());
  }
}));
test('rotation rejects missing live input and unfinished work directory without rewriting backups',()=>sandbox(async directory=>{
  const row=run('original-r4-period-backup-tail-probe.pl').cases[0].input;
  await seed(directory,row.activeFiles);for(const [i,files] of row.backupGenerations.entries())await seed(path.join(directory,'backup'+(i+1)),files);
  await mkdir(path.join(directory,'session'));await mkdir(path.join(directory,'backup_work'));
  await assert.rejects(rotatePeriodBackupDisk({reviewed,directory,nowSeconds:row.nowSeconds}),/unfinished rotation/);
  await rm(path.join(directory,'backup_work'),{recursive:true});await rm(path.join(directory,'log1.cgi'));
  await assert.rejects(rotatePeriodBackupDisk({reviewed,directory,nowSeconds:row.nowSeconds}),{code:'ENOENT'});
  assert.deepEqual(await snapshot(path.join(directory,'backup1'),Object.keys(row.activeFiles)),row.backupGenerations[0]);
  assert.throws(()=>reviewBackupDisk({period:period+' ',write,config}),/source drift/);
}));
