import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('P5 frozen Perl zero-price book market transaction and total street cap',t=>{
  const oracle=JSON.parse(execFileSync('perl',['p5-book-work-market-oracle.pl'],{
    cwd:fileURLToPath(new URL('./original-perl/',import.meta.url)),
    encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024,
  }));
  assert.equal(oracle.cases.length,16);
  for(const c of oracle.cases){
    const accepted=['success','zero-money','count-clamp','time-cap','peddle','appraiser','peddle-appraiser'].includes(c.case);
    const seconds=({peddle:300,appraiser:450,'peddle-appraiser':225})[c.case]??600;
    assert.equal(c.accepted,accepted,c.case);
    assert.equal(c.trueMarketPrice,0,c.case);
    assert.equal(c.trueMarketTimeSeconds,seconds,c.case);
    assert.equal(c.tax,0,c.case);
    assert.equal(c.taxRate,0,c.case);
    assert.equal(c.money,c.moneyBefore,c.case);
    assert.equal(c.paytoday,123,c.case);
    assert.equal(c.giftStock,5,c.case);
    if(accepted){
      assert.equal(c.purchasedCount,1,c.case);
      assert.equal(c.stock,1,c.case);
      assert.equal(c.marketBefore,1,c.case);
      assert.equal(c.marketStock,0,c.case);
      assert.equal(c.actualTax,0,c.case);
      assert.equal(c.time,Math.max(c.timeBefore,897400-259200)+seconds,c.case);
      assert.equal(c.commits,1,c.case);
      assert.equal(c.writes,1,c.case);
      assert.deepEqual(c.stages,['item-init','global-after-account','source-market-write'],c.case);
      assert.equal(c.logs.length,1,c.case);
      assert.equal(c.logs[0][0],0,c.case);
      assert.equal(c.logs[0][1],1,c.case);
      assert.match(c.logs[0][2],/資金賺取方法/);
      assert.ok(c.logs[0][2].includes(seconds+'s'),c.case);
    }else{
      assert.equal(c.stock,c.ownedBefore,c.case);
      assert.equal(c.marketStock,c.marketBefore,c.case);
      assert.equal(c.time,c.timeBefore,c.case);
      assert.equal(c.commits,0,c.case);
      assert.equal(c.writes,0,c.case);
      assert.deepEqual(c.logs,[],c.case);
    }
    if(c.case==='held'||c.case==='sold-out')assert.equal(c.marketBefore,0,c.case);
  }
  t.diagnostic('P5 original Perl market cases='+JSON.stringify(oracle.cases.map(({case:c,accepted,purchasedCount,trueMarketPrice,trueMarketTimeSeconds,tax,money,marketStock})=>({case:c,accepted,purchasedCount,trueMarketPrice,trueMarketTimeSeconds,tax,money,marketStock}))));
});
