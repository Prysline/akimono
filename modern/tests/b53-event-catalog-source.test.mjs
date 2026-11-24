import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {
  reviewOriginalCompiledEventCatalog,B53_EVENT_CATALOG_SOURCE,
} from '../src/original-event-compiled-catalog.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [itemDsl,rebelDsl,compilerSource,turnSource]=await Promise.all([
  'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
  'modern/tests/original-perl/inc-makeitem.cgi',
  'modern/tests/original-perl/inc-turn.cgi',
].map(p=>readFile(path.join(root,p),'utf8')));
const oracle=JSON.parse(execFileSync('perl',['original-b53-event-catalog-probe.pl'],{
  cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
}));
const review=()=>reviewOriginalCompiledEventCatalog({
  itemDsl,rebelDsl,compilerSource,turnSource,
});
test('B-53 original compiled Standard Street EVENT list exactly matches executable original Perl compiler number/time logic',()=>{
  const catalog=review();
  assert.equal(catalog.source,B53_EVENT_CATALOG_SOURCE);
  assert.deepEqual([
    catalog.declaredCount,catalog.compiledCount,catalog.manuallyDisabledCount,
    catalog.zeroStartCount,catalog.positiveStartCount,
  ],[
    oracle.declaredCount,oracle.compiledCount,oracle.disabledCount,
    oracle.zeroStartCount,oracle.positiveStartCount,
  ]);
  assert.equal(catalog.compiled.length,17);
  assert.equal(catalog.declared.length,25);
  for(let i=0;i<25;i++){
    const a=catalog.declared[i],b=oracle.declared[i];
    for(const key of ['code','ordinal','group','startProba','baseTimeSeconds',
      'plusTimeSeconds','compiled'])assert.deepEqual(a[key],b[key],
      'source EVENT '+i+' '+key);
    assert.deepEqual(a.startRaw,b.startRaw,'all repeated START source values');
    assert.deepEqual(a.callbacks,b.callbacks,'opaque callback presence and names');
    assert.equal(a.runtimeSupported,false);
  }
  assert.ok(catalog.declared.find(x=>x.code==='happy').callbacks.now);
  assert.ok(catalog.declared.find(x=>x.code==='manbiki').callbacks.start);
  assert.ok(catalog.declared.find(x=>x.code==='guildbattle').callbacks.end);
  assert.equal(catalog.runtimeSupported,false);
});
test('B-53 fail closed if percent, disabled overrides, event population or source callbacks drift',()=>{
  for(const changed of [
    {compilerSource:compilerSource.replace("if($2 eq '%'){$num*=10;}","if($2 eq '%'){$num*=1;}")},
    {compilerSource:compilerSource.replace(
      ' if $event->{startproba}!=-1;',
      ' if $event->{startproba}==100;')},
    {itemDsl:itemDsl.replace('start\t\t-1\t\t#発動しない','start\t\t10%\t\t#発動しない')},
    {rebelDsl:rebelDsl.replace('code\t\trebel','code\t\tchanged')},
  ])assert.throws(()=>reviewOriginalCompiledEventCatalog({
    itemDsl,rebelDsl,compilerSource,turnSource,...changed,
  }),/B-53/);
});
