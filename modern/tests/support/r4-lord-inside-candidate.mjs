import {createHash} from 'node:crypto';

// Test-only candidate: not a runtime command, save format or authorization source.
const source='r4-frozen-lord-inside-candidate.v1';
const pin='8754dabf130a521aa243fc0568910d5f52523362';
const reviews=new WeakSet();
const fail=message=>{throw new RangeError('R4 lord inside: '+message);};
const exact=(o,keys)=>o!==null&&typeof o==='object'&&Object.getPrototypeOf(o)===Object.prototype&&
  Object.keys(o).sort().join(',')===keys.split(',').sort().join(',');
const uint=n=>Number.isSafeInteger(n)&&n>=0;
const townKeys='leader,money,in,out,develop,devem,safety,safem,army,robina,robinb';
export function reviewLordInside(lordSource){
  if(typeof lordSource!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(lordSource)+'\0').update(lordSource).digest('hex')!==pin)
    fail('frozen lord source drift');
  const review=Object.freeze({source,committable:false});
  reviews.add(review);return review;
}
export function projectLordInside({reviewed,fixture,command}){
  if(!reviews.has(reviewed))fail('source review required');
  if(!exact(fixture,'revision,taxRate,town,actor,eventState')||!uint(fixture.revision)||
     !uint(fixture.taxRate)||fixture.taxRate>40||!exact(fixture.town,townKeys)||
     Object.entries(fixture.town).some(([k,v])=>!Number.isSafeInteger(v)||(!['money','out'].includes(k)&&v<0))||
     !exact(fixture.actor,'id,name,money,time')||!uint(fixture.actor.id)||fixture.actor.id===0||
     typeof fixture.actor.name!=='string'||!fixture.actor.name||/[\r\n\t]/.test(fixture.actor.name)||
     !Number.isSafeInteger(fixture.actor.money)||!uint(fixture.actor.time)||
     !(exact(fixture.eventState,'')||(exact(fixture.eventState,'rebel')&&uint(fixture.eventState.rebel)&&fixture.eventState.rebel>0)))
    fail('explicit source fixture required');
  if(!exact(command,'kind,expectedRevision,actorId,taxrate,devem,safem')||
     command.kind!=='lord-inside'||command.expectedRevision!==fixture.revision||
     command.actorId!==fixture.actor.id||fixture.actor.id!==fixture.town.leader)
    fail('fixture actor must be current lord at exact revision');
  const values={};
  for(const [key,cap] of [['taxrate',40],['devem',10000000],['safem',10000000]]){
    const value=command[key];
    // Explicit, nonempty ASCII form input only. The raw Perl handler also
    // coerces missing/empty values to zero; that is deliberately not enabled.
    if(typeof value!=='string'||(!value.length||/[^0-9]/.test(value))||!uint(Number(value))||Number(value)>cap)
      fail('invalid '+key);
    values[key]=Number(value);
  }
  const next=structuredClone(fixture),logs=[];
  if(next.taxRate!==values.taxrate){
    const verb=next.taxRate>values.taxrate?'引き下げました':'引き上げました';
    logs.push([2,0,'領主'+next.actor.name+'は街の税率を'+values.taxrate+'%に'+verb+'。']);
  }
  next.taxRate=values.taxrate;
  next.town.devem=values.devem;
  next.town.safem=values.safem;
  return {source,committable:false,fixture:next,receipt:{source,committable:false,logs}};
}
