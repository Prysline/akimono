/** Frozen plug/item.cgi GetSaleTax. Price is the total for count items. */
export function calculateSourceSaleTax({basePrice,count,totalPrice,plusTaxRate=0}){
 if(![basePrice,count,totalPrice,plusTaxRate].every(Number.isSafeInteger)||basePrice<0||count<0||totalPrice<0||plusTaxRate<0)throw new RangeError('source sale tax inputs');
 let rate=basePrice&&count?totalPrice/count/basePrice-1:0;
 if(rate>0)rate*=5;
 let down=1;
 if(rate<0){down=rate+1;rate=0;}
 const taxRate=Math.min(99,Math.trunc((rate+plusTaxRate)*down+0.5));
 const tax=Math.trunc(totalPrice*taxRate/100);
 if(!Number.isSafeInteger(tax))throw new RangeError('source sale tax result');
 return {taxRate,tax};
}
