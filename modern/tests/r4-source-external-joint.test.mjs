import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdtemp, rm, mkdir, stat, readdir} from 'node:fs/promises';
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
  'perl',['original-r4-external-joint-probe.pl'],
  {cwd:sourceDir,encoding:'utf8',maxBuffer:1024*1024*8},
));
const sandbox=()=>mkdtemp(path.join(os.tmpdir(),'akimono-r4-external-'));


import {reviewTownFiles,setTownData,getTownData,parseTownLine,serializeTownPlay,projectGuildbattleTownSandbox,readTownPlay,stageTownPlay,commitTownPlay} from '../src/original-r4-town-files.mjs';
import {reviewOriginalCompiledEventCatalog} from '../src/original-event-compiled-catalog.mjs';
import {reviewR4GuildbattleEnd} from '../src/original-r4-guildbattle-end.mjs';
const custom=await readFile(path.join(sourceDir,'pinned-custom.cgi'),'utf8');
const townReview=reviewTownFiles({custom,read:incFuncSource,write:writeSource});
const [itemDsl,rebelDsl,compilerSource,turnSource]=await Promise.all(['custom/inc-item-data.cgi','custom/inc-rebel-data.cgi','modern/tests/original-perl/inc-makeitem.cgi','modern/tests/original-perl/inc-turn.cgi'].map(p=>readFile(path.join(root,p),'utf8')));
const guildReview=reviewR4GuildbattleEnd({rebelDsl,turnSource,compiledCatalog:reviewOriginalCompiledEventCatalog({itemDsl,rebelDsl,compilerSource,turnSource})});
const readArgs=directory=>({reviewed:townReview,directory});
function comparePlay(a,b){
  const x=a.split('\n'),y=b.split('\n');
  assert.deepEqual(parseTownLine({reviewed:townReview,line:x[4]}),parseTownLine({reviewed:townReview,line:y[4]}));
  x[4]='';y[4]='';assert.deepEqual(x,y);
}

import {reviewArmyFiles,projectRebelArmySandbox,parseArmyFile,readArmySandbox} from '../src/original-r4-army-files.mjs';
import {reviewR4RebelNow} from '../src/original-r4-rebel-now.mjs';
import {reviewExternalFiles,stageEventGuildLedger,commitExternalFiles} from '../src/original-r4-external-files-sandbox.mjs';
import {parseGuildEventLedgers,parseGuildLedgers} from '../src/original-r4-guild-files.mjs';
const armySource=await readFile(path.join(sourceDir,'pinned-army.cgi'),'utf8');
const guildSource=await readFile(path.join(sourceDir,'pinned-guild.cgi'),'utf8');
const periodSource=await readFile(path.join(sourceDir,'period.cgi'),'utf8');
const armyReview=reviewArmyFiles({army:armySource,turn:turnSource,write:writeSource});
const rebelReview=reviewR4RebelNow({rebelDsl,turnSource,periodSource,compiledCatalog:reviewOriginalCompiledEventCatalog({itemDsl,rebelDsl,compilerSource,turnSource})});
const externalReview=reviewExternalFiles({write:writeSource,guild:guildSource,turn:turnSource});
async function fixture(fn){
  const o=oracle(),directory=await sandbox();
  try{
    await mkdir(path.join(directory,'common'));
    await writeFile(path.join(directory,'guild.cgi'),o.guildDef);await writeFile(path.join(directory,'guildbal.cgi'),o.guildBal);
    await writeFile(path.join(directory,'army.cgi'),o.armyInitial);
    for(const [id,c] of Object.entries(o.configs))await writeFile(path.join(directory,'common',id+'.pl'),c);
    await fn({o,directory});
  }finally{await rm(directory,{recursive:true,force:true})}
}
const full=['army.cgi','guildbal.cgi','play.cgi'];
async function stageRound({row,directory,town}){
  for(const [key,value] of row.changes)town=setTownData({reviewed:townReview,town,key,value}).town;
  assert.deepEqual(town,row.beforeCallback);
  const e=row.eventInput;
  const guild=await projectGuildbattleTownSandbox({fileReview:townReview,reviewed:guildReview,directory,town,input:{
    startSeconds:e.startSeconds,spanSeconds:e.spanSeconds,activeUntilSeconds:e.guildActiveUntilSeconds,randomDraws:[0],
  }});
  const logs=[...guild.result.logs],ranges=[...guild.result.randomDrawRanges];
  let city=e.town,shops=e.shops,events={};
  if(e.activeUntilSeconds!==null){
    const army=await projectRebelArmySandbox({fileReview:armyReview,reviewed:rebelReview,directory,mode:'now',input:{
      startSeconds:e.startSeconds,spanSeconds:e.spanSeconds,activeUntilSeconds:e.activeUntilSeconds,town:city,shops,randomDraws:[],
    }});
    city=army.result.town;shops=army.result.shops;
    logs.push(...army.result.logs);ranges.push(...army.result.randomDrawRanges);
    assert.equal(army.result.activeUntilSeconds,null);
    assert.deepEqual(parseArmyFile(army.staged.bytes,[1]),parseArmyFile(row.armyStage,[1]));
  }else ranges.push(100000); // explicit second source zero START gate, no active rebel NOW
  assert.deepEqual(city,row.eventOutput.town);
  assert.deepEqual(shops,row.eventOutput.shops);
  assert.deepEqual(logs,row.eventOutput.logs);
  assert.deepEqual(ranges,row.eventOutput.ranges);
  assert.deepEqual(events,row.eventOutput.events);
  const bal=await stageEventGuildLedger({reviewed:externalReview,directory,ledgers:guild.ledgerAfter});
  assert.deepEqual(parseGuildEventLedgers(bal.bytes),parseGuildEventLedgers(row.guildStage));
  const world={...row.input,state:city,town:guild.town,events,shops:row.input.shops.map(s=>({...s,money:shops.find(x=>x.id===Number(s.id))?.money??s.money}))};
  const play=await stageTownPlay({reviewed:townReview,dataReview:reviewed,directory,world});
  comparePlay(play.bytes,row.staged);
  assert.equal(await readFile(path.join(directory,'army.cgi'),'utf8'),row.armyLiveBefore);
  assert.deepEqual(parseGuildEventLedgers(await readFile(path.join(directory,'guildbal.cgi'),'utf8')),parseGuildEventLedgers(row.guildLiveBefore));
  return guild.town;
}
test('real two-event source turn stages army, transient guild ledger and town play together, then reloads next turn',()=>fixture(async({o,directory})=>{
  let town={};
  for(const [i,row] of o.cases.entries()){
    assert.deepEqual(town,row.before);
    town=await stageRound({row,directory,town});
    const expectedFiles=i===0?full:full.slice(1);
    await commitExternalFiles({reviewed:externalReview,directory,expectedFiles});
    comparePlay(await readFile(path.join(directory,'play.cgi'),'utf8'),row.live);
    assert.deepEqual(parseGuildEventLedgers(await readFile(path.join(directory,'guildbal.cgi'),'utf8')),parseGuildEventLedgers(row.guildLive));
    assert.deepEqual(await readArmySandbox({reviewed:armyReview,directory,shopIds:[1]}),parseArmyFile(row.armyLive,[1]));
    town=await readTownPlay(readArgs(directory));
  }
  const bal=await readFile(path.join(directory,'guildbal.cgi'),'utf8');
  assert.equal(parseGuildEventLedgers(bal).beta.guild,'beta');
  assert.throws(()=>parseGuildLedgers(bal),/shape/,'older five-field ledger contract remains strict');
}));
test('joint real third-file rename failure keeps partial commit and prevents reads until recovery',()=>fixture(async({o,directory})=>{
  const row=o.cases[0];await stageRound({row,directory,town:{}});
  await mkdir(path.join(directory,'play.cgi'));
  const args={reviewed:externalReview,directory,expectedFiles:full};
  await assert.rejects(commitExternalFiles(args));
  assert.deepEqual(await readdir(path.join(directory,'stage')),['play.cgi']);
  assert.equal(await readFile(path.join(directory,'commit.cgi'),'utf8'),'');
  await assert.rejects(readArmySandbox({reviewed:armyReview,directory,shopIds:[1]}),/pending commit/);
  await assert.rejects(readTownPlay(readArgs(directory)),/pending commit/);
  await rm(path.join(directory,'play.cgi'),{recursive:true});
  assert.equal((await commitExternalFiles({...args,abort:true})).mode,'recover');
  comparePlay(await readFile(path.join(directory,'play.cgi'),'utf8'),row.live);
  assert.deepEqual(parseGuildEventLedgers(await readFile(path.join(directory,'guildbal.cgi'),'utf8')),parseGuildEventLedgers(row.guildLive));
  assert.deepEqual(await readArmySandbox({reviewed:armyReview,directory,shopIds:[1]}),parseArmyFile(row.armyLive,[1]));
}));

test('joint incomplete stage cannot be committed; no marker abort keeps original files',()=>fixture(async({o,directory})=>{
  const row=o.cases[0];await stageRound({row,directory,town:{}});
  await rm(path.join(directory,'stage','guildbal.cgi'));
  const args={reviewed:externalReview,directory,expectedFiles:full};
  await assert.rejects(commitExternalFiles(args),/incomplete stage/);
  assert.equal(await readFile(path.join(directory,'army.cgi'),'utf8'),o.armyInitial);
  assert.equal(await readFile(path.join(directory,'guildbal.cgi'),'utf8'),o.guildBal);
  await assert.rejects(stat(path.join(directory,'commit.cgi')),{code:'ENOENT'});
  assert.equal((await commitExternalFiles({...args,abort:true})).mode,'discard');
  assert.deepEqual(await readdir(path.join(directory,'stage')),[]);
}));
