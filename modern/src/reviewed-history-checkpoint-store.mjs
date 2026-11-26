/** Local B-43 checkpoint authentication and retained source-proof segments.
 * Trust boundary: trusted local server account, untrusted save/proof files.
 * A process/account able to read the private key is outside this boundary.
 * No key, signature, anchor or checkpoint is accepted from a player request.
 */
import fs,{constants as c} from 'node:fs';
import path from 'node:path';
import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {R4_HASH_POLICY,R4_COMMAND_HASH_POLICY,R4_EXTERNAL_COMMAND_HASH_POLICY} from './original-r4-perl-hash-replay.mjs';
import {R4_TIME_DRAW_POLICY,R4_CROSS_PERIOD_DRAW_POLICY} from './r4-time-command-draws.mjs';

const authenticatedStores=new WeakSet();
export function isReviewedHistoryCheckpointStore(store){return authenticatedStores.has(store);}
export const CHECKPOINT_DIRECTORY='reviewed-history-v1';
const FORMAT='akimono.reviewed-history-checkpoint.v1';
const MAX_PROOF=500000;
const fail=s=>{throw new RangeError('R4 checkpoint: '+s)};
const sha=s=>createHash('sha256').update(s).digest('hex');
const digest=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const int=n=>Number.isSafeInteger(n)&&n>=0;
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===keys.split(',').sort().join(',');
const hmac=(key,domain,value)=>createHmac('sha256',key).update(JSON.stringify([domain,value])).digest('hex');
function equalMac(a,b){
  return digest(a)&&digest(b)&&timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));
}
function syncDir(dir){
  if(process.platform==='win32')return;
  const fd=fs.openSync(dir,c.O_RDONLY|(c.O_DIRECTORY??0));
  try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
}
function directory(dir,create=false,privateDir=false){
  if(create)fs.mkdirSync(dir,{recursive:true,mode:0o700});
  const st=fs.lstatSync(dir);
  if(!st.isDirectory()||st.isSymbolicLink()||(privateDir&&process.platform!=='win32'&&(st.mode&0o077)!==0))
    fail('unsafe checkpoint directory');
}
function readBounded(filename,max,privateFile=false){
  const fd=fs.openSync(filename,c.O_RDONLY|(c.O_NOFOLLOW??0));
  try{
    const st=fs.fstatSync(fd);
    if(!st.isFile()||st.nlink!==1||st.size>max||
       (privateFile&&process.platform!=='win32'&&(st.mode&0o077)!==0))fail('unsafe checkpoint file');
    const result=fs.readFileSync(fd);
    if(result.length>max)fail('oversized checkpoint file');
    return result;
  }finally{fs.closeSync(fd);}
}
// Source and executable policy identity is deliberately conservative. A
// changed server implementation needs a reviewed migration, not silent trust.
export function fingerprintReviewedCheckpointRuntime({sources,sourceDirectory,entrypoint}){
  const inputs=fs.readdirSync(sourceDirectory).filter(n=>n.endsWith('.mjs')).sort()
    .map(n=>[n,sha(fs.readFileSync(path.join(sourceDirectory,n)))]);
  const sourceFingerprint=sha(JSON.stringify([FORMAT,process.version,
    inputs,sha(fs.readFileSync(entrypoint)),sources.map(s=>sha(s))]));
  const env={...process.env};
  for(const k of Object.keys(env))if(k.startsWith('PERL'))delete env[k];
  let interpreter;
  try{interpreter=execFileSync('perl',['-MConfig','-e','print "$^V/$Config{archname}"'],
    {env,encoding:'utf8',timeout:3000,maxBuffer:1024,stdio:['ignore','pipe','pipe']});}
  catch{fail('native Perl interpreter unavailable');}
  if(!interpreter||interpreter.length>120)fail('invalid interpreter fingerprint');
  return {sourceFingerprint,interpreter};
}
export function createReviewedHistoryCheckpointStore({directory:saveDirectory,sourceFingerprint,interpreter,crossPeriod=false,externalRebel=false}){
  if(!digest(sourceFingerprint)||typeof interpreter!=='string'||!interpreter||interpreter.length>120)fail('runtime identity required');
  if(typeof externalRebel!=='boolean'||externalRebel&&!crossPeriod)fail('external checkpoint requires crossing');
  const hashPolicy=(crossPeriod?R4_HASH_POLICY+'+'+R4_COMMAND_HASH_POLICY:R4_HASH_POLICY)+(externalRebel?'+'+R4_EXTERNAL_COMMAND_HASH_POLICY:'');
  const drawPolicy=crossPeriod?R4_TIME_DRAW_POLICY+'+'+R4_CROSS_PERIOD_DRAW_POLICY:R4_TIME_DRAW_POLICY;
  const base=path.resolve(saveDirectory),dir=path.join(base,CHECKPOINT_DIRECTORY),keyPath=path.join(dir,'key');
  function key(create=false){
    if(create){
      directory(base,true);directory(dir,true,true);syncDir(base);
    }else{directory(base);directory(dir,false,true);}
    let value;
    try{value=readBounded(keyPath,32,true);}
    catch(error){
      if(!create||error.code!=='ENOENT')throw error;
      // Never silently replace a missing key after a prefix was retained.
      if(fs.readdirSync(dir).length!==0)fail('missing checkpoint key with existing history');
      const fd=fs.openSync(keyPath,c.O_CREAT|c.O_EXCL|c.O_WRONLY|(c.O_NOFOLLOW??0),0o600);
      try{fs.writeFileSync(fd,randomBytes(32));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
      syncDir(dir);
      value=readBounded(keyPath,32,true);
    }
    if(value.length!==32)fail('invalid checkpoint key');
    return value;
  }
  const prefixPath=d=>path.join(dir,'prefix-'+d+'.json');
  function retain(proofText,d){
    const dest=prefixPath(d);
    try{
      if(readBounded(dest,MAX_PROOF).toString('utf8')!==proofText)fail('existing prefix differs');
      return;
    }catch(error){if(error.code!=='ENOENT')throw error;}
    const temp=path.join(dir,'.prefix-'+randomBytes(16).toString('hex'));
    let fd;
    try{
      fd=fs.openSync(temp,c.O_CREAT|c.O_EXCL|c.O_WRONLY|(c.O_NOFOLLOW??0),0o600);
      fs.writeFileSync(fd,proofText,'utf8');fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;
      // Exclusive final name: do not overwrite a retained audit segment.
      fs.linkSync(temp,dest);fs.unlinkSync(temp);syncDir(dir);
      if(readBounded(dest,MAX_PROOF).toString('utf8')!==proofText)fail('retained prefix readback');
    }finally{
      if(fd!==undefined)fs.closeSync(fd);
      try{fs.unlinkSync(temp);}catch(error){if(error.code!=='ENOENT')throw error;}
    }
  }
  function metadata(proof){
    if(!exact(proof,'anchorKind,anchor,commands,checkpoint')||proof.anchorKind!=='checkpoint'||
       typeof proof.anchor!=='string'||Buffer.byteLength(proof.anchor)>200000)fail('checkpoint proof shape');
    const p=proof.checkpoint;
    if(!exact(p,'format,worldId,streetId,revision,generation,originSha256,prefixSha256,worldSha256,sourceFingerprint,interpreter,hashPolicy,drawPolicy,mac')||
       p.format!==FORMAT||typeof p.worldId!=='string'||typeof p.streetId!=='string'||!int(p.revision)||!int(p.generation)||
       !digest(p.originSha256)||!digest(p.prefixSha256)||p.worldSha256!==sha(proof.anchor)||
       p.sourceFingerprint!==sourceFingerprint||p.interpreter!==interpreter||
       p.hashPolicy!==hashPolicy||p.drawPolicy!==drawPolicy)
      fail('checkpoint source, runtime or state identity');
    const {mac,...body}=p;
    if(!equalMac(mac,hmac(key(),FORMAT,body)))fail('checkpoint authentication failed');
    const anchor=JSON.parse(proof.anchor);
    if(anchor.worldId!==p.worldId||anchor.streetId!==p.streetId||anchor.revision!==p.revision)fail('checkpoint anchor lineage');
    return p;
  }
  function openPrefix(proof,generation=null){
    const p=metadata(proof);
    if(generation!==null&&(!int(generation)||p.generation>=generation))fail('checkpoint save generation lineage');
    const wire=readBounded(prefixPath(p.prefixSha256),MAX_PROOF).toString('utf8');
    if(sha(wire)!==p.prefixSha256)fail('retained prefix digest mismatch');
    const prior=JSON.parse(wire);
    if(JSON.stringify(prior)!==wire||!Array.isArray(prior.commands)||prior.commands.length<1||prior.commands.length>128||
       typeof prior.anchor!=='string')fail('retained prefix wire');
    const a=JSON.parse(prior.anchor);
    if(a.worldId!==p.worldId||a.streetId!==p.streetId||a.revision+prior.commands.length!==p.revision||
       a.revision>=p.revision)fail('retained prefix revision lineage');
    const origin=prior.anchorKind==='checkpoint'?prior.checkpoint?.originSha256:
      sha(JSON.stringify([prior.anchorKind,prior.anchor]));
    if(origin!==p.originSha256)fail('retained original anchor lineage');
    return prior;
  }
  // Every retained segment remains part of the authenticated lineage. A
  // valid newest HMAC cannot hide a lost or damaged earlier prefix. Walk
  // decreasing revisions iteratively; do not replay already signed commands.
  function verifyChain(proof,generation=null){
    let cursor=proof,ceiling=generation;
    while(cursor.anchorKind==='checkpoint'){
      const prior=openPrefix(cursor,ceiling);
      if(prior.anchorKind==='checkpoint'){
        // Multiple rotations may occur before the next explicit save.
        if(prior.checkpoint?.generation>cursor.checkpoint.generation)fail('retained checkpoint generation order');
      }else if(prior.anchorKind!=='fresh')fail('retained chain must originate at a fresh anchor');
      ceiling=null;
      cursor=prior;
    }
    if(cursor.anchorKind!=='fresh'||!exact(cursor,'anchorKind,anchor,commands'))fail('retained fresh origin shape');
    const origin=JSON.parse(cursor.anchor);
    if(origin.revision!==1||!Array.isArray(origin.shops)||origin.shops.length!==0)fail('retained fresh origin state');
    return true;
  }
  // Only the shared history replayer calls this AFTER source verification.
  // Archive exactly the validated predecessor wire, never a guessed state.
  function sealVerified({world,anchor,proof,generation}){
    if(!int(generation)||!proof.commands.length||Buffer.byteLength(anchor)>200000)fail('checkpoint bounds');
    const wire=JSON.stringify(proof);
    if(Buffer.byteLength(wire)>MAX_PROOF)fail('prefix too large');
    const originSha256=proof.anchorKind==='checkpoint'?metadata(proof).originSha256:
      sha(JSON.stringify([proof.anchorKind,proof.anchor]));
    const signingKey=key(true),prefixSha256=sha(wire);
    retain(wire,prefixSha256);
    const body={format:FORMAT,worldId:world.worldId,streetId:world.streetId,revision:world.revision,
      generation,originSha256,prefixSha256,worldSha256:sha(anchor),sourceFingerprint,interpreter,
      hashPolicy,drawPolicy};
    const next={anchorKind:'checkpoint',anchor,commands:[],checkpoint:{...body,mac:hmac(signingKey,FORMAT,body)}};
    verifyChain(next);
    return next;
  }
  // Sign the actual outer B-43 generation as well as the checkpoint's
  // creation generation. The historical v1 SHA-only envelope stays unchanged.
  function recordAuth({generation,world,careerProof}){
    return hmac(key(),FORMAT+'/save',[generation,world,careerProof]);
  }
  function verifyRecord(record){
    if(!equalMac(record.checkpointAuth,recordAuth(record)))fail('checkpoint save authentication failed');
  }
  const store=Object.freeze({sealVerified,openPrefix,verifyChain,recordAuth,verifyRecord});authenticatedStores.add(store);return store;
}
