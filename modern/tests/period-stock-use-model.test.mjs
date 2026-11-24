import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  REVIEWED_USE_LIMITS,projectReviewedPeriodStock,
  projectReviewedUsePreflight,sampleReviewedSmallMakeAmount,
} from '../src/period-stock-use-model.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [period,use]=await Promise.all([
  'modern/tests/original-perl/period.cgi','modern/tests/original-perl/use.cgi',
].map(p=>readFile(path.join(root,p),'utf8')));
const stock=(head=[],fill=0)=>Array.from({length:79},(_,i)=>head[i]??fill);
const materials=()=>[
  {itemId:1,requiredPerUse:2,probabilityPermille:1000},
  {itemId:2,requiredPerUse:1,probabilityPermille:0},
];
const args=()=>({
  requestedCount:4,experience:10,needExperience:5,
  job:'farmer',needJob:'farmer',point:20,needPoint:10,
  rank:5,needPopularity:2,needsEvent:true,eventSatisfied:true,
  money:120,costPerUse:20,nowSeconds:1000,shopTimeSeconds:900,
  useTimeSeconds:20,stock:stock([4,6,7]),materials:materials(),
  callbacksConfirmedAbsent:true,
});

test('B-20 fixed period code compares with limit then invokes Perl int',()=>{
  assert.ok(period.includes('$DT->{item}[$cnt-1]=$ITEM[$cnt]->{limit} if $DT->{item}[$cnt-1]>$ITEM[$cnt]->{limit};'));
  assert.ok(period.includes('$DT->{item}[$cnt-1]=int($DT->{item}[$cnt-1]);'));
  assert.equal(REVIEWED_USE_LIMITS.itemSlots,79);
});
test('B-20 pinned UseItem eligibility/count code includes the full reviewed gate',()=>{
  for(const line of [
    '$count=0 if $DT->{exp}{$USE->{itemno}}<$USE->{needexp};',
    '$count=0 if ($USE->{needjob} && ($DT->{job} ne $USE->{needjob}));',
    '$count=0 if ($USE->{needpoint} && ($DT->{point} < $USE->{needpoint}));',
    '$count=0 if ($USE->{needpop} && ($DT->{rank} < $USE->{needpop}));',
    '$count=0 if ($USE->{needevent} && !$DTevent{$USE->{needevent}});',
    '$count=int($DT->{money}/$USE->{money}) if ($DT->{money}<$USE->{money}*$count)&&($USE->{money});',
    '$count=int(($NOW_TIME-$DT->{time})/$usetime) if ($DT->{time}+$usetime* $count)>$NOW_TIME;',
    'my $itemcount=$item->{count}*($item->{proba}==0 ? 1 : $count);',
    '$count=int($DT->{item}[$itemno-1]/$item->{count});',
    '$USE->{result}->{count}=$count;',
  ])assert.ok(use.includes(line),line);
});
test('B-20 pinned MakeAmount code has zero, full, below-20 and large branches',()=>{
  assert.ok(use.includes('return 0 if ($p <= 0);'));
  assert.ok(use.includes('return $cnt if ($p >= 1000);'));
  assert.ok(use.includes('if ($cnt < 20) {'));
  assert.ok(use.includes('$i++ if rand(1000)<$p;'));
  assert.ok(use.includes('my $t = (-2*$sigma*rand())*(sin(2*3.1415926535*rand()));'));
});
test('B-20 inventory cap and floor match isolated period fragment',()=>{
  const out=projectReviewedPeriodStock({
    stock:stock([10.9,7.8,2.9]),limits:stock([10,20,2],100),
  });
  assert.deepEqual(out.stock.slice(0,3),[10,7,2]);
  assert.deepEqual(out.changed,[
    {itemId:1,from:10.9,to:10},{itemId:2,from:7.8,to:7},
    {itemId:3,from:2.9,to:2},
  ]);
});
test('B-20 inventory at cap or below unchanged, empty slots stay zero',()=>{
  const x=projectReviewedPeriodStock({
    stock:stock([10,7,0]),limits:stock([10,20,2],100),
  });
  assert.deepEqual(x.changed,[]);
  assert.equal(x.stock.length,79);
  assert.equal(x.stock[78],0);
});
test('B-21 preserve original negative stock (risk documented, not silently repaired)',()=>{
  const x=projectReviewedPeriodStock({
    stock:stock([-1.9]),limits:stock([10],100),
  });
  assert.equal(x.stock[0],-1);
  assert.deepEqual(x.changed,[{itemId:1,from:-1.9,to:-1}]);
});
test('B-20 invalid stock decimals, NaN and overflow refused as needed',()=>{
  for(const x of [NaN,Infinity,-Infinity,Number.MAX_SAFE_INTEGER+1]){
    assert.throws(()=>projectReviewedPeriodStock({
      stock:stock([x]),limits:stock([10],100),
    }),/stock\[0\]/);
  }
});
test('B-21 preserve original signed caps but reject noninteger/unsafe cap fixtures',()=>{
  const out=projectReviewedPeriodStock({
    stock:stock([5]),limits:stock([-1],100),
  });
  assert.equal(out.stock[0],-1);
  for(const x of [NaN,1.5,Number.MAX_SAFE_INTEGER+1]){
    assert.throws(()=>projectReviewedPeriodStock({
      stock:stock([5]),limits:stock([x],100),
    }),/limits\[0\]/);
  }
});
test('B-20 both stock and limit arrays require exactly 79 slots',()=>{
  assert.throws(()=>projectReviewedPeriodStock({
    stock:[1],limits:stock([5],100),
  }),/exactly 79/);
  assert.throws(()=>projectReviewedPeriodStock({
    stock:stock([1]),limits:[5],
  }),/exactly 79/);
});
test('B-20 stock correction never modifies caller arrays',()=>{
  const a=stock([10.9,7.8,2.9]);
  const b=stock([10,20,2],100);
  const beforeA=[...a],beforeB=[...b];
  projectReviewedPeriodStock({stock:a,limits:b});
  assert.deepEqual(a,beforeA);
  assert.deepEqual(b,beforeB);
});
test('B-20 period result nested arrays and change records are immutable',()=>{
  const r=projectReviewedPeriodStock({
    stock:stock([10.9]),limits:stock([10],100),
  });
  assert.ok(Object.isFrozen(r));
  assert.ok(Object.isFrozen(r.stock));
  assert.ok(Object.isFrozen(r.changed));
  assert.ok(Object.isFrozen(r.changed[0]));
  assert.throws(()=>{r.stock[0]=0;},TypeError);
});
test('B-20 normal use preflight effective count is lowered by materials',()=>{
  const r=projectReviewedUsePreflight(args());
  assert.equal(r.requestedCount,4);
  assert.equal(r.projectedCount,2);
  assert.equal(r.eligible,true);
  assert.deepEqual(r.blockReasons,[]);
});
test('B-20 experience shortage rejects use without executing item callbacks',()=>{
  const r=projectReviewedUsePreflight({...args(),needExperience:11});
  assert.equal(r.projectedCount,0);
  assert.deepEqual(r.blockReasons,['experience']);
});
test('B-20 job mismatch sets count to zero',()=>{
  const r=projectReviewedUsePreflight({...args(),needJob:'baker'});
  assert.equal(r.projectedCount,0);
  assert.deepEqual(r.blockReasons,['job']);
});
test('B-20 insufficient point sets count to zero',()=>{
  const r=projectReviewedUsePreflight({...args(),needPoint:21});
  assert.equal(r.projectedCount,0);
  assert.deepEqual(r.blockReasons,['point']);
});
test('B-20 insufficient popularity sets count to zero',()=>{
  const r=projectReviewedUsePreflight({...args(),needPopularity:6});
  assert.equal(r.projectedCount,0);
  assert.deepEqual(r.blockReasons,['popularity']);
});
test('B-20 required but missing event sets count to zero',()=>{
  const r=projectReviewedUsePreflight({...args(),eventSatisfied:false});
  assert.equal(r.projectedCount,0);
  assert.deepEqual(r.blockReasons,['event']);
});
test('B-20 no required event does not require event satisfied',()=>{
  const r=projectReviewedUsePreflight({...args(),needsEvent:false,eventSatisfied:false});
  assert.equal(r.projectedCount,2);
});
test('B-20 insufficient money floors requested count',()=>{
  const r=projectReviewedUsePreflight({
    ...args(),requestedCount:5,money:50,stock:stock([30,6,7]),
  });
  assert.equal(r.projectedCount,2);
});
test('B-20 available time floors requested count',()=>{
  const r=projectReviewedUsePreflight({
    ...args(),requestedCount:5,nowSeconds:950,stock:stock([30,6,7]),
  });
  assert.equal(r.projectedCount,2);
});
test('B-20 probability zero material checks one unit before MakeAmount uses zero',()=>{
  const r=projectReviewedUsePreflight({
    ...args(),materials:[{itemId:2,requiredPerUse:2,probabilityPermille:0}],
    stock:stock([40,1]),requestedCount:4,
  });
  assert.equal(r.projectedCount,0);
});
test('B-20 probability 1000 material checks count times unit requirements',()=>{
  const r=projectReviewedUsePreflight({
    ...args(),materials:[{itemId:2,requiredPerUse:2,probabilityPermille:1000}],
    stock:stock([40,3]),requestedCount:4,
  });
  assert.equal(r.projectedCount,1);
});
test('B-20 positive fractional probability materials still check full count',()=>{
  const r=projectReviewedUsePreflight({
    ...args(),materials:[{itemId:2,requiredPerUse:2,probabilityPermille:500}],
    stock:stock([40,3]),requestedCount:4,
  });
  assert.equal(r.projectedCount,1);
});
test('B-20 callback presence not modeled and never authorized by gate',()=>{
  for(const value of [undefined,false,null,0]){
    assert.throws(()=>projectReviewedUsePreflight({
      ...args(),callbacksConfirmedAbsent:value,
    }),/callbacks/);
  }
});
test('B-20 zero use time, future shop clock fail closed',()=>{
  assert.throws(()=>projectReviewedUsePreflight({
    ...args(),useTimeSeconds:0,
  }),/positive/);
  assert.throws(()=>projectReviewedUsePreflight({
    ...args(),shopTimeSeconds:1001,
  }),/future/);
});
test('B-20 malformed numeric counts, prices or experience fail closed',()=>{
  for(const value of [-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1]){
    assert.throws(()=>projectReviewedUsePreflight({
      ...args(),requestedCount:value,
    }),/requestedCount/);
    assert.throws(()=>projectReviewedUsePreflight({
      ...args(),needExperience:value,
    }),/needExperience/);
  }
});
test('B-20 checked multiplications cannot overflow safe integer arithmetic',()=>{
  assert.throws(()=>projectReviewedUsePreflight({
    ...args(),money:Number.MAX_SAFE_INTEGER,
    requestedCount:1000,costPerUse:Number.MAX_SAFE_INTEGER,
  }),/safe integer arithmetic/);
  assert.throws(()=>projectReviewedUsePreflight({
    ...args(),nowSeconds:Number.MAX_SAFE_INTEGER,shopTimeSeconds:0,
    requestedCount:1000,useTimeSeconds:Number.MAX_SAFE_INTEGER,
  }),/safe integer arithmetic/);
  assert.throws(()=>projectReviewedUsePreflight({
    ...args(),materials:[{itemId:2,requiredPerUse:Number.MAX_SAFE_INTEGER,
      probabilityPermille:500}],
    requestedCount:1000,stock:stock([40,4]),
  }),/safe integer arithmetic/);
});
test('B-20 duplicate, oversized or malformed material data is rejected',()=>{
  const one={itemId:1,requiredPerUse:2,probabilityPermille:1000};
  assert.throws(()=>projectReviewedUsePreflight({
    ...args(),materials:[one,one],
  }),/Duplicate/);
  for(const material of [
    {itemId:0,requiredPerUse:1,probabilityPermille:1000},
    {itemId:80,requiredPerUse:1,probabilityPermille:1000},
    {itemId:1,requiredPerUse:0,probabilityPermille:1000},
    {itemId:1,requiredPerUse:1,probabilityPermille:1001},
  ])assert.throws(()=>projectReviewedUsePreflight({
    ...args(),materials:[material],
  }),/item ID|material ID|requiredPerUse|probabilityPermille/);
});
test('B-20 malformed job, event or stock observations rejected',()=>{
  assert.throws(()=>projectReviewedUsePreflight({
    ...args(),job:'../../unsafe',
  }),/job identifier/);
  assert.throws(()=>projectReviewedUsePreflight({
    ...args(),needsEvent:null,
  }),/explicit booleans/);
  assert.throws(()=>projectReviewedUsePreflight({
    ...args(),stock:[1],
  }),/exactly 79/);
});
test('B-20 use results are immutable and source input untouched',()=>{
  const inArgs=args();
  const before=structuredClone(inArgs);
  const r=projectReviewedUsePreflight(inArgs);
  assert.deepEqual(inArgs,before);
  assert.ok(Object.isFrozen(r));
  assert.ok(Object.isFrozen(r.blockReasons));
  assert.ok(Object.isFrozen(r.materials));
  assert.ok(Object.isFrozen(r.materials[0]));
  assert.equal('writeAllowed' in r,false);
  assert.equal('itemConsumed' in r,false);
});
test('B-20 MakeAmount zero and full probabilities consume no RNG calls',()=>{
  let draws=0;
  const random=()=>{draws++;return 0.5;};
  assert.deepEqual(sampleReviewedSmallMakeAmount({
    units:12,probabilityPermille:0,random,
  }),{amount:0,draws:0});
  assert.deepEqual(sampleReviewedSmallMakeAmount({
    units:12,probabilityPermille:1000,random,
  }),{amount:12,draws:0});
  assert.equal(draws,0);
});
test('B-20 MakeAmount small stochastic branch counts supplied draws',()=>{
  const values=[0,0.499,0.5,0.999,0.3,0.6];
  let i=0;
  const r=sampleReviewedSmallMakeAmount({
    units:values.length,probabilityPermille:500,
    random:()=>values[i++],
  });
  assert.deepEqual(r,{amount:3,draws:6});
  assert.equal(i,6);
});
test('B-20 probability boundary draw exactly 0.5 is excluded at 500',()=>{
  const r=sampleReviewedSmallMakeAmount({
    units:2,probabilityPermille:500,random:()=>0.5,
  });
  assert.equal(r.amount,0);
});
test('B-20 invalid RNG outputs and omitted random callback are refused',()=>{
  assert.throws(()=>sampleReviewedSmallMakeAmount({
    units:3,probabilityPermille:500,
  }),/Explicit random/);
  for(const value of [-0.01,1,NaN,Infinity,'0.5']){
    assert.throws(()=>sampleReviewedSmallMakeAmount({
      units:1,probabilityPermille:500,random:()=>value,
    }),/Random draw/);
  }
});
test('B-20 probability >=20 randomized source branch remains intentionally unsupported',()=>{
  assert.throws(()=>sampleReviewedSmallMakeAmount({
    units:20,probabilityPermille:500,random:()=>0.2,
  }),/units/);
});
test('B-20 omitted probability, unsafe units or coefficient refused',()=>{
  for(const units of [-1,1.5,20,Number.MAX_SAFE_INTEGER]){
    assert.throws(()=>sampleReviewedSmallMakeAmount({
      units,probabilityPermille:500,random:()=>0.2,
    }),/units/);
  }
  for(const probabilityPermille of [-1,1001,1.5,undefined]){
    assert.throws(()=>sampleReviewedSmallMakeAmount({
      units:5,probabilityPermille,random:()=>0.2,
    }),/probabilityPermille/);
  }
});
test('B-20 zero units do not require a random callback',()=>{
  assert.deepEqual(sampleReviewedSmallMakeAmount({
    units:0,probabilityPermille:500,
  }),{amount:0,draws:0});
});
test('B-20 no source fragment makes this a complete UseItem or durable world model',()=>{
  const r=projectReviewedUsePreflight(args());
  const f=projectReviewedPeriodStock({
    stock:stock([0]),limits:stock([100],100),
  });
  assert.match(r.scope,/no item execution, callbacks or commit/);
  assert.match(f.scope,/no complete period or writes/);
  assert.equal('fundsDebited' in r,false);
  assert.equal('actualGameState' in f,false);
});
