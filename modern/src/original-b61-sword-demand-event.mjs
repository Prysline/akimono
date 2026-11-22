/**
 * B-61 source-reviewed Standard Street EVENT "ken-sale": sword demand.
 * Original DataRead loads event/ken-sale CGI before natural-sale supply,
 * generated original Perl divides popular seconds of ITEM #40..44 by two.
 * EVENT START doesn't retroactively change the first slice; next DataRead
 * applies popular/2. This slice still sells only real ITEM #10. For swords
 * we expose source arithmetic as a read-only demand forecast, NOT fabricated
 * sword inventory/sales or changed nominal item prices.
 */
import {parseDsl} from './parse-dsl.mjs';
import {B53_EVENT_CATALOG_SOURCE} from './original-event-compiled-catalog.mjs';
import {validateOriginalPeriodSeed} from './original-period-world-seed.mjs';

export const B61_SWORD_SOURCE='b61-original-ken-sale-demand-persistent-event';
export const B61_SWORD_CODE='ken-sale';
const fail=s=>{throw new RangeError('B-61 source sword-demand EVENT: '+s);};
const required=Object.freeze([
  {itemId:40,name:'木刀',pop:'3h',base:10800},
  {itemId:41,name:'鐵劍',pop:'3h',base:10800},
  {itemId:42,name:'鋼鐵劍',pop:'5h',base:18000},
  {itemId:43,name:'秘銀劍',pop:'10h',base:36000},
  {itemId:44,name:'奧利哈鋼劍',pop:'16h',base:57600},
]);
const expected=Object.freeze({
  eventCode:B61_SWORD_CODE,startProba:100,
  baseTimeSeconds:21600,plusTimeSeconds:86400,
  startMessage:'對劍的需求似乎在增加',
  endMessage:'劍的需求已恢復正常水平',
});
const safe=(n,k,min=0)=>{
  if(!Number.isSafeInteger(n)||n<min)fail(k);
  return n;
};
const val=(b,k)=>b?.fields[k]?.map(x=>x.value)??[];
export function reviewOriginalB61SwordDemand({
  itemDsl,compiledCatalog,turnSource,compilerSource,readSource,model,
}){
  const e=compiledCatalog?.compiled?.find(x=>x.code===B61_SWORD_CODE);
  if(compiledCatalog?.source!==B53_EVENT_CATALOG_SOURCE||
     compiledCatalog.compiledCount!==17||!e||
     e.startProba!==100||e.baseTimeSeconds!==21600||
     e.plusTimeSeconds!==86400||e.callbacks.start!==null||
     e.callbacks.end!==null||e.callbacks.now!==null||
     typeof e.group!=='string'||!e.group)
    fail('original compiled ken-sale EVENT drift');
  const parsed=parseDsl(itemDsl,'custom/inc-item-data.cgi');
  const blocks=parsed.blocks;
  const events=blocks.filter(x=>x.kind==='EVENT'&&
    val(x,'code')[0]===B61_SWORD_CODE);
  if(parsed.issues.length||events.length!==1)
    fail('original ken-sale unique source required');
  const b=events[0];
  for(const [k,values]of [
    ['code',[B61_SWORD_CODE]],['start',['10%']],
    ['basetime',['6h']],['plustime',['24h']],
    ['startmsg',[expected.startMessage]],
    ['endmsg',[expected.endMessage]],
  ]){
    const actual=val(b,k);
    if(actual.length!==values.length||
       actual.some((x,i)=>x!==values[i]))fail('source EVENT '+k+' changed');
  }
  for(const k of ['startfunc','endfunc','func','group'])
    if(val(b,k).length)fail('unreviewed source event '+k);
  if(val(b,'param').length!==5)fail('original five sword PARAM rows required');
  const resolved=[];
  for(let i=0;i<required.length;i++){
    const r=required[i],item=model?.items?.find(x=>x.id===r.itemId);
    const sourceItem=blocks.find(x=>x.kind==='ITEM'&&
      val(x,'no')[0]===String(r.itemId));
    const tokens=val(b,'param')[i]?.split(/\s+/);
    if(tokens?.length!==2||tokens[0]!==r.name||
       tokens[1]!=='pop/2'||item?.name!==r.name||
       sourceItem===undefined||val(sourceItem,'name')[0]!==r.name||
       val(sourceItem,'pop')[0]!==r.pop)
      fail('source sword item/popular division drift #'+r.itemId);
    resolved.push(Object.freeze({
      itemId:r.itemId,name:r.name,
      basePopularSeconds:r.base,
      eventPopularSeconds:Math.trunc(r.base/2),
      operation:'pop/2',
    }));
  }
  const markers=[
    [compilerSource,'$key=~s/^pop$/popular/i;'],
    [compilerSource,'$keyitem=int($keyitem/$val);'],
    [compilerSource,'my $keyitem="\$ITEM[".GetItemNumber($val[0])."]->{$key}";'],
    [readSource,'%DTevent=split(/,/,$DATA[$idx++]);'],
    [readSource,'foreach(keys(%DTevent)){require(GetPath($ITEM_DIR,"event",$_));}'],
    [turnSource,'DataRead();'],
    [turnSource,'$ITEM->{buypeople}=$DTpeople*$SALE_SPEED/$ITEM->{popular}*$timespan/86400;'],
    [turnSource,'#市場商品数のUP/DOWN処理'],
    [turnSource,'#イベント終了処理'],
    [turnSource,'#イベント開始処理'],
    [turnSource,'$DTevent{$key}<$temptimenow+$timespan'],
  ];
  for(const [s,fragment]of markers)
    if(typeof s!=='string'||!s.includes(fragment))
      fail('original EVENT market-demand source drift '+fragment);
  const idx=(n)=>turnSource.indexOf(n);
  if(!(idx('DataRead();')<
    idx('$ITEM->{buypeople}=$DTpeople*$SALE_SPEED/$ITEM->{popular}*$timespan/86400;')&&
    idx('$ITEM->{buypeople}=$DTpeople*$SALE_SPEED/$ITEM->{popular}*$timespan/86400;')<
    idx('#市場商品数のUP/DOWN処理')&&
    idx('#市場商品数のUP/DOWN処理')<
    idx('#イベント終了処理')&&
    idx('#イベント終了処理')<idx('#イベント開始処理')))
    fail('DataRead buyer demand/wholesale/event order changed');
  return Object.freeze({
    source:B61_SWORD_SOURCE,...expected,
    group:e.group,swordItems:Object.freeze(resolved),
    scope:'DataRead source ITEM40..44 popular/2 only when ken-sale active at beginning; read-only sword potential buyers with fixed DTpeople/speed, no sword sale or actual price change',
    publicGameplay:false,
  });
}
export function isReviewedB61SwordPeriod({period,reviewed,nowSeconds}){
  if(reviewed?.source!==B61_SWORD_SOURCE||!period||
     typeof period!=='object'||!Number.isSafeInteger(nowSeconds)||
     nowSeconds<0||!period.eventState||
     typeof period.eventState!=='object'||
     Array.isArray(period.eventState))return false;
  const map=period.eventState,keys=Object.keys(map);
  if(keys.some(k=>k!==B61_SWORD_CODE)||keys.length>1)return false;
  if(keys.length===1&&(!Number.isSafeInteger(map[B61_SWORD_CODE])||
     map[B61_SWORD_CODE]<0))return false;
  return validateOriginalPeriodSeed({...period,eventState:{}});
}
export function projectOriginalSwordStart({
  reviewed,startSeconds,spanSeconds,randomDraws,
}){
  if(reviewed?.source!==B61_SWORD_SOURCE||
     reviewed.startProba!==100||
     reviewed.baseTimeSeconds!==21600||
     reviewed.plusTimeSeconds!==86400)
    fail('source-reviewed sword event required');
  safe(startSeconds,'start');safe(spanSeconds,'span',1);
  if(spanSeconds>3600||!Array.isArray(randomDraws)||
     randomDraws.length!==2||randomDraws.some(n=>
       !Number.isSafeInteger(n)||n<0||n>=1000000))
    fail('exact two source duration random draws required');
  const expiresAtSeconds=startSeconds+
    Math.trunc(randomDraws[0]*spanSeconds/1000000)+21600+
    Math.trunc(randomDraws[1]*86400/1000000);
  safe(expiresAtSeconds,'event expiration');
  return Object.freeze({
    eventCode:B61_SWORD_CODE,source:reviewed.source,
    expiresAtSeconds,startMessage:reviewed.startMessage,
    randomDrawsUsed:2,
  });
}
export function projectOriginalSwordExpiry({
  reviewed,eventState,startSeconds,spanSeconds,
}){
  if(reviewed?.source!==B61_SWORD_SOURCE||!eventState||
     typeof eventState!=='object'||Array.isArray(eventState))
    fail('sword expiry source prerequisites');
  safe(startSeconds,'start');safe(spanSeconds,'span',1);
  if(spanSeconds>3600||!Number.isSafeInteger(startSeconds+spanSeconds))
    fail('unreviewed event span');
  const keys=Object.keys(eventState);
  if(keys.some(k=>k!==B61_SWORD_CODE)||keys.length>1)
    fail('unknown active sword EVENT state');
  const wasActive=keys.length===1;
  const at=wasActive?safe(eventState[B61_SWORD_CODE],'expiration'):null;
  const expired=wasActive&&at<startSeconds+spanSeconds;
  return Object.freeze({
    wasActive,expired,occupied:wasActive&&!expired,
    remainingEventState:wasActive&&!expired?{[B61_SWORD_CODE]:at}:{},
    endMessage:expired?reviewed.endMessage:null,
  });
}
export function projectOriginalSwordDemand({
  reviewed,timespanSeconds,activeAtDataRead,population=500000,
  saleSpeed=12,
}){
  if(reviewed?.source!==B61_SWORD_SOURCE||
     reviewed.swordItems?.length!==5||
     reviewed.swordItems.some((x,i)=>x.itemId!==40+i||
       x.eventPopularSeconds!==Math.trunc(x.basePopularSeconds/2))||
     typeof activeAtDataRead!=='boolean'||population!==500000||
     saleSpeed!==12)
    fail('original source demand prerequisites');
  safe(timespanSeconds,'timespan',1);
  if(timespanSeconds>3600)fail('unreviewed source span');
  return Object.freeze({
    source:reviewed.source,eventCode:B61_SWORD_CODE,
    activeAtDataRead,elapsedSeconds:timespanSeconds,
    rows:reviewed.swordItems.map(x=>{
      const popularSeconds=activeAtDataRead?
        x.eventPopularSeconds:x.basePopularSeconds;
      // Literal original inc-turn: ITEM buypeople is potential total
      // visitors, NOT sold quantity. Without #40..44 showcased, NONE
      // of these estimates may become a real #10 shop sale.
      const potentialBuyers=population*saleSpeed/popularSeconds*
        timespanSeconds/86400;
      return {
        itemId:x.itemId,name:x.name,
        basePopularSeconds:x.basePopularSeconds,
        effectivePopularSeconds:popularSeconds,
        potentialBuyers,
        nominalPriceChanged:false,
        realSwordSalesSupported:false,
      };
    }),
    sourceScope:'actual original five sword popular/2 economics from DataRead; no sword shelf/transactions or synthetic sales',
  });
}
