import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  reviewOriginalPeriodTerritory,projectOriginalPeriodTerritory,
  B46_TERRITORY_SOURCE,
} from '../src/original-period-territory.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=rel=>readFile(path.join(root,rel),'utf8');
const [periodSource,adminSource,readSource]=await Promise.all([
  'modern/tests/original-perl/period.cgi',
  'modern/tests/original-perl/core-inc-admin-func.cgi',
  'modern/tests/original-perl/inc-func.cgi',
].map(read));
const bootstrapMeta='500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0';
const reviewed=reviewOriginalPeriodTerritory({
  periodSource,adminSource,readSource,bootstrapMeta,
});
const oracle=JSON.parse(execFileSync('perl',['original-b46-territory-probe.pl'],{
  cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
}));
test('B-46 original town meta and frozen territory phase are locked to original Core',()=>{
  assert.equal(reviewed.source,B46_TERRITORY_SOURCE);
  assert.equal(reviewed.initialDtPeople,500000);
  assert.deepEqual(reviewed.initialTown,{
    leader:0,money:0,in:0,out:0,develop:5001,devem:0,
    safety:5001,safem:0,army:0,robina:2000,robinb:0,
  });
  assert.throws(()=>reviewOriginalPeriodTerritory({
    periodSource:periodSource.replace('RebelRobin();',''),
    adminSource,readSource,bootstrapMeta,
  }),/source drift/);
  assert.throws(()=>reviewOriginalPeriodTerritory({
    periodSource,adminSource,readSource,
    bootstrapMeta:bootstrapMeta.replace('5001:0:5001','5002:0:5001'),
  }),/changed/);
});
test('B-46 two generations of true original town territory math and insolvency match Node exactly',()=>{
  assert.equal(oracle.cases.length,3);
  for(const row of oracle.cases){
    const sourceInput=structuredClone(row.input);
    const result=projectOriginalPeriodTerritory({
      reviewed,town:sourceInput.town,dtPeople:sourceInput.dtPeople,
      drawMillionths:sourceInput.drawMillionths,
      shopCount:1,taxIn:0,leaderShopExists:false,activeEventKeys:[],
    });
    assert.deepEqual(result.town,row.output.town,row.name+' source territory');
    assert.equal(result.dtPeople,row.output.dtPeople,row.name+' next population');
    assert.deepEqual(sourceInput,row.input,'town input remains unchanged');
    assert.equal(result.drawsUsed,2);
  }
});
test('B-46 deny unknown event/leader/taxes, missing source fields or random samples',()=>{
  const input=oracle.cases[0].input;
  const baseline={reviewed,town:input.town,dtPeople:input.dtPeople,
    shopCount:1,taxIn:0,leaderShopExists:false,
    activeEventKeys:[],drawMillionths:input.drawMillionths};
  for(const wrong of [
    {shopCount:2},{taxIn:1},{leaderShopExists:true},
    {activeEventKeys:['rebel']},{drawMillionths:[0]},
    {drawMillionths:[0,1000000]},
    {town:{...input.town,leader:1}},
  ])assert.throws(()=>projectOriginalPeriodTerritory({...baseline,...wrong}),
    /B-46/);
});
