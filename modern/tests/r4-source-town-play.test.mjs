import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdtemp, rm, mkdir, stat} from 'node:fs/promises';
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
  'perl',['original-r4-town-play-probe.pl'],
  {cwd:sourceDir,encoding:'utf8',maxBuffer:1024*1024*8},
));
const sandbox=()=>mkdtemp(path.join(os.tmpdir(),'akimono-r4-town-'));


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
test('actual guildbattle END reads original guild files and changes town, real DataWrite and DataRead preserve multi-key escaped town',async()=>{
  const o=oracle(),directory=await sandbox();
  try{
    await mkdir(path.join(directory,'common'));
    await writeFile(path.join(directory,'guild.cgi'),o.guildDef);await writeFile(path.join(directory,'guildbal.cgi'),o.guildBal);
    for(const [id,c] of Object.entries(o.configs))await writeFile(path.join(directory,'common',id+'.pl'),c);
    let town={};
    for(const row of o.cases){
      assert.deepEqual(town,row.before);
      for(const [i,[key,value]] of row.changes.entries()){
        const changed=setTownData({reviewed:townReview,town,key,value});town=changed.town;
        assert.equal(changed.returned,row.returned[i]);
      }
      assert.deepEqual(town,row.beforeCallback);
      const got=await projectGuildbattleTownSandbox({fileReview:townReview,reviewed:guildReview,directory,town,input:{startSeconds:1000000,spanSeconds:3600,activeUntilSeconds:1003599,randomDraws:[0]}});
      town=got.town;
      assert.equal(got.result.logs[0][2],row.message[1]);
      assert.deepEqual(town,row.input.town);
      for(const [i,key] of o.lookupKeys.entries())assert.equal(getTownData({reviewed:townReview,town,key}),String(row.lookups[i]??''));
      const world={...row.input,town};
      const staged=await stageTownPlay({reviewed:townReview,dataReview:reviewed,directory,world});
      comparePlay(staged.bytes,row.staged);
      await commitTownPlay(readArgs(directory));
      comparePlay(await readFile(path.join(directory,'play.cgi'),'utf8'),row.live);
      town=await readTownPlay(readArgs(directory));
      assert.deepEqual(town,row.input.town);
    }
  }finally{await rm(directory,{recursive:true,force:true})}
});
test('town serializer rejects malformed encoded maps, old strict play path stays strict',()=>{
  const o=oracle(),world=o.cases[0].input;
  assert.throws(()=>reviewTownFiles({custom:custom+' ',read:incFuncSource,write:writeSource}),/source drift/);
  assert.throws(()=>parseTownLine({reviewed:townReview,line:'x,1,x,2'}),/duplicate/);
  assert.throws(()=>parseTownLine({reviewed:townReview,line:'x,%zz'}),/invalid town wire/);
  assert.throws(()=>serializeR4DataWrite({reviewed,world}),/one-key source map/);
  assert.ok(serializeTownPlay({reviewed:townReview,dataReview:reviewed,world}).includes('dominion,beta'));
});
test('town live write failure preserves marker and real staged play; recovery reloads',async()=>{
  const directory=await sandbox(),world=oracle().cases[0].input;
  try{
    await stageTownPlay({reviewed:townReview,dataReview:reviewed,directory,world});
    await mkdir(path.join(directory,'play.cgi'));
    await assert.rejects(commitTownPlay(readArgs(directory)));
    await assert.rejects(readTownPlay(readArgs(directory)),/pending commit/);
    await rm(path.join(directory,'play.cgi'),{recursive:true});
    assert.equal((await commitTownPlay({...readArgs(directory),abort:true})).mode,'recover');
    assert.deepEqual(await readTownPlay(readArgs(directory)),world.town);
  }finally{await rm(directory,{recursive:true,force:true})}
});
