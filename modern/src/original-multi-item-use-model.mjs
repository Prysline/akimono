/**
 * B-22: Original Core UseItem numeric fragment for MULTIPLE items and shops.
 *
 * Fixed source: plug/use.cgi lines 115-150 (all materials consumed first,
 * then produced in source order; ONE CheckWholeStore after ALL creations);
 * plug/whole.cgi lines 50-74 (one pass through ALL coded item slots).
 *
 * Run only on synthetic numeric arrays. Source anomalies are preserved:
 * negative pre-existing inventory, negative retained creation quantity,
 * possible probability output above requested count, source order and
 * wholesale re-cap. See docs/original-behavior-issues.md.
 *
 * Not full UseItem: eligibility, time/money, callbacks, logs, CGI, real
 * game files and writes are explicitly OUT OF SCOPE. JS numeric bounds
 * are fixture representation limits, not changes to Core game rules.
 */
import {projectOriginalMakeAmount} from './original-use-outcomes-model.mjs';

const MAX_FIXTURE_ITEMS=79, MAX_FIXTURE_SHOPS=12;
function fail(message){throw new Error(message)}
function number(v,label,{integer=false,min=-Number.MAX_SAFE_INTEGER}={}){
  if(typeof v!=='number'||!Number.isFinite(v)||
     !Number.isSafeInteger(Math.trunc(v))||
     Math.abs(v)>Number.MAX_SAFE_INTEGER||v<min||
     (integer&&!Number.isSafeInteger(v)))fail('Unrepresentable '+label);
  return v;
}
function arithmetic(v,label){return number(v,label)}
function frozenRows(rows){
  return Object.freeze(rows.map(row=>Object.freeze([...row])));
}
function actions(rows,label,itemCount){
  if(!Array.isArray(rows)||rows.length>79)fail('Unreviewed '+label+' list');
  return rows.map((v,i)=>{
    if(!v||typeof v!=='object')fail('Missing '+label+' record');
    number(v.itemId,label+' itemId',{integer:true,min:1});
    if(v.itemId>itemCount)fail('Out-of-range '+label+' itemId');
    number(v.countPerUse,label+' countPerUse',{integer:true,min:0});
    number(v.probabilityPermille,label+' probabilityPermille');
    return {itemId:v.itemId,countPerUse:v.countPerUse,
      probabilityPermille:v.probabilityPermille,index:i};
  });
}

/**
 * Models only the fixed source's numeric material + production + wholesale
 * fragment, called with an already established positive effective use count.
 * Explicit random() is shared by consumption and production IN SOURCE ORDER.
 * All state is copied, then deeply frozen; original inputs never mutated.
 */
export function projectOriginalMultiItemUse({
  shops,actingShopIndex=0,items,wholesale,uses,creates,count,random,
}){
  if(!Array.isArray(items)||items.length===0||
     items.length>MAX_FIXTURE_ITEMS)fail('Items must be 1..79 source slots');
  const n=items.length;
  if(!Array.isArray(shops)||shops.length===0||
     shops.length>MAX_FIXTURE_SHOPS)fail('Shops require 1..12 fixture entries');
  const shopStocks=shops.map((row,i)=>{
    if(!Array.isArray(row)||row.length!==n)fail('Wrong shop row length');
    return row.map((v,j)=>number(v,'shop '+i+' item '+j));
  });
  if(!Array.isArray(wholesale)||wholesale.length!==n)fail('Wrong wholesale length');
  const whole=wholesale.map((v,j)=>number(v,'wholesale '+j));
  const configs=items.map((v,i)=>{
    if(!v||typeof v!=='object'||typeof v.code!=='boolean'){
      fail('Invalid item code at '+i);
    }
    return {
      code:v.code,limit:number(v.limit,'limit '+i),
      wslimit:number(v.wslimit,'wslimit '+i),
    };
  });
  number(actingShopIndex,'actingShopIndex',{integer:true,min:0});
  if(actingShopIndex>=shopStocks.length)fail('Acting shop out of range');
  number(count,'count',{integer:true,min:1});
  const material=actions(uses,'uses',n);
  const output=actions(creates,'creates',n);
  const consumed=[],added=[],discarded=[],samples=[];
  const shop=shopStocks[actingShopIndex];
  let totalDraws=0;
  function take(action,phase){
    const requested=arithmetic(action.countPerUse*count,phase+' requested');
    const sampled=projectOriginalMakeAmount({
      count:requested,probabilityPermille:action.probabilityPermille,random,
    });
    totalDraws+=sampled.draws;
    samples.push(Object.freeze({phase,itemId:action.itemId,
      request:requested,amount:sampled.amount,draws:sampled.draws,
      branch:sampled.branch}));
    return sampled.amount;
  }

  // Original UseItem: consume every material, in input order.
  for(const act of material){
    const amount=take(act,'consume');
    if(amount){
      const id=act.itemId;
      shop[id-1]=arithmetic(shop[id-1]-amount,'consumed stock');
      consumed.push(Object.freeze({itemId:id,amount}));
    }
  }

  // Original UseItem: produce in input order; duplicate item IDs are valid.
  for(const act of output){
    let amount=take(act,'create');
    if(!amount)continue;
    const id=act.itemId, idx=id-1;
    const cap=configs[idx].limit;
    const old=shop[idx];
    if(amount+old>cap){
      const trashed=arithmetic(amount-(cap-old),'discard amount');
      whole[idx]=arithmetic(whole[idx]+trashed,'wholesale after discard');
      discarded.push(Object.freeze({itemId:id,amount:trashed}));
      amount=arithmetic(cap-old,'retained output');
    }
    shop[idx]=arithmetic(shop[idx]+amount,'shop after create');
    added.push(Object.freeze({itemId:id,amount}));
  }

  // One original CheckWholeStore call AFTER all items were produced.
  const marketAfterOverflow=Object.freeze([...whole]);
  const wholesaleChecks=[];
  const numShops=shopStocks.length; // original: @DT || 1
  for(let i=0;i<n;i++){
    if(!configs[i].code)continue; // original skips uncoded items completely
    const shopSum=arithmetic(
      shopStocks.reduce((total,row)=>total+row[i],0),'all shops stock');
    const lim=configs[i].wslimit<0?-configs[i].wslimit:
      Math.trunc(configs[i].wslimit*numShops+0.99);
    arithmetic(lim,'wholesale cap');
    const before=whole[i];
    if(shopSum+whole[i]>lim){
      const boundedShopSum=lim<shopSum?lim:shopSum;
      whole[i]=arithmetic(lim-boundedShopSum,'wholesale capped stock');
    }
    if(whole[i]<0)whole[i]=0;
    wholesaleChecks.push(Object.freeze({itemId:i+1,shopSum,
      limit:lim,from:before,to:whole[i]}));
  }
  return Object.freeze({
    actingShopIndex,count,shops:frozenRows(shopStocks),
    wholesale:Object.freeze([...whole]),marketAfterOverflow,
    samples:Object.freeze(samples),consumed:Object.freeze(consumed),
    added:Object.freeze(added),discarded:Object.freeze(discarded),
    wholesaleChecks:Object.freeze(wholesaleChecks),
    randomDraws:totalDraws,wholeStoreChecks:1,
    scope:'frozen Core UseItem numeric fragment only; no CGI or durable transaction',
  });
}
