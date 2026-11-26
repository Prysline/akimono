/** Player-test strategy only: distinguish liquidity, supply, capacity and
 * action-time. Never change the server clock, quote, RNG or inventory. */
export function planGenuineMarketStep({offer,owned,needed,partial,money,remaining,reserve=0}){
  if(!offer)return {kind:'wait',reason:'no-source-offer'};
  if(offer.marketStock===0)return {kind:'wait',reason:'source-market-empty'};
  if(Number.isSafeInteger(offer.limit)&&owned>=offer.limit)return {kind:'wait',reason:'source-carrying-limit'};
  if(!offer.canBuy)return {kind:'wait',reason:'source-rule-unavailable'};
  if(![offer.price,offer.marketStock,offer.limit,offer.timeSeconds].every(x=>Number.isSafeInteger(x)&&x>=0))throw RangeError('invalid live source market quote');
  const quantity=Math.min(needed,offer.marketStock,offer.limit-owned);
  if(quantity<=0)return {kind:'wait',reason:'source-stock-or-carrying-limit'};
  if(!partial&&quantity!==needed)return {kind:'wait',reason:'insufficient-quantity',quantity};
  const total=offer.price*quantity;
  const required=offer.price===0?0:total+reserve;
  if(offer.price>0&&money<required)return {kind:'fund',quantity,total,required,shortfall:required-money};
  if(remaining<offer.timeSeconds)return {kind:'time',quantity,total,seconds:offer.timeSeconds};
  return {kind:'buy',quantity,total};
}
export function legalMarketWaitMinutes({crossPeriod,boundary}){
  return crossPeriod?60:Math.min(60,Math.floor((boundary-1)/60));
}

/** For long crafting routes only: keep a nonempty current showcase (including
 * a reserved package under test). If it is empty or sold out, list only a
 * caller-declared surplus item; never put the packing components on sale. */
export function chooseGenuineFundingSale({currentItem,stock,surplusItems}){
  if(currentItem>0&&stock(currentItem)>0)return null;
  return surplusItems.find(id=>stock(id)>0)??null;
}
