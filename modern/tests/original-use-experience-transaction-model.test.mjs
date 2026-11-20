import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {projectOriginalUseWithExperience} from '../src/original-use-experience-transaction-model.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const useSource=await readFile(path.join(root,'modern/tests/original-perl/use.cgi'),'utf8');
const row=(itemId,value)=>({itemId,value});
const defaultOptions=()=>({
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
  needPopularity:10,needsEvent:true,eventActive:true,money:70,
  costPerUse:20,paytoday:5,nowSeconds:1000,storedTimeSeconds:950,
  baseUseTimeSeconds:20,trainedUseTimeSeconds:10,
  maxStockTimeSeconds:259200,shopStatus:true,
  selectedItemId:1,expPerUse:30,
  experienceRecords:[row(1,200)],experienceLimit:3600,
  callbacksConfirmedAbsent:true,
});
const run=overrides=>projectOriginalUseWithExperience({...defaultOptions(),...overrides});

test('B-24 pinned source: whole market check precedes callbacks and skill tail',()=>{
  const whole=useSource.indexOf('CheckWholeStore();',useSource.indexOf('#アイテム消費'));
  const callback=useSource.indexOf("RequireFile('inc-item.cgi');",whole);
  const gain=useSource.indexOf('#熟練度処理',callback);
  const make=useSource.indexOf('sub MakeAmount',gain);
  assert.ok(whole>=0&&whole<callback&&callback<gain&&gain<make);
  assert.ok(useSource.slice(gain,make).includes('if($USE->{exp})'));
  assert.ok(useSource.slice(gain,make).includes('$USE->{result}->{expold}=$exp+0;'));
});
test('B-24 source pins per-item cap, total cap, sort and literal denominator',()=>{
  assert.ok(useSource.includes('$expplus=1000-$exp if $exp+$expplus>1000;'));
  assert.ok(useSource.includes('if($LIMIT_EXP>0 && $expsum>$LIMIT_EXP)'));
  assert.ok(useSource.includes('my @key=sort { $DT->{exp}{$a} <=> $DT->{exp}{$b} }keys(%{$DT->{exp}});'));
  assert.ok(useSource.includes('my $keycnt=$#key;'));
  assert.ok(useSource.includes('my $expdown=int($expsum/$keycnt);'));
  assert.ok(useSource.includes('delete $DT->{exp}{$_} if !$DT->{exp}{$_};'));
});
test('B-24 full synthetic transaction: B23 accounting and new skill award compose',()=>{
  const r=run();
  assert.equal(r.transaction.count,2);
  assert.equal(r.transaction.money,30);
  assert.equal(r.transaction.paytoday,45);
  assert.equal(r.transaction.storedTimeSeconds,986);
  assert.deepEqual(r.transaction.shops,[[10,6,5],[3,4,2]]);
  assert.deepEqual(r.transaction.wholesale,[3,0,-3]);
  assert.deepEqual(r.transaction.multiItem.added,[
    {itemId:1,amount:6},{itemId:2,amount:2},
    {itemId:1,amount:0},{itemId:3,amount:2},
  ]);
  assert.deepEqual(r.exp,[row(1,260)]);
  assert.equal(r.previousExp,200);
  assert.equal(r.resultExpold,200);
  assert.equal(r.rawExpAward,60);
  assert.equal(r.awardedExp,60);
  assert.equal(r.performedTail,true);
  assert.equal(r.overflowEntered,false);
});
test('B-24 direct Perl unique-exp overflow fixture matches full staged numbers',()=>{
  const r=run({
    experience:900,experienceRecords:[
      row(1,900),row(2,700),row(3,800),row(4,850),row(5,900),
    ],
    expPerUse:100,requestedCount:1,
  });
  assert.equal(r.transaction.count,1);
  assert.equal(r.previousExp,900);
  assert.equal(r.resultExpold,900);
  assert.equal(r.awardedExp,100);
  assert.equal(r.overflowEntered,true);
  assert.deepEqual(r.sourceSortedKeys,[2,3,4,5,1]);
  assert.deepEqual(r.exp,[
    row(1,1000),row(2,538),row(3,638),row(4,687),row(5,737),
  ]);
  assert.deepEqual(r.reductions.map(x=>[x.itemId,x.reduction]),
    [[2,162],[3,162],[4,163],[5,163]]);
  assert.equal(r.remainingExcess,0);
});
test('B-24 original skill cap only awards gap to 1000',()=>{
  const r=run({experience:990,experienceRecords:[row(1,990)],
    expPerUse:20,requestedCount:2});
  assert.deepEqual(r.exp,[row(1,1000)]);
  assert.equal(r.rawExpAward,40);
  assert.equal(r.awardedExp,10);
  assert.equal(r.resultExpold,990);
});
test('B-24 original existing exp >1000 causes NEGATIVE exp award',()=>{
  const r=run({experience:1050,experienceRecords:[row(1,1050)],
    expPerUse:1,requestedCount:1});
  assert.deepEqual(r.exp,[row(1,1000)]);
  assert.equal(r.rawExpAward,1);
  assert.equal(r.awardedExp,-50);
  assert.equal(r.resultExpold,1050);
});
test('B-24 negative expPerUse runs source truthy branch and subtracts skill',()=>{
  const r=run({expPerUse:-10,requestedCount:1});
  assert.deepEqual(r.exp,[row(1,190)]);
  assert.equal(r.awardedExp,-10);
  assert.equal(r.performedTail,true);
});
test('B-24 when negative award reaches zero, selected skill KEY remains',()=>{
  const r=run({expPerUse:-200,requestedCount:1});
  assert.deepEqual(r.exp,[row(1,0)]);
  assert.equal(r.performedTail,true);
});
test('B-24 expPerUse zero bypasses original skill tail without clearing expold',()=>{
  const r=run({expPerUse:0,requestedCount:1});
  assert.equal(r.performedTail,false);
  assert.deepEqual(r.exp,[row(1,200)]);
  assert.equal(r.previousExp,null);
  assert.equal(r.resultExpold,null);
  assert.equal(r.rawExpAward,0);
});
test('B-24 initial result expold survives exp=0 source branch',()=>{
  const r=run({expPerUse:0,experienceOld:1000,requestedCount:1});
  assert.equal(r.transaction.useTimeSeconds,10);
  assert.equal(r.resultExpold,1000);
  assert.equal(r.performedTail,false);
});
test('B-24 count zero skips every experience step and wholesale correction',()=>{
  const r=run({money:0});
  assert.equal(r.transaction.count,0);
  assert.equal(r.transaction.performed,false);
  assert.deepEqual(r.transaction.wholesale,[4,0,-5]);
  assert.equal(r.transaction.wholeStoreChecks,0);
  assert.deepEqual(r.exp,[row(1,200)]);
  assert.equal(r.resultExpold,null);
  assert.equal(r.performedTail,false);
});
test('B-24 tail updates expold AFTER current invocation uses previous expold',()=>{
  const r=run({experienceOld:1000});
  assert.equal(r.transaction.useTimeSeconds,10);
  assert.equal(r.transaction.count,3);
  assert.deepEqual(r.exp,[row(1,290)]);
  assert.equal(r.resultExpold,200);
});
test('B-24 second invocation can explicitly pass previous returned expold as fixture',()=>{
  const first=run({requestedCount:1});
  const next=run({experience:230,experienceRecords:first.exp,
    experienceOld:first.resultExpold,requestedCount:1});
  assert.equal(first.resultExpold,200);
  assert.equal(first.exp[0].value,230);
  assert.equal(next.transaction.useTimeSeconds,18);
  assert.equal(next.resultExpold,230);
  assert.deepEqual(next.exp,[row(1,260)]);
});
test('B-24 total cap zero disables reduction even when total >3600',()=>{
  const r=run({experience:900,experienceRecords:[
    row(1,900),row(2,700),row(3,800),row(4,850),row(5,900),
  ],expPerUse:100,requestedCount:1,experienceLimit:0});
  assert.equal(r.overflowEntered,false);
  assert.deepEqual(r.exp,[
    row(1,1000),row(2,700),row(3,800),row(4,850),row(5,900),
  ]);
});
test('B-24 total cap negative likewise disables source redistribution',()=>{
  const r=run({experience:900,experienceRecords:[
    row(1,900),row(2,900),row(3,900),row(4,900),row(5,900),
  ],expPerUse:100,requestedCount:1,experienceLimit:-1});
  assert.equal(r.overflowEntered,false);
  assert.equal(r.exp.reduce((n,x)=>n+x.value,0),4600);
});
test('B-24 only selected item can leave excess after source loop',()=>{
  const r=run({experience:900,experienceRecords:[row(1,900)],
    expPerUse:100,requestedCount:1,experienceLimit:500});
  assert.deepEqual(r.exp,[row(1,1000)]);
  assert.equal(r.overflowEntered,true);
  assert.deepEqual(r.sourceSortedKeys,[1]);
  assert.equal(r.remainingExcess,500);
  assert.deepEqual(r.reductions,[]);
});
test('B-24 source deletes reduced other item when remainder becomes 0',()=>{
  const r=run({experience:990,experienceRecords:[
    row(1,990),row(2,5),row(3,500),
  ],expPerUse:30,requestedCount:1,experienceLimit:1100});
  assert.deepEqual(r.exp,[row(1,1000),row(3,100)]);
  assert.deepEqual(r.reductions.map(x=>[x.itemId,x.reduction,x.after]),
    [[2,5,0],[3,400,100]]);
  assert.equal(r.remainingExcess,0);
});
test('B-24 NO item-id tie-break invented on equal exp in overflow',()=>{
  assert.throws(()=>run({experience:900,experienceRecords:[
    row(1,900),row(2,700),row(3,700),row(4,851),row(5,900),
  ],expPerUse:100,requestedCount:1}),/Observed Perl sorted keys/);
});
test('B-24 observed original tied Perl order: #2 before #3',()=>{
  const r=run({experience:900,experienceRecords:[
    row(1,900),row(2,700),row(3,700),row(4,851),row(5,900),
  ],expPerUse:100,requestedCount:1,
    observedPerlSortedKeys:[2,3,4,5,1]});
  assert.deepEqual(r.exp,[
    row(1,1000),row(2,563),row(3,562),row(4,713),row(5,762),
  ]);
  assert.deepEqual(r.reductions.map(x=>x.reduction),[137,138,138,138]);
});
test('B-24 observed original tied Perl order: #3 before #2 changes both results',()=>{
  const r=run({experience:900,experienceRecords:[
    row(1,900),row(2,700),row(3,700),row(4,851),row(5,900),
  ],expPerUse:100,requestedCount:1,
    observedPerlSortedKeys:[3,2,4,5,1]});
  assert.deepEqual(r.exp,[
    row(1,1000),row(2,562),row(3,563),row(4,713),row(5,762),
  ]);
  assert.deepEqual(r.sourceSortedKeys,[3,2,4,5,1]);
});
test('B-24 invalid observed order cannot silently replace original comparator',()=>{
  const cfg={experience:900,experienceRecords:[
    row(1,900),row(2,700),row(3,700),row(4,851),row(5,900),
  ],expPerUse:100,requestedCount:1};
  assert.throws(()=>run({...cfg,observedPerlSortedKeys:[1,2,3,4,5]}),
    /original experience comparator/);
  assert.throws(()=>run({...cfg,observedPerlSortedKeys:[2,2,4,5,1]}),
    /permutation/);
  assert.throws(()=>run({...cfg,observedPerlSortedKeys:[2,3,4]}),
    /every experience key/);
});
test('B-24 same skills may tie without source overflow and need no ordering',()=>{
  const r=run({experience:100,experienceRecords:[
    row(1,100),row(2,100),row(3,100),
  ],expPerUse:20,requestedCount:1});
  assert.equal(r.overflowEntered,false);
  assert.deepEqual(r.exp,[row(1,120),row(2,100),row(3,100)]);
});
test('B-24 effective count zero never needs tied sort observation',()=>{
  const r=run({money:0,experience:900,experienceRecords:[
    row(1,900),row(2,700),row(3,700),row(4,851),row(5,900),
  ],expPerUse:100,requestedCount:1});
  assert.equal(r.transaction.performed,false);
  assert.equal(r.overflowEntered,false);
});
test('B-24 selected item absent can be represented by original zero exp',()=>{
  const r=run({experience:0,experienceRecords:[],
    needExperience:0,requestedCount:1,expPerUse:10});
  assert.equal(r.transaction.count,1);
  assert.deepEqual(r.exp,[row(1,10)]);
  assert.equal(r.resultExpold,0);
});
test('B-24 experience map must match selected gate input; never invent current exp',()=>{
  assert.throws(()=>run({experience:201}),/Selected experience must match/);
  assert.throws(()=>run({experienceRecords:[]}),/Selected experience must match/);
});
test('B-24 callback execution is excluded, not silently claimed absent',()=>{
  assert.throws(()=>run({callbacksConfirmedAbsent:false}),/callback boundary/);
  assert.throws(()=>run({callbacksConfirmedAbsent:undefined}),/callback boundary/);
  assert.equal('callbackExecuted' in run(),false);
  assert.equal('commitWorld' in run(),false);
});
test('B-24 duplicate, nonfinite, out-of-range experience fixtures rejected',()=>{
  assert.throws(()=>run({experienceRecords:[row(1,200),row(1,200)]}),/duplicate/);
  assert.throws(()=>run({experienceRecords:[row(80,200)]}),/itemId/);
  assert.throws(()=>run({experienceRecords:[row(1,1.5)]}),/value/);
  assert.throws(()=>run({experienceRecords:[row(1,NaN)]}),/value/);
  assert.throws(()=>run({selectedItemId:0}),/selected itemId/);
  assert.throws(()=>run({expPerUse:Infinity}),/expPerUse/);
});
test('B-24 overflow input arithmetic is bounded by JS representation, not game rules',()=>{
  assert.throws(()=>run({expPerUse:Number.MAX_SAFE_INTEGER,
    requestedCount:4,money:500,storedTimeSeconds:700}),/arithmetic/);
});
test('B-24 returns immutable nested data; raw fixtures never mutated',()=>{
  const o=defaultOptions(),before=structuredClone(o);
  const r=projectOriginalUseWithExperience(o);
  assert.deepEqual(o,before);
  assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.exp)&&Object.isFrozen(r.exp[0]));
  assert.ok(Object.isFrozen(r.transaction)&&Object.isFrozen(r.reductions));
  assert.throws(()=>{r.exp[0].value=100;},TypeError);
});
test('B-24 overflow reductions and key order are also frozen',()=>{
  const r=run({experience:900,experienceRecords:[
    row(1,900),row(2,700),row(3,800),row(4,850),row(5,900),
  ],expPerUse:100,requestedCount:1});
  assert.ok(Object.isFrozen(r.reductions[0]));
  assert.ok(Object.isFrozen(r.sourceSortedKeys));
  assert.throws(()=>{r.sourceSortedKeys[0]=5;},TypeError);
});
test('B-24 is callback-free numeric projection, no authorized persistence or CGI',()=>{
  const r=run();
  assert.match(r.scope,/callback-free/);
  assert.match(r.scope,/no callbacks, DSL, CGI or durable world execution/);
  assert.equal('authorizeTrade' in r,false);
});
