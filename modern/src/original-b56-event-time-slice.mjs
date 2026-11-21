/**
 * B-56 internal review fixture: source-sale -> PLUS -> complete EVENT gate.
 * Caller supplies the full 17-key event order; this does NOT reproduce
 * process-dependent Perl keys(%EVENT) order. Unsupported starts abort CAS.
 */
import {B41_SOURCE,projectB41Sale} from './original-b41-playable-sale.mjs';
import {B53_EVENT_CATALOG_SOURCE} from './original-event-compiled-catalog.mjs';
import {B55_SOURCE,projectOriginalInstantEventCallback}
  from './original-instant-event-callbacks.mjs';
import {B57_SUPPORT_SOURCE,projectOriginalSupportEventCallback}
  from './original-b57-support-event-callbacks.mjs';
import {PERIOD_WORLD_SCHEMA} from './game-core-contract.mjs';
export const B56_EVENT_SLICE_SOURCE='b56-reviewed-sale-plus-full-17-event-gate-fixture';
const fail=s=>{throw new RangeError('B-56 original EVENT slice: '+s);};
const validDraw=x=>Number.isSafeInteger(x)&&x>=0&&x<1000000;

export function reviewB56EventSlice({turnSource,reviewedB41,reviewedCatalog,
  reviewedCallbacks,reviewedSupportCallbacks=null}){
  if(reviewedB41?.source!==B41_SOURCE||
     reviewedCatalog?.source!==B53_EVENT_CATALOG_SOURCE||
     reviewedCatalog.compiledCount!==17||
     reviewedCallbacks?.source!==B55_SOURCE||
     reviewedCallbacks.eventGateIncluded!==false)
    fail('B-41 B-53 B-55 source contracts required');
  const ordered=[
    'SortDT();',
    "RequireFile('inc-period.cgi') if $dateupdate && scalar(@DT);",
    '#市場商品数のUP/DOWN処理',
    'CheckWholeStore();',
    '#イベント終了処理',
    '#イベント開始処理',
    'foreach my $key (keys(%EVENT))',
    'foreach my $key (keys(%DTevent))',
  ];
  let before=-1;
  for(const needle of ordered){
    const index=turnSource?.indexOf(needle,before+1)??-1;
    if(index<=before)fail('original source stage/order changed '+needle);
    before=index;
  }
  for(const needle of [
    'next if $group{$E->{group}};',
    'if(rand(100000)<$timespan*$E->{startproba}/864 || $E->{startproba}==0)',
    'if($E->{startfunc})',
    'if($ret)',
    '$group{$E->{group}}=1;',
    'if ($E->{basetime}+$E->{plustime});',
  ])if(!turnSource.includes(needle))
    fail('original event semantics changed '+needle);
  if(reviewedSupportCallbacks!==null&&(
     reviewedSupportCallbacks?.source!==B57_SUPPORT_SOURCE||
     reviewedSupportCallbacks.gateIncluded!==false||
     reviewedSupportCallbacks.maxMoney!==999999999))
    fail('reviewed B-57 source callback contract changed');
  const zero=reviewedCatalog.compiled.filter(e=>e.startProba===0);
  if(zero.length!==2||zero.some(e=>e.callbacks.start!==null||
     e.baseTimeSeconds!==0||e.plusTimeSeconds!==0))
    fail('source start=0 exception changed');
  for(const code of ['manbiki','goutou']){
    const event=reviewedCatalog.compiled.find(e=>e.code===code);
    if(!event||event.callbacks.start===null||
       event.baseTimeSeconds!==0||event.plusTimeSeconds!==0)
      fail('instant source event drift '+code);
  }
  return Object.freeze({
    source:B56_EVENT_SLICE_SOURCE,
    eventCodes:Object.freeze(reviewedCatalog.compiled.map(e=>e.code)),
    b41:reviewedB41.source,callbacks:reviewedCallbacks.source,
    support:reviewedSupportCallbacks?.source??null,
    orderMode:'explicit-17-key-permutation-not-Perl-hash-order',
    publicGameplay:false,
  });
}
export function projectB56EventSlice({
  world,reviewed,reviewedB41,reviewedAllPlus,compiled,
  reviewedCatalog,reviewedCallbacks,reviewedSupportCallbacks=null,
  shopId,minutes,
  saleDraws,eventDraws,eventHashOrderFixture,
}){
  if(reviewed?.source!==B56_EVENT_SLICE_SOURCE||
     reviewed.b41!==reviewedB41?.source||
     reviewed.callbacks!==reviewedCallbacks?.source||
     reviewed.support!==(reviewedSupportCallbacks?.source??null)||
     (reviewedSupportCallbacks!==null&&
       reviewedSupportCallbacks.source!==B57_SUPPORT_SOURCE)||
     reviewedCatalog?.source!==B53_EVENT_CATALOG_SOURCE||
     reviewedCatalog.compiledCount!==17||
     reviewed.orderMode!=='explicit-17-key-permutation-not-Perl-hash-order')
    fail('reviewed source contracts missing');
  if(world?.schema!==PERIOD_WORLD_SCHEMA||world.events!==null||
     world.period?.eventState===null||
     !world.period?.eventState||
     typeof world.period.eventState!=='object'||
     Array.isArray(world.period.eventState)||
     Object.keys(world.period.eventState).length!==0)
    fail('only verified empty source-active events allowed, never unknown or active');
  if(!Array.isArray(eventHashOrderFixture)||eventHashOrderFixture.length!==17||
     new Set(eventHashOrderFixture).size!==17||
     eventHashOrderFixture.some(code=>typeof code!=='string'||
       !reviewed.eventCodes.includes(code)))
    fail('must explicitly specify all 17 compiled EVENT keys in unique order');
  if(!Array.isArray(eventDraws)||eventDraws.length>64||
     eventDraws.some(x=>!validDraw(x)))
    fail('exact bounded source event draws required');
  // Same source B-41 natural-sale/59 PLUS, BEFORE the event region.
  const sale=projectB41Sale({
    world,reviewed:reviewedB41,reviewedAllPlus,compiled,
    shopId,minutes,randomDraws:saleDraws,
  });
  let shop=sale.shops[0],used=0;
  const take=()=>{
    if(used>=eventDraws.length)fail('missing original EVENT random draw');
    return eventDraws[used++];
  };
  const groups=new Set(),messages=[],started=[];
  let callbackCount=0;
  for(const code of eventHashOrderFixture){
    const event=reviewedCatalog.compiled.find(e=>e.code===code);
    if(groups.has(event.group))continue;
    // Even start 0 events evaluate rand(100000) BEFORE || ==0.
    const gate=take()/1000000*100000;
    if(!(gate<minutes*60*event.startProba/864||
         event.startProba===0))continue;
    started.push(code);
    if(code==='manbiki'||code==='goutou'){
      const first=take();
      const callbackDraws=[first];
      // Source B-55 uses one more rand(1000) only when robot
      // protection branch is entered for manbiki.
      if(code==='manbiki'&&shop.item[63]>0&&first<=400000)
        callbackDraws.push(take());
      const effect=projectOriginalInstantEventCallback({
        reviewed:reviewedCallbacks,shop,eventCode:code,
        randomDraws:callbackDraws,
      });
      if(effect.returnCode!==0||effect.eventPersisted!==false)
        fail('source instant callback must return 0 without active event');
      shop=effect.shop;callbackCount++;
      if(effect.message!==null)
        messages.push({eventCode:code,message:effect.message});
      // ret=0: not in group, not in active DTevent, no startmsg.
      continue;
    }
    if((code==='getmoney'||code==='getpop')&&reviewedSupportCallbacks){
      const effect=projectOriginalSupportEventCallback({
        reviewed:reviewedSupportCallbacks,shop,eventCode:code,
        randomDraws:[take()],
      });
      if(effect.returnCode!==0||effect.eventPersisted!==false)
        fail('support STARTFUNC must never persist as active EVENT');
      shop=effect.shop;callbackCount++;
      if(effect.message!==null)
        messages.push({eventCode:code,message:effect.message});
      // Source ret=0: no group, startmsg or active event.
      continue;
    }
    if(event.startProba!==0||event.callbacks.start!==null||
       event.baseTimeSeconds!==0||event.plusTimeSeconds!==0)
      fail('unreviewed original EVENT started; whole CAS rejected: '+code);
    // Source start=0, ret=1 and no duration: transient group only.
    groups.add(event.group);
  }
  if(used!==eventDraws.length)fail('unused source EVENT random draws');
  return {
    shops:[shop],market:sale.market,nowSeconds:sale.nowSeconds,
    period:{...world.period,eventState:{}},
    receipt:{
      ...sale.receipt,action:'advance-source-time-reviewed-events',
      source:B56_EVENT_SLICE_SOURCE,
      eventHashOrderSupplied:true,
      eventKeysVisited:eventHashOrderFixture.length,
      eventStarts:started,instantCallbacksRun:callbackCount,
      eventMessages:messages,eventDrawsUsed:used,
      totalDraws:sale.receipt.totalDraws+used,
      eventStateConfirmedEmpty:true,
      sourceScope:'B-41 sale/59 PLUS plus all 17 event gates in caller-provided order; unsupported starts reject; internal only, not exact Perl hash order.',
    },
  };
}
