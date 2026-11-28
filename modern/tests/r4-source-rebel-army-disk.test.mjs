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
import {reviewR4ArmyConflict,projectR4ArmyConflictCommand} from '../src/original-r4-army-conflict.mjs';
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
    const {result,staged,armyRead}=await projectRebelArmySandbox({fileReview,directory,reviewed,input:row.input});
    assert.equal(armyRead,row.output.readArmyCalls===1);
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

test('two actual source NOW slices read live army until final commit, then next slice reads committed army',()=>sandbox(async directory=>{
  const m=oracle().multi;
  await writeFile(path.join(directory,'army.cgi'),m.initial);
  let prior=null;
  for(const [i,row] of m.steps.entries()){
    if(prior){
      assert.deepEqual(prior.town,row.input.town);
      assert.deepEqual(prior.shops,row.input.shops);
      assert.equal(prior.activeUntilSeconds,row.input.activeUntilSeconds);
    }
    const input=prior?{...row.input,town:prior.town,shops:prior.shops,activeUntilSeconds:prior.activeUntilSeconds,taxRate:prior.taxRate}:row.input;
    const {result,staged}=await projectRebelArmySandbox({fileReview,directory,reviewed:i===0?reviewed:reviewedNow,input,mode:i===0?'period':'now'});
    for(const [key,value] of Object.entries(row.output))assert.deepEqual(result[key],value,'slice '+i+' '+key);
    assert.deepEqual(parseArmyFile(staged.bytes,[1,2]),parseArmyFile(row.stage,[1,2]));
    assert.equal(await readFile(path.join(directory,'army.cgi'),'utf8'),row.liveBefore);
    if(i>=1)await commitArmySandbox({reviewed:fileReview,directory});
    prior=result;
  }
  assert.equal(m.steps[0].output.armyById[2],2800);
  assert.equal(m.steps[1].output.armyById[2],2800,'same live file, not previous staged 2800 minus 1200');
  assert.equal(m.steps[2].output.armyById[2],1600,'next slice after commit reads 2800');
  assert.deepEqual(parseArmyFile(await readFile(path.join(directory,'army.cgi'),'utf8'),[1,2]),parseArmyFile(m.final,[1,2]));
}));

test('actual original missing/truncated/odd/duplicate army reads differ from safe parser; inactive source does not open army',()=>sandbox(async directory=>{
  const o=oracle(),edge=o.edges;
  assert.deepEqual(edge[0].armyById,{});assert.deepEqual(edge[0].riotIds,[]);
  assert.deepEqual(edge[1].armyById,{2:3000});assert.deepEqual(edge[1].riotIds,[]);
  assert.equal(edge[2].armyById[9],null);assert.equal(edge[3].armyById[2],123);
  for(const r of edge.slice(1))assert.throws(()=>parseArmyFile(r.bytes,[1,2]),/invalid/);
  const inactive=await projectRebelArmySandbox({fileReview,directory,reviewed,input:o.cases[0].input});
  assert.equal(inactive.armyRead,false);assert.equal(inactive.staged,null);
  await assert.rejects(projectRebelArmySandbox({fileReview,directory,reviewed,input:o.cases[3].input}),{code:'ENOENT'});
  assert.deepEqual(await readdir(directory),[]);
}));

test('actual army-s start/join/guard commits lead to three real rebel NOW slices on the same army file',()=>sandbox(async directory=>{
  const conflict=oracle().conflict;
  const conflictReview=reviewR4ArmyConflict({
    armyCommand:await readFile(path.join(sourceDir,'pinned-army-s.cgi'),'utf8'),army:armySource,
    calc:await readFile(path.join(sourceDir,'calc.cgi'),'utf8'),
    config:await readFile(path.join(root,'_config.cgi'),'utf8'),
    view:await readFile(path.join(sourceDir,'pinned-army-view.cgi'),'utf8')
  });
  const ids=[1,2,3,4],live=path.join(directory,'army.cgi');
  await writeFile(live,conflict.initial);
  const modes={rebelon:'start-rebellion',rside:'join-rebellion',lside:'dispatch-guard'};
  let world=null;
  for(const row of conflict.commands){
    if(world)assert.deepEqual(world,row.input.world);
    else world=row.input.world;
    const bytes=await readFile(live,'utf8');
    assert.deepEqual(parseArmyFile(bytes,ids),parseArmyFile(row.input.armyBytes,ids));
    const command={kind:modes[row.mode],expectedRevision:world.revision,shopId:row.id,
      ...(row.mode==='lside'?{}:{confirmation:'rebel'})};
    const p=projectR4ArmyConflictCommand({reviewed:conflictReview,world,armyBytes:bytes,command,requireFacility:true});
    for(const k of ['shops','town','eventState'])assert.deepEqual(p[k],row.output[k],row.mode+' '+k);
    assert.deepEqual(p.receipt.logs,row.output.logs);
    assert.deepEqual(parseArmyFile(p.armyBytes,ids),parseArmyFile(row.output.armyBytes,ids));
    await stageArmySandbox({reviewed:fileReview,directory,shopIds:ids,state:parseArmyFile(p.armyBytes,ids)});
    assert.equal(await readFile(live,'utf8'),bytes);
    await commitArmySandbox({reviewed:fileReview,directory});
    world={...world,revision:world.revision+1,shops:p.shops,period:{town:p.town,eventState:p.eventState}};
  }
  assert.equal(world.period.town.army,10300);
  assert.equal(world.period.town.robina,800);
  assert.equal(world.period.town.safety,5400);
  assert.deepEqual(parseArmyFile(await readFile(live,'utf8'),ids),{armyById:{2:4000,3:4000},riotIds:[2,3]});
  const slim=world.shops.map(({id,name,shopname,money,army})=>({id,name,shopname,money,army}));
  let last={town:world.period.town,shops:slim,activeUntilSeconds:world.period.eventState.rebel,taxRate:0};
  for(const [i,row] of conflict.now.entries()){
    for(const k of ['town','shops','activeUntilSeconds','taxRate'])assert.deepEqual(last[k],row.input[k],i+' '+k);
    const before=await readFile(live,'utf8');
    assert.deepEqual(parseArmyFile(before,ids),parseArmyFile(row.liveBefore,ids));
    const {result,staged}=await projectRebelArmySandbox({fileReview,directory,reviewed:reviewedNow,
      input:{...row.input,...last},mode:'now'});
    for(const [k,v] of Object.entries(row.output))assert.deepEqual(result[k],v,i+' '+k);
    assert.deepEqual(parseArmyFile(staged.bytes,ids),parseArmyFile(row.stage,ids));
    assert.equal(await readFile(live,'utf8'),before);
    if(i>=1)await commitArmySandbox({reviewed:fileReview,directory});
    last={town:result.town,shops:result.shops,activeUntilSeconds:result.activeUntilSeconds,taxRate:result.taxRate};
  }
  assert.equal(conflict.now[0].output.armyById[2],2800);
  assert.equal(conflict.now[1].output.armyById[2],2800,'second slice rereads live, not staged army');
  assert.equal(conflict.now[2].output.armyById[2],1600,'next transaction reads committed army');
  assert.deepEqual(parseArmyFile(await readFile(live,'utf8'),ids),parseArmyFile(conflict.final,ids));
}));

test('actual four committed rebel NOWs preserve zero-army RIOT and transient undef DT.army until suppression',()=>sandbox(async directory=>{
  const z=oracle().zeroRiot,ids=[1,2],live=path.join(directory,'army.cgi');
  await writeFile(live,z.initial);
  let prior=null;
  for(const [i,row] of z.steps.entries()){
    const raw=await readFile(live,'utf8');
    assert.deepEqual(parseArmyFile(raw,ids),parseArmyFile(row.liveBefore,ids));
    const input=prior?{...row.input,town:prior.town,shops:prior.shops,activeUntilSeconds:prior.activeUntilSeconds,taxRate:prior.taxRate}:row.input;
    for(const k of ['town','shops','activeUntilSeconds','taxRate'])assert.deepEqual(input[k],row.input[k],i+' '+k);
    const {result,staged}=await projectRebelArmySandbox({fileReview,directory,reviewed:reviewedNow,input,mode:'now'});
    for(const [k,v] of Object.entries(row.output)){
      // Original WriteArmy mutates the Perl ARMY map by removing zeros;
      // the pure NOW return is pre-write, compare the actual staged bytes.
      if(k!=='armyById')assert.deepEqual(result[k],v,i+' '+k);
    }
    assert.deepEqual(parseArmyFile(staged.bytes,ids),{armyById:row.output.armyById,riotIds:row.output.riotIds});
    assert.deepEqual(parseArmyFile(staged.bytes,ids),parseArmyFile(row.stage,ids));
    assert.equal(await readFile(live,'utf8'),raw);
    await commitArmySandbox({reviewed:fileReview,directory});
    assert.deepEqual(parseArmyFile(await readFile(live,'utf8'),ids),parseArmyFile(row.liveAfter,ids));
    prior=result;
  }
  const [a,b,c,d]=z.steps;
  assert.deepEqual(parseArmyFile(a.stage,ids),{armyById:{1:2800},riotIds:[1,2]});
  assert.equal(a.output.shops[1].army,500);
  assert.equal(b.output.shops[1].army,null,'original undef is distinct from zero');
  assert.equal(b.output.town.army,5200,'zero-soldier RIOT still adds 1200 guard loss');
  assert.equal(c.output.town.army,2800);
  assert.equal(d.output.activeUntilSeconds,null);
  assert.equal(d.output.drawsUsed,0);
  assert.equal(await readFile(live,'utf8'),'\n\n');
  assert.equal(z.final,'\n\n');
}));
