/** Isolated original-style multi-file commit, not a production lock/transaction. */
import {createHash} from 'node:crypto';
import {realpath,lstat,readdir,writeFile,rename,unlink,mkdir,readFile} from 'node:fs/promises';
import {serializeGuildEventLedgers,parseGuildEventLedgers} from './original-r4-guild-files.mjs';
import path from 'node:path';
import os from 'node:os';
const pins={write:'203f33b37511e838800a45b84183af98fcf46e4c',guild:'6593aa8a3ae4a1695c2418f12a3776f0053454ac',turn:'b8a4980275f475a952846a8d6072fad45f8dff50'};
const files=['army.cgi','guild.cgi','guildbal.cgi','play.cgi'];
const reviews=new WeakSet();
const fail=m=>{throw new RangeError('R4 external sandbox: '+m)};
export function reviewExternalFiles(sources){
  for(const [k,sha] of Object.entries(pins)){const s=sources[k];if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k)}
  const r=Object.freeze({committable:false});reviews.add(r);return r;
}
async function rootFor(reviewed,directory){
  if(!reviews.has(reviewed))fail('source review required');
  const root=await realpath(directory);
  if(path.dirname(root)!==await realpath(os.tmpdir())||!['akimono-r4-external-','akimono-r4-period-disk-'].some(p=>path.basename(root).startsWith(p)))fail('isolated external sandbox required');
  return root;
}
async function exists(p){try{return await lstat(p)}catch(e){if(e.code==='ENOENT')return null;throw e}}
async function stageFor(root){const stage=path.join(root,'stage');await mkdir(stage,{recursive:true});if(!(await lstat(stage)).isDirectory())fail('real stage required');return stage}
export async function stageEventGuildLedger({reviewed,directory,ledgers}){
  const root=await rootFor(reviewed,directory);
  if(await exists(path.join(root,'commit.cgi')))fail('pending commit requires recovery');
  const live=path.join(root,'guildbal.cgi');
  if(!(await lstat(live)).isFile())fail('regular live ledger required');
  const prior=parseGuildEventLedgers(new TextDecoder('utf8',{fatal:true}).decode(await readFile(live)));
  const sorted=o=>JSON.stringify(Object.keys(o).sort());
  if(!ledgers||sorted(prior)!==sorted(ledgers))fail('event ledger membership mismatch');
  for(const [id,row] of Object.entries(prior))for(const k of ['money','in','out','atk','def'])if(ledgers[id]?.[k]!==row[k])fail('event callback may not invent guild money');
  const bytes=serializeGuildEventLedgers(ledgers),stage=await stageFor(root);
  await writeFile(path.join(stage,'guildbal.cgi'),bytes,{flag:'wx'});
  return {bytes,committable:false};
}
export async function commitExternalFiles({reviewed,directory,expectedFiles,abort=false}){
  const root=await rootFor(reviewed,directory),stage=await stageFor(root),marker=path.join(root,'commit.cgi');
  if(typeof abort!=='boolean'||!Array.isArray(expectedFiles)||!expectedFiles.includes('play.cgi')||!expectedFiles.includes('guildbal.cgi')||new Set(expectedFiles).size!==expectedFiles.length||expectedFiles.some(n=>!files.includes(n)))fail('explicit reviewed file set required');
  const pending=await readdir(stage),m=await exists(marker);
  if(m&&!m.isFile())fail('invalid marker');
  if(pending.some(n=>!expectedFiles.includes(n)))fail('unreviewed staged file');
  for(const n of pending)if(!(await lstat(path.join(stage,n))).isFile())fail('regular staged file required');
  if(abort&&!m){for(const n of pending)await unlink(path.join(stage,n));return {mode:'discard',committable:false}}
  if(!m&&pending.length!==expectedFiles.length)fail('incomplete stage; do not commit');
  if(!m)await writeFile(marker,'',{flag:'wx'});
  // Explicit order for this test adapter only. Original uses readdir order.
  for(const n of files.filter(n=>pending.includes(n)))await rename(path.join(stage,n),path.join(root,n));
  await unlink(marker);
  return {mode:abort?'recover':'commit',committable:false,worldStateWritten:false};
}
