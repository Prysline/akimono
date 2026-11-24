/**
 * Source-limited exact original Perl #62/0 advertisement callback.
 * One draw is consumed AFTER Core UseItem, then fixed 100 EXP.
 * No cross-shop, guild or unreviewed event side effect.
 */
export function projectOriginalSelfAdvertisement({rule,shop,count,random}){
  const cb=rule?.inlineCallback;
  if(rule?.itemId!==62||rule.useId!==0||
     cb?.kind!=='advertise-self'||cb.thresholdPermille!==250||
     cb.basePoints!==500||count!==1||
     !shop||!Number.isSafeInteger(shop.rank)||
     shop.rank<0||shop.rank>10000||
     !Number.isSafeInteger(shop.id)||shop.id<1||
     typeof shop.shopname!=='string'||typeof random!=='function')
    throw new RangeError('R2 source advertisement inputs');
  const up=Math.trunc(500*(2-shop.rank/5000));
  let rank,returned,globalLog;
  const draw=random();
  if(draw*1000<250){
    rank=Math.max(1000,shop.rank-up);
    returned='廣告適得其反：人氣降低了'+Math.trunc(up/100);
    globalLog=shop.shopname+'把廣告貼出來後得到了反效果';
  }else{
    rank=Math.min(10000,shop.rank+up);
    returned='進行廣告宣傳後：人氣上升了'+Math.trunc(up/100)+'%';
    globalLog=shop.shopname+'進行了廣告宣傳';
  }
  return Object.freeze({
    rank,returned,
    logCalls:Object.freeze([
      Object.freeze([0,shop.id,returned]),
      Object.freeze([3,0,globalLog]),
    ]),
  });
}
