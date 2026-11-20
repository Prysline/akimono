import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  projectOriginalItemHelper as project,
  projectOriginalLostbookWithCoreItemHelper as lostbook,
} from '../src/original-item-helper-model.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [inc,dsl]=await Promise.all([
  'modern/tests/original-perl/core-inc-item.cgi',
  'custom/inc-item-data.cgi',
].map(p=>readFile(path.join(root,p),'utf8')));
const helper=(method,args={})=>project({
  method,itemNo:1,stock:5,count:2,limit:10,message:'測試',
  result:{count:7},...args,
});
const book=args=>lostbook({
  itemNo:1,itemName:'書本甲',param1:1000,
  randomDraw:123,stock:5,result:{count:7},...args,
});

test('B-29 all FOUR original Core helpers exist in exact pinned source order',()=>{
  const names=['UseItem','UseItemSub','AddItem','AddItemSub'];
  let prior=0;
  for(const name of names){
    const i=inc.indexOf('\nsub '+name+'\n',prior);
    assert.ok(i>prior,name);prior=i;
  }
  assert.ok(inc.includes('package item; #変更不可'));
});
test('B-29 original UseItem delegates to UseItemSub, then records two result arrays',()=>{
  const s=inc.slice(inc.indexOf('sub UseItem\n'),inc.indexOf('sub UseItemSub\n'));
  for(const key of [
    '$count=UseItemSub($itemno,$count,$DT);',
    'push(@{$USE->{result}->{useitem}},[$itemno,$count]);',
    'push(@{$USE->{result}->{usemsg}},$msg);',
    'return 0;',
  ])assert.ok(s.includes(key),key);
});
test('B-29 original UseItemSub clamps ONLY to stock and subtracts adjusted count',()=>{
  const s=inc.slice(inc.indexOf('sub UseItemSub\n'),inc.indexOf('sub AddItem\n'));
  assert.ok(s.includes('$count=$DT->{item}[$itemno-1] if $DT->{item}[$itemno-1]<$count;'));
  assert.ok(s.includes('$DT->{item}[$itemno-1]-=$count;'));
  assert.ok(s.includes('return $count;'));
});
test('B-29 original AddItem delegates to AddItemSub then appends count and message',()=>{
  const s=inc.slice(inc.indexOf('sub AddItem\n'),inc.indexOf('sub AddItemSub\n'));
  for(const key of [
    '$count=AddItemSub($itemno,$count,$DT);',
    'push(@{$USE->{result}->{additem}},[$itemno,$count]);',
    'push(@{$USE->{result}->{addmsg}},$msg);',
    'return 0;',
  ])assert.ok(s.includes(key),key);
});
test('B-29 original AddItemSub clamps by limit minus existing stock, no floor',()=>{
  const s=inc.slice(inc.indexOf('sub AddItemSub\n'),inc.indexOf('sub GetUserData\n'));
  assert.ok(s.includes('$count=$main::ITEM[$itemno]->{limit}-$DT->{item}[$itemno-1]'));
  assert.ok(s.includes('if $main::ITEM[$itemno]->{limit}<$DT->{item}[$itemno-1]+$count;'));
  assert.ok(s.includes('$DT->{item}[$itemno-1]+=$count;'));
  assert.ok(s.includes('return $count;'));
});
test('B-29 original lostbook calls the REAL item::UseItem helper with count=1',()=>{
  const s=dsl.slice(dsl.indexOf('sub lostbook\n'),dsl.indexOf('sub popup\n'));
  assert.ok(s.includes("UseItem($itemno,1,$ITEM[$itemno]->{name}.'已經破爛到看不懂，就扔掉了。');"));
  assert.ok(s.includes('if(rand(1000)<$USE->{param1})'));
  assert.ok(s.includes('return "";'));
});
test('B-29 UseItemSub normal stock decreases and returns adjusted amount',()=>{
  const r=helper('UseItemSub',{stock:7,count:3});
  assert.equal(r.effectiveCount,3);
  assert.equal(r.stockAfter,4);
  assert.equal(r.returned,3);
  assert.deepEqual(r.result,{count:7});
});
test('B-29 UseItemSub shortage clamps to actual available inventory',()=>{
  const r=helper('UseItemSub',{stock:2,count:8});
  assert.equal(r.effectiveCount,2);
  assert.equal(r.stockAfter,0);
});
test('B-29 UseItemSub empty inventory returns zero without a message',()=>{
  const r=helper('UseItemSub',{stock:0,count:1});
  assert.equal(r.effectiveCount,0);
  assert.equal(r.stockAfter,0);
  assert.equal('usemsg' in r.result,false);
});
test('B-29 UseItemSub negative requested amount increases inventory',()=>{
  const r=helper('UseItemSub',{stock:2,count:-3});
  assert.equal(r.effectiveCount,-3);
  assert.equal(r.stockAfter,5);
});
test('B-29 UseItemSub negative existing stock creates negative actual count',()=>{
  const r=helper('UseItemSub',{stock:-5,count:1});
  assert.equal(r.effectiveCount,-5);
  assert.equal(r.stockAfter,0);
});
test('B-29 AddItemSub ordinary inventory addition',()=>{
  const r=helper('AddItemSub',{stock:3,count:2,limit:10});
  assert.equal(r.effectiveCount,2);
  assert.equal(r.stockAfter,5);
});
test('B-29 AddItemSub caps by remaining room',()=>{
  const r=helper('AddItemSub',{stock:8,count:5,limit:10});
  assert.equal(r.effectiveCount,2);
  assert.equal(r.stockAfter,10);
});
test('B-29 AddItemSub at full limit returns effective zero',()=>{
  const r=helper('AddItemSub',{stock:10,count:1,limit:10});
  assert.equal(r.effectiveCount,0);
  assert.equal(r.stockAfter,10);
});
test('B-29 AddItemSub overlimit existing inventory produces NEGATIVE effective add',()=>{
  const r=helper('AddItemSub',{stock:15,count:1,limit:10});
  assert.equal(r.effectiveCount,-5);
  assert.equal(r.stockAfter,10);
});
test('B-29 AddItemSub overlimit stock with zero request still reduces stock',()=>{
  const r=helper('AddItemSub',{stock:15,count:0,limit:10});
  assert.equal(r.effectiveCount,-5);
  assert.equal(r.stockAfter,10);
});
test('B-29 AddItemSub negative count can go below zero',()=>{
  const r=helper('AddItemSub',{stock:3,count:-5,limit:10});
  assert.equal(r.effectiveCount,-5);
  assert.equal(r.stockAfter,-2);
});
test('B-29 UseItem wrapper records adjusted consumed item and message',()=>{
  const r=helper('UseItem',{itemNo:2,stock:4,count:2,message:'試用消耗'});
  assert.equal(r.returned,0);
  assert.deepEqual(r.result,{count:7,useitem:[[2,2]],usemsg:['試用消耗']});
  assert.equal(r.stockAfter,2);
});
test('B-29 UseItem wrapper APPENDS, never replaces stale result arrays',()=>{
  const r=helper('UseItem',{stock:1,count:10,message:'需求過量',result:{
    count:9,useitem:[[2,6]],usemsg:['原訊息'],additem:[[1,2]],
    addmsg:['保留新增'],other:'欄位保留',
  }});
  assert.deepEqual(r.result,{
    count:9,useitem:[[2,6],[1,1]],usemsg:['原訊息','需求過量'],
    additem:[[1,2]],addmsg:['保留新增'],other:'欄位保留',
  });
});
test('B-29 UseItem wrapper records zero effective count AND message',()=>{
  const r=helper('UseItem',{stock:0,count:1,message:'空庫存'});
  assert.equal(r.returned,0);
  assert.deepEqual(r.result.useitem,[[1,0]]);
  assert.deepEqual(r.result.usemsg,['空庫存']);
});
test('B-29 UseItem wrapper records negative effective count in source result',()=>{
  const r=helper('UseItem',{stock:-5,count:1,message:'負庫存'});
  assert.deepEqual(r.result.useitem,[[1,-5]]);
  assert.equal(r.stockAfter,0);
});
test('B-29 AddItem wrapper returns 0 but records capped positive add',()=>{
  const r=helper('AddItem',{stock:8,count:5,limit:10,message:'取得五件'});
  assert.equal(r.returned,0);
  assert.equal(r.stockAfter,10);
  assert.deepEqual(r.result.additem,[[1,2]]);
  assert.deepEqual(r.result.addmsg,['取得五件']);
});
test('B-29 AddItem wrapper records zero adjusted amount and message at cap',()=>{
  const r=helper('AddItem',{stock:10,count:1,limit:10,message:'已滿'});
  assert.deepEqual(r.result.additem,[[1,0]]);
  assert.deepEqual(r.result.addmsg,['已滿']);
});
test('B-29 AddItem wrapper records negative adjusted count without fixing anomaly',()=>{
  const r=helper('AddItem',{stock:15,count:1,limit:10,message:'超限',result:{
    count:9,additem:[[2,1]],addmsg:['先前取得'],usemsg:['先前消耗'],
  }});
  assert.deepEqual(r.result.additem,[[2,1],[1,-5]]);
  assert.deepEqual(r.result.addmsg,['先前取得','超限']);
  assert.deepEqual(r.result.usemsg,['先前消耗']);
  assert.equal(r.stockAfter,10);
});
test('B-29 lostbook invokes original Core helpers and changes only synthetic stock',()=>{
  const r=book({stock:5,result:{count:7,additem:[[2,4]]}});
  assert.equal(r.returned,'');
  assert.equal(r.stockAfter,4);
  assert.equal(r.nestedReturn,0);
  assert.equal(r.nestedEffectiveCount,1);
  assert.deepEqual(r.result,{
    count:7,additem:[[2,4]],useitem:[[1,1]],
    usemsg:['書本甲已經破爛到看不懂，就扔掉了。'],
  });
  assert.deepEqual(r.originalNestedCallArguments,[[
    1,1,'書本甲已經破爛到看不懂，就扔掉了。',
  ]]);
});
test('B-29 lostbook branch not triggered does not create useitem/usemsg',()=>{
  const r=book({itemNo:2,itemName:'書本乙',stock:5,param1:0,
    result:{count:3}});
  assert.equal(r.returned,'');
  assert.equal(r.requestedNestedUse,false);
  assert.equal(r.nestedReturn,null);
  assert.deepEqual(r.result,{count:3});
  assert.equal(r.stockAfter,5);
});
test('B-29 lostbook branch triggers on empty stock and records zero amount',()=>{
  const r=book({itemNo:2,itemName:'書本乙',stock:0,result:{count:3}});
  assert.equal(r.stockAfter,0);
  assert.equal(r.nestedEffectiveCount,0);
  assert.deepEqual(r.result.useitem,[[2,0]]);
  assert.deepEqual(r.result.usemsg,[
    '書本乙已經破爛到看不懂，就扔掉了。',
  ]);
});
test('B-29 lostbook branch on negative stock records negative effective amount',()=>{
  const r=book({stock:-3,result:{count:3}});
  assert.equal(r.stockAfter,0);
  assert.equal(r.nestedEffectiveCount,-3);
  assert.deepEqual(r.result.useitem,[[1,-3]]);
});
test('B-29 lostbook strict random draw boundary comes from original source',()=>{
  const yes=book({param1:500,randomDraw:499.9});
  const no=book({param1:500,randomDraw:500});
  assert.equal(yes.requestedNestedUse,true);
  assert.equal(no.requestedNestedUse,false);
  assert.equal(yes.stockAfter,4);
  assert.equal(no.stockAfter,5);
});
test('B-29 source result.count is preserved by nested helper on success',()=>{
  const r=book({result:{count:999,expold:90,addmsg:['旧訊息']}});
  assert.equal(r.result.count,999);
  assert.equal(r.result.expold,90);
  assert.deepEqual(r.result.addmsg,['旧訊息']);
});
test('B-29 source fixture boundaries are explicit, not purported Core rules',()=>{
  assert.throws(()=>helper('UseItem',{count:0.2}),/requested count/);
  assert.throws(()=>helper('AddItem',{itemNo:0}),/itemNo/);
  assert.throws(()=>helper('AddItem',{stock:Infinity}),/stock/);
  assert.throws(()=>helper('AddItem',{method:'anything'}),/approved original method/);
  assert.throws(()=>project({method:'DeleteItem',itemNo:1,stock:2,count:1}),/approved original method/);
  assert.throws(()=>helper('UseItem',{result:{useitem:['bad']}}),/useitem row/);
  assert.throws(()=>helper('AddItem',{result:null}),/result object/);
});
test('B-29 original projections do not mutate input and return frozen observations',()=>{
  const input={method:'UseItem',itemNo:1,stock:5,count:2,limit:10,
    message:'消耗',result:{count:3,useitem:[[2,4]]}};
  const before=structuredClone(input);
  const out=project(input);
  assert.deepEqual(input,before);
  assert.ok(Object.isFrozen(out)&&Object.isFrozen(out.result));
  assert.ok(Object.isFrozen(out.result.useitem)&&Object.isFrozen(out.result.useitem[0]));
  assert.throws(()=>{out.result.useitem[0][0]=9},TypeError);
  const lb=book({result:{count:1}});
  assert.ok(Object.isFrozen(lb)&&Object.isFrozen(lb.result));
  assert.equal('realWorldCommitted' in lb,false);
});
test('B-29 output scopes exclude real transactions, CGI, logs, or player file writes',()=>{
  assert.match(helper('UseItem').scope,/no CGI or persistence/);
  assert.match(book().scope,/no outer transaction, CGI or persistence/);
});
test('B-29 27 ACTUAL pinned Perl helper / nested lostbook cases match Node projections',t=>{
  const dir=path.join(root,'modern/tests/original-perl');
  let stdout;
  try{
    stdout=execFileSync('perl',['original-item-helper-probe.pl'],{
      cwd:dir,encoding:'utf8',timeout:10000,maxBuffer:1024*1024,
    });
  }catch(e){if(e?.code==='ENOENT'){t.skip('Perl runtime unavailable');return;}throw e;}
  const rows=JSON.parse(stdout);
  assert.equal(rows.length,27);
  for(const row of rows){
    const x=row.kind==='helper'?project(row.input):lostbook(row.input);
    assert.equal(x.returned,row.observed.returned,row.case+' return');
    assert.equal(x.stockAfter,row.observed.stockAfter,row.case+' stock');
    assert.deepEqual(x.result,row.observed.result,row.case+' result arrays');
    if(row.kind==='lostbook'){
      assert.equal(row.observed.moneyAfter,700,row.case+' money untouched');
      assert.equal(row.observed.timeAfter,250,row.case+' time untouched');
      assert.deepEqual(row.observed.expAfter,{'1':120},
        row.case+' experience untouched');
      assert.ok(x.randomDraw>=0&&x.randomDraw<1000,row.case+' original Perl rand');
    }
  }
});
