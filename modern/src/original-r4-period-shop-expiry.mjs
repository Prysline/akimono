/**
 * R4 true frozen period.cgi absent-owner CloseShop invocation gate.
 *
 * The actual CloseShop implementation and its durable cross-file effects
 * are not in this reviewed source slice. We record ONLY the original calls
 * and two-level l()/PushLog output, without deleting or settling shops.
 */
export const R4_EXPIRED_SHOP_SOURCE='r4-frozen-period-absent-owner-close-call';
const fail=s=>{throw new RangeError('R4 original absent shop closure: '+s);};
const safe=n=>Number.isSafeInteger(n)&&n>=0;
const localizedReviews=new WeakSet();
export function reviewR4PeriodShopExpiry({periodSource,configSource,localized=false}){
  if(typeof localized!=='boolean')fail('explicit source expiry locale');
  if(typeof periodSource!=='string'||typeof configSource!=='string'||
     !/\$EXPIRE_TIME\s*=\s*3600\*24\*7\s*;/.test(configSource))
    fail('original EXPIRE_TIME seven-day source changed');
  const from=periodSource.indexOf('#経営者不在');
  const to=periodSource.indexOf('#ドラゴンレース清算',from);
  if(from<0||to<=from)fail('original absent-owner period region moved');
  const source=periodSource.slice(from,to);
  const markers=[
    'if ($NOW_TIME-$DT->{foundation} > 43200 && $DT->{blocklogin} ne \'stop\')',
    'if ($DT->{lastlogin}+$EXPIRE_TIME<$NOW_TIME)',
    "CloseShop($DT->{id},l('経営者不在'));",
    'PushLog(1,0,l("%1が経営者不在のため閉店しました。",$DT->{shopname}));',
  ];
  let cursor=-1;
  for(const marker of markers){
    const i=source.indexOf(marker,cursor+1);
    if(i<=cursor)fail('original CloseShop source/order drift '+marker);
    cursor=i;
  }
  const reviewed=Object.freeze({
    source:R4_EXPIRED_SHOP_SOURCE,
    committable:false,closeShopEffectKnown:false,
    minimumShopAgeSeconds:43200,absenceLimitSeconds:604800,
    sourceScope:'frozen period.cgi condition and CloseShop/PushLog call recorder only; no actual close, DeleteShop or durable save',
  });
  if(localized)localizedReviews.add(reviewed);
  return reviewed;
}
export function projectR4PeriodShopExpiry({
  reviewed,shop,nowSeconds,
}){
  if(reviewed?.source!==R4_EXPIRED_SHOP_SOURCE||
     reviewed.committable!==false||
     reviewed.closeShopEffectKnown!==false||
     reviewed.minimumShopAgeSeconds!==43200||
     reviewed.absenceLimitSeconds!==604800)
    fail('source-reviewed original CloseShop invocation required');
  if(!shop||typeof shop!=='object'||Array.isArray(shop)||
     !safe(shop.id)||shop.id===0||!safe(shop.foundation)||
     !safe(shop.lastlogin)||typeof shop.blocklogin!=='string'||
     typeof shop.shopname!=='string'||!shop.shopname||
     !safe(nowSeconds))
    fail('original shop owner timestamps and blocklogin required');
  // Frozen Core zh_TW.po a512f6887cee214e66828769a382ad2b18bcd5b3.
  // The local player uses the actual translated reason and announcement;
  // the original identity-locale probes retain their historical strings.
  const localized=localizedReviews.has(reviewed);
  const expired=nowSeconds-shop.foundation>43200&&
    shop.blocklogin!=='stop'&&
    shop.lastlogin+604800<nowSeconds;
  return Object.freeze({
    source:reviewed.source,committable:false,
    expiredOwner:expired,
    shop:Object.freeze({...shop}),
    closeCalls:Object.freeze(expired?[
      Object.freeze({shopId:shop.id,reason:localized?'沒有上線':'経営者不在'}),
    ]:[]),
    logs:Object.freeze(expired?[
      Object.freeze([1,0,shop.shopname+(localized?'因為沒有上線所以店鋪被關閉了。':'が経営者不在のため閉店しました。')]),
    ]:[]),
    sourceScope:reviewed.sourceScope,
  });
}
