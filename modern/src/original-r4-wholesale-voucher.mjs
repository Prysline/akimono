/** Pinned Standard Street global @@FUNCBUY for wholesale purchases only.
 * This is a local transaction projection; the shared market engine owns payment,
 * clipping, transport, wholesale write and CAS. No Perl execution at runtime.
 */
import {createHash} from 'node:crypto';
const pins={itemDsl:'7a18185e98b32aee82ca1ce30d6f3c395157dbcb',
  buySource:'6ba8df9a733ed16c490389414cd94934fe1185ca',
  helperSource:'bb0244748088be0c5f1d24de7f9f7f05225278cb'};
const fail=message=>{throw new RangeError('R4 wholesale FUNCBUY: '+message);};
const safe=n=>Number.isSafeInteger(n)&&n>=0;
const hash=s=>typeof s==='string'?createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex'):null;
const reviewed=new WeakSet();
const key='standard-street-global-wholesale-voucher';
const source='custom/inc-item-data.cgi:3369';
export function reviewOriginalWholesaleVoucher({itemDsl,buySource,helperSource}){
  for(const [name,pin] of Object.entries(pins)){
    if(hash({itemDsl,buySource,helperSource}[name])!==pin)fail('frozen source drift '+name);
  }
  const steps=['$DT->{money}-=$num*$price;', '$DT->{paytoday}+=$num*$price;',
    'RequireFile("inc-item.cgi");','require "$ITEM_DIR/funcbuy.cgi" if $DEFINE_FUNCBUY;',
    'if($ITEM[$itemno]->{funcbuy})','SetWholeStore($DTS) if $id==0;',
    'RenewLog();','DataWrite();','DataCommitOrAbort();'];
  let prior=-1;
  for(const step of steps){const pos=buySource.indexOf(step,prior+1);if(pos<0)fail('buy-s order '+step);prior=pos;}
  const r=Object.freeze({key,source,itemId:79,limit:10,minTotal:500000});
  reviewed.add(r);return r;
}
function effect(review,owned,total,shopId){
  if(!reviewed.has(review)||!safe(owned)||owned>review.limit||!safe(total)||!safe(shopId)||shopId<1)
    fail('reviewed voucher inventory/payment required');
  const requestedCount=Math.trunc(total/review.minTotal);
  const grantedCount=Math.min(requestedCount,review.limit-owned);
  return {reward:{source:review.source,itemId:review.itemId,requestedCount,grantedCount,
    stockBefore:owned,stockAfter:owned+grantedCount},
    calls:grantedCount?[[0,shopId,'收到了市場贈送的禮物卷'+grantedCount+'枚']]:[]};
}
export function runReviewedWholesaleVoucher({review,key:callbackKey,phase,shop,wholesale,receipt}){
  if(!reviewed.has(review)||callbackKey!==review.key||phase!=='global'||
     receipt?.action!=='market-buy'||receipt.shopId!==shop?.id||receipt.itemId===review.itemId||
     !safe(receipt.purchasedCount)||receipt.purchasedCount<1||!safe(receipt.unitPrice)||
     receipt.totalPaid!==receipt.purchasedCount*receipt.unitPrice||
     receipt.totalPaid<review.minTotal||!Array.isArray(shop.item)||shop.item.length!==79||
     Object.hasOwn(receipt,'voucherReward')||Object.hasOwn(receipt,'originalBuyLogCalls'))
    fail('invalid global callback contract');
  const {reward,calls}=effect(review,shop.item[review.itemId-1],receipt.totalPaid,shop.id);
  const next={...shop,item:[...shop.item]};
  next.item[review.itemId-1]=reward.stockAfter;
  receipt.voucherReward=reward;
  receipt.originalBuyLogCalls=calls;
  return {shop:next,wholesale};
}
/** Verify the exact source callback effect against the committed ordinary
 * successor, then produce native PushLog rows. The source purchase message
 * itself remains the existing explicitly local adapter log.
 */
export function projectReviewedWholesaleVoucherLogRows({review,before,after,command,receipt,nowSeconds}){
  if(!reviewed.has(review)||command?.kind!=='market-buy'||receipt?.action!=='market-buy'||
     command.shopId!==before?.id||after?.id!==before.id||receipt.shopId!==before.id||
     command.itemId!==receipt.itemId||command.itemId===review.itemId||
     !safe(receipt.purchasedCount)||receipt.purchasedCount<1||!safe(receipt.unitPrice)||
     receipt.totalPaid!==receipt.purchasedCount*receipt.unitPrice||!safe(nowSeconds)||nowSeconds<1)
    fail('invalid source buy log identity');
  const {reward,calls}=effect(review,before.item[review.itemId-1],receipt.totalPaid,before.id);
  if(after.item[review.itemId-1]!==reward.stockAfter)fail('voucher successor mismatch');
  if(reward.requestedCount===0){
    if(Object.hasOwn(receipt,'voucherReward')||Object.hasOwn(receipt,'originalBuyLogCalls'))fail('below-threshold callback receipt');
    return [];
  }
  if(JSON.stringify(receipt.voucherReward)!==JSON.stringify(reward)||
     JSON.stringify(receipt.originalBuyLogCalls)!==JSON.stringify(calls))fail('voucher receipt/log mismatch');
  return calls.map(call=>[nowSeconds,...call].join('\t')+'\n').reverse();
}
