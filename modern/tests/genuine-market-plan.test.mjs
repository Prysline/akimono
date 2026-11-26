import test from 'node:test';
import assert from 'node:assert/strict';
import {planGenuineMarketStep,legalMarketWaitMinutes,chooseGenuineFundingSale} from './support/genuine-market-plan.mjs';
const offer={canBuy:true,price:50000,marketStock:1,limit:20,timeSeconds:600};
const base={offer,owned:0,needed:1,partial:false,money:41761,remaining:70063};
test('market player reports actual liquidity, not clock exhaustion, for #66 failure evidence',()=>{
  assert.deepEqual(planGenuineMarketStep(base),{kind:'fund',quantity:1,total:50000,required:50000,shortfall:8239});
  assert.equal(planGenuineMarketStep({...base,money:50000}).kind,'buy');
  assert.equal(planGenuineMarketStep({...base,money:50000,reserve:45000}).kind,'fund');
  assert.equal(planGenuineMarketStep({...base,money:95000,reserve:45000}).kind,'buy');
  assert.equal(planGenuineMarketStep({...base,money:50000,remaining:599}).kind,'time');
  assert.equal(planGenuineMarketStep({...base,offer:null}).reason,'no-source-offer');
  assert.equal(planGenuineMarketStep({...base,offer:{...offer,canBuy:false,marketStock:0}}).reason,'source-market-empty');
  assert.equal(planGenuineMarketStep({...base,offer:{...offer,canBuy:false}}).reason,'source-rule-unavailable');
  assert.throws(()=>planGenuineMarketStep({...base,offer:{...offer,price:null}}),/invalid live source market quote/);
  assert.equal(planGenuineMarketStep({...base,needed:2}).reason,'insufficient-quantity');
  assert.equal(planGenuineMarketStep({...base,needed:2,partial:true,money:50000}).quantity,1);
  assert.equal(planGenuineMarketStep({...base,owned:20,offer:{...offer,canBuy:false}}).reason,'source-carrying-limit');
  assert.equal(planGenuineMarketStep({...base,money:-100000,reserve:45000,offer:{...offer,price:0}}).kind,'buy');
  assert.equal(legalMarketWaitMinutes({crossPeriod:false,boundary:59}),0);
  assert.equal(legalMarketWaitMinutes({crossPeriod:false,boundary:61}),1);
  assert.equal(legalMarketWaitMinutes({crossPeriod:true,boundary:59}),60);
});

test('long genuine funding strategy sells only declared surplus and retains live showcases',()=>{
  const held={41:0,47:7,53:12,58:0,43:10,75:9};
  const stock=id=>held[id]??0,surplusItems=[41,47,53,58];
  assert.equal(chooseGenuineFundingSale({currentItem:0,stock,surplusItems}),47);
  assert.equal(chooseGenuineFundingSale({currentItem:41,stock,surplusItems}),47);
  assert.equal(chooseGenuineFundingSale({currentItem:53,stock,surplusItems}),null);
  assert.equal(chooseGenuineFundingSale({currentItem:75,stock,surplusItems}),null);
  assert.equal(chooseGenuineFundingSale({currentItem:0,stock,surplusItems:[41,58]}),null);
  assert.equal(held[43],10);
});
