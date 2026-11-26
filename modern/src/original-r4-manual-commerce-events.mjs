/** Four source #65/2 manual ITEM overlays. START -1 excludes them from
 * automatic %EVENT, but OutEventData still emits their event/<code> files.
 * Only the exact negative POINT assignments are admitted; no arbitrary
 * negative ITEM metadata, automatic start, or external target authority.
 */
import {createHash} from 'node:crypto';
import {reviewOriginalCompiledEventCatalog} from './original-event-compiled-catalog.mjs';
import {loadStandardStreetModel} from './standard-street-model.mjs';
export const R4_MANUAL_COMMERCE_EVENT_CODES=Object.freeze(['kill-ken','kill-yoroi','kill-tate','kill-tue']);
const reviews=new WeakSet(),saleRules=new WeakSet();
const fail=s=>{throw new RangeError('R4 manual commerce EVENT: '+s)};
const pins={itemDsl:'7a18185e98b32aee82ca1ce30d6f3c395157dbcb',rebelDsl:'923634e58a05beca9ab004515fc7669d53a1ba3a',compilerSource:'1da8cce1e76ad6159325a37faec68efaa82c7f69',turnSource:'b8a4980275f475a952846a8d6072fad45f8dff50',readSource:'e7a8add7b0291901e71fe797783b664dff1568a0'};
export const isReviewedManualCommerceEvents=r=>reviews.has(r);
export const isReviewedManualSaleRule=r=>saleRules.has(r);
export function reviewManualCommerceEvents(sources){
  for(const [k,sha] of Object.entries(pins)){
    const s=sources[k];
    if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\\0').update(s).digest('hex')!==sha)fail('frozen source drift '+k);
  }
  const catalog=reviewOriginalCompiledEventCatalog(sources);
  const model=loadStandardStreetModel(sources.itemDsl,sources.rebelDsl);
  if(!sources.compilerSource.includes('open(EOUTSUB,">:encoding(utf8)","$ITEM_DIR/event/$event->{code}$FILE_EXT");')||
    !sources.turnSource.includes('my $E=$EVENT{$key};')||
    !sources.turnSource.includes('PushLog(2,0,$E->{endmsg}) if $E->{endmsg};')||
    !sources.readSource.includes('foreach(keys(%DTevent)){require(GetPath($ITEM_DIR,"event",$_));}'))fail('manual event compiler/END source drift');
  const rules={};
  for(const code of R4_MANUAL_COMMERCE_EVENT_CODES){
    const event=catalog.declared.find(e=>e.code===code);
    if(!event||event.compiled||event.startProba!==-1||event.baseTimeSeconds!==0||event.plusTimeSeconds!==0||
       Object.values(event.callbacks).some(v=>v!==null))fail('manual event catalog '+code);
    const rows=event.parameterRows.map(raw=>{
      const m=/^(.+?)\\s+point=(-?\\d+)$/.exec(raw);
      const item=m&&model.items.find(i=>i.name===m[1]);
      if(!item)fail('manual source POINT row '+raw);
      return Object.freeze({itemId:item.id,point:Number(m[2])});
    });
    const wanted=code==='kill-yoroi'||code==='kill-tate'?[0,0,-100,-200,-300,-400]:[0,-100,-200,-300,-400];
    if(rows.map(r=>r.point).join(',')!==wanted.join(',')||new Set(rows.map(r=>r.itemId)).size!==rows.length)fail('manual point source drift '+code);
    rules[code]=Object.freeze(rows);
  }
  const review=Object.freeze({source:'r4-frozen-manual-commerce-event-overlay.v1',rules:Object.freeze(rules),committable:false});
  reviews.add(review);return review;
}
export function projectManualCommerceEventItems({reviewed,code,items}){
  if(!reviews.has(reviewed)||!Object.hasOwn(reviewed.rules,code)||!Array.isArray(items)||items.length!==79||
    items.some((x,i)=>x?.itemId!==i+1||!Number.isSafeInteger(x.point)))fail('reviewed manual ITEM overlay');
  const next=items.map(x=>({...x}));
  for(const row of reviewed.rules[code])next[row.itemId-1].point=row.point;
  return Object.freeze(next.map(Object.freeze));
}
export function reviewedManualSaleRule({reviewed,rule,activeOrder}){
  if(!reviews.has(reviewed)||!Array.isArray(activeOrder)||!Number.isSafeInteger(rule?.point)||rule.point>=0||
    !activeOrder.some(code=>reviewed.rules[code]?.some(r=>r.itemId===rule.itemId&&r.point===rule.point)))fail('negative point must come from an active manual source EVENT');
  const result=Object.freeze({...rule});saleRules.add(result);return result;
}
