import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {projectOriginalIntegratedUseLostbook as project}
  from '../src/original-integrated-use-lostbook-model.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [use,calc,whole,inc,dsl]=await Promise.all([
  'modern/tests/original-perl/use.cgi',
  'modern/tests/original-perl/calc.cgi',
  'modern/tests/original-perl/whole.cgi',
  'modern/tests/original-perl/core-inc-item.cgi',
  'custom/inc-item-data.cgi',
].map(p=>readFile(path.join(root,p),'utf8')));

const run=(data={})=>project({originalPerlDraw:128,...data});
const sources=[
  ['gate',use.indexOf('$count=0 if $DT->{exp}')],
  ['settle',use.indexOf('$USE->{result}->{count}=$count')],
  ['spend',use.indexOf('UseTime($usetime*$count);')],
  ['material',use.indexOf('#アイテム消費')],
  ['create',use.indexOf('#アイテム取得')],
  ['market',use.indexOf('CheckWholeStore();')],
  ['common',use.indexOf("RequireFile('inc-item.cgi');")],
  ['callback',use.indexOf('$USE->{result}->{function_return}=&$itemfunc();')],
  ['experience',use.indexOf('#熟練度処理')],
];
test('B-30 pinned source order: full UseItem gate -> material -> market -> callback -> experience',()=>{
  assert.ok(sources.every(([,p])=>p>=0));
  for(let i=1;i<sources.length;i++){
    assert.ok(sources[i][1]>sources[i-1][1],
      sources[i-1][0]+' precedes '+sources[i][0]);
  }
});
test('B-30 pinned Core calc source supplies preflight and source UseTime',()=>{
  assert.ok(calc.includes('sub GetItemUseTime'));
  assert.ok(calc.includes('sub UseTime'));
  assert.ok(calc.includes('$DT->{time}+=$tm;'));
});
test('B-30 pinned Core whole source sums shop stock but does not re-enter callback',()=>{
  assert.ok(whole.includes('sub CheckWholeStore'));
  assert.ok(whole.includes('$limit+=$DT->{item}[$cnt-1]'));
  assert.ok(!whole.includes('item::lostbook'));
});
test('B-30 pinned Core nested helper source records adjusted quantity and message',()=>{
  assert.ok(inc.includes('sub UseItemSub'));
  assert.ok(inc.includes('push(@{$USE->{result}->{useitem}},[$itemno,$count]);'));
  assert.ok(inc.includes('push(@{$USE->{result}->{usemsg}},$msg);'));
});
test('B-30 pinned Standard Street callback source dispatches exact item helper',()=>{
  const f=dsl.slice(dsl.indexOf('sub lostbook\n'),dsl.indexOf('sub popup\n'));
  assert.ok(f.includes("UseItem($itemno,1,$ITEM[$itemno]->{name}.'已經破爛到看不懂，就扔掉了。');"));
});
test('B-30 baseline money, time and successful count are settled before callback',()=>{
  const x=run();
  assert.equal(x.result.count,2);
  assert.equal(x.money,30);
  assert.equal(x.paytoday,45);
  assert.equal(x.time,986);
  assert.deepEqual(x.trace,['use-time','wholesale','require-common','lostbook']);
});
test('B-30 source callback consumes stock after whole-market calculation',()=>{
  const x=run();
  assert.equal(x.stockAtCallback,10);
  assert.deepEqual(x.wholesaleAtCallback,[3,0,-3]);
  assert.deepEqual(x.wholesale,[3,0,-3]);
  assert.deepEqual(x.stock,[9,6,5]);
  assert.equal(x.wholeStoreChecks,1);
});
test('B-30 B23 source market correction is not repeated by nested item::UseItem',()=>{
  const x=run();
  assert.equal(x.trace.filter(s=>s==='wholesale').length,1);
  assert.equal(x.wholeStoreChecks,1);
  assert.equal(x.nestedUse.triggered,true);
  assert.equal(x.nestedUse.effectiveCount,1);
});
test('B-30 source use records one material and later nested callback',()=>{
  const x=run();
  assert.deepEqual(x.result.useitem,[[1,4],[1,1]]);
  assert.deepEqual(x.result.usemsg,[
    'consume A','A已經破爛到看不懂，就扔掉了。',
  ]);
});
test('B-30 source creation keeps original order and retained zero row',()=>{
  const x=run();
  assert.deepEqual(x.result.additem,[[1,6],[2,2],[1,0],[3,2]]);
  assert.deepEqual(x.result.addmsg,[
    'create A','create B','create A again','create C',
  ]);
});
test('B-30 original source experience tail occurs AFTER nested callback',()=>{
  const x=run();
  assert.equal(x.expAtCallback,200);
  assert.equal(x.exp,260);
  assert.equal(x.result.expold,200);
  assert.equal(x.result.function_return,'');
});
test('B-30 callback random branch skipped still preserves outer result',()=>{
  const x=run({param1:0});
  assert.deepEqual(x.stock,[10,6,5]);
  assert.deepEqual(x.result.useitem,[[1,4]]);
  assert.deepEqual(x.result.usemsg,['consume A']);
  assert.equal(x.result.function_return,'');
  assert.equal(x.callbackRandomDraws,1);
});
test('B-30 absent function skips callback but still calls common require',()=>{
  const x=run({callback:''});
  assert.deepEqual(x.trace,['use-time','wholesale','require-common']);
  assert.equal(x.result.function_return,null);
  assert.equal(x.callbackRandomDraws,0);
  assert.equal(x.exp,260);
});
test('B-30 blocked money returns before wholesale, callback and experience',()=>{
  const x=run({money:10});
  assert.equal(x.result.count,0);
  assert.deepEqual(x.trace,[]);
  assert.equal(x.wholeStoreChecks,0);
  assert.equal(x.result.useitem,null);
  assert.equal(x.result.additem,null);
  assert.equal(x.exp,200);
  assert.equal(x.time,950);
});
test('B-30 blocked experience returns before any mutation',()=>{
  const x=run({needExp:201});
  assert.equal(x.result.count,0);
  assert.deepEqual(x.stock,[8,4,3]);
  assert.deepEqual(x.trace,[]);
  assert.equal(x.money,70);
});
test('B-30 source zero exp skips experience tail without skipping callback',()=>{
  const x=run({expPerUse:0});
  assert.equal(x.exp,200);
  assert.equal(x.result.expold,'');
  assert.deepEqual(x.stock,[9,6,5]);
});
test('B-30 source high prior exp changes time gating and caps final exp at 1000',()=>{
  const x=run({exp:990});
  assert.equal(x.result.count,3);
  assert.equal(x.expAtCallback,990);
  assert.equal(x.exp,1000);
  assert.equal(x.result.expold,990);
});
test('B-30 source prior expold controls current time, then gets overwritten',()=>{
  const x=run({experienceOld:1000});
  assert.equal(x.result.count,3);
  assert.equal(x.result.expold,200);
  assert.equal(x.expAtCallback,200);
});
test('B-30 source empty stock callback still logs zero used inventory',()=>{
  const x=run({emptyActions:true,initialStock:0,requestedCount:1});
  assert.deepEqual(x.stock,[0,4,3]);
  assert.deepEqual(x.result.useitem,[[1,0]]);
  assert.deepEqual(x.result.usemsg,[
    'A已經破爛到看不懂，就扔掉了。',
  ]);
  assert.deepEqual(x.result.additem,[]);
  assert.equal(x.result.addmsg,null);
});
test('B-30 inactive shop does not advance time, but still pays and gets exp',()=>{
  const x=run({status:0});
  assert.equal(x.time,950);
  assert.equal(x.money,30);
  assert.equal(x.exp,260);
  assert.deepEqual(x.stock,[9,6,5]);
});
test('B-30 duplicated materials can trigger negative original nested use count',()=>{
  const x=run({duplicateMaterials:true,requestedCount:1});
  assert.equal(x.stockAtCallback,-4);
  assert.deepEqual(x.result.useitem,[[1,6],[1,6],[1,-4]]);
  assert.deepEqual(x.stock,[0,4,3]);
  assert.equal(x.nestedUse.effectiveCount,-4);
  assert.equal(x.wholeStoreChecks,1);
});
test('B-30 source lostbook uses strictly less than Perl random draw',()=>{
  const yes=run({param1:500,originalPerlDraw:499.99});
  const no=run({param1:500,originalPerlDraw:500});
  assert.deepEqual(yes.stock,[9,6,5]);
  assert.deepEqual(no.stock,[10,6,5]);
  assert.equal(yes.callbackRandomDraws,1);
  assert.equal(no.callbackRandomDraws,1);
});
test('B-30 model refuses unreviewed callbacks and sample probabilities',()=>{
  assert.throws(()=>run({callback:'popup'}),/unreviewed callback/);
  assert.throws(()=>run({random:()=>.5}),/unknown random/);
  assert.throws(()=>run({originalPerlDraw:1000}),/observed original Perl draw/);
  assert.throws(()=>run({originalPerlDraw:-1}),/observed original Perl draw/);
  assert.throws(()=>run({emptyActions:true,duplicateMaterials:true}),/action choice/);
});
test('B-30 synthetic result values are frozen and no input mutated',()=>{
  const input={originalPerlDraw:99,requestedCount:1,emptyActions:true};
  const copy=structuredClone(input);
  const x=project(input);
  assert.deepEqual(input,copy);
  assert.ok(Object.isFrozen(x)&&Object.isFrozen(x.stock));
  assert.ok(Object.isFrozen(x.result));
  assert.ok(Object.isFrozen(x.result.useitem));
  assert.throws(()=>{x.result.useitem.push([1,99])},TypeError);
  assert.match(x.scope,/synthetic/);
});
test('B-30 thirteen truly executed original Perl full-use cases match Node',t=>{
  const dir=path.join(root,'modern/tests/original-perl');
  let output;
  try{
    output=execFileSync('perl',['original-full-use-lostbook-probe.pl'],{
      cwd:dir,encoding:'utf8',maxBuffer:1024*1024,timeout:15000,
    });
  }catch(e){
    if(e?.code==='ENOENT'){t.skip('Perl runtime unavailable');return;}
    throw e;
  }
  const cases=JSON.parse(output);
  assert.equal(cases.length,13);
  const compared=new Set();
  for(const {case:label,input,observed} of cases){
    const x=project({...input,originalPerlDraw:observed.originalPerlDraw});
    for(const k of [
      'stock','otherShopStock','wholesale','money','paytoday','time','exp',
      'expAtCallback','stockAtCallback','wholesaleAtCallback','result','trace',
      'originalPerlDraw',
    ]){
      assert.deepEqual(x[k],observed[k],label+' '+k);
    }
    compared.add(label);
  }
  assert.equal(compared.size,13);
});
