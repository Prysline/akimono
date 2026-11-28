/** Single-process durable publication boundary for an authenticated account
 * generation. Uses the existing GameCore memory CAS and the same dual-slot
 * save/replay authority. Not an HTTP/auth service. Until source account
 * command/replay contracts are installed, private records cannot change.
 * The owning server must exclusively own this store and publisher. */
import {applyGameCommand,createSourceReviewedMemoryWorldAdapter,encodeMemorySnapshot} from './game-core-contract.mjs';
import {appendReviewedWorldHistory} from './reviewed-world-time-history.mjs';
import {validateCommittedOwnerCredentials} from './r4-owner-credential-record.mjs';
import {AccountPublicationUncertainError,isAccountLocalWorldSaveStore} from './local-world-save-store.mjs';
import {isReviewedHistoryCheckpointStore} from './reviewed-history-checkpoint-store.mjs';
const fail=()=>{throw new RangeError('Account publisher: trusted account authority required');};
export function createAccountWorldPublisher({saveStore,streetModule,historyPolicy,checkpointStore}={}){
  if(!isAccountLocalWorldSaveStore(saveStore)||!isReviewedHistoryCheckpointStore(checkpointStore)||
     !streetModule||streetModule.reviewedNormalTime!==true||
     ['createInitialWorld','isOrdinaryCommand','verifyOrdinaryDraws'].some(k=>typeof historyPolicy?.[k]!=='function'))fail();
  const initial=saveStore.loadCommittedAccountState();
  const ownerCredentials=validateCommittedOwnerCredentials({world:initial.world,records:initial.ownerCredentials});
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
      const saved=saveStore.save(after,{expectedGeneration:generation,careerProof:pending.proof,ownerCredentials});
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
  function commit(command){
    assertAvailable();
    busy=true;
    try{
      const before=repository.read(),proposal=applyGameCommand({world:before,command,streetModule});
      if(!proposal.ok)return proposal;
      // No implicit registration, rename, close or expiry transition until
      // the private credential successor is included by a reviewed command.
      try{validateCommittedOwnerCredentials({world:proposal.world,records:ownerCredentials});}
      catch{return Object.freeze({ok:false,code:'ACCOUNT_TRANSITION_NOT_REVIEWED',world:before,details:null});}
      let nextProof;
      try{
        nextProof=appendReviewedWorldHistory({proof,before,command,result:proposal,
          ...policy,continuation:{...policy,checkpointStore,generation}});
      }catch{return Object.freeze({ok:false,code:'HISTORY_REJECTED',world:before,details:null});}
      pending={command,beforeWire:encodeMemorySnapshot(before),afterWire:encodeMemorySnapshot(proposal.world),proof:nextProof,durable:false};
      const result=repository.compareAndSwap({expectedRevision:command.expectedRevision,nextWorld:proposal.world,command,
        advanceSeconds:proposal.world.nowSeconds-before.nowSeconds});
      if(!result.ok){
        if(pending.durable)throw new AccountPublicationUncertainError(generation+1,proposal.world.revision);
        return result;
      }
      if(!pending.durable)throw new AccountPublicationUncertainError(generation+1,proposal.world.revision);
      proof=nextProof;generation++;
      return Object.freeze({ok:true,code:'COMMITTED',world:result.world,details:proposal.details});
    }catch(error){
      if(error instanceof AccountPublicationUncertainError||pending?.durable){
        fenced={generation:generation+1,revision:pending?JSON.parse(pending.afterWire).revision:repository.read().revision+1};
        throw new AccountPublicationUncertainError(fenced.generation,fenced.revision);
      }
      // Only failures before a successful disk rename can reach this path.
      // Return no filesystem or credential details.
      return Object.freeze({ok:false,code:'PERSISTENCE_REJECTED',world:repository.read(),details:null});
    }finally{pending=null;busy=false;}
  }
  return Object.freeze({read,readCommittedSnapshot,status,commit});
}
