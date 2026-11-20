import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  auditOriginalStandardCallbackDeclarations,
} from '../src/original-standard-callback-inventory.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [itemDsl,rebelDsl,compilerSource]=await Promise.all([
  'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
  'modern/tests/original-perl/inc-makeitem.cgi',
].map(file=>readFile(path.join(root,file),'utf8')));
const audit=(o={})=>auditOriginalStandardCallbackDeclarations({
  itemDsl,rebelDsl,compilerSource,...o,
});
const result=audit();

test('B-26 inventory pinned Standard Street 79 ITEM, 116 USE, 25 EVENT, 7 FUNC blocks',()=>{
  assert.deepEqual([
    result.summary.sourceItemCount,result.summary.sourceUseCount,
    result.summary.sourceEventCount,result.summary.sourceGlobalHookCount,
  ],[79,116,25,7]);
});
test('B-26 exactly 56 USE post callbacks, 60 uses without a post callback',()=>{
  assert.equal(result.summary.postUseDeclarations,56);
  assert.equal(result.summary.postUseNoDeclaration,60);
  assert.equal(result.postUse.length,56);
});
test('B-26 22 shared lostbook, 1 shared popup from original FUNCITEM',()=>{
  assert.equal(result.summary.postUseSharedLostbook,22);
  assert.equal(result.summary.postUseSharedPopup,1);
  assert.deepEqual(result.sharedDefinitions.map(x=>x.symbol),['lostbook','popup']);
});
test('B-26 exactly 11 inline local definitions and 22 alias references',()=>{
  assert.equal(result.summary.postUseInlineDefinitions,11);
  assert.equal(result.summary.postUseLocalAliases,22);
  assert.equal(result.postUse.filter(x=>x.resolution==='local-alias').length,22);
});
test('B-26 one USE functionbefore and one ITEM functurn are distinct',()=>{
  assert.equal(result.summary.preUseDeclarations,1);
  assert.equal(result.summary.itemTurnDeclarations,1);
  assert.equal(result.preUse[0].ownerItemId,14);
  assert.equal(result.preUse[0].field,'funcb');
  assert.equal(result.preUse[0].sourceName,'_local_');
  assert.equal(result.itemTurn[0].ownerItemId,70);
  assert.equal(result.itemTurn[0].field,'funct');
});
test('B-26 source contains 42 job modifiers; not counted as post callback declarations',()=>{
  assert.equal(result.summary.useJobModifiers,42);
  assert.equal(result.postUse.length,56);
});
test('B-26 all current 58 callback declarations resolve to pinned source origin',()=>{
  assert.equal(result.summary.unresolvedReferences,0);
  for(const x of [...result.postUse,...result.preUse,...result.itemTurn]){
    assert.ok(Number.isInteger(x.originStart)&&x.originStart>0);
    assert.ok(Number.isInteger(x.originEnd)&&x.originEnd>=x.originStart);
    assert.equal(x.execution,'not-executed');
  }
});
test('B-26 named shared callback source begins at FUNCITEM, not local USE',()=>{
  const books=result.postUse.filter(x=>x.resolvedSymbol==='lostbook');
  const party=result.postUse.filter(x=>x.resolvedSymbol==='popup');
  assert.equal(books.length,22);
  assert.equal(party.length,1);
  assert.ok(books.every(x=>x.resolution==='shared-named'));
  assert.ok(books.every(x=>x.originStart===books[0].originStart));
  assert.equal(party[0].ownerItemId,77);
  assert.equal(party[0].sourceName,'popup');
});
test('B-26 lostbook source references inventory external call and random',()=>{
  const b=result.sharedDefinitions.find(x=>x.symbol==='lostbook');
  assert.ok(b.references.includes('inventory'));
  assert.ok(b.references.includes('random'));
  assert.equal(b.references.includes('money'),false);
  assert.equal(b.references.includes('experience'),false);
});
test('B-26 popup source references rank and logs but not direct exp/money/time',()=>{
  const p=result.sharedDefinitions.find(x=>x.symbol==='popup');
  assert.deepEqual(p.references,['popularity','logs']);
});
test('B-26 book-work inline local is defined once and alias reuses identical source line',()=>{
  const work=result.postUse.filter(x=>x.ownerItemId===13);
  assert.equal(work.length,2);
  assert.equal(work[0].sourceName,'_local_');
  assert.equal(work[0].resolvedSymbol,'_local_1');
  assert.equal(work[0].resolution,'inline-definition');
  assert.equal(work[1].sourceName,'_local_1');
  assert.equal(work[1].resolution,'local-alias');
  assert.equal(work[0].originStart,work[1].originStart);
  assert.ok(work[1].references.includes('money'));
  assert.ok(work[1].references.includes('logs'));
});
test('B-26 showcase resize local aliases all point at first use body',()=>{
  const r=result.postUse.filter(x=>x.ownerItemId===63);
  assert.equal(r.length,8);
  assert.equal(r[0].resolution,'inline-definition');
  assert.ok(r.slice(1).every(x=>x.resolution==='local-alias'));
  assert.ok(r.every(x=>x.resolvedSymbol==='_local_1'));
  assert.ok(r.every(x=>x.originStart===r[0].originStart));
  assert.ok(r[0].references.includes('showcase'));
  assert.ok(r[0].references.includes('logs'));
});
test('B-26 job/career guide 13 aliases reuse source, do not make 13 definitions',()=>{
  const r=result.postUse.filter(x=>x.ownerItemId===78);
  assert.equal(r.length,13);
  assert.equal(r[0].resolution,'inline-definition');
  assert.ok(r.slice(1).every(x=>x.resolution==='local-alias'));
  assert.ok(r.every(x=>x.originStart===r[0].originStart));
  assert.ok(r[0].references.includes('experience'));
});
test('B-26 milk actions one local implementation reused for second action',()=>{
  const r=result.postUse.filter(x=>x.ownerItemId===25);
  assert.equal(r.length,2);
  assert.equal(r[0].resolution,'inline-definition');
  assert.equal(r[1].resolution,'local-alias');
  assert.equal(r[0].originStart,r[1].originStart);
});
test('B-26 local function alias count by owner matches original DSL',()=>{
  const freq=Object.fromEntries([13,25,63,78].map(id=>[
    id,result.postUse.filter(x=>x.ownerItemId===id&&x.resolution==='local-alias').length,
  ]));
  assert.deepEqual(freq,{'13':1,'25':1,'63':7,'78':13});
  assert.equal(Object.values(freq).reduce((x,y)=>x+y,0),22);
});
test('B-26 pre-use inline body is distinct from post-use shared lostbook',()=>{
  const b=result.preUse[0];
  assert.equal(b.resolution,'inline-definition');
  assert.equal(b.resolvedSymbol,'_local_b1');
  assert.ok(b.references.includes('random'));
});
test('B-26 inline classified fields are ONLY token references, not executed effects',()=>{
  const a=result.postUse.find(x=>x.ownerItemId===62);
  assert.equal(a.resolution,'inline-definition');
  assert.ok(a.references.includes('popularity'));
  assert.ok(a.references.includes('random'));
  assert.ok(a.references.includes('logs'));
  assert.equal('effectApplied' in a,false);
  assert.equal('execute' in a,false);
});
test('B-26 source line provenance and original files retained for every post action',()=>{
  for(const a of result.postUse){
    assert.equal(a.file,'custom/inc-item-data.cgi');
    assert.equal(a.originFile,'custom/inc-item-data.cgi');
    assert.ok(a.sourceLine>0);
    assert.ok(a.ownerItemId>=1&&a.ownerItemId<=79);
    assert.ok(a.ownerCode&&a.ownerName);
  }
});
test('B-26 never mixes event callbacks with USE post callbacks',()=>{
  assert.equal(result.summary.sourceEventCount,25);
  assert.equal(result.summary.postUseDeclarations,56);
  assert.ok(result.postUse.every(x=>x.kind==='USE'));
});
test('B-26 malformed or changed compiler contract fails closed',()=>{
  assert.throws(()=>audit({compilerSource:'sub GetLocalFunction {}'}),/compiler contract drift/);
  assert.throws(()=>audit({compilerSource:compilerSource.replace(
    'GetLocalFunction($name,$g_use->{no}+1)','GetLocalFunction($name,999)')}),
    /compiler contract drift/);
});
test('B-26 removed DSL shared callback yields unresolved reference rather than invented stub',()=>{
  // Alter the shared named definition only, not declaration count.
  const mutated=itemDsl.replace('sub lostbook\n','sub not_lostbook\n');
  assert.throws(()=>audit({itemDsl:mutated}),/missing original shared callback/);
});
test('B-26 structural DSL changes do not pass source-pinned count check',()=>{
  const mutated=itemDsl.replace('@@USE','@@UNKNOWNUSE');
  assert.throws(()=>audit({itemDsl:mutated}),/source structure failed/);
});
test('B-26 report and nested entries are frozen and no code executes',()=>{
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.postUse));
  assert.ok(Object.isFrozen(result.postUse[0]));
  assert.ok(Object.isFrozen(result.postUse[0].references));
  assert.ok(Object.isFrozen(result.sharedDefinitions[0]));
  assert.match(result.scope,/no Perl evaluation, dynamic callback, authenticated use or world writes/);
  assert.equal('commitWorld' in result,false);
  assert.equal('executePerl' in result,false);
});
test('B-26 pin original compiler GetLocalFunction name expansion and alias design',()=>{
  assert.ok(compilerSource.includes('GetLocalFunction($name,$g_use->{no}+1)'));
  assert.ok(compilerSource.includes('GetLocalFunction($name,"b".($g_use->{no}+1))'));
  assert.ok(compilerSource.includes('$funcname=$g_define->{localfuncmark}.$ext;'));
  assert.ok(compilerSource.includes("sub $use->{func} {eval(<<'_eval_code_');"));
});
