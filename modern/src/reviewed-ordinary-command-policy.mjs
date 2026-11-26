/** Exact single-shop ordinary history schema. Actual effects are authorized
 * solely by the owning source registry and exact GameCore CAS replay. */
const int=(n,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const exact=(o,keys)=>Object.keys(o).sort().join(',')===keys.split(',').sort().join(',');
export function isReviewedOrdinaryCommand(c,street){
  if(!c||typeof c!=='object'||Array.isArray(c)||c.shopId!==1||!int(c.expectedRevision))return false;
  const common='kind,expectedRevision,shopId,';
  switch(c.kind){
    case 'complete-palace-mission':return street.reviewedPalace===true&&exact(c,'expectedRevision,kind,shopId');
    case 'hire-army':case 'fire-army':return street.reviewedArmy===true&&exact(c,common+'requestedCount')&&int(c.requestedCount,1);
    case 'open-shop':return exact(c,common+'ownerName,shopName')&&typeof c.ownerName==='string'&&typeof c.shopName==='string';
    case 'market-buy':{
      const rule=int(c.itemId,1,79)?street.marketBuyRegistry?.getRule(c.itemId):null;
      return exact(c,common+'itemId,requestedCount,marketShelf,expectedPrice')&&
        Boolean(rule)&&int(c.requestedCount,1)&&int(c.marketShelf,0,79)&&
        (rule.zeroPriceReviewed===true?c.expectedPrice===0:int(c.expectedPrice,1));
    }
    case 'edit-showcase':return exact(c,common+'shelf,itemId,per,priceOverride')&&int(c.shelf,0,7)&&int(c.itemId,0,79)&&int(c.per,1,200)&&int(c.priceOverride,0,999999999);
    case 'discard-item':return exact(c,common+'itemId,count')&&int(c.itemId,1,79)&&int(c.count,1);
    case 'use-item':{
      const draws=Object.hasOwn(c,'randomDraws');
      const rule=int(c.itemId,1,79)&&int(c.useId)?street.useItem?.getRule(c.itemId,c.useId):null;
      const localTarget=rule?.localSelfTarget===true;
      return exact(c,common+'itemId,useId,requestedCount'+(draws?',randomDraws':'')+(localTarget?',targetShopId':''))&&
        Boolean(rule)&&(!localTarget||c.targetShopId===c.shopId)&&int(c.requestedCount,1)&&
        (!draws||(Array.isArray(c.randomDraws)&&c.randomDraws.length>=1&&c.randomDraws.length<=128&&c.randomDraws.every(n=>int(n,0,999999))));
    }
    default:return false;
  }
}
