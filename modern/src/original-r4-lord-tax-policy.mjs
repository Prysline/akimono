import {createHash} from 'node:crypto';

// Isolated command candidate. No session, disk publication or CAS authority.
const reviews=new WeakSet(),source='r4-lord-tax-policy-source-candidate.v1';
const fail=m=>{throw new RangeError('R4 lord tax policy: '+m);};
const exact=(x,k)=>x!==null&&typeof x==='object'&&Object.getPrototypeOf(x)===Object.prototype&&Object.keys(x).sort().join(',')===k.split(',').sort().join(',');
const uint=n=>Number.isSafeInteger(n)&&n>=0;
const text=s=>typeof s==='string'&&s.length>0&&!/[\r\n\t,]/.test(s);
export function reviewLordTaxPolicy(src){
 if(typeof src!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(src)+'\0').update(src).digest('hex')!=='8754dabf130a521aa243fc0568910d5f52523362')fail('source drift');
 const reviewed=Object.freeze({source,committable:false});reviews.add(reviewed);return reviewed;
}
export function projectLordTaxPolicy({reviewed,fixture,command}){
 if(!reviews.has(reviewed))fail('source review required');
 if(!exact(fixture,'revision,leader,actorId,taxRate,shops,eventState')||
  !uint(fixture.revision)||!uint(fixture.leader)||!uint(fixture.actorId)||fixture.actorId===0||
  !uint(fixture.taxRate)||fixture.taxRate>40||
  !(exact(fixture.eventState,'')||exact(fixture.eventState,'rebel')&&uint(fixture.eventState.rebel)&&fixture.eventState.rebel>0)||
  !Array.isArray(fixture.shops)||fixture.shops.length<1||fixture.shops.length>2||
  new Set(fixture.shops.map(s=>s?.id)).size!==fixture.shops.length||
  fixture.shops.some(s=>!(exact(s,'id,name,shopname')||exact(s,'id,name,shopname,taxmode'))||
    !uint(s.id)||s.id===0||!text(s.name)||!text(s.shopname)||
    ![undefined,'',0,1,2].includes(s.taxmode)))fail('explicit source fixture');
 const actor=fixture.shops.find(s=>s.id===fixture.actorId);
 if(!actor||fixture.leader!==actor.id||command?.actorId!==actor.id||
  command.expectedRevision!==fixture.revision)fail('current lord at exact revision required');
 const next=structuredClone(fixture),logs=[];
 if(command.kind==='lord-tax-reset'){
  if(!exact(command,'kind,actorId,expectedRevision'))fail('exact reset command');
  for(const s of next.shops)delete s.taxmode;
  logs.push([2,0,'領主'+actor.name+'は倍税や免税をすべて取りやめました。']);
 }else{
  if(!exact(command,'kind,actorId,expectedRevision,targetId,mode')||command.kind!=='lord-tax-side'||
    !uint(command.targetId)||!['free','double','normal'].includes(command.mode))fail('exact target/mode command');
  const target=next.shops.find(s=>s.id===command.targetId);
  if(!target)fail('target shop required');
  // The raw handler passes format arguments to PushLog without calling l().
  // Preserve raw call shape; this is not a rendered log or disk row.
  const old=target.taxmode??0,template=command.mode==='free'?
   old!==1?'領主%1は%2の税を免除しました。':null:
   command.mode==='double'?old!==2?'領主%1は%2の税率を倍にしました。':null:
   old===1?'領主%1は%2の免税を取りやめました。':old===2?'領主%1は%2の倍税を取りやめました。':null;
  if(template)logs.push([2,0,template,actor.name,target.shopname]);
  if(command.mode==='normal')delete target.taxmode;else target.taxmode=command.mode==='free'?1:2;
 }
 return {source,committable:false,fixture:next,logs};
}
