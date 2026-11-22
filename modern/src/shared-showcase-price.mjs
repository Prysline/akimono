/** Original source sc-s.cgi 1..200% integer listing prices. */
export function isSourceShowcasePercentPrice(basePrice,listedPrice){
  if(!Number.isSafeInteger(basePrice)||basePrice<1||
     !Number.isSafeInteger(listedPrice)||listedPrice<1)return false;
  for(let per=1;per<=200;per++)
    if(Math.trunc(basePrice*per/100)===listedPrice)return true;
  return false;
}
