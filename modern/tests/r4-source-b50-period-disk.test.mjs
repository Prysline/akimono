import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,mkdir,rm,utimes,readdir,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {loadStandardStreetModel} from '../src/standard-street-model.mjs';
import {compileReviewedGiftMapUse} from '../src/reviewed-gift-map-use.mjs';
import {
  reviewOriginalSoloPeriodPhaseChain,projectOriginalSoloPeriodPhaseChain,
} from '../src/original-period-solo-chain.mjs';
import {
  reviewR4CloseShopArchiveSource,
} from '../src/original-r4-close-shop-archive-file.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const sourcePaths={
  periodSource:'modern/tests/original-perl/period.cgi',
  writeSource:'modern/tests/original-perl/write.cgi',
  configSource:'_config.cgi',
  itemDsl:'custom/inc-item-data.cgi',
  rebelDsl:'custom/inc-rebel-data.cgi',
  compilerSource:'modern/tests/original-perl/inc-makeitem.cgi',
  originalAddItemSource:'modern/tests/original-perl/use.cgi',
  detailSource:'modern/tests/original-perl/core-detail.cgi',
  readSource:'modern/tests/original-perl/inc-func.cgi',
  adminSource:'modern/tests/original-perl/core-inc-admin-func.cgi',
  errorSource:'modern/tests/original-perl/pinned-error.cgi',
  userSource:'modern/tests/original-perl/pinned-user.cgi',
};
const sources=Object.fromEntries(await Promise.all(Object.entries(sourcePaths).map(
  async([key,p])=>[key,await readFile(path.join(root,p),'utf8')],
)));
const model=loadStandardStreetModel(sources.itemDsl,sources.rebelDsl);
const compiled=compileReviewedGiftMapUse({
  itemDsl:sources.itemDsl,rebelDsl:sources.rebelDsl,model,
});
const reviewed=reviewOriginalSoloPeriodPhaseChain({
  ...sources,model,
  bootstrapMeta:'500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0',
  compiledLimits:compiled.limits.map(x=>x.limit),
  includeReviewedDragon:true,includeReviewedDignity:true,
  includeReviewedGuild:true,includeReviewedPostTech:true,
  includeReviewedShopExpiry:true,includeReviewedActualCloseShop:true,
});
const archiveReviewed=reviewR4CloseShopArchiveSource(sources);
const probe=name=>JSON.parse(execFileSync('perl',[name],{
  cwd:path.join(root,'modern/tests/original-perl'),
  encoding:'utf8',maxBuffer:4*1024*1024,
}));


import {reviewPeriodPlay,serializePeriodPlay,parsePeriodPlay,readPeriodPlay} from '../src/original-r4-period-play-file.mjs';
import {reviewTownFiles} from '../src/original-r4-town-files.mjs';
import {reviewGuildFiles,parseGuildEventLedgers,parseGuildLedgers,parseGuildDefinition} from '../src/original-r4-guild-files.mjs';
import {reviewBackupDisk} from '../src/original-r4-backup-disk.mjs';
import {reviewExternalFiles} from '../src/original-r4-external-files-sandbox.mjs';
import {reviewPeriodLog} from '../src/original-r4-period-log-disk.mjs';
import {stageB50PeriodDisk,commitB50PeriodDisk} from '../src/original-r4-b50-period-disk.mjs';
const perl=path.join(root,'modern/tests/original-perl');
const read=n=>readFile(path.join(perl,n),'utf8');
const guildSources=Object.fromEntries(await Promise.all(['guildsub','config','sub','guild','write','turn','period'].map(async k=>[k,await read(k==='turn'?'inc-turn.cgi':['write','period'].includes(k)?k+'.cgi':'pinned-'+k+'.cgi')])));
const reviews={period:reviewed,archive:archiveReviewed,
  play:reviewPeriodPlay({writeSource:sources.writeSource,incFuncSource:sources.readSource,detailSource:sources.detailSource,configSource:sources.configSource}),
  town:reviewTownFiles({custom:await read('pinned-custom.cgi'),read:sources.readSource,write:sources.writeSource}),
  guild:reviewGuildFiles(guildSources),
  backup:reviewBackupDisk({period:sources.periodSource,write:sources.writeSource,config:sources.configSource}),
  log:reviewPeriodLog({log:await read('pinned-log.cgi'),period:sources.periodSource,dsl:sources.itemDsl,config:sources.configSource}),
  external:reviewExternalFiles({write:sources.writeSource,guild:guildSources.guild,turn:guildSources.turn})};
const oracle=first=>JSON.parse(execFileSync('perl',['original-r4-b50-period-disk-probe.pl',...(first==='failure'?['--fail-rename']:first?['--first-only']:[])],{cwd:perl,encoding:'utf8',maxBuffer:8*1024*1024}));
const wire=bytes=>parsePeriodPlay({reviewed:reviews.play,townReview:reviews.town,bytes});
const serialize=world=>serializePeriodPlay({reviewed:reviews.play,townReview:reviews.town,world});
const equalPlay=(actual,expected)=>assert.deepEqual(wire(actual),wire(expected));
async function seed(dir,files){await mkdir(dir,{recursive:true});for(const [k,v] of Object.entries(files))await writeFile(path.join(dir,k+'.cgi'),v)}
async function fixture(first,fn){
  const o=oracle(first),directory=await mkdtemp(path.join(os.tmpdir(),'akimono-r4-period-disk-'));
  try{
    await seed(directory,{...o.initialLogs,play:o.initialPlay,guildbal:o.initialLedger,guild:o.initialDefinition,lasttime:'clock'});
    await utimes(path.join(directory,'log1.cgi'),o.initialWorld.lasttime,o.initialWorld.lasttime);
    await seed(path.join(directory,'backup'),o.initialBackup);
    await utimes(path.join(directory,'backup','play.cgi'),o.initialWorld.lasttime,o.initialWorld.lasttime);
    await utimes(path.join(directory,'lasttime.cgi'),o.initialWorld.lasttime,o.initialWorld.lasttime);
    for(const [i,files] of o.initialGenerations.entries())await seed(path.join(directory,'backup'+(i+1)),files);
    for(const n of ['stage','subdata','session','common','log'])await mkdir(path.join(directory,n));
    for(const n of o.cases[0].input.sessionFileNames)await writeFile(path.join(directory,'subdata',n),'session');
    for(const s of o.initialExpiry){const p=path.join(directory,'session',s.name);await writeFile(p,'session');await utimes(p,s.modifiedSeconds,s.modifiedSeconds)}
    await writeFile(path.join(directory,'common','guild_a.pl'),o.guildConfig);
    const periods=o.cases.map(r=>Object.fromEntries(['nowSeconds','awardDrawMillionths','territoryDrawMillionths','dignityDrawMillionths','postTechDraws','payoutText'].map(k=>[k,r.input[k]])));
    await fn({o,directory,args:{directory,reviews,periods,logContext:o.logContext}});
  }finally{await rm(directory,{recursive:true,force:true})}
}
async function assertStages({o,directory,args}){
  equalPlay(serialize(o.initialWorld),o.initialPlay);
  const got=await stageB50PeriodDisk(args);
  assert.equal(got.committable,false);assert.equal(got.worldStateWritten,false);
  assert.equal(got.steps.length,o.cases.length);
  for(const [i,step] of got.steps.entries()){
    const r=o.cases[i];
    assert.deepEqual(step.result.shop,r.output.shop);
    assert.deepEqual(step.result.closedShop??null,r.output.closedShop);
    assert.deepEqual(step.result.town,r.output.town);
    assert.equal(step.result.dtPeople,r.output.dtPeople);
    assert.deepEqual(step.result.guildMoneyEdits,r.output.guildMoneyEdits);
    assert.deepEqual(step.result.guildContext,r.output.guildContext);
    assert.deepEqual(step.ledger,r.ledgerAfter);
    assert.equal(step.definition,r.definitionStage);
    assert.deepEqual(step.logRows,r.logRows,'exact original chronological PushLog/WriteLog accumulation');
    assert.deepEqual(step.generations,r.generations,'actual period '+i+' backup of LIVE files');
    assert.deepEqual(step.expiry,r.expiry);
    assert.deepEqual(step.subdata,[...r.output.closeRemainingSessions].sort());
  }
  assert.deepEqual(parseGuildLedgers(await readFile(path.join(directory,'stage','guildbal.cgi'),'utf8')),parseGuildLedgers(o.staged.guildbal));
  assert.deepEqual(parseGuildDefinition(await readFile(path.join(directory,'stage','guild.cgi'),'utf8')),parseGuildDefinition(o.staged.guild));
  equalPlay(got.play.bytes,o.staged.play);
  equalPlay(await readFile(path.join(directory,'stage','play.cgi'),'utf8'),o.staged.play);
  assert.equal(await readFile(path.join(directory,'play.cgi'),'utf8'),o.initialPlay);
  assert.equal(await readFile(path.join(directory,'guildbal.cgi'),'utf8'),o.initialLedger);
  assert.equal(got.backup.copied,true);
  assert.equal(got.log.rotated,o.cases.length===2);
  assert.equal(await readFile(path.join(directory,'stage','log0.cgi'),'utf8'),o.staged.log0);
  for(const [k,v] of Object.entries(o.beforeCommitLogs)){
    if(v===null)await assert.rejects(readFile(path.join(directory,k+'.cgi')),{code:'ENOENT'});
    else assert.equal(await readFile(path.join(directory,k+'.cgi'),'utf8'),v);
  }
  for(const [k,v] of Object.entries(o.finalBackup))assert.equal(await readFile(path.join(directory,'backup',k+'.cgi'),'utf8'),v);
  assert.equal(Math.floor((await stat(path.join(directory,'lasttime.cgi'))).mtimeMs/1000),o.lasttimeMtime);
  if(o.archive===null)await assert.rejects(readFile(path.join(directory,'log','delete.cgi')),{code:'ENOENT'});
  else assert.equal(await readFile(path.join(directory,'log','delete.cgi'),'utf8'),o.archive);
  assert.deepEqual(await readdir(path.join(directory,'common')),['guild_a.pl']);
  return got;
}
for(const first of [true,false])test('B50 actual source '+(first?'one period active shop':'two continuous periods including close')+' plus backup, archive, main/guild commit and DataRead',()=>fixture(first,async ctx=>{
  const {o,directory}=ctx;
  await assertStages(ctx);
  await commitB50PeriodDisk({directory,reviewed:reviews.external});
  const read=await readPeriodPlay({reviewed:reviews.play,townReview:reviews.town,directory});
  assert.deepEqual(read,wire(o.finalPlay));
  equalPlay(serialize(o.reloaded),o.finalPlay);
  assert.equal(read.shops.length,first?1:0);
  if(first){assert.equal(Object.hasOwn(read.shops[0],'dragon'),false,'temporary field not persisted');assert.equal(Object.hasOwn(read.state,'people'),false,'temporary CITY people not persisted')}
  assert.deepEqual(parseGuildLedgers(await readFile(path.join(directory,'guildbal.cgi'),'utf8')),parseGuildLedgers(o.finalLedger));
  assert.deepEqual(parseGuildLedgers(o.finalLedger).guild_a,o.reloadedLedger);
  assert.equal(Object.hasOwn(parseGuildLedgers(o.finalLedger).guild_a,'guild'),false,'period removes transient guild field');
  for(const [k,v] of Object.entries(o.finalLogs))assert.equal(await readFile(path.join(directory,k+'.cgi'),'utf8'),v);
  assert.deepEqual(await readdir(path.join(directory,'stage')),[]);
  await assert.rejects(stat(path.join(directory,'period-ready')),{code:'ENOENT'});
  await assert.rejects(stat(path.join(directory,'period-attempt')),{code:'ENOENT'});
}));
test('B50 actual staged files recover after fourth rename failure without redoing archive or rotations',()=>fixture(false,async ctx=>{
  const {directory,o,args}=ctx;await assertStages(ctx);
  const live=path.join(directory,'play.cgi');await rm(live);await mkdir(live);
  await assert.rejects(commitB50PeriodDisk({directory,reviewed:reviews.external}));
  assert.deepEqual(await readdir(path.join(directory,'stage')),['play.cgi']);
  await assert.rejects(stageB50PeriodDisk(args),/prior attempt/);
  await assert.rejects(readPeriodPlay({reviewed:reviews.play,townReview:reviews.town,directory}),/pending commit/);
  await rm(live,{recursive:true});
  assert.equal((await commitB50PeriodDisk({directory,reviewed:reviews.external,recover:true})).mode,'recover');
  equalPlay(await readFile(live,'utf8'),o.finalPlay);
  assert.equal(await readFile(path.join(directory,'log','delete.cgi'),'utf8'),o.archive);
  for(const [k,v] of Object.entries(o.finalLogs))assert.equal(await readFile(path.join(directory,k+'.cgi'),'utf8'),v);
  for(const [i,files] of o.cases.at(-1).generations.entries())for(const [k,v] of Object.entries(files))assert.equal(await readFile(path.join(directory,'backup'+(i+1),k+'.cgi'),'utf8'),v);
}));
test('B50 failure before marker retains explicit attempt, incomplete stage cannot masquerade as success',()=>fixture(false,async({directory,args,o})=>{
  await rm(path.join(directory,'log'),{recursive:true});
  await assert.rejects(stageB50PeriodDisk(args),{code:'ENOENT'});
  await assert.rejects(stageB50PeriodDisk(args),/prior attempt/);
  await assert.rejects(commitB50PeriodDisk({directory,reviewed:reviews.external}),/incomplete stage/);
  assert.equal(await readFile(path.join(directory,'play.cgi'),'utf8'),o.initialPlay);
  assert.equal(await readFile(path.join(directory,'guildbal.cgi'),'utf8'),o.initialLedger);
  await assert.rejects(stat(path.join(directory,'commit.cgi')),{code:'ENOENT'});
}));
test('B50 wire rejects unknown EVENT, absent index field and unreviewed multi-key maps',()=>{
  const o=oracle(true),world=o.initialWorld;
  assert.throws(()=>serialize({...world,events:null}),/explicit empty EVENT/);
  assert.throws(()=>serialize({...world,events:{rebel:5}}),/explicit empty EVENT/);
  assert.throws(()=>serialize({...world,shops:[{...world.shops[0],pass:undefined}]}),/invalid text/);
  assert.throws(()=>serialize({...world,shops:[{...world.shops[0],exp:{1:1,2:2}}]}),/one-key/);
  assert.throws(()=>wire(o.initialPlay.replace(/\n\/\/\n/,'\n//\nextra\n')),/unreviewed play layout/);
});

test('actual original B50 source commit injected third rename failure recovers remaining files without replay',()=>{
  const o=oracle('failure');
  assert.equal(o.failure.marker,true);
  assert.equal(o.failure.pending.length,2);
  equalPlay(o.staged.play,o.finalPlay);
  assert.equal(o.staged.guildbal,o.finalLedger);
  assert.equal(o.staged.guild,o.finalDefinition);
  assert.equal(o.staged.log0,o.finalLogs.log0);
  equalPlay(serialize(o.reloaded),o.finalPlay);
  assert.ok(o.archive.includes(o.cases[1].output.closeArchived));
  assert.equal(o.finalLogs.log1,o.initialLogs.log0);
  assert.equal(o.finalLogs.log2,o.initialLogs.log1);
});

test('B50 ready receipt detects changed stage or already moved file; no marker or recovery success on mismatch',()=>fixture(false,async ctx=>{
  const {directory,o}=ctx;await assertStages(ctx);
  const args={directory,reviewed:reviews.external},stage=path.join(directory,'stage','play.cgi'),live=path.join(directory,'play.cgi');
  const bytes=await readFile(stage);
  await writeFile(stage,Buffer.concat([bytes,Buffer.from('changed')]));
  await assert.rejects(commitB50PeriodDisk(args),/differs from ready receipt/);
  await assert.rejects(stat(path.join(directory,'commit.cgi')),{code:'ENOENT'});
  await writeFile(stage,bytes);
  await rm(live);await mkdir(live);
  await assert.rejects(commitB50PeriodDisk(args));
  const moved=path.join(directory,'guildbal.cgi'),ledger=await readFile(moved);
  await writeFile(moved,Buffer.concat([ledger,Buffer.from('changed')]));
  await rm(live,{recursive:true});
  await assert.rejects(commitB50PeriodDisk({...args,recover:true}),/differs from ready receipt/);
  assert.equal(await readFile(path.join(directory,'commit.cgi'),'utf8'),'');
  await writeFile(moved,ledger);
  await commitB50PeriodDisk({...args,recover:true});
  equalPlay(await readFile(live,'utf8'),o.finalPlay);
});
