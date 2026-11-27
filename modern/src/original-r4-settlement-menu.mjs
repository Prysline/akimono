/** Read-only original desktop menu settlement notice; no clock mutation. */
import {createHash} from 'node:crypto';
import {formatOriginalBalanceDuration} from './original-r4-balance-view.mjs';
const pins={menuSource:'53e8e64f1b3c1d0eeb67104cc3377b50996c4187',configSource:'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0',readSource:'e7a8add7b0291901e71fe797783b664dff1568a0',timeSource:'e164091d4dc6de084bb4770e0b9b4bf6005d9f3f'};
const reviews=new WeakSet();
const fail=m=>{throw new RangeError('original settlement menu: '+m)};
export function reviewOriginalSettlementMenu(sources){
  for(const [key,pin] of Object.entries(pins)){
    const s=sources[key];
    if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==pin)fail('source drift '+key);
  }
  const r=Object.freeze({periodSeconds:36*3600,timezoneSeconds:9*3600,reviseSeconds:6*3600});reviews.add(r);return r;
}
export function describeOriginalSettlementMenu({reviewed,lasttime,nextSettlementAtSeconds}){
  if(!reviews.has(reviewed)||!Number.isSafeInteger(lasttime)||lasttime<1)fail('reviewed source clock');
  const shifted=lasttime+reviewed.timezoneSeconds-reviewed.reviseSeconds;
  const remaining=reviewed.periodSeconds-shifted%reviewed.periodSeconds;
  const next=lasttime+remaining;
  if(!Number.isSafeInteger(next)||next!==nextSettlementAtSeconds)fail('source settlement boundary mismatch');
  const date=new Date((next+reviewed.timezoneSeconds)*1000);
  if(!Number.isFinite(date.getTime()))fail('source settlement timestamp');
  const pad=n=>String(n).padStart(2,'0');
  const dateLabel=pad(date.getUTCMonth()+1)+'/'+pad(date.getUTCDate())+' '+pad(date.getUTCHours())+':'+pad(date.getUTCMinutes());
  // Original menu rounds down to a minute, then adds 59 seconds.
  const displaySeconds=Math.trunc(remaining/60)*60+59;
  const remainingLabel=formatOriginalBalanceDuration(displaySeconds);
  return {source:'r4-frozen-settlement-menu.v1',nextSettlementAtSeconds:next,secondsUntilSettlement:remaining,
    dateLabel,remainingLabel,timezoneSeconds:reviewed.timezoneSeconds,label:'[下次決算 '+dateLabel+' 還有'+remainingLabel+']'};
}

const ownerReviews=new WeakSet();
export function reviewOriginalOwnerClock({reviewed,incMainSource,infoSource}){
  if(!reviews.has(reviewed))fail('reviewed time formatter');
  const sources=[[incMainSource,'5cd020011f6676ec4a8a202ab1bb28b90515ce8d'],[infoSource,'d365aa83da571ce3029589f4c547d0940310e6f3']];
  for(const [s,pin] of sources)
    if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==pin)fail('owner clock source drift');
  const r=Object.freeze({maxStockSeconds:72*3600});ownerReviews.add(r);return r;
}
export function describeOriginalOwnerClock({reviewed,world}){
  if(!ownerReviews.has(reviewed))fail('reviewed owner clock');
  if(!world||world.shops?.length!==1||world.shops[0].id!==1||world.shops[0].status!==1)return null;
  const s=world.shops[0],remaining=world.nowSeconds-s.time;
  if(![world.nowSeconds,s.time,remaining].every(Number.isSafeInteger))fail('source owner clock values');
  const displaySeconds=remaining<0?-remaining:Math.min(remaining,reviewed.maxStockSeconds);
  const label=formatOriginalBalanceDuration(displaySeconds);
  return {source:'r4-frozen-owner-clock.v1',remainingSeconds:remaining,displaySeconds,
    label:remaining<0?'距離可以行動還有 '+label:label};
}
