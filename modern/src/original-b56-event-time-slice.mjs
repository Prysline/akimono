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
import {B58_LOTO_SOURCE,LOTO_RANGE,projectOriginalLotoStartfunc}
  from './original-b58-loto-startfunc.mjs';
import {B59_IRON_SOURCE,B59_IRON_CODE,
  isReviewedB59EventPeriod,projectOriginalIronStart,projectOriginalIronExpiry}
  from './original-b59-iron-event-lifecycle.mjs';
import {PERIOD_WORLD_SCHEMA} from './game-core-contract.mjs';
export const B56_EVENT_SLICE_SOURCE='b56-reviewed-sale-plus-full-17-event-gate-fixture';
const fail=s=>{throw new RangeError('B-56 original EVENT slice: '+s);};
const validDraw=x=>Number.isSafeInteger(x)&&x>=0&&x<1000000;
// Typed source value: exact original rand(6096454) return (integer fixture),
// interleaved with existing gate/callback uniform-millionth samples.
const validTicketDraw=x=>x!==null&&typeof x==='object'&&
  !Array.isArray(x)&&Object.keys(x).length===2&&
  x.range===LOTO_RANGE&&Number.isSafeInteger(x.result)&&
  x.result>=0&&x.result<LOTO_RANGE;

export function reviewB56EventSlice({turnSource,reviewedB41,reviewedCatalog,
  reviewedCallbacks,reviewedSupportCallbacks=null,
  reviewedLoto=null,reviewedB59Iron=null}){
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
  if(reviewedLoto!==null&&(
     reviewedLoto.source!==B58_LOTO_SOURCE||
     reviewedLoto.ticketDrawRange!==LOTO_RANGE||
     reviewedLoto.maxMoney!==999999999||
     reviewedLoto.gateIncluded!==false))
    fail('reviewed B-58 source lotto contract changed');
  if(reviewedB59Iron!==null&&(
     reviewedB59Iron.source!==B59_IRON_SOURCE||
     reviewedB59Iron.startProba!==100||
     reviewedB59Iron.itemId!==5||
     reviewedB59Iron.plusSeconds!==720))
    fail('source-reviewed durable iron EVENT contract missing');
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
    loto:reviewedLoto?.source??null,
    iron:reviewedB59Iron?.source??null,
    orderMode:'explicit-17-key-permutation-not-Perl-hash-order',
    publicGameplay:false,
  });
}
export function projectB56EventSlice({
  world,reviewed,reviewedB41,reviewedAllPlus,compiled,
  reviewedCatalog,reviewedCallbacks,reviewedSupportCallbacks=null,
  reviewedLoto=null,reviewedB59Iron=null,shopId,minutes,
  saleDraws,eventDraws,eventHashOrderFixture,
}){
  if(reviewed?.source!==B56_EVENT_SLICE_SOURCE||
     reviewed.b41!==reviewedB41?.source||
     reviewed.callbacks!==reviewedCallbacks?.source||
     reviewed.support!==(reviewedSupportCallbacks?.source??null)||
     reviewed.loto!==(reviewedLoto?.source??null)||
     reviewed.iron!==(reviewedB59Iron?.source??null)||
     (reviewedB59Iron!==null&&reviewedB59Iron.source!==B59_IRON_SOURCE)||
     (reviewedLoto!==null&&reviewedLoto.source!==B58_LOTO_SOURCE)||
     (reviewedSupportCallbacks!==null&&
       reviewedSupportCallbacks.source!==B57_SUPPORT_SOURCE)||
     reviewedCatalog?.source!==B53_EVENT_CATALOG_SOURCE||
     reviewedCatalog.compiledCount!==17||
     reviewed.orderMode!=='explicit-17-key-permutation-not-Perl-hash-order')
    fail('reviewed source contracts missing');
  if(world?.schema!==PERIOD_WORLD_SCHEMA||world.events!==null||
     !isReviewedB59EventPeriod({
       period:world.period,reviewed:reviewedB59Iron,
       nowSeconds:world.nowSeconds,
     }))
    fail('only known empty or B-59 single-source iron active EVENT allowed');
  if(!Array.isArray(eventHashOrderFixture)||eventHashOrderFixture.length!==17||
     new Set(eventHashOrderFixture).size!==17||
     eventHashOrderFixture.some(code=>typeof code!=='string'||
       !reviewed.eventCodes.includes(code)))
    fail('must explicitly specify all 17 compiled EVENT keys in unique order');
  if(!Array.isArray(eventDraws)||eventDraws.length>96||
     eventDraws.some(x=>!validDraw(x)&&!validTicketDraw(x)))
    fail('exact bounded source event draws required');
  // Same source B-41 natural-sale/59 PLUS, BEFORE the event region.
  const sale=projectB41Sale({
    world,reviewed:reviewedB41,reviewedAllPlus,compiled,
    shopId,minutes,randomDraws:saleDraws,
    reviewedB59Iron,reviewedEventTimeSlice:true,
  });
  let shop=sale.shops[0],used=0;
  const take=()=>{
    if(used>=eventDraws.length)fail('missing original EVENT random draw');
    return eventDraws[used++];
  };
  const takeUnit=()=>{
    const sample=take();
    if(!validDraw(sample))
      fail('expected original uniform-millionth gate/callback draw');
    return sample;
  };
  const takeTicket=()=>{
    const sample=take();
    if(!validTicketDraw(sample))
      fail('expected typed exact source rand(6096454) lottery draw');
    return sample.result;
  };
  const groups=new Set(),messages=[],started=[],eventLogEmissions=[];
  const lotteryWins=[];
  const expiry=projectOriginalIronExpiry({
    reviewed:reviewedB59Iron,
    eventState:world.period.eventState,
    startSeconds:world.nowSeconds,spanSeconds:minutes*60,
  });
  const activeEventState={...expiry.remainingEventState};
  if(expiry.occupied){
    const active=reviewedCatalog.compiled.find(e=>e.code===B59_IRON_CODE);
    groups.add(active.group);
  }
  if(expiry.endMessage!==null)
    eventLogEmissions.push({eventCode:B59_IRON_CODE,
      level:2,shopId:0,message:expiry.endMessage});
  let lotteryTicketsConsumed=0;
  let callbackCount=0;
  for(const code of eventHashOrderFixture){
    const event=reviewedCatalog.compiled.find(e=>e.code===code);
    if(groups.has(event.group))continue;
    // Even start 0 events evaluate rand(100000) BEFORE || ==0.
    const gate=takeUnit()/1000000*100000;
    if(!(gate<minutes*60*event.startProba/864||
         event.startProba===0))continue;
    started.push(code);
    if(code==='manbiki'||code==='goutou'){
      const first=takeUnit();
      const callbackDraws=[first];
      // Source B-55 uses one more rand(1000) only when robot
      // protection branch is entered for manbiki.
      if(code==='manbiki'&&shop.item[63]>0&&first<=400000)
        callbackDraws.push(takeUnit());
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
        randomDraws:[takeUnit()],
      });
      if(effect.returnCode!==0||effect.eventPersisted!==false)
        fail('support STARTFUNC must never persist as active EVENT');
      shop=effect.shop;callbackCount++;
      if(effect.message!==null)
        messages.push({eventCode:code,message:effect.message});
      // Source ret=0: no group, startmsg or active event.
      continue;
    }
    if(code==='loto'&&reviewedLoto){
      const count=shop.item[10];
      if(!Number.isSafeInteger(count)||count<0||count>50)
        fail('unreviewed source lottery inventory count');
      const lotteryDraws=Array.from({length:count},()=>takeTicket());
      const effect=projectOriginalLotoStartfunc({
        reviewed:reviewedLoto,shop,randomDraws:lotteryDraws,
      });
      if(effect.returnCode!==0||effect.eventPersisted!==false)
        fail('original lottery must return 0 without activity record');
      shop=effect.shop;callbackCount++;
      lotteryTicketsConsumed+=effect.ticketCountConsumed;
      eventLogEmissions.push(...effect.logs.map(log=>({eventCode:code,...log})));
      lotteryWins.push(...effect.wins.map(win=>({eventCode:code,...win})));
      // Original return 0: every ticket is gone, but no active event.
      continue;
    }
    if(code===B59_IRON_CODE&&reviewedB59Iron){
      const start=projectOriginalIronStart({
        reviewed:reviewedB59Iron,
        startSeconds:world.nowSeconds,spanSeconds:minutes*60,
        randomDraws:[takeUnit(),takeUnit()],
      });
      activeEventState[B59_IRON_CODE]=start.expiresAtSeconds;
      groups.add(event.group);
      eventLogEmissions.push({eventCode:code,
        level:2,shopId:0,message:start.startMessage});
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
    period:{...world.period,eventState:activeEventState},
    receipt:{
      ...sale.receipt,action:'advance-source-time-reviewed-events',
      source:B56_EVENT_SLICE_SOURCE,
      eventHashOrderSupplied:true,
      eventKeysVisited:eventHashOrderFixture.length,
      eventStarts:started,instantCallbacksRun:callbackCount,
      eventMessages:messages,eventDrawsUsed:used,
      lotteryTicketsConsumed,lotteryWins,eventLogEmissions,
      ironEventWasActiveAtDataRead:expiry.wasActive,
      ironEventExpired:expiry.expired,
      ironEventExpiresAtSeconds:activeEventState[B59_IRON_CODE]??null,
      totalDraws:sale.receipt.totalDraws+used,
      eventStateConfirmedEmpty:Object.keys(activeEventState).length===0,
      sourceScope:'B-41 sale/59 PLUS plus all 17 event gates in caller-provided order; unsupported starts reject; internal only, not exact Perl hash order.',
    },
  };
}
