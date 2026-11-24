/**
 * B-23: synthetic, in-memory ORIGINAL UseItem preflight -> accounting ->
 * B-22 ordered multi-item/wholesale numerical flow.
 *
 * Frozen Core: plug/use.cgi lines 64-150, plug/calc.cgi GetItemUseTime
 * and UseTime. After CheckWholeStore, arbitrary item callbacks and exp
 * redistribution are NOT executed. This is not an authorized transaction,
 * CGI, DSL compiler or durable world write.
 *
 * The original step order, repeated material checks, zero-probability
 * material rule, deferred UseTime cap and duplicate output logs are kept.
 */
import {projectOriginalMultiItemUse} from './original-multi-item-use-model.mjs';

function invalid(message){throw new RangeError(message);}
function integer(x,label,{min=-Number.MAX_SAFE_INTEGER}={}){
  if(typeof x!=='number'||!Number.isSafeInteger(x)||x<min){
    invalid('Unrepresentable fixture '+label);
  }
  return x;
}
function finite(x,label){
  if(typeof x!=='number'||!Number.isFinite(x)||
     Math.abs(x)>Number.MAX_SAFE_INTEGER)invalid('Unrepresentable fixture '+label);
  return x;
}
function product(x,y,label){
  const n=x*y;
  if(!Number.isSafeInteger(n))invalid('Unrepresentable fixture product '+label);
  return n;
}
function sum(x,y,label){
  const n=x+y;
  if(!Number.isSafeInteger(n))invalid('Unrepresentable fixture sum '+label);
  return n;
}
function freezeMatrix(rows){return Object.freeze(rows.map(r=>Object.freeze([...r])));}
function validateActions(actions,countItems,name){
  if(!Array.isArray(actions)||actions.length>79)invalid('Invalid '+name+' list');
  return actions.map((item,i)=>{
    if(!item||typeof item!=='object')invalid('Invalid '+name+' entry '+i);
    integer(item.itemId,name+' itemId',{min:1});
    if(item.itemId>countItems)invalid('Out of range '+name+' itemId');
    integer(item.countPerUse,name+' countPerUse',{min:1});
    finite(item.probabilityPermille,name+' probabilityPermille');
    return item;
  });
}
function fixedInputs(o){
  if(!o||typeof o!=='object')invalid('Missing transaction fixture');
  const items=o.items;
  if(!Array.isArray(items)||items.length<1||items.length>79)
    invalid('Items must have 1..79 slots');
  const shops=o.shops;
  if(!Array.isArray(shops)||shops.length<1||shops.length>12||
     shops.some(row=>!Array.isArray(row)||row.length!==items.length))
    invalid('Invalid shops fixture');
  const normalizedShops=shops.map((row,i)=>row.map((v,j)=>
    finite(v,'shop '+i+' slot '+j)));
  if(!Array.isArray(o.wholesale)||o.wholesale.length!==items.length)
    invalid('Invalid wholesale fixture');
  const wholesale=o.wholesale.map((v,i)=>finite(v,'wholesale '+i));
  integer(o.actingShopIndex,'actingShopIndex',{min:0});
  if(o.actingShopIndex>=shops.length)invalid('Acting shop out of range');
  integer(o.requestedCount,'requestedCount',{min:0});
  for(const key of [
    'experience','needExperience','point','needPoint','rank',
    'needPopularity','money','costPerUse','paytoday','nowSeconds',
    'storedTimeSeconds','baseUseTimeSeconds','trainedUseTimeSeconds',
    'maxStockTimeSeconds',
  ])integer(o[key],key);
  if(o.costPerUse<0||o.maxStockTimeSeconds<0)
    invalid('Negative fixture cost or time cap');
  if(o.experienceOld!==undefined&&o.experienceOld!==null)
    integer(o.experienceOld,'experienceOld');
  if(typeof o.job!=='string'||typeof o.needJob!=='string'||
     typeof o.needsEvent!=='boolean'||typeof o.eventActive!=='boolean'||
     typeof o.shopStatus!=='boolean')invalid('Invalid gate flags');
  const uses=validateActions(o.uses,items.length,'uses');
  if(!Array.isArray(o.creates)||o.creates.length>79)
    invalid('Invalid creates list');
  // B-22 also validates create records, including zero countPerUse.
  const creates=o.creates;
  const expForTime=o.experienceOld===undefined||o.experienceOld===null
    ?o.experience:o.experienceOld;
  const timeDelta=o.baseUseTimeSeconds-o.trainedUseTimeSeconds;
  const adjustment=timeDelta*expForTime/1000;
  const useTime=o.baseUseTimeSeconds-Math.trunc(adjustment);
  if(!Number.isSafeInteger(useTime)||useTime<=0)
    invalid('Unrepresentable original GetItemUseTime denominator');
  return {shops:normalizedShops,wholesale,uses,creates,useTime};
}

/** Gate decisions run in original source order, with original inventory
 * re-read for each material; no preaggregation of repeated material IDs.
 * A zero effective count returns before any spending or global market check.
 */
export function projectOriginalUseTransaction(options){
  const o=options;
  const {shops,wholesale,uses,creates,useTime}=fixedInputs(o);
  const stock=shops[o.actingShopIndex];
  let count=o.requestedCount;
  const gateSteps=[];
  function record(label){gateSteps.push(Object.freeze({step:label,count}));}
  if(o.experience<o.needExperience)count=0;
  record('experience');
  if(o.needJob&&o.job!==o.needJob)count=0;
  record('job');
  if(o.needPoint&&o.point<o.needPoint)count=0;
  record('point');
  if(o.needPopularity&&o.rank<o.needPopularity)count=0;
  record('popularity');
  if(o.needsEvent&&!o.eventActive)count=0;
  record('event');
  if(o.money<product(o.costPerUse,count,'money preflight')&&o.costPerUse){
    count=Math.trunc(o.money/o.costPerUse);
  }
  record('money');
  if(sum(o.storedTimeSeconds,product(useTime,count,'time preflight'),
      'time preflight')>o.nowSeconds){
    count=Math.trunc((o.nowSeconds-o.storedTimeSeconds)/useTime);
  }
  record('time');
  for(const item of uses){
    const need=product(item.countPerUse,
      item.probabilityPermille===0?1:count,'material preflight');
    if(stock[item.itemId-1]<need){
      count=Math.trunc(stock[item.itemId-1]/item.countPerUse);
    }
    record('material:'+item.itemId);
  }

  // The frozen source returns before initializing useitem/additem arrays
  // when count == 0. Do not call B-22 CheckWholeStore in that case.
  if(count===0){
    return Object.freeze({
      requestedCount:o.requestedCount,count,performed:false,useTimeSeconds:useTime,
      timeSpentSeconds:0,moneySpent:0,money:o.money,paytoday:o.paytoday,
      storedTimeSeconds:o.storedTimeSeconds,shops:freezeMatrix(shops),
      wholesale:Object.freeze([...wholesale]),multiItem:null,
      gateSteps:Object.freeze(gateSteps),wholeStoreChecks:0,randomDraws:0,
      scope:'frozen Core preflight only; no callback, CGI or durable transaction',
    });
  }
  const timeSpent=product(useTime,count,'UseTime elapsed');
  // Original UseTime checks negative duration before updating the shop.
  if(o.shopStatus&&timeSpent<0)throw new RangeError('Original UseTime: bad request');
  // Negative count with status 0 enters the original mutation loops, where
  // negative MakeAmount input has Perl-specific behavior not covered here.
  if(count<0)invalid('Unreviewed negative count with inactive shop');
  let storedTime=o.storedTimeSeconds;
  if(o.shopStatus){
    const unused=o.nowSeconds-o.storedTimeSeconds;
    if(unused>o.maxStockTimeSeconds){
      storedTime=o.nowSeconds-o.maxStockTimeSeconds;
    }
    // Original UseTime rejects future shop time for nonempty USER; with
    // a positive effective count and positive useTime this is unreachable.
    storedTime=sum(storedTime,timeSpent,'UseTime stored time');
  }
  const spent=product(o.costPerUse,count,'money charged');
  const money=sum(o.money,-spent,'money');
  const paytoday=sum(o.paytoday,spent,'paytoday');
  const multiItem=projectOriginalMultiItemUse({
    shops,actingShopIndex:o.actingShopIndex,items:o.items,wholesale,
    uses,creates,count,random:o.random,
  });
  return Object.freeze({
    requestedCount:o.requestedCount,count,performed:true,useTimeSeconds:useTime,
    timeSpentSeconds:timeSpent,moneySpent:spent,money,paytoday,
    storedTimeSeconds:storedTime,shops:multiItem.shops,
    wholesale:multiItem.wholesale,multiItem,gateSteps:Object.freeze(gateSteps),
    wholeStoreChecks:multiItem.wholeStoreChecks,randomDraws:multiItem.randomDraws,
    scope:'frozen Core preflight, accounting and multi-item numeric flow; no callback, CGI or durable transaction',
  });
}
