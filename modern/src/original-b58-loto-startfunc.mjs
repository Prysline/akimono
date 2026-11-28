/**
 * B-58: actual frozen Standard Street EVENT loto STARTFUNC. Each owned
 * ITEM #11 ticket is consumed before one original rand(6096454) per ticket.
 * Source WriteLog calls are preserved as structured receipt-side emissions;
 * persistent world log mechanics have NOT been ported. Source Perl oracle
 * runs the actual unmodified callback body with deterministic integer return
 * values for rand(6096454), not reconstructed runtime PRNG.
 */
import {B53_EVENT_CATALOG_SOURCE} from './original-event-compiled-catalog.mjs';
import {B58_MARKET11_SOURCE} from './original-market-buy11.mjs';
import {B57_SUPPORT_SOURCE} from './original-b57-support-event-callbacks.mjs';
import {validateNormalCommerceInventory} from './reviewed-normal-commerce-items.mjs';
export const B58_LOTO_SOURCE='b58-original-loto-startfunc-inventory-prize-log';
export const LOTO_RANGE=6096454;
const MAX_MONEY=999999999;
const FAIL=s=>{throw new RangeError('B-58 original loto EVENT: '+s);};
const expectedBody=Object.freeze([
  'WriteLog(2,0,"抽獎卷的開獎開始了");',
  'foreach my $DT (@DT)',
  '{',
  'my $count=$DT->{item}[11-1];',
  '$DT->{item}[11-1]=0;',
  'next if !$count;',
  'foreach(1..$count)',
  '{',
  'my $rnd=rand(6096454);',
  'my $hit=0;',
  '$hit=5 if $rnd<152411;',
  '$hit=4 if $rnd<10000;',
  '$hit=3 if $rnd<216;',
  '$hit=2 if $rnd<6;',
  '$hit=1 if $rnd<1;',
  'if($hit)',
  '{',
  'my $getmoney=(0,1000000000,150000000,5000000,100000,10000)[$hit];',
  '$DT->{money}+=$getmoney;',
  '$DT->{money}=$main::MAX_MONEY if $DT->{money}>$main::MAX_MONEY;',
  'WriteLog(($hit<=3?1:2),0,$DT->{shopname}."抽中了$hit等獎，".GetMoneyString($getmoney)."！");',
  '}',
  '}',
  '}',
  'return 0;',
]);
function sourceBody(itemDsl){
  if(typeof itemDsl!=='string')FAIL('missing fixed original DSL');
  const blocks=itemDsl.split(/^@@EVENT[^\r\n]*\r?\n/gmi).slice(1)
    .map(part=>part.split(/^@@(?:ITEM|DEFINE|END|FUNC[A-Z]+)[^\r\n]*$/mi)[0]);
  const found=blocks.filter(b=>/^[ \t]*code[ \t]+loto(?:[ \t]|$)/m.test(b));
  if(found.length!==1)FAIL('source loto EVENT changed or duplicated');
  const m=found[0].match(
    /^[ \t]*startfunc[ \t]+([^\s#]+)[^\r\n]*\r?\n([\s\S]*?)^[ \t]*_local_[ \t]*$/m);
  if(!m||m[1]!=='_local_')FAIL('source loto callback startfunc moved');
  return m[2].split(/\r?\n/).map(x=>x.trim())
    .filter(x=>x&&!x.startsWith('#'));
}
export function reviewOriginalLotoStartfunc({
  itemDsl,turnSource,compiledCatalog,reviewedMarket11,
  reviewedSupportCallbacks,
}){
  const entry=compiledCatalog?.compiled?.find(x=>x.code==='loto');
  if(compiledCatalog?.source!==B53_EVENT_CATALOG_SOURCE||
     compiledCatalog.compiledCount!==17||
     entry?.startProba!==500||entry.callbacks?.start!=='_local_'||
     entry.callbacks?.now!==null||entry.callbacks?.end!==null||
     entry.baseTimeSeconds!==0||entry.plusTimeSeconds!==0||
     reviewedMarket11?.source!==B58_MARKET11_SOURCE||
     reviewedMarket11.itemId!==11||reviewedMarket11.stockLimit!==50||
     reviewedMarket11.upkeepPerTicket!==10||
     reviewedSupportCallbacks?.source!==B57_SUPPORT_SOURCE||
     reviewedSupportCallbacks.maxMoney!==MAX_MONEY||
     typeof turnSource!=='string'||
     !turnSource.includes('($ret,$msg)=&$func(split(/[:,]/,$E->{startfuncparam}));')||
     !turnSource.includes('if($ret)'))
    FAIL('original event compiler/market/cap/source contracts changed');
  const actual=sourceBody(itemDsl);
  if(actual.length!==expectedBody.length||
     actual.some((line,i)=>line!==expectedBody[i]))
    FAIL('original complete loto STARTFUNC source body changed');
  return Object.freeze({
    source:B58_LOTO_SOURCE,eventCode:'loto',ticketId:11,
    stockIndex:10,maxTickets:50,startProba:500,
    ticketDrawRange:LOTO_RANGE,maxMoney:MAX_MONEY,
    gateIncluded:false,publicGameplay:false,
    prizeByRank:Object.freeze([0,1000000000,150000000,5000000,100000,10000]),
    scope:'real source Perl loto STARTFUNC one-shop tickets/award/log emissions; no original hash RNG or persisted world log',
  });
}
export function projectOriginalLotoStartfunc({reviewed,shop,randomDraws,reviewedInventory=null}){
  const expanded=reviewedInventory?.normalCommerce??null;
  if(expanded!==null)validateNormalCommerceInventory(shop,reviewedInventory.compiled,expanded);
  if(reviewed?.source!==B58_LOTO_SOURCE||
     reviewed.ticketId!==11||reviewed.stockIndex!==10||
     reviewed.maxTickets!==50||reviewed.startProba!==500||
     reviewed.ticketDrawRange!==LOTO_RANGE||reviewed.maxMoney!==MAX_MONEY)
    FAIL('reviewed source loto contract missing');
  if(shop?.id!==1||shop.status!==1||
     typeof shop.shopname!=='string'||!shop.shopname||
     !Array.isArray(shop.item)||shop.item.length!==79||
     shop.item.some(x=>!Number.isSafeInteger(x)||x<0)||
     !Number.isSafeInteger(shop.money)||(expanded===null&&(shop.money<0||shop.money>MAX_MONEY)))
    FAIL('reviewed real source single-shop or inventory invalid');
  const count=shop.item[10];
  if(count>reviewed.maxTickets)FAIL('original ticket carrying cap exceeded');
  if(!Array.isArray(randomDraws)||randomDraws.length!==count||
     randomDraws.some(n=>!Number.isSafeInteger(n)||n<0||n>=LOTO_RANGE))
    FAIL('must supply one exact original rand(6096454) result per ticket');
  let money=shop.money;
  const wins=[];
  const logs=[{level:2,shopId:0,message:'抽獎卷的開獎開始了'}];
  for(const n of randomDraws){
    // Original uses successive independent "if": the lower tier overrides
    // each higher tier. Sampling exact integer values gives all thresholds.
    let rank=0;
    if(n<152411)rank=5;
    if(n<10000)rank=4;
    if(n<216)rank=3;
    if(n<6)rank=2;
    if(n<1)rank=1;
    if(!rank)continue;
    const prize=reviewed.prizeByRank[rank];
    money=Math.min(MAX_MONEY,money+prize);
    wins.push({rank,prize,randomValue:n});
    logs.push({
      level:rank<=3?1:2,shopId:0,
      // Original Perl interpolates "$hit等獎" as ONE Unicode variable name,
      // rather than "$hit" + literal "等獎". The actual Perl emitted log
      // therefore omits the tier wording. Preserve source, not intent.
      message:shop.shopname+'抽中了，'+prize+'！',
    });
  }
  const items=[...shop.item];
  items[10]=0; // Source zeros whole inventory before any ticket draws.
  return Object.freeze({
    source:reviewed.source,eventCode:'loto',
    shop:{...shop,money,item:items},
    returnCode:0,message:null,randomDrawsUsed:count,
    ticketCountConsumed:count,wins,logs,
    eventPersisted:false,sourceOnlyCallback:true,
    scope:reviewed.scope,
  });
}
