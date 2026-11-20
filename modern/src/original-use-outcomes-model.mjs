/**
 * B-21: Core faithful, numeric-only projections of fixed sources:
 * plug/use.cgi MakeAmount(208..224), creation/overflow(128..150)
 * and plug/whole.cgi CheckWholeStore(50..74).
 *
 * Preserve the original unusual math, even negative retained additions.
 * Known risks documented separately. No OS I/O, CGI or dynamic callbacks.
 */
export const CORE_PI_LITERAL = 3.1415926535;
function finite(v,name,{integer=false,positive=false}={}){
  if(typeof v!=='number'||!Number.isFinite(v)||
     Math.abs(v)>Number.MAX_SAFE_INTEGER||
     (integer&&!Number.isSafeInteger(v))||(positive&&v<=0)){
    throw new RangeError(name+' must be finite fixture value');
  }
  return v;
}
function draw(random){
  if(typeof random!=='function')throw new TypeError('Explicit random() required');
  const value=random();
  if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>=1){
    throw new RangeError('random() must produce value in [0,1)');
  }
  return value;
}
/**
 * Source order exactly: p<=0, p>=1000, count<20, then sqrt(abs(t)).
 * No limit of the returned amount to count, even for strange outcomes.
 * Requires numeric integer count fixture and explicit RNG draw sequence.
 * Does not claim parity between Perl rand and JavaScript Math.random seeds.
 */
export function projectOriginalMakeAmount({count,probabilityPermille,random}){
  finite(count,'count',{integer:true});
  if(count<0)throw new RangeError('count must be nonnegative fixture integer');
  finite(probabilityPermille,'probabilityPermille');
  if(probabilityPermille<=0){
    return Object.freeze({amount:0,draws:0,branch:'zero-probability'});
  }
  if(probabilityPermille>=1000){
    return Object.freeze({amount:count,draws:0,branch:'full-probability'});
  }
  if(count<20){
    let amount=0;
    for(let i=0;i<count;i++)if(draw(random)*1000<probabilityPermille)amount++;
    return Object.freeze({amount,draws:count,branch:'per-unit'});
  }
  const p=probabilityPermille/1000;
  const average=count*p;
  const sigma=average*(1-p);
  const t=(-2*sigma*draw(random))*Math.sin(2*CORE_PI_LITERAL*draw(random));
  const amount=Math.trunc(Math.sqrt(t<0?-t:t)+average+0.5);
  return Object.freeze({
    amount,draws:2,branch:'large-sqrt-absolute',average,sigma,t,
  });
}
/**
 * One already-calculated output item through Core creation/overflow,
 * then one corresponding item of CheckWholeStore.
 * shopCount and otherShopsStock must be supplied as synthetic observations.
 * Global, multi-item CheckWholeStore and product callbacks not executed.
 */
export function projectOriginalCreateThenWholesale({
  producedCount,shopStockBefore,itemLimit,wholesaleStockBefore,
  otherShopsStock,shopCount,wslimit,itemHasCode,
}){
  finite(producedCount,'producedCount',{integer:true});
  if(producedCount<0)throw new RangeError('producedCount must be nonnegative');
  for(const [name,v] of [
    ['shopStockBefore',shopStockBefore],['itemLimit',itemLimit],
    ['wholesaleStockBefore',wholesaleStockBefore],
    ['otherShopsStock',otherShopsStock],['wslimit',wslimit],
  ])finite(v,name);
  finite(shopCount,'shopCount',{integer:true,positive:true});
  if(typeof itemHasCode!=='boolean')throw new TypeError('itemHasCode must be boolean');
  let retained=producedCount;
  let discarded=0;
  let wholesaleAfterOverflow=wholesaleStockBefore;
  if(retained && retained+shopStockBefore>itemLimit){
    discarded=retained-(itemLimit-shopStockBefore);
    wholesaleAfterOverflow+=discarded;
    retained=itemLimit-shopStockBefore;
  }
  const shopStockAfter=shopStockBefore+retained;
  let wholesaleAfterCheck=wholesaleAfterOverflow;
  const sumShopsAtCheck=otherShopsStock+shopStockAfter;
  let marketLimit=null;
  if(itemHasCode){
    marketLimit=wslimit<0?-wslimit:Math.trunc(wslimit*shopCount+0.99);
    if(sumShopsAtCheck+wholesaleAfterCheck>marketLimit){
      const boundedShopSum=marketLimit<sumShopsAtCheck?
        marketLimit:sumShopsAtCheck;
      wholesaleAfterCheck=marketLimit-boundedShopSum;
    }
    if(wholesaleAfterCheck<0)wholesaleAfterCheck=0;
  }
  return Object.freeze({
    producedCount,retained,discarded,
    shopStockBefore,shopStockAfter,wholesaleStockBefore,
    wholesaleAfterOverflow,wholesaleAfterCheck,marketLimit,sumShopsAtCheck,
    scope:'original one-item order only; no real transaction or I/O',
  });
}
