import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {createMemoryWorld,createMemoryWorldAdapter,executeMemoryCommand}
  from '../src/game-core-contract.mjs';
import {validateSourceSparseMarket} from '../src/original-admin-world-bootstrap.mjs';
import {ALL_PLUS_SOURCE,ORIGINAL_PLUS_PIN}
  from '../src/original-sparse-all-plus.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFile(path.join(root,p),'utf8');
const [itemDsl,rebelDsl,admin,readSource,writeSource,turn,whole,config,compiler]
  =await Promise.all([
    'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
    'modern/tests/original-perl/core-inc-admin-func.cgi',
    'modern/tests/original-perl/inc-func.cgi',
    'modern/tests/original-perl/write.cgi',
    'modern/tests/original-perl/inc-turn.cgi',
    'modern/tests/original-perl/whole.cgi','_config.cgi',
    'modern/tests/original-perl/inc-makeitem.cgi',
  ].map(read));
const sources={
  itemDsl,rebelDsl,originalAdminInitSource:admin,
  originalDataReadSource:readSource,originalDataWriteSource:writeSource,
  originalTurnSource:turn,originalWholeSource:whole,
  originalConfigSource:config,originalCompilerSource:compiler,
};
const street=createStandardStreetModule(sources);
const actual=JSON.parse(execFileSync('perl',['original-sparse-all-plus-probe.pl'],{
  cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
}));
function prepared(){
  const repository=createMemoryWorldAdapter(createMemoryWorld({
    worldId:'b37-all-plus',streetId:'standard-street',nowSeconds:1000000,
  }));
  const call=(kind,expectedRevision,more={})=>executeMemoryCommand({
    repository,streetModule:street,command:{kind,expectedRevision,...more},
  });
  assert.equal(call('initialize-source-market',0).code,'COMMITTED');
  assert.equal(call('open-shop',1,{shopId:42,
    ownerName:'標準街來源店主',shopName:'全PLUS來源實測店'}).code,'COMMITTED');
  return {repository,call};
}
test('B-37 complete pinned 57 PLUS and 22 absent compile into 79 deterministic seconds',()=>{
  assert.ok(street.capabilities.includes('reviewed-sparse-all-plus'));
  assert.equal(street.reviewedAllPlus.source,ALL_PLUS_SOURCE);
  const seconds=street.reviewedAllPlus.plusSeconds;
  assert.equal(seconds.length,79);
  assert.equal(seconds.filter(Boolean).length,57);
  assert.equal(seconds.filter(x=>!x).length,22);
  assert.deepEqual(seconds,actual.first.plusSeconds);
  assert.deepEqual(seconds,actual.second.plusSeconds);
  assert.equal(seconds[0],-1200);
  assert.equal(seconds[9],1200);
  assert.equal(seconds[39],-3600);
  assert.equal(seconds[61],432000);
  assert.equal(ORIGINAL_PLUS_PIN.split('|').length,79);
  assert.ok(Object.isFrozen(seconds));
});
test('B-37 source gate needs compiler original source and exact DSL PLUS inventory',()=>{
  const legacy=createStandardStreetModule({
    ...sources,originalCompilerSource:null,
  });
  assert.ok(!legacy.capabilities.includes('reviewed-sparse-all-plus'));
  assert.ok(legacy.capabilities.includes('reviewed-sparse-multi-plus'));
  assert.throws(()=>createStandardStreetModule({
    ...sources,originalCompilerSource:compiler.replace('$g_item->{plus}=0;',''),
  }),/compiler\/source drift/);
  assert.throws(()=>createStandardStreetModule({
    ...sources,itemDsl:itemDsl.replace(/\bplus\s+-20m\b/i,'plus -21m'),
  }),/source drift|PLUS/);
});
test('B-37 first 57-source PLUS execution matches original Perl all 79 slots',()=>{
  const {repository,call}=prepared();
  const response=call('reviewed-sparse-all-plus',2,{
    timespanSeconds:60,randomDraws:actual.first.consumedSamples,
  });
  assert.equal(response.code,'COMMITTED',JSON.stringify(response.details));
  assert.equal(response.world.revision,3);
  assert.equal(response.world.nowSeconds,1000000);
  assert.equal(response.details.drawsUsed,actual.first.drawsUsed);
  assert.equal(response.details.signedChanges.length,57);
  assert.equal(response.details.activeItemIds.length,57);
  assert.deepEqual(response.details.activeItemIds,
    response.details.activeItemIds.toSorted((a,b)=>a-b));
  assert.deepEqual(response.world.market.wholesale,actual.first.numericWholesale);
  assert.equal(response.world.market.originalWholesaleCsv,actual.first.wireCsv);
  assert.deepEqual(response.world.market.sparseWrittenSlots,actual.first.definedIndices);
  assert.equal(validateSourceSparseMarket(response.world.market),true);
  assert.equal(response.world.shops[0].item[62],1);
  assert.equal(response.world.shops[0].item[78],5);
  assert.equal(repository.read().revision,3);
});
test('B-37 consecutive source all-57 market transitions match original Perl and caps',()=>{
  const {call}=prepared();
  for(const [revision,seconds,want] of [
    [2,60,actual.first],[3,600,actual.second],[4,3600,actual.third],
  ]){
    const result=call('reviewed-sparse-all-plus',revision,{
      timespanSeconds:seconds,randomDraws:want.consumedSamples,
    });
    assert.equal(result.code,'COMMITTED',JSON.stringify(result.details));
    assert.equal(result.world.revision,revision+1);
    assert.deepEqual(result.world.market.wholesale,want.numericWholesale);
    assert.equal(result.world.market.originalWholesaleCsv,want.wireCsv);
    assert.deepEqual(result.world.market.sparseWrittenSlots,want.definedIndices);
    assert.equal(result.details.drawsUsed,want.drawsUsed);
    assert.equal(result.world.nowSeconds,1000000);
  }
});
test('B-37 empty and extraneous random draws reject without mutating CAS world',()=>{
  const {call,repository}=prepared(),first=JSON.stringify(repository.read());
  const sourceDraws=actual.first.consumedSamples;
  for(const samples of [
    [],sourceDraws.slice(0,-1),[...sourceDraws,0],[-1,...sourceDraws.slice(1)],
    [1000000,...sourceDraws.slice(1)],Array(115).fill(0),
  ]){
    assert.equal(call('reviewed-sparse-all-plus',2,{
      timespanSeconds:60,randomDraws:samples,
    }).code,'SOURCE_BOUNDARY_REJECTED');
    assert.equal(JSON.stringify(repository.read()),first);
  }
  for(const seconds of [0,3601,-1]){
    assert.equal(call('reviewed-sparse-all-plus',2,{
      timespanSeconds:seconds,randomDraws:sourceDraws,
    }).code,'SOURCE_BOUNDARY_REJECTED');
    assert.equal(JSON.stringify(repository.read()),first);
  }
  assert.equal(call('reviewed-sparse-all-plus',1,{
    timespanSeconds:60,randomDraws:sourceDraws,
  }).code,'REVISION_CONFLICT');
});
test('B-37 noninteger JSON commands reject before projection; unknown fields refused',()=>{
  const {call,repository}=prepared(),start=JSON.stringify(repository.read());
  assert.throws(()=>call('reviewed-sparse-all-plus',2,{
    timespanSeconds:60,randomDraws:[0.5],
  }),/non-safe JSON number/);
  assert.equal(call('reviewed-sparse-all-plus',2,{
    timespanSeconds:60,randomDraws:actual.first.consumedSamples,
    unreviewedEvents:true,
  }).code,'SOURCE_BOUNDARY_REJECTED');
  assert.equal(JSON.stringify(repository.read()),start);
});
test('B-37 refuses source-missing market, wrong world and unsupported shop shape',()=>{
  const world=createMemoryWorld({
    worldId:'no-init',streetId:'standard-street',nowSeconds:1000000,
  });
  const repo=createMemoryWorldAdapter(world);
  assert.equal(executeMemoryCommand({repository:repo,streetModule:street,command:{
    kind:'reviewed-sparse-all-plus',expectedRevision:0,
    timespanSeconds:60,randomDraws:actual.first.consumedSamples,
  }}).code,'SOURCE_BOUNDARY_REJECTED');
  const {call}=prepared();
  assert.equal(call('reviewed-sparse-all-plus',2,{
    timespanSeconds:60,randomDraws:actual.first.consumedSamples,
    itemId:10,
  }).code,'SOURCE_BOUNDARY_REJECTED');
});
test('B-37 source market also accepts one verified gift use before full PLUS',()=>{
  const {call}=prepared();
  const gift=call('gift-exchange-maps',2,{shopId:42,requestedCount:1});
  assert.equal(gift.code,'COMMITTED');
  assert.equal(gift.world.revision,3);
  const supply=call('reviewed-sparse-all-plus',3,{
    timespanSeconds:60,randomDraws:actual.first.consumedSamples,
  });
  assert.equal(supply.code,'COMMITTED');
  assert.equal(supply.world.shops[0].item[78],3);
  for(const id of [9,12,14])assert.equal(supply.world.shops[0].item[id-1],1);
  assert.equal(validateSourceSparseMarket(supply.world.market),true);
});
