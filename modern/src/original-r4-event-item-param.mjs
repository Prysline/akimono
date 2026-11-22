/**
 * R4 source-compiled EVENT PARAM ITEM overlays, PURE and noncommittable.
 * Does not implement EVENT timing, callbacks, hash traversal or WorldState.
 */
import {B53_EVENT_CATALOG_SOURCE} from './original-event-compiled-catalog.mjs';
export const R4_EVENT_PARAM_SOURCE='r4-frozen-compiler-event-item-param-operator';
const bad=m=>{throw new RangeError('R4 original EVENT PARAM: '+m);};
const keys={pop:'popular',price:'price',base:'pricebase',
  harf:'pricehalf',half:'pricehalf',point:'point',plus:'plus'};
export function reviewR4EventItemParams({catalog,compilerSource,model}){
  if(catalog?.source!==B53_EVENT_CATALOG_SOURCE||
    catalog.compiledCount!==17||catalog.compiled?.length!==17||
    model?.items?.length!==79)bad('real 17 EVENT / 79 ITEM source catalog required');
  for(const needle of [
    'foreach my $param (@{$event->{param}})',
    '$key=~s/^pop$/popular/i;',
    '$key=~s/^base$/pricebase/i;',
    '$keyitem=int($keyitem/$val);',
    'GetItemNumber($val[0])',
    '$ope.="=";',
  ])if(typeof compilerSource!=='string'||!compilerSource.includes(needle))
    bad('frozen OutEventData source drift '+needle);
  const names=new Map();
  for(const entry of model.items){
    if(!Number.isSafeInteger(entry.id)||!entry.name||
       names.has(entry.name))bad('non-unique source ITEM name');
    names.set(entry.name,entry.id);
  }
  const rules={};
  for(const e of catalog.compiled){
    const parsed=[];
    for(const raw of e.parameterRows??[]){
      const m=/^(.+?)\s+([a-zA-Z]+)([+\-*/=])(-?\d+(?:\.\d+)?)$/.exec(raw);
      if(!m)bad('unreviewed original PARAM grammar '+raw);
      const itemId=names.get(m[1]),field=keys[m[2].toLowerCase()];
      const op=m[3],value=Number(m[4]);
      if(!itemId||!field||!Number.isFinite(value)||
         op==='/'&&value===0)
        bad('unsupported EVENT PARAM '+raw);
      parsed.push(Object.freeze({itemId,field,op,value,raw}));
    }
    rules[e.code]=Object.freeze(parsed);
  }
  if(Object.keys(rules).length!==17||
     Object.values(rules).filter(v=>v.length>0).length!==9)
    bad('expected nine compiled ITEM PARAM events');
  return Object.freeze({source:R4_EVENT_PARAM_SOURCE,
    rules:Object.freeze(rules),committable:false,
    scope:'original ITEM overlay operator only; no EVENT engine or commit'});
}
export function projectR4EventItemParams({reviewed,eventCode,items}){
  if(reviewed?.source!==R4_EVENT_PARAM_SOURCE||
     reviewed.committable!==false||
     typeof eventCode!=='string'||!Array.isArray(items)||items.length!==79)
    bad('reviewed source and 79 ITEMs required');
  const rules=reviewed.rules?.[eventCode];
  if(!Array.isArray(rules)||!rules.length)bad('no ITEM overlay for EVENT '+eventCode);
  const next=items.map((item,index)=>{
    if(!item||item.itemId!==index+1||Array.isArray(item))
      bad('source ITEM indexing');
    return {...item};
  });
  for(const rule of rules){
    const item=next[rule.itemId-1],old=item[rule.field];
    if(!Number.isFinite(old)||Math.abs(old)>Number.MAX_SAFE_INTEGER)
      bad('source ITEM field missing or unsafe');
    const value=rule.op==='='?rule.value:
      rule.op==='+'?old+rule.value:
      rule.op==='-'?old-rule.value:
      rule.op==='*'?old*rule.value:
      rule.op==='/'?Math.trunc(old/rule.value):NaN;
    if(!Number.isFinite(value)||Math.abs(value)>Number.MAX_SAFE_INTEGER)
      bad('source EVENT numeric overlay overflow');
    item[rule.field]=value;
  }
  return Object.freeze({
    source:reviewed.source,eventCode,
    items:Object.freeze(next.map(item=>Object.freeze(item))),
    affectedItemIds:Object.freeze([...new Set(rules.map(x=>x.itemId))]),
    committable:false,
  });
}
