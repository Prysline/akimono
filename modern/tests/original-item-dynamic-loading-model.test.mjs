import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {projectOriginalVirtualItemLoadSequence as project}
  from '../src/original-item-dynamic-loading-model.mjs';
import {auditOriginalStandardCallbackDeclarations as audit}
  from '../src/original-standard-callback-inventory.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [detail,form,submit,common,compiler,config,itemDsl,rebelDsl]=await Promise.all([
  'modern/tests/original-perl/core-item-detail.cgi',
  'modern/tests/original-perl/core-item-form.cgi',
  'modern/tests/original-perl/core-item-submit.cgi',
  'modern/tests/original-perl/core-inc-item.cgi',
  'modern/tests/original-perl/inc-makeitem.cgi',
  '_config.cgi','custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
].map(p=>readFile(path.join(root,p),'utf8')));

const call=sequence=>project({sequence});
const s1=call(['book-work']);
const s2=call(['edit-showcase']);
const productList=audit({itemDsl,rebelDsl,compilerSource:compiler});

test('B-28 pinned root _config.cgi prefers custom RequireFile over built-in include',()=>{
  const x=config.slice(config.indexOf('sub RequireFile'));
  const custom=x.indexOf('my $customfile="$CUSTOM_DIR/$_[0]";');
  const customRequire=x.indexOf('require $customfile,return if -e $customfile;');
  const builtin=x.indexOf('my $fname="$INCLUDE_DIR/$_[0]";');
  const builtinRequire=x.indexOf('require $fname;');
  assert.ok(custom>=0&&custom<customRequire&&customRequire<builtin&&builtin<builtinRequire);
});
test('B-28 current source checkout has no custom/inc-item.cgi override',()=>{
  assert.equal(existsSync(path.join(root,'custom/inc-item.cgi')),false);
});
test('B-28 shared Core inc-item belongs to package item and has item helpers',()=>{
  assert.match(common,/^package item; #変更不可/m);
  for(const name of ['WriteLog','UseItem','UseItemSub','AddItem','AddItemSub']){
    assert.ok(common.includes('sub '+name),name);
  }
});
test('B-28 inc-item shared funcitem requires only if DEFINE_FUNCITEM',()=>{
  assert.ok(common.includes('require "$main::ITEM_DIR/funcitem.cgi" if $main::DEFINE_FUNCITEM;'));
  assert.ok(!common.includes('require $itemcode;'));
});
test('B-28 three pinned CGI entrypoints select per-item generated module path',()=>{
  for(const source of [detail,form,submit]){
    assert.ok(source.includes('GetPath($ITEM_DIR,"use",$ITEM[$itemno]->{code})'));
    assert.ok(source.includes('require $itemcode;'));
  }
});
test('B-28 three original entrypoints require shared inc-item BEFORE direct per-code module',()=>{
  for(const source of [detail,form,submit]){
    assert.ok(source.indexOf("RequireFile('inc-item.cgi')")<
      source.indexOf('require $itemcode;'));
  }
});
test('B-28 original entrypoints resolve USE only AFTER per-code direct require',()=>{
  assert.ok(detail.indexOf('require $itemcode;')<detail.indexOf('GetUseItemList();'));
  for(const s of [form,submit]){
    assert.ok(s.indexOf('require $itemcode;')<s.indexOf('GetUseItem($no);'));
  }
});
test('B-28 source compiler places each product under its own use/<code> output path',()=>{
  assert.ok(compiler.includes('"$ITEM_DIR/use/$item->{code}$FILE_EXT"'));
  assert.ok(compiler.includes('$s.="package item;\\0";'));
});
test('B-28 compiler emits USE records into package-global array without clearing it',()=>{
  const start=compiler.indexOf('open(MAKEOUT');
  const end=compiler.indexOf('close(MAKEOUT);',start);
  const part=compiler.slice(start,end);
  assert.ok(part.includes('\\$USE[$use->{no}]'));
  assert.ok(!part.includes('undef @USE;'));
  assert.ok(!part.includes('undef @item::USE;'));
});
test('B-28 local functions generated with original eval heredoc and shared symbol',()=>{
  assert.ok(compiler.includes("sub $use->{func} {eval(<<'_eval_code_');"));
  assert.ok(compiler.includes('GetLocalFunction($name,$g_use->{no}+1)'));
  assert.deepEqual(productList.postUse.filter(x=>[13,63].includes(x.ownerItemId))
    .map(x=>x.resolvedSymbol),Array(10).fill('_local_1'));
});
test('B-28 original work source catalog has two aliases but one definition',()=>{
  const rows=productList.postUse.filter(x=>x.ownerItemId===13);
  assert.equal(rows.length,2);
  assert.deepEqual(rows.map(x=>x.resolution),['inline-definition','local-alias']);
});
test('B-28 original showcase source catalog has eight aliases but one definition',()=>{
  const rows=productList.postUse.filter(x=>x.ownerItemId===63);
  assert.equal(rows.length,8);
  assert.deepEqual(rows.map(x=>x.resolution),
    ['inline-definition',...Array(7).fill('local-alias')]);
});
test('B-28 simulated isolated work request has one path and its own symbol',()=>{
  assert.deepEqual(s1.loadedPaths,['b28/use/book-work.cgi']);
  assert.equal(s1.steps[0].activeFunctionOwner,'book-work');
  assert.equal(s1.steps[0].activeFunctionName,'item::_local_1');
  assert.equal(s1.steps[0].requireCacheHit,false);
});
test('B-28 simulated isolated showcase request has one path and its own symbol',()=>{
  assert.deepEqual(s2.loadedPaths,['b28/use/edit-showcase.cgi']);
  assert.equal(s2.steps[0].activeFunctionOwner,'edit-showcase');
  assert.equal(s2.steps[0].requireCacheHit,false);
});
test('B-28 isolated work original callback returns money and two logs',()=>{
  const r=s1.steps[0];
  assert.equal(r.moneyAfter,104);
  assert.equal(r.showcaseCountAfter,1);
  assert.equal(r.returned,'¥4稼ぎました');
  assert.deepEqual(r.logCalls,[
    [0,42,'バイトし、¥4稼ぎました'],
    [3,0,'原版店がバイトしたようです'],
  ]);
});
test('B-28 isolated showcase original callback preserves work money',()=>{
  const r=s2.steps[0];
  assert.equal(r.moneyAfter,100);
  assert.equal(r.showcaseCountAfter,2);
  assert.deepEqual(r.showcase,[9,0]);
  assert.deepEqual(r.prices,[90,0]);
  assert.equal(r.returned,'展示架已經改成2個了');
});
test('B-28 repeated same file is cached and does not reload symbol',()=>{
  const r=call(['book-work','book-work']);
  assert.deepEqual(r.steps.map(x=>x.requireCacheHit),[false,true]);
  assert.deepEqual(r.steps.map(x=>x.activeFunctionOwner),['book-work','book-work']);
  assert.deepEqual(r.hookRequests,['b28/use/book-work.cgi']);
});
test('B-28 different file in same Perl interpreter replaces same package symbol',()=>{
  const r=call(['book-work','edit-showcase']);
  assert.deepEqual(r.steps.map(x=>x.activeFunctionOwner),
    ['book-work','edit-showcase']);
  assert.deepEqual(r.hookRequests,[
    'b28/use/book-work.cgi','b28/use/edit-showcase.cgi',
  ]);
});
test('B-28 cached work require after showcase cannot restore overwritten symbol',()=>{
  const r=call(['book-work','edit-showcase','book-work']);
  assert.deepEqual(r.steps.map(x=>x.activeFunctionOwner),
    ['book-work','edit-showcase','edit-showcase']);
  assert.deepEqual(r.steps.map(x=>x.requireCacheHit),[false,false,true]);
  assert.equal(r.steps[2].returned,'展示架已經改成2個了');
});
test('B-28 cached showcase require after work cannot restore overwritten symbol',()=>{
  const r=call(['edit-showcase','book-work','edit-showcase']);
  assert.deepEqual(r.steps.map(x=>x.activeFunctionOwner),
    ['edit-showcase','book-work','book-work']);
  assert.deepEqual(r.steps.map(x=>x.requireCacheHit),[false,false,true]);
  assert.equal(r.steps[2].returned,'¥4稼ぎました');
});
test('B-28 per-product @USE allocations are replaced only at assigned indices',()=>{
  const r=call(['edit-showcase','book-work']);
  assert.deepEqual(r.steps[0].useOwners,Array(8).fill('edit-showcase'));
  assert.deepEqual(r.steps[1].useOwners,[
    'book-work','book-work',...Array(6).fill('edit-showcase'),
  ]);
});
test('B-28 reverse load replaces all indices 1..8 without leftover work',()=>{
  const r=call(['book-work','edit-showcase']);
  assert.deepEqual(r.steps[1].useOwners,Array(8).fill('edit-showcase'));
});
test('B-28 work repeat after showcase does not restore old @USE entries either',()=>{
  const r=call(['book-work','edit-showcase','book-work']);
  assert.deepEqual(r.steps[2].useOwners,Array(8).fill('edit-showcase'));
});
test('B-28 distinct paths loaded in first-use order, never more than once',()=>{
  const r=call(['edit-showcase','book-work','book-work','edit-showcase']);
  assert.deepEqual(r.loadedPaths,[
    'b28/use/edit-showcase.cgi','b28/use/book-work.cgi',
  ]);
  assert.deepEqual(r.hookRequests,r.loadedPaths);
});
test('B-28 no implicit CGI or persistence in virtual loader model',()=>{
  assert.match(s1.scope,/synthetic single Perl interpreter/);
  assert.match(s1.scope,/no disk writes, real CGI, dynamic compiler or persistence/);
  assert.equal('realRequire' in s1,false);
  assert.equal('worldCommitted' in s1,false);
});
test('B-28 no hidden mutable data references in returned model',()=>{
  const r=call(['book-work','edit-showcase']);
  assert.ok(Object.isFrozen(r));
  assert.ok(Object.isFrozen(r.steps));
  assert.ok(Object.isFrozen(r.steps[0]));
  assert.ok(Object.isFrozen(r.steps[0].useOwners));
  assert.ok(Object.isFrozen(r.steps[0].logCalls[0]));
  assert.throws(()=>{r.steps[0].useOwners[0]='other'},TypeError);
});
test('B-28 unsafe, empty, unknown load sequences are refused',()=>{
  assert.throws(()=>call([]),/require sequence/);
  assert.throws(()=>call(Array(13).fill('book-work')),/require sequence/);
  assert.throws(()=>call(['anything.cgi']),/not a reviewed source code/);
  assert.throws(()=>project({sequence:'book-work'}),/require sequence/);
});
test('B-28 source data is left untouched by callback loading model',()=>{
  const x=['book-work','edit-showcase','book-work'];
  const original=structuredClone(x);
  call(x);
  assert.deepEqual(x,original);
});
test('B-28 nine REAL Perl in-memory require scenarios match Node, no disk modules',t=>{
  const dir=path.join(root,'modern/tests/original-perl');
  const scenarios=['work-only','showcase-only','work-repeat','showcase-repeat',
    'work-then-showcase','showcase-then-work','work-showcase-work',
    'showcase-work-showcase','alternating'];
  let n=0;
  for(const name of scenarios){
    let out;
    try{
      out=execFileSync('perl',['original-virtual-item-require-probe.pl',name],{
        cwd:dir,encoding:'utf8',maxBuffer:1024*1024,timeout:10000,
      });
    }catch(e){
      if(e?.code==='ENOENT'){t.skip('Perl runtime unavailable');return;}
      throw e;
    }
    const x=JSON.parse(out);
    assert.equal(x.case,name);
    const computed=call(x.sequence);
    assert.deepEqual(computed.steps,x.observed.steps,name+' required source semantics');
    assert.deepEqual(computed.loadedPaths,x.observed.loadedPaths,name+' %INC first loads');
    assert.deepEqual(computed.hookRequests,x.observed.hookRequests,
      name+' original require hook request count/order');
    assert.match(x.observed.scope,/synthetic in-memory Perl require/);
    n++;
  }
  assert.equal(n,9);
});
