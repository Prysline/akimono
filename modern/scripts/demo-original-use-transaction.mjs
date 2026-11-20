import {projectOriginalUseTransaction} from '../src/original-use-transaction-model.mjs';

// Synthetic Core B-23 calculation, NOT a real game transaction.
// Keep duplicated production rows and zero-probability material unchanged.
const r=projectOriginalUseTransaction({
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
  storedTimeSeconds:950,baseUseTimeSeconds:20,
  trainedUseTimeSeconds:10,maxStockTimeSeconds:259200,
  shopStatus:true,
});
console.log(JSON.stringify({
  source:'fixed Core UseItem gate + accounting + B-22 numeric fragment',
  requestedCount:r.requestedCount,effectiveCount:r.count,
  useTimeSeconds:r.useTimeSeconds,timeSpentSeconds:r.timeSpentSeconds,
  moneyAfter:r.money,paytodayAfter:r.paytoday,storedTimeAfter:r.storedTimeSeconds,
  actingShopStockAfter:r.shops[0],otherShopStockAfter:r.shops[1],
  marketAfterOverflow:r.multiItem.marketAfterOverflow,
  wholesaleAfterCheck:r.wholesale,
  materialLogs:r.multiItem.consumed,creationLogs:r.multiItem.added,
  marketChecks:r.wholeStoreChecks,
  warning:'synthetic memory only; no callbacks, exp redistribution, CGI or persistence',
},null,2));
