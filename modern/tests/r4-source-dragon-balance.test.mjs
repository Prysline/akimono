import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  reviewR4DragonBalance,projectR4DragonBalance,R4_DRAGON_BALANCE_SOURCE,
} from '../src/original-r4-dragon-balance.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const originalPeriod=await readFile(
  path.join(root,'modern/tests/original-perl/period.cgi'),'utf8');
const reviewed=reviewR4DragonBalance({periodSource:originalPeriod});
const realPerl=()=>JSON.parse(execFileSync('perl',
  ['original-r4-dragon-balance-probe.pl'],{
    cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
  }));

test('original frozen DragonBalance actually reads/unlinks payout file then applies source per-shop ledger',()=>{
  assert.equal(reviewed.source,R4_DRAGON_BALANCE_SOURCE);
  assert.equal(reviewed.committable,false);
  const source=realPerl();
  assert.equal(source.cases.length,9);
  for(const c of source.cases){
    const before=JSON.stringify(c.input);
    const got=projectR4DragonBalance({reviewed,...c.input});
    assert.deepEqual(got.shops,c.output.shops,c.name+' actual shop money/dragon/sales/payment');
    assert.deepEqual(got.logs,c.output.logs,c.name+' actual PushLog and source formatter');
    assert.equal(got.payoutFilePresent,c.output.payoutFilePresent,c.name+' real file');
    assert.equal(got.payoutFileConsumed,c.output.payoutFileConsumed,c.name+' real unlink');
    assert.equal(got.committable,false);
    assert.equal(JSON.stringify(c.input),before,'source snapshots remain immutable');
  }
  assert.equal(source.cases[0].output.shops[0].money,1500);
  assert.equal(source.cases[0].output.shops[1].paytoday,330,
    'negative dragon payout becomes period payment');
  assert.equal(source.cases[4].output.shops[0].dragon,50,
    'frozen source chop removes last digit when no terminating newline');
});
test('separate original Perl invocations reproduce the same literal payout text and file side effects',()=>{
  for(let i=0;i<2;i++)for(const row of realPerl().cases){
    const got=projectR4DragonBalance({reviewed,...row.input});
    assert.deepEqual(got.shops,row.output.shops);
    assert.equal(got.payoutFileConsumed,row.output.payoutFileConsumed);
  }
});
test('DragonBalance original source drift, malformed payout, unsafe cash and missing world data fail closed',()=>{
  assert.throws(()=>reviewR4DragonBalance({
    periodSource:originalPeriod.replace('chop $req[$_];','chomp $req[$_];'),
  }),/original payout source drift/);
  assert.throws(()=>reviewR4DragonBalance({
    periodSource:originalPeriod.replace('DragonBalance();','DragonBalanceOther();'),
  }),/payout stage must precede/);
  const input=realPerl().cases[0].input;
  const before=JSON.stringify(input);
  for(const bad of ['1\tbad\n','1\t5','1\t2\n\n','1\t20\n2\t+5\n'])
    assert.throws(()=>projectR4DragonBalance({
      reviewed,...input,payoutText:bad,
    }),/R4 original DragonBalance/);
  assert.throws(()=>projectR4DragonBalance({
    reviewed,shops:[{...input.shops[0],money:Number.MAX_SAFE_INTEGER}],
    payoutText:'1\t200\n',
  }),/overflow/);
  assert.throws(()=>projectR4DragonBalance({
    reviewed,shops:[{...input.shops[0],dragon:null}],
    payoutText:'1\t200\n',
  }),/original shop cash/);
  assert.throws(()=>projectR4DragonBalance({
    reviewed,shops:[input.shops[0],input.shops[0]],payoutText:null,
  }),/original shop cash/);
  assert.equal(JSON.stringify(input),before);
});
