/**
 * R4-B source-reviewed time-slice planner. Clock partition only:
 * does not run SortDT, period settlement, PLUS, EVENT or WorldState CAS.
 */
export const R4_TIME_SLICE_SOURCE='r4-frozen-inc-turn-36h-partition';
const fail=x=>{throw new RangeError('R4 original time slice: '+x);};
export function reviewOriginalR4TimeSlices({turnSource,configSource}){
  if(typeof configSource!=='string'||
    !/\$ONE_DAY_TIME\s*=\s*3600\*36\s*;/.test(configSource)||
    !/\$DATE_REVISE_TIME\s*=\s*3600\*6\s*;/.test(configSource)||
    !/\$TZ_JST\s*=\s*60\*60\*9\s*;/.test(configSource))
    fail('original 36h configuration drift');
  const order=[
    '$now=$NOW_TIME+$TZ_JST-$DATE_REVISE_TIME;',
    '$lasttime=$DTlasttime+$TZ_JST-$DATE_REVISE_TIME;',
    'while(int($lasttime/$ONE_DAY_TIME)<int($now/$ONE_DAY_TIME))',
    'push(@timespan,[1,$ONE_DAY_TIME-($lasttime%$ONE_DAY_TIME)]);',
    '$lasttime+=$ONE_DAY_TIME-($lasttime%$ONE_DAY_TIME);',
    'push(@timespan,[0,$now-$lasttime]);',
    '$DTlasttime=$lasttime-$TZ_JST+$DATE_REVISE_TIME;',
    '$now=$now-$TZ_JST+$DATE_REVISE_TIME;',
    'next if $timespan<=0;',
  ];
  let offset=-1;
  for(const marker of order){
    offset=typeof turnSource==='string'?turnSource.indexOf(marker,offset+1):-1;
    if(offset<0)fail('original inc-turn order drift: '+marker);
  }
  return Object.freeze({source:R4_TIME_SLICE_SOURCE,
    periodSeconds:129600,shiftSeconds:10800,maxBoundaries:128,
    scope:'source clock splitting only; no SortDT, settlement, PLUS or EVENT'});
}
const safe=(value,label)=>{
  if(!Number.isSafeInteger(value)||value<0)fail(label);
  return value;
};
export function projectOriginalR4TimeSlices({lastSeconds,nowSeconds,reviewed}){
  if(reviewed?.source!==R4_TIME_SLICE_SOURCE||
    reviewed.periodSeconds!==129600||reviewed.shiftSeconds!==10800||
    reviewed.maxBoundaries!==128)
    fail('source-reviewed clock contract required');
  safe(lastSeconds,'lastSeconds');
  safe(nowSeconds,'nowSeconds');
  if(nowSeconds<lastSeconds)fail('clock regression');
  const {periodSeconds:period,shiftSeconds:shift}=reviewed;
  safe(lastSeconds+shift,'shifted start');
  safe(nowSeconds+shift,'shifted end');
  let cursor=lastSeconds;
  const rawSlices=[];
  while(Math.trunc((cursor+shift)/period)<
        Math.trunc((nowSeconds+shift)/period)){
    if(rawSlices.length>=reviewed.maxBoundaries)
      fail('too many boundaries; settlement review required');
    const span=period-((cursor+shift)%period);
    safe(cursor+span,'boundary clock');
    rawSlices.push(Object.freeze({dateupdate:1,timespanSeconds:span}));
    cursor+=span;
  }
  rawSlices.push(Object.freeze({dateupdate:0,
    timespanSeconds:nowSeconds-cursor}));
  return Object.freeze({
    source:reviewed.source,
    rawSlices:Object.freeze(rawSlices),
    effectiveSlices:Object.freeze(rawSlices.filter(x=>x.timespanSeconds>0)),
    crossesSettlement:rawSlices.some(x=>x.dateupdate===1&&x.timespanSeconds>0),
    lastTimeAfter:nowSeconds,nowAfter:nowSeconds,
  });
}
