import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, mkdtemp, rm, mkdir, stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {
  R4_DATA_WRITE_SOURCE,reviewR4DataWriteFiles,serializeR4DataWrite,
  stageR4DataWriteSandbox,commitR4DataWriteSandbox,
} from '../src/original-r4-data-write-files.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const sourceDir=path.join(root,'modern/tests/original-perl');
const [writeSource,incFuncSource,detailSource,configSource]=await Promise.all([
  readFile(path.join(sourceDir,'write.cgi'),'utf8'),
  readFile(path.join(sourceDir,'inc-func.cgi'),'utf8'),
  readFile(path.join(sourceDir,'core-detail.cgi'),'utf8'),
  readFile(path.join(root,'_config.cgi'),'utf8'),
]);
const reviewed=reviewR4DataWriteFiles({
  writeSource,incFuncSource,detailSource,configSource,
});
const oracle=()=>JSON.parse(execFileSync(
  'perl',['original-r4-data-write-files-probe.pl'],
  {cwd:sourceDir,encoding:'utf8',maxBuffer:1024*1024*8},
));
const sandbox=()=>mkdtemp(path.join(os.tmpdir(),'akimono-r4-dw-'));

test('R4 frozen DataWrite two-period actual Perl play.cgi bytes equal Node serializer and real Node disk writes',async()=>{
  assert.equal(reviewed.source,R4_DATA_WRITE_SOURCE);
  assert.equal(reviewed.committable,false);
  assert.equal(reviewed.actualFileIOCommitted,false);
  assert.equal(reviewed.shopFields.length,32);
  assert.equal(reviewed.stateFields.length,11);
  const proof=oracle();
  assert.equal(proof.cases.length,2);
  const dir=await sandbox();
  try {
    for (const [i,entry] of proof.cases.entries()) {
      const serialized=serializeR4DataWrite({reviewed,world:entry.input});
      assert.equal(Buffer.compare(Buffer.from(serialized),Buffer.from(entry.staged)),0,
        'period '+(i+1)+' byte-for-byte staged original Perl write');
      assert.equal(entry.staged,entry.live);
      assert.equal(entry.commitMarkerGone,true);
      assert.equal(entry.stagedMoved,true);
      await stageR4DataWriteSandbox({reviewed,world:entry.input,sandboxDirectory:dir});
      assert.deepEqual(await readFile(path.join(dir,'temp','play.cgi')),
        Buffer.from(entry.staged),'actual Node staged file bytes');
      const result=await commitR4DataWriteSandbox({reviewed,sandboxDirectory:dir});
      assert.deepEqual(result,{mode:'commit',committable:false});
      assert.deepEqual(await readFile(path.join(dir,'play.cgi')),
        Buffer.from(entry.live),'actual Node live file bytes');
      await assert.rejects(stat(path.join(dir,'commit.cgi')),{code:'ENOENT'});
    }
    assert.equal(proof.cases[0].input.shops.length,2);
    assert.equal(proof.cases[1].input.shops.length,1,
      'second period actually DataRead reloads first period and prunes stopped shop');
    assert.notEqual(proof.cases[0].live,proof.cases[1].live);
  } finally {await rm(dir,{recursive:true,force:true});}
});

test('R4 source drift, unreviewed hash ordering and malformed source fields fail closed',()=>{
  assert.throws(()=>reviewR4DataWriteFiles({
    writeSource:writeSource.replace('next if !$DT->{status};','next if $DT->{status};'),
    incFuncSource,detailSource,configSource,
  }),/SHA drift/);
  const world=oracle().cases[0].input;
  assert.throws(()=>serializeR4DataWrite({reviewed,world:{
    ...world, events:{one:1,two:2},
  }}),/one-key source map/);
  assert.throws(()=>serializeR4DataWrite({reviewed,world:{
    ...world,wholesale:world.wholesale.slice(1),
  }}),/79 source ITEM/);
  assert.throws(()=>serializeR4DataWrite({reviewed,world:{
    ...world,shops:[{...world.shops[0],shopname:'unsafe,delimiter'}],
  }}),/unreviewed delimiter/);
  assert.throws(()=>serializeR4DataWrite({reviewed:{
    ...reviewed,committable:true,
  },world}),/noncommittable schema/);
});

test('R4 real filesystem rename failure keeps stage and marker; recovery moves bytes without fake success',async()=>{
  const world=oracle().cases[0].input;
  const dir=await sandbox();
  try {
    await stageR4DataWriteSandbox({reviewed,world,sandboxDirectory:dir});
    await mkdir(path.join(dir,'play.cgi'));
    await assert.rejects(commitR4DataWriteSandbox({
      reviewed,sandboxDirectory:dir,
    }),/EISDIR|ENOTEMPTY|EEXIST/);
    assert.equal((await stat(path.join(dir,'commit.cgi'))).isFile(),true);
    assert.equal((await stat(path.join(dir,'temp','play.cgi'))).isFile(),true);
    await rm(path.join(dir,'play.cgi'),{recursive:true});
    const recovered=await commitR4DataWriteSandbox({
      reviewed,sandboxDirectory:dir,abort:true,
    });
    assert.deepEqual(recovered,{mode:'recover',committable:false});
    assert.equal(await readFile(path.join(dir,'play.cgi'),'utf8'),
      serializeR4DataWrite({reviewed,world}));
    await assert.rejects(stat(path.join(dir,'commit.cgi')),{code:'ENOENT'});
  } finally {await rm(dir,{recursive:true,force:true});}
});

test('R4 abort without marker performs actual unlink, and unsafe sandbox paths are refused',async()=>{
  const world=oracle().cases[0].input;
  const dir=await sandbox();
  try{
    await stageR4DataWriteSandbox({reviewed,world,sandboxDirectory:dir});
    assert.deepEqual(await commitR4DataWriteSandbox({
      reviewed,sandboxDirectory:dir,abort:true,
    }),{mode:'discard',committable:false});
    await assert.rejects(stat(path.join(dir,'temp','play.cgi')),{code:'ENOENT'});
    await assert.rejects(stageR4DataWriteSandbox({
      reviewed,world,sandboxDirectory:os.tmpdir(),
    }),/isolated mkdtemp/);
  } finally {await rm(dir,{recursive:true,force:true});}
});
