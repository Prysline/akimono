/** Source-limited guild ledger disk adapter; not a WorldState transaction. */
import {createHash} from 'node:crypto';
import {readFile,writeFile,rename,realpath,lstat} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const pinned='6593aa8a3ae4a1695c2418f12a3776f0053454ac';
const fields=['money','in','out','atk','def'];
const fail=msg=>{throw new RangeError('R4 guild ledger: '+msg)};
const integer=n=>Number.isSafeInteger(n);
export function reviewGuildLedger(source){
  if(typeof source!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0').update(source).digest('hex')!==pinned)fail('source drift');
  return Object.freeze({source:pinned,committable:false});
}
function check(reviewed){if(reviewed?.source!==pinned||reviewed.committable!==false)fail('review required')}
export function parseGuildLedger(text,id){
  if(!/^[a-zA-Z0-9_-]+$/.test(id)||typeof text!=='string'||!text.endsWith('\n'))fail('invalid ledger');
  const row=text.slice(0,-1).split('\t');
  if(row.shift()!==id||row.length!==10)fail('unreviewed ledger shape');
  const result={};
  while(row.length){const k=row.shift(),v=row.shift();if(!fields.includes(k)||Object.hasOwn(result,k)||! /^-?(0|[1-9]\d*)$/.test(v)||!integer(Number(v)))fail('invalid ledger field');result[k]=Number(v)}
  return result;
}
async function rootFor(directory){
  const root=await realpath(directory);
  if(path.dirname(root)!==await realpath(os.tmpdir())||!path.basename(root).startsWith('akimono-r4-guild-'))fail('isolated sandbox required');
  return root;
}
/** Pure shared member projection, preserving prior ledger and period counter reset. */
export function applyGuildPeriod({data,id,inputGuild,outputGuild,edits}){
  data={...data};
  if(!/^[A-Za-z][A-Za-z0-9_]*$/.test(id)||Object.keys(data).length!==fields.length||fields.some(k=>!integer(data[k])||data[k]<0)||inputGuild?.id!==id||outputGuild?.id!==id||inputGuild.atk!==data.atk||inputGuild.def!==data.def||!Array.isArray(edits))fail('unreviewed period input');
  // Frozen period prefix resets counters before the per-shop EditGuildMoney calls.
  data.in=0;data.out=0;
  for(const e of edits){
    if(e.guildId!==id||!integer(e.amount))fail('invalid edit');
    if(e.amount>0)data.in+=e.amount;
    if(e.amount<0)data.out-=e.amount;
    data.money+=e.amount;
  }
  data.atk=outputGuild.atk;data.def=outputGuild.def;
  if(fields.some(k=>!integer(data[k])||(k!=='money'&&data[k]<0)))fail('invalid result');
  return data;
}
export async function persistGuildPeriod({reviewed,directory,id,inputGuild,outputGuild,edits}){
  check(reviewed);
  const root=await rootFor(directory),live=path.join(root,'guildbal.cgi'),stage=path.join(root,'guildbal.stage');
  if(!(await lstat(live)).isFile())fail('regular ledger file required');
  const data=parseGuildLedger(await readFile(live,'utf8'),id);
  const next=applyGuildPeriod({data,id,inputGuild,outputGuild,edits});
  // Explicit field order is Node's sandbox representation, NOT Perl hash order.
  await writeFile(stage,[id,...fields.flatMap(k=>[k,next[k]])].join('\t')+'\n',{flag:'wx'});
  await rename(stage,live);
  return {ledger:parseGuildLedger(await readFile(live,'utf8'),id),committable:false,worldStateWritten:false};
}
