/** Actual isolated period rotation + DataFilesBackup. Never a WorldState commit. */
import {createHash} from 'node:crypto';
import {readFile,writeFile,realpath,lstat,readdir,mkdir,rename,unlink,utimes} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const pins={period:'6183e88e9dd69a16606a1064c8084e9a1411dbd5',write:'203f33b37511e838800a45b84183af98fcf46e4c',config:'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0'};
const files=Object.freeze(['log0.cgi','log1.cgi','log2.cgi','guildbal.cgi','play.cgi']);
const reviews=new WeakSet();
const fail=m=>{throw new RangeError('R4 backup disk: '+m)};
export function reviewBackupDisk(sources){
  for(const [k,sha] of Object.entries(pins)){
    const s=sources[k];if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k);
  }
  const r=Object.freeze({committable:false});reviews.add(r);return r;
}
async function rootFor(reviewed,directory){
  if(!reviews.has(reviewed))fail('source review required');
  const root=await realpath(directory);
  if(path.dirname(root)!==await realpath(os.tmpdir())||!path.basename(root).startsWith('akimono-r4-period-disk-'))fail('isolated sandbox required');
  return root;
}
async function existing(p){try{return await lstat(p)}catch(e){if(e.code==='ENOENT')return null;throw e}}
async function regular(p){const s=await lstat(p);if(!s.isFile())fail('regular file required '+path.basename(p));return s}
async function directory(p){if(!(await lstat(p)).isDirectory())fail('real directory required '+path.basename(p));}
async function liveBytes(root){
  const data={};
  for(const n of files){
    const p=path.join(root,n);await regular(p);
    const b=await readFile(p);new TextDecoder('utf-8',{fatal:true}).decode(b);data[n]=b;
  }
  return data;
}
async function checkDestination(dir){
  await directory(dir);
  for(const n of await readdir(dir)){
    if(!files.includes(n))fail('unreviewed backup entry '+n);
    await regular(path.join(dir,n));
  }
}
async function copyBytes(dir,data){
  for(const n of files)await writeFile(path.join(dir,n),data[n]);
}
function timestamp(n){if(!Number.isSafeInteger(n)||n<1)fail('explicit timestamp required');}
async function noMarker(root){if(await existing(path.join(root,'commit.cgi')))fail('pending commit requires recovery')}
export async function rotatePeriodBackupDisk({reviewed,directory:dir,nowSeconds}){
  timestamp(nowSeconds);
  const root=await rootFor(reviewed,dir);await noMarker(root);
  const data=await liveBytes(root);
  const base=path.join(root,'backup'),work=base+'_work',session=path.join(root,'session');
  if(await existing(work))fail('unfinished rotation requires manual recovery');
  for(const n of [1,2,3]){if(await existing(base+n))await checkDestination(base+n);}
  await directory(session);
  const expired=[];
  for(const n of await readdir(session)){
    const s=await regular(path.join(session,n));
    if(/^.+\.cgi$/.test(n)&&Math.floor(s.mtimeMs/1000)<nowSeconds-604800)expired.push(n);
  }
  // Missing generations are mkdir'd in the same source order. A rotation
  // is not atomic: after an OS error, stop and preserve evidence, not retry.
  if(!await existing(base+3))await mkdir(base+3);
  await rename(base+3,work);
  for(const n of [2,1]){
    if(!await existing(base+n))await mkdir(base+n);
    await rename(base+n,base+(n+1));
  }
  await rename(work,base+1);
  await copyBytes(base+1,data);
  for(const n of expired)await unlink(path.join(session,n));
  return {deletedSessions:expired,cutoffSeconds:nowSeconds-604800,committable:false};
}
/** DataWrite prelude: backup only when strictly older, then touch lasttime.
 * Read/validate all sources before copying so corrupt/missing input fails
 * closed rather than mimicking the original unchecked open/print.
 */
export async function dataWriteBackupDisk({reviewed,directory:dir,nowSeconds,lasttime}){
  timestamp(nowSeconds);timestamp(lasttime);
  const root=await rootFor(reviewed,dir);await noMarker(root);
  const backup=path.join(root,'backup'),clock=path.join(root,'lasttime.cgi');
  await checkDestination(backup);await regular(clock);
  const old=await regular(path.join(backup,'play.cgi'));
  const copied=Math.floor(old.mtimeMs/1000)<nowSeconds-3600;
  if(copied)await copyBytes(backup,await liveBytes(root));
  await utimes(clock,lasttime,lasttime);
  return {copied,committable:false};
}
