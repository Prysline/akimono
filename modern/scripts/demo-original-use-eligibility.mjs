import {projectOriginalUseEligibility} from '../src/original-use-eligibility-model.mjs';

const jobName='item::_job_use_7_worker_';
const genericName='item::_job_use_0_worker_';
const results=projectOriginalUseEligibility({
  stock:[5,2,0],job:'worker',mode:'list',
  uses:[
    {no:7,materials:[{itemId:1,count:4}]},
    {no:8,materials:[{itemId:1,count:1}],functionbefore:'display_only',useok:1},
    {no:9,materials:[{itemId:1,count:1}],functionbefore:'reject',dispok:1},
  ],
  jobFunctions:{
    [jobName]:{returnValue:999,effects:[{op:'set-material-count',index:0,value:3}]},
    [genericName]:{returnValue:0,effects:[{op:'set-material-count',index:0,value:2}]},
  },
  beforeFunctions:{
    'item::display_only':{returnValue:2},
    'item::reject':{returnValue:1},
  },
});
console.log(JSON.stringify({
  source:'pinned Core CheckUseItem / GetUseItemListSub with bounded artificial callbacks',
  statuses:results.statuses,
  originalFlags:results.records.map(({no,dispok,useok,materials})=>({
    no,dispok:dispok??null,useok:useok??null,materials,
  })),
  callbackCalls:results.trace.filter(x=>x.phase!=='material'),
  stockAfter:results.stock,
  warning:'Display/use flags are not transaction authorization; no compiled DSL, real job/callback, CGI, or persistence',
},null,2));
