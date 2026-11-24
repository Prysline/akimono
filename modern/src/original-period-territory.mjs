/**
 * B-46: exact original Core inc-period.cgi territory/population math for
 * one shop, no guild tax and NO recognized town leader. Pure projection only.
 *
 * The original period also has prize/ledger/callbacks/events/files; running
 * this function is NEVER sufficient to settle a live WorldState period.
 */
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
