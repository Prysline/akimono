/**
 * B-59: source-locked one durable original Standard Street EVENT
 * plusup-tetu (new iron vein). The fixed item compiler writes
 * $ITEM[5]{plus}=720 to event/plusup-tetu.cgi. Frozen DataRead requires
 * active event files; next turn ITEM #5 PLUS therefore changes from
 * -1200 seconds to +720 seconds BEFORE sale/wholesale processing.
 *
 * This is NOT a general event system, dynamic Perl compiler, or complete
 * multi-period runtime. Unsupported active keys remain fail-closed.
 */
import {parseDsl} from './parse-dsl.mjs';
import {B53_EVENT_CATALOG_SOURCE} from './original-event-compiled-catalog.mjs';
import {ALL_PLUS_SOURCE} from './original-sparse-all-plus.mjs';
import {validateOriginalPeriodSeed} from './original-period-world-seed.mjs';
export const B59_IRON_SOURCE='b59-original-plusup-tetu-durable-event-and-wholesale';
export const B59_IRON_CODE='plusup-tetu';
const fail=s=>{throw new RangeError('B-59 original iron-vein EVENT: '+s);};
const safe=(n,k)=>{if(!Number.isSafeInteger(n)||n<0)fail(k);return n;};
const startMessage='發現新的鐵礦脈';
const endMessage='新的鐵礦脈已經關閉了';
const expected=Object.freeze({
  code:'plusup-tetu',startProba:100,baseTimeSeconds:43200,
  plusTimeSeconds:43200,itemId:5,plusSeconds:720,
  basePlusSeconds:-1200,startMessage,endMessage,
});

export function reviewOriginalB59IronEvent({
  itemDsl,turnSource,compilerSource,readSource,
  compiledCatalog,reviewedAllPlus,model,
}){
  if(compiledCatalog?.source!==B53_EVENT_CATALOG_SOURCE||
     compiledCatalog.compiledCount!==17||
     reviewedAllPlus?.source!==ALL_PLUS_SOURCE||
     reviewedAllPlus.plusSeconds?.length!==79||
     reviewedAllPlus.plusSeconds[4]!==-1200||
     model?.items?.find(x=>x.id===5)?.name!=='鐵塊'||
     typeof compilerSource!=='string'||
     typeof readSource!=='string'||typeof turnSource!=='string')
    fail('source ITEM #5 and EVENT compiler prerequisites');
  const actual=compiledCatalog.compiled.find(e=>e.code===B59_IRON_CODE);
  if(!actual||actual.startProba!==100||
     actual.baseTimeSeconds!==43200||
     actual.plusTimeSeconds!==43200||
     typeof actual.group!=='string'||!actual.group||
     actual.callbacks.start!==null||
     actual.callbacks.end!==null||actual.callbacks.now!==null)
    fail('compiled plusup-tetu event semantics changed');
  const dsl=parseDsl(itemDsl,'custom/inc-item-data.cgi');
  const blocks=dsl.blocks.filter(x=>x.kind==='EVENT'&&
    x.fields.code?.[0]?.value===B59_IRON_CODE);
  if(dsl.issues.length||blocks.length!==1)fail('unique actual iron EVENT declaration');
  const b=blocks[0],val=k=>b.fields[k]?.map(x=>x.value)??[];
  for(const [field,expectedVals] of [
    ['start',['10%']],['basetime',['12h']],['plustime',['12h']],
    ['startmsg',[startMessage]],['endmsg',[endMessage]],
    ['param',['鐵塊\t\t\tplus=720']],
  ]){
    const rows=val(field);
    if(rows.length!==expectedVals.length||
       rows.some((x,i)=>x!==expectedVals[i]))
      fail('original iron source EVENT '+field+' changed');
  }
  for(const field of ['group','startfunc','endfunc','func']){
    if(val(field).length)fail('unexpected original iron '+field);
  }
  for(const literal of [
    'foreach(keys(%DTevent)){require(GetPath($ITEM_DIR,"event",$_));}',
    '%DTevent=split(/,/,$DATA[$idx++]);',
  ])if(!readSource.includes(literal))
    fail('original active event file load changed');
  for(const literal of [
    'if($ope =~ /[\\+\\-\\*]/){$ope.="=";}',
    '$key=~s/^pop$/popular/i;',
    'if($ope ne \'/\')',
    'print EOUTSUB "$keyitem$ope$val;\\n";',
    'my @val=split(/\\t/,$param);',
  ])if(!compilerSource.includes(literal))
    fail('source EVENT ITEM operation compiler changed '+literal);
  // Perl event-s/<key> callback is absent: only event/<key> param file
  // is loaded on DataRead; the 59-item PLUS region precedes expiry/start.
  for(const literal of [
    'require (GetPath($ITEM_DIR,"event"));',
    'DataRead();','CheckWholeStore();',
    '#イベント終了処理','#イベント開始処理',
    '$DTevent{$key}<$temptimenow+$timespan',
    '$DTevent{$key}=$temptimenow+int(rand($timespan))+$E->{basetime}+int(rand($E->{plustime})) if ($E->{basetime}+$E->{plustime});',
    'delete $DTevent{$key};',
    'PushLog(2,0,$E->{startmsg}) if $E->{startmsg};',
    'PushLog(2,0,$E->{endmsg}) if $E->{endmsg};',
  ])if(!turnSource.includes(literal))fail('fixed original event turn changed '+literal);
  if(!(turnSource.indexOf('DataRead();')<
       turnSource.indexOf('#市場商品数のUP/DOWN処理')&&
       turnSource.indexOf('#市場商品数のUP/DOWN処理')<
       turnSource.indexOf('#イベント終了処理')&&
       turnSource.indexOf('#イベント終了処理')<
       turnSource.indexOf('#イベント開始処理')))
    fail('source load/wholesale/expiry/start order changed');
  return Object.freeze({
    source:B59_IRON_SOURCE,...expected,
    group:actual.group,
    expiryStrictBeforeEnd:true,
    sourceItemModifierLoadedOnlyAtDataRead:true,
    publicGameplay:false,
    scope:'single source ITEM #5 iron PLUS override loaded by original DataRead, then original expiry/start 17-key gate; no other active EVENT/period/callbacks',
  });
}
export function isReviewedB59EventPeriod({period,reviewed,nowSeconds}){
  if(reviewed?.source!==B59_IRON_SOURCE||!period||
     typeof period!=='object'||!Number.isSafeInteger(nowSeconds)||
     nowSeconds<0)return false;
  const map=period.eventState;
  if(!map||typeof map!=='object'||Array.isArray(map))return false;
  const keys=Object.keys(map);
  if(keys.some(key=>key!==B59_IRON_CODE)||keys.length>1)return false;
  if(keys.length===1&&(!Number.isSafeInteger(map[B59_IRON_CODE])||
      map[B59_IRON_CODE]<0))return false;
  return validateOriginalPeriodSeed({...period,eventState:{}});
}
export function isB59IronActive({period,reviewed,nowSeconds}){
  if(!isReviewedB59EventPeriod({period,reviewed,nowSeconds}))
    fail('unknown or corrupt world active EVENT map cannot be assumed empty');
  return Object.hasOwn(period.eventState,B59_IRON_CODE);
}
export function projectOriginalIronStart({
  reviewed,startSeconds,spanSeconds,randomDraws,
}){
  if(reviewed?.source!==B59_IRON_SOURCE||
     reviewed.baseTimeSeconds!==43200||
     reviewed.plusTimeSeconds!==43200||
     reviewed.startProba!==100)
    fail('source review prerequisite');
  safe(startSeconds,'start seconds');safe(spanSeconds,'span seconds');
  if(spanSeconds===0||spanSeconds>3600)fail('unreviewed event span');
  if(!Array.isArray(randomDraws)||randomDraws.length!==2||
     randomDraws.some(v=>!Number.isSafeInteger(v)||v<0||v>=1000000))
    fail('exact two original rand(span), rand(plustime) samples');
  const end=startSeconds+Math.trunc(randomDraws[0]*spanSeconds/1000000)+
    reviewed.baseTimeSeconds+
    Math.trunc(randomDraws[1]*reviewed.plusTimeSeconds/1000000);
  safe(end,'expiration seconds');
  return Object.freeze({
    source:reviewed.source,eventCode:B59_IRON_CODE,
    expiresAtSeconds:end,startMessage:reviewed.startMessage,
    randomDrawsUsed:2,
  });
}
export function projectOriginalIronExpiry({
  reviewed,eventState,startSeconds,spanSeconds,
}){
  if(reviewed?.source!==B59_IRON_SOURCE||
     !eventState||typeof eventState!=='object'||Array.isArray(eventState))
    fail('source state for expiry');
  safe(startSeconds,'startSeconds');safe(spanSeconds,'span');
  if(spanSeconds===0||spanSeconds>3600||
     !Number.isSafeInteger(startSeconds+spanSeconds))
    fail('source segment boundary');
  const keys=Object.keys(eventState);
  if(keys.some(x=>x!==B59_IRON_CODE)||keys.length>1)
    fail('unknown active EVENT cannot expire silently');
  const wasActive=keys.length===1;
  const expiresAtSeconds=wasActive?
    safe(eventState[B59_IRON_CODE],'event expiration'):null;
  const expired=wasActive&&expiresAtSeconds<startSeconds+spanSeconds;
  return Object.freeze({
    source:reviewed.source,wasActive,expired,
    occupied:wasActive&&!expired,
    remainingEventState:wasActive&&!expired?
      {[B59_IRON_CODE]:expiresAtSeconds}:{},
    endMessage:expired?reviewed.endMessage:null,
  });
}
