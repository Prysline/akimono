/** B source wrapper only; no close/archive duplication or durable publication. */
import {createHash} from 'node:crypto';
function project({snapshot,actorRef,expectedRevision,now,command,subdataNames}){
 const fail=m=>{throw new RangeError('R4 lifecycle: '+m)},id=n=>Number.isSafeInteger(n)&&n>0,rec=x=>x!==null&&typeof x==='object'&&Object.getPrototypeOf(x)===Object.prototype;
 if(!rec(snapshot)||!Number.isSafeInteger(snapshot.revision)||snapshot.revision!==expectedRevision||typeof snapshot.worldId!=='string'||!snapshot.worldId||typeof snapshot.street!=='string'||!snapshot.street||!Array.isArray(snapshot.shops)||!rec(actorRef)||actorRef.worldId!==snapshot.worldId||actorRef.street!==snapshot.street||!id(actorRef.shopId)||!id(now)||!rec(command)||Object.keys(command).length!==2||!Object.hasOwn(command,'kind')||!Object.hasOwn(command,'confirmation')||!Array.isArray(subdataNames)||new Set(subdataNames).size!==subdataNames.length||subdataNames.some(s=>typeof s!=='string'||!s||s==='.'||s==='..'||/[/\\\0\r\n]/.test(s)))fail('authoritative snapshot and exact command required');
 const ids=new Set();for(const s of snapshot.shops){if(!rec(s)||!id(s.id)||ids.has(s.id))fail('ambiguous source identity');ids.add(s.id);}
 const shop=snapshot.shops.find(s=>s.id===actorRef.shopId);
 if(!shop||shop.status!==1||shop.name!==actorRef.ownerName||typeof shop.name!=='string'||!shop.name||typeof shop.shopname!=='string'||!shop.shopname||!id(shop.foundation)||shop.foundation>now)fail('current active owner required');
 const deletion=subdataNames.filter(n=>new RegExp('^'+shop.id+'-.+\\.cgi$').test(n));
 const common={sourceRevision:expectedRevision,actor:{worldId:snapshot.worldId,street:snapshot.street,shopId:shop.id},subdataDeletionSelection:deletion,externalEffects:{directCommonFileWrites:[],cascadeAuthorized:false},committable:false,worldStateWritten:false};
 if(command.kind==='restart-shop'){
   if(command.confirmation!=='restart'||now-shop.foundation<=10800)fail('normal restart confirmation or age');
   const item=Array(79).fill(null);item[62]=1;item[78]=5;
   return {...common,shopTransition:{kind:'restart',retainIdentityKeys:['id','name','shopname','pass','icon'],clearOtherFields:true,preFuncNew:{status:1,lastlogin:now,money:100000,rank:5010,foundation:now,showcasecount:1,time:null},compiledFuncNew:{money:100000,time:now-43200,item},newPointAfterRead:5010},sourceLogCalls:[[1,0,shop.shopname+'が気持ちを新たに出直しました。']],sessionIntent:{clearCookie:false,deleteSessionFile:false},blockIpEffect:null,publicationIntent:['source-auth','reset-shop-fields','compiled-FUNCNEW','delete-selected-subdata','PushLog','RenewLog','DataWrite','DataCommitOrAbort','UnLock']};
 }
 if(command.kind==='close-shop'){
   if(command.confirmation!=='closeshop'||typeof shop.remoteaddr!=='string')fail('normal close confirmation or source remote address');
   return {...common,shopTransition:{kind:'close',closeShopCall:{id:shop.id,reason:'自主閉店'},delegateExistingCloseArchive:true},sourceLogCalls:[[1,0,shop.shopname+'が閉店しました。']],sessionIntent:{clearCookie:true,clearUserPassFields:true,deleteSessionFile:false,activeIdentityRemovedOnReload:true},blockIpEffect:{value:shop.remoteaddr},publicationIntent:['source-auth','SetCookieSession-empty','clear-userpass-fields','CloseShop','PushLog','set-DTblockip','RenewLog','DataWrite','DataCommitOrAbort','UnLock']};
 }
 fail('unreviewed lifecycle command');
}
const required=Object.freeze({membership:'8e817c535d4cd17e68d65f0e2f67846a344b5094',form:'2463a62fb4cac2364a7c8c7f8f0823d619396157',compiler:'1da8cce1e76ad6159325a37faec68efaa82c7f69',dsl:'7a18185e98b32aee82ca1ce30d6f3c395157dbcb',core:'e7a8add7b0291901e71fe797783b664dff1568a0',writer:'203f33b37511e838800a45b84183af98fcf46e4c',subdata:'46fe3b13e68ee83997aa919125ab210372af2822'});
const reviewed=new WeakSet();
export function reviewShopLifecycleSources(sources){for(const [k,sha] of Object.entries(required)){const s=sources?.[k];if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)throw new RangeError('lifecycle source drift: '+k);}const token=Object.freeze({committable:false});reviewed.add(token);return token;}
export function projectShopLifecycleSource({review,...input}){if(!reviewed.has(review))throw new RangeError('reviewed lifecycle source required');return project(input);}
