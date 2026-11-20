/**
 * B-19: pure, SOURCE-REVIEWED subset of Core period history rollover and exp.
 *
 * Frozen Core:
 *   inc-period.cgi lines 65-75, 109-115
 *   plug/use.cgi lines 171-205
 * Standard Street _config.cgi:
 *   EXP_DOWN_RATE=60, EXP_DOWN_POINT=5, LIMIT_EXP=3600.
 *
 * All records are synthetic pairs {itemId, value}; 1..79 item IDs, integers.
 * No Core period top-level evaluation, random, guilds, events, taxes, item
 * creation, market stock, shop closure, persistence or use-item callbacks.
 * The 1000 per-item exp cap is source-derived; stored exp outside this cap
 * is intentionally rejected as outside the reviewed subset.
 */

export const REVIEWED_EXP_CONFIG=Object.freeze({
  itemCount:79,perItemCap:1000,limitExp:3600,
  decayRatePerThousand:60,decayFixedPoints:5,
});

function fail(message){throw new Error(message);}
function safeInt(value,label,min=0,max=Number.MAX_SAFE_INTEGER){
  if(!Number.isSafeInteger(value)||value<min||value>max){
    throw new RangeError(label+' outside reviewed safe integer range');
  }
  return value;
}
function pairs(entries,label,maxValue=Number.MAX_SAFE_INTEGER){
  if(!Array.isArray(entries)||entries.length>REVIEWED_EXP_CONFIG.itemCount){
    fail(label+' must contain at most 79 reviewed item records');
  }
  const seen=new Set();
  const ordered=entries.map((entry)=>{
    if(!entry||typeof entry!=='object')fail('Malformed '+label+' entry');
    const itemId=safeInt(entry.itemId,label+' item ID',1,79);
    const value=safeInt(entry.value,label+' value',0,maxValue);
    if(seen.has(itemId))fail('Duplicate '+label+' item ID');
    seen.add(itemId);
    return Object.freeze({itemId,value});
  });
  return Object.freeze(ordered.sort((a,b)=>a.itemId-b.itemId));
}

/**
 * Exact isolated effects only:
 *   itemyesterday = itemtoday; itemtoday = {};
 *   for each exp: subtract int(exp*60/1000), then 5, delete if <=0.
 * Does not run the other original period bookkeeping, money, RNG, guilds etc.
 */
export function projectReviewedPeriodHistory({itemyesterday,itemtoday,exp}){
  // Check all source-shaped map records before touching state.
  pairs(itemyesterday,'itemyesterday');
  const yesterday=pairs(itemtoday,'itemtoday');
  const expBefore=pairs(exp,'exp',REVIEWED_EXP_CONFIG.perItemCap);
  const nextExp=Object.freeze(expBefore.flatMap(({itemId,value})=>{
    const down=Math.trunc(value*REVIEWED_EXP_CONFIG.decayRatePerThousand/1000);
    const result=value-down-REVIEWED_EXP_CONFIG.decayFixedPoints;
    return result>0?[Object.freeze({itemId,value:result})]:[];
  }));
  return Object.freeze({
    itemyesterday:yesterday,
    itemtoday:Object.freeze([]),
    exp:nextExp,
    scope:'pure, single reviewed period subset; no real world execution',
  });
}

/**
 * Core UseItem experience tail only, NOT full UseItem execution.
 *
 * The original adds expPerUse*count to the selected item, clamps per-item
 * to 1000, then if sum>3600 subtracts excess from other keys sorted by
 * their current exp ascending. Core's sort is not deterministic for ties;
 * this subset REJECTS ties among other items when a reduction is needed.
 */
export function projectReviewedUseExperience({exp,itemId,expPerUse,count}){
  const current=pairs(exp,'exp',REVIEWED_EXP_CONFIG.perItemCap);
  safeInt(itemId,'itemId',1,79);
  safeInt(expPerUse,'expPerUse',1,1000);
  safeInt(count,'count',1,1000);
  const amount=new Map(current.map(({itemId,value})=>[itemId,value]));
  const before=amount.get(itemId)??0;
  const increase=Math.min(1000-before,expPerUse*count);
  amount.set(itemId,before+increase);
  let extra=[...amount.values()].reduce((sum,value)=>sum+value,0)-
    REVIEWED_EXP_CONFIG.limitExp;
  let reduced=false;
  if(extra>0){
    reduced=true;
    const others=[...amount.entries()].filter(([id])=>id!==itemId)
      .sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
    for(let i=1;i<others.length;i++){
      if(others[i][1]===others[i-1][1]){
        fail('Ambiguous equal-exp ordering in original Core reduction');
      }
    }
    // Source keycnt begins at $#key, including the selected item.
    let keycnt=amount.size-1;
    for(const [id,value]of others){
      if(keycnt<=0)fail('Unsafe source experience reduction denominator');
      const reduction=Math.min(value,Math.trunc(extra/keycnt));
      const remaining=value-reduction;
      if(remaining===0)amount.delete(id);
      else amount.set(id,remaining);
      extra-=reduction;
      keycnt--;
    }
  }
  const result=Object.freeze([...amount.entries()]
    .map(([id,value])=>Object.freeze({itemId:id,value}))
    .sort((a,b)=>a.itemId-b.itemId));
  return Object.freeze({
    itemId,previousExp:before,awardedExp:increase,
    exp:result,sourceOverflowBranchEntered:reduced,
    residualExcessAfterSourceLoop:Math.max(0,extra),
    scope:'pure original UseItem exp tail only; no use-item execution',
  });
}
