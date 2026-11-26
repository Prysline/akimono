/** Frozen sweep.cgi/sweep-s.cgi and stock.cgi view gate.
 * Original form threshold is NOT an additional submission guard. */
import {createHash} from 'node:crypto';
import {parseDsl} from './parse-dsl.mjs';
const pins={formSource:'720d950c288c44b2ac664193a7c9e96c5a2b18d0',submitSource:'cecf6b31bfb231ca4b98b37082076171b1e9577c',stockViewSource:'8465b8dd3c0d2ef8c81078b617806fcc9ed469ae',calcSource:'586354a9a300e26d0e12a4efa512fa25760e3197',itemSource:'b39400d7dc0ab80062c392ae2bbc923e24ecacf8',itemDsl:'7a18185e98b32aee82ca1ce30d6f3c395157dbcb',compilerSource:'1da8cce1e76ad6159325a37faec68efaa82c7f69',configSource:'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0',readSource:'e7a8add7b0291901e71fe797783b664dff1568a0',writeSource:'203f33b37511e838800a45b84183af98fcf46e4c',customSource:'93d7f77df648df0c46e5dca4763afd3d2c48654b'};
const reviews=new WeakSet();
const fail=s=>{throw new RangeError('R4 original sweep: '+s)};
const safe=n=>Number.isSafeInteger(n)&&n>=0;
export function reviewOriginalSweep(sources){
 for(const [k,sha] of Object.entries(pins)){
   const s=sources[k];if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('frozen source drift '+k);
 }
 const d=parseDsl(sources.itemDsl,'custom/inc-item-data.cgi').blocks.find(b=>b.kind==='DEFINE');
 const time=d.fields.timesendmoney?.[0]?.value,plus=d.fields.timesendmoneyplus?.[0]?.value;
 if(time!=='20m'||plus!=='100000'||!sources.configSource.includes('=72*60*60;'))fail('frozen compiled cleaning constants');
 const review=Object.freeze({base:20*60,plus:Number(plus),maxStockSeconds:72*3600});reviews.add(review);return review;
}
function context(reviewed,world){
 if(!reviews.has(reviewed))fail('source review required');
 if(!world?.shops?.length)return null;
 const s=world.shops[0];
 if(world.shops.length!==1||s.id!==1||s.status!==1||![undefined,null,0,'',false].includes(s.guild)||!safe(s.trush??0)||!safe(s.time)||!safe(world.nowSeconds))fail('independent source shop');
 const garbage=s.trush??0,stockSeconds=Math.min(world.nowSeconds-s.time,reviewed.maxStockSeconds);
 const availableHours=Math.trunc(stockSeconds/3600);
 const dealSeconds=garbage===0?0:Math.trunc(reviewed.base*garbage/reviewed.plus)+reviewed.base;
 return {s,garbage,availableHours,dealSeconds};
}
export function describeOriginalSweep({reviewed,world}){
 const c=context(reviewed,world);if(c===null)return null;
 const {garbage,availableHours,dealSeconds}=c;
 const estimatedSeconds=dealSeconds-reviewed.base+3599;
 const cleanHours=Math.trunc(estimatedSeconds/3600);
 const canSweep=garbage>=10000&&availableHours>=1;
 const options=[],labels=new Map([1,2,3,5,10].map(n=>[n,String(n)]));
 labels.set(availableHours,availableHours+'（時間最大）');labels.set(cleanHours,cleanHours+'（掃除最大）');
 let prior=0;
 if(canSweep)for(const n of [1,2,3,5,10,cleanHours,availableHours].sort((a,b)=>a-b)){
   if(n>cleanHours||n>availableHours||n===prior)break;
   options.push({hours:n,label:labels.get(n)});prior=n;
 }
 const cleanPercent=Math.min(100,Math.trunc(garbage/50000));
 return {garbage,garbageKg:Math.trunc(garbage/10000),estimatedSeconds:garbage>=10000?estimatedSeconds:0,estimatedHours:garbage>=10000?cleanHours:0,availableHours:Math.max(0,availableHours),canSweep,options,stockBlocked:garbage>5000000,cleanPercent,
   cleanLabel:cleanPercent>=80?'垃圾屋':cleanPercent>=60?'髒亂':cleanPercent>=40?'普通':cleanPercent>=20?'乾淨':'漂亮'};
}
export function projectOriginalSweep({reviewed,world,command}){
 const c=context(reviewed,world);
 if(c===null||command.kind!=='sweep-shop'||command.shopId!==1||!safe(command.requestedHours)||command.requestedHours<1)fail('source sweep command');
 const {s,garbage,availableHours,dealSeconds}=c;
 const count=Math.min(command.requestedHours,availableHours);
 if(count<1)fail('source sweep needs stored hour');
 const spent=Math.min(dealSeconds,count*3600),removed=Math.min(garbage,count*3600/reviewed.base*reviewed.plus);
 const next={...s,trush:garbage-removed,time:Math.max(s.time,world.nowSeconds-reviewed.maxStockSeconds)+spent,lastlogin:world.nowSeconds};
 return {shops:[next],receipt:{action:'sweep-shop',source:'r4-frozen-sweep-s.v1',shopId:1,requestedHours:command.requestedHours,effectiveHours:count,timeSpentSeconds:spent,garbageBefore:garbage,garbageRemoved:removed,garbageAfter:next.trush,garbageBeforeKg:Math.trunc(garbage/10000),garbageRemovedKg:Math.trunc(removed/10000),garbageAfterKg:Math.trunc(next.trush/10000)}};
}
