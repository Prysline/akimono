/** Frozen SetTownData/GetTownData, and controlled multi-key play.cgi wire. */
import {createHash} from 'node:crypto';
import {serializeR4DataWrite} from './original-r4-data-write-files.mjs';
import {projectR4GuildbattleEnd} from './original-r4-guildbattle-end.mjs';
import {parseGuildDefinition,parseGuildLedgers,parseGuildConfig} from './original-r4-guild-files.mjs';
import {readFile,lstat,realpath,readdir,writeFile,mkdir,rename,unlink} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const fail=m=>{throw new RangeError('R4 town files: '+m)};
const pins={custom:'93d7f77df648df0c46e5dca4763afd3d2c48654b',read:'e7a8add7b0291901e71fe797783b664dff1568a0',write:'203f33b37511e838800a45b84183af98fcf46e4c'};
const reviews=new WeakSet();
export function reviewTownFiles(sources){
  for(const [k,sha] of Object.entries(pins)){
    const s=sources[k];if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k);
  }
  const r=Object.freeze({committable:false});reviews.add(r);return r;
}
function review(r){if(!reviews.has(r))fail('source review required')}
function string(s){if(typeof s!=='string'||/[\uD800-\uDFFF]/u.test(s))fail('explicit Unicode scalar string required');return s}
function encode(s){return string(s).replace(/[\x00-\x1f,%]/g,c=>'%'+c.charCodeAt(0).toString(16).padStart(2,'0'))}
function decode(s){return s.replace(/%([\da-fA-F]{2})/g,(_,n)=>String.fromCharCode(parseInt(n,16)))}
function wire(s){return typeof s==='string'&&!/[\x00-\x1f,]/.test(s)&&!/%(?![\da-fA-F]{2})/.test(s)}
function checkedTown(town){
  if(!town||Object.getPrototypeOf(town)!==Object.prototype)fail('explicit encoded town map required');
  for(const [k,v] of Object.entries(town))if(!k||!v||!wire(k)||!wire(v)||['__proto__','constructor','prototype'].includes(k))fail('invalid town wire');
}
export function setTownData({reviewed,town,key,value}){
  review(reviewed);checkedTown(town);
  const k=encode(key),v=encode(value),out={...town};
  if(!k||['__proto__','constructor','prototype'].includes(k))fail('unreviewed key');
  if(v==='')delete out[k];else out[k]=v;
  return {town:out,returned:v,committable:false};
}
export function getTownData({reviewed,town,key}){
  review(reviewed);checkedTown(town);
  // Original GetTownData decodes its input key, NOT encodes it.
  const k=decode(string(key));
  return decode(Object.hasOwn(town,k)?town[k]:'');
}
export function serializeTownLine({reviewed,town}){
  review(reviewed);checkedTown(town);
  // This is a Node order only; compare parsed maps, never claim Perl hash order.
  return Object.entries(town).flat().join(',');
}
export function parseTownLine({reviewed,line}){
  review(reviewed);
  if(typeof line!=='string')fail('invalid town line');
  const parts=line===''?[]:line.split(','),town={};
  if(parts.length%2)fail('invalid town pairs');
  for(let i=0;i<parts.length;i+=2){
    const k=parts[i];if(['__proto__','constructor','prototype'].includes(k)||Object.hasOwn(town,k))fail('duplicate or unsafe town key');
    town[k]=parts[i+1];
  }
  checkedTown(town);return town;
}
export function serializeTownPlay({reviewed,dataReview,world}){
  const line=serializeTownLine({reviewed,town:world.town});
  const rows=serializeR4DataWrite({reviewed:dataReview,world:{...world,town:{}}}).split('\n');
  if(rows[4]!==''||rows[5]!=='//')fail('play schema drift');
  rows[4]=line;return rows.join('\n');
}
async function rootFor(directory){
  const root=await realpath(directory);
  if(path.dirname(root)!==await realpath(os.tmpdir())||!path.basename(root).startsWith('akimono-r4-town-'))fail('isolated sandbox required');
  return root;
}
async function regular(p){if(!(await lstat(p)).isFile())fail('regular file required');return new TextDecoder('utf-8',{fatal:true}).decode(await readFile(p))}
async function exists(p){try{return await lstat(p)}catch(e){if(e.code==='ENOENT')return null;throw e}}
export async function readTownPlay({reviewed,directory}){
  review(reviewed);const root=await rootFor(directory);
  if(await exists(path.join(root,'commit.cgi')))fail('pending commit requires recovery');
  const rows=(await regular(path.join(root,'play.cgi'))).split('\n');
  if(rows[5]!=='//')fail('unreviewed play layout');
  return parseTownLine({reviewed,line:rows[4]});
}
export async function projectGuildbattleTownSandbox({fileReview,reviewed,directory,input,town}){
  review(fileReview);checkedTown(town);const root=await rootFor(directory);
  if(await exists(path.join(root,'commit.cgi')))fail('pending commit requires recovery');
  const common=path.join(root,'common');if(!(await lstat(common)).isDirectory())fail('real common directory required');
  const definitions=parseGuildDefinition(await regular(path.join(root,'guild.cgi')));
  const ledgers=parseGuildLedgers(await regular(path.join(root,'guildbal.cgi')));
  const keys=Object.keys(definitions).sort();
  if(JSON.stringify(keys)!==JSON.stringify(Object.keys(ledgers).sort()))fail('live guild and ledger mismatch');
  const configs={};
  for(const n of await readdir(common)){
    if(!/^[A-Za-z][A-Za-z0-9_]*\.pl$/.test(n)||['constructor','prototype'].includes(n.slice(0,-3)))fail('unreviewed common entry');
    configs[n.slice(0,-3)]=parseGuildConfig(await regular(path.join(common,n)));
  }
  if(JSON.stringify(keys)!==JSON.stringify(Object.keys(configs).sort()))fail('unreviewed common guild membership');
  // ReadGuild refreshes details, but the original END uses existing generated %GUILD.
  const guilds=keys.map(id=>({id,name:definitions[id].shortname,money:ledgers[id].money}));
  const result=projectR4GuildbattleEnd({reviewed,...input,guilds,dominion:Object.hasOwn(town,'dominion')?getTownData({reviewed:fileReview,town,key:'dominion'}):null});
  const after=result.setTownCalls?setTownData({reviewed:fileReview,town,key:'dominion',value:result.dominion}).town:{...town};
  return {result,town:after,committable:false};
}
export async function stageTownPlay({reviewed,dataReview,directory,world}){
  const bytes=serializeTownPlay({reviewed,dataReview,world}),root=await rootFor(directory);
  if(await exists(path.join(root,'commit.cgi')))fail('pending commit requires recovery');
  const stage=path.join(root,'stage');await mkdir(stage,{recursive:true});if(!(await lstat(stage)).isDirectory())fail('real stage required');
  await writeFile(path.join(stage,'play.cgi'),bytes,{flag:'wx'});
  return {bytes,committable:false,worldStateWritten:false};
}
export async function commitTownPlay({reviewed,directory,abort=false}){
  review(reviewed);if(typeof abort!=='boolean')fail('invalid abort');
  const root=await rootFor(directory),stage=path.join(root,'stage'),marker=path.join(root,'commit.cgi');
  if(!(await lstat(stage)).isDirectory())fail('real stage required');
  const pending=await readdir(stage);if(pending.some(n=>n!=='play.cgi'))fail('unreviewed stage');
  const m=await exists(marker);if(m&&!m.isFile())fail('invalid marker');
  if(!pending.length){if(m)await unlink(marker);return {mode:'empty',committable:false}}
  const p=path.join(stage,'play.cgi');if(!(await lstat(p)).isFile())fail('invalid stage');
  if(abort&&!m){await unlink(p);return {mode:'discard',committable:false}}
  if(!m)await writeFile(marker,'',{flag:'wx'});
  await rename(p,path.join(root,'play.cgi'));await unlink(marker);
  return {mode:abort?'recover':'commit',committable:false};
}
