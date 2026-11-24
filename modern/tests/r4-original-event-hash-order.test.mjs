import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.join(path.dirname(fileURLToPath(import.meta.url)),'original-perl');
function originalRun(){
  return JSON.parse(execFileSync('perl',
    ['original-r4-event-hash-order-probe.pl'],{
      cwd:dir,encoding:'utf8',
    }));
}
test('R4 EVENT Perl compiler emits exactly the real 17-key hash',()=>{
  const result=originalRun();
  assert.equal(result.declaredCount,25);
  assert.equal(result.compiledCount,17);
  assert.equal(result.perlEventHashOrder.length,17);
  assert.deepEqual([...result.perlEventHashOrder].sort(),
    [...result.declarationOrder].sort());
  assert.deepEqual(result.perlEventHashOrder,result.perlEventHashOrderRepeated);
  assert.deepEqual([...result.perlActiveFixtureHashOrder].sort(),
    [...result.activeFixtureInsertionOrder].sort());
  assert.match(result.oracle,/frozen inc-makeitem/);
  assert.match(result.scope,/no full EVENT lifecycle/);
});
test('R4 hash order is process-observed, never a hardcoded DSL permutation',()=>{
  const runs=Array.from({length:4},originalRun);
  const compiled=[...runs[0].declarationOrder].sort();
  for(const sample of runs){
    assert.deepEqual([...sample.perlEventHashOrder].sort(),compiled);
    assert.deepEqual(sample.perlEventHashOrder,
      sample.perlEventHashOrderRepeated);
    assert.deepEqual([...sample.perlActiveFixtureHashOrder].sort(),
      [...sample.activeFixtureInsertionOrder].sort());
  }
  // Perl can randomize seeds between processes; neither equality nor
  // inequality of permutations across independent runs is assumed.
});
