/** Integrated B-50 source fixture: actual file effects with explicit RNG.
 * Not a whole inc-turn executor. No authority to update WorldState.
 */
import {projectOriginalSoloPeriodPhaseChain} from './original-period-solo-chain.mjs';
import {readPeriodPlay,stagePeriodPlay} from './original-r4-period-play-file.mjs';
import {parseGuildDefinition,parseGuildEventLedgers,stageGuildFiles,stageStablePeriodGuildDefinition} from './original-r4-guild-files.mjs';
import {applyGuildPeriod} from './original-r4-guild-ledger-file.mjs';
import {appendR4CloseShopArchiveSandbox} from './original-r4-close-shop-archive-file.mjs';
import {rotatePeriodBackupDisk,dataWriteBackupDisk} from './original-r4-backup-disk.mjs';
import {projectB50PeriodLogRows,renewPeriodLogDisk} from './original-r4-period-log-disk.mjs';
import {commitExternalFiles} from './original-r4-external-files-sandbox.mjs';
import {createHash} from 'node:crypto';
import {readFile,writeFile,lstat,realpath,readdir,unlink} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const fail=m=>{throw new RangeError('R4 B50 disk: '+m)};
const expectedFiles=['guild.cgi','guildbal.cgi','log0.cgi','play.cgi'];
const digest=async p=>{if(!(await lstat(p)).isFile())fail('regular receipt file required');return createHash('sha256').update(await readFile(p)).digest('hex')};
async function rootFor(directory){
  const root=await realpath(directory);
  if(path.dirname(root)!==await realpath(os.tmpdir())||!path.basename(root).startsWith('akimono-r4-period-disk-'))fail('isolated period sandbox required');
  return root;
}
async function regular(p){if(!(await lstat(p)).isFile())fail('regular file required');return new TextDecoder('utf-8',{fatal:true}).decode(await readFile(p))}
async function realDir(p){if(!(await lstat(p)).isDirectory())fail('real directory required');return p}
async function exists(p){try{return await lstat(p)}catch(e){if(e.code==='ENOENT')return null;throw e}}
async function snapshots(dir){
  await realDir(dir);const out={};
  for(const n of ['log0','log1','log2','guildbal','play'])out[n]=await regular(path.join(dir,n+'.cgi'));
  return out;
}
async function expirySnapshot(dir){
  await realDir(dir);const out=[];
  for(const n of (await readdir(dir)).sort()){
    const s=await lstat(path.join(dir,n));if(!s.isFile())fail('regular session required');
    out.push({name:n,modifiedSeconds:Math.floor(s.mtimeMs/1000)});
  }
  return out;
}
export async function stageB50PeriodDisk({directory,reviews,periods,logContext}){
  const root=await rootFor(directory),attempt=path.join(root,'period-attempt'),ready=path.join(root,'period-ready');
  if(await exists(attempt)||await exists(ready)||await exists(path.join(root,'commit.cgi')))fail('prior attempt requires explicit recovery; do not replay external effects');
  const context={};
  for(const k of ['scriptName','remoteAddress','remoteHost','trueIp','user']){
    if(typeof logContext?.[k]!=='string'||/[\r\n\t]/.test(logContext[k]))fail('explicit archive context '+k);
    context[k]=logContext[k];
  }
  const args={directory:root,reviewed:reviews.play,townReview:reviews.town};
  const initial=await readPeriodPlay(args);
  if(initial.shops.length!==1||!Array.isArray(periods)||![1,2].includes(periods.length))fail('one active shop and one/two explicit B50 periods required');
  for(const [i,p] of periods.entries())if(p.nowSeconds!==initial.lasttime+(i+1)*129600||typeof p.payoutText!=='string')fail('explicit 36h fixture time and payout required');
  const defs=parseGuildDefinition(await regular(path.join(root,'guild.cgi')));
  const ledgers=parseGuildEventLedgers(await regular(path.join(root,'guildbal.cgi')));
  if(initial.shops[0].guild!=='guild_a'||Object.keys(defs).join(',')!=='guild_a'||Object.keys(ledgers).join(',')!=='guild_a')fail('stable B50 guild required');
  const stage=await realDir(path.join(root,'stage')),subdata=await realDir(path.join(root,'subdata')),common=await realDir(path.join(root,'common'));
  if((await readdir(stage)).length)fail('unexpected stage');
  // Diagnostic sentinel is an extra modern fail-closed guard, not original
  // commit.cgi. Nontransactional archive/backup/unlink must not be replayed.
  await writeFile(attempt,'B50 source attempt\n',{flag:'wx'});
  let shop={...initial.shops[0],dragon:0},town=initial.state,people=initial.people;
  let ledger=ledgers.guild_a;
  const guildPeriods=[],steps=[];let logRows=[];
  for(const p of periods){
    const guildContext={id:'guild_a',feeRate:defs.guild_a.feerate,atk:ledger.atk,def:ledger.def};
    const payout=path.join(common,'drapay-street.cgi');
    await writeFile(payout,p.payoutText,{flag:'wx'});
    const names=(await readdir(subdata)).sort();
    for(const n of names)if(!(await lstat(path.join(subdata,n))).isFile())fail('regular subdata file required');
    const result=projectOriginalSoloPeriodPhaseChain({
      reviewed:reviews.period,shop,town,dtPeople:people,guildContext,
      nowSeconds:p.nowSeconds,awardDrawMillionths:p.awardDrawMillionths,
      territoryDrawMillionths:p.territoryDrawMillionths,dignityDrawMillionths:p.dignityDrawMillionths,
      postTechDraws:p.postTechDraws,payoutText:await regular(payout),sessionFileNames:names,
    });
    if(!result.dragonPayoutFileConsumed||result.nonCommittable!==true)fail('source payout/period contract');
    await unlink(payout);
    const calls=projectB50PeriodLogRows({reviewed:reviews.log,shop,town,result,nowSeconds:p.nowSeconds});
    logRows=[...calls].reverse().concat(logRows);
    if(result.actualCloseEffect){
      await appendR4CloseShopArchiveSandbox({reviewed:reviews.archive,effect:result.actualCloseEffect,sandboxDirectory:root,nowSeconds:p.nowSeconds,...context});
      for(const n of result.actualCloseEffect.deletedSessions)await unlink(path.join(subdata,n));
    }
    const {guild:transient,...base}=ledger;
    const period={id:'guild_a',inputGuild:guildContext,outputGuild:result.guildContext,edits:result.guildMoneyEdits};
    ledger=applyGuildPeriod({...period,data:base});guildPeriods.push(period);
    const backup=await rotatePeriodBackupDisk({reviewed:reviews.backup,directory:root,nowSeconds:p.nowSeconds});
    const definition=await stageStablePeriodGuildDefinition({reviewed:reviews.guild,directory:root});
    steps.push({result,ledger,backup,definition:definition.bytes,logRows:[...logRows],
      generations:await Promise.all([1,2,3].map(i=>snapshots(path.join(root,'backup'+i)))),
      expiry:await expirySnapshot(path.join(root,'session')),
      subdata:(await readdir(subdata)).sort()});
    shop=result.shop;town=result.town;people=result.dtPeople;
  }
  // Only now WriteGuildData, then DataWrite prelude and stage play. Source
  // period tail has already generated the stable definition each time.
  const guild=await stageGuildFiles({reviewed:reviews.guild,directory:root,periods:guildPeriods});
  const now=periods.at(-1).nowSeconds;
  const backup=await dataWriteBackupDisk({reviewed:reviews.backup,directory:root,nowSeconds:now,lasttime:now});
  const world={...initial,lasttime:now,people,state:town,shops:shop?[shop]:[]};
  const play=await stagePeriodPlay({...args,world});
  const log=await renewPeriodLogDisk({reviewed:reviews.log,directory:root,rows:logRows,nowSeconds:now});
  const receipt=Object.fromEntries(await Promise.all(expectedFiles.map(async n=>[n,await digest(path.join(stage,n))])));
  await writeFile(ready,JSON.stringify(receipt)+'\n',{flag:'wx'});
  return {steps,guild,backup,play,log,world,committable:false,worldStateWritten:false};
}
export async function commitB50PeriodDisk(args){return commitPeriodDisk(args,false)}
export async function commitR4ExternalCrossPeriodDisk(args){return commitPeriodDisk(args,true)}
async function commitPeriodDisk({directory,reviewed,recover=false},externalRebel){
  const expectedFiles=externalRebel?['army.cgi','guild.cgi','guildbal.cgi','log0.cgi','play.cgi']:['guild.cgi','guildbal.cgi','log0.cgi','play.cgi'];
  const root=await rootFor(directory),attempt=path.join(root,'period-attempt'),marker=path.join(root,'commit.cgi'),ready=path.join(root,'period-ready'),stage=await realDir(path.join(root,'stage'));
  if(!(await lstat(attempt)).isFile())fail('period attempt required');
  if(((await regular(attempt))==='R4 external crossing source attempt\n')!==externalRebel)fail('attempt mode mismatch');
  const markerStat=await exists(marker);
  if(typeof recover!=='boolean'||Boolean(markerStat)!==recover)fail('explicit recovery mode must match marker');
  if(!await exists(ready))fail('incomplete stage: no ready receipt');
  const envelope=JSON.parse(await regular(ready));
  const validDigest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
  const plain=x=>x&&Object.getPrototypeOf(x)===Object.prototype;
  if(externalRebel&&(!plain(envelope)||Object.keys(envelope).sort().join(',')!=='files,liveBefore'||!plain(envelope.liveBefore)||Object.keys(envelope.liveBefore).sort().join(',')!=='army.cgi,play.cgi'||!Object.values(envelope.liveBefore).every(validDigest)))fail('invalid external preimage receipt');
  const receipt=externalRebel?envelope.files:envelope;
  if(!receipt||Object.getPrototypeOf(receipt)!==Object.prototype||Object.keys(receipt).sort().join(',')!==[...expectedFiles].sort().join(',')||Object.values(receipt).some(x=>typeof x!=='string'||!/^[a-f0-9]{64}$/.test(x)))fail('invalid ready receipt');
  const pending=await readdir(stage);
  if(pending.some(n=>!expectedFiles.includes(n))||!recover&&pending.length!==expectedFiles.length)fail('incomplete stage or unknown file');
  for(const n of expectedFiles){
    const p=path.join(pending.includes(n)?stage:root,n);
    if(await digest(p)!==receipt[n])fail('staged or moved file differs from ready receipt '+n);
  }
  // Single-writer source sandbox precondition, not an interprocess lock or WorldState CAS.
  // Recovery verifies already-moved output hashes above and must not demand their old input hashes.
  if(externalRebel&&!recover){
    for(const [name,hash] of Object.entries(envelope.liveBefore))if(await digest(path.join(root,name))!==hash)fail('live preimage changed '+name);
  }
  const result=await commitExternalFiles({reviewed,directory:root,expectedFiles,abort:recover});
  await unlink(ready);await unlink(attempt);
  return result;
}
