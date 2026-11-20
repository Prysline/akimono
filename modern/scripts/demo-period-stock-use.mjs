/**
 * B-20 frozen Core stock/use preflight demonstration. ALL values synthetic.
 * No actual UseItem, MakeAmount(>=20), random events, money transfer,
 * live game files, inventory mutation, job callbacks, or persistence.
 */
import {
  REVIEWED_USE_LIMITS,projectReviewedPeriodStock,
  projectReviewedUsePreflight,sampleReviewedSmallMakeAmount,
} from '../src/period-stock-use-model.mjs';

const slots=(first=[],fill=0)=>Array.from({length:79},(_,i)=>first[i]??fill);
const material=[
  {itemId:1,requiredPerUse:2,probabilityPermille:1000},
  {itemId:2,requiredPerUse:1,probabilityPermille:0},
];
const base={
  requestedCount:4,experience:10,needExperience:5,
  job:'farmer',needJob:'farmer',point:20,needPoint:10,
  rank:5,needPopularity:2,needsEvent:true,eventSatisfied:true,
  money:120,costPerUse:20,nowSeconds:1000,shopTimeSeconds:900,
  useTimeSeconds:20,stock:slots([4,6,7]),materials:material,
  callbacksConfirmedAbsent:true,
};
const period=projectReviewedPeriodStock({
  stock:slots([10.9,7.8,2.9]),
  limits:slots([10,20,2],100),
});
const scenario=[
  ['available materials cap count from 4 to 2',base],
  ['experience below requirement',{...base,needExperience:11}],
  ['job mismatch',{...base,needJob:'baker'}],
  ['required event not satisfied',{...base,eventSatisfied:false}],
  ['money limits 5 requests to 2',{...base,requestedCount:5,money:50,stock:slots([30,6,7])}],
  ['time limits 5 requests to 2',{...base,requestedCount:5,nowSeconds:950,stock:slots([30,6,7])}],
].map(([name,args])=>({name,result:projectReviewedUsePreflight(args)}));
const values=[0,0.499,0.5,0.999,0.3,0.6];
let idx=0;
const random=sampleReviewedSmallMakeAmount({
  units:values.length,probabilityPermille:500,random:()=>values[idx++],
});
let largeRandomRefused;
try{
  sampleReviewedSmallMakeAmount({
    units:20,probabilityPermille:500,random:()=>0.5,
  });
  throw new Error('Unexpectedly accepted large-amount random branch');
}catch(error){
  if(error.message.startsWith('Unexpectedly accepted'))throw error;
  largeRandomRefused=error.message;
}
let negativeSourceRiskRefused;
try{
  projectReviewedPeriodStock({
    stock:slots([-1.9]),limits:slots([10],100),
  });
  throw new Error('Unexpectedly accepted negative source stock');
}catch(error){
  if(error.message.startsWith('Unexpectedly accepted'))throw error;
  negativeSourceRiskRefused=error.message;
}
console.log(JSON.stringify({
  mode:'source-reviewed B-20, synthetic decisions only; no world writes',
  source:'fixed Core inc-period.cgi and plug/use.cgi',
  limits:REVIEWED_USE_LIMITS,
  period:{firstThree:period.stock.slice(0,3),changes:period.changed},
  usePreflight:scenario.map(x=>({
    name:x.name,count:x.result.projectedCount,eligible:x.result.eligible,
    reasons:x.result.blockReasons,
  })),
  smallStochastic:{draws:values,output:random},
  excluded:{largeRandomRefused,negativeSourceRiskRefused},
  limitsOfScope:[
    'preflight is not CheckUseItem with dynamic callbacks',
    'MakeAmount count>=20 is deliberately not reproduced',
    'original Core permits negative stock in period code; safe subset refuses',
    'no item consumption, resource changes, storage, CGI or commit',
  ],
},null,2));
