/** Single-process durable publication boundary for an authenticated account
 * generation. Uses the existing GameCore memory CAS and the same dual-slot
 * save/replay authority. Not an HTTP service. Only the opt-in reviewed
 * repass command may change a private credential through this publisher.
 * The owning server must exclusively own this store and publisher. */
import {applyGameCommand,createSourceReviewedMemoryWorldAdapter,encodeMemorySnapshot} from './game-core-contract.mjs';
import {appendReviewedWorldHistory} from './reviewed-world-time-history.mjs';
import {validateCommittedOwnerCredentials,changeOwnerCredentialPassword} from './r4-owner-credential-record.mjs';
import {isStableOwnerSessionAuthority} from './r4-stable-owner-sessions.mjs';
import {reviewOriginalAccountPasswordChange} from './original-r4-account-password-command.mjs';
import {AccountPublicationUncertainError,isAccountLocalWorldSaveStore} from './local-world-save-store.mjs';
import {isReviewedHistoryCheckpointStore} from './reviewed-history-checkpoint-store.mjs';
const fail=()=>{throw new RangeError('Account publisher: trusted account authority required');};
export function createAccountWorldPublisher({saveStore,streetModule,historyPolicy,checkpointStore,passwordChange=null}={}){
  if(!isAccountLocalWorldSaveStore(saveStore)||!isReviewedHistoryCheckpointStore(checkpointStore)||
     !streetModule||streetModule.reviewedNormalTime!==true||
     ['createInitialWorld','isOrdinaryCommand','verifyOrdinaryDraws'].some(k=>typeof historyPolicy?.[k]!=='function'))fail();
  if(passwordChange!==null){
    if(streetModule.reviewedAccountPasswordChange!==true||!isStableOwnerSessionAuthority(passwordChange.sessions))fail();
    reviewOriginalAccountPasswordChange(passwordChange);
  }
  const initial=saveStore.loadCommittedAccountState();
  let ownerCredentials=validateCommittedOwnerCredentials({world:initial.world,records:initial.ownerCredentials});
  let generation=initial.generation,proof=initial.careerProof;
  let busy=false,pending=null,fenced=null;
  const policy={streetModule,createInitialWorld:historyPolicy.createInitialWorld,
    isOrdinaryCommand:historyPolicy.isOrdinaryCommand,verifyOrdinaryDraws:historyPolicy.verifyOrdinaryDraws};
  const repository=createSourceReviewedMemoryWorldAdapter({initialWorld:initial.world,streetModule,
    beforePublish({before,after,command}){
      if(!busy||!pending||pending.command!==command||encodeMemorySnapshot(before)!==pending.beforeWire||
         encodeMemorySnapshot(after)!==pending.afterWire)fail();
      // The core CAS has already checked the exact source successor. Disk
      // publication is synchronous and can only precede the in-memory swap.
      const saved=saveStore.save(after,{expectedGeneration:generation,careerProof:pending.proof,ownerCredentials:pending.credentials});
      pending.durable=true;
      if(saved.generation!==generation+1||saved.revision!==after.revision)
        throw new AccountPublicationUncertainError(generation+1,after.revision);
    }});
  function assertAvailable(){
    if(fenced)throw new AccountPublicationUncertainError(fenced.generation,fenced.revision);
    if(busy)throw new RangeError('Account publisher: transaction in progress');
  }
  function read(){assertAvailable();return repository.read();}
  function readCommittedSnapshot(){return Object.freeze({world:read(),ownerCredentials});}
  function status(){return Object.freeze({generation,revision:read().revision});}
  function commit(command){return commitInternal(command,null);}
  function commitInternal(command,transition){
    assertAvailable();
    busy=true;
    try{
      const before=repository.read();
      if(command?.kind==='change-owner-password'&&!transition)return Object.freeze({ok:false,code:'ACCOUNT_TRANSITION_NOT_REVIEWED',world:before,details:null});
      const proposal=applyGameCommand({world:before,command,streetModule});
      if(!proposal.ok)return proposal;
      // No implicit registration, rename, close or expiry transition until
      // the private credential successor is included by a reviewed command.
      let nextCredentials;
      try{nextCredentials=validateCommittedOwnerCredentials({world:proposal.world,records:transition?.records??ownerCredentials});}
      catch{return Object.freeze({ok:false,code:'ACCOUNT_TRANSITION_NOT_REVIEWED',world:before,details:null});}
      let nextProof;
      try{
        nextProof=appendReviewedWorldHistory({proof,before,command,result:proposal,
          ...policy,continuation:{...policy,checkpointStore,generation}});
      }catch{return Object.freeze({ok:false,code:'HISTORY_REJECTED',world:before,details:null});}
      pending={command,beforeWire:encodeMemorySnapshot(before),afterWire:encodeMemorySnapshot(proposal.world),proof:nextProof,credentials:nextCredentials,generation:generation+1,revision:proposal.world.revision,durable:false};
      const result=repository.compareAndSwap({expectedRevision:command.expectedRevision,nextWorld:proposal.world,command,
        advanceSeconds:proposal.world.nowSeconds-before.nowSeconds});
      if(!result.ok){
        if(pending.durable)throw new AccountPublicationUncertainError(generation+1,proposal.world.revision);
        return result;
      }
      if(!pending.durable)throw new AccountPublicationUncertainError(generation+1,proposal.world.revision);
      proof=nextProof;generation++;ownerCredentials=nextCredentials;
      // No await or request processing between durable CAS and revocation.
      // On an unexpected revocation failure, the entire authority is fenced.
      if(transition&&transition.revoke()!==true)
        throw new AccountPublicationUncertainError(pending.generation,pending.revision);
      return Object.freeze({ok:true,code:'COMMITTED',world:result.world,details:proposal.details});
    }catch(error){
      if(error instanceof AccountPublicationUncertainError||pending?.durable){
        fenced={generation:pending?.generation??error.attemptedGeneration,revision:pending?.revision??error.attemptedRevision};
        throw new AccountPublicationUncertainError(fenced.generation,fenced.revision);
      }
      // Only failures before a successful disk rename can reach this path.
      // Return no filesystem or credential details.
      return Object.freeze({ok:false,code:'PERSISTENCE_REJECTED',world:repository.read(),details:null});
    }finally{pending=null;busy=false;}
  }
  const deny=code=>Object.freeze({ok:false,code});
  async function changePassword({request,body}={}){
    assertAvailable();
    if(passwordChange===null)return deny('ACCOUNT_TRANSITION_NOT_REVIEWED');
    if(!body||Object.getPrototypeOf(body)!==Object.prototype||
       Reflect.ownKeys(body).sort().join(',')!=='confirmation,expectedRevision,password'||
       !Number.isSafeInteger(body.expectedRevision)||body.expectedRevision<0)return deny('BAD_REQUEST');
    const {expectedRevision,password,confirmation}=body;
    const before=readCommittedSnapshot();
    if(before.world.revision!==expectedRevision)return deny('REVISION_CONFLICT');
    let actor;
    try{actor=passwordChange.sessions.resolveAuthenticatedActor({request,world:before.world});}
    catch{return deny('OWNER_SESSION_DENIED');}
    const {revision,...binding}=actor;
    if(revision!==expectedRevision)return deny('REVISION_CONFLICT');
    const record=before.ownerCredentials.find(r=>r.binding.shopId===binding.shopId);
    let successor;
    try{successor=await changeOwnerCredentialPassword({membershipSource:passwordChange.membershipSource,record,binding,password,confirmation});}
    catch{return deny('PASSWORD_CHANGE_REJECTED');}
    // KDF is asynchronous: recheck the same committed world and private
    // credential, and re-resolve the actual session (logout/relogin races).
    const current=readCommittedSnapshot();
    if(encodeMemorySnapshot(current.world)!==encodeMemorySnapshot(before.world)||
       JSON.stringify(current.ownerCredentials)!==JSON.stringify(before.ownerCredentials))
      return deny('REVISION_CONFLICT');
    let currentActor;
    try{currentActor=passwordChange.sessions.resolveAuthenticatedActor({request,world:current.world});}
    catch{return deny('OWNER_SESSION_DENIED');}
    if(JSON.stringify(currentActor)!==JSON.stringify(actor))return deny('OWNER_SESSION_DENIED');
    const command={kind:'change-owner-password',expectedRevision,shopId:binding.shopId};
    const records=current.ownerCredentials.map(r=>r.binding.shopId===binding.shopId?successor:r);
    return commitInternal(command,{records,revoke:()=>passwordChange.sessions.revoke(request)});
  }
  return Object.freeze({read,readCommittedSnapshot,status,commit,...(passwordChange?{changePassword}:{})});
}
