/** Frozen plug/market.cgi::GetMarketStatus arithmetic shared by sale and read views.
 * Does not modify shop state, allocate visitors, select RNG or change wholesale price. */
export function calculateSourceMarketStatus({stock,weightedPrice,popular,population,saleSpeed}){
 if(![stock,weightedPrice,popular,population,saleSpeed].every(Number.isSafeInteger)||stock<1||weightedPrice<0||popular<0||population<1||saleSpeed<1)throw new RangeError('source market status inputs');
 const seed=population*saleSpeed/3/50;
 return {marketprice:Math.trunc(weightedPrice/stock),uppoint:popular===0?100:Math.max(10,Math.min(1000,Math.trunc(stock/seed*popular)))};
}
