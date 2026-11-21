import {
  projectOriginalBookWorkCallback,projectOriginalShowcaseResizeCallback,
} from '../src/original-inline-work-showcase-model.mjs';

const work1=projectOriginalBookWorkCallback({
  money:700,param1:3000,count:2,
  shopId:42,shopName:'原版店',moneyPrefix:'¥',
});
const work2=projectOriginalBookWorkCallback({
  money:900,param1:10000,count:1,
  shopId:42,shopName:'原版店',moneyPrefix:'¥',
});
const resized=projectOriginalShowcaseResizeCallback({
  showcaseCount:2,showcase:[10,20],prices:[100,200],
  newCount:4,shopId:88,shopName:'展覽店',
});
const sourceMismatch=projectOriginalShowcaseResizeCallback({
  showcaseCount:1,showcase:[2,4,6,8,10],
  prices:[20,40,60,80,100],newCount:3,
  shopId:88,shopName:'展覽店',
});
console.log(JSON.stringify({
  source:'original Standard Street item13 and item63 inline Perl source',
  workFirstAction:{
    moneyBefore:work1.moneyBefore,moneyAfter:work1.moneyAfter,
    returned:work1.returned,recordedLogCallArgs:work1.logCalls,
  },
  workSecondActionSameLocalFunction:{
    moneyBefore:work2.moneyBefore,moneyAfter:work2.moneyAfter,
    returned:work2.returned,recordedLogCallArgs:work2.logCalls,
  },
  showcaseExpansion:{
    showcaseCountBefore:resized.showcaseCountBefore,
    showcaseCountAfter:resized.showcaseCountAfter,
    showcase:resized.showcase,prices:resized.prices,
    recordedLogCallArgs:resized.logCalls,
  },
  originalMismatchPreserved:{
    showcase:sourceMismatch.showcase,prices:sourceMismatch.prices,
    showcaseCountAfter:sourceMismatch.showcaseCountAfter,
    note:'Original expansion only overwrites oldCount..newCount-1, does not truncate preexisting tail',
  },
  caveat:'No real money balances, inventory, log writes, DSL compilation, real CGI or persistence; these are source-faithful synthetic callback projections',
},null,2));
