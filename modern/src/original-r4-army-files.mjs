/** Frozen army wire and actual isolated rebel event file IO. Not WorldState. */
import {createHash} from 'node:crypto';
import {readFile,writeFile,lstat,realpath,mkdir,rename,unlink,readdir} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {projectR4RebelPeriodToNow} from './original-r4-rebel-period-to-now.mjs';
import {projectR4RebelNow} from './original-r4-rebel-now.mjs';
const fail=m=>{throw new RangeError('R4 army files: '+m)};
const reviews=new WeakSet();
const validId=n=>Number.isSafeInteger(n)&&n>0;
const id=s=>typeof s==='string'&&/^[1-9]\d*$/.test(s)&&validId(Number(s));
const number=s=>typeof s==='string'&&/^(0|[1-9]\d*)$/.test(s)&&Number.isSafeInteger(Number(s));
const pins={army:'cd29bcbfe52bac84794c4c79426bd559d7616d85',turn:'b8a4980275f475a952846a8d6072fad45f8dff50',write:'203f33b37511e838800a45b84183af98fcf46e4c'};
export function reviewArmyFiles(sources){
  for(const [k,sha] of Object.entries(pins)){
    const s=sources[k];if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k);
  }
  const r=Object.freeze({committable:false});reviews.add(r);return r;
}
function review(r){if(!reviews.has(r))fail('source review required')}
function ids(shopIds){
  if(!Array.isArray(shopIds)||shopIds.some(x=>!validId(x))||new Set(shopIds).size!==shopIds.length)fail('valid current shop IDs required');
  return new Set(shopIds);
}
export function parseArmyFile(text,shopIds){
  const known=ids(shopIds);
  if(typeof text!=='string'||!text.endsWith('\n'))fail('invalid two-line army file');
  const lines=text.split('\n');
  if(lines.length!==3||lines[2]!=='')fail('invalid two-line army file');
  const row=lines[0]?lines[0].split(','):[],armyById={};
  if(row.length%2)fail('invalid army pairs');
  for(let i=0;i<row.length;i+=2){
    if(!id(row[i])||!number(row[i+1])||Object.hasOwn(armyById,row[i]))fail('invalid army pair');
    armyById[row[i]]=Number(row[i+1]);
  }
  const riotIds=[],seen=new Set();
  for(const v of lines[1]?lines[1].split(','):[]){
    if(!id(v)||seen.has(v))fail('invalid riot ID');
    seen.add(v);if(known.has(Number(v)))riotIds.push(Number(v));
  }
  return {armyById,riotIds:riotIds.sort((a,b)=>a-b)};
}
export function serializeArmyFile({armyById,riotIds},shopIds){
  const known=ids(shopIds);
  if(!armyById||Object.getPrototypeOf(armyById)!==Object.prototype||!Array.isArray(riotIds))fail('explicit army and riot state required');
  const kept={};
  for(const [k,v] of Object.entries(armyById)){
    if(!id(k)||!Number.isSafeInteger(v)||v<0)fail('invalid army value');
    if(known.has(Number(k))&&v!==0)kept[k]=v;
  }
  if(riotIds.some(v=>!validId(v))||new Set(riotIds).size!==riotIds.length)fail('invalid riot IDs');
  // WriteArmy prunes ARMY, not RIOT. ReadArmy filters RIOT on next read.
  return Object.entries(kept).flat().join(',')+'\n'+riotIds.join(',')+'\n';
}
async function rootFor(directory){
  const root=await realpath(directory);
  if(path.dirname(root)!==await realpath(os.tmpdir())||!['akimono-r4-army-','akimono-r4-external-'].some(prefix=>path.basename(root).startsWith(prefix)))fail('isolated sandbox required');
  return root;
}
async function statOrNull(p){try{return await lstat(p)}catch(e){if(e.code==='ENOENT')return null;throw e}}
async function readRegular(p){
  if(!(await lstat(p)).isFile())fail('regular file required');
  return new TextDecoder('utf-8',{fatal:true}).decode(await readFile(p));
}
async function stageDir(root){const p=path.join(root,'stage');await mkdir(p,{recursive:true});if(!(await lstat(p)).isDirectory())fail('real stage directory required');return p}
export async function readArmySandbox({reviewed,directory,shopIds}){
  review(reviewed);const root=await rootFor(directory);
  if(await statOrNull(path.join(root,'commit.cgi')))fail('pending commit requires recovery');
  return parseArmyFile(await readRegular(path.join(root,'army.cgi')),shopIds);
}
export async function stageArmySandbox({reviewed,directory,state,shopIds}){
  review(reviewed);const root=await rootFor(directory);
  if(await statOrNull(path.join(root,'commit.cgi')))fail('pending commit requires recovery');
  const bytes=serializeArmyFile(state,shopIds),stage=await stageDir(root),file=path.join(stage,'army.cgi');
  const old=await statOrNull(file);if(old&&!old.isFile())fail('regular stage file required');
  // Original OpenAndCheck uses truncate, not append; each NOW may overwrite.
  await writeFile(file,bytes,{flag:old?'w':'wx'});
  return {bytes,committable:false,worldStateWritten:false};
}
export async function projectRebelArmySandbox({fileReview,directory,reviewed,input,mode='period'}){
  const shopIds=input.shops.map(s=>s.id);
  const read=await readArmySandbox({reviewed:fileReview,directory,shopIds});
  // Stale non-riot ARMY IDs cannot participate in the reviewed callback.
  const usable=Object.fromEntries(Object.entries(read.armyById).filter(([k])=>shopIds.includes(Number(k))));
  const result=(mode==='period'?projectR4RebelPeriodToNow:mode==='now'?projectR4RebelNow:fail('unknown source mode'))({reviewed,...input,armyById:usable,riotIds:read.riotIds});
  let staged=null;
  if(result.writeArmyCalls===1)staged=await stageArmySandbox({reviewed:fileReview,directory,shopIds,state:result});
  return {result,staged,committable:false};
}
export async function commitArmySandbox({reviewed,directory,abort=false}){
  review(reviewed);if(typeof abort!=='boolean')fail('invalid abort');
  const root=await rootFor(directory),stage=await stageDir(root),marker=path.join(root,'commit.cgi'),pending=await readdir(stage);
  if(pending.some(n=>n!=='army.cgi'))fail('unreviewed staged file');
  const m=await statOrNull(marker);if(m&&!m.isFile())fail('invalid marker');
  if(!pending.length){if(m)await unlink(marker);return {mode:'empty',committable:false}}
  const p=path.join(stage,'army.cgi');if(!(await lstat(p)).isFile())fail('invalid stage file');
  if(abort&&!m){await unlink(p);return {mode:'discard',committable:false}}
  if(!m)await writeFile(marker,'',{flag:'wx'});
  await rename(p,path.join(root,'army.cgi'));await unlink(marker);
  return {mode:abort?'recover':'commit',committable:false};
}
