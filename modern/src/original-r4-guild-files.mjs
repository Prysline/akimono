/** Isolated guild definition and ledger files; no formal period/CAS commit. */
import {createHash} from 'node:crypto';
import {readFile,writeFile,rename,unlink,readdir,realpath,lstat,mkdir} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {parseGuildLedger,applyGuildPeriod} from './original-r4-guild-ledger-file.mjs';
const pins=Object.freeze({guildsub:'4dee1edeeedf3b482b8786111e1e5d626095f8d5',config:'010e43766c1b78c7572cbc0aded2daf03dc07a1e',sub:'33c767f434d7d6f0c5e9e0c9a291472b3a0f3b25',guild:'6593aa8a3ae4a1695c2418f12a3776f0053454ac',write:'203f33b37511e838800a45b84183af98fcf46e4c',turn:'b8a4980275f475a952846a8d6072fad45f8dff50',period:'6183e88e9dd69a16606a1064c8084e9a1411dbd5'});
const fail=m=>{throw new RangeError('R4 guild files: '+m)};
const reviews=new WeakSet();
const code=s=>typeof s==='string'&&/^[A-Za-z][A-Za-z0-9_]*$/.test(s)&&!['constructor','prototype'].includes(s);
const keys=['money','in','out','atk','def'];
const fileNames=['guild.cgi','guildbal.cgi'];
const prefix="use utf8;\n$GUILDIDX_name=0;$GUILDIDX_dealrate=1;$GUILDIDX_feerate=2;%GUILD=(";
export function reviewGuildFiles(sources){
  for(const [k,sha] of Object.entries(pins)){
    const s=sources[k];
    if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k);
  }
  const result=Object.freeze({committable:false});reviews.add(result);return result;
}
function review(r){if(!reviews.has(r))fail('source review required')}
async function rootFor(directory){
  const root=await realpath(directory);
  if(path.dirname(root)!==await realpath(os.tmpdir())||!path.basename(root).startsWith('akimono-r4-guild-'))fail('isolated sandbox required');
  return root;
}
async function regular(file){if(!(await lstat(file)).isFile())fail('regular file required');return new TextDecoder('utf-8',{fatal:true}).decode(await readFile(file))}
async function dir(file){if(!(await lstat(file)).isDirectory())fail('real directory required');return file}
async function exists(file){try{return await lstat(file)}catch(e){if(e.code==='ENOENT')return null;throw e}}
function value(s){if(!/^(0|[1-9]\d*)$/.test(s)||Number(s)>1000)fail('unreviewed guild rate');return Number(s)}
function name(s){if(typeof s!=='string'||!s||/['\\\r\n\t]/.test(s))fail('unreviewed Perl string');return s}
export function parseGuildDefinition(text){
  if(!text.startsWith(prefix)||!text.endsWith(');1;'))fail('invalid generated source');
  const rows={};let body=text.slice(prefix.length,-4);
  while(body.length){
    const m=/^'([A-Za-z][A-Za-z0-9_]*)'=>\['([^'\\\r\n\t]+)',(\d+),(\d+),\],/.exec(body);
    if(!m||!code(m[1])||Object.hasOwn(rows,m[1]))fail('invalid generated row');
    rows[m[1]]={shortname:name(m[2]),dealrate:value(m[3]),feerate:value(m[4])};body=body.slice(m[0].length);
  }
  return rows;
}
export function parseGuildLedgers(text){
  if(typeof text!=='string'||(text&&!text.endsWith('\n')))fail('invalid ledger text');
  const rows={};
  for(const line of text.split('\n').slice(0,-1)){
    const id=line.split('\t')[0];
    if(!code(id)||Object.hasOwn(rows,id))fail('invalid or duplicate guild code');
    rows[id]=parseGuildLedger(line+'\n',id);
  }
  return rows;
}
function parseConfig(text){
  if(!text.endsWith('\n')||text.includes('\r'))fail('unreviewed config line ending');
  const fields={};
  for(let line of text.split('\n').slice(0,-1)){
    line=line.replace(/#.*$/,'').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
    if(!line.trim())continue;
    const m=/^\s*(.+?)\s*=\s*(.+?)\s*$/.exec(line);
    if(!m||!['shortname','dealrate','feerate'].includes(m[1])||Object.hasOwn(fields,m[1]))fail('unreviewed definition field');
    fields[m[1]]=m[2];
  }
  if(Object.keys(fields).length!==3)fail('missing definition field');
  return {shortname:name(fields.shortname),dealrate:value(fields.dealrate),feerate:value(fields.feerate)};
}
const sameKeys=(a,b)=>JSON.stringify(Object.keys(a).sort())===JSON.stringify(Object.keys(b).sort());
export async function stageGuildFiles({reviewed,directory,edits=[],periods=[],shops=[]}){
  review(reviewed);const root=await rootFor(directory);
  const common=await dir(path.join(root,'common')),stage=await dir(path.join(root,'stage'));
  if(await exists(path.join(root,'commit.cgi'))||(await readdir(stage)).length)fail('pending files require recovery');
  const old=parseGuildDefinition(await regular(path.join(root,'guild.cgi')));
  const ledger=parseGuildLedgers(await regular(path.join(root,'guildbal.cgi')));
  if(!sameKeys(old,ledger))fail('live guild and ledger mismatch');
  const definitions={};
  for(const file of (await readdir(common)).sort()){
    if(!/^[A-Za-z][A-Za-z0-9_]*\.pl$/.test(file)||!code(file.slice(0,-3)))fail('unreviewed common entry');
    definitions[file.slice(0,-3)]=parseConfig(await regular(path.join(common,file)));
  }
  if(!Array.isArray(edits)||!Array.isArray(periods)||!Array.isArray(shops)||edits.length&&periods.length)fail('explicit edits or periods required');
  // A period replay is limited to the existing B-50 single-member source chain.
  for(const p of periods){
    if(Object.keys(ledger).length!==1||!Object.hasOwn(ledger,p.id)||p.inputGuild?.feeRate!==old[p.id].feerate||p.outputGuild?.feeRate!==old[p.id].feerate)fail('unreviewed period context');
    ledger[p.id]=applyGuildPeriod({id:p.id,inputGuild:p.inputGuild,outputGuild:p.outputGuild,edits:p.edits,data:ledger[p.id]});
  }
  for(const {guildId,amount} of edits){
    if(!Object.hasOwn(ledger,guildId)||!Number.isSafeInteger(amount))fail('unreviewed money edit');
    const g=ledger[guildId];g.money+=amount;if(amount>0)g.in+=amount;if(amount<0)g.out-=amount;
    if(keys.some(k=>!Number.isSafeInteger(g[k])))fail('ledger overflow');
  }
  const updated=structuredClone(shops);
  const removed=Object.keys(old).filter(k=>!Object.hasOwn(definitions,k));
  const added=Object.keys(definitions).filter(k=>!Object.hasOwn(old,k));
  for(const shop of updated)if(removed.includes(shop.guild)){shop.guild='';delete shop.user._so_e}
  const logCalls=[
    ...removed.map(id=>[1,0,'ギルド「'+old[id].shortname+'」は滅びました。',1]),
    ...added.map(id=>[1,0,'ギルド「'+definitions[id].shortname+'」が結成されました。',1]),
  ];
  // MakeGuildFile does not reload %GUILD. WriteGuildData still uses old keys.
  const defBytes=prefix+Object.entries(definitions).map(([id,g])=>"'"+id+"'=>['"+g.shortname+"',"+g.dealrate+","+g.feerate+",],").join('')+');1;';
  const balBytes=Object.keys(old).map(id=>[id,...keys.flatMap(k=>[k,ledger[id][k]])].join('\t')+'\n').join('');
  await writeFile(path.join(stage,'guild.cgi'),defBytes,{flag:'wx'});
  await writeFile(path.join(stage,'guildbal.cgi'),balBytes,{flag:'wx'});
  return {definitions,ledger,shops:updated,removed,added,logCalls,committable:false,worldStateWritten:false};
}
export async function commitGuildFiles({reviewed,directory,abort=false}){
  review(reviewed);if(typeof abort!=='boolean')fail('invalid abort');
  const root=await rootFor(directory),stage=await dir(path.join(root,'stage')),marker=path.join(root,'commit.cgi');
  const pending=await readdir(stage);if(pending.some(x=>!fileNames.includes(x)))fail('unreviewed staged file');
  for(const n of pending)if(!(await lstat(path.join(stage,n))).isFile())fail('invalid staged file');
  const m=await exists(marker);if(m&&!m.isFile())fail('invalid marker');
  if(!pending.length){if(m)await unlink(marker);return {mode:'empty',committable:false}}
  if(abort&&!m){for(const n of pending)await unlink(path.join(stage,n));return {mode:'discard',committable:false}}
  if(!m&&pending.length!==fileNames.length)fail('incomplete stage; discard without marker');
  if(!m)await writeFile(marker,'',{flag:'wx'});
  // Deterministic sandbox order only; original readdir order is not guaranteed.
  for(const n of fileNames.filter(n=>pending.includes(n)))await rename(path.join(stage,n),path.join(root,n));
  await unlink(marker);return {mode:abort?'recover':'commit',committable:false};
}

/** Original inc-turn end mtime comparison, not a full inc-turn executor.
 * Missing/symlink/unknown files fail closed instead of Perl's warning/coercion.
 */
export async function guildRebuildNeeded({reviewed,directory}){
  review(reviewed);
  const root=await rootFor(directory),common=await dir(path.join(root,'common'));
  const generated=await lstat(path.join(root,'guild.cgi'));
  if(!generated.isFile())fail('regular generated file required');
  let latest=0;
  for(const n of await readdir(common)){
    if(!/^[A-Za-z][A-Za-z0-9_]*\.pl$/.test(n)||!code(n.slice(0,-3)))fail('unreviewed common entry');
    const s=await lstat(path.join(common,n));if(!s.isFile())fail('regular definition required');
    latest=Math.max(latest,Math.floor(s.mtimeMs/1000));
  }
  return Math.floor(generated.mtimeMs/1000)<latest;
}
