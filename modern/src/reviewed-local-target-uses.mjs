/** Original target chooser includes the acting shop. This adapter only
 * authorizes that one existing local target, not other shops or guilds.
 * The original callback runs after material/time/money and before EXP.
 */
import {parseDsl} from './parse-dsl.mjs';
import {reviewTargetCommerceCallbacks,projectTargetCommerceCallback} from './original-r4-target-commerce-callbacks.mjs';
const rules=new WeakMap();
const fail=s=>{throw new RangeError('R4 local target USE: '+s)};
export function compileReviewedLocalTargetUses({sources,model,limits,targetAdvertiseUse}){
  const reviewed=reviewTargetCommerceCallbacks(sources);
  if(model?.items?.length!==79||limits?.length!==79||limits[64]?.limit!==1||
    targetAdvertiseUse?.itemId!==62||targetAdvertiseUse?.useId!==1)fail('source inputs');
  const parsed=parseDsl(sources.itemDsl,'custom/inc-item-data.cgi');
  const item=parsed.blocks.find(b=>b.kind==='ITEM'&&b.fields.no?.[0]?.value==='65');
  const uses=parsed.blocks.filter(b=>b.kind==='USE'&&b.ownerItemLine===item.startLine);
  const out=[Object.freeze({...targetAdvertiseUse,localSelfTarget:true,
    inlineCallback:Object.freeze({kind:'local-self-advertise-other'}),
    source:'original-reviewed-local-self-target-advertisement',
    scope:'source local self-target rejection after consumption; no other-shop authorization'})];
  for(const useId of [0,1]){
    const q=reviewed.rules['65:'+useId];
    out.push(Object.freeze({supported:true,itemId:65,useId,localSelfTarget:true,
      source:'original-reviewed-local-self-target-forbidden-book',
      sourceFile:'custom/inc-item-data.cgi',sourceLine:q.sourceLine,
      name:uses[useId].fields.name[0].value,limits,marketCodec:'source-sparse',
      time:q.time,exptime:q.exptime,money:q.money,needPoint:q.needPoint,
      singleUseOnly:true,requiresOwnedItem:true,ownedMaximum:1,
      uses:Object.freeze([Object.freeze({itemId:65,countPerUse:1,probabilityPermille:1000})]),
      creates:Object.freeze([]),
      experienceCallback:Object.freeze({kind:'gain-fixed-exp',points:q.exp}),
      inlineCallback:Object.freeze({kind:useId===0?'local-self-rumor':'local-self-theft'}),
      scope:'source local self-target only; other-shop compensation/theft and manual EVENT remain uncommitted'}));
  }
  for(const rule of out)rules.set(rule,reviewed);
  return Object.freeze(out);
}
export function projectReviewedLocalTargetUse({rule,shop,count,random,world}){
  const reviewed=rules.get(rule);
  if(!reviewed||count!==1||world?.shops?.length!==1||world.shops[0].id!==shop.id||
    shop.id!==1||shop.status!==1||shop.guild!==''||shop.item[rule.itemId-1]!==0)fail('post-consumption local target');
  if(rule.itemId===62)return {rank:shop.rank,exp:{...shop.exp},returned:'沒辦法指定自己的商店',logCalls:[]};
  const result=projectTargetCommerceCallback({reviewed,itemId:65,useId:rule.useId,
    shops:[shop],actorIndex:0,targetIndex:0,town:world.period.town,events:world.period.eventState,
    nowSeconds:world.nowSeconds,randomDraws:rule.useId===0?[Math.round(random()*1000000)]:[]});
  const next=result.shops[0];
  // Do not silently drop any other state changes from this limited adapter.
  const {rank,exp,...unchanged}=next;
  const {rank:oldRank,exp:oldExp,...old}=shop;
  if(JSON.stringify(unchanged)!==JSON.stringify(old)||JSON.stringify(result.town)!==JSON.stringify(world.period.town)||
    JSON.stringify(result.events)!==JSON.stringify(world.period.eventState))fail('unexpected external local target effect');
  return {rank,exp,returned:result.returned,logCalls:result.logs};
}
