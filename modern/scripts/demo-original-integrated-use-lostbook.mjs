import {projectOriginalIntegratedUseLostbook as run}
  from '../src/original-integrated-use-lostbook-model.mjs';

// All examples have deterministic 0/1000 source material probabilities.
// Explicit randomDraw is a controlled fixture, not a JS translation of
// seeded Perl rand(1000). The 13 source-Perl probes use ACTUAL Perl draws.
const baseline=run({originalPerlDraw:128});
const notTriggered=run({originalPerlDraw:128,param1:0});
const zeroStock=run({
  originalPerlDraw:128,emptyActions:true,initialStock:0,requestedCount:1,
});
const duplicate=run({
  originalPerlDraw:128,duplicateMaterials:true,requestedCount:1,
});
const blocked=run({originalPerlDraw:128,money:10});
console.log(JSON.stringify({
  source:'SHA-pinned Core plug/use.cgi UseItem, calc time, wholesale, Core item::UseItem and exact Standard Street lostbook',
  baseline:{
    trace:baseline.trace,successfulCount:baseline.count,
    stateAfter:{stock:baseline.stock,wholesale:baseline.wholesale,
      money:baseline.money,paytoday:baseline.paytoday,time:baseline.time,
      exp:baseline.exp},
    expAtCallback:baseline.expAtCallback,
    stockAtCallback:baseline.stockAtCallback,
    originalResult:baseline.result,
  },
  branchSkipped:{stock:notTriggered.stock,result:notTriggered.result},
  zeroStock:{stock:zeroStock.stock,result:zeroStock.result},
  duplicateMaterialAnomaly:{
    stockBeforeCallback:duplicate.stockAtCallback,
    effectiveNestedCount:duplicate.nestedUse?.effectiveCount,
    stock:duplicate.stock,result:duplicate.result,
  },
  blocked:{trace:blocked.trace,money:blocked.money,result:blocked.result},
  boundary:'synthetic deterministic selected source; no full CGI/DSL compilation, unknown callbacks, actual user/world files, real RequireFile, persistence, or HTTP',
},null,2));
