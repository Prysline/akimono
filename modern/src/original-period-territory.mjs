/**
 * B-46: exact original Core inc-period.cgi territory/population math for
 * one shop, no guild tax and NO recognized town leader. Pure projection only.
 *
 * The original period also has prize/ledger/callbacks/events/files; running
 * this function is NEVER sufficient to settle a live WorldState period.
 */
import {createHash} from 'node:crypto';
import {reviewR4RebelPeriodTrigger,projectR4RebelPeriodTrigger} from './original-r4-rebel-period-trigger.mjs';
export const B46_TERRITORY_SOURCE='core-inc-period-unled-town-solo-territory';
const names=Object.freeze(['leader','money','in','out','develop','devem',
  'safety','safem','army','robina','robinb']);
const fail=msg=>{throw new RangeError('B-46 original town: '+msg);};
const safe=(v,key,min=0)=>{
  if(!Number.isSafeInteger(v)||v<min)fail(key);
  return v;
};
export function reviewOriginalPeriodTerritory({
  periodSource,adminSource,readSource,bootstrapMeta,includeReviewedSaleTax=false,
}){
  if(typeof periodSource!=='string'||typeof adminSource!=='string'||
     typeof readSource!=='string'||typeof bootstrapMeta!=='string')
    fail('original sources missing');
  const expected='500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0';
  if(bootstrapMeta!==expected||!adminSource.includes(expected))
    fail('original starting town state changed');
  const manifest=/\@STATEnamelist=\s*qw\(\s*leader money in out develop devem safety safem army robina robinb\s*\)/;
  if(!manifest.test(readSource))fail('original State field wire order changed');
  const start=periodSource.indexOf('#領土データ調整');
  const end=periodSource.indexOf('#決算時のカスタム処理（リセット後）',start);
  const seg=start>=0&&end>start?periodSource.slice(start,end):'';
  const markers=[
    '$STATE->{people}=$DTpeople;',
    '$DTpeople=(24000 * $DTusercount) + 100000 + ($STATE->{develop} * 30) + ($STATE->{safety} * 20);',
    '$STATE->{money}+=$taxin;',
    '$STATE->{in}=$taxin;',
    '$STATE->{develop}+=int(($STATE->{devem} / $STATE->{people} * 200) - ($STATE->{develop}/10) - rand(200));',
    '$STATE->{safety}+=int(($STATE->{safem} / $STATE->{people} * 200) - ($STATE->{safety}/10) - rand(200));',
    '$STATE->{safety}-=int( (10000 - $STATE->{army}- $STATE->{robina}) / 20);',
    '$STATE->{develop}=1000 if $STATE->{develop} < 1000;',
    '$STATE->{safety}=1000 if $STATE->{safety} < 1000;',
    '$STATE->{out}=($STATE->{army}*$armycost) + $STATE->{devem} + $STATE->{safem};',
    '$STATE->{money}-=$STATE->{out};',
    'RebelRobin();',
    '$STATE->{army}+=$STATE->{robina};',
    '$STATE->{army}=int($STATE->{army} / 3);',
    '$STATE->{money}=0;',
    '$STATE->{robina}=$STATE->{army};',
    '$STATE->{army}=0;',
  ];
  for(const needle of markers)if(!seg.includes(needle))
    fail('frozen territory source drift: '+needle);
  if(!periodSource.includes('return if !defined($id2idx{$STATE->{leader}});'))
    fail('unrecognized town leader rebel guard drift');
  if(typeof includeReviewedSaleTax!=='boolean')fail('explicit source sale tax opt-in');
  if(includeReviewedSaleTax){
    const taxMarkers=['my $taxin=0;','$DT->{taxyesterday}=$DT->{taxtoday};','$DT->{taxtoday}=0;','$taxin+=$DT->{taxyesterday};','$STATE->{money}+=$taxin;','$STATE->{in}=$taxin;'];
    let prior=-1;
    for(const marker of taxMarkers){
      const index=periodSource.indexOf(marker,prior+1);
      if(index<0)fail('original tax history/accumulator source drift '+marker);
      prior=index;
    }
  }
  const chunks=expected.split(',');
  const numbers=chunks[4].split(':').map(Number);
  if(numbers.length!==11||numbers.some(n=>!Number.isSafeInteger(n)))
    fail('source town has unexpected original state fields');
  const town=Object.fromEntries(names.map((n,i)=>[n,numbers[i]]));
  return Object.freeze({
    source:B46_TERRITORY_SOURCE,initialDtPeople:500000,
    initialTown:Object.freeze(town),
    sourceFieldOrder:names,
    ...(includeReviewedSaleTax?{reviewedSaleTax:true}:{}),
    scope:'source initial unled single-shop town + original 2-draw territory arithmetic only; not complete period',
  });
}
export function projectOriginalPeriodTerritory({
  reviewed,town,dtPeople,shopCount,taxIn,drawMillionths,leaderShopExists,
  activeEventKeys,
}){
  if(reviewed?.source!==B46_TERRITORY_SOURCE)
    fail('source review required');
  if(leaderShopExists!==false||!Array.isArray(activeEventKeys)||
     activeEventKeys.length!==0||shopCount!==1||
     !Number.isSafeInteger(taxIn)||taxIn<0||
     (taxIn!==0&&reviewed.reviewedSaleTax!==true))
    fail('unreviewed active event, leader, guild tax or shop count');
  const people=safe(dtPeople,'previous population',1);
  if(!town||typeof town!=='object'||Array.isArray(town))fail('town');
  const validKeys=new Set([...names,'people']);
  if(Object.keys(town).some(k=>!validKeys.has(k))||
     names.some(k=>!Object.hasOwn(town,k)))fail('town field contract');
  const old=Object.fromEntries(names.map(k=>[k,
    safe(town[k],'town '+k,k==='money'?-Number.MAX_SAFE_INTEGER:0)]));
  if(old.leader!==0)fail('unled Standard Street scope expects leader 0');
  if(!Array.isArray(drawMillionths)||drawMillionths.length!==2)
    fail('exact two original rand(200) values required');
  const draws=drawMillionths.map((v,i)=>safe(v,'rand draw '+i));
  if(draws.some(v=>v>=1000000))fail('rand must be less than one');
  const {state,nextPeople,armyCost,guardsPenalty}=territoryBeforeRebel({old,people,shopCount,taxIn,draws});
  state.army=safe(old.army+old.robina,'town militia transfer');
  const insolvent=state.money<0;
  if(insolvent){
    state.army=Math.trunc(state.army/3);
    state.money=0;
  }
  // Original RebelRobin returns immediately with no recognized leader.
  // Original unled-town branch transfers all troops to robina.
  state.robina=state.army;
  state.army=0;
  return Object.freeze({
    town:Object.freeze(state),dtPeople:nextPeople,
    armyCost,guardsPenalty,insolvent,
    drawsUsed:2,source:reviewed.source,scope:reviewed.scope,
  });
}

/** Shared exact territory prefix; caller owns the source and input gates. */
function territoryBeforeRebel({old,people,shopCount,taxIn,draws}){
  const nextPeople=safe(24000*shopCount+100000+
    old.develop*30+old.safety*20,'next population');
  const state={...old,people};
  state.money=safe(state.money+taxIn,'source tax income',
    -Number.MAX_SAFE_INTEGER);
  state.in=taxIn;
  const developDelta=Math.trunc(
    state.devem/people*200 -old.develop/10-draws[0]/1000000*200);
  const safetyDelta=Math.trunc(
    state.safem/people*200 -old.safety/10-draws[1]/1000000*200);
  const guardsPenalty=old.army+old.robina<10000
    ?Math.trunc((10000-old.army-old.robina)/20):0;
  state.develop=Math.max(1000,old.develop+developDelta);
  state.safety=Math.max(1000,old.safety+safetyDelta-guardsPenalty);
  const armyCost=200-Math.trunc(state.safety/100);
  state.out=safe(old.army*armyCost+old.devem+old.safem,
    'town guard budget',-Number.MAX_SAFE_INTEGER);
  state.money=safe(state.money-state.out,'town treasury',
    -Number.MAX_SAFE_INTEGER);
  return {state,nextPeople,armyCost,guardsPenalty};
}

export const R4_TERRITORY_CONFLICT_SOURCE='r4-original-territory-rebel-full-fragment.v1';
const conflictReviews=new WeakSet();
const conflictPins={periodSource:'6183e88e9dd69a16606a1064c8084e9a1411dbd5',
  adminSource:'2164b7e5abfea7a466235a8deba1543c2cc41515',readSource:'e7a8add7b0291901e71fe797783b664dff1568a0'};
export function reviewOriginalTerritoryConflict({periodSource,adminSource,readSource,bootstrapMeta,reviewedRebelNow}){
  for(const [k,sha] of Object.entries(conflictPins)){
    const src={periodSource,adminSource,readSource}[k];
    if(typeof src!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(src)+'\0').update(src).digest('hex')!==sha)fail('frozen conflict territory source '+k);
  }
  const base=reviewOriginalPeriodTerritory({periodSource,adminSource,readSource,bootstrapMeta,includeReviewedSaleTax:true});
  const rebel=reviewR4RebelPeriodTrigger({periodSource,reviewedRebelNow});
  // DTusercount is captured by DataRead, NOT recomputed from post-SortDT
  // active IDs. The latter alone determines leader membership.
  if(!readSource.includes('$DTusercount=$cnt;')||base.sourceFieldOrder.join(',')!==names.join(','))fail('source population/membership contract');
  const r=Object.freeze({source:R4_TERRITORY_CONFLICT_SOURCE,committable:false,base,rebel});
  conflictReviews.add(r);return r;
}
export function projectOriginalTerritoryConflict({reviewed,town,dtPeople,dtUserCount,activeShopIds,taxIn,nowSeconds,
  activeUntilSeconds,drawMillionths,randomDrawProvider=null,balJob='外敵',balName='首領'}){
  if(!conflictReviews.has(reviewed))fail('reviewed conflict territory required');
  if(!Number.isSafeInteger(dtUserCount)||dtUserCount<0||!Array.isArray(activeShopIds)||
     activeShopIds.length>dtUserCount||activeShopIds.some(id=>!Number.isSafeInteger(id)||id<1)||
     new Set(activeShopIds).size!==activeShopIds.length)fail('explicit DataRead count and post-SortDT membership required');
  const people=safe(dtPeople,'previous population',1);
  safe(taxIn,'source tax income');
  if(!town||typeof town!=='object'||Array.isArray(town)||Object.keys(town).some(k=>!names.includes(k)&&k!=='people')||
     names.some(k=>!Object.hasOwn(town,k)))fail('town field contract');
  const old=Object.fromEntries(names.map(k=>[k,safe(town[k],'town '+k,['money','out'].includes(k)?-Number.MAX_SAFE_INTEGER:0)]));
  if(randomDrawProvider===null?
     (!Array.isArray(drawMillionths)||drawMillionths.length<2||drawMillionths.length>5||
      drawMillionths.some(x=>!Number.isSafeInteger(x)||x<0||x>=1000000)):
     (typeof randomDrawProvider!=='function'||drawMillionths!==undefined))fail('exact source territory and RebelRobin draws');
  const consumed=[],ranges=[];
  const take=(index,range)=>{
    if(index!==consumed.length||index>=5)fail('conflict territory RNG cursor');
    const sample=randomDrawProvider(index,range);
    if(!Number.isSafeInteger(sample)||sample<0||sample>=1000000)fail('invalid conflict territory RNG sample');
    consumed.push(sample);ranges.push(range);return sample;
  };
  const draws=randomDrawProvider===null?drawMillionths.slice(0,2):[take(0,200),take(1,200)];
  const {state,nextPeople,armyCost,guardsPenalty}=territoryBeforeRebel({old,people,shopCount:dtUserCount,taxIn,draws});
  const leaderShopExists=activeShopIds.includes(old.leader);
  const logs=[];
  if(old.army+old.robina<10000)logs.push([2,0,'街の護衛軍が少ないため，治安が悪化しています。']);
  // The treasury may be negative here. RebelRobin observes this intermediate
  // value before insolvency clamps cash and before militia transfer.
  const {people:transientPeople,...triggerTown}=state;
  const trigger=projectR4RebelPeriodTrigger({reviewed:reviewed.rebel,nowSeconds,town:triggerTown,
    leaderShopExists,activeUntilSeconds,balJob,balName,
    ...(randomDrawProvider===null?{randomDraws:drawMillionths.slice(2)}:{randomDrawProvider:(index,range)=>take(index+2,range)})});
  if(randomDrawProvider!==null&&(trigger.drawsUsed!==consumed.length-2||trigger.randomDrawRanges.some((range,i)=>ranges[i+2]!==range)))fail('conflict territory RNG evidence drift');
  const next={...trigger.town,people:transientPeople};
  logs.push(...trigger.logs);
  next.army=safe(next.army+next.robina,'town militia transfer');
  const insolvent=next.money<0;
  if(insolvent){
    logs.push([2,0,'街資金が底をつき，街の護衛軍に給料を支払えないようです。']);
    next.army=Math.trunc(next.army/3);next.money=0;
  }
  if(leaderShopExists)next.robina=0;
  else {next.robina=next.army;next.army=0;}
  return Object.freeze({source:reviewed.source,committable:false,town:next,dtPeople:nextPeople,
    activeUntilSeconds:trigger.activeUntilSeconds,eventState:trigger.eventState,leaderShopExists,
    armyCost,guardsPenalty,insolvent,triggerMode:trigger.mode,
    logs,randomDrawRanges:[200,200,...trigger.randomDrawRanges],drawsUsed:2+trigger.drawsUsed});
}
