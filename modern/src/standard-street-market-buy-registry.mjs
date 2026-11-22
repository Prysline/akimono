/**
 * R2-B: non-evaluating Standard Street wholesale rule registry.
 * All ordinary rules are compiled from frozen ITEM DSL declaration order,
 * compiled LIMIT evidence and fixed Core market/buy source preconditions.
 * BUY callbacks are never evaluated as Perl. Unsupported semantics are
 * discoverable with describe(), and are not silently accepted.
 *
 * Source BASE A/B is a bounded GetWholeStore price policy, not a separate
 * item implementation. The earlier R2-A Oracle did not compile BASE and
 * remains a separate historical fixture, never a production price policy.
 */
import {parseDsl} from './parse-dsl.mjs';

const ITEM_SOURCE='custom/inc-item-data.cgi';
const REBEL_SOURCE='custom/inc-rebel-data.cgi';
const ITEM_BLOB='7a18185e98b32aee82ca1ce30d6f3c395157dbcb';
function fail(message){throw new RangeError('R2-B market registry: '+message);}
function one(block,key){
  const rows=block.fields[key]??[];
  return rows.length===1?rows[0]:null;
}
function positive(raw,label){
  if(typeof raw!=='string'||!/^[1-9][0-9]*$/.test(raw)||
     !Number.isSafeInteger(Number(raw)))fail('unsupported '+label);
  return Number(raw);
}
export function quoteCompiledWholesaleRule(rule,marketStock){
  if(!rule||!['common-static','common-dynamic'].includes(rule.classification))
    fail('unsupported rule cannot be quoted');
  if(!Number.isSafeInteger(marketStock)||marketStock<=0)
    fail('wholesale quote requires source in-stock item');
  const base=positive(String(rule.basePrice),'source compiled PRICE');
  const policy=rule.pricePolicy;
  if(!policy||!['fixed','original-pricehalf'].includes(policy.kind))
    fail('unsupported source PRICE policy');
  let price=base;
  if(policy.kind==='original-pricehalf'){
    const a=policy.pricebase,b=policy.pricehalf;
    if(!Number.isSafeInteger(a)||a<0||!Number.isSafeInteger(b)||b<=0)
      fail('unreviewed source BASE compilation');
    // Frozen whole.cgi::GetWholeStore, followed by source minimum price.
    const denominator=((marketStock-a)/b)+1;
    if(!Number.isFinite(denominator)||denominator===0)
      fail('original GetWholeStore unsupported zero denominator');
    price=Math.trunc(base/denominator);
    if(price<=0)price=1;
  }
  if(!Number.isSafeInteger(price)||price<=0)
    fail('invalid original market quote');
  // Frozen item.cgi::GetTimeDeal(baseprice*num,itemno,num) after
  // buy-s.cgi halves the original 1200s TIME_SEND_ITEM to 600s.
  const multiplier=Math.max(0.5,Math.min(2,2-price/base));
  const timeSeconds=Math.trunc(rule.marketTimeSeconds*multiplier);
  if(!Number.isSafeInteger(timeSeconds)||timeSeconds<0)
    fail('unsafe original GetTimeDeal time');
  return Object.freeze({price,timeSeconds});
}
function sourceMarker(text,fragment){
  if(typeof text!=='string'||!text.includes(fragment))
    fail('frozen original source drift: '+fragment);
}
export function compileStandardStreetMarketBuyRegistry({
  itemDsl,rebelDsl,model,compiled,compilerSource,buySource,
  wholeSource,itemSource,globalBuyCallback=null,
}){
  if(!Array.isArray(model?.items)||model.items.length!==79||
     !Array.isArray(compiled?.limits)||compiled.limits.length!==79)
    fail('79 audited items and compiled stock limits required');
  if(!globalBuyCallback||
     globalBuyCallback.key!=='standard-street-global-wholesale-voucher'||
     !Number.isSafeInteger(globalBuyCallback.minTotal)||
     globalBuyCallback.minTotal!==500000||
     !/custom\\/inc-item-data.cgi:\\d+/.test(globalBuyCallback.source))
    fail('source-reviewed global FUNCBUY metadata required');
  for(const [s,fragment] of [
    [compilerSource,'$g_item->{pricebase}=0;'],
    [compilerSource,'$g_item->{pricehalf}=0;'],
    [compilerSource,"if($line =~ s/\\sBASE\\s+(\\S+)\\s*\\/(\\S+)\\s//i)"],
    [compilerSource,'$g_item->{wslimit}=GetNumber($val[1])'],
    [compilerSource,'foreach(0..$#out_item){$out_item[$_]->{sort}=$_;};'],
    [wholeSource,'sort {$sortkey[$a]<=>$sortkey[$b]} @wholelist'],
    [wholeSource,'if($ITEM->{pricehalf})'],
    [wholeSource,'$price=int($price/ ((($stock-$ITEM->{pricebase})/$ITEM->{pricehalf})+1) );'],
    [buySource,'$TIME_SEND_ITEM=int($TIME_SEND_ITEM/2) if !$id;'],
    [buySource,'$DTS=GetWholeStore();'],
    [buySource,'require "$ITEM_DIR/funcbuy.cgi" if $DEFINE_FUNCBUY;'],
    [itemSource,'return int($TIME_SEND_ITEM*$mul);'],
    [itemSource,'$mul=2 - ($price / $itemcount / $ITEM[$itemno]->{price})'],
    [itemSource,'$mul=0.5 if $mul<0.5;'],
  ])sourceMarker(s,fragment);
  const main=parseDsl(itemDsl,ITEM_SOURCE);
  const rebel=parseDsl(rebelDsl,REBEL_SOURCE);
  if(main.issues.length||rebel.issues.length)fail('DSL parse issues');
  const define=main.blocks.filter(b=>b.kind==='DEFINE');
  const send=define.length===1?one(define[0],'timesenditem'):null;
  if(!send||send.value!=='20m')fail('unreviewed source TimeSendItem');
  // Frozen TimeSendItem=20m; market buy halves it and with no price modifier
  // GetTimeDeal(price*num,item,num) has multiplier 1.
  const marketTimeSeconds=600;
  const sourceItems=[...main.blocks,...rebel.blocks]
    .filter(b=>b.kind==='ITEM');
  if(sourceItems.length!==79)fail('original ITEM count');
  const byId=new Map();
  const entries=sourceItems.map((block,sort)=>{
    const itemId=positive(one(block,'no')?.value,'ITEM number');
    const item=model.items[sort];
    if(!item||item.id!==itemId||item.line!==block.startLine||
       item.source!==block.file||item.name!==one(block,'name')?.value||
       item.code!==one(block,'code')?.value||byId.has(itemId))
      fail('ITEM sort, identity or source line mismatch: '+itemId);
    const limit=compiled.limits[itemId-1];
    const priceRow=one(block,'price');
    const limitRow=one(block,'limit');
    if(!priceRow||!limitRow||priceRow.value!==item.priceRaw||
       limitRow.value!==item.limitRaw||
       limitRow.line!==item.limitSourceLine||
       priceRow.line!==item.priceSourceLine||
       !limit?.code||!Number.isSafeInteger(limit.limit)||
       !Number.isFinite(limit.wslimit))
      fail('original price/LIMIT compilation mismatch: '+itemId);
    const rawBase=one(block,'base')?.value??null;
    const callback=one(block,'funcb');
    const price=Number(priceRow.value);
    let reason=null,classification='common-static';
    if(!/^[0-9]+$/.test(priceRow.value)||!Number.isSafeInteger(price))
      reason='unreviewed original PRICE at '+block.file+':'+priceRow.line;
    else if(price===0)
      reason='zero-price wholesale GetTimeDeal and stock policy not yet reviewed at '+block.file+':'+priceRow.line;
    else if(limit.limit<1)
      reason='nonpositive original LIMIT at '+block.file+':'+limitRow.line;
    else if(limit.wslimit<=0)
      reason='original wholesale cap is zero at '+block.file+':'+limitRow.line+'; source market cannot offer this ITEM';
    else if(callback){
      classification='source-item-callback';
      reason='unreviewed ITEM FUNCB at '+block.file+':'+callback.line;
    }
    let pricePolicy={kind:'fixed'};
    if(rawBase!==null){
      const parts=/^([0-9]+)\/([1-9][0-9]*)$/.exec(rawBase);
      if(!parts||![Number(parts[1]),Number(parts[2])].every(Number.isSafeInteger)){
        classification='unsupported';
        reason='unreviewed source BASE syntax at '+block.file+':'+one(block,'base').line;
      }else{
        pricePolicy={kind:'original-pricehalf',
          pricebase:Number(parts[1]),pricehalf:Number(parts[2]),
          sourceFile:block.file,sourceLine:one(block,'base').line};
        if(reason===null)classification='common-dynamic';
      }
    }
    if(reason&&classification==='common-static')classification='unsupported';
    const source=block.file+':'+block.startLine+
      ' @ GitBlob '+ITEM_BLOB+'; fixed buy-s.cgi/whole.cgi/item.cgi';
    const entry={
      itemId,itemName:item.name,itemCode:item.code,
      shopIndex:itemId-1,wholesaleIndex:itemId-1,
      sort,source,sourceFile:block.file,sourceLine:block.startLine,
      basePrice:Number.isSafeInteger(price)?price:null,
      sourceBaseRaw:rawBase,
      pricePolicy:Object.freeze(pricePolicy),
      stockLimit:limit.limit,wholesaleLimit:limit.wslimit,
      marketTimeSeconds,
      callbackSource:callback?block.file+':'+callback.line:null,
      globalBuyCallback,classification,reason,
    };
    byId.set(itemId,entry);
    return Object.freeze(entry);
  });
  const order=Object.freeze(entries.map(e=>Object.freeze({
    itemId:e.itemId,wholesaleIndex:e.wholesaleIndex,
  })));
  return Object.freeze({
    entries:Object.freeze(entries),
    order,
    describe(itemId){return byId.get(itemId)??null;},
    quote({rule,marketStock}){
      return quoteCompiledWholesaleRule(rule,marketStock);
    },
    getRule(itemId){
      const e=byId.get(itemId);
      if(!e||!['common-static','common-dynamic'].includes(e.classification))
        return null;
      return Object.freeze({
        itemId:e.itemId,shopIndex:e.shopIndex,
        wholesaleIndex:e.wholesaleIndex,
        unitPrice:e.basePrice,basePrice:e.basePrice,
        classification:e.classification,pricePolicy:e.pricePolicy,
        stockLimit:e.stockLimit,
        marketTimeSeconds:e.marketTimeSeconds,
        source:e.source,
        scope:e.classification==='common-static'?
          'R2-B source-compiled static wholesale rule, no item FUNCB':
          'R2-B source-compiled original BASE pricehalf wholesale rule, no item FUNCB',
        buyCallback:null,
        globalBuyCallback:e.globalBuyCallback,
      });
    },
  });
}
