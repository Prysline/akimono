/**
 * B-22 source-order demonstration, all numeric synthetic fixtures.
 * No real trading, CGI, callbacks, persistence, or seeded Perl RNG equivalence.
 */
import {projectOriginalMultiItemUse} from '../src/original-multi-item-use-model.mjs';

const sourceScenario={
  items:[
    {code:true,limit:10,wslimit:8},
    {code:true,limit:6,wslimit:-10},
    {code:false,limit:5,wslimit:1},
  ],
  shops:[[8,4,3],[3,4,2]],
  actingShopIndex:0,wholesale:[4,0,-5],count:2,
  uses:[
    {itemId:1,countPerUse:2,probabilityPermille:1000},
    {itemId:2,countPerUse:1,probabilityPermille:0},
  ],
  creates:[
    {itemId:1,countPerUse:5,probabilityPermille:1000},
    {itemId:2,countPerUse:4,probabilityPermille:1000},
    {itemId:1,countPerUse:2,probabilityPermille:1000},
    {itemId:3,countPerUse:2,probabilityPermille:1000},
  ],
};
const baseline=projectOriginalMultiItemUse(sourceScenario);
if(JSON.stringify(baseline.shops)!==JSON.stringify([[10,6,5],[3,4,2]])||
   JSON.stringify(baseline.wholesale)!==JSON.stringify([3,0,-3])){
  throw Error('Original multi-item numeric result changed');
}
const series=[0,0.5,0,0.5,0.25];
let pos=0;
const stochastic=projectOriginalMultiItemUse({
  ...sourceScenario,count:1,
  uses:[{itemId:1,countPerUse:3,probabilityPermille:500}],
  creates:[{itemId:2,countPerUse:20,probabilityPermille:500}],
  random:()=>series[pos++],
});
if(stochastic.randomDraws!==5||pos!==5)throw Error('RNG source-order changed');
const noOutput=projectOriginalMultiItemUse({
  ...sourceScenario,uses:[],creates:[],wholesale:[99,99,-5],
});
console.log(JSON.stringify({
  phase:'B-22: original Core UseItem/CheckWholeStore numeric order only',
  source:'frozen plug/use.cgi and plug/whole.cgi',
  baseline:{
    materialUse:baseline.consumed,
    createLog:baseline.added,
    overflowLog:baseline.discarded,
    wholesaleBeforeCheck:baseline.marketAfterOverflow,
    wholesaleAfterCheck:baseline.wholesale,
    resultingShops:baseline.shops,
    wholesaleCheckCount:baseline.wholeStoreChecks,
  },
  rngOrder:{
    samples:stochastic.samples,
    randomDraws:stochastic.randomDraws,
  },
  noOutputsStillChecksWholesale:noOutput.wholesale,
  issueFile:'modern/docs/original-behavior-issues.md',
  limitations:[
    'Never recomputes wholesale between individual produced items',
    'Preserves duplicate output records and negative original numeric outcomes',
    'No real UseItem preflight, time/money, events, callbacks, Perl PRNG, file writes or CGI',
  ],
},null,2));
