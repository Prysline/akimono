import {
  projectOriginalItemHelper,projectOriginalLostbookWithCoreItemHelper,
} from '../src/original-item-helper-model.mjs';
const normalUse=projectOriginalItemHelper({
  method:'UseItem',itemNo:1,stock:3,count:5,
  message:'商品消耗',result:{count:2},
});
const normalAdd=projectOriginalItemHelper({
  method:'AddItem',itemNo:1,stock:8,count:5,limit:10,
  message:'商品取得',result:{count:2},
});
const overlimit=projectOriginalItemHelper({
  method:'AddItem',itemNo:1,stock:15,count:0,limit:10,
  message:'額外請求',result:{count:2},
});
const nested=projectOriginalLostbookWithCoreItemHelper({
  itemNo:2,itemName:'書本乙',param1:1000,randomDraw:34,
  stock:0,result:{count:7},
});
console.log(JSON.stringify({
  source:'exact fixed Core inc-item.cgi helpers + reviewed Standard Street lostbook',
  normalUse,normalAdd,
  originalOverlimitAnomaly:overlimit,
  lostbookWithOriginalInMemoryCoreHelper:nested,
  boundary:'synthetic in-memory stock/result; original Perl source compared in tests, but no outer UseItem transaction, real CGI, logging, user state, locks or persistence',
},null,2));
