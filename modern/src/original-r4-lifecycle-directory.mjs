/** Source IP directory and registration-gate evidence only, not modern authentication. */
import {createHash} from 'node:crypto';
function project({activeOwnerNames,records,actor,kind,sourceIP,blockIP,blockEnabled,otherTownBlockEnabled=false,otherTownRecords=[]}){
 const fail=m=>{throw new RangeError('R4 lifecycle directory: '+m)},str=s=>typeof s==='string'&&s.length>0&&!/[\t\r\n\0]/.test(s),id=n=>Number.isSafeInteger(n)&&n>0;
 if(!Array.isArray(activeOwnerNames)||activeOwnerNames.some(s=>!str(s))||new Set(activeOwnerNames).size!==activeOwnerNames.length||!str(sourceIP)||typeof blockIP!=='string'||typeof blockEnabled!=='boolean'||typeof otherTownBlockEnabled!=='boolean'||!Array.isArray(records)||!Array.isArray(otherTownRecords))fail('trusted source directory required');
 const read=rows=>rows.map(r=>{if(!r||Object.keys(r).length!==5||!str(r.ownerName)||!str(r.shopName)||!id(r.shopId)||!str(r.ip)||typeof r.userAgent!=='string'||/[\t\r\n\0]/.test(r.userAgent))fail('unreviewed directory row');return {...r};});
 const current=read(records),other=read(otherTownRecords);
 if(kind==='registration'){
   const reason=current.some(r=>r.ip===sourceIP)?'local-ip-record':otherTownBlockEnabled&&other.some(r=>r.ip===sourceIP)?'other-town-ip-record':blockEnabled&&blockIP===sourceIP?'block-ip':null;
   return {kind,allowedBySourceIpGate:reason===null,reason,committable:false,worldStateWritten:false};
 }
 if(kind==='login-directory'){
   if(!actor||!activeOwnerNames.includes(actor.ownerName)||!str(actor.shopName)||!id(actor.shopId)||typeof actor.userAgent!=='string'||/[\t\r\n\0]/.test(actor.userAgent))fail('current source owner required');
   const kept=current.filter(r=>activeOwnerNames.includes(r.ownerName)&&r.ownerName!==actor.ownerName);
   const overlap=kept.some(r=>r.ip===sourceIP&&r.userAgent===actor.userAgent);
   kept.push({ownerName:actor.ownerName,shopName:actor.shopName,shopId:actor.shopId,ip:sourceIP,userAgent:actor.userAgent});
   return {kind,records:kept,sourceOverlap:overlap,committable:false,worldStateWritten:false};
 }
 fail('unknown directory operation');
}
const required={newShop:'9f0a590a6f1d4e93d2534056a0dc96c4d5c80ba7',login:'1e5963c52a4ca82d75922b5a1ca3b3db14fef436',ip:'2624e31edd1966c9535b9dd43dbce003d8ffa9a7',membership:'8e817c535d4cd17e68d65f0e2f67846a344b5094'};
const reviews=new WeakSet();
export function reviewLifecycleDirectorySources(sources){for(const [key,sha] of Object.entries(required)){const s=sources?.[key];if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)throw new RangeError('source drift: '+key);}const token=Object.freeze({committable:false});reviews.add(token);return token;}
export function projectLifecycleDirectory({review,...input}){if(!reviews.has(review))throw new RangeError('reviewed source required');return project(input);}
