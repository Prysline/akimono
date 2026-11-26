// White-box defense-in-depth regression. Test-only signing uses the private
// key of this disposable genuine player's directory, not a production key.
// Ordinary players cannot sign either envelope. Never use these negative
// mutations as a positive fixture or claim they model a key-compromise threat.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash,createHmac} from 'node:crypto';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';
import {createReviewedHistoryCheckpointStore} from '../src/reviewed-history-checkpoint-store.mjs';

const FORMAT='akimono.reviewed-history-checkpoint.v1';
const sha=s=>createHash('sha256').update(s).digest('hex');

test('R1 checkpoint inner guards reject independently of a valid outer HMAC, then HTTP recovers the prior slot',async t=>{
 const p=await genuinePlayer(t,{now:null,crossPeriod:true});
 await p.use(79,0);
 await p.ore(5,150);
 assert.ok(p.stock(5)>=150);
 const first=await p.saveAndRestart(0);
 const rev=p.state.world.revision,clock=p.state.world.nowSeconds,stock=p.stock(5);
 for(let i=0;i<130;i++){
  await p.discard(5,1);
  assert.equal(p.state.world.revision,rev+i+1);
  assert.equal(p.state.world.nowSeconds,clock);
  assert.equal(p.stock(5),stock-i-1);
  assert.ok(p.state.historyCommands<=128);
 }
 assert.ok(Number.isSafeInteger(p.state.historyCheckpointRevision));
 const second=await p.saveAndRestart(1);
 const latestPath=join(p.directory,'world-a.json');
 const original=await readFile(latestPath,'utf8'),record=JSON.parse(original);
 const prior=await readFile(join(p.directory,'world-b.json'),'utf8');
 const proof=JSON.parse(record.careerProof);
 assert.equal(record.generation,2);
 assert.equal(proof.anchorKind,'checkpoint');
 const key=await readFile(join(p.directory,'reviewed-history-v1','key'));
 assert.equal(key.length,32);
 const store=createReviewedHistoryCheckpointStore({directory:p.directory,
  sourceFingerprint:proof.checkpoint.sourceFingerprint,interpreter:proof.checkpoint.interpreter,crossPeriod:true});
 const mac=(domain,value)=>createHmac('sha256',key).update(JSON.stringify([domain,value])).digest('hex');
 function signMetadata(q){
  const {mac:old,...body}=q.checkpoint;
  q.checkpoint={...body,mac:mac(FORMAT,body)};
 }
 function signOuter(r){
  r.sha256=sha(JSON.stringify([r.format,r.generation,r.world,r.careerProof]));
  r.checkpointAuth=mac(FORMAT+'/save',[r.generation,r.world,r.careerProof]);
 }
 assert.equal(record.sha256,sha(JSON.stringify([record.format,record.generation,record.world,record.careerProof])));
 assert.equal(record.checkpointAuth,mac(FORMAT+'/save',[record.generation,record.world,record.careerProof]));
 store.verifyRecord(record);
 assert.equal(store.verifyChain(proof,record.generation),true);
 const variants=[
  ['inner MAC',q=>{q.checkpoint.mac='0'.repeat(64);},false,/checkpoint authentication failed/],
  ['source fingerprint',q=>{q.checkpoint.sourceFingerprint='0'.repeat(64);},true,/checkpoint source, runtime or state identity/],
  ['interpreter',q=>{q.checkpoint.interpreter='unreviewed-interpreter';},true,/checkpoint source, runtime or state identity/],
  ['hash policy',q=>{q.checkpoint.hashPolicy='unreviewed-hash';},true,/checkpoint source, runtime or state identity/],
  ['draw policy',q=>{q.checkpoint.drawPolicy='unreviewed-draw';},true,/checkpoint source, runtime or state identity/],
  ['checkpoint generation',q=>{q.checkpoint.generation=record.generation;},true,/checkpoint save generation lineage/],
  ['anchor revision',q=>{q.checkpoint.revision++;},true,/checkpoint anchor lineage/],
  ['retained origin',q=>{q.checkpoint.originSha256='0'.repeat(64);},true,/retained original anchor lineage/],
 ];
 for(const [name,mutate,resign,reason] of variants){
  await p.rejectForgedLatest(first,r=>{
   const q=JSON.parse(r.careerProof);mutate(q);
   if(resign)signMetadata(q);
   r.careerProof=JSON.stringify(q);
   signOuter(r);
   // Explicit control: the altered record passes the outer authentication;
   // verify the exact inner reason before the separate HTTP recovery.
   assert.equal(r.checkpointAuth,store.recordAuth(r),name);
   store.verifyRecord(r);
   assert.throws(()=>store.verifyChain(q,r.generation),reason,name);
   t.diagnostic('R1_INNER_GUARD '+name+' '+reason.source);
  },{restore:true,recompute:false});
  assert.deepEqual(p.state.world,second,name);
  assert.equal(await readFile(latestPath,'utf8'),original,name);
  assert.equal(await readFile(join(p.directory,'world-b.json'),'utf8'),prior,name);
 }
});
