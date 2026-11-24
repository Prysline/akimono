/**
 * R4 source-ordered one rebel PERIOD trigger -> EVENT END/START/NOWFUNC.
 * True input is one externally defined city, shops, RIOT/ARMY and explicit
 * controlled RNG. This NEVER settles a period nor writes a WorldState.
 */
import {R4_REBEL_NOW_SOURCE,projectR4RebelNow}
  from './original-r4-rebel-now.mjs';
import {R4_REBEL_PERIOD_SOURCE,projectR4RebelPeriodTrigger}
  from './original-r4-rebel-period-trigger.mjs';
export const R4_REBEL_PERIOD_NOW_SOURCE=
  'r4-source-rebel-period-before-event-one-slice-noncommittable';
const fail=s=>{throw new RangeError('R4 rebel period->NOW: '+s);};
const safe=n=>Number.isSafeInteger(n)&&n>=0;
export function reviewR4RebelPeriodToNow({
  turnSource,reviewedPeriod,reviewedNow,
}){
  if(reviewedPeriod?.source!==R4_REBEL_PERIOD_SOURCE||
     reviewedPeriod.committable!==false||
     reviewedNow?.source!==R4_REBEL_NOW_SOURCE||
     reviewedNow.committable!==false)
    fail('source-reviewed period and NOW components required');
  const markers=[
    'SortDT();',
    "RequireFile('inc-period.cgi') if $dateupdate && scalar(@DT);",
    '#市場商品数のUP/DOWN処理',
    'CheckWholeStore();',
    '#イベント終了処理',
    '#イベント開始処理',
    'foreach my $key (keys(%EVENT))',
    'my $extfile=GetPath($ITEM_DIR,"event-n",$key);',
    '$temptimenow+=$timespan;',
  ];
  let i=-1;
  for(const marker of markers){
    const j=typeof turnSource==='string'?
      turnSource.indexOf(marker,i+1):-1;
    if(j<=i)fail('original period-before-EVENT source stage drift '+marker);
    i=j;
  }
  return Object.freeze({
    source:R4_REBEL_PERIOD_NOW_SOURCE,period:reviewedPeriod,
    now:reviewedNow,committable:false,
    sourceScope:'one original period RebelRobin fragment followed by one original EVENT END/START/NOWFUNC; no SortDT/sale/PLUS/full period/17-key EVENT/IO/WorldState commit',
  });
}
export function projectR4RebelPeriodToNow({
  reviewed,startSeconds,nowSeconds,spanSeconds,
  town,shops,riotIds,armyById,leaderShopExists,
  activeUntilSeconds=null,randomDraws,
  periodDrawCount,nowDrawCount,taxRate=0,
  balJob='外敵',balName='首領',
}){
  if(reviewed?.source!==R4_REBEL_PERIOD_NOW_SOURCE||
     reviewed.committable!==false||
     !safe(startSeconds)||!safe(nowSeconds)||
     startSeconds!==nowSeconds||
     !safe(spanSeconds)||spanSeconds<1||spanSeconds>3600||
     !Array.isArray(randomDraws)||randomDraws.length>8||
     randomDraws.some(x=>!safe(x)||x>=1000000)||
     ![0,2,3].includes(periodDrawCount)||
     ![0,1,2].includes(nowDrawCount))
    fail('unreviewed original source slice or RNG counts');
  const period=projectR4RebelPeriodTrigger({
    reviewed:reviewed.period,nowSeconds,town,leaderShopExists,
    activeUntilSeconds,randomDraws:randomDraws.slice(0,periodDrawCount),
    balJob,balName,
  });
  const ranges=[...period.randomDrawRanges],
    logs=[...period.logs.map(x=>[...x])];
  let used=periodDrawCount,result=null,zeroStartTransient=false;
  if(period.activeUntilSeconds!==null){
    if(used+nowDrawCount!==randomDraws.length)
      fail('exact NOWFUNC RNG count required');
    result=projectR4RebelNow({
      reviewed:reviewed.now,startSeconds,spanSeconds,
      activeUntilSeconds:period.activeUntilSeconds,town:period.town,
      shops,riotIds,armyById,taxRate,balJob,balName,
      randomDraws:randomDraws.slice(used),
    });
    used+=result.drawsUsed;
    ranges.push(...result.randomDrawRanges);
    logs.push(...result.logs.map(x=>[...x]));
  }else{
    if(nowDrawCount!==0||used+1!==randomDraws.length)
      fail('source zero START requires exactly one gate rand(100000)');
    // The zero-probability rebel EVENT still evaluates its rand(100000)
    // then reserves its group for this slice without durable DTevent.
    used+=1;ranges.push(100000);zeroStartTransient=true;
  }
  if(used!==randomDraws.length)fail('unused original RNG');
  const eventUntil=result?.activeUntilSeconds??null;
  return Object.freeze({
    source:reviewed.source,committable:false,
    town:result?.town??period.town,
    shops:result?.shops??shops.map(x=>({...x})),
    riotIds:result?.riotIds??[...riotIds],
    armyById:result?.armyById??{...armyById},
    taxRate:result?.taxRate??taxRate,
    eventState:Object.freeze(eventUntil===null?{}:{rebel:eventUntil}),
    activeUntilSeconds:eventUntil,
    eventPersisted:eventUntil!==null,
    periodMode:period.mode,zeroStartTransient,
    logs:Object.freeze(logs.map(x=>Object.freeze(x))),
    randomDrawRanges:Object.freeze(ranges),
    drawsUsed:used,readArmyCalls:result?.readArmyCalls??0,
    writeArmyCalls:result?.writeArmyCalls??0,
    sourceScope:reviewed.sourceScope,
  });
}
