/** Original slime.cgi request dispatcher; source-only, no auth/lock/publication authority. */
import {createHash} from 'node:crypto';
const pins={wrapper:'2eccc7ccc5bc493596b51542509c0244795abdd0',dragon:'76bb00f247733630cbcc374a82f693638f653b71',config:'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0'};
const reviewed=new WeakSet();
const fail=m=>{throw new RangeError('R4 dragon dispatch: '+m)};
export function reviewDragonDispatchSources(sources){
  for(const [k,sha] of Object.entries(pins)){
    const s=sources?.[k];if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k);
  }
  const token=Object.freeze({committable:false});reviewed.add(token);return token;
}
export function projectDragonDispatch({review,now,drTime}){
  const sec=n=>Number.isSafeInteger(n)&&n>=0&&n<=Number.MAX_SAFE_INTEGER-86400-32400;
  if(!reviewed.has(review)||!sec(now)||!(drTime===null||Array.isArray(drTime)&&drTime.length===3&&drTime.every(sec)))fail('reviewed clock required');
  const trace=['inc-dragon'];
  let clock=drTime===null?null:[...drTime],dispatch='none',raceCode=null;
  if(clock===null){
    dispatch='initialize';clock=[3,23,22].map(h=>now+86400-(((now+32400-h*3600)%86400+86400)%86400));
    trace.push('common-lock','dr-last-stage','common-commit','common-unlock');
  }else if(now>clock[0]){dispatch='training';trace.push('common-lock');}
  else if(now>clock[1]||now>clock[2]){dispatch='race';raceCode=now>clock[2]?1:0;trace.push('common-lock');}
  trace.push('street-read','guest-allowed-auth');
  if(dispatch==='training')trace.push('inc-dr-edit1');
  if(dispatch==='race')trace.push('inc-dr-edit2');
  trace.push('view','render');
  return {dispatch,raceCode,clock,trace,committable:false,worldStateWritten:false};
}
