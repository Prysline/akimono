import {createHash} from 'node:crypto';
import {calculateSourceSaleTax} from './shared-source-sale-tax.mjs';

// Original source review for explicit, isolated natural sale tax contexts.
// Live controllers may enable this capability only in the independent fiscal mode.
const pins={detail:'9a83d26fb29edee4032958f1e6de837a250f3384',
  item:'b39400d7dc0ab80062c392ae2bbc923e24ecacf8',
  turn:'b8a4980275f475a952846a8d6072fad45f8dff50'};
const reviews=new WeakSet(),contexts=new WeakSet();
const fail=m=>{throw new RangeError('R4 lord sale tax: '+m);};
const uint=n=>Number.isSafeInteger(n)&&n>=0;
const mode=v=>v===undefined||v===''?0:v;
const plain=o=>o!==null&&typeof o==='object'&&Object.getPrototypeOf(o)===Object.prototype;
export function reviewR4LordSaleTax(sources){
  if(!plain(sources)||Object.keys(sources).sort().join(',')!=='detail,item,turn')fail('exact sources required');
  for(const [key,pin] of Object.entries(pins)){
    const src=sources[key];
    if(typeof src!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(src)+'\0').update(src).digest('hex')!==pin)
      fail('source drift '+key);
  }
  const review=Object.freeze({source:'r4-frozen-lord-sale-tax.v1',committable:false});
  reviews.add(review);return review;
}
export function createR4LordSaleTaxContext({reviewed,townTaxRate,taxMode,eventState}){
  if(!reviews.has(reviewed))fail('source review required');
  if(!uint(townTaxRate)||townTaxRate>40||![undefined,'',0,1,2].includes(taxMode))
    fail('tax rate or mode');
  if(!plain(eventState)||Object.keys(eventState).some(k=>k!=='rebel')||
     (Object.hasOwn(eventState,'rebel')&&(!uint(eventState.rebel)||eventState.rebel===0)))
    fail('explicit calm or rebel-only EVENT state required');
  const userTaxRate=eventState.rebel||taxMode===1?0:taxMode===2?townTaxRate*2:townTaxRate;
  const context=Object.freeze({source:reviewed.source,committable:false,townTaxRate,
    taxMode:mode(taxMode),userTaxRate,rebellion:Boolean(eventState.rebel)});
  contexts.add(context);return context;
}
export function assertR4LordSaleTaxContext(context,taxMode){
  if(!contexts.has(context)||mode(taxMode)!==context.taxMode||
     ![undefined,'',0,1,2].includes(taxMode))fail('reviewed context must match shop tax mode');
}
export function projectR4LordSaleTax({context,count,gross,basePrice}){
  if(!contexts.has(context))fail('reviewed context required');
  if(!uint(count)||count===0||!uint(gross)||gross===0||gross%count!==0||
     !uint(basePrice)||basePrice===0||gross>Math.floor(Number.MAX_SAFE_INTEGER/100))
    fail('positive safe natural-sale inputs required');
  // Preserve the original operation order: price is the total, not unit price.
  const result=calculateSourceSaleTax({basePrice,count,totalPrice:gross,plusTaxRate:context.userTaxRate});
  return {userTaxRate:context.userTaxRate,...result};
}
