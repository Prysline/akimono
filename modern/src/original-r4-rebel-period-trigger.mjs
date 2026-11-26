/**
 * R4 isolated source period.cgi RebelRobin trigger/extension.
 * A source-derived trigger, never an authority to commit a settled period.
 * Reads one explicit town, original leader membership and controlled RNG.
 */
import {R4_REBEL_NOW_SOURCE} from './original-r4-rebel-now.mjs';

export const R4_REBEL_PERIOD_SOURCE='r4-frozen-period-rebel-robin-trigger-fixture';
const fail=s=>{throw new RangeError('R4 original period RebelRobin: '+s);};
const safe=n=>Number.isSafeInteger(n)&&n>=0;
const expectedLines=Object.freeze([
  'sub RebelRobin',
  '{',
  'return if !defined($id2idx{$STATE->{leader}});',
  'my $i=int(15000 - $STATE->{develop} - $STATE->{safety} - rand(2500));',
  'my $ii=int(50000000 - $STATE->{money} - rand(5000000));',
  'return if ($i > 1000)&&($ii > 5000000);',
  'PushLog(2,0,l("%1%2が不穏な動きを見せています。",$BAL_JOB,$BAL_NAME)),return if ($i > 0) && ($ii > 0);',
  'if (rand(100) < 30)',
  '{',
  '$DTevent{rebel}=$NOW_TIME+86400*3;',
  '$STATE->{robinb}=10000;',
  'PushLog(2,0,l("%1%2が街に攻め込み，反乱を起こしました！",$BAL_JOB,$BAL_NAME));',
  '}',
  'else',
  '{',
  'PushLog(2,0,l("%1%2が攻める時機をうかがっているようです。",$BAL_JOB,$BAL_NAME));',
  '}',
  '}',
]);
const expectedWrapper=Object.freeze([
  'if ($DTevent{rebel})',
  '{',
  '$DTevent{rebel}=$NOW_TIME+86400*3;',
  '}',
  'else',
  '{',
  'RebelRobin();',
  '}',
]);
export function reviewR4RebelPeriodTrigger({periodSource,reviewedRebelNow}){
  if(reviewedRebelNow?.source!==R4_REBEL_NOW_SOURCE||
     reviewedRebelNow.committable!==false)
    fail('complete original rebel NOW source review required');
  if(typeof periodSource!=='string')fail('original period.cgi source missing');
  const start=periodSource.indexOf('sub RebelRobin\n');
  const stop=periodSource.indexOf('sub DragonBalance',start);
  const original= start<0||stop<=start?[]:
    periodSource.slice(start,stop).split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(original.length!==expectedLines.length||
     original.some((x,i)=>x!==expectedLines[i]))
    fail('frozen RebelRobin source changed');
  const wStart=periodSource.indexOf('if ($DTevent{rebel})');
  const wStop=periodSource.indexOf('$STATE->{army}+=$STATE->{robina};',wStart);
  const wrapper=wStart<0||wStop<=wStart?[]:
    periodSource.slice(wStart,wStop).split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(wrapper.length!==expectedWrapper.length||
     wrapper.some((x,i)=>x!==expectedWrapper[i]))
    fail('frozen period rebel existence/extension branch changed');
  return Object.freeze({
    source:R4_REBEL_PERIOD_SOURCE,committable:false,
    activeDays:3,activeSeconds:259200,
    sourceScope:'actual original period.cgi RebelRobin with explicit leader existence, original city finances, and rand(2500)/rand(5000000)/rand(100); no full inc-period, file IO or WorldState',
  });
}
const names=['leader','money','in','out','develop','devem','safety','safem','army','robina','robinb'];
export function projectR4RebelPeriodTrigger({
  reviewed,nowSeconds,town,leaderShopExists,activeUntilSeconds=null,
  randomDraws,balJob='外敵',balName='首領'
}){
  if(reviewed?.source!==R4_REBEL_PERIOD_SOURCE||
     reviewed.committable!==false||reviewed.activeSeconds!==259200||
     !safe(nowSeconds)||!safe(nowSeconds+259200)||
     !town||typeof town!=='object'||Array.isArray(town)||
     Object.keys(town).sort().join(',')!==names.slice().sort().join(',')||
     names.some(k=>['money','out'].includes(k)?!Number.isSafeInteger(town[k]):!safe(town[k]))||
     typeof leaderShopExists!=='boolean'||
     (leaderShopExists&&town.leader===0)||
     (activeUntilSeconds!==null&&(!safe(activeUntilSeconds)||activeUntilSeconds===0))||
     !Array.isArray(randomDraws)||randomDraws.length>3||
     typeof balJob!=='string'||!balJob||
     typeof balName!=='string'||!balName)
    fail('unreviewed period CITY, leader, active event or RNG');
  const nextTown={...town},logs=[],ranges=[];
  let used=0,mode='none',eventUntil=activeUntilSeconds;
  const draw=range=>{
    if(used>=randomDraws.length)fail('original period RNG exhausted');
    const value=randomDraws[used++];
    if(!safe(value)||value>=1000000)fail('invalid original RNG sample');
    ranges.push(range);
    return value*range/1000000;
  };
  if(activeUntilSeconds!==null){
    eventUntil=nowSeconds+reviewed.activeSeconds;
    mode='extend-existing';
  }else if(leaderShopExists){
    const i=Math.trunc(15000-nextTown.develop-nextTown.safety-draw(2500));
    const ii=Math.trunc(50000000-nextTown.money-draw(5000000));
    if(i>1000&&ii>5000000){
      mode='no-unrest';
    }else if(i>0&&ii>0){
      mode='uneasy';
      logs.push([2,0,balJob+balName+'が不穏な動きを見せています。']);
    }else if(draw(100)<30){
      mode='rebel-started';
      eventUntil=nowSeconds+reviewed.activeSeconds;
      nextTown.robinb=10000;
      logs.push([2,0,balJob+balName+'が街に攻め込み，反乱を起こしました！']);
    }else{
      mode='deferred';
      logs.push([2,0,balJob+balName+'が攻める時機をうかがっているようです。']);
    }
  }
  if(used!==randomDraws.length)fail('unused original period RNG samples');
  return Object.freeze({
    source:reviewed.source,committable:false,
    town:Object.freeze(nextTown),activeUntilSeconds:eventUntil,
    eventState:Object.freeze(eventUntil===null?{}:{rebel:eventUntil}),
    mode,logs:Object.freeze(logs.map(x=>Object.freeze(x))),
    randomDrawRanges:Object.freeze(ranges),drawsUsed:used,
    sourceScope:reviewed.sourceScope,
  });
}
