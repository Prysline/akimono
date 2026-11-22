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
  reviewedInstantCallbacks=null}){
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
    instant:reviewedInstantCallbacks,committable:false,
    orderMode:'explicit-same-Perl-process-hash-order-per-oracle-slice',
    scope:'full 17 compiled keys: seven declarative durable EVENTs, optional getmoney/getpop and manbiki/goutou source STARTFUNC with one shared source-gated RNG; unreviewed starts reject, single-shop only; not full 17 callbacks, period/save'});
}

/**
 * Input orders come from the *same* executing Perl process as each original
 * source-slice probe. Missing/extra RNG or unsupported starts reject whole
 * projection without mutating anything. Distinct hash orders of prior
 * DTevent and EVENT must never be conflated.
 */
export function projectOriginalR4MultiEventFixture({reviewed,items,
  startSeconds,spanSeconds,activeUntilSeconds,activeHashOrderFixture,
  eventHashOrderFixture,randomDraws,shop=null}){
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
  if(keys.length>7||keys.some(code=>
    !R4_DECLARATIVE_EVENT_CODES.includes(code)||
    !Number.isSafeInteger(activeUntilSeconds[code])||
    activeUntilSeconds[code]<0))
    fail('unreviewed active EVENT state');
  if(!sameKeys(activeHashOrderFixture,keys)||
     !sameKeys(eventHashOrderFixture,reviewed.eventCodes))
    fail('exact Perl active and 17 EVENT key permutations required');
  if((reviewed.support===null&&reviewed.instant===null&&shop!==null)||
     ((reviewed.support!==null||reviewed.instant!==null)&&
       (!shop||shop.id!==1||shop.status!==1||
        !Array.isArray(shop.item)||shop.item.length!==79)))
    fail('supported callback requires one real source shop');
  if(!Array.isArray(randomDraws)||randomDraws.length>51||
     randomDraws.some(x=>!unit(x)))
    fail('exact bounded original RNG sequence required');

  // The original DataRead loop loads prior active per-event generated ITEM
  // files before any END/START; the original keys(%DTevent) is not sorted.
  let current=items.map((item,i)=>{
    if(!item||item.itemId!==i+1||Array.isArray(item))fail('ITEM source indexing');
    return {...item};
  });
  for(const code of activeHashOrderFixture){
    current=projectR4EventItemParams({
      reviewed:reviewed.seven.params,eventCode:code,items:current}).items;
  }
  const next={...activeUntilSeconds},logs=[],started=[],expired=[],
    zeroStartTransient=[],skippedByGroup=[],ranges=[],supportCallbacks=[],
    instantCallbacks=[];
  let nextShop=shop===null?null:{...shop,item:[...shop.item]};
  const groups=new Set();
  const end=startSeconds+spanSeconds;
  for(const code of activeHashOrderFixture){
    const event=reviewed.catalog.find(e=>e.code===code);
    if(next[code]<end){
      delete next[code];
      expired.push(code);
      logs.push([2,0,reviewed.seven.events[code].endMessage]);
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
    }else if(e.startProba===0&&e.callbacks.start===null&&
       e.baseTimeSeconds===0&&e.plusTimeSeconds===0){
      // Original START=0 still calls rand(100000), then ret=1.
      // Without duration it only reserves group this slice.
      zeroStartTransient.push(code);
      groups.add(e.group);
    }else fail('unsupported original source EVENT started: '+code);
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
    ...(reviewed.support===null&&reviewed.instant===null?{}:{
      shop:Object.freeze({...nextShop,item:Object.freeze([...nextShop.item])}),
      supportCallbacks:Object.freeze(supportCallbacks),
      instantCallbacks:Object.freeze(instantCallbacks),
    }),
    sourceScope:reviewed.scope,
  });
}
