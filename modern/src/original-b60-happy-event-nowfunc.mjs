/**
 * B-60 source-reviewed original EVENT happy (感謝祭) lifespan + genuine
 * event-n/happy.cgi NOWFUNC rank gains. Original fixed inc-turn loads
 * EVENT files on DataRead, expires old activity, starts new activity, then
 * executes nowfunc for ALL still-active including newly started events.
 * One real shop and one activity only. Multiple simultaneous active events
 * are NOT emulated and must abort the entire GameCore CAS.
 */
import {parseDsl} from './parse-dsl.mjs';
import {B53_EVENT_CATALOG_SOURCE} from './original-event-compiled-catalog.mjs';
import {validateOriginalPeriodSeed} from './original-period-world-seed.mjs';

export const B60_HAPPY_SOURCE='b60-original-happy-festival-durable-nowfunc';
export const B60_HAPPY_CODE='happy';
const fail=s=>{throw new RangeError('B-60 original happy EVENT: '+s);};
const safe=(v,k,min=0)=>{
  if(!Number.isSafeInteger(v)||v<min)fail(k);
  return v;
};
const startMessage='街上開始舉辦感謝祭了。';
const endMessage='感謝祭已經結束了。';
const expectedBody=Object.freeze([
  'my $time=$main::TIMESPAN;',
  '$time=10*3600 if $time>10*3600;',
  '$time=int($time/36);',
  'foreach(@DT)',
  '{',
  '$_->{rank}+=int(rand($time));',
  '$_->{rank}=10000 if $_->{rank}>10000;',
  '}',
  'return 0;',
]);
const expected=Object.freeze({
  eventCode:B60_HAPPY_CODE,startProba:100,
  baseTimeSeconds:18000,plusTimeSeconds:18000,
  startMessage,endMessage,
  maxNowSpanSeconds:36000,rankCap:10000,
});
export function reviewOriginalB60HappyEvent({
  itemDsl,turnSource,compilerSource,readSource,compiledCatalog,
}){
  const e=compiledCatalog?.compiled?.find(x=>x.code===B60_HAPPY_CODE);
  if(compiledCatalog?.source!==B53_EVENT_CATALOG_SOURCE||
     compiledCatalog.compiledCount!==17||
     !e||e.startProba!==100||
     e.baseTimeSeconds!==18000||e.plusTimeSeconds!==18000||
     e.callbacks?.start!==null||e.callbacks?.end!==null||
     e.callbacks?.now!=='_local_'||
     typeof e.group!=='string'||!e.group)
    fail('original compiled festival EVENT changed');
  const dsl=parseDsl(itemDsl,'custom/inc-item-data.cgi');
  const blocks=dsl.blocks.filter(x=>x.kind==='EVENT'&&
    x.fields.code?.[0]?.value===B60_HAPPY_CODE);
  if(dsl.issues.length||blocks.length!==1)
    fail('exact one original festival EVENT required');
  const b=blocks[0],fields=k=>b.fields[k]?.map(x=>x.value)??[];
  for(const [key,expect]of [
    ['start',['10%']],['basetime',['5h']],['plustime',['5h']],
    ['startmsg',[startMessage]],['endmsg',[endMessage]],
    ['func',['_local_']],
  ]){
    const got=fields(key);
    if(got.length!==expect.length||got.some((x,i)=>x!==expect[i]))
      fail('original happy source event '+key+' changed');
  }
  for(const k of ['group','startfunc','endfunc','param'])
    if(fields(k).length)fail('unexpected original festival '+k);
  const content=b.raw.split(/\r?\n/);
  const start=content.findIndex(x=>/^\s*func\s+_local_\s*$/.test(x));
  if(start<0)fail('source NOWFUNC declaration moved');
  const end=content.findIndex((line,i)=>i>start&&line.trim()==='_local_');
  if(end<=start)fail('source NOWFUNC terminator moved');
  const body=content.slice(start+1,end).map(x=>
    x.replace(/\s+#.*$/,'').trim()).filter(Boolean);
  if(body.length!==expectedBody.length||
     body.some((line,i)=>line!==expectedBody[i]))
    fail('source complete Perl festival NOWFUNC body changed');
  for(const [source,literal]of [
    [compilerSource,"$g_event->{nowfunc},$g_event->{localfuncnow}"],
    [compilerSource,"$ITEM_DIR/event-n/$event->{code}$FILE_EXT"],
    [readSource,'foreach(keys(%DTevent)){require(GetPath($ITEM_DIR,"event",$_));}'],
    [turnSource,'@event::DT=@DT;'],
    [turnSource,'$DTevent{$key}<$temptimenow+$timespan'],
    [turnSource,'foreach my $key (keys(%EVENT))'],
    [turnSource,'my $extfile=GetPath($ITEM_DIR,"event-n",$key);'],
    [turnSource,'my($msg)=&$func(split(/[:,]/,$E->{funcparam}));'],
    [turnSource,'$temptimenow+=$timespan;'],
  ])if(typeof source!=='string'||!source.includes(literal))
    fail('frozen Core NOWFUNC lifecycle drift '+literal);
  const before=turnSource.indexOf('CheckWholeStore();');
  const exp=turnSource.indexOf('#イベント終了処理',before);
  const begins=turnSource.indexOf('#イベント開始処理',exp);
  const now=turnSource.indexOf('my $extfile=GetPath($ITEM_DIR,"event-n",$key);',begins);
  if(before<0||exp<before||begins<exp||now<begins)
    fail('source festival timing stage order changed');
  return Object.freeze({
    source:B60_HAPPY_SOURCE,...expected,group:e.group,
    scope:'actual original EVENT happy _local_ NOWFUNC one real shop: immediately after start or on active slices; original callback rand(time) source-executed; no other active EVENT/hash PRNG',
    publicGameplay:false,
  });
}
export function isReviewedB60HappyPeriod({period,reviewed,nowSeconds}){
  if(reviewed?.source!==B60_HAPPY_SOURCE||!period||
     typeof period!=='object'||!Number.isSafeInteger(nowSeconds)||
     nowSeconds<0||!period.eventState||
     typeof period.eventState!=='object'||
     Array.isArray(period.eventState))return false;
  const keys=Object.keys(period.eventState);
  if(keys.some(key=>key!==B60_HAPPY_CODE)||keys.length>1)return false;
  if(keys.length===1&&(!Number.isSafeInteger(period.eventState[B60_HAPPY_CODE])||
      period.eventState[B60_HAPPY_CODE]<0))return false;
  return validateOriginalPeriodSeed({...period,eventState:{}});
}
export function projectOriginalHappyStart({
  reviewed,startSeconds,spanSeconds,randomDraws,
}){
  if(reviewed?.source!==B60_HAPPY_SOURCE||
     reviewed.baseTimeSeconds!==18000||
     reviewed.plusTimeSeconds!==18000||
     reviewed.startProba!==100)
    fail('source-reviewed festival required');
  safe(startSeconds,'source start second');
  safe(spanSeconds,'source span',1);
  if(spanSeconds>3600||!Array.isArray(randomDraws)||
     randomDraws.length!==2||randomDraws.some(x=>
       !Number.isSafeInteger(x)||x<0||x>=1000000))
    fail('exact two original duration rand results required');
  const expiresAtSeconds=startSeconds+
    Math.trunc(randomDraws[0]*spanSeconds/1000000)+18000+
    Math.trunc(randomDraws[1]*18000/1000000);
  safe(expiresAtSeconds,'source festival expiration');
  return Object.freeze({
    eventCode:B60_HAPPY_CODE,source:reviewed.source,
    expiresAtSeconds,startMessage:reviewed.startMessage,
    randomDrawsUsed:2,
  });
}
export function projectOriginalHappyExpiry({
  reviewed,eventState,startSeconds,spanSeconds,
}){
  if(reviewed?.source!==B60_HAPPY_SOURCE||
     !eventState||typeof eventState!=='object'||Array.isArray(eventState))
    fail('source festival expiry contract');
  safe(startSeconds,'start');safe(spanSeconds,'span',1);
  if(spanSeconds>3600||!Number.isSafeInteger(startSeconds+spanSeconds))
    fail('unreviewed source festival span');
  const keys=Object.keys(eventState);
  if(keys.some(k=>k!==B60_HAPPY_CODE)||keys.length>1)
    fail('unsupported source active EVENT state');
  const wasActive=keys.length===1;
  const at=wasActive?safe(eventState[B60_HAPPY_CODE],'source expiration'):null;
  const expired=wasActive&&at<startSeconds+spanSeconds;
  return Object.freeze({
    wasActive,expired,occupied:wasActive&&!expired,
    remainingEventState:wasActive&&!expired?{[B60_HAPPY_CODE]:at}:{},
    endMessage:expired?reviewed.endMessage:null,
  });
}
export function projectOriginalHappyNow({
  reviewed,shop,timespanSeconds,randomDraws,
}){
  if(reviewed?.source!==B60_HAPPY_SOURCE||
     reviewed.rankCap!==10000||
     reviewed.maxNowSpanSeconds!==36000)
    fail('source festival callback contract');
  safe(timespanSeconds,'timespan seconds',1);
  if(timespanSeconds>3600||
     shop?.id!==1||shop.status!==1||
     !Number.isSafeInteger(shop.rank)||shop.rank<0||shop.rank>10000)
    fail('real source shop rank or time unsupported');
  if(!Array.isArray(randomDraws)||randomDraws.length!==1||
     !Number.isSafeInteger(randomDraws[0])||randomDraws[0]<0||
     randomDraws[0]>=1000000)
    fail('one exact original rand(int(TIMESPAN/36)) result required');
  const randMax=Math.trunc(Math.min(timespanSeconds,36000)/36);
  if(randMax<1)fail('source festival zero-range rand unreviewed');
  const rankGain=Math.trunc(randomDraws[0]*randMax/1000000);
  const nextRank=Math.min(reviewed.rankCap,shop.rank+rankGain);
  return Object.freeze({
    source:reviewed.source,eventCode:B60_HAPPY_CODE,
    shop:{...shop,rank:nextRank},rankBefore:shop.rank,
    rankAfter:nextRank,rankGain,
    randMax,randomDrawsUsed:1,
    returnCode:0,message:null,
    scope:reviewed.scope,
  });
}
