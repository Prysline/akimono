/**
 * R4: seven original Standard Street declarative EVENTs, source-backed.
 * A bounded, pure single-EVENT lifecycle + original DataRead ITEM overlays.
 *
 * Intentionally NOT a committable WorldState, Perl hash traversal, random
 * stream emulator, full EVENT gate, or multi-period game turn.
 */
import {parseDsl} from './parse-dsl.mjs';
import {B53_EVENT_CATALOG_SOURCE} from './original-event-compiled-catalog.mjs';
import {R4_EVENT_PARAM_SOURCE,projectR4EventItemParams}
  from './original-r4-event-item-param.mjs';

export const R4_DECLARATIVE_EVENT_SOURCE='r4-original-seven-declarative-event-source-cycle';
export const R4_DECLARATIVE_EVENT_CODES=Object.freeze([
  'boom-posyon','tate-sale','yoroi-sale','tue-sale',
  'plusdown-yakusou','plusup-misuriru','plusup-oriharukon',
]);
const fail=m=>{throw new RangeError('R4 declarative EVENT cycle: '+m);};
const safe=(n,label)=>{if(!Number.isSafeInteger(n)||n<0)fail(label);return n;};
const unit=n=>Number.isSafeInteger(n)&&n>=0&&n<1000000;
const value=(b,key)=>b.fields[key]?.map(x=>x.value)??[];

export function reviewOriginalR4DeclarativeEventCycle({
  compiledCatalog,reviewedParams,itemDsl,turnSource,readSource,
}){
  if(compiledCatalog?.source!==B53_EVENT_CATALOG_SOURCE||
     compiledCatalog.compiledCount!==17||
     reviewedParams?.source!==R4_EVENT_PARAM_SOURCE||
     reviewedParams.committable!==false)
    fail('original 17 EVENT compiler and ITEM PARAM review required');
  const markers=[
    [turnSource,'if($DTevent{$key}<$temptimenow+$timespan)'],
    [turnSource,'next if $group{$E->{group}};'],
    [turnSource,'if(rand(100000)<$timespan*$E->{startproba}/864 || $E->{startproba}==0)'],
    [turnSource,'$DTevent{$key}=$temptimenow+int(rand($timespan))+$E->{basetime}+int(rand($E->{plustime})) if ($E->{basetime}+$E->{plustime});'],
    [readSource,'foreach(keys(%DTevent)){require(GetPath($ITEM_DIR,"event",$_));}'],
  ];
  for(const [source,needle]of markers)
    if(typeof source!=='string'||!source.includes(needle))
      fail('frozen original source drift '+needle);
  const markersInOrder=['#イベント終了処理','#イベント開始処理',
    'my $extfile=GetPath($ITEM_DIR,"event-n",$key);'];
  let position=-1;
  for(const marker of markersInOrder){
    position=turnSource.indexOf(marker,position+1);
    if(position<0)fail('original lifecycle order drift '+marker);
  }
  const parsed=parseDsl(itemDsl,'custom/inc-item-data.cgi');
  if(parsed.issues.length)fail('source EVENT DSL parsing changed');
  const records={};
  for(const code of R4_DECLARATIVE_EVENT_CODES){
    const e=compiledCatalog.compiled.find(x=>x.code===code);
    const blocks=parsed.blocks.filter(x=>x.kind==='EVENT'&&value(x,'code')[0]===code);
    const rules=reviewedParams.rules?.[code];
    if(!e||blocks.length!==1||!Array.isArray(rules)||!rules.length||
       e.startProba<=0||!e.baseTimeSeconds||!e.plusTimeSeconds||
       !e.group||e.callbacks.start!==null||
       e.callbacks.end!==null||e.callbacks.now!==null)
      fail('unsupported declarative source EVENT '+code);
    const b=blocks[0],start=value(b,'start');
    const startMessage=value(b,'startmsg'),endMessage=value(b,'endmsg');
    if(start.length!==1||startMessage.length!==1||
       endMessage.length!==1||!startMessage[0]||!endMessage[0]||
       value(b,'startfunc').length||value(b,'endfunc').length||
       value(b,'func').length||
       value(b,'param').length!==rules.length)
      fail('EVENT callbacks/messages/PARAM declaration drift '+code);
    records[code]=Object.freeze({
      code,group:e.group,startProba:e.startProba,
      baseTimeSeconds:e.baseTimeSeconds,plusTimeSeconds:e.plusTimeSeconds,
      startMessage:startMessage[0],endMessage:endMessage[0],
      paramCount:rules.length,
    });
  }
  if(Object.keys(records).length!==7)fail('expected exactly seven events');
  return Object.freeze({source:R4_DECLARATIVE_EVENT_SOURCE,
    events:Object.freeze(records),params:reviewedParams,
    committable:false,
    scope:'seven source-declarative original EVENT lifecycle and DataRead ITEM overlay, single isolated key only; no 17-key Perl hash order, global RNG, actual WorldState, 36h or save'});
}

/**
 * Source stage order: DataRead loads OLD active EVENT params first;
 * original END then START runs after market/PLUS; a just-started EVENT
 * changes ITEMs only on a later DataRead, never retroactively.
 *
 * The isolated source harness has one EVENT key, so Perl keys order is
 * immaterial; caller supplies the exact uniform-millionth rand samples.
 */
export function projectOriginalR4DeclarativeEventCycle({
  reviewed,eventCode,items,startSeconds,spanSeconds,
  activeUntilSeconds=null,randomDraws,
}){
  if(reviewed?.source!==R4_DECLARATIVE_EVENT_SOURCE||
     reviewed.committable!==false||!Object.hasOwn(reviewed.events??{},eventCode))
    fail('reviewed declarative EVENT key required');
  safe(startSeconds,'start seconds');
  safe(spanSeconds,'span seconds');
  if(spanSeconds<1||spanSeconds>3600||
     !Number.isSafeInteger(startSeconds+spanSeconds))
    fail('unreviewed source time span');
  if(activeUntilSeconds!==null)safe(activeUntilSeconds,'EVENT expiration');
  if(!Array.isArray(randomDraws)||randomDraws.length>3||
     randomDraws.some(x=>!unit(x)))
    fail('exact source uniform millionth draws required');
  if(!Array.isArray(items)||items.length!==79)
    fail('79 ITEM DataRead fixture required');
  const event=reviewed.events[eventCode];
  const activeAtDataRead=activeUntilSeconds!==null;
  const dataRead=activeAtDataRead?
    projectR4EventItemParams({reviewed:reviewed.params,eventCode,items}).items:
    Object.freeze(items.map((item,i)=>{
      if(!item||item.itemId!==i+1||Array.isArray(item))
        fail('original ITEM indexing drift');
      return Object.freeze({...item});
    }));
  let used=0;
  const take=()=>{
    if(used>=randomDraws.length)fail('missing original event rand');
    return randomDraws[used++];
  };
  const end=startSeconds+spanSeconds;
  const expired=activeAtDataRead&&activeUntilSeconds<end;
  let next=expired?null:activeUntilSeconds;
  const logs=[];
  if(expired)logs.push([2,0,event.endMessage]);
  let started=false;
  if(next===null){
    // Original evaluates rand(100000) for each eligible event even if
    // the chance is low. The 7 isolated events all have positive START.
    const gate=take()*100000/1000000;
    if(gate<spanSeconds*event.startProba/864){
      next=startSeconds+Math.trunc(take()*spanSeconds/1000000)+
        event.baseTimeSeconds+
        Math.trunc(take()*event.plusTimeSeconds/1000000);
      safe(next,'new EVENT expiry');
      started=true;
      logs.push([2,0,event.startMessage]);
    }
  }
  if(used!==randomDraws.length)fail('unused original event rand');
  return Object.freeze({
    source:R4_DECLARATIVE_EVENT_SOURCE,eventCode,
    activeAtDataRead,expired,started,activeUntilSeconds:next,
    dataReadItems:dataRead,logs:Object.freeze(logs.map(x=>Object.freeze(x))),
    drawsUsed:used,committable:false,
  });
}
