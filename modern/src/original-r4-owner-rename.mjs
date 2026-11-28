/** A33 source-reviewed rename candidate. This is deliberately NOT an HTTP
 * command or account store. The owning B/D transaction must authenticate
 * the actor, read the source-equivalent name authority under its CAS/lock,
 * publish the row + news atomically, and reconcile/revoke the session.
 */
import {createHash} from 'node:crypto';
const pins={formSource:'2463a62fb4cac2364a7c8c7f8f0823d619396157',submitSource:'8e817c535d4cd17e68d65f0e2f67846a344b5094',nameSource:'ae3b3a862fc78b8775795ed88d5d1911861b3d80',configSource:'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0',readSource:'e7a8add7b0291901e71fe797783b664dff1568a0',writeSource:'203f33b37511e838800a45b84183af98fcf46e4c',logSource:'0f9143c49d1552233f27754e3937e1cdc2740f0a',loginSource:'1e5963c52a4ca82d75922b5a1ca3b3db14fef436'};
const reviews=new WeakSet();
const fail=m=>{throw RangeError('R4 rename candidate: '+m);};
export function reviewOriginalOwnerRename(sources){
  for(const [key,sha] of Object.entries(pins)){
    const s=sources[key];
    if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+key);
  }
  const match=sources.configSource.match(/@NG_SHOP_NAME\s*=\s*qw\(([^)]+)\);/);
  if(!match||!sources.configSource.match(/\$NEW_OTHERTOWN_BLOCK\s*=\s*0;/))fail('unsupported name scope');
  const result=Object.freeze({cost:50000,shopName:Object.freeze({minLength:4,maxLength:20,formSize:30}),ownerName:Object.freeze({minLength:2,maxLength:12,formSize:20}),forbiddenWords:Object.freeze(match[1].trim().split(/\s+/))});
  reviews.add(result);return result;
}
const reject=(reason,sourceMessage,message)=>({ok:false,reason,sourceMessage,message});
/** duplicateName is a synchronous, trusted authority dependency. It must
 * return the source boolean for the requested mode/name, not just compare
 * the current world row. No credentials or user-file bytes are returned.
 * No exception or unavailable authority is interpreted as a free name.
 * No write or session publication happens here.
 */
export function planOriginalOwnerRename({reviewed,shop,kind,name,nowSeconds,duplicateName}){
  if(!reviews.has(reviewed)||!['shopname','owname'].includes(kind)||
    !shop||shop.status!==1||!Number.isSafeInteger(shop.id)||shop.id<1||
    !Number.isSafeInteger(shop.money)||shop.money<0||typeof shop.name!=='string'||typeof shop.shopname!=='string'||
    !Number.isSafeInteger(nowSeconds)||typeof duplicateName!=='function')fail('trusted transaction dependencies required');
  if(typeof name!=='string'||/[\uD800-\uDFFF]/u.test(name))fail('decoded Unicode text required');
  if(shop.money<reviewed.cost)return reject('funds','資金が足りません。','資金不足。');
  const isShop=kind==='shopname',bounds=isShop?reviewed.shopName:reviewed.ownerName;
  if(/[,:;\t\r\n<>&]/.test(name)||reviewed.forbiddenWords.some(word=>name.includes(word)))
    return isShop?reject('characters','店名に使用できない文字が含まれています。','店鋪名稱輸入了無法使用的字元'):reject('characters','名前に使用できない文字が含まれています。','名字包含無法使用的字元。');
  const length=[...name].length;
  if(length>bounds.maxLength)return isShop?reject('too-long','店名は20文字以内です。','店鋪名稱需20字以內。'):reject('too-long','名前は12文字以内です。','名字需在12個字元以內。');
  if(length<bounds.minLength)return isShop?reject('too-short','店名が短すぎます。','店鋪名稱太短。'):reject('too-short','名前が短すぎます。','名字太短了。');
  const exists=duplicateName({kind,name});
  if(typeof exists!=='boolean')fail('authoritative duplicate result required');
  if(exists)return isShop?reject('duplicate','既に存在する店名です。-> '+name,'已經存在同名的店舖。-> '+name):reject('duplicate','既に存在する名前です。-> '+name,'已經存在同樣的名字。-> '+name);
  const key=isShop?'shopname':'name',before=shop[key];
  return {ok:true,shop:{...shop,[key]:name,money:shop.money-reviewed.cost,lastlogin:nowSeconds},
    news:{mode:1,id:0,sourceMessage:before+'が'+name+'に店名を改めました。',message:before+'將店鋪名稱改成'+name+'了。'},
    receipt:{kind,shopId:shop.id,before,after:name,cost:reviewed.cost,timeSpentSeconds:0,message:'將名稱改成'+name+'了。',reentryMessage:'請從首頁重新進入店鋪。'},
    // Semantic target only; original raw query-string interpolation is not copied.
    reentry:isShop?{page:'index.cgi',required:true}:{page:'index.cgi',ownerName:name,required:true}};
}
