/**
 * P2/P3: bounded, source-reviewed command history for B-43.
 * The legacy careerProof wire and exports remain compatible.
 * Replays committed commands, not a guessed conversion of current EXP into
 * production counts. This is not cryptographic authentication or a general
 * event/period or cross-shop replay engine.
 */
import {createSourceReviewedMemoryWorldAdapter,executeMemoryCommand,
  encodeMemorySnapshot,decodeMemorySnapshot,PERIOD_WORLD_SCHEMA}
  from './game-core-contract.mjs';
import {validateOriginalPeriodSeed} from './original-period-world-seed.mjs';
import {validateSourceSparseMarket} from './original-admin-world-bootstrap.mjs';

const fail=s=>{throw new RangeError('P2 career save: '+s);};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const int=(n,min=0,max=Number.MAX_SAFE_INTEGER)=>
  Number.isSafeInteger(n)&&n>=min&&n<=max;
const exact=(x,keys)=>object(x)&&
  Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
export const MAX_CAREER_COMMANDS=128;
const recipes=new Map([
  [9,[0,1,2]],[12,[0,1,2,3]],[14,[0]],[15,[0,1,2,3,4]],
  [16,[0,1]],[17,[0,1,2,3]],[25,[0,1]],
  [79,[0,1,3,4]],[78,Array.from({length:14},(_,i)=>i)],
  // P3 first-stage: source gift/market kit, blacksmith or magic training,
  // then the four iron recipes. Advanced recipes stay outside this proof.
  [37,[0,1]],[20,[0]],[21,[0]],[22,[0]],[23,[0]],
]);
const buyIds=[8,14,15,16,17,20,21,22,23,37,78];
// Do not require an unrelated career change to prove genuine P3 manufacture.
// Magic training alone retains the older B-43 envelope; blacksmith training
// and forging need complete source history even without #78.
export function requiresReviewedHistory(c){
  return c?.kind==='use-item'&&(c.itemId===78||
    (c.itemId===37&&c.useId===0)||[20,21,22,23,66].includes(c.itemId));
}
export function isCareerReplayCommand(c){
  if(!object(c)||!int(c.expectedRevision))return false;
  const core=['kind','expectedRevision'];
  if(c.kind==='open-shop')return exact(c,[...core,'shopId','ownerName','shopName'])&&
    c.shopId===1&&typeof c.ownerName==='string'&&typeof c.shopName==='string';
  if(c.kind==='reviewed-sparse-all-plus')return exact(c,[...core,'timespanSeconds','randomDraws'])&&
    [60,600,3600].includes(c.timespanSeconds)&&Array.isArray(c.randomDraws)&&
    c.randomDraws.length>=59&&c.randomDraws.length<=118&&c.randomDraws.every(n=>int(n,0,999999));
  if(c.kind==='market-buy')return exact(c,[...core,'shopId','itemId',
    'requestedCount','marketShelf','expectedPrice'])&&c.shopId===1&&
    buyIds.includes(c.itemId)&&int(c.requestedCount,1,40)&&
    int(c.marketShelf,0,79)&&int(c.expectedPrice,1);
  if(c.kind==='use-item'){
    const withDraws=Object.hasOwn(c,'randomDraws');
    return exact(c,[...core,'shopId','itemId','useId','requestedCount',
      ...(withDraws?['randomDraws']:[])])&&c.shopId===1&&
      recipes.get(c.itemId)?.includes(c.useId)===true&&int(c.requestedCount,1,50)&&
      (c.itemId!==78||c.requestedCount===1)&&
      (!withDraws||(Array.isArray(c.randomDraws)&&c.randomDraws.length>=1&&
        c.randomDraws.length<=128&&c.randomDraws.every(n=>int(n,0,999999))));
  }
  return false;
}
export function beginCareerProof(world,anchorKind){
  return {anchorKind,anchor:encodeMemorySnapshot(world),commands:[]};
}
export function appendCareerCommand(proof,command){
  if(!proof||proof.commands.length>=MAX_CAREER_COMMANDS||
     !isCareerReplayCommand(command))return null;
  return {...proof,commands:[...proof.commands,structuredClone(command)]};
}
function scope(world){
  return world.schema===PERIOD_WORLD_SCHEMA&&world.streetId==='standard-street'&&
    world.events===null&&world.shops.length<=1&&
    validateOriginalPeriodSeed(world.period)&&world.period.eventState!==null&&
    validateSourceSparseMarket(world.market);
}
function replayCommand(repository,streetModule,command){
  const result=executeMemoryCommand({repository,streetModule,command});
  if(!result.ok)fail('source command rejected: '+result.code+' '+(result.details?.reason??''));
  return result.world;
}
/**
 * The two anchor types are intentionally different: a fresh source seed is
 * regenerated, a legacy checkpoint is limited to the previous B-43 envelope.
 * No client may supply the anchor through HTTP. Replay verifies the same
 * server-owned RNG policy and the complete final snapshot, including market.
 */
export function verifyCareerProof({world,proof,streetModule,createInitialWorld,
  verifyDraws,validateLegacyAnchor}){
  if(!exact(proof,['anchorKind','anchor','commands'])||
     !['fresh','legacy'].includes(proof.anchorKind)||
     typeof proof.anchor!=='string'||proof.anchor.length>200000||
     !Array.isArray(proof.commands)||proof.commands.length<1||
     proof.commands.length>MAX_CAREER_COMMANDS||
     !proof.commands.some(requiresReviewedHistory)||
     !scope(world)||world.shops.length!==1)
    fail('missing or unreviewed career history');
  const anchor=decodeMemorySnapshot(proof.anchor);
  if(encodeMemorySnapshot(anchor)!==proof.anchor||!scope(anchor)||
     anchor.worldId!==world.worldId||anchor.nowSeconds!==world.nowSeconds||
     anchor.revision+proof.commands.length!==world.revision)
    fail('invalid source anchor or revision');
  if(proof.anchorKind==='fresh'){
    if(anchor.revision!==1||anchor.shops.length!==0)fail('fresh anchor shape');
    const initial=createInitialWorld({worldId:anchor.worldId,nowSeconds:anchor.nowSeconds});
    const seed=createSourceReviewedMemoryWorldAdapter({initialWorld:initial,streetModule});
    const initialized=replayCommand(seed,streetModule,{kind:'initialize-source-market',
      expectedRevision:0});
    if(encodeMemorySnapshot(initialized)!==proof.anchor)
      fail('fresh source initialization mismatch');
  }else{
    validateLegacyAnchor(anchor);
  }
  const repository=createSourceReviewedMemoryWorldAdapter({initialWorld:anchor,streetModule});
  for(const command of proof.commands){
    if(!isCareerReplayCommand(command))fail('command outside P2/P3 source scope');
    const before=repository.read();
    if(!verifyDraws(before,command))fail('source RNG history mismatch');
    const after=replayCommand(repository,streetModule,command);
    if(!scope(after))fail('unreviewed period or multi-shop transition');
  }
  if(encodeMemorySnapshot(repository.read())!==encodeMemorySnapshot(world))
    fail('replayed WorldState does not match checkpoint');
  return world;
}
