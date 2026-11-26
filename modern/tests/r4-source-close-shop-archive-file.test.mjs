import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,rm,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {
  reviewR4CloseShopEffects,projectR4CloseShopEffects,
} from '../src/original-r4-close-shop-effects.mjs';
import {
  reviewR4CloseShopArchiveSource,appendR4CloseShopArchiveSandbox,projectR4CloseShopArchiveGeneration,
  R4_CLOSE_ARCHIVE_SOURCE,
} from '../src/original-r4-close-shop-archive-file.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const perl=path.join(root,'modern/tests/original-perl');
const [writeSource,readSource,configSource,errorSource,userSource]=await Promise.all([
  readFile(path.join(perl,'write.cgi'),'utf8'),
  readFile(path.join(perl,'inc-func.cgi'),'utf8'),
  readFile(path.join(root,'_config.cgi'),'utf8'),
  readFile(path.join(perl,'pinned-error.cgi'),'utf8'),
  readFile(path.join(perl,'pinned-user.cgi'),'utf8'),
]);
const reviewedClose=reviewR4CloseShopEffects({writeSource,readSource,configSource});
const reviewed=reviewR4CloseShopArchiveSource({errorSource,userSource});
const oracle=()=>JSON.parse(execFileSync('perl',
  ['original-r4-close-shop-archive-file-probe.pl'],
  {cwd:perl,encoding:'utf8',maxBuffer:4*1024*1024},
));
const sandbox=()=>mkdtemp(path.join(os.tmpdir(),'akimono-r4-archive-'));

test('R4 full frozen CloseShop+WriteErrorLog actually append/rotate archived bytes; Node real file writer matches Perl',async()=>{
  assert.equal(reviewed.source,R4_CLOSE_ARCHIVE_SOURCE);
  assert.equal(reviewed.committable,false);
  assert.equal(reviewed.setUserDataIsNoop,true);
  assert.equal(reviewed.logMaxBytes,30000);
  const proof=oracle();
  assert.deepEqual(proof.cases.map(c=>c.kind),
    ['empty','append','rotate','missing']);
  for(const row of proof.cases){
    const dir=await sandbox();
    try {
      const effect=projectR4CloseShopEffects({
        reviewed:reviewedClose,shopId:1,
        shop:row.input.shop,reason:row.input.reason,
        sessionFileNames:['1-alpha.cgi','2-keep.cgi'],
      });
      assert.equal(effect.closed,true);
      assert.deepEqual(effect.shop,row.output.shop,
        'frozen Perl actual CloseShop mutation');
      assert.deepEqual([...effect.deletedSessions],['1-alpha.cgi']);
      assert.deepEqual(row.output.remainingSessions,['2-keep.cgi']);
      if(row.kind!=='missing'){
        const logDir=path.join(dir,'log');
        await mkdir(logDir);
        if(row.input.logPrior!==null)
          await writeFile(path.join(logDir,'delete.cgi'),row.input.logPrior,'utf8');
        const result=await appendR4CloseShopArchiveSandbox({
          reviewed,effect,sandboxDirectory:dir,...row.context,
        });
        assert.equal(result.committable,false);
        assert.equal(result.worldStateWritten,false);
        assert.equal(result.rotated,row.kind==='rotate');
        const previous=row.input.logPrior===null?null:{bytes:row.input.logPrior,mtime:row.context.nowSeconds-1};
        const projected=projectR4CloseShopArchiveGeneration({reviewed,effect,previous,...row.context});
        assert.equal(projected.live.bytes,row.output.liveLog,'immutable archive generation matches actual frozen Perl bytes');
        assert.equal(projected.live.mtime,row.context.nowSeconds);
        assert.equal(projected.rotated,row.kind==='rotate');
        assert.equal(projected.old?.bytes??null,row.output.oldLog);
        if(projected.rotated)assert.equal(projected.old.mtime,previous.mtime);
        const log=await readFile(path.join(logDir,'delete.cgi'),'utf8');
        assert.equal(log,row.output.liveLog,
          row.kind+' real UTF8 original Perl and Node log bytes');
        if(row.kind==='rotate')
          assert.equal(await readFile(path.join(logDir,'delete-old.cgi'),'utf8'),
            row.output.oldLog);
        else assert.equal(row.output.oldLog,null);
        assert.ok(log.includes(effect.archived),
          'archive contains original pre-zero money and original source 32-field record');
      } else {
        assert.equal(row.output.liveLog,null,
          'original silently fails append when directory missing');
        assert.equal(row.output.shop.status,0,
          'source has already changed shop despite failed archival');
        await assert.rejects(
          appendR4CloseShopArchiveSandbox({
            reviewed,effect,sandboxDirectory:dir,...row.context,
          }),{code:'ENOENT'},
          'new safe wrapper never claims successful archival on missing directory');
      }
    } finally {await rm(dir,{recursive:true,force:true});}
  }
});

test('R4 original error/user frozen source drift, fake committable and unsafe log context fail closed',async()=>{
  assert.throws(()=>reviewR4CloseShopArchiveSource({
    errorSource:errorSource.replace('LOG_SIZE_MAX','LOG_WRONG_SIZE_MAX'),
    userSource,
  }),/blob SHA drift/);
  assert.throws(()=>reviewR4CloseShopArchiveSource({
    errorSource,userSource:userSource.replace('sub SetUserData','sub FakeUserData'),
  }),/blob SHA drift/);
  const row=oracle().cases[0];
  const effect=projectR4CloseShopEffects({
    reviewed:reviewedClose,shopId:1,shop:row.input.shop,
    reason:row.input.reason,sessionFileNames:[],
  });
  const dir=await sandbox();
  try {
    await mkdir(path.join(dir,'log'));
    const args={reviewed,effect,sandboxDirectory:dir,...row.context};
    await assert.rejects(appendR4CloseShopArchiveSandbox({
      ...args,reviewed:{...reviewed,committable:true},
    }),/noncommittable CloseShop archive/);
    await assert.rejects(appendR4CloseShopArchiveSandbox({
      ...args,scriptName:'x\ninjection',
    }),/safe TSV string/);
    await assert.rejects(appendR4CloseShopArchiveSandbox({
      ...args,sandboxDirectory:os.tmpdir(),
    }),/isolated temporary sandbox/);
    await assert.rejects(stat(path.join(dir,'log','delete.cgi')),{code:'ENOENT'});
  } finally {await rm(dir,{recursive:true,force:true});}
});

// Pure projection only: do not stage or publish a closed WorldState until
// the shared disk/close integration is reviewed with the B safety guards.
test('D6 immutable archive projection preserves exact UTF8 rotation boundary and rejects unreviewed prior state',()=>{
  const row=oracle().cases[0];
  const effect=projectR4CloseShopEffects({reviewed:reviewedClose,shopId:1,shop:row.input.shop,reason:row.input.reason,sessionFileNames:[]});
  const now=row.context.nowSeconds,prior={bytes:'界'.repeat(10000),mtime:now-2},old={bytes:'previous rotation',mtime:now-3};
  const before=structuredClone({prior,old});
  const append=projectR4CloseShopArchiveGeneration({reviewed,effect,previous:prior,previousOld:old,...row.context});
  assert.equal(append.rotated,false);
  assert.equal(append.live.bytes,prior.bytes+row.output.liveLog);
  assert.deepEqual(append.old,old);
  const rotate=projectR4CloseShopArchiveGeneration({reviewed,effect,previous:{...prior,bytes:prior.bytes+'a'},previousOld:old,...row.context});
  assert.equal(rotate.rotated,true);assert.equal(rotate.live.bytes,row.output.liveLog);
  assert.equal(rotate.old.mtime,prior.mtime);
  assert.throws(()=>projectR4CloseShopArchiveGeneration({reviewed:{...reviewed},effect,...row.context}),/pinned archive review/);
  assert.throws(()=>projectR4CloseShopArchiveGeneration({reviewed,effect,previousOld:old,...row.context}),/old archive requires current archive/);
  assert.throws(()=>projectR4CloseShopArchiveGeneration({reviewed,effect,previous:{...prior,mtime:now+1},...row.context}),/prior archive entry/);
  assert.deepEqual({prior,old},before);
});
