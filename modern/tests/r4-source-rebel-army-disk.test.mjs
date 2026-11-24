import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm,mkdir,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {reviewArmyFiles,parseArmyFile,serializeArmyFile,readArmySandbox,stageArmySandbox,commitArmySandbox,projectRebelArmySandbox} from '../src/original-r4-army-files.mjs';
import {fileURLToPath} from 'node:url';
import {reviewOriginalCompiledEventCatalog}
  from '../src/original-event-compiled-catalog.mjs';
import {reviewR4RebelNow} from '../src/original-r4-rebel-now.mjs';
import {reviewR4RebelPeriodTrigger}
  from '../src/original-r4-rebel-period-trigger.mjs';
import {reviewR4RebelPeriodToNow,projectR4RebelPeriodToNow,
  R4_REBEL_PERIOD_NOW_SOURCE}
  from '../src/original-r4-rebel-period-to-now.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const paths=[
  'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
  'modern/tests/original-perl/inc-makeitem.cgi',
  'modern/tests/original-perl/inc-turn.cgi',
  'modern/tests/original-perl/period.cgi',
];
const [itemDsl,rebelDsl,compilerSource,turnSource,periodSource]=
  await Promise.all(paths.map(p=>readFile(path.join(root,p),'utf8')));
const catalog=reviewOriginalCompiledEventCatalog({
  itemDsl,rebelDsl,compilerSource,turnSource,
});
const reviewedNow=reviewR4RebelNow({
  rebelDsl,turnSource,periodSource,compiledCatalog:catalog,
});
const reviewedPeriod=reviewR4RebelPeriodTrigger({
  periodSource,reviewedRebelNow:reviewedNow,
});
const review=(over={})=>reviewR4RebelPeriodToNow({
  turnSource,reviewedNow,reviewedPeriod,...over,
});
const reviewed=review();
const oracle=()=>JSON.parse(execFileSync('perl',
  ['original-r4-rebel-army-disk-probe.pl'],{
    cwd:path.join(root,'modern/tests/original-perl'),
    encoding:'utf8',
  }));

const sourceDir=path.join(root,'modern/tests/original-perl');
const armySource=await readFile(path.join(sourceDir,'pinned-army.cgi'),'utf8'),write=await readFile(path.join(sourceDir,'write.cgi'),'utf8');
const fileReview=reviewArmyFiles({army:armySource,turn:turnSource,write});
async function sandbox(fn){const directory=await mkdtemp(path.join(os.tmpdir(),'akimono-r4-army-'));try{await fn(directory)}finally{await rm(directory,{recursive:true,force:true})}}
test('actual Perl period->rebel NOW reads and stages army.cgi; Node uses actual files and reloads after commit',async()=>{
  for(const row of oracle().cases)await sandbox(async directory=>{
    const live=path.join(directory,'army.cgi');await writeFile(live,row.initialArmy);
    const {result,staged}=await projectRebelArmySandbox({fileReview,directory,reviewed,input:row.input});
    for(const k of ['town','shops','riotIds','armyById','activeUntilSeconds','eventState','eventPersisted','logs','randomDrawRanges','drawsUsed','taxRate','readArmyCalls','writeArmyCalls'])
      assert.deepEqual(result[k],row.output[k],row.name+' '+k);
    assert.equal(await readFile(live,'utf8'),row.initialArmy);
    if(row.stagedArmy!==null){
      assert.ok(staged);assert.deepEqual(parseArmyFile(staged.bytes,[1,2]),parseArmyFile(row.stagedArmy,[1,2]));
    }else assert.equal(staged,null);
    await commitArmySandbox({reviewed:fileReview,directory});
    assert.deepEqual(await readArmySandbox({reviewed:fileReview,directory,shopIds:[1,2]}),row.reloaded);
    assert.deepEqual(parseArmyFile(await readFile(live,'utf8'),[1,2]),parseArmyFile(row.liveArmy,[1,2]));
    assert.equal(result.committable,false);
  });
});
test('army file parser preserves stale army until write and filters riot on read, rejects malformed wire',()=>{
  assert.deepEqual(parseArmyFile('1,0,2,200,9,40\n1,9\n',[1,2]),{armyById:{1:0,2:200,9:40},riotIds:[1]});
  assert.equal(serializeArmyFile({armyById:{1:0,2:200,9:40},riotIds:[1,9]},[1,2]),'2,200\n1,9\n');
  assert.throws(()=>parseArmyFile('1,2,1,3\n\n',[1]),/invalid army pair/);
  assert.throws(()=>parseArmyFile('1,2\n',[1]),/two-line/);
  assert.throws(()=>reviewArmyFiles({army:armySource+' ',turn:turnSource,write}),/source drift/);
});
test('two stages replace rather than append, read still uses live; rename failure preserves marker for recovery',()=>sandbox(async directory=>{
  const args={reviewed:fileReview,directory,shopIds:[1]};
  const live=path.join(directory,'army.cgi');
  await writeFile(live,'1,3000\n1\n');
  await stageArmySandbox({...args,state:{armyById:{1:1800},riotIds:[1]}});
  assert.deepEqual(await readArmySandbox(args),{armyById:{1:3000},riotIds:[1]});
  await stageArmySandbox({...args,state:{armyById:{1:900},riotIds:[1]}});
  assert.equal(await readFile(path.join(directory,'stage','army.cgi'),'utf8'),'1,900\n1\n');
  await rm(live);await mkdir(live);
  await assert.rejects(commitArmySandbox(args));
  await assert.rejects(readArmySandbox(args),/pending commit/);
  assert.equal(await readFile(path.join(directory,'commit.cgi'),'utf8'),'');
  await rm(live,{recursive:true});
  assert.equal((await commitArmySandbox({...args,abort:true})).mode,'recover');
  assert.deepEqual(await readArmySandbox(args),{armyById:{1:900},riotIds:[1]});
  await stageArmySandbox({...args,state:{armyById:{1:0},riotIds:[]}});
  assert.equal((await commitArmySandbox({...args,abort:true})).mode,'discard');
  assert.equal(await readFile(live,'utf8'),'1,900\n1\n');
  assert.deepEqual(await readdir(path.join(directory,'stage')),[]);
}));
