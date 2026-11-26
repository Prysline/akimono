import {R4_MANUAL_COMMERCE_EVENT_CODES} from './original-r4-manual-commerce-events.mjs';
/** Shared bounded world-time history for B-43 / P3.
 * Ordinary command/recipe policy is injected by its owning street, never
 * copied here. Fresh anchors are regenerated; old development anchors are
 * not accepted. A continuation requires a verified prefix and
 * server-authenticated checkpoint; never a new arbitrary fresh anchor.
 */
import {createHash} from 'node:crypto';
import {applyGameCommand,executeMemoryCommand,encodeMemorySnapshot,decodeMemorySnapshot,createSourceReviewedMemoryWorldAdapter} from './game-core-contract.mjs';
import {isReviewedWorldTimeCommand,REVIEWED_WORLD_TIME_COMMAND} from './original-r4-reviewed-world-time.mjs';
import {R4_HASH_POLICY,R4_COMMAND_HASH_POLICY} from './original-r4-perl-hash-replay.mjs';
import {R4_TIME_DRAW_POLICY,R4_CROSS_PERIOD_DRAW_POLICY,R4_FULL_PRE_EVENT_DRAWS,R4_FULL_CROSS_SLICE_DRAWS} from './r4-time-command-draws.mjs';
import {LOTO_RANGE} from './original-b58-loto-startfunc.mjs';
export const MAX_REVIEWED_HISTORY_COMMANDS=128;
export const MAX_REVIEWED_HISTORY_WIRE_BYTES=500000;
const fail=s=>{throw new RangeError('R4 B43 time history: '+s)};
const digest=s=>createHash('sha256').update(s,'utf8').digest('hex');
const exact=(o,keys)=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===keys.split(',').sort().join(',');
const integer=(n,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const arr=(a,min,max,f)=>Array.isArray(a)&&a.length>=min&&a.length<=max&&a.every(f);
const codes=a=>arr(a,0,17,k=>typeof k==='string'&&/^[a-z][a-z0-9-]{0,39}$/.test(k))&&new Set(a).size===a.length;
const activeCodes=(a,automatic)=>arr(a,0,21,k=>automatic.includes(k)||R4_MANUAL_COMMERCE_EVENT_CODES.includes(k))&&new Set(a).size===a.length;
const automaticCodes=a=>codes(a)&&a.length===17&&a.every(k=>!R4_MANUAL_COMMERCE_EVENT_CODES.includes(k));
const unit=n=>integer(n,0,999999);
const sha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
function traceFrom(result){
  const t=result?.details?.sourceTrace;
  if(t?.drawPolicy===R4_CROSS_PERIOD_DRAW_POLICY){
    const trace={drawPolicy:t.drawPolicy,hashPolicy:t.hashPolicy,seed:t.seed,interpreter:t.interpreter,
      slices:t.slices.map(s=>({dateupdate:s.dateupdate,spanSeconds:s.spanSeconds,activeOrder:s.activeOrder,eventOrder:s.eventOrder,nowOrder:s.nowOrder,preEventDraws:s.preEventDraws,eventDrawRanges:s.eventDrawRanges,eventSamples:s.eventSamples.map((n,i)=>s.eventDrawRanges[i]===LOTO_RANGE?n?.result:n),effectsSha256:digest(JSON.stringify(s.logs))})),afterSha256:digest(encodeMemorySnapshot(result.world))};
    if(!validTrace(trace))fail('invalid crossing source trace');return trace;
  }
  if(!t||!Array.isArray(t.eventSamples)||!Array.isArray(t.eventDrawRanges)||t.eventSamples.length!==t.eventDrawRanges.length)fail('missing source time trace');
  // Retain actual order and all RNG results compactly. Lottery entries are
  // typed by their matching range rather than repeating a JSON object.
  const trace={drawPolicy:t.drawPolicy,hashPolicy:t.hashPolicy,seed:t.seed,interpreter:t.interpreter,
    activeOrder:[...t.activeOrder],eventOrder:[...t.eventOrder],nowOrder:[...t.nowOrder],
    preEventDraws:[...t.preEventDraws],eventDrawRanges:[...t.eventDrawRanges],
    eventSamples:t.eventSamples.map((n,i)=>t.eventDrawRanges[i]===LOTO_RANGE?
      (n?.range===LOTO_RANGE?n.result:null):n),
    afterSha256:digest(encodeMemorySnapshot(result.world)),
    effectsSha256:digest(JSON.stringify([t.started,t.expired,t.zeroStartTransient,t.logs]))};
  if(!validTrace(trace))fail('invalid source trace');
  return trace;
}
function validTrace(t){
  if(t?.drawPolicy===R4_CROSS_PERIOD_DRAW_POLICY)return exact(t,'drawPolicy,hashPolicy,seed,interpreter,slices,afterSha256')&&t.hashPolicy===R4_COMMAND_HASH_POLICY&&typeof t.seed==='string'&&/^0x[a-f0-9]{32}$/.test(t.seed)&&typeof t.interpreter==='string'&&t.interpreter.length>=1&&t.interpreter.length<=120&&sha(t.afterSha256)&&arr(t.slices,1,2,(s)=>exact(s,'dateupdate,spanSeconds,activeOrder,eventOrder,nowOrder,preEventDraws,eventDrawRanges,eventSamples,effectsSha256')&&[0,1].includes(s.dateupdate)&&integer(s.spanSeconds,1,3600)&&automaticCodes(s.eventOrder)&&activeCodes(s.activeOrder,s.eventOrder)&&activeCodes(s.nowOrder,s.eventOrder)&&arr(s.preEventDraws,0,R4_FULL_CROSS_SLICE_DRAWS,unit)&&arr(s.eventDrawRanges,0,100,n=>integer(n,0,LOTO_RANGE))&&Array.isArray(s.eventSamples)&&s.eventSamples.length===s.eventDrawRanges.length&&s.eventSamples.every((n,i)=>s.eventDrawRanges[i]===LOTO_RANGE?integer(n,0,LOTO_RANGE-1):unit(n))&&sha(s.effectsSha256))&&(t.slices.length===1||t.slices[0].dateupdate===1&&t.slices[1].dateupdate===0);
  return exact(t,'drawPolicy,hashPolicy,seed,interpreter,activeOrder,eventOrder,nowOrder,preEventDraws,eventDrawRanges,eventSamples,afterSha256,effectsSha256')&&
    t.drawPolicy===R4_TIME_DRAW_POLICY&&t.hashPolicy===R4_HASH_POLICY&&
    typeof t.seed==='string'&&/^0x[a-f0-9]{32}$/.test(t.seed)&&
    typeof t.interpreter==='string'&&t.interpreter.length>=1&&t.interpreter.length<=120&&
    automaticCodes(t.eventOrder)&&activeCodes(t.activeOrder,t.eventOrder)&&activeCodes(t.nowOrder,t.eventOrder)&&
    arr(t.preEventDraws,0,R4_FULL_PRE_EVENT_DRAWS,unit)&&arr(t.eventDrawRanges,0,100,n=>integer(n,0,LOTO_RANGE))&&
    Array.isArray(t.eventSamples)&&t.eventSamples.length===t.eventDrawRanges.length&&
    t.eventSamples.every((n,i)=>t.eventDrawRanges[i]===LOTO_RANGE?integer(n,0,LOTO_RANGE-1):unit(n))&&
    sha(t.afterSha256)&&sha(t.effectsSha256);
}
export function isReviewedTimeHistoryEntry(entry){
  if(!exact(entry,'kind,expectedRevision,minutes,trace'))return false;
  const {trace,...command}=entry;
  return isReviewedWorldTimeCommand(command)&&validTrace(trace)&&(!trace.slices||trace.slices.reduce((n,s)=>n+s.spanSeconds,0)===command.minutes*60);
}
export function makeReviewedTimeHistoryEntry({before,command,result}){
  if(!isReviewedWorldTimeCommand(command)||command.expectedRevision!==before.revision||!result?.ok||
     result.details?.action!==REVIEWED_WORLD_TIME_COMMAND||result.world.revision!==before.revision+1||
     result.world.worldId!==before.worldId||result.world.nowSeconds!==before.nowSeconds+command.minutes*60)
    fail('source-approved time successor required');
  return {...command,trace:traceFrom(result)};
}
export function replayReviewedTimeHistoryEntry({repository,streetModule,entry}){
  if(!isReviewedTimeHistoryEntry(entry)||streetModule.reviewedNormalTime!==true)fail('exact reviewed time history entry required');
  const {trace,...command}=entry,before=repository.read();
  const preview=applyGameCommand({world:before,command,streetModule});
  if(!preview.ok)fail('source time replay rejected: '+(preview.details?.reason??preview.code));
  const expected=makeReviewedTimeHistoryEntry({before,command,result:preview});
  if(JSON.stringify(expected.trace)!==JSON.stringify(trace))fail('source clock/RNG/EVENT trace or successor mismatch');
  const result=executeMemoryCommand({repository,streetModule,command});
  if(!result.ok||encodeMemorySnapshot(result.world)!==encodeMemorySnapshot(preview.world))fail('source CAS replay mismatch');
  return result.world;
}
function withinBounds(proof){
  const checkpoint=proof?.anchorKind==='checkpoint';
  if(!exact(proof,checkpoint?'anchorKind,anchor,commands,checkpoint':'anchorKind,anchor,commands')||!['fresh','checkpoint'].includes(proof.anchorKind)||
     typeof proof.anchor!=='string'||Buffer.byteLength(proof.anchor)>200000||
     !Array.isArray(proof.commands)||proof.commands.length>MAX_REVIEWED_HISTORY_COMMANDS||
     Buffer.byteLength(JSON.stringify(proof))>MAX_REVIEWED_HISTORY_WIRE_BYTES)fail('bounded source history exhausted or invalid');
}
export function beginReviewedWorldHistory(world){
  const proof={anchorKind:'fresh',anchor:encodeMemorySnapshot(world),commands:[]};
  withinBounds(proof);return proof;
}
export function appendReviewedWorldHistory({proof,before,command,result,isOrdinaryCommand,verifyOrdinaryDraws,continuation=null}){
  withinBounds(proof);
  if(!result?.ok||result.world.revision!==before.revision+1||command.expectedRevision!==before.revision||result.world.worldId!==before.worldId)
    fail('successful next source revision required');
  const entry=command.kind===REVIEWED_WORLD_TIME_COMMAND?
    makeReviewedTimeHistoryEntry({before,command,result}):
    (isOrdinaryCommand(command)&&verifyOrdinaryDraws(before,command)&&result.world.nowSeconds===before.nowSeconds?
      structuredClone(command):fail('ordinary source command/draw or clock not reviewed'));
  let next={...proof,commands:[...proof.commands,entry]};
  if(continuation&&(next.commands.length>MAX_REVIEWED_HISTORY_COMMANDS||Buffer.byteLength(JSON.stringify(next))>MAX_REVIEWED_HISTORY_WIRE_BYTES)){
    const {checkpointStore,generation,...policy}=continuation;
    if(!checkpointStore||!proof.commands.length)fail('checkpoint continuation unavailable');
    // Full source replay of the entire retained segment BEFORE any signature.
    verifyReviewedWorldHistory({world:before,proof,...policy,isOrdinaryCommand,verifyOrdinaryDraws,checkpointStore});
    const compact=checkpointStore.sealVerified({world:before,anchor:encodeMemorySnapshot(before),proof,generation});
    next={...compact,commands:[entry]};
  }
  withinBounds(next);return next;
}
export function verifyReviewedWorldHistory({world,proof,streetModule,createInitialWorld,isOrdinaryCommand,verifyOrdinaryDraws,checkpointStore=null,generation=null}){
  withinBounds(proof);
  if(streetModule.reviewedNormalTime!==true||streetModule.validateReviewedWorldTimeState(world)!==true)fail('reviewed runtime state required');
  const anchor=decodeMemorySnapshot(proof.anchor);
  if(encodeMemorySnapshot(anchor)!==proof.anchor||anchor.worldId!==world.worldId||
     anchor.streetId!==world.streetId||anchor.revision+proof.commands.length!==world.revision)
    fail('anchor identity, canonical wire or revision lineage');
  let elapsed=0;
  for(const entry of proof.commands){
    if(entry?.kind===REVIEWED_WORLD_TIME_COMMAND){
      if(!isReviewedTimeHistoryEntry(entry))fail('invalid source time history entry');
      elapsed+=entry.minutes*60;
    }else if(!isOrdinaryCommand(entry))fail('unreviewed ordinary history command');
  }
  if(!integer(elapsed)||anchor.nowSeconds+elapsed!==world.nowSeconds)fail('forged elapsed clock lineage');
  if(proof.anchorKind==='fresh'){
    if(anchor.revision!==1||anchor.shops.length!==0)fail('fresh anchor shape');
    const seed=createSourceReviewedMemoryWorldAdapter({initialWorld:createInitialWorld({worldId:anchor.worldId,nowSeconds:anchor.nowSeconds}),streetModule});
    const initialized=executeMemoryCommand({repository:seed,streetModule,command:{kind:'initialize-source-market',expectedRevision:0}});
    if(!initialized.ok||encodeMemorySnapshot(initialized.world)!==proof.anchor)fail('fresh source anchor mismatch');
  }else{
    if(!checkpointStore)fail('authenticated checkpoint verifier required');
    if(streetModule.reviewedCrossPeriod===true)streetModule.authorizeVerifiedCheckpoint({world:anchor,proof,checkpointStore,generation});
    else checkpointStore.verifyChain(proof,generation);
  }
  const repository=createSourceReviewedMemoryWorldAdapter({initialWorld:anchor,streetModule});
  for(const entry of proof.commands){
    if(entry.kind===REVIEWED_WORLD_TIME_COMMAND)replayReviewedTimeHistoryEntry({repository,streetModule,entry});
    else{
      const before=repository.read();
      if(!verifyOrdinaryDraws(before,entry))fail('ordinary source RNG mismatch');
      const result=executeMemoryCommand({repository,streetModule,command:entry});
      if(!result.ok||result.world.nowSeconds!==before.nowSeconds)fail('ordinary source replay rejected or changed clock');
    }
  }
  if(encodeMemorySnapshot(repository.read())!==encodeMemorySnapshot(world))fail('full replayed WorldState differs from saved checkpoint');
  return world;
}
export function reviewedHistoryLineageCompatible(older,newer,checkpointStore=null){
  if(!older.proof||!newer.proof||older.world.worldId!==newer.world.worldId||older.world.revision>newer.world.revision)return false;
  // Both candidate slots have already been source verified. For a compacted
  // prefix, follow authenticated retained segments only as far as necessary.
  // Each step strictly decreases revision; never trust a free-standing hash.
  try{
    let proof=newer.proof;
    while(proof){
      if(older.proof){
        if(older.proof.anchorKind===proof.anchorKind&&older.proof.anchor===proof.anchor&&
           JSON.stringify(older.proof.checkpoint??null)===JSON.stringify(proof.checkpoint??null))
          return JSON.stringify(older.proof.commands)===JSON.stringify(proof.commands.slice(0,older.proof.commands.length));
      }
      if(proof.anchorKind!=='checkpoint'||!checkpointStore)return false;
      proof=checkpointStore.openPrefix(proof);
    }
  }catch{return false;}
  return false;
}
