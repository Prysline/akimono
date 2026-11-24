import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  reviewOriginalSoloSort,projectOriginalSoloSort,B47_SOLO_RANK_SOURCE,
} from '../src/original-period-solo-sort.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=rel=>readFile(path.join(root,rel),'utf8');
const [detailSource,readSource]=await Promise.all([
  'modern/tests/original-perl/core-detail.cgi',
  'modern/tests/original-perl/inc-func.cgi',
].map(read));
const reviewed=reviewOriginalSoloSort({detailSource,readSource});
const oracle=JSON.parse(execFileSync('perl',['original-b47-solo-sort-probe.pl'],{
  cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
}));
test('B-47 frozen original Core ranking/point markers guard reviewed solo SortDT',()=>{
  assert.equal(reviewed.source,B47_SOLO_RANK_SOURCE);
  assert.throws(()=>reviewOriginalSoloSort({
    detailSource:detailSource.replace(
      '@DT=grep($_->{status},@DT);',''),
    readSource,
  }),/source drift/);
  assert.throws(()=>reviewOriginalSoloSort({
    detailSource,
    readSource:readSource.replace('return int( $DT->{rank} * $r * $p );',''),
  }),/source drift/);
});
test('B-47 original Perl SortDT and GetDTPoint align for opening, two sales, high profit and loss',()=>{
  assert.equal(oracle.cases.length,4);
  for(const row of oracle.cases){
    const before=structuredClone(row.input);
    const result=projectOriginalSoloSort({shop:before,reviewed});
    for(const key of Object.keys(row.output))
      assert.deepEqual(result.shop[key],row.output[key],
        row.name+' original Core ranking field '+key);
    assert.equal(result.idToIndex[1],row.idIndex);
    assert.equal(result.nameToIndex[before.name],row.nameIndex);
    assert.deepEqual(before,row.input);
  }
});
test('B-47 strict original solo ranking boundaries deny inactive/multi-source and invalid profit',()=>{
  const base=oracle.cases[0].input;
  for(const changes of [
    {id:2},{status:0},{name:''},{rankingcount:-1},
    {rank:-1},{rank:Infinity},{saletoday:-1},{profitstock:Number.MAX_SAFE_INTEGER},
  ]){
    assert.throws(()=>projectOriginalSoloSort({
      shop:{...base,...changes},reviewed,
    }),/B-47/);
  }
});
