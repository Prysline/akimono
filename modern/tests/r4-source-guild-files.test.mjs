import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,rm,readdir,rename} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {reviewGuildFiles,stageGuildFiles,commitGuildFiles,parseGuildDefinition,parseGuildLedgers} from '../src/original-r4-guild-files.mjs';
const perl=path.join(path.dirname(fileURLToPath(import.meta.url)),'original-perl');
const sources=Object.fromEntries(await Promise.all(['guildsub','config','sub','guild','write'].map(async k=>[k,await readFile(path.join(perl,(k==='write'?'':'pinned-')+k+'.cgi'),'utf8')])));
const reviewed=reviewGuildFiles(sources);
const oracle=()=>JSON.parse(execFileSync('perl',['original-r4-guild-files-probe.pl'],{cwd:perl,encoding:'utf8'}));
async function fixture(fn){
  const o=oracle(),directory=await mkdtemp(path.join(os.tmpdir(),'akimono-r4-guild-'));
  try{
    await mkdir(path.join(directory,'common'));await mkdir(path.join(directory,'stage'));
    await writeFile(path.join(directory,'guild.cgi'),o.initialDef);
    await writeFile(path.join(directory,'guildbal.cgi'),o.initialBal);
    for(const [id,c] of Object.entries(o.configs))await writeFile(path.join(directory,'common',id+'.pl'),c);
    const args={reviewed,directory,shops:o.shops,edits:[{guildId:'alpha',amount:120},{guildId:'alpha',amount:-40},{guildId:'old',amount:0}]};
    await fn({o,directory,args});
  }finally{await rm(directory,{recursive:true,force:true})}
}
test('actual Perl ReadGuild/ReadConfig/MakeGuildFile and ReadGuildData/EditGuildMoney/WriteGuildData agree with Node semantic disk contents; no hash order claim',async()=>fixture(async({o,directory,args})=>{
  const result=await stageGuildFiles(args);
  assert.deepEqual(result.definitions,o.definitions);assert.deepEqual(result.ledger,o.ledger);
  assert.deepEqual(result.shops,o.afterShops);assert.deepEqual(result.removed,['old']);assert.deepEqual(result.added,['beta']);assert.deepEqual(result.logCalls,o.logs);
  assert.deepEqual(Object.keys(result.ledger).sort(),o.oldKeys);
  assert.deepEqual(parseGuildDefinition(await readFile(path.join(directory,'stage','guild.cgi'),'utf8')),parseGuildDefinition(o.definitionBytes));
  assert.deepEqual(parseGuildLedgers(await readFile(path.join(directory,'stage','guildbal.cgi'),'utf8')),parseGuildLedgers(o.ledgerBytes));
  assert.equal(result.committable,false);assert.equal(result.worldStateWritten,false);
  assert.equal((await commitGuildFiles(args)).mode,'commit');
  assert.deepEqual(parseGuildDefinition(await readFile(path.join(directory,'guild.cgi'),'utf8')),o.definitions);
  assert.deepEqual(parseGuildLedgers(await readFile(path.join(directory,'guildbal.cgi'),'utf8')),o.ledger);
  await assert.rejects(stageGuildFiles(args),/live guild and ledger mismatch/);
}));
test('real second rename failure leaves marker and one staged file; restart completes remaining guild files, not rollback',async()=>fixture(async({o,directory,args})=>{
  await stageGuildFiles(args);
  const bal=path.join(directory,'guildbal.cgi');
  await rename(bal,bal+'.old');await mkdir(bal);
  await assert.rejects(commitGuildFiles(args));
  assert.deepEqual(await readdir(path.join(directory,'stage')),['guildbal.cgi']);
  assert.equal(await readFile(path.join(directory,'commit.cgi'),'utf8'),'');
  assert.deepEqual(parseGuildDefinition(await readFile(path.join(directory,'guild.cgi'),'utf8')),o.definitions);
  await rm(bal,{recursive:true});await rename(bal+'.old',bal);
  assert.equal((await commitGuildFiles({...args,abort:true})).mode,'recover');
  assert.deepEqual(parseGuildLedgers(await readFile(bal,'utf8')),o.ledger);
  assert.deepEqual(await readdir(path.join(directory,'stage')),[]);
  await assert.rejects(readFile(path.join(directory,'commit.cgi')),{code:'ENOENT'});
  assert.equal(o.recovered,true);assert.equal(o.partialPending.length,1);
}));
test('no marker abort discards stages, rejects invalid source/config/missing ledger before writes',async()=>fixture(async({o,directory,args})=>{
  await stageGuildFiles(args);
  assert.equal((await commitGuildFiles({...args,abort:true})).mode,'discard');
  assert.equal(await readFile(path.join(directory,'guild.cgi'),'utf8'),o.initialDef);
  assert.equal(await readFile(path.join(directory,'guildbal.cgi'),'utf8'),o.initialBal);
  assert.throws(()=>reviewGuildFiles({...sources,config:sources.config+' '}),/source drift/);
  await writeFile(path.join(directory,'common','alpha.pl'),"shortname=x\nfeerate=abc\n");
  await assert.rejects(stageGuildFiles(args),/missing definition field/);
  assert.deepEqual(await readdir(path.join(directory,'stage')),[]);
  await rm(path.join(directory,'guildbal.cgi'));
  await assert.rejects(stageGuildFiles(args),{code:'ENOENT'});
  assert.deepEqual(await readdir(path.join(directory,'stage')),[]);
}));

test('incomplete stage without marker cannot be committed; discard preserves live files',async()=>fixture(async({o,directory,args})=>{
  await stageGuildFiles(args);
  await rm(path.join(directory,'stage','guildbal.cgi'));
  await assert.rejects(commitGuildFiles(args),/incomplete stage/);
  assert.equal(await readFile(path.join(directory,'guild.cgi'),'utf8'),o.initialDef);
  await commitGuildFiles({...args,abort:true});
  assert.deepEqual(await readdir(path.join(directory,'stage')),[]);
}));
