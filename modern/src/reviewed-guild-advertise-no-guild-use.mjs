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
