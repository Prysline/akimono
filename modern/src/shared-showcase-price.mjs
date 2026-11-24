/** Original frozen sc-s.cgi: 1..200% integer or direct positive G price. */
export const SOURCE_STANDARD_STREET_MAX_MONEY=999999999;

export function isSourceShowcasePercentPrice(basePrice,listedPrice){
  if(!Number.isSafeInteger(basePrice)||basePrice<1||
     !Number.isSafeInteger(listedPrice)||listedPrice<1)return false;
  for(let per=1;per<=200;per++)
    if(Math.trunc(basePrice*per/100)===listedPrice)return true;
  return false;
}

/** sc-s.cgi: prc > 0 overrides per, capped at source MaxMoney.
 * A direct listing can be ANY positive integer G amount within the
 * verified source cap. This does not itself authorize ITEM ownership,
 * edit time, sale callbacks or WorldState persistence.
 */
export function isSourceShowcaseListedPrice(basePrice,listedPrice,
  maxMoney=SOURCE_STANDARD_STREET_MAX_MONEY){
  return Number.isSafeInteger(basePrice)&&basePrice>=1&&
    Number.isSafeInteger(maxMoney)&&
    maxMoney===SOURCE_STANDARD_STREET_MAX_MONEY&&
    Number.isSafeInteger(listedPrice)&&listedPrice>=1&&
    listedPrice<=maxMoney;
}
