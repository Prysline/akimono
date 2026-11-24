/**
 * B-21 original-behavior-first synthetic demonstration.
 * No changes to frozen Core, no live save, no CLI execution of CGI.
 * Known oddities belong in docs/original-behavior-issues.md.
 */
import {
  projectOriginalMakeAmount,projectOriginalCreateThenWholesale,
} from '../src/original-use-outcomes-model.mjs';
import {projectReviewedPeriodStock} from '../src/period-stock-use-model.mjs';

const rng=(sequence)=>{
  let i=0;
  return ()=>{
    if(i>=sequence.length)throw Error('Unexpected additional random draw');
    return sequence[i++];
  };
};
const scenario=[
  {name:'19 units use source per-unit random',count:19,
    probabilityPermille:500,random:()=>0.5},
  {name:'20 units use source sqrt(abs(t)) with negative t',
    count:20,probabilityPermille:500,random:rng([0.5,0.25])},
  {name:'20 units use source sqrt(abs(t)) with positive t',
    count:20,probabilityPermille:500,random:rng([0.5,0.75])},
  {name:'original p<=0 remains zero',count:20,probabilityPermille:-10},
  {name:'original p>=1000 remains full count',count:20,probabilityPermille:1100},
].map(({name,...input})=>({
  name,sourceMath:projectOriginalMakeAmount(input),
}));
const base={
  producedCount:5,shopStockBefore:8,itemLimit:10,
  wholesaleStockBefore:0,otherShopsStock:0,shopCount:1,
  wslimit:15,itemHasCode:true,
};
const market=[
  ['8+5 limited at 10, three to wholesale',base],
  ['wholesale recapped after overflow',{...base,wholesaleStockBefore:4}],
  ['shop already above capacity creates original negative retained count',
    {...base,shopStockBefore:12,producedCount:2}],
  ['uncoded source item bypasses CheckWholeStore',
    {...base,wholesaleStockBefore:-5,itemHasCode:false}],
  ['fractional wslimit with two shops',
    {...base,wslimit:0.5,shopCount:2,otherShopsStock:10}],
].map(([name,input])=>({
  name,outcome:projectOriginalCreateThenWholesale(input),
}));
const stock=Array(79).fill(0),limits=Array(79).fill(10);
stock[0]=-1.9;
const negativeSourceStock=projectReviewedPeriodStock({stock,limits}).stock[0];
if(negativeSourceStock!==-1)throw Error('Original signed inventory was silently corrected');
const outcome={
  mode:'B-21 core original behavior before enhancements (pure synthetic data)',
  originalRandom:scenario,
  originalCreateThenMarket:market,
  originalPeriodNegativeStock:{before:-1.9,after:negativeSourceStock},
  issueRegister:'modern/docs/original-behavior-issues.md',
  limits:[
    'Original Core math and branch order retained, not conventional probability formulas',
    'Risky negative and anomalous results are documented, not auto-fixed',
    'This does not execute full UseItem, item callbacks, CGI or live world writes',
    'JS numeric math and supplied random draws do not claim seeded Perl RNG identity',
  ],
};
console.log(JSON.stringify(outcome,null,2));
