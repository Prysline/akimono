import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {createPeriodMemoryWorld,createSourceReviewedMemoryWorldAdapter,executeMemoryCommand,encodeMemorySnapshot} from '../src/game-core-contract.mjs';
import {reviewOriginalPeriodBootstrap,createOriginalPeriodSeed} from '../src/original-period-world-seed.mjs';
import {beginReviewedWorldHistory,appendReviewedWorldHistory,verifyReviewedWorldHistory} from '../src/reviewed-world-time-history.mjs';
import {createReviewedHistoryCheckpointStore} from '../src/reviewed-history-checkpoint-store.mjs';
import {isReviewedOrdinaryCommand} from '../src/reviewed-ordinary-command-policy.mjs';
import {createLocalWorldSaveStore,AccountPublicationUncertainError} from '../src/local-world-save-store.mjs';
import {createOwnerCredentialRecord,createCommittedOwnerCredentialReader} from '../src/r4-owner-credential-record.mjs';
import {createAccountWorldPublisher} from '../src/r4-account-world-publisher.mjs';
import {loadNormalCommerceAuditSources} from './support/r4-source-inputs.mjs';
import {normalizeLocalSourceText} from '../src/local-source-text.mjs';

test('D60 existing GameCore CAS publishes ordinary source command and private account generation together, fences memory on uncertain disk result',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'akimono-account-publisher-'));
 t.after(()=>rm(directory,{recursive:true,force:true}));
 const sources=Object.fromEntries(Object.entries(await loadNormalCommerceAuditSources()).map(([k,v])=>[k,normalizeLocalSourceText(v)]));
 const streetModule=createStandardStreetModule({...sources,enableReviewedNormalTime:true});
 const reviewed=reviewOriginalPeriodBootstrap({periodSource:sources.originalPeriodSource,adminSource:sources.originalAdminInitSource,
   readSource:sources.originalDataReadSource,writeSource:sources.originalDataWriteSource,reviewedB41:streetModule.reviewedB41});
 const createInitialWorld=({worldId,nowSeconds})=>createPeriodMemoryWorld({worldId,streetId:streetModule.id,nowSeconds,period:createOriginalPeriodSeed(reviewed)});
 const historyPolicy={streetModule,createInitialWorld,isOrdinaryCommand:c=>isReviewedOrdinaryCommand(c,streetModule),verifyOrdinaryDraws:(_world,c)=>!Object.hasOwn(c,'randomDraws')};
 const checkpointStore=createReviewedHistoryCheckpointStore({directory,sourceFingerprint:'a'.repeat(64),interpreter:'controlled-publisher-source-replay'});
 const openStore=()=>createLocalWorldSaveStore({directory,accountMode:true,
   historyReplay:{checkpointStore,verify:({world,proof,generation})=>verifyReviewedWorldHistory({world,proof,generation,checkpointStore,...historyPolicy})}});
 // Test bootstrap only: the real local open-shop source path is NOT formal
 // registration. The test supplies a private record to the authenticated
 // initial envelope; subsequent ordinary commands use real source replay.
 const seed=createSourceReviewedMemoryWorldAdapter({initialWorld:createInitialWorld({worldId:'publisher-fixture',nowSeconds:1000000}),streetModule});
 const initialized=executeMemoryCommand({repository:seed,streetModule,command:{kind:'initialize-source-market',expectedRevision:0}});
 assert.equal(initialized.ok,true);
 const command={kind:'open-shop',expectedRevision:1,shopId:1,ownerName:'owner',shopName:'source shop'};
 const opened=executeMemoryCommand({repository:seed,streetModule,command});
 assert.equal(opened.ok,true);
 const careerProof=appendReviewedWorldHistory({proof:beginReviewedWorldHistory(initialized.world),before:initialized.world,command,result:opened,...historyPolicy});
 const binding={worldId:opened.world.worldId,streetId:streetModule.id,shopId:1,ownerName:'owner'};
 const record=await createOwnerCredentialRecord({newSource:sources.originalNewSource,binding,password:'old_pw'});
 const store=openStore();
 assert.deepEqual(store.save(opened.world,{expectedGeneration:0,careerProof,ownerCredentials:[record]}),{generation:1,revision:2});
 const makePublisher=saveStore=>createAccountWorldPublisher({saveStore,streetModule,historyPolicy,checkpointStore});
 const publisher=makePublisher(store);
 const edit=expectedRevision=>({kind:'edit-showcase',expectedRevision,shopId:1,itemId:0,shelf:0,per:100,priceOverride:0});
 const before=publisher.read();
 const reader=createCommittedOwnerCredentialReader({readCommittedSnapshot:publisher.readCommittedSnapshot});
 assert.deepEqual(reader({world:before,binding}),record);
 assert.equal(publisher.commit(edit(1)).code,'REVISION_CONFLICT');
 assert.deepEqual(publisher.status(),{generation:1,revision:2});
 const oldSlot=join(directory,'world-b.json'),nextSlot=join(directory,'world-a.json');
 const oldBytes=await readFile(oldSlot,'utf8');
 const originalRename=fs.renameSync;
 const pre=t.mock.method(fs,'renameSync',(a,b)=>{if(b===nextSlot)throw Error('controlled prepublication fault');return originalRename(a,b);});
 try{assert.equal(publisher.commit(edit(2)).code,'PERSISTENCE_REJECTED');}finally{pre.mock.restore();}
 assert.deepEqual(publisher.status(),{generation:1,revision:2});
 assert.equal(encodeMemorySnapshot(publisher.read()),encodeMemorySnapshot(before));
 assert.deepEqual(reader({world:before,binding}),record);
 assert.equal(await readFile(oldSlot,'utf8'),oldBytes);
 const committed=publisher.commit(edit(2));
 assert.equal(committed.ok,true);
 assert.deepEqual(publisher.status(),{generation:2,revision:3});
 assert.equal(committed.world.revision,3);
 assert.equal(reader({world:before,binding}),null);
 assert.deepEqual(reader({world:committed.world,binding}),record);
 assert.ok(!JSON.stringify(committed).includes(record.hash));
 assert.equal(encodeMemorySnapshot(openStore().loadCommittedSnapshot().world),encodeMemorySnapshot(committed.world));
 const secondBytes=await readFile(nextSlot,'utf8');
 // Real rename is performed, then the directory fsync or readback fails.
 let renamed=false,faults=0;
 const originalRead=fs.readFileSync;
 const trigger=t.mock.method(fs,'renameSync',(a,b)=>{const v=originalRename(a,b);if(b===oldSlot)renamed=true;return v;});
 const readFault=t.mock.method(fs,'readFileSync',(...args)=>{
   if(renamed&&typeof args[0]==='number'){
     // Identify the newly published physical slot without a filename leak.
     const slot=fs.lstatSync(oldSlot),fd=fs.fstatSync(args[0]);
     if(slot.dev===fd.dev&&slot.ino===fd.ino){faults++;throw Error('controlled post-rename readback failure');}
   }
   return originalRead(...args);
 });
 const uncertain=fn=>assert.throws(fn,e=>e instanceof AccountPublicationUncertainError&&e.code==='ACCOUNT_PUBLICATION_UNCERTAIN'&&e.attemptedGeneration===3&&e.attemptedRevision===4);
 try{uncertain(()=>publisher.commit(edit(3)));}
 finally{readFault.mock.restore();trigger.mock.restore();}
 assert.ok(faults>=1);
 uncertain(()=>publisher.read());uncertain(()=>publisher.readCommittedSnapshot());
 uncertain(()=>publisher.status());uncertain(()=>publisher.commit(edit(3)));
 uncertain(()=>reader({world:committed.world,binding}));
 const recovered=makePublisher(openStore());
 assert.deepEqual(recovered.status(),{generation:3,revision:4});
 assert.deepEqual(recovered.readCommittedSnapshot().ownerCredentials,[record]);
 assert.equal(await readFile(nextSlot,'utf8'),secondBytes);
 assert.equal(recovered.commit(edit(3)).code,'REVISION_CONFLICT');
});
