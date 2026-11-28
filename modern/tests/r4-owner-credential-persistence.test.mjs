import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile,rename,lstat} from 'node:fs/promises';
import fs,{readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {createPeriodMemoryWorld,encodeMemorySnapshot} from '../src/game-core-contract.mjs';
import {normalizeLocalSourceText} from '../src/local-source-text.mjs';
import {createLocalWorldSaveStore,LOCAL_SAVE_FORMAT,AccountPublicationUncertainError} from '../src/local-world-save-store.mjs';
import {createReviewedHistoryCheckpointStore,CHECKPOINT_DIRECTORY} from '../src/reviewed-history-checkpoint-store.mjs';
import {createOwnerCredentialRecord,rebindOwnerCredentialForRename,verifyOwnerCredential,createCommittedOwnerCredentialReader} from '../src/r4-owner-credential-record.mjs';

// Real dual-slot storage and private HMAC, with an explicitly controlled replay
// oracle for the two fixture snapshots. This is not formal registration,
// account command replay, HTTP, or a genuine player acceptance test.
const read=p=>normalizeLocalSourceText(readFileSync(new URL(p,import.meta.url),'utf8'));
const newSource=read('./original-perl/new.cgi'),membershipSource=read('./original-perl/pinned-membership-user.cgi');
const binding={worldId:'account-fixture',streetId:'standard-street',shopId:1,ownerName:'owner'};
const nextBinding={...binding,ownerName:'renamed'};
const origin={...createPeriodMemoryWorld({worldId:binding.worldId,streetId:binding.streetId,nowSeconds:100000,period:{}}),revision:1};
const first={...origin,revision:2,shops:[{id:1,name:'owner',status:1}]};
const second={...first,revision:3,shops:[{...first.shops[0],name:'renamed'}]};
const proof1={anchorKind:'fresh',anchor:encodeMemorySnapshot(origin),commands:[{kind:'controlled-register'}]};
const proof2={...proof1,commands:[...proof1.commands,{kind:'controlled-rename'}]};
const fingerprint='a'.repeat(64);
function setup(directory,{accountMode=true,sourceFingerprint=fingerprint,stage,verifyDisk}={}){
 const checkpointStore=createReviewedHistoryCheckpointStore({directory,sourceFingerprint,interpreter:'controlled-storage'});
 const historyReplay={checkpointStore,verify({world,proof}){
   const expected=world.revision===2?[first,proof1]:world.revision===3?[second,proof2]:null;
   if(!expected||encodeMemorySnapshot(world)!==encodeMemorySnapshot(expected[0])||
      JSON.stringify(proof)!==JSON.stringify(expected[1]))throw Error('controlled replay mismatch');
   return expected[0];
 },...((stage||verifyDisk)?{periodDiskStore:{stage:stage??(()=>true),verify:verifyDisk??(()=>true)}}:{})};
 return createLocalWorldSaveStore({directory,historyReplay,accountMode});
}
const options=(expectedGeneration,careerProof,record)=>({expectedGeneration,careerProof,ownerCredentials:[record]});
async function fixture(t){
 const directory=await mkdtemp(join(tmpdir(),'akimono-account-save-'));
 t.after(()=>rm(directory,{recursive:true,force:true}));
 const record=await createOwnerCredentialRecord({newSource,binding,password:'old_pw'});
 const successor=rebindOwnerCredentialForRename({membershipSource,record,binding,nextBinding});
 return {directory,record,successor};
}
test('LC-D1 account generation atomically recovers matching world and private record; prewrite failure never publishes successor',async t=>{
 const {directory,record,successor}=await fixture(t);
 const store=setup(directory);
 const key=join(directory,CHECKPOINT_DIRECTORY,'key'),oldSlot=join(directory,'world-b.json'),newSlot=join(directory,'world-a.json');
 assert.equal(store.preflight(first,options(0,proof1,record)),true);
 await assert.rejects(lstat(key),{code:'ENOENT'});
 assert.deepEqual(store.save(first,options(0,proof1,record)),{generation:1,revision:2});
 const before=await readFile(oldSlot,'utf8');
 assert.ok(!before.includes('old_pw'));
 assert.ok(!JSON.stringify(store.load()).includes(record.hash));
 assert.ok(!JSON.stringify(store.status()).includes(record.salt));
 assert.throws(()=>store.save(first,options(1,proof1,{...record,hash:'c'.repeat(64)})),/private account revision/);
 assert.throws(()=>store.save(second,options(1,proof2,record)),/invalid registration credential/);
 assert.throws(()=>store.save(second,options(0,proof2,successor)),/世代衝突/);
 assert.throws(()=>store.save({...second,revision:99},options(1,proof2,successor)),/controlled replay mismatch/);
 const failing=setup(directory,{stage(world){if(world.revision===3)throw Error('controlled disk stage failure');}});
 assert.throws(()=>failing.save(second,options(1,proof2,successor)),/controlled disk stage failure/);
 assert.equal(await readFile(oldSlot,'utf8'),before);
 await assert.rejects(lstat(newSlot),{code:'ENOENT'});
 assert.deepEqual(store.loadCommittedSnapshot().ownerCredentials,[record]);
 assert.deepEqual(store.save(second,options(1,proof2,successor)),{generation:2,revision:3});
 const restarted=setup(directory);
 const committed=restarted.loadCommittedSnapshot();
 assert.equal(encodeMemorySnapshot(committed.world),encodeMemorySnapshot(second));
 assert.deepEqual(committed.ownerCredentials,[successor]);
 const readRecord=createCommittedOwnerCredentialReader({readCommittedSnapshot:restarted.loadCommittedSnapshot});
 assert.equal(readRecord({world:first,binding}),null);
 assert.equal(readRecord({world:second,binding}),null);
 assert.equal(await verifyOwnerCredential({record:readRecord({world:second,binding:nextBinding}),binding:nextBinding,password:'old_pw'}),true);
 assert.equal(await readFile(oldSlot,'utf8'),before);
 // A checksum-correct private-only alteration is still unauthenticated.
 const envelope=JSON.parse(await readFile(newSlot,'utf8'));
 const rows=JSON.parse(envelope.ownerCredentials);rows[0].hash='d'.repeat(64);
 envelope.ownerCredentials=JSON.stringify(rows);
 envelope.sha256=createHash('sha256').update(JSON.stringify([LOCAL_SAVE_FORMAT,'account-save.v1',envelope.generation,envelope.world,envelope.careerProof,envelope.ownerCredentials])).digest('hex');
 await writeFile(newSlot,JSON.stringify(envelope)+'\n');
 assert.equal(restarted.status().recoveryWarning,true);
 assert.equal(restarted.load().generation,1);
 const recovered=restarted.loadCommittedSnapshot();
 assert.equal(encodeMemorySnapshot(recovered.world),encodeMemorySnapshot(first));
 assert.deepEqual(recovered.ownerCredentials,[record]);
 assert.equal(readRecord({world:second,binding:nextBinding}),null);
});
test('LC-D1 account storage refuses lost key, runtime drift and legacy-mode reset or import',async t=>{
 const {directory,record,successor}=await fixture(t);
 const store=setup(directory);
 store.save(first,options(0,proof1,record));store.save(second,options(1,proof2,successor));
 const slots=['world-a.json','world-b.json'].map(n=>join(directory,n));
 const before=await Promise.all(slots.map(n=>readFile(n,'utf8')));
 const legacy=setup(directory,{accountMode:false});
 assert.equal(legacy.status().unreadable,true);
 assert.throws(()=>legacy.clear({expectedGeneration:0}),/account save mode mismatch/);
 assert.throws(()=>legacy.save(first,{expectedGeneration:0,careerProof:proof1}),/all existing save records are invalid/);
 assert.throws(()=>store.clear({expectedGeneration:2}),/cannot use local reset/);
 const drift=setup(directory,{sourceFingerprint:'b'.repeat(64)});
 assert.equal(drift.status().unreadable,true);
 assert.throws(()=>drift.save(first,options(0,proof1,record)),/all existing save records are invalid/);
 const key=join(directory,CHECKPOINT_DIRECTORY,'key'),moved=join(directory,'saved-key-for-test');
 await rename(key,moved);
 try{
   assert.equal(store.status().unreadable,true);
   assert.throws(()=>store.loadCommittedSnapshot(),/no authenticated account generation/);
   assert.throws(()=>store.save(first,options(0,proof1,record)),/all existing save records are invalid/);
   await assert.rejects(lstat(key),{code:'ENOENT'});
 }finally{await rename(moved,key);}
 assert.deepEqual(await Promise.all(slots.map(n=>readFile(n,'utf8'))),before);
 assert.deepEqual(store.loadCommittedSnapshot().ownerCredentials,[successor]);
 const legacyDir=await mkdtemp(join(tmpdir(),'akimono-legacy-account-reject-'));
 t.after(()=>rm(legacyDir,{recursive:true,force:true}));
 const legacyOnly=setup(legacyDir,{accountMode:false});
 legacyOnly.save(first,{expectedGeneration:0,careerProof:proof1});
 const legacySlot=join(legacyDir,'world-b.json'),legacyBefore=await readFile(legacySlot,'utf8');
 const account=setup(legacyDir);
 assert.equal(account.status().unreadable,true);
 assert.throws(()=>account.save(first,options(0,proof1,record)),/all existing save records are invalid/);
 assert.equal(await readFile(legacySlot,'utf8'),legacyBefore);
});

function assertUncertain(fn){
 assert.throws(fn,error=>error instanceof AccountPublicationUncertainError&&
   error.code==='ACCOUNT_PUBLICATION_UNCERTAIN'&&error.attemptedGeneration===2&&
   error.attemptedRevision===3&&!error.message.includes('old_pw'));
}
async function verifyFencedRecovery({directory,record,successor,store,oldBytes}){
 assertUncertain(()=>store.status());
 assertUncertain(()=>store.load());
 assertUncertain(()=>store.loadCommittedSnapshot());
 assertUncertain(()=>store.preflight(second,options(1,proof2,successor)));
 assertUncertain(()=>store.save(second,options(1,proof2,successor)));
 const oldSlot=join(directory,'world-b.json'),newSlot=join(directory,'world-a.json');
 assert.equal(await readFile(oldSlot,'utf8'),oldBytes);
 const nextBytes=await readFile(newSlot,'utf8');
 const recovered=setup(directory);
 assert.equal(recovered.load().generation,2);
 const committed=recovered.loadCommittedSnapshot();
 assert.equal(encodeMemorySnapshot(committed.world),encodeMemorySnapshot(second));
 assert.deepEqual(committed.ownerCredentials,[successor]);
 const reader=createCommittedOwnerCredentialReader({readCommittedSnapshot:recovered.loadCommittedSnapshot});
 assert.equal(reader({world:first,binding}),null);
 assert.equal(reader({world:second,binding}),null);
 assert.equal(await verifyOwnerCredential({record:reader({world:second,binding:nextBinding}),binding:nextBinding,password:'old_pw'}),true);
 assert.throws(()=>recovered.save(second,options(1,proof2,successor)),/世代衝突/);
 assert.equal(await readFile(oldSlot,'utf8'),oldBytes);
 assert.equal(await readFile(newSlot,'utf8'),nextBytes);
 assert.notDeepEqual(committed.ownerCredentials,[record]);
}
test('D59 account post-rename directory fsync failure fences live reader and writer, recovery verifies both private and public successor',async t=>{
 const {directory,record,successor}=await fixture(t);
 const store=setup(directory);
 store.save(first,options(0,proof1,record));
 const oldBytes=await readFile(join(directory,'world-b.json'),'utf8');
 // POSIX directory fsync path; Windows has no such call by contract.
 if(process.platform==='win32'){
   assert.deepEqual(store.save(second,options(1,proof2,successor)),{generation:2,revision:3});
   assert.deepEqual(store.loadCommittedSnapshot().ownerCredentials,[successor]);
   return;
 }
 const original=fs.fsyncSync;
 let faultCount=0;
 const fault=t.mock.method(fs,'fsyncSync',fd=>{
   if(fs.fstatSync(fd).isDirectory()){
     faultCount++;
     throw Error('controlled directory fsync failure');
   }
   return original(fd);
 });
 try{assertUncertain(()=>store.save(second,options(1,proof2,successor)));}
 finally{fault.mock.restore();}
 assert.equal(faultCount,1);
 await verifyFencedRecovery({directory,record,successor,store,oldBytes});
});
test('D59 account post-rename readback verification failure fences authority; pre-rename failure remains an ordinary rejection',async t=>{
 const {directory,record,successor}=await fixture(t);
 let renamed=false,readbackFaults=0;
 const store=setup(directory,{verifyDisk(world){
   if(renamed&&world.revision===3){readbackFaults++;throw Error('controlled readback failure');}
   return true;
 }});
 store.save(first,options(0,proof1,record));
 const oldBytes=await readFile(join(directory,'world-b.json'),'utf8');
 const newSlot=join(directory,'world-a.json'),original=fs.renameSync;
 const beforeFault=t.mock.method(fs,'renameSync',(from,to)=>{
   if(to===newSlot)throw Error('controlled pre-rename failure');
   return original(from,to);
 });
 try{assert.throws(()=>store.save(second,options(1,proof2,successor)),/controlled pre-rename failure/);}
 finally{beforeFault.mock.restore();}
 assert.equal(store.load().generation,1);
 assert.deepEqual(store.loadCommittedSnapshot().ownerCredentials,[record]);
 await assert.rejects(lstat(newSlot),{code:'ENOENT'});
 const afterFault=t.mock.method(fs,'renameSync',(from,to)=>{
   const result=original(from,to);if(to===newSlot)renamed=true;return result;
 });
 try{assertUncertain(()=>store.save(second,options(1,proof2,successor)));}
 finally{afterFault.mock.restore();}
 assert.equal(readbackFaults,1);
 await verifyFencedRecovery({directory,record,successor,store,oldBytes});
});
