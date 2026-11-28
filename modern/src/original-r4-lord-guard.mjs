/** Source projection only. Independent lord controller owns authority, view gates, CAS and disk. */
import {createHash} from 'node:crypto';
const pins=Object.freeze({
  view:'b96734f54267645c080c86d32aca5e778023b50b',
  command:'8754dabf130a521aa243fc0568910d5f52523362',
  calc:'586354a9a300e26d0e12a4efa512fa25760e3197',
  config:'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0',
});
const reviews=new WeakSet();
const fail=m=>{throw new RangeError('R4 lord guard source: '+m);};
const plain=x=>x!==null&&typeof x==='object'&&Object.getPrototypeOf(x)===Object.prototype;
const exact=(x,keys)=>plain(x)&&Object.keys(x).sort().join(',')===keys.split(',').sort().join(',');
const integer=(n,min=0)=>Number.isSafeInteger(n)&&n>=min;
const signed=n=>Number.isSafeInteger(n);
export function reviewLordGuard(sources){
  if(!exact(sources,Object.keys(pins).join(',')))fail('exact source set');
  for(const [k,pin] of Object.entries(pins)){
    const s=sources[k];
    if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==pin)
      fail('source drift '+k);
  }
  const r=Object.freeze({source:'r4-lord-guard-source-candidate.v1',committable:false});reviews.add(r);return r;
}
function context(reviewed,f){
  if(!reviews.has(reviewed))fail('source review required');
  if(!plain(f)||!integer(f.revision)||!integer(f.lasttime,1)||!integer(f.actorId,1)||!integer(f.taxRate)||f.taxRate>40||
     !plain(f.town)||!plain(f.eventState)||Object.values(f.eventState).some(v=>!integer(v))||
     !Array.isArray(f.shops)||!f.shops.length)fail('explicit source fixture required');
  const {town:t,shops}=f;
  if(!integer(t.leader)||!signed(t.money)||!integer(t.army)||!integer(t.robina)||!integer(t.safety)||
    !integer(t.devem)||!integer(t.safem))fail('town fields');
  if(shops.some(s=>!plain(s)||!integer(s.id,1)||typeof s.name!=='string'||typeof s.shopname!=='string'||!integer(s.rank)||!integer(s.taxtoday))||
     new Set(shops.map(s=>s.id)).size!==shops.length)fail('shop fields');
  const actor=shops.find(s=>s.id===f.actorId);
  if(!actor||t.leader!==actor.id)fail('current lord required');
  return {actor,t,rebellion:Boolean(f.eventState.rebel)};
}
function options(max,label){
  let old=0;const result=[];
  for(const n of [1000,5000,10000,20000,max].sort((a,b)=>a-b)){
    if(max<n||n===old)break;
    result.push({count:n,label:n===max?String(n)+label:String(n)});old=n;
  }
  return result;
}
export function describeLordGuard({reviewed,fixture}){
  const {t,rebellion}=context(reviewed,fixture);
  // Frozen _config.cgi: 36-hour period, JST +9h, date shift +6h.
  const period=36*3600,elapsed=Math.max(1,(fixture.lasttime+3*3600)%period);
  const totalTax=fixture.shops.reduce((n,s)=>n+s.taxtoday,0);
  if(!integer(totalTax)||!integer(totalTax*period)||!integer(fixture.lasttime+3*3600))fail('quote overflow');
  const taxForecast=Math.trunc(totalTax*period/elapsed/10000)*10000;
  const army=t.army+t.robina,unitUpkeep=200-Math.trunc(t.safety/100),upkeep=t.army*unitUpkeep;
  if(!integer(taxForecast)||!integer(army)||!signed(unitUpkeep)||!signed(upkeep))fail('quote overflow');
  const canManage=t.money>0&&!rebellion;
  const exposeReason=rebellion?'rebellion':t.army<2000?'army':t.money<1000000?'funds':null;
  return {source:reviewed.source,committable:false,taxForecast,money:t.money,taxRate:fixture.taxRate,
    devem:t.devem,safem:t.safem,army,sourceArmyHeadline:'',regularArmy:t.army,volunteerArmy:t.robina,
    unitUpkeep,upkeep,canHire:canManage,canFire:canManage,
    hireOptions:canManage?options(Math.trunc(t.money/1200),'(資金最大)'):[],
    fireOptions:canManage?options(t.army,'(兵士最大)'):[],
    canExpose:exposeReason===null,exposeReason,targets:fixture.shops.map(s=>s.id)};
}
// Raw handler arithmetic, not the original view gate. A real endpoint must
// separately require the UI eligibility, provenance and exact revision/CAS.
// Deliberately limited to safe integer quantity inputs, not Perl's full coercion.
export function projectLordGuard({reviewed,fixture,command}){
  const {actor,t,rebellion}=context(reviewed,fixture);
  if(!plain(command)||command.expectedRevision!==fixture.revision||command.actorId!==actor.id)fail('exact revision and current lord');
  const {kind}=command;
  const military=kind==='outside'||kind==='outdel';
  if(military?(!exact(command,'kind,expectedRevision,actorId,cnt1,cnt2')||!signed(command.cnt1)||!signed(command.cnt2)):
    (kind!=='expose'||!exact(command,'kind,expectedRevision,actorId,targetId')||!integer(command.targetId,1)))fail('exact handler fields');
  const next=structuredClone(fixture),logs=[];
  const refusal=reason=>({ok:0,reason,fixture:next,logs,committable:false});
  if(rebellion)return refusal('rebellion');
  if(military){
    const hiring=kind==='outside',max=hiring?Math.trunc(t.money/1200):t.army;
    // Real CheckCount: nonzero cnt2 wins; clamp minimum first, then maximum.
    const count=Math.trunc(Math.min(Math.max(command.cnt2||command.cnt1,0),max));
    if(!count)return refusal('quantity');
    if(hiring){next.town.money-=count*1200;next.town.army+=count;}
    else next.town.army-=count;
    if(!signed(next.town.money)||!signed(next.town.army)||!signed(count*1200))fail('arithmetic overflow');
    return {ok:1,fixture:next,logs,committable:false};
  }
  const target=next.shops.find(s=>s.id===command.targetId);
  if(!target)return refusal('target');
  if(t.money<1000000)return refusal('funds');
  if(target.rank<2000)return refusal('rank');
  next.town.money-=1000000;
  target.rank=Math.trunc(target.rank/10);
  next.town.safety=Math.min(10000,t.safety+500);
  logs.push([2,0,'領主'+actor.name+'は'+target.shopname+'に対して取り締まりを行いました。']);
  return {ok:1,fixture:next,logs,committable:false};
}
