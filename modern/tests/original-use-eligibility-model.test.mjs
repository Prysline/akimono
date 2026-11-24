import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {projectOriginalUseEligibility as check} from '../src/original-use-eligibility-model.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const source=await readFile(path.join(root,'modern/tests/original-perl/use.cgi'),'utf8');
const compiler=await readFile(path.join(root,'modern/tests/original-perl/inc-makeitem.cgi'),'utf8');
const use=(no=7,count=1,functionbefore='',flags={})=>({
  no,materials:[{itemId:1,count}],functionbefore,...flags,
});
const fn=(returnValue=0,effects=[])=>({returnValue,effects});
const config=()=>({stock:[5,2,0],job:'none',uses:[use()],mode:'list',
  jobFunctions:{},beforeFunctions:{}});
const run=opts=>check({...config(),...opts});
const exact='item::_job_use_7_worker_',generic='item::_job_use_0_worker_';
const worker={
  [exact]:fn(999,[{op:'set-material-count',index:0,value:3}]),
  [generic]:fn(0,[{op:'set-material-count',index:0,value:2}]),
};
const before=(name,returnValue=0,effects=[])=>({
  ['item::'+name]:fn(returnValue,effects),
});

test('B-25 original source dispatch order and return statuses are pinned',()=>{
  const start=source.indexOf('sub CheckUseItem');
  const s=source.slice(start,source.indexOf('sub GetUseItem',start));
  const p=['my $jobfunc','if (defined &$jobfunc)','item::_job_use_0_',
    'my $funcbefore','return 2 if $ret==2','return 0 if $ret==1','foreach my $item'];
  let last=-1;
  for(const part of p){const at=s.indexOf(part);assert.ok(at>last,part);last=at;}
});
test('B-25 source Get wrappers do not clear stale flags',()=>{
  const list=source.slice(source.indexOf('sub GetUseItemListSub'),source.indexOf('sub CheckUseItem'));
  const get=source.slice(source.indexOf('sub GetUseItem'),source.indexOf('sub UseItem'));
  for(const body of [list,get]){
    assert.ok(body.includes('$USE->{dispok}=1 if $ret==2'));
    assert.ok(body.includes('$USE->{useok}=1 if $ret==1'));
    assert.equal(body.includes('$USE->{useok}=0'),false);
    assert.equal(body.includes('$USE->{dispok}=0'),false);
  }
});
test('B-25 source DSL emits before, result function and job override as separate fields',()=>{
  assert.ok(compiler.includes("'functionbefore'=>'$use->{funcbefore}'"));
  assert.ok(compiler.includes("'function'=>'$use->{func}'"));
  assert.ok(compiler.includes('sub _job_use_$use->{no}_'));
});
test('B-25 specific job overrides generic; ignores return value',()=>{
  const r=run({job:'worker',jobFunctions:worker,uses:[use(7,4)]});
  assert.deepEqual(r.statuses,[{no:7,status:1}]);
  assert.equal(r.records[0].materials[0].count,3);
  assert.equal(r.trace[0].symbol,exact);
  assert.equal(r.records[0].useok,1);
});
test('B-25 missing specific job calls generic, and mutated need causes rejection',()=>{
  const r=run({job:'worker',stock:[1,2,0],jobFunctions:worker,uses:[use(9)]});
  assert.equal(r.statuses[0].status,0);
  assert.equal(r.records[0].materials[0].count,2);
  assert.equal(r.trace[0].symbol,generic);
});
test('B-25 fallback-only job permitted on explicit synthetic declaration',()=>{
  const name='item::_job_use_0_fallback_';
  const r=run({job:'fallback',stock:[2,2,0],jobFunctions:{
    [name]:fn(0,[{op:'set-material-count',index:0,value:2}]),
  }});
  assert.equal(r.statuses[0].status,1);
  assert.equal(r.trace[0].symbol,name);
});
test('B-25 absent job symbol means no job callback',()=>{
  const r=run({});
  assert.deepEqual(r.trace.map(x=>x.phase),['material']);
});
test('B-25 job may change functionbefore name before lookup',()=>{
  const name='item::_job_use_7_switch_';
  const r=run({job:'switch',stock:[0,2,0],jobFunctions:{
    [name]:fn(0,[{op:'set-functionbefore',name:'before_show'}]),
  },beforeFunctions:before('before_show',2)});
  assert.equal(r.statuses[0].status,2);
  assert.equal(r.records[0].functionbefore,'before_show');
  assert.deepEqual(r.trace.map(x=>x.phase),['job','functionbefore']);
});
test('B-25 before result2 marks display-only and bypasses shortage',()=>{
  const r=run({stock:[0,2,0],uses:[use(7,1,'before_show')],
    beforeFunctions:before('before_show',2)});
  assert.equal(r.statuses[0].status,2);
  assert.equal(r.records[0].dispok,1);
  assert.equal('useok' in r.records[0],false);
  assert.equal(r.trace.some(x=>x.phase==='material'),false);
});
test('B-25 before result1 rejects without checking inventory',()=>{
  const r=run({uses:[use(7,1,'before_hide')],beforeFunctions:before('before_hide',1)});
  assert.equal(r.statuses[0].status,0);
  assert.equal(r.trace.some(x=>x.phase==='material'),false);
});
test('B-25 before result0 continues to check materials',()=>{
  const r=run({uses:[use(7,1,'before_pass')],beforeFunctions:before('before_pass',0)});
  assert.equal(r.statuses[0].status,1);
  assert.deepEqual(r.trace.map(x=>x.phase),['functionbefore','material']);
});
test('B-25 before result7 still proceeds to material check',()=>{
  const r=run({uses:[use(7,1,'before_other')],beforeFunctions:before('before_other',7)});
  assert.equal(r.statuses[0].status,1);
});
test('B-25 before callback may mutate stock before source material check',()=>{
  const r=run({uses:[use(7,1,'before_stock')],beforeFunctions:before('before_stock',0,[
    {op:'set-stock',itemId:1,value:0},
  ])});
  assert.equal(r.statuses[0].status,0);
  assert.equal(r.stock[0],0);
  assert.equal(r.trace.at(-1).available,0);
});
test('B-25 before callback may mutate requirement before source material check',()=>{
  const r=run({uses:[use(7,1,'before_change_need')],
    beforeFunctions:before('before_change_need',0,[
      {op:'set-material-count',index:0,value:8},
    ])});
  assert.equal(r.statuses[0].status,0);
  assert.equal(r.records[0].materials[0].count,8);
});
test('B-25 job stock effects are visible to material checking',()=>{
  const name='item::_job_use_7_stock_';
  const r=run({job:'stock',jobFunctions:{
    [name]:fn(0,[{op:'set-stock',itemId:1,value:0}]),
  }});
  assert.equal(r.statuses[0].status,0);
  assert.deepEqual(r.stock,[0,2,0]);
});
test('B-25 material loop checks rows sequentially then stops on shortage',()=>{
  const r=run({uses:[{no:7,materials:[
    {itemId:1,count:1},{itemId:2,count:3},{itemId:3,count:1},
  ]}]});
  assert.equal(r.statuses[0].status,0);
  assert.deepEqual(r.trace.filter(x=>x.phase==='material').map(x=>x.itemId),[1,2]);
});
test('B-25 CheckUseItem does not consume inventory or aggregate separate uses',()=>{
  const r=run({uses:[use(7,4),use(8,4)]});
  assert.deepEqual(r.stock,[5,2,0]);
  assert.deepEqual(r.statuses,[{no:7,status:1},{no:8,status:1}]);
});
test('B-25 return2 does not clear stale useok',()=>{
  const r=run({uses:[use(7,1,'before_show',{useok:1})],
    beforeFunctions:before('before_show',2)});
  assert.equal(r.statuses[0].status,2);
  assert.equal(r.records[0].useok,1);
  assert.equal(r.records[0].dispok,1);
});
test('B-25 return0 does not clear stale useok or dispok',()=>{
  const r=run({uses:[use(7,1,'before_hide',{useok:1,dispok:1})],
    beforeFunctions:before('before_hide',1)});
  assert.equal(r.statuses[0].status,0);
  assert.deepEqual([r.records[0].useok,r.records[0].dispok],[1,1]);
});
test('B-25 return1 sets useok and retains any existing dispok',()=>{
  const r=run({uses:[use(7,1,'before_pass',{dispok:1})],
    beforeFunctions:before('before_pass',0)});
  assert.equal(r.statuses[0].status,1);
  assert.deepEqual([r.records[0].useok,r.records[0].dispok],[1,1]);
});
test('B-25 GetUseItem visits first matching item only',()=>{
  const r=run({mode:'get',requestedNo:7,
    uses:[use(7,1,'before_show'),use(8),use(7)],
    beforeFunctions:before('before_show',2)});
  assert.deepEqual(r.statuses,[{no:7,status:2}]);
  assert.equal(r.selectedIndex,0);
  assert.equal(r.selected.no,7);
  assert.equal('useok' in r.records[2],false);
});
test('B-25 GetUseItem returns literal 0 on missing use',()=>{
  const r=run({mode:'get',requestedNo:8,uses:[use(7)]});
  assert.equal(r.selected,0);
  assert.equal(r.selectedIndex,null);
  assert.deepEqual(r.trace,[]);
});
test('B-25 GetUseItem returns record even when return0 blocks use',()=>{
  const r=run({mode:'get',requestedNo:7,
    uses:[use(7,1,'before_hide')],beforeFunctions:before('before_hide',1)});
  assert.equal(r.selected.no,7);
  assert.equal(r.statuses[0].status,0);
});
test('B-25 GetUseItemListSub processes all uses in their input order',()=>{
  const r=run({uses:[use(7,1,'before_show'),use(8,1,'before_hide'),use(9)],
    beforeFunctions:{...before('before_show',2),...before('before_hide',1)}});
  assert.deepEqual(r.statuses,[{no:7,status:2},{no:8,status:0},{no:9,status:1}]);
  assert.deepEqual(r.trace.filter(x=>x.phase==='functionbefore').map(x=>x.symbol),
    ['item::before_show','item::before_hide']);
});
test('B-25 missing named functionbefore cannot be silently treated as success',()=>{
  assert.throws(()=>run({uses:[use(7,1,'missing')]}),/unresolved original functionbefore/);
});
test('B-25 disallow executable JS callbacks and arbitrary fixture operations',()=>{
  assert.throws(()=>run({jobFunctions:{[exact]:()=>1}}),/function fixture/);
  assert.throws(()=>run({beforeFunctions:before('before_pass',0,[
    {op:'system',value:'no'},
  ])}),/unreviewed effect/);
});
test('B-25 invalid fixtures are rejected without making up source game rules',()=>{
  assert.throws(()=>run({stock:[]}),/stock slots/);
  assert.throws(()=>run({uses:[use(7,1.5)]}),/material count/);
  assert.throws(()=>run({uses:[use(7,1,'bad()')]}),/functionbefore/);
  assert.throws(()=>run({uses:[use(7,1,'',{useok:2})]}),/useok/);
});
test('B-25 input remains unchanged and all results are frozen',()=>{
  const o=config();o.job='worker';o.jobFunctions=worker;o.uses=[use(7,4)];
  const before=structuredClone(o);
  const r=check(o);
  assert.deepEqual(o,before);
  assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.records)&&Object.isFrozen(r.records[0]));
  assert.ok(Object.isFrozen(r.records[0].materials[0])&&Object.isFrozen(r.trace[0]));
  assert.throws(()=>{r.records[0].materials[0].count=99},TypeError);
});
test('B-25 synthetic eligibility does not authorize real item execution',()=>{
  const r=run({});
  assert.match(r.scope,/no DSL, item execution, CGI or persistence/);
  assert.equal('commitWorld' in r,false);
  assert.equal('callbackExecuted' in r,false);
});
test('B-25 LIVE Perl original snippets match Node synthetic eligibility observations',t=>{
  const dir=path.join(root,'modern/tests/original-perl');
  let stdout;
  try{
    stdout=execFileSync('perl',['original-use-eligibility-probe.pl'],{
      cwd:dir,encoding:'utf8',timeout:10000,maxBuffer:1024*1024,
    });
  }catch(error){
    if(error?.code==='ENOENT'){t.skip('Perl runtime unavailable');return;}
    throw error;
  }
  const cases=JSON.parse(stdout);
  assert.equal(cases.length,13);
  for(const scenario of cases){
    const r=check(scenario.input),expected=scenario.observed;
    assert.deepEqual(r.records,expected.records,scenario.case+' records');
    assert.deepEqual(r.stock,expected.stock,scenario.case+' stock');
    assert.equal(r.selectedIndex,expected.selectedIndex??null,scenario.case+' selection');
    assert.equal(r.selected===0?0:r.selected?.no??0,expected.selectedNo,scenario.case+' selected no');
    const calls=r.trace.filter(x=>x.phase!=='material').map(x=>({
      phase:x.phase,symbol:x.symbol,useNo:x.useNo,
    }));
    assert.deepEqual(calls,expected.calls,scenario.case+' callback order');
  }
});
