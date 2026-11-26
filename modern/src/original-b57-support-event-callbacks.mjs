/**
 * B-57 source-executed Perl oracle covers the two true Standard Street
 * funding/popularity STARTFUNC callbacks. Effects only; EVENT selection is
 * owned by B-56's internal complete-gate fixture, NOT a public player route.
 * The original GetMoneyString formatting is deliberately stubbed in oracle.
 */
import {B53_EVENT_CATALOG_SOURCE} from './original-event-compiled-catalog.mjs';
import {validateNormalCommerceInventory} from './reviewed-normal-commerce-items.mjs';

export const B57_SUPPORT_SOURCE='b57-original-getmoney-getpop-startfunc';
const MAX_MONEY=999999999;
const fail=x=>{throw new RangeError('B-57 original EVENT support: '+x);};
const expected=Object.freeze({
  getmoney:Object.freeze({
    start:'_local_(100000)',chance:300,amount:100000,
    body:Object.freeze([
      'my($money)=@_;',
      'foreach(reverse(@DT))',
      '{',
      'next if rand(1000)>300;',
      '$_->{money}+=$money;',
      '$_->{money}=$main::MAX_MONEY if $_->{money}>$main::MAX_MONEY;',
      "return (0,$_->{shopname}.'收到了共'.GetMoneyString($money).'的補助金');",
      '}',
      'return 0;',
    ]),
  }),
  getpop:Object.freeze({
    start:'_local_(1000)',chance:300,amount:1000,
    body:Object.freeze([
      'my($pop)=@_;',
      'foreach(reverse(@DT))',
      '{',
      'next if rand(1000)>300;',
      '$_->{rank}+=$pop;',
      '$_->{rank}=10000 if $_->{rank}>10000;',
      "return (0,'雜誌上介紹了'.$_->{shopname}.'，人氣提升了。');",
      '}',
      'return 0;',
    ]),
  }),
});
function extract(itemDsl,code){
  if(typeof itemDsl!=='string')fail('original item DSL missing');
  const parts=itemDsl.split(/^@@EVENT[^\r\n]*\r?\n/gmi).slice(1);
  const matches=parts.filter(part=>
    new RegExp('^\\s*code[ \\t]+'+code+'(?:[ \\t]|$)','m').test(part));
  if(matches.length!==1)fail('original EVENT declaration changed '+code);
  const found=matches[0].match(
    /^[ \t]*startfunc[ \t]+([^\s#]+)[^\r\n]*\r?\n([\s\S]*?)^[ \t]*_local_[ \t]*$/m);
  if(!found)fail('original callback source moved '+code);
  return {
    start:found[1],
    body:found[2].split(/\r?\n/).map(line=>line.trim())
      .filter(line=>line&&!line.startsWith('#')),
  };
}
export function reviewOriginalSupportEventCallbacks({
  itemDsl,turnSource,compilerSource,compiledCatalog,
}){
  if(compiledCatalog?.source!==B53_EVENT_CATALOG_SOURCE||
     compiledCatalog.compiledCount!==17||
     typeof turnSource!=='string'||
     !turnSource.includes('($ret,$msg)=&$func(split(/[:,]/,$E->{startfuncparam}));')||
     !turnSource.includes('PushLog(2,0,$msg) if $msg;')||
     typeof compilerSource!=='string'||
     !compilerSource.includes('$event->{startfunc},')||
     !compilerSource.includes('$g_define->{maxmoney}=GetNumber($1);')||
     !compilerSource.includes('$MAX_MONEY=$g_define->{maxmoney};')||
     !/^[ \t]*MaxMoney[ \t]+999999999(?:[ \t]|$)/m.test(itemDsl))
    fail('original compiled STARTFUNC or MaxMoney source changed');
  for(const [code,spec] of Object.entries(expected)){
    const entry=compiledCatalog.compiled.find(e=>e.code===code);
    if(!entry||entry.startProba!==spec.chance||
       entry.callbacks?.start!==spec.start||
       entry.baseTimeSeconds!==0||entry.plusTimeSeconds!==0||
       entry.callbacks?.end!==null||entry.callbacks?.now!==null)
      fail('source EVENT compiled metadata changed '+code);
    const block=extract(itemDsl,code);
    if(block.start!==spec.start||
       block.body.length!==spec.body.length||
       block.body.some((line,i)=>line!==spec.body[i]))
      fail('original complete STARTFUNC body changed '+code);
  }
  return Object.freeze({
    source:B57_SUPPORT_SOURCE,
    codes:Object.freeze(['getmoney','getpop']),
    chance:300,hitThreshold:300,maxMoney:MAX_MONEY,
    fundingAmount:100000,popularityAmount:1000,
    callbackDrawCount:1,
    gateIncluded:false,publicGameplay:false,
    scope:'source-reviewed single-shop true Perl STARTFUNC; not compiled full event engine, complete RNG or source UI formatter',
  });
}
export function projectOriginalSupportEventCallback({
  reviewed,shop,eventCode,randomDraws,reviewedInventory=null,
}){
  if(reviewed?.source!==B57_SUPPORT_SOURCE||
     reviewed.gateIncluded!==false||
     reviewed.maxMoney!==MAX_MONEY||
     reviewed.hitThreshold!==300)
    fail('original callback source contract required');
  const spec=expected[eventCode];
  if(!spec)fail('unreviewed support event '+eventCode);
  const expanded=reviewedInventory?.normalCommerce??null;
  if(expanded!==null)validateNormalCommerceInventory(shop,reviewedInventory.compiled,expanded);
  if(!shop||shop.id!==1||shop.status!==1||
     typeof shop.shopname!=='string'||!shop.shopname||
     !Number.isSafeInteger(shop.money)||shop.money<0||
     shop.money>MAX_MONEY||
     !Number.isSafeInteger(shop.rank)||shop.rank<0||
     shop.rank>10000||
     !Array.isArray(shop.item)||shop.item.length!==79||
     shop.item.some(n=>!Number.isSafeInteger(n)||n<0)||
     (expanded===null&&(!Array.isArray(shop.showcase)||shop.showcase.length!==1||
       shop.showcasecount!==1||!Array.isArray(shop.price)||shop.price.length!==1)))
    fail('reviewed real source single-shop money/popularity boundary');
  if(!Array.isArray(randomDraws)||randomDraws.length!==1||
     randomDraws.some(x=>!Number.isSafeInteger(x)||x<0||x>=1000000))
    fail('exactly one source callback rand(1000) draw required');

  // With only one reviewed shop, source foreach(reverse(@DT)) visits it once.
  const hit=randomDraws[0]/1000<=300;
  const money=hit&&eventCode==='getmoney'?
    Math.min(MAX_MONEY,shop.money+spec.amount):shop.money;
  const rank=hit&&eventCode==='getpop'?
    Math.min(10000,shop.rank+spec.amount):shop.rank;
  const message=!hit?null:eventCode==='getmoney'?
    shop.shopname+'收到了共'+spec.amount+'的補助金':
    '雜誌上介紹了'+shop.shopname+'，人氣提升了。';

  return Object.freeze({
    source:reviewed.source,eventCode,shop:{...shop,money,rank},
    returnCode:0,message,randomDrawsUsed:1,hit,
    changed:money!==shop.money||rank!==shop.rank,
    eventPersisted:false,sourceOnlyCallback:true,
    scope:reviewed.scope,
  });
}
