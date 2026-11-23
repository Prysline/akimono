/**
 * R4 reviewed multi-key EVENT fixture: the exact Perl order is supplied by
 * a *same-process original-source oracle*, not derived from DSL or JS maps.
 * Pure and deliberately NOT a committable WorldState transition.
 */
import {R4_DECLARATIVE_EVENT_SOURCE,R4_DECLARATIVE_EVENT_CODES}
  from './original-r4-declarative-event-cycle.mjs';
import {B53_EVENT_CATALOG_SOURCE} from './original-event-compiled-catalog.mjs';
import {projectR4EventItemParams} from './original-r4-event-item-param.mjs';
import {B57_SUPPORT_SOURCE,projectOriginalSupportEventCallback}
  from './original-b57-support-event-callbacks.mjs';
import {B55_SOURCE,projectOriginalInstantEventCallback}
  from './original-instant-event-callbacks.mjs';
import {B58_LOTO_SOURCE,LOTO_RANGE,projectOriginalLotoStartfunc}
  from './original-b58-loto-startfunc.mjs';
import {B60_HAPPY_SOURCE,projectOriginalHappyNow}
  from './original-b60-happy-event-nowfunc.mjs';
import {B59_IRON_SOURCE,B59_IRON_CODE}
  from './original-b59-iron-event-lifecycle.mjs';
import {B61_SWORD_SOURCE,B61_SWORD_CODE}
  from './original-b61-sword-demand-event.mjs';

export const R4_MULTI_EVENT_FIXTURE_SOURCE='r4-original-17-hash-seven-event-interleaved-source-fixture';
const fail=s=>{throw new RangeError('R4 17-hash EVENT fixture: '+s);};
const safe=(n,s)=>{if(!Number.isSafeInteger(n)||n<0)fail(s);return n;};
const unit=n=>Number.isSafeInteger(n)&&n>=0&&n<1000000;
const own=(obj,key)=>Object.hasOwn(obj,key);
const sameKeys=(order,allowed)=>{
  return Array.isArray(order)&&order.length===allowed.length&&
  new Set(order).size===allowed.length&&
  order.every(x=>typeof x==='string'&&allowed.includes(x));
};

export function reviewOriginalR4MultiEventFixture({compiledCatalog,reviewedSeven,
  turnSource,readSource,reviewedSupportCallbacks=null,
  reviewedInstantCallbacks=null,reviewedLotoCallbacks=null,
  reviewedHappyEvent=null,reviewedIronEvent=null,
  reviewedSwordEvent=null}){
  if(compiledCatalog?.source!==B53_EVENT_CATALOG_SOURCE||
     compiledCatalog.compiled?.length!==17||
     reviewedSeven?.source!==R4_DECLARATIVE_EVENT_SOURCE||
     reviewedSeven.committable!==false||
     R4_DECLARATIVE_EVENT_CODES.some(code=>!own(reviewedSeven.events,code)))
    fail('original EVENT and seven declarative source review required');
  for(const [source,marker] of [
    [turnSource,'foreach my $key (keys(%DTevent))'],
    [turnSource,'foreach my $key (keys(%EVENT))'],
    [turnSource,'next if $group{$E->{group}};'],
    [turnSource,'if($DTevent{$key}<$temptimenow+$timespan)'],
    [turnSource,'if(rand(100000)<$timespan*$E->{startproba}/864 || $E->{startproba}==0)'],
    [turnSource,'$DTevent{$key}=$temptimenow+int(rand($timespan))+$E->{basetime}+int(rand($E->{plustime})) if ($E->{basetime}+$E->{plustime});'],
    [readSource,'foreach(keys(%DTevent)){require(GetPath($ITEM_DIR,"event",$_));}'],
  ])if(typeof source!=='string'||!source.includes(marker))
    fail('source drift '+marker);
  if(reviewedSupportCallbacks!==null&&(
     reviewedSupportCallbacks.source!==B57_SUPPORT_SOURCE||
     reviewedSupportCallbacks.gateIncluded!==false||
     reviewedSupportCallbacks.maxMoney!==999999999||
     reviewedSupportCallbacks.hitThreshold!==300))
    fail('source-reviewed support STARTFUNC callbacks required');
  if(reviewedInstantCallbacks!==null&&(
     reviewedInstantCallbacks.source!==B55_SOURCE||
     reviewedInstantCallbacks.eventGateIncluded!==false||
     reviewedInstantCallbacks.robotItem!==64||
     reviewedInstantCallbacks.robotStockIndex!==63||
     reviewedInstantCallbacks.callbackCodes?.join(',')!=='manbiki,goutou'))
    fail('source-reviewed instant STARTFUNC callbacks required');
  if(reviewedLotoCallbacks!==null&&(
     reviewedLotoCallbacks.source!==B58_LOTO_SOURCE||
     reviewedLotoCallbacks.eventCode!=='loto'||
     reviewedLotoCallbacks.ticketId!==11||
     reviewedLotoCallbacks.stockIndex!==10||
     reviewedLotoCallbacks.maxTickets!==50||
     reviewedLotoCallbacks.ticketDrawRange!==LOTO_RANGE||
     reviewedLotoCallbacks.gateIncluded!==false||
     reviewedLotoCallbacks.maxMoney!==999999999))
    fail('source-reviewed loto STARTFUNC callback required');
  if(reviewedHappyEvent!==null&&(
     reviewedHappyEvent.source!==B60_HAPPY_SOURCE||
     reviewedHappyEvent.eventCode!=='happy'||
     reviewedHappyEvent.startProba!==100||
     reviewedHappyEvent.baseTimeSeconds!==18000||
     reviewedHappyEvent.plusTimeSeconds!==18000||
     reviewedHappyEvent.rankCap!==10000||
     reviewedHappyEvent.maxNowSpanSeconds!==36000||
     compiledCatalog.compiled.find(e=>e.code==='happy')?.group!==reviewedHappyEvent.group))
    fail('source-reviewed happy duration and NOWFUNC required');
  if(reviewedHappyEvent!==null){
    for(const marker of ['my $extfile=GetPath($ITEM_DIR,"event-n",$key);',
      'my($msg)=&$func(split(/[:,]/,$E->{funcparam}));',
      'foreach my $key (keys(%DTevent))']){
      if(!turnSource.includes(marker))fail('source NOWFUNC drift '+marker);
    }
  }
  for(const [reviewed,source,code,base,plus] of [
    [reviewedIronEvent,B59_IRON_SOURCE,B59_IRON_CODE,43200,43200],
    [reviewedSwordEvent,B61_SWORD_SOURCE,B61_SWORD_CODE,21600,86400],
  ]){
    if(reviewed===null)continue;
    if(reviewed.source!==source||
       reviewed.startProba!==100||
       reviewed.baseTimeSeconds!==base||
       reviewed.plusTimeSeconds!==plus||
       reviewed.group!==compiledCatalog.compiled.find(e=>e.code===code)?.group||
       reviewed.startMessage!==
         (code===B59_IRON_CODE?'發現新的鐵礦脈':'對劍的需求似乎在增加')||
       reviewed.endMessage!==
         (code===B59_IRON_CODE?'新的鐵礦脈已經關閉了':'劍的需求已恢復正常水平')||
       !Array.isArray(reviewedSeven.params.rules?.[code])||
       reviewedSeven.params.rules[code].length!==
         (code===B59_IRON_CODE?1:5))
      fail('source-reviewed iron/sword EVENT duration and ITEM PARAM required');
  }
  const catalogCodes=compiledCatalog.compiled.map(e=>e.code);
  if(new Set(catalogCodes).size!==17||
     compiledCatalog.compiled.filter(e=>e.startProba===0).length!==2)
    fail('original compiled keys changed');
  for(const e of compiledCatalog.compiled){
    if(!e.group||typeof e.group!=='string')fail('missing source group');
    if(R4_DECLARATIVE_EVENT_CODES.includes(e.code)){
      const v=reviewedSeven.events[e.code];
      for(const k of ['group','startProba','baseTimeSeconds','plusTimeSeconds'])
        if(v[k]!==e[k])fail('source declarative metadata mismatch '+e.code);
      if(e.callbacks.start!==null||e.callbacks.end!==null||
         e.callbacks.now!==null)
        fail('unexpected declarative callback');
    }else if(e.startProba===0&&
      (e.callbacks.start!==null||e.baseTimeSeconds!==0||
       e.plusTimeSeconds!==0))
      fail('unreviewed forced zero-start callback');
  }
  return Object.freeze({source:R4_MULTI_EVENT_FIXTURE_SOURCE,
    eventCodes:Object.freeze(catalogCodes),
    catalog:Object.freeze(compiledCatalog.compiled),
    seven:reviewedSeven,support:reviewedSupportCallbacks,
    instant:reviewedInstantCallbacks,loto:reviewedLotoCallbacks,
    happy:reviewedHappyEvent,iron:reviewedIronEvent,
    sword:reviewedSwordEvent,committable:false,
    orderMode:'explicit-same-Perl-process-hash-order-per-oracle-slice',
    scope:'17 compiled EVENT keys: seven declarative durable events plus optional happy START/END/NOWFUNC, plusup-tetu/ken-sale START/END/DataRead overlays, and getmoney/getpop, manbiki/goutou, loto STARTFUNC; one range-logged RNG; unreviewed rebellion/guild state and WorldState/period still unsupported'});
}

/**
 * Input orders come from the *same* executing Perl process as each original
 * source-slice probe. Missing/extra RNG or unsupported starts reject whole
 * projection without mutating anything. Distinct hash orders of prior
 * DTevent and EVENT must never be conflated.
 */
export function projectOriginalR4MultiEventFixture({reviewed,items,
  startSeconds,spanSeconds,activeUntilSeconds,activeHashOrderFixture,
  eventHashOrderFixture,randomDraws,shop=null,nowHashOrderFixture=null}){
  if(reviewed?.source!==R4_MULTI_EVENT_FIXTURE_SOURCE||
     reviewed.committable!==false||
     reviewed.orderMode!=='explicit-same-Perl-process-hash-order-per-oracle-slice')
    fail('source-reviewed fixture required');
  safe(startSeconds,'startSeconds');
  safe(spanSeconds,'spanSeconds');
  if(spanSeconds<1||spanSeconds>3600||
     !Number.isSafeInteger(startSeconds+spanSeconds))fail('unsupported source span');
  if(!activeUntilSeconds||typeof activeUntilSeconds!=='object'||
     Array.isArray(activeUntilSeconds)||
     !Array.isArray(items)||items.length!==79)
    fail('ITEM and active EVENT source fixture required');
  const keys=Object.keys(activeUntilSeconds);
  if(keys.length>(7+(reviewed.happy!==null?1:0)+
    (reviewed.iron!==null?1:0)+(reviewed.sword!==null?1:0))||
    keys.some(code=>
    !(R4_DECLARATIVE_EVENT_CODES.includes(code)||
      (code==='happy'&&reviewed.happy!==null)||
      (code===B59_IRON_CODE&&reviewed.iron!==null)||
      (code===B61_SWORD_CODE&&reviewed.sword!==null))||
    !Number.isSafeInteger(activeUntilSeconds[code])||
    activeUntilSeconds[code]<0))
    fail('unreviewed active EVENT state');
  if(!sameKeys(activeHashOrderFixture,keys)||
     !sameKeys(eventHashOrderFixture,reviewed.eventCodes))
    fail('exact Perl active and 17 EVENT key permutations required');
  if((reviewed.support===null&&reviewed.instant===null&&reviewed.loto===null&&reviewed.happy===null&&shop!==null)||
     ((reviewed.support!==null||reviewed.instant!==null||reviewed.loto!==null||reviewed.happy!==null)&&
       (!shop||shop.id!==1||shop.status!==1||
        !Array.isArray(shop.item)||shop.item.length!==79)))
    fail('supported callback requires one real source shop');
  if(!Array.isArray(randomDraws)||randomDraws.length>96||
     randomDraws.some(x=>!unit(x)))
    fail('exact bounded original RNG sequence required');

  // The original DataRead loop loads prior active per-event generated ITEM
  // files before any END/START; the original keys(%DTevent) is not sorted.
  let current=items.map((item,i)=>{
    if(!item||item.itemId!==i+1||Array.isArray(item))fail('ITEM source indexing');
    return {...item};
  });
  for(const code of activeHashOrderFixture){
    // happy affects rank only through NOWFUNC; it has no DataRead ITEM overlay.
    if(code==='happy')continue;
    current=projectR4EventItemParams({
      reviewed:reviewed.seven.params,eventCode:code,items:current}).items;
  }
  const next={...activeUntilSeconds},logs=[],started=[],expired=[],
    zeroStartTransient=[],skippedByGroup=[],ranges=[],supportCallbacks=[],
    instantCallbacks=[],lotoCallbacks=[],happyNowCallbacks=[];
  let nextShop=shop===null?null:{...shop,item:[...shop.item]};
  const groups=new Set();
  const end=startSeconds+spanSeconds;
  for(const code of activeHashOrderFixture){
    const event=reviewed.catalog.find(e=>e.code===code);
    if(next[code]<end){
      delete next[code];
      expired.push(code);
      logs.push([2,0,code==='happy'?
        reviewed.happy.endMessage:
        code===B59_IRON_CODE?reviewed.iron.endMessage:
        code===B61_SWORD_CODE?reviewed.sword.endMessage:
        reviewed.seven.events[code].endMessage]);
    }else groups.add(event.group);
  }
  let used=0;
  const draw=(range)=>{
    if(used>=randomDraws.length)fail('original RNG exhausted');
    ranges.push(range);
    return randomDraws[used++]/1000000*range;
  };
  for(const code of eventHashOrderFixture){
    const e=reviewed.catalog.find(x=>x.code===code);
    if(groups.has(e.group)){
      skippedByGroup.push(code);
      continue;
    }
    if(!(draw(100000)<spanSeconds*e.startProba/864||e.startProba===0))
      continue;
    if(R4_DECLARATIVE_EVENT_CODES.includes(code)){
      const meta=reviewed.seven.events[code];
      next[code]=startSeconds+Math.trunc(draw(spanSeconds))+
        meta.baseTimeSeconds+Math.trunc(draw(meta.plusTimeSeconds));
      safe(next[code],'EVENT expiration overflow');
      started.push(code);
      logs.push([2,0,meta.startMessage]);
      groups.add(e.group);
    }else if((code===B59_IRON_CODE&&reviewed.iron!==null)||
             (code===B61_SWORD_CODE&&reviewed.sword!==null)){
      const meta=code===B59_IRON_CODE?reviewed.iron:reviewed.sword;
      next[code]=startSeconds+Math.trunc(draw(spanSeconds))+
        meta.baseTimeSeconds+Math.trunc(draw(meta.plusTimeSeconds));
      safe(next[code],'original sourced ore/sword EVENT expiration overflow');
      started.push(code);
      logs.push([2,0,meta.startMessage]);
      groups.add(e.group);
    }else if(code==='happy'&&reviewed.happy!==null){
      // Source has no STARTFUNC: START then two duration rand calls.
      const meta=reviewed.happy;
      next.happy=startSeconds+Math.trunc(draw(spanSeconds))+
        meta.baseTimeSeconds+Math.trunc(draw(meta.plusTimeSeconds));
      safe(next.happy,'original happy expiration overflow');
      started.push(code);
      logs.push([2,0,meta.startMessage]);
      groups.add(e.group);
    }else if((code==='getmoney'||code==='getpop')&&
       reviewed.support!==null){
      // The frozen source STARTFUNC returns 0: it consumes one rand(1000),
      // logs a message on hit, and reserves neither group nor DTevent.
      const sample=randomDraws[used];
      draw(1000);
      const callback=projectOriginalSupportEventCallback({
        reviewed:reviewed.support,eventCode:code,shop:nextShop,
        randomDraws:[sample],
      });
      if(callback.returnCode!==0||callback.eventPersisted!==false||
         callback.randomDrawsUsed!==1)
        fail('reviewed support STARTFUNC must return 0');
      nextShop=callback.shop;
      supportCallbacks.push(code);
      if(callback.message!==null)logs.push([2,0,callback.message]);
    }else if((code==='manbiki'||code==='goutou')&&
       reviewed.instant!==null){
      // Actual frozen source: each callback scans the reviewed one shop;
      // first rand(1000) decides hit, and robot-protected manbiki consumes
      // a SECOND rand(1000). If source STARTFUNC returns 0, do not hold group.
      const firstSample=randomDraws[used];
      const firstValue=draw(1000);
      const takesRobotDraw=code==='manbiki'&&
        firstValue<=400&&nextShop?.item?.[63]>0;
      const samples=[firstSample];
      if(takesRobotDraw){
        samples.push(randomDraws[used]);
        draw(1000);
      }
      const callback=projectOriginalInstantEventCallback({
        reviewed:reviewed.instant,eventCode:code,shop:nextShop,
        randomDraws:samples,
      });
      if(callback.returnCode!==0||callback.eventPersisted!==false||
         callback.randomDrawsUsed!==samples.length)
        fail('reviewed instant STARTFUNC must return 0');
      nextShop=callback.shop;
      instantCallbacks.push(code);
      if(callback.message!==null)logs.push([2,0,callback.message]);
    }else if(code==='loto'&&reviewed.loto!==null){
      // Consume exactly one original rand(6096454) per owned ticket, in
      // the same sequence as the other 17 hash-gated event callbacks.
      const count=nextShop?.item?.[10];
      if(!Number.isSafeInteger(count)||count<0||count>50)
        fail('source lotto ticket count out of bounds');
      const ticketDraws=[];
      for(let i=0;i<count;i++)ticketDraws.push(Math.trunc(draw(LOTO_RANGE)));
      const callback=projectOriginalLotoStartfunc({
        reviewed:reviewed.loto,shop:nextShop,randomDraws:ticketDraws,
      });
      if(callback.returnCode!==0||callback.eventPersisted!==false||
         callback.randomDrawsUsed!==count||
         callback.ticketCountConsumed!==count)
        fail('reviewed loto STARTFUNC must consume all tickets and return zero');
      nextShop=callback.shop;
      lotoCallbacks.push(code);
      for(const log of callback.logs)logs.push([log.level,log.shopId,log.message]);
    }else if(e.startProba===0&&e.callbacks.start===null&&
       e.baseTimeSeconds===0&&e.plusTimeSeconds===0){
      // Original START=0 still calls rand(100000), then ret=1.
      // Without duration it only reserves group this slice.
      zeroStartTransient.push(code);
      groups.add(e.group);
    }else fail('unsupported original source EVENT started: '+code);
  }
  // The frozen inc-turn NOWFUNC loop follows *all* END/START callbacks.
  // A newly started happy EVENT is included immediately, and an expired
  // happy EVENT runs only if restarted. No JS/DSL declaration order is used.
  if(reviewed.happy!==null){
    if(!sameKeys(nowHashOrderFixture,Object.keys(next)))
      fail('exact Perl post-START active EVENT hash order required');
    for(const code of nowHashOrderFixture){
      if(code!=='happy')continue;
      const range=Math.trunc(Math.min(spanSeconds,
        reviewed.happy.maxNowSpanSeconds)/36);
      if(range<1)fail('source happy NOWFUNC rand(0) not reviewed');
      const sample=randomDraws[used];
      draw(range);
      const callback=projectOriginalHappyNow({
        reviewed:reviewed.happy,shop:nextShop,
        timespanSeconds:spanSeconds,randomDraws:[sample],
      });
      if(callback.returnCode!==0||callback.randomDrawsUsed!==1||
         callback.randMax!==range)
        fail('reviewed happy NOWFUNC contract violation');
      nextShop=callback.shop;
      happyNowCallbacks.push(code);
    }
  }
  if(used!==randomDraws.length)fail('unused original RNG samples');
  return Object.freeze({
    source:reviewed.source,committable:false,
    dataReadItems:Object.freeze(current.map(item=>Object.freeze(item))),
    activeUntilSeconds:Object.freeze(next),
    started:Object.freeze(started),expired:Object.freeze(expired),
    zeroStartTransient:Object.freeze(zeroStartTransient),
    skippedByGroup:Object.freeze(skippedByGroup),
    logs:Object.freeze(logs.map(log=>Object.freeze(log))),
    randomDrawRanges:Object.freeze(ranges),drawsUsed:used,
    ...(reviewed.support===null&&reviewed.instant===null&&reviewed.loto===null&&reviewed.happy===null?{}:{
      shop:Object.freeze({...nextShop,item:Object.freeze([...nextShop.item])}),
      supportCallbacks:Object.freeze(supportCallbacks),
      instantCallbacks:Object.freeze(instantCallbacks),
      lotoCallbacks:Object.freeze(lotoCallbacks),
      happyNowCallbacks:Object.freeze(happyNowCallbacks),
    }),
    sourceScope:reviewed.scope,
  });
}
