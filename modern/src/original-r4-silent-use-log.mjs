/** Original normal USE actions which do not emit PushLog/WriteLog.
 * Scope: frozen Standard Street declarations and already reviewed USE rules.
 * A missing receipt log property by itself is not proof of silence.
 */
import {createHash} from 'node:crypto';
import {parseDsl} from './parse-dsl.mjs';
const pins={itemDsl:'7a18185e98b32aee82ca1ce30d6f3c395157dbcb',useSource:'1bf4537cc41e344c144d840d43175c4c232765bb',helperSource:'bb0244748088be0c5f1d24de7f9f7f05225278cb',wholeSource:'778badaf157326bcfd1f8fa1e310d94f94995eb3',calcSource:'586354a9a300e26d0e12a4efa512fa25760e3197'};
const reviews=new WeakSet();
const fail=m=>{throw new RangeError('R4 silent original USE log: '+m)};
const groups=new Map([[10,8],[37,4],[39,19],[15,5],[16,2],[17,4],[20,4],[21,4],[22,4],[23,4],[66,4],[35,1],[36,1],[26,3],[27,1],[28,1],[29,1],[9,3],[12,4],[14,1],[79,5]]);
const field=(b,k)=>b.fields[k]?.[0]?.value;
export function reviewOriginalSilentUseLogs(sources){
  for(const [k,sha] of Object.entries(pins)){
    const s=sources[k];if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k);
  }
  // Frozen plug/use.cgi::UseItem, CheckWholeStore, UseTime and item::UseItem
  // only change accounting/result fields. FUNCITEM lostbook calls the latter;
  // #14 FUNCB only doubles result create counts and sets resultok. None logs.
  const {blocks,issues}=parseDsl(sources.itemDsl,'custom/inc-item-data.cgi');
  if(issues.length)fail('DSL parse');
  const rules={};
  for(const [id,count] of groups){
    const item=blocks.find(b=>b.kind==='ITEM'&&Number(field(b,'no'))===id);
    const uses=blocks.filter(b=>b.kind==='USE'&&b.ownerItemLine===item?.startLine);
    if(!item||uses.length!==count)fail('source USE group '+id);
    for(const [useId,b] of uses.entries()){
      if(id===26&&useId===0)continue; // drink-milk emits actual callback logs
      const after=field(b,'func')??null,before=field(b,'funcb')??null;
      if(![null,'lostbook'].includes(after)||before!==(id===14?'_local_':null)||
         Object.keys(b.fields).some(k=>k.startsWith('func')&&!['func','funcb'].includes(k))||
         /\b(?:WriteLog|PushLog)\s*\(/.test(b.raw))fail('unreviewed callback '+id+'/'+useId);
      if([9,12,14].includes(id)&&after!=='lostbook')fail('source map callback');
      if(id===79&&after!==null)fail('source gift callback');
      const source=id===79?(useId===0?['reviewed-original-gift-use']:['original-pure-gift-dsl']):
        id===14?['b62-original-real-sword-map-market-and-bounded-use','b63-original-sword-map-all-five-original-first-use-outcomes']:
        [9,12].includes(id)?['original-gather-lostbook-use-dsl']:['original-declarative-use-dsl'];
      rules[id+':'+useId]=Object.freeze({sources:Object.freeze(source),after:after===null?null:'lostbook',before:before===null?null:'double-create'});
    }
  }
  if(Object.keys(rules).length!==82)fail('reviewed silence count');
  const reviewed=Object.freeze({source:'r4-frozen-silent-use-log.v1',rules:Object.freeze(rules)});reviews.add(reviewed);return reviewed;
}
export function isOriginalSilentUse({reviewed,rule,command,receipt}){
  if(!reviews.has(reviewed)||command?.kind!=='use-item'||command.shopId!==1)return false;
  const expected=reviewed.rules[command.itemId+':'+command.useId];
  if(!expected)return false;
  if(rule?.supported!==true||rule.itemId!==command.itemId||rule.useId!==command.useId||!expected.sources.includes(rule.source)||
     rule.inlineCallback||(rule.beforeCallback?.kind??null)!==expected.before||(rule.afterCallback?.kind??null)!==expected.after||
     receipt?.action!=='use-item'||receipt.shopId!==command.shopId||receipt.itemId!==command.itemId||receipt.useId!==command.useId||receipt.source!==rule.source||
     !Array.isArray(receipt.callbackOrder)||receipt.callbackOrder.includes('source-inline-callback')||
     receipt.callbackOrder.includes('before-use')!==(expected.before!==null)||receipt.callbackOrder.includes('after-use')!==(expected.after!==null)||
     Object.hasOwn(receipt,'originalInlineLogCalls'))fail('source silence identity');
  return true;
}
