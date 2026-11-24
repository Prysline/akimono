/**
 * B-19 deterministic period rollover and UseItem experience-tail demo.
 *
 * No full Core period execution, item use, event callback, random selection,
 * CGI, filesystem I/O, guild fees, money settlement or world persistence.
 */
import {
  REVIEWED_EXP_CONFIG,projectReviewedPeriodHistory,projectReviewedUseExperience,
} from '../src/period-experience-model.mjs';

const row=(itemId,value)=>({itemId,value});
const period=projectReviewedPeriodHistory({
  itemyesterday:[row(1,99)],
  itemtoday:[row(1,5),row(3,7)],
  exp:[row(1,100),row(2,6),row(3,5),row(4,1),row(5,1000)],
});
const gain=projectReviewedUseExperience({
  exp:[row(1,900),row(2,700),row(3,800),row(4,850),row(5,900)],
  itemId:1,expPerUse:100,count:1,
});
const capped=projectReviewedUseExperience({
  exp:[row(1,990)],itemId:1,expPerUse:20,count:2,
});
let ambiguous;
try{
  projectReviewedUseExperience({
    exp:[row(1,900),row(2,900),row(3,900),row(4,900),row(5,900)],
    itemId:1,expPerUse:100,count:1,
  });
  throw new Error('Expected ambiguous Core experience sorting to be rejected');
}catch(error){
  if(/Expected ambiguous/.test(error.message))throw error;
  ambiguous=error.message;
}
console.log(JSON.stringify({
  mode:'frozen-Core-inspired pure period/experience subset; NO live I/O',
  config:REVIEWED_EXP_CONFIG,
  daily:{
    sourceToday:[row(1,5),row(3,7)],
    sourceYesterday:[row(1,99)],
    after:period,
  },
  experience:{
    gain,
    totalAfterGain:gain.exp.reduce((s,e)=>s+e.value,0),
    cap:capped,
    ambiguousEqualOthersRejected:ambiguous,
  },
  limitations:[
    'history rollover and exp decay are selected fragments of original inc-period.cgi',
    'experience gain/redistribution is only the exp tail of original plug/use.cgi',
    'other period effects, item costs and usage eligibility are not executed',
    'Core equal-exp sorting is unspecified; tied competing candidates rejected',
    'no real shop, guild, market, file, OS lock or CGI processing',
  ],
},null,2));
