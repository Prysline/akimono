import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  projectOriginalLostbook,projectOriginalPopup,
} from '../src/original-shared-use-callback-model.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const source=await readFile(path.join(root,'custom/inc-item-data.cgi'),'utf8');
const shared=source.slice(source.indexOf('@@FUNCITEM'),source.indexOf('@@FUNCUPDATE'));
const book=(o={})=>projectOriginalLostbook({
  itemId:1,itemName:'書本甲',param1:1000,randomDraw:500,...o,
});
const popup=(o={})=>projectOriginalPopup({
  shopId:42,shopName:'原版店',rank:5000,param1:1000,
  param2:'開了派對',...o,
});

test('B-26 shared functions are PINNED in the original FUNCITEM, not generated bodies',()=>{
  assert.match(shared,/^sub lostbook\s*$/m);
  assert.match(shared,/^sub popup\s*$/m);
  assert.ok(shared.includes('if(rand(1000)<$USE->{param1})'));
  assert.ok(shared.includes("UseItem($itemno,1,$ITEM[$itemno]->{name}.'已經破爛到看不懂，就扔掉了。');"));
  assert.ok(shared.includes('my $up=int($USE->{param1}*(2-$DT->{rank}/5000));'));
  assert.ok(shared.includes('$DT->{rank}=10000 if $DT->{rank}>10000;'));
  assert.ok(shared.includes('WriteLog(0,$DT->{id},$ret);'));
  assert.ok(shared.includes('WriteLog(3,0,$DT->{shopname}." ".$USE->{param2});'));
});
test('B-26 lostbook records, but DOES NOT execute external UseItem',()=>{
  const r=book();
  assert.equal(r.returned,'');
  assert.equal(r.requestedExternalUseItem,true);
  assert.deepEqual(r.externalUseItemCalls,[
    [1,1,'書本甲已經破爛到看不懂，就扔掉了。'],
  ]);
  assert.equal(r.randCalls,1);
  assert.match(r.inventoryMutation,/unknown/);
});
test('B-26 lostbook zero threshold records no external call',()=>{
  const r=book({param1:0,randomDraw:0});
  assert.equal(r.requestedExternalUseItem,false);
  assert.deepEqual(r.externalUseItemCalls,[]);
  assert.equal(r.returned,'');
});
test('B-26 lostbook negative threshold records no external call',()=>{
  assert.deepEqual(book({param1:-1}).externalUseItemCalls,[]);
});
test('B-26 lostbook threshold >=1000 always calls for a valid original rand(1000)',()=>{
  assert.equal(book({param1:1000,randomDraw:999.999}).requestedExternalUseItem,true);
  assert.equal(book({param1:1100,randomDraw:0}).requestedExternalUseItem,true);
});
test('B-26 lostbook strict less-than boundary is not rounded or normalized',()=>{
  assert.equal(book({param1:500,randomDraw:500}).requestedExternalUseItem,false);
  assert.equal(book({param1:500,randomDraw:499.99}).requestedExternalUseItem,true);
});
test('B-26 lostbook item name and item ID are read by original index',()=>{
  assert.deepEqual(book({itemId:2,itemName:'書本乙'}).externalUseItemCalls,[
    [2,1,'書本乙已經破爛到看不懂，就扔掉了。'],
  ]);
});
test('B-26 lostbook does not assume external call actually consumed stock',()=>{
  const r=book();
  assert.equal('stockAfter' in r,false);
  assert.equal('balanceAfter' in r,false);
  assert.equal('commitWorld' in r,false);
  assert.match(r.scope,/external UseItem unexecuted/);
});
test('B-26 popup rank5000, param1000 increases rank to6000',()=>{
  const r=popup();
  assert.equal(r.up,1000);
  assert.equal(r.rankAfter,6000);
  assert.equal(r.returned,'開了派對：人氣提升了10%');
});
test('B-26 popup WriteLog calls are kept in source order',()=>{
  const r=popup();
  assert.deepEqual(r.logCalls,[
    [0,42,'開了派對：人氣提升了10%'],
    [3,0,'原版店 開了派對'],
  ]);
});
test('B-26 popup change to rank is capped, but message uses PRE-cap up',()=>{
  const r=popup({rank:9999,param1:300000,param2:'高額派對'});
  assert.equal(r.up,60);
  assert.equal(r.rankAfter,10000);
  assert.equal(r.returned,'高額派對：人氣提升了0%');
});
test('B-26 popup above-cap existing rank can be normalized to 10000 by source',()=>{
  const r=popup({rank:12000,param1:1000});
  assert.equal(r.up,-400);
  assert.equal(r.rankAfter,10000);
  assert.equal(r.returned,'開了派對：人氣提升了-4%');
});
test('B-26 popup negative param permits original negative rank change',()=>{
  const r=popup({rank:3000,param1:-1000,param2:'活動'});
  assert.equal(r.up,-1400);
  assert.equal(r.rankAfter,1600);
  assert.equal(r.returned,'活動：人氣提升了-14%');
});
test('B-26 popup rank10000 has zero positive param increase',()=>{
  const r=popup({rank:10000,param1:1000});
  assert.equal(r.up,0);
  assert.equal(r.rankAfter,10000);
});
test('B-26 popup below zero uses original arithmetic, not an invented floor',()=>{
  const r=popup({rank:-500,param1:1000});
  assert.equal(r.up,2100);
  assert.equal(r.rankAfter,1600);
});
test('B-26 popup has NO direct item, money, time, exp mutations in source body',()=>{
  const r=popup();
  assert.match(r.inventoryMutation,/none in callback body/);
  assert.match(r.moneyMutation,/none in callback body/);
  assert.match(r.timeMutation,/none in callback body/);
  assert.match(r.experienceMutation,/none in callback body/);
  assert.equal('shopStock' in r,false);
  assert.equal('realLogCommitted' in r,false);
});
test('B-26 popup use count is not used by source arithmetic',()=>{
  const r=popup();
  assert.equal('successfulCount' in r,false);
});
test('B-26 numeric representation and synthetic random draw bounds enforced',()=>{
  for(const x of [-1,1000,NaN,Infinity])assert.throws(
    ()=>book({randomDraw:x}),/rand\(1000\) draw/);
  assert.throws(()=>book({param1:1.2}),/param1/);
  assert.throws(()=>popup({rank:NaN}),/rank/);
  assert.throws(()=>popup({param1:Number.MAX_SAFE_INTEGER,rank:-100000}),
    /original int/);
});
test('B-26 callback inputs are unchanged and outputs deeply immutable',()=>{
  const x={itemId:2,itemName:'書本乙',param1:1000,randomDraw:44};
  const before=structuredClone(x),b=projectOriginalLostbook(x),p=popup();
  assert.deepEqual(x,before);
  assert.ok(Object.isFrozen(b)&&Object.isFrozen(b.externalUseItemCalls));
  assert.ok(Object.isFrozen(b.externalUseItemCalls[0]));
  assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.logCalls)&&Object.isFrozen(p.logCalls[0]));
  assert.throws(()=>{b.externalUseItemCalls[0][0]=99},TypeError);
  assert.throws(()=>{p.logCalls[0][0]=99},TypeError);
});
test('B-26 LIVE original Perl shared function bodies match Node projections',t=>{
  const dir=path.join(root,'modern/tests/original-perl');
  let out;
  try{
    out=execFileSync('perl',['original-shared-callback-probe.pl'],{
      cwd:dir,encoding:'utf8',maxBuffer:1024*1024,timeout:10000,
    });
  }catch(e){if(e?.code==='ENOENT'){t.skip('Perl unavailable');return;}throw e;}
  const cases=JSON.parse(out);
  assert.equal(cases.length,12);
  for(const x of cases){
    const r=x.callback==='lostbook'
      ?projectOriginalLostbook(x.input)
      :projectOriginalPopup(x.input);
    assert.equal(r.returned,x.observed.returned,x.case+' return');
    if(x.callback==='lostbook'){
      assert.deepEqual(r.externalUseItemCalls,x.observed.externalCalls,x.case+' external UseItem arguments');
      assert.deepEqual(x.observed.logs,[],x.case+' no logs');
    }else{
      assert.equal(r.rankAfter,x.observed.rankAfter,x.case+' rank');
      assert.deepEqual(r.logCalls,x.observed.logs,x.case+' WriteLog arguments');
      assert.deepEqual(x.observed.externalCalls,[],x.case+' no external UseItem');
    }
    assert.deepEqual(x.observed.item,[10,4],x.case+' stubbed original stock unchanged');
    assert.deepEqual(x.observed.exp,{'1':120},x.case+' experience unchanged');
    assert.equal(x.observed.money,70,x.case+' money unchanged');
    assert.equal(x.observed.time,250,x.case+' time unchanged');
  }
});
