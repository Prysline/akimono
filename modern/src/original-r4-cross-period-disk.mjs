/** One independent single-shop crossing in the original disk sandbox.
 * Runs the same source projector; exact live play input and source-pinned
 * disk helpers. A ready receipt binds all four staged files before commit.
 * Not a B43/WorldState transaction and not a public command.
 */
import {projectR4CrossPeriodCandidate} from './original-r4-cross-period-candidate.mjs';
import {readPeriodPlay,serializePeriodPlay,stagePeriodPlay} from './original-r4-period-play-file.mjs';
import {rotatePeriodBackupDisk,dataWriteBackupDisk} from './original-r4-backup-disk.mjs';
import {stageGuildFiles,stageIndependentPeriodGuildDefinition,parseGuildDefinition,parseGuildLedgers} from './original-r4-guild-files.mjs';
import {projectCrossPeriodLogRows,renewPeriodLogDisk} from './original-r4-period-log-disk.mjs';
import {createHash} from 'node:crypto';
import {readFile,writeFile,lstat,realpath,readdir} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const fail=m=>{throw new RangeError('R4 cross-period disk: '+m)};
const filenames=['guild.cgi','guildbal.cgi','log0.cgi','play.cgi'];
async function exists(p){try{return await lstat(p)}catch(e){if(e.code==='ENOENT')return null;throw e}}
async function bytes(p){if(!(await lstat(p)).isFile())fail('regular file required');return readFile(p)}
function playWorld({reviewed,world,meta}){
  if(reviewed.crossPeriod!==true||world.shops.length!==1||world.period.eventState===null||!world.market)fail('reviewed crossing play required');
  const shop=world.shops[0],fields=reviewed.shopFields;
  return {lasttime:world.nowSeconds,people:world.period.dtPeople,nextid:meta.nextid,blockip:meta.blockip,taxRate:meta.taxRate,
    state:Object.fromEntries(reviewed.stateFields.map(k=>[k,world.period.town[k]])),
    town:meta.town,events:world.period.eventState,wholesale:world.market.wholesale,wholesaleCsv:world.market.originalWholesaleCsv,
    shops:[{...Object.fromEntries(fields.map(k=>[k,shop[k]])),status:shop.status,
      ...Object.fromEntries(['showcase','price','item','itemtoday','itemyesterday','exp','user'].map(k=>[k,shop[k]]))}]};
}
export async function stageR4CrossPeriodDisk({directory,reviews,commandArgs}){
  const root=await realpath(directory);
  if(path.dirname(root)!==await realpath(os.tmpdir())||!path.basename(root).startsWith('akimono-r4-period-disk-'))fail('isolated period sandbox required');
  for(const n of ['period-attempt','period-ready','commit.cgi'])if(await exists(path.join(root,n)))fail('prior attempt requires explicit recovery');
  const stage=path.join(root,'stage'),common=path.join(root,'common');
  for(const d of [stage,common])if(!(await lstat(d)).isDirectory()||(await readdir(d)).length)fail('empty independent stage/common required');
  if(Object.keys(parseGuildDefinition((await bytes(path.join(root,'guild.cgi'))).toString('utf8'))).length||
     Object.keys(parseGuildLedgers((await bytes(path.join(root,'guildbal.cgi'))).toString('utf8'))).length)fail('no external guild context');
  const args={directory:root,reviewed:reviews.play,townReview:reviews.town};
  const live=await readPeriodPlay(args);
  if(live.blockip!==''||live.taxRate!==0||Object.keys(live.town).length||live.nextid<2)fail('independent original metadata required');
  const wire=w=>serializePeriodPlay({...args,world:w});
  const before=playWorld({reviewed:reviews.play,world:commandArgs.world,meta:live});
  if(wire(live)!==wire(before))fail('candidate input differs from live source play');
  const candidate=projectR4CrossPeriodCandidate(commandArgs);
  const final=playWorld({reviewed:reviews.play,world:candidate,meta:live});
  const playBytes=wire(final);
  const logRows=projectCrossPeriodLogRows({reviewed:reviews.log,candidate});
  // All source calculations and encodings pass before any source side effect.
  await writeFile(path.join(root,'period-attempt'),'R4 crossing source attempt\n',{flag:'wx'});
  const rotation=await rotatePeriodBackupDisk({reviewed:reviews.backup,directory:root,nowSeconds:candidate.nowSeconds});
  const definition=await stageIndependentPeriodGuildDefinition({reviewed:reviews.guild,directory:root});
  const guild=await stageGuildFiles({reviewed:reviews.guild,directory:root,independentPeriod:true});
  const backup=await dataWriteBackupDisk({reviewed:reviews.backup,directory:root,nowSeconds:candidate.nowSeconds,lasttime:candidate.nowSeconds});
  const play=await stagePeriodPlay({...args,world:final});
  if(play.bytes!==playBytes)fail('source wire changed during stage');
  const log=await renewPeriodLogDisk({reviewed:reviews.log,directory:root,rows:logRows,nowSeconds:candidate.nowSeconds});
  const ready=Object.fromEntries(await Promise.all(filenames.map(async n=>[n,createHash('sha256').update(await bytes(path.join(stage,n))).digest('hex')])));
  await writeFile(path.join(root,'period-ready'),JSON.stringify(ready)+'\n',{flag:'wx'});
  return {candidate,final,rotation,definition,guild,backup,play,log,committable:false,worldStateWritten:false};
}
