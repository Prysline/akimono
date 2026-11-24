import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  formatOriginalMoneyFixture,projectOriginalBookWorkCallback,
  projectOriginalShowcaseResizeCallback,
} from '../src/original-inline-work-showcase-model.mjs';
import {auditOriginalStandardCallbackDeclarations}
  from '../src/original-standard-callback-inventory.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [dsl,rebel,compiler,core]=await Promise.all([
 'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
 'modern/tests/original-perl/inc-makeitem.cgi',
 'modern/tests/original-perl/inc-func.cgi',
].map(p=>readFile(path.join(root,p),'utf8')));
const inventory=auditOriginalStandardCallbackDeclarations({
  itemDsl:dsl,rebelDsl:rebel,compilerSource:compiler,
});
const work=(v={})=>projectOriginalBookWorkCallback({
  money:700,param1:3000,count:2,shopId:42,shopName:'原版店',
  ...v,
});
const resize=(v={})=>projectOriginalShowcaseResizeCallback({
  showcaseCount:2,showcase:[10,20],prices:[100,200],
  newCount:4,shopId:88,shopName:'展覽店',...v,
});

test('B-27 local function source is exactly the original work money/log sequence',()=>{
  const start=dsl.indexOf('code\tbook-work');
  const end=dsl.indexOf('@@ITEM',start);
  const chunk=dsl.slice(start,end);
  const order=['func\t_local_','$DT->{money}+=$USE->{param1}*$count;',
    "GetMoneyString($USE->{param1}*$count).'稼ぎました'",
    'WriteLog(0,$DT->{id},"バイトし、$ret");',
    'WriteLog(3,0,$DT->{shopname}."がバイトしたようです");',
    'return $ret;', '_local_'];
  let prior=-1;
  for(const s of order){const p=chunk.indexOf(s,prior+1);assert.ok(p>prior,s);prior=p;}
});
test('B-27 source showcase body sets count, expands or splices, logs, returns',()=>{
  const start=dsl.indexOf('code\tedit-showcase');
  const end=dsl.indexOf('@@ITEM',start);
  const chunk=dsl.slice(start,end);
  const keys=['$DT->{showcasecount}=$newcnt;',
   'if($oldcnt<$newcnt)', '$DT->{showcase}[$_]=0;',
   '$DT->{price}[$_]=0;', 'if($oldcnt>$newcnt)',
   'splice(@{$DT->{showcase}},$newcnt);',
   'splice(@{$DT->{price}},$newcnt);',
   'WriteLog(0,$DT->{id},$ret);',
   'WriteLog(3,0,$DT->{shopname}."的展示架已經變成$DT->{showcasecount}個了");',
   'return $ret;'];
  let prior=-1;
  for(const s of keys){const p=chunk.indexOf(s);assert.ok(p>prior,s);prior=p;}
});
test('B-27 Core money formatter function is pinned, not substituted for real CGI',()=>{
  assert.match(core,/sub GetMoneyString\s*\n\{/);
  assert.match(core,/substr\(\$num, \$i, 0\) = ',';/);
  assert.match(core,/return \$term\[0\]\.\$num\.\$term\[1\]/);
});
test('B-27 source compiler uses eval here-doc for per-item _local_1 body',()=>{
  assert.ok(compiler.includes("sub $use->{func} {eval(<<'_eval_code_');"));
  assert.ok(compiler.includes('GetLocalFunction($name,$g_use->{no}+1)'));
});
test('B-27 inventory pins work item13 2 actions sharing first local definition',()=>{
  const rows=inventory.postUse.filter(x=>x.ownerItemId===13);
  assert.equal(rows.length,2);
  assert.deepEqual(rows.map(x=>x.resolution),['inline-definition','local-alias']);
  assert.deepEqual(rows.map(x=>x.resolvedSymbol),['_local_1','_local_1']);
  assert.equal(rows[0].originStart,rows[1].originStart);
});
test('B-27 inventory pins showcase item63 8 actions reusing first local definition',()=>{
  const rows=inventory.postUse.filter(x=>x.ownerItemId===63);
  assert.equal(rows.length,8);
  assert.equal(rows[0].resolution,'inline-definition');
  assert.ok(rows.slice(1).every(x=>x.resolution==='local-alias'));
  assert.ok(rows.every(x=>x.resolvedSymbol==='_local_1'));
});
test('B-27 work money earns original param1*count even for counts greater than one',()=>{
  const r=work();
  assert.equal(r.earned,6000);
  assert.equal(r.moneyAfter,6700);
  assert.equal(r.moneyBefore,700);
  assert.equal(r.countsApplied,2);
});
test('B-27 original Core GetMoneyString-style thousands separators',()=>{
  assert.equal(formatOriginalMoneyFixture(0),'¥0');
  assert.equal(formatOriginalMoneyFixture(900),'¥900');
  assert.equal(formatOriginalMoneyFixture(1000),'¥1,000');
  assert.equal(formatOriginalMoneyFixture(1000000),'¥1,000,000');
  assert.equal(formatOriginalMoneyFixture(-3000),'¥-3,000');
});
test('B-27 work result & two log calls reproduce exact source strings',()=>{
  const r=work();
  assert.equal(r.returned,'¥6,000稼ぎました');
  assert.deepEqual(r.logCalls,[
    [0,42,'バイトし、¥6,000稼ぎました'],
    [3,0,'原版店がバイトしたようです'],
  ]);
});
test('B-27 work second source action changes only param not callback body',()=>{
  const r=work({money:900,param1:10000,count:1});
  assert.equal(r.moneyAfter,10900);
  assert.equal(r.returned,'¥10,000稼ぎました');
  assert.deepEqual(r.sourceUseAliases,[1,2]);
});
test('B-27 work synthetic zero count still records two logs, no premature return',()=>{
  const r=work({money:900,count:0});
  assert.equal(r.moneyAfter,900);
  assert.equal(r.returned,'¥0稼ぎました');
  assert.equal(r.logCalls.length,2);
});
test('B-27 work raw negative count can subtract money without extra clamp',()=>{
  const r=work({money:200,count:-1});
  assert.equal(r.moneyAfter,-2800);
  assert.equal(r.returned,'¥-3,000稼ぎました');
});
test('B-27 work raw negative param1 also decreases money',()=>{
  const r=work({money:-400,param1:-1500,count:2});
  assert.equal(r.moneyAfter,-3400);
  assert.equal(r.returned,'¥-3,000稼ぎました');
});
test('B-27 work source numeric/grouping allows millions',()=>{
  const r=work({money:0,param1:1000000,count:3});
  assert.equal(r.moneyAfter,3000000);
  assert.equal(r.returned,'¥3,000,000稼ぎました');
});
test('B-27 currency prefix/suffix are synthetic input, not game rule assumption',()=>{
  const r=work({moneyPrefix:'$',moneySuffix:'元',count:1});
  assert.equal(r.returned,'$3,000元稼ぎました');
  assert.equal(r.logCalls[0][2],'バイトし、$3,000元稼ぎました');
});
test('B-27 work callback body has no direct inventory/time/exp operations',()=>{
  const r=work();
  assert.match(r.inventoryMutation,/none/);
  assert.match(r.timeMutation,/none/);
  assert.match(r.experienceMutation,/none/);
  assert.equal('stockAfter' in r,false);
  assert.equal('worldCommitted' in r,false);
});
test('B-27 showcase expansion preserves old slots and zeros only the new range',()=>{
  const r=resize();
  assert.equal(r.showcaseCountAfter,4);
  assert.deepEqual(r.showcase,[10,20,0,0]);
  assert.deepEqual(r.prices,[100,200,0,0]);
});
test('B-27 showcase expansion returns original message and WriteLog pairs',()=>{
  const r=resize();
  assert.equal(r.returned,'展示架已經改成4個了');
  assert.deepEqual(r.logCalls,[
    [0,88,'展示架已經改成4個了'],
    [3,0,'展覽店的展示架已經變成4個了'],
  ]);
});
test('B-27 showcase shrink uses original splice from newCount',()=>{
  const r=resize({showcaseCount:6,showcase:[1,2,3,4,5,6],
    prices:[10,20,30,40,50,60],newCount:2});
  assert.equal(r.showcaseCountAfter,2);
  assert.deepEqual(r.showcase,[1,2]);
  assert.deepEqual(r.prices,[10,20]);
});
test('B-27 showcase equal old/new counts do not normalize inconsistent extra tail',()=>{
  const r=resize({showcaseCount:2,showcase:[1,2,3],prices:[10,20,30],newCount:2});
  assert.deepEqual(r.showcase,[1,2,3]);
  assert.deepEqual(r.prices,[10,20,30]);
});
test('B-27 showcase expansion past missing slots retains Perl undef as JSON null',()=>{
  const r=resize({showcaseCount:2,showcase:[7],prices:[11],newCount:4});
  assert.deepEqual(r.showcase,[7,null,0,0]);
  assert.deepEqual(r.prices,[11,null,0,0]);
});
test('B-27 showcase expansion does not truncate already longer old arrays',()=>{
  const r=resize({showcaseCount:1,
    showcase:[2,4,6,8,10],prices:[20,40,60,80,100],newCount:3});
  assert.deepEqual(r.showcase,[2,0,0,8,10]);
  assert.deepEqual(r.prices,[20,0,0,80,100]);
});
test('B-27 showcase from zero sets first slot, even though no real shop eligible',()=>{
  const r=resize({showcaseCount:0,showcase:[],prices:[],newCount:1});
  assert.deepEqual(r.showcase,[0]);
  assert.deepEqual(r.prices,[0]);
});
test('B-27 showcase shrink from inconsistent underfilled state does not add slots',()=>{
  const r=resize({showcaseCount:4,showcase:[5],prices:[50],newCount:1});
  assert.deepEqual(r.showcase,[5]);
  assert.deepEqual(r.prices,[50]);
  assert.equal(r.showcaseCountAfter,1);
});
test('B-27 showcase callback does not directly consume inventory or money/time/exp',()=>{
  const r=resize();
  assert.match(r.inventoryMutation,/none/);
  assert.match(r.moneyMutation,/none/);
  assert.match(r.timeMutation,/none/);
  assert.match(r.experienceMutation,/none/);
  assert.equal('consumedItems' in r,false);
});
test('B-27 showcase source action count alias maps each of 8 declarations',()=>{
  const r=resize({newCount:8});
  assert.deepEqual(r.sourceUseAliases,[1,2,3,4,5,6,7,8]);
  assert.equal(r.showcaseCountAfter,8);
});
test('B-27 arrays and input fixture are not mutated',()=>{
  const o={showcaseCount:2,showcase:[10,20],prices:[100,200],
    newCount:4,shopId:88,shopName:'展覽店'};
  const before=structuredClone(o);
  const r=projectOriginalShowcaseResizeCallback(o);
  assert.deepEqual(o,before);
  assert.ok(Object.isFrozen(r));
  assert.ok(Object.isFrozen(r.showcase));
  assert.ok(Object.isFrozen(r.prices));
  assert.ok(Object.isFrozen(r.logCalls[0]));
  assert.throws(()=>{r.showcase[0]=99},TypeError);
});
test('B-27 work inputs immutable and log output deeply frozen',()=>{
  const o={money:700,param1:3000,count:2,shopId:42,shopName:'原版店'};
  const old=structuredClone(o);
  const r=projectOriginalBookWorkCallback(o);
  assert.deepEqual(o,old);
  assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.logCalls));
  assert.ok(Object.isFrozen(r.logCalls[0]));
  assert.throws(()=>{r.logCalls[0][0]=100},TypeError);
});
test('B-27 fixture representation refuses unsafe numbers and unreviewed arrays',()=>{
  assert.throws(()=>work({money:Number.MAX_SAFE_INTEGER}),/moneyAfter/);
  assert.throws(()=>work({param1:1.5}),/param1/);
  assert.throws(()=>work({count:NaN}),/count/);
  assert.throws(()=>resize({newCount:9}),/newCount/);
  assert.throws(()=>resize({showcaseCount:-1}),/showcaseCount/);
  assert.throws(()=>resize({showcase:'not an array'}),/array/);
  assert.throws(()=>formatOriginalMoneyFixture(Infinity),/display monetary integer/);
});
test('B-27 callback projections explicitly exclude real logs and CGI',()=>{
  const a=work(),b=resize();
  for(const result of [a,b]){
    assert.match(result.scope,/unexecuted logging and no CGI\/persistence/);
    assert.equal('realLogWritten' in result,false);
    assert.equal('executePerl' in result,false);
    assert.equal('authorizedUse' in result,false);
  }
});
test('B-27 direct pinned Perl local code matches Node work/showcase projections',t=>{
  const dir=path.join(root,'modern/tests/original-perl');
  let stdout;
  try{
    stdout=execFileSync('perl',['original-inline-work-showcase-probe.pl'],{
      cwd:dir,encoding:'utf8',timeout:10000,maxBuffer:1024*1024,
    });
  }catch(e){
    if(e?.code==='ENOENT'){t.skip('Perl runtime not installed');return;}
    throw e;
  }
  const cases=JSON.parse(stdout);
  assert.equal(cases.length,13);
  for(const row of cases){
    const projected=row.kind==='work'
      ?projectOriginalBookWorkCallback(row.input)
      :projectOriginalShowcaseResizeCallback(row.input);
    const actual=row.observed;
    assert.equal(projected.returned,actual.returned,row.case+' return');
    assert.deepEqual(projected.logCalls,actual.logs,row.case+' source WriteLog argument sequence');
    if(row.kind==='work'){
      assert.equal(projected.moneyAfter,actual.moneyAfter,row.case+' money');
      assert.ok(projected.sourceUseAliases.includes(row.sourceUseNo),row.case+' alias');
      assert.deepEqual(actual.showcase,[10,20],row.case+' no showcase mutation');
      assert.deepEqual(actual.prices,[100,200],row.case+' no price mutation');
      assert.equal(actual.showcaseCountAfter,2,row.case+' showcase count');
    }else{
      assert.equal(projected.showcaseCountAfter,actual.showcaseCountAfter,
        row.case+' showcaseCount');
      assert.deepEqual(projected.showcase,actual.showcase,row.case+' showcase');
      assert.deepEqual(projected.prices,actual.prices,row.case+' prices');
      assert.ok(projected.sourceUseAliases.includes(row.sourceUseNo),row.case+' alias');
      assert.equal(actual.moneyAfter,1000,row.case+' no money mutation');
    }
    assert.deepEqual(actual.item,[7,8,9],row.case+' items are untouched');
    assert.deepEqual(actual.exp,{'13':100},row.case+' experience is untouched');
    assert.equal(actual.time,250,row.case+' time is untouched');
  }
});
