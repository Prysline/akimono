/**
 * B-24: combine B-23 frozen Core UseItem numeric transaction with the
 * ORIGINAL experience tail from plug/use.cgi (after CheckWholeStore and
 * optional item callback). Only a DECLARED callback-free synthetic fixture
 * may cross this boundary; no callback is silently skipped in real play.
 *
 * The original experience loop uses "sort {exp[a] <=> exp[b]} keys %exp".
 * It does not prescribe an item-ID tie break. For tied values on entry to
 * the overflow branch callers MUST supply the observed Perl sorted key
 * sequence. This is fixture evidence, not a new game sorting rule.
 */
import {projectOriginalUseTransaction} from './original-use-transaction-model.mjs';

function bad(message){throw new RangeError(message);}
function safe(v,label,{min=-Number.MAX_SAFE_INTEGER}={}){
  if(typeof v!=='number'||!Number.isSafeInteger(v)||v<min)
    bad('Unrepresentable '+label+' fixture');
  return v;
}
function checked(a,b,label){
  const n=a+b;
  if(!Number.isSafeInteger(n))bad('Unrepresentable '+label+' arithmetic');
  return n;
}
function times(a,b,label){
  const n=a*b;
  if(!Number.isSafeInteger(n))bad('Unrepresentable '+label+' arithmetic');
  return n;
}
function readExp(rows){
  if(!Array.isArray(rows)||rows.length>79)bad('Invalid experience map fixture');
  const m=new Map();
  for(const row of rows){
    if(!row||typeof row!=='object')bad('Invalid experience map entry');
    const id=safe(row.itemId,'experience itemId',{min:1});
    if(id>79||m.has(id))bad('Invalid or duplicate experience itemId');
    m.set(id,safe(row.value,'experience value'));
  }
  return m;
}
function freezeExp(map){
  return Object.freeze([...map.entries()].sort((a,b)=>a[0]-b[0]).map(
    ([itemId,value])=>Object.freeze({itemId,value})));
}
function orderKeys(map,observed){
  const sorted=[...map.keys()].sort((a,b)=>map.get(a)-map.get(b));
  let tied=false;
  for(let i=1;i<sorted.length;i++){
    if(map.get(sorted[i])===map.get(sorted[i-1])){tied=true;break;}
  }
  if(observed===undefined||observed===null){
    if(tied)bad('Observed Perl sorted keys required for equal experience');
    return sorted;
  }
  if(!Array.isArray(observed)||observed.length!==sorted.length)
    bad('Observed Perl sorted keys must contain every experience key');
  const seen=new Set();
  for(let i=0;i<observed.length;i++){
    const key=safe(observed[i],'observed Perl sorted key',{min:1});
    if(!map.has(key)||seen.has(key))bad('Observed Perl sorted keys permutation');
    if(i>0&&map.get(observed[i-1])>map.get(key))
      bad('Observed Perl keys must be ordered by original experience comparator');
    seen.add(key);
  }
  return [...observed];
}
/**
 * Returns transaction result + exact post-transaction experience tail.
 * No modification is made to B-23, the original source, or the input.
 *
 * Required source observations: experienceRecords reflect the shop's
 * pre-transaction DT.exp; options.experience matches the selected item.
 * callbacksConfirmedAbsent is an explicit assertion by the test fixture,
 * NOT a check of a compiled DSL or permission to execute callbacks.
 */
export function projectOriginalUseWithExperience({
  experienceRecords,selectedItemId,expPerUse,experienceLimit=3600,
  observedPerlSortedKeys=null,callbacksConfirmedAbsent,...transactionOptions
}){
  if(callbacksConfirmedAbsent!==true)
    bad('Unreviewed item callback boundary: synthetic callback-free fixture required');
  const map=readExp(experienceRecords);
  const id=safe(selectedItemId,'selected itemId',{min:1});
  if(id>79)bad('Unrepresentable selected itemId fixture');
  const current=map.get(id)??0;
  if(transactionOptions.experience!==current)
    bad('Selected experience must match original shop experience map');
  safe(expPerUse,'expPerUse');
  safe(experienceLimit,'experienceLimit');

  const transaction=projectOriginalUseTransaction(transactionOptions);
  let performedTail=false;
  let previousExp=null,awardedExp=0,rawExpAward=0;
  let overflowEntered=false,remainingExcess=0;
  let sourceSortedKeys=null;
  const reductions=[];
  const priorResultExpold=transactionOptions.experienceOld??null;
  let resultExpold=priorResultExpold;

  // Original UseItem: returns on count==0, and skips tail when USE.exp==0.
  if(transaction.performed&&expPerUse!==0){
    performedTail=true;
    previousExp=current;
    resultExpold=current; // original overwrites result.expold ONLY inside tail
    rawExpAward=times(expPerUse,transaction.count,'experience award');
    awardedExp=rawExpAward;
    if(checked(current,awardedExp,'experience cap comparison')>1000)
      awardedExp=checked(1000,-current,'experience cap adjustment');
    map.set(id,checked(current,awardedExp,'selected experience'));
    let total=0;
    for(const amount of map.values())total=checked(total,amount,'experience sum');
    if(experienceLimit>0 && total>experienceLimit){
      overflowEntered=true;
      remainingExcess=checked(total,-experienceLimit,'experience excess');
      const sorted=orderKeys(map,observedPerlSortedKeys);
      sourceSortedKeys=Object.freeze([...sorted]);
      let keyCount=sorted.length-1; // original $#key, includes selected item
      for(const key of sorted){
        if(key===id)continue;
        if(keyCount<=0)bad('Unrepresentable Perl exp reduction denominator');
        const before=map.get(key);
        let reduction=Math.trunc(remainingExcess/keyCount);
        if(before<reduction)reduction=before;
        const after=checked(before,-reduction,'experience reduction');
        if(!after)map.delete(key); else map.set(key,after);
        remainingExcess=checked(remainingExcess,-reduction,'remaining excess');
        reductions.push(Object.freeze({
          itemId:key,before,reduction,after,remainingExcess,keyCount,
        }));
        keyCount--;
      }
    }
  }
  return Object.freeze({
    transaction,exp:freezeExp(map),
    performedTail,selectedItemId:id,previousExp,resultExpold,
    awardedExp,rawExpAward,experienceLimit,overflowEntered,
    remainingExcess,sourceSortedKeys,
    reductions:Object.freeze(reductions),
    scope:'pinned Core B23 transaction plus callback-free B24 experience tail; no callbacks, DSL, CGI or durable world execution',
  });
}
