/**
 * Pure source-exact frozen Standard Street popup formula for #77.
 * The two WriteLog calls are captured as receipts, not emitted to disk.
 */
export function projectOriginalPartyPopup({rule,shop,count}){
  const cb=rule?.inlineCallback;
  if(rule?.itemId!==77||rule.useId!==0||
     cb?.kind!=='party-popularity'||cb.points!==1000||
     cb.comment!=='開了派對'||count!==1||
     !shop||!Number.isSafeInteger(shop.rank)||
     shop.rank<0||shop.rank>10000||
     !Number.isSafeInteger(shop.id)||shop.id<1||
     typeof shop.shopname!=='string')
    throw new RangeError('R2 party popup source inputs');
  const up=Math.trunc(cb.points*(2-shop.rank/5000));
  const rank=Math.min(10000,shop.rank+up);
  const returned=cb.comment+'：人氣提升了'+Math.trunc(up/100)+'%';
  return Object.freeze({
    rank,returned,
    logCalls:Object.freeze([
      Object.freeze([0,shop.id,returned]),
      Object.freeze([3,0,shop.shopname+' '+cb.comment]),
    ]),
  });
}
