/** #62/2 source branch when no guild exists. The original UseItem
 * consumes the material/time BEFORE invoking the callback. This reviewer
 * does not authorize a guild membership or other shop's rank mutation. */
import {createHash} from 'node:crypto';
import {parseDsl} from './parse-dsl.mjs';
const fail=s=>{throw new RangeError('R4 #62/2 no-guild source: '+s)};
const one=(b,k)=>b?.fields[k]?.[0]?.value;
const rules=new WeakSet();
export function compileReviewedNoGuildAdvertiseUse({itemDsl,model,limits}){
  if(typeof itemDsl!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(itemDsl)+'\0').update(itemDsl).digest('hex')!=='7a18185e98b32aee82ca1ce30d6f3c395157dbcb'||model?.items?.length!==79||limits?.length!==79||limits[61]?.limit!==1)fail('frozen sources');
  const parsed=parseDsl(itemDsl,'custom/inc-item-data.cgi');
  const item=parsed.blocks.find(b=>b.kind==='ITEM'&&one(b,'no')==='62');
  const uses=parsed.blocks.filter(b=>b.kind==='USE'&&b.ownerItemLine===item?.startLine);
  const b=uses[2],def=parsed.blocks.find(b=>b.kind==='DEFINE');
  if(parsed.issues.length||uses.length!==3||one(b,'time')!=='16h'||one(b,'exp')!=='0%'||one(b,'arg')!=='nocount'||one(b,'use')?.replace(/\s+/g,' ')!=='1 廣告包'||one(b,'func')!=='_local_'||one(def,'itemusetimerate')!=='0.5'||!b.raw.includes("return '沒有加入商會無法進行商會廣告' if !$DT->{guild};"))fail('frozen no-guild branch');
  const rule=Object.freeze({supported:true,itemId:62,useId:2,source:'original-reviewed-guild-advertisement-no-guild-only',sourceFile:b.file,sourceLine:b.startLine,name:one(b,'name'),limits,marketCodec:'source-sparse',time:28800,exptime:28800,money:0,singleUseOnly:true,requiresOwnedItem:true,ownedMaximum:1,uses:Object.freeze([Object.freeze({itemId:62,countPerUse:1,probabilityPermille:1000})]),creates:Object.freeze([]),inlineCallback:Object.freeze({kind:'advertise-no-guild'}),scope:'source no-guild result only; item and time consumed before callback; guild-authorized multi-shop rank effects remain external'});
  rules.add(rule);return rule;
}
export function projectOriginalNoGuildAdvertisement({rule,shop,count}){
  if(!rules.has(rule)||count!==1||shop?.status!==1||![undefined,null,'',0,false].includes(shop.guild)||shop.item?.[61]!==0)fail('only original post-consumption no-guild branch');
  return Object.freeze({returned:'沒有加入商會無法進行商會廣告',logCalls:Object.freeze([])});
}


// Source callback after the ordinary UseItem material/time stage.
// D must resolve the actor, exact current street order and guild definition
// from the same authoritative world. No direct storage or API authority.
const guildRules=new WeakSet();
export function compileReviewedGuildAdvertiseUse(input){
  const base=compileReviewedNoGuildAdvertiseUse(input);
  const rule=Object.freeze({...base,source:'original-reviewed-guild-advertisement',inlineCallback:Object.freeze({kind:'advertise-guild'}),scope:'normal same-street guild callback after UseItem consumption; candidate only'});
  guildRules.add(rule);return rule;
}
export function projectOriginalGuildAdvertisement({rule,shops,actorId,definitions,count}){
  const failGuild=s=>{throw new RangeError('R4 #62/2 guild advertisement: '+s)};
  if(!guildRules.has(rule)||count!==1||!Array.isArray(shops)||!definitions||Object.getPrototypeOf(definitions)!==Object.prototype||
     shops.some(s=>!s||s.status!==1||!Number.isSafeInteger(s.id)||s.id<1||typeof s.guild!=='string'||typeof s.shopname!=='string'||!Number.isSafeInteger(s.rank)||s.rank<0||s.rank>10000)||
     new Set(shops.map(s=>s.id)).size!==shops.length)failGuild('reviewed current street rows required');
  const actor=shops.find(s=>s.id===actorId);
  if(!actor||actor.item?.[61]!==0)failGuild('post-consumption actor required');
  const after=structuredClone(shops),logs=[];
  if(!actor.guild)return {shops:after,returned:'沒有加入商會無法進行商會廣告',logCalls:logs,committable:false};
  const name=Object.hasOwn(definitions,actor.guild)?definitions[actor.guild]?.name:null;
  if(typeof name!=='string'||!name)failGuild('authoritative guild definition required');
  logs.push([3,0,actor.shopname+'的商會「'+name+'」進行了廣告宣傳']);
  for(const shop of after){
    if(shop.guild!==actor.guild)continue;
    const up=Math.trunc(500*(2-shop.rank/5000));
    shop.rank=Math.min(10000,shop.rank+up);
    logs.push([0,actor.id,'進行商會廣告後，'+shop.shopname+'的人氣上升了'+Math.trunc(up/100)+'%']);
  }
  return {shops:after,returned:'進行商會廣告',logCalls:logs,committable:false};
}
