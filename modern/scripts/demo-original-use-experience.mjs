import {projectOriginalUseWithExperience} from '../src/original-use-experience-transaction-model.mjs';

const common={
  shops:[[8,4,3],[3,4,2]],actingShopIndex:0,
  items:[
    {code:true,limit:10,wslimit:8},
    {code:true,limit:6,wslimit:-10},
    {code:false,limit:5,wslimit:1},
  ],
  wholesale:[4,0,-5],
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
  requestedCount:4,experience:200,needExperience:100,experienceOld:null,
  job:'worker',needJob:'worker',point:10,needPoint:10,rank:20,
  needPopularity:10,needsEvent:true,eventActive:true,
  money:70,costPerUse:20,paytoday:5,nowSeconds:1000,
  storedTimeSeconds:950,baseUseTimeSeconds:20,trainedUseTimeSeconds:10,
  maxStockTimeSeconds:259200,shopStatus:true,
  selectedItemId:1,expPerUse:30,experienceRecords:[{itemId:1,value:200}],
  experienceLimit:3600,callbacksConfirmedAbsent:true,
};
const normal=projectOriginalUseWithExperience(common);
const overflow=projectOriginalUseWithExperience({
  ...common,experience:900,requestedCount:1,expPerUse:100,
  experienceRecords:[
    {itemId:1,value:900},{itemId:2,value:700},
    {itemId:3,value:800},{itemId:4,value:850},{itemId:5,value:900},
  ],
});
console.log(JSON.stringify({
  source:'fixed Core UseItem before and after the callback boundary, callback-free fixture',
  normal:{
    effectiveCount:normal.transaction.count,moneyAfter:normal.transaction.money,
    timeAfter:normal.transaction.storedTimeSeconds,
    shopStockAfter:normal.transaction.shops[0],
    wholesaleAfter:normal.transaction.wholesale,
    originalCreationLogs:normal.transaction.multiItem.added,
    experienceOld:normal.resultExpold,experienceAfter:normal.exp,
  },
  overflow:{
    experienceOld:overflow.resultExpold,experienceAfter:overflow.exp,
    originalPerlSortedKeys:overflow.sourceSortedKeys,
    reductions:overflow.reductions,remainingExcess:overflow.remainingExcess,
  },
  boundaries:'No dynamic item callback or real CGI/persistence; tied exp requires observed Perl sorted-key fixture',
},null,2));
