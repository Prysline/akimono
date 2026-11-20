import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  CORE_PI_LITERAL,projectOriginalMakeAmount,projectOriginalCreateThenWholesale,
} from '../src/original-use-outcomes-model.mjs';
import {projectReviewedPeriodStock} from '../src/period-stock-use-model.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [use,whole,period]=await Promise.all([
  'modern/tests/original-perl/use.cgi',
  'modern/tests/original-perl/whole.cgi',
  'modern/tests/original-perl/period.cgi',
].map(x=>readFile(path.join(root,x),'utf8')));
const draws=(values)=>{
  let index=0;
  return ()=>{
    if(index>=values.length)throw Error('RNG over-consumption');
    return values[index++];
  };
};
const base=()=>({
  producedCount:5,shopStockBefore:8,itemLimit:10,
  wholesaleStockBefore:0,otherShopsStock:0,shopCount:1,
  wslimit:15,itemHasCode:true,
});

test('B-21 pinned MakeAmount uses exact large sqrt(abs(t)) without a post-clamp',()=>{
  assert.equal(CORE_PI_LITERAL,3.1415926535);
  for(const text of [
    'my $ave=$cnt*$p;',
    'my $sigma=$ave*(1-$p);',
    'my $t = (-2*$sigma*rand())*(sin(2*3.1415926535*rand()));',
    'return int( sqrt(($t < 0) ? -$t : $t)+$ave +0.5);',
  ])assert.ok(use.includes(text),text);
  assert.ok(!use.slice(use.indexOf('sub MakeAmount'),use.indexOf('sub AddItem'))
    .includes('$cnt if $cnt<'));
});
test('B-21 original UseItem production order and whole-store source are pinned',()=>{
  for(const text of [
    '$itemcount-=$ITEM[$itemno]->{limit}-$DT->{item}[$itemno-1];',
    '$DTwholestore[$itemno-1]+=$itemcount;',
    '$itemcount=$ITEM[$itemno]->{limit}-$DT->{item}[$itemno-1];',
    '$DT->{item}[$itemno-1]+=$itemcount;',
    'CheckWholeStore();',
  ])assert.ok(use.includes(text),text);
  for(const text of [
    'next if !$ITEM[$cnt]->{code};',
    'my $shopcount=@DT; $shopcount||=1;',
    '$ITEM->{wslimit}<0 ? -$ITEM->{wslimit} : int($ITEM->{wslimit}*$shopcount+0.99)',
    '$DTwholestore[$cnt-1]=$limitcount-$limit;',
    '$DTwholestore[$cnt-1]=0 if $DTwholestore[$cnt-1]<0;',
  ])assert.ok(whole.includes(text),text);
  assert.ok(period.includes('int($DT->{item}[$cnt-1])'));
});
test('B-21 original p<=0 and >=1000 branches keep their exact outcomes',()=>{
  assert.deepEqual(projectOriginalMakeAmount({
    count:20,probabilityPermille:-5,
  }),{amount:0,draws:0,branch:'zero-probability'});
  assert.deepEqual(projectOriginalMakeAmount({
    count:20,probabilityPermille:1100,
  }),{amount:20,draws:0,branch:'full-probability'});
});
test('B-21 source small branch uses one sampled draw per unit',()=>{
  assert.deepEqual(projectOriginalMakeAmount({
    count:3,probabilityPermille:500,random:draws([0.49,0.5,0.9]),
  }),{amount:1,draws:3,branch:'per-unit'});
});
test('B-21 count=19 uses 19 draws, count=20 uses only 2',()=>{
  let n=0;
  const a=projectOriginalMakeAmount({
    count:19,probabilityPermille:500,random:()=>{n++;return 0.5;},
  });
  assert.equal(a.amount,0);assert.equal(a.draws,19);
  const b=projectOriginalMakeAmount({
    count:20,probabilityPermille:500,random:()=>{n++;return 0.5;},
  });
  assert.equal(b.draws,2);
  assert.equal(n,21);
  assert.equal(b.amount,10);
});
test('B-21 fixed positive/negative source t produce same sqrt(abs(t)) result',()=>{
  const neg=projectOriginalMakeAmount({
    count:20,probabilityPermille:500,random:draws([0.5,0.25]),
  });
  const pos=projectOriginalMakeAmount({
    count:20,probabilityPermille:500,random:draws([0.5,0.75]),
  });
  assert.equal(neg.amount,12);
  assert.equal(pos.amount,12);
  assert.ok(neg.t<0&&pos.t>0);
  assert.equal(neg.average,10);
  assert.equal(neg.sigma,5);
});
test('B-21 zero random amount yields average+0.5, preserving source order',()=>{
  const x=projectOriginalMakeAmount({
    count:20,probabilityPermille:500,random:draws([0,0.3]),
  });
  assert.equal(x.t,0);
  assert.equal(x.amount,10);
});
test('B-21 numeric RNG validation prevents JS representation failures',()=>{
  for(const bad of [-0.1,1,NaN,Infinity,'0.5']){
    assert.throws(()=>projectOriginalMakeAmount({
      count:20,probabilityPermille:500,random:()=>bad,
    }),/random/);
  }
  assert.throws(()=>projectOriginalMakeAmount({
    count:20,probabilityPermille:500,
  }),/random/);
});
test('B-21 original negative period inventory is preserved in JS model',()=>{
  const current=Array(79).fill(0),limit=Array(79).fill(100);
  current[0]=-1.9;
  const x=projectReviewedPeriodStock({stock:current,limits:limit});
  assert.equal(x.stock[0],-1);
  limit[0]=-2;
  assert.equal(projectReviewedPeriodStock({stock:current,limits:limit}).stock[0],-2);
});
test('B-21 one-item production 8+5 with cap10 sends exactly 3 to wholesale',()=>{
  const r=projectOriginalCreateThenWholesale(base());
  assert.deepEqual({
    retained:r.retained,discarded:r.discarded,
    shopStockAfter:r.shopStockAfter,
    wholesaleAfterOverflow:r.wholesaleAfterOverflow,
    wholesaleAfterCheck:r.wholesaleAfterCheck,
  },{retained:2,discarded:3,shopStockAfter:10,
    wholesaleAfterOverflow:3,wholesaleAfterCheck:3});
});
test('B-21 wholesale recapping runs AFTER returning overflow',()=>{
  const r=projectOriginalCreateThenWholesale({
    ...base(),wholesaleStockBefore:4,
  });
  assert.equal(r.discarded,3);
  assert.equal(r.wholesaleAfterOverflow,7);
  assert.equal(r.wholesaleAfterCheck,5);
  assert.equal(r.marketLimit,15);
});
test('B-21 existing shop above cap makes original retained negative',()=>{
  const r=projectOriginalCreateThenWholesale({
    ...base(),producedCount:2,shopStockBefore:12,
  });
  assert.equal(r.retained,-2);
  assert.equal(r.discarded,4);
  assert.equal(r.shopStockAfter,10);
  assert.equal(r.wholesaleAfterOverflow,4);
});
test('B-21 market check happens even when output amount is 0',()=>{
  const r=projectOriginalCreateThenWholesale({
    ...base(),producedCount:0,shopStockBefore:10,
    wholesaleStockBefore:10,
  });
  assert.equal(r.discarded,0);
  assert.equal(r.wholesaleAfterOverflow,10);
  assert.equal(r.wholesaleAfterCheck,5);
});
test('B-21 item missing code skips whole-store adjustment',()=>{
  const r=projectOriginalCreateThenWholesale({
    ...base(),itemHasCode:false,wholesaleStockBefore:-5,
  });
  assert.equal(r.marketLimit,null);
  assert.equal(r.wholesaleAfterOverflow,-2);
  assert.equal(r.wholesaleAfterCheck,-2);
});
test('B-21 fixed negative wslimit is source absolute value',()=>{
  const r=projectOriginalCreateThenWholesale({
    ...base(),wslimit:-11,wholesaleStockBefore:10,
  });
  assert.equal(r.marketLimit,11);
  assert.equal(r.wholesaleAfterCheck,1);
});
test('B-21 fractional wslimit uses Core int(wslimit*shopcount+.99)',()=>{
  const r=projectOriginalCreateThenWholesale({
    ...base(),wslimit:0.5,shopCount:2,otherShopsStock:10,
  });
  assert.equal(r.marketLimit,1);
  assert.equal(r.wholesaleAfterCheck,0);
});
test('B-21 cannot clamp negative inventory or silently drop original oddity',()=>{
  const r=projectOriginalCreateThenWholesale({
    ...base(),shopStockBefore:-2,producedCount:5,itemLimit:10,
  });
  assert.equal(r.shopStockAfter,3);
  assert.equal(r.discarded,0);
});
test('B-21 results are frozen and never mutate caller fixtures',()=>{
  const input=base();const before=structuredClone(input);
  const result=projectOriginalCreateThenWholesale(input);
  assert.deepEqual(input,before);
  assert.ok(Object.isFrozen(result));
  assert.throws(()=>{result.retained=99;},TypeError);
});
test('B-21 source math projection never claims real transaction authority',()=>{
  const r=projectOriginalCreateThenWholesale(base());
  assert.equal('committed' in r,false);
  assert.equal('callbackResult' in r,false);
  assert.match(r.scope,/no real transaction or I\/O/);
});
