/**
 * Local POSIX sandbox proof of one joint CAS publication point.
 * Not B43 integration, production lock ownership, authorization, migration or
 * a replacement for the real common/street lock protocol.
 * Each generation is immutable; exclusive hard-link is the revision CAS.
 */
import fs,{constants as c} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {jointCanonical,jointDigest} from './r4-joint-source-projection.mjs';
const fail=s=>{throw new RangeError('R4 joint candidate journal: '+s)};
const format='akimono.r4-joint-candidate.v1',limit=1000000;
const generation=n=>'revision-'+String(n).padStart(6,'0')+'.json';
function syncDirectory(directory){
  const fd=fs.openSync(directory,c.O_RDONLY|(c.O_DIRECTORY??0));try{fs.fsyncSync(fd)}finally{fs.closeSync(fd)}
}
function readRecord(file){
  const before=fs.lstatSync(file);
  if(!before.isFile()||before.size>limit||before.size<10)fail('bounded regular record required');
  const fd=fs.openSync(file,c.O_RDONLY|(c.O_NOFOLLOW??0)|(c.O_NONBLOCK??0));
  try{
    const st=fs.fstatSync(fd);
    if(!st.isFile()||st.dev!==before.dev||st.ino!==before.ino||st.size!==before.size)fail('record changed while opening');
    const bytes=fs.readFileSync(fd,'utf8'),r=JSON.parse(bytes);
    if(jointCanonical(r)!==bytes)fail('noncanonical record');
    return r;
  }finally{fs.closeSync(fd)}
}
export function createJointCandidateJournal({directory,projector}){
  const root=fs.realpathSync(directory);
  if(process.platform==='win32'||path.dirname(root)!==fs.realpathSync(os.tmpdir())||
     !path.basename(root).startsWith('akimono-r4-joint-')||!fs.lstatSync(root).isDirectory()||
     projector?.committable!==false)fail('isolated local POSIX candidate only');
  function read(){
    const names=fs.readdirSync(root);
    if(names.some(n=>!/^revision-\d{6}\.json$/.test(n)&&!/^\.stage-[a-f0-9-]{36}$/.test(n)))fail('unexpected journal entry');
    const records=names.filter(n=>n.startsWith('revision-')).sort();
    if(records.length>256)fail('journal bound');
    let state=projector.initial(),parent=jointDigest([format,state]);
    for(let i=0;i<records.length;i++){
      if(records[i]!==generation(i+1))fail('generation gap');
      const r=readRecord(path.join(root,records[i]));
      if(r.format!==format||r.revision!==i+1||r.parent!==parent)fail('revision lineage mismatch');
      const next=projector.project(state,r.command);
      if(next.mode!=='published-candidate'||jointCanonical(next.receipt)!==jointCanonical(r.receipt)||
         jointDigest(next.state)!==r.stateDigest||
         Object.keys(r).sort().join(',')!=='command,format,parent,receipt,revision,stateDigest')fail('source replay mismatch');
      state=next.state;parent=jointDigest(r);
    }
    return {state,parent,committable:false};
  }
  async function publish(command,{afterStage,afterPublication}={}){
    const base=read(),result=projector.project(base.state,command);
    if(result.mode!=='published-candidate')return result;
    const r={format,parent:base.parent,revision:result.state.revision,command,receipt:result.receipt,stateDigest:jointDigest(result.state)};
    const bytes=jointCanonical(r);
    if(Buffer.byteLength(bytes)>limit)fail('record bound');
    const stage=path.join(root,'.stage-'+randomUUID()),target=path.join(root,generation(r.revision));
    try{
      const fd=fs.openSync(stage,c.O_WRONLY|c.O_CREAT|c.O_EXCL|(c.O_NOFOLLOW??0),0o600);
      try{fs.writeFileSync(fd,bytes,'utf8');fs.fsyncSync(fd)}finally{fs.closeSync(fd)}
      if(afterStage)await afterStage();
      try{fs.linkSync(stage,target)}catch(error){
        if(error.code==='EEXIST')return {mode:'conflict',state:read().state,committable:false};
        throw error;
      }
      syncDirectory(root);
      if(afterPublication)await afterPublication();
      return result;
    }finally{try{fs.unlinkSync(stage);syncDirectory(root)}catch(error){if(error.code!=='ENOENT')throw error}}
  }
  return Object.freeze({read,publish,committable:false});
}
