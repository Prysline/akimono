/**
 * B-20. Strict, pure subsets of two pinned Core sources:
 *   inc-period.cgi lines 77-82 (stock cap and Perl int truncation)
 *   plug/use.cgi lines 69-104 (UseItem eligibility/count adjustments)
 *   plug/use.cgi lines 208-224 (MakeAmount)
 *
 * Original code can leave negative stock, invoke dynamic job/use functions,
 * alter money/time, randomize large amounts and run callbacks. None of
 * those unsafe or unrelated operations run here. Dynamic callbacks MUST be
 * explicitly excluded; passing this planning gate is NOT authorization to
 * execute an item action or commit to real game files.
 */
export const REVIEWED_USE_LIMITS=Object.freeze({
  itemSlots:79,perMille:1000,smallRandomCount:19,
});

function fail(m){throw new Error(m)}
function nonnegative(value,label,{integer=true,max=Number.MAX_SAFE_INTEGER}={}){
  if(typeof value!=='number'||!Number.isFinite(value)||
     value<0||value>max||(integer&&!Number.isSafeInteger(value))){
    throw new RangeError(label+' must be a reviewed nonnegative '+(integer?'safe integer':'finite value'));
  }
  return value;
}
function safeProduct(a,b,label){
  const result=a*b;
  if(!Number.isSafeInteger(result))fail(label+' exceeds safe integer arithmetic');
  return result;
}
function slots(raw,label,{integer=false}={}){
  if(!Array.isArray(raw)||raw.length!==REVIEWED_USE_LIMITS.itemSlots){
    fail(label+' must contain exactly 79 positions');
  }
  return raw.map((v,i)=>nonnegative(v,label+'['+i+']',{integer}));
}
function reviewedMaterials(materials){
  if(!Array.isArray(materials)||materials.length>79)fail('materials must be a bounded array');
  const seen=new Set();
  return Object.freeze(materials.map(m=>{
    if(!m||typeof m!=='object')fail('Invalid material record');
    const itemId=nonnegative(m.itemId,'material item ID',{max:79});
    if(itemId===0)fail('material ID must be 1..79');
    if(seen.has(itemId))fail('Duplicate material ID');
    seen.add(itemId);
    const requiredPerUse=nonnegative(m.requiredPerUse,'requiredPerUse');
    if(requiredPerUse===0)fail('requiredPerUse must be positive');
    const probabilityPermille=nonnegative(
      m.probabilityPermille,'probabilityPermille',{max:1000});
    return Object.freeze({itemId,requiredPerUse,probabilityPermille});
  }));
}

/** Original caps stock ABOVE limit, then performs Perl int() on each cell.
 * Our safety subset rejects negative and unsafe quantities rather than
 * mirroring Core's potentially negative/invalid stock handling.
 * No world, shop, or input array is modified.
 */
export function projectReviewedPeriodStock({stock,limits}){
  const current=slots(stock,'stock');
  const caps=slots(limits,'limits',{integer:true});
  const capped=Object.freeze(current.map((v,i)=>Math.trunc(Math.min(v,caps[i]))));
  const altered=Object.freeze(current.flatMap((v,i)=>
    capped[i]===v?[]:[Object.freeze({itemId:i+1,from:v,to:capped[i]})]));
  return Object.freeze({
    stock:capped,changed:altered,
    scope:'pure Core period stock cap/int subset; no complete period or writes',
  });
}

/** Explicit external observations of source's initial Count gating.
 * - callback-free mode only: caller must confirm there are no dynamic job
 *   or functionbefore restrictions; this is NOT their implementation.
 * - no actual UseItem, inventory decrement or RNG is performed.
 * - floor budget/time and material count checks preserve Core evaluation
 *   order, including probability=0 checking one per-use requirement.
 */
export function projectReviewedUsePreflight({
  requestedCount,experience,needExperience,
  job,needJob,point,needPoint,rank,needPopularity,
  needsEvent,eventSatisfied,money,costPerUse,
  nowSeconds,shopTimeSeconds,useTimeSeconds,
  stock,materials,callbacksConfirmedAbsent,
}){
  if(callbacksConfirmedAbsent!==true){
    fail('Dynamic job/functionbefore callbacks are not reviewed');
  }
  for(const [name,value]of [
    ['requestedCount',requestedCount],['experience',experience],
    ['needExperience',needExperience],['point',point],['needPoint',needPoint],
    ['rank',rank],['needPopularity',needPopularity],['money',money],
    ['costPerUse',costPerUse],['nowSeconds',nowSeconds],
    ['shopTimeSeconds',shopTimeSeconds],['useTimeSeconds',useTimeSeconds],
  ])nonnegative(value,name);
  if(requestedCount>1000)fail('requestedCount exceeds isolated bound');
  if(useTimeSeconds===0)fail('Use time must be positive for bounded Core count');
  if(shopTimeSeconds>nowSeconds)fail('Shop time is in future');
  if(typeof job!=='string'||typeof needJob!=='string'||
    !/^[A-Za-z0-9_-]{0,32}$/.test(job)||
    !/^[A-Za-z0-9_-]{0,32}$/.test(needJob)){
    fail('Unreviewed job identifier');
  }
  if(typeof needsEvent!=='boolean'||typeof eventSatisfied!=='boolean'){
    fail('Event satisfaction observations must be explicit booleans');
  }
  const current=slots(stock,'stock',{integer:true});
  const inputMaterials=reviewedMaterials(materials);
  let count=requestedCount;
  const blocked=[];
  if(experience<needExperience){count=0;blocked.push('experience');}
  if(needJob!==''&&job!==needJob){count=0;blocked.push('job');}
  if(needPoint>0&&point<needPoint){count=0;blocked.push('point');}
  if(needPopularity>0&&rank<needPopularity){
    count=0;blocked.push('popularity');
  }
  if(needsEvent&&!eventSatisfied){count=0;blocked.push('event');}
  if(costPerUse>0&&money<safeProduct(costPerUse,count,'money use cost')){
    count=Math.trunc(money/costPerUse);
  }
  if(shopTimeSeconds+safeProduct(useTimeSeconds,count,'time use cost')>nowSeconds){
    count=Math.trunc((nowSeconds-shopTimeSeconds)/useTimeSeconds);
  }
  for(const {itemId,requiredPerUse,probabilityPermille}of inputMaterials){
    const checkedRequired=safeProduct(requiredPerUse,
      probabilityPermille===0?1:count,'material use cost');
    if(current[itemId-1]<checkedRequired){
      count=Math.trunc(current[itemId-1]/requiredPerUse);
    }
  }
  return Object.freeze({
    requestedCount,projectedCount:count,
    eligible:count>0,blockReasons:Object.freeze(blocked),
    materials:inputMaterials,
    scope:'source-count decision only; no item execution, callbacks or commit',
  });
}

/** Exact Core MakeAmount small-sample subset (cnt < 20).
 * Probability 0 => zero; >=1000 => full count. Intermediate probabilities
 * consume one explicit RNG draw per trial. Core's >=20 stochastic formula
 * intentionally remains unimplemented and is fail-closed.
 */
export function sampleReviewedSmallMakeAmount({
  units,probabilityPermille,random,
}){
  nonnegative(units,'units',{max:19});
  nonnegative(probabilityPermille,'probabilityPermille',{max:1000});
  if(units===0||probabilityPermille===0)return Object.freeze({amount:0,draws:0});
  if(probabilityPermille===1000)return Object.freeze({amount:units,draws:0});
  if(typeof random!=='function')fail('Explicit random callback required');
  let amount=0;
  for(let i=0;i<units;i++){
    const r=random();
    if(typeof r!=='number'||!Number.isFinite(r)||r<0||r>=1){
      fail('Random draw must be in [0,1)');
    }
    if(r*1000<probabilityPermille)amount++;
  }
  return Object.freeze({amount,draws:units});
}
