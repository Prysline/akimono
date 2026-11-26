/** Immutable materialized source files. The B43 slot is the only publication
 * pointer; abandoned staging never advances or partially publishes a world.
 * Local single-writer account trust boundary, no shared original CGI dir.
 */
import fs,{constants as c} from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {R4_INDEPENDENT_DISK} from './original-r4-independent-world-disk.mjs';
export const PERIOD_DISK_DIRECTORY='reviewed-period-files-v1';
const fail=s=>{throw new RangeError('R4 source file generation: '+s)};
const sha=s=>createHash('sha256').update(s).digest('hex');
const baseNames=['log0.cgi','log1.cgi','log2.cgi','guildbal.cgi','play.cgi'];
function dir(p,create=false){if(create)fs.mkdirSync(p,{recursive:true,mode:0o700});const st=fs.lstatSync(p);if(!st.isDirectory()||st.isSymbolicLink())fail('real directory required');}
function syncDir(p){if(process.platform==='win32')return;const fd=fs.openSync(p,c.O_RDONLY|(c.O_DIRECTORY??0));try{fs.fsyncSync(fd)}finally{fs.closeSync(fd)}}
function layout(world){
  const d=world?.period?.disk;
  if(d?.source!==R4_INDEPENDENT_DISK||Buffer.byteLength(JSON.stringify(d))>100000)fail('bounded source disk required');
  const out={};
  function collect(prefix,entries,names){
    if(!entries||Object.keys(entries).sort().join(',')!==[...names].sort().join(','))fail('unexpected file layout');
    for(const n of names){const f=entries[n];if(typeof f?.bytes!=='string'||!Number.isSafeInteger(f.mtime)||f.mtime<0||f.mtime>world.nowSeconds)fail('source file entry');out[prefix+n]=f;}
  }
  collect('',d.live,[...baseNames,'guild.cgi','lasttime.cgi',...(Object.hasOwn(d.live??{},'army.cgi')?['army.cgi']:[])]);
  collect('backup/',d.backup,baseNames);
  if(!Array.isArray(d.generations)||d.generations.length!==3)fail('three backup generations required');
  d.generations.forEach((g,i)=>{if(g!==null)collect('backup'+(i+1)+'/',g,baseNames)});
  return out;
}
export function independentPeriodDiskDigest(world){return sha(JSON.stringify(world.period.disk))}
export function createIndependentPeriodDiskStore({directory}){
  const base=path.resolve(directory),root=path.join(base,PERIOD_DISK_DIRECTORY);
  function verify(world){
    const files=layout(world),target=path.join(root,independentPeriodDiskDigest(world));dir(base);dir(root);dir(target);
    const subdirs=new Set(Object.keys(files).filter(n=>n.includes('/')).map(n=>n.split('/')[0]));
    const expected=[...Object.keys(files).filter(n=>!n.includes('/')),...subdirs].sort();
    if(JSON.stringify(fs.readdirSync(target).sort())!==JSON.stringify(expected))fail('file generation layout mismatch');
    for(const sub of subdirs){const p=path.join(target,sub);dir(p);if(JSON.stringify(fs.readdirSync(p).sort())!==JSON.stringify(baseNames.slice().sort()))fail('backup layout mismatch');}
    for(const [name,f] of Object.entries(files)){
      const p=path.join(target,name),fd=fs.openSync(p,c.O_RDONLY|(c.O_NOFOLLOW??0));
      try{const st=fs.fstatSync(fd);if(!st.isFile()||st.nlink!==1||st.size!==Buffer.byteLength(f.bytes)||Math.floor(st.mtimeMs/1000)!==f.mtime||!fs.readFileSync(fd).equals(Buffer.from(f.bytes)))fail('source file bytes or clock mismatch '+name);}
      finally{fs.closeSync(fd)}
    }
    return true;
  }
  function stage(world){
    const files=layout(world);dir(base,true);dir(root,true);syncDir(base);
    const target=path.join(root,independentPeriodDiskDigest(world));
    try{fs.lstatSync(target);return verify(world)}catch(error){if(error.code!=='ENOENT')throw error;}
    // A partially present existing generation is corruption, not repair.
    if(fs.existsSync(target))fail('incomplete immutable generation');
    const temp=path.join(root,'.stage-'+randomUUID());fs.mkdirSync(temp,{mode:0o700});
    try{
      for(const [name,f] of Object.entries(files)){
        const p=path.join(temp,name),parent=path.dirname(p);if(parent!==temp)fs.mkdirSync(parent,{recursive:true,mode:0o700});
        const fd=fs.openSync(p,c.O_WRONLY|c.O_CREAT|c.O_EXCL|(c.O_NOFOLLOW??0),0o600);
        try{fs.writeFileSync(fd,f.bytes,'utf8');fs.futimesSync(fd,f.mtime,f.mtime);fs.fsyncSync(fd)}finally{fs.closeSync(fd)}
      }
      for(const n of fs.readdirSync(temp)){const p=path.join(temp,n);if(fs.lstatSync(p).isDirectory())syncDir(p);}
      syncDir(temp);fs.renameSync(temp,target);syncDir(root);
      return verify(world);
    }finally{if(fs.existsSync(temp))fs.rmSync(temp,{recursive:true,force:true})}
  }
  return Object.freeze({stage,verify});
}
