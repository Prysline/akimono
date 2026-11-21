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

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFile(path.join(root,p),'utf8');
const [itemDsl,rebelDsl,admin,readSource,writeSource,turn,whole,config]=await Promise.all([
  'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
  'modern/tests/original-perl/core-inc-admin-func.cgi',
  'modern/tests/original-perl/inc-func.cgi',
  'modern/tests/original-perl/write.cgi','modern/tests/original-perl/inc-turn.cgi',
  'modern/tests/original-perl/whole.cgi','_config.cgi',
].map(read));
const inputs={itemDsl,rebelDsl,originalAdminInitSource:admin,
  originalDataReadSource:readSource,originalDataWriteSource:writeSource,
  originalTurnSource:turn,originalWholeSource:whole,originalConfigSource:config};
const module=createStandardStreetModule(inputs);
const actual=JSON.parse(execFileSync('perl',['original-sparse-multi-plus-probe.pl'],{
  cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
}));
function ready(){
  const repo=createMemoryWorldAdapter(createMemoryWorld({
    worldId:'b36-multiple-plus',streetId:'standard-street',nowSeconds:1000000,
  }));
  const run=(kind,expectedRevision,details={})=>executeMemoryCommand({
    repository:repo,streetModule:module,command:{kind,expectedRevision,...details},
  });
  assert.equal(run('initialize-source-market',0).code,'COMMITTED');
  assert.equal(run('open-shop',1,{shopId:42,ownerName:'測試店主',
    shopName:'標準街原版受控測試店'}).code,'COMMITTED');
  return {repo,run};
}
const input=(rev,timespanSeconds=60,randomDraws=[0,0,0,0])=>({
  kind:'reviewed-sparse-multi-plus',expectedRevision:rev,
  timespanSeconds,randomDraws,
});
test('B-36 three real source PLUS items in original numeric order and optional module',()=>{
  assert.ok(module.capabilities.includes('reviewed-sparse-multi-plus'));
  assert.deepEqual(module.reviewedMultiPlus.activeItemIds,[1,10,40]);
  assert.deepEqual(module.reviewedMultiPlus.plusSeconds,[-1200,1200,-3600]);
  assert.equal(module.reviewedMultiPlus.population,500000);
  assert.ok(Object.isFrozen(module.reviewedMultiPlus.activeItemIds));
  const legacy=createStandardStreetModule({itemDsl,rebelDsl});
  assert.ok(!legacy.capabilities.includes('reviewed-sparse-multi-plus'));
});
test('B-36 exact original source and three DSL PLUS directives must not drift',()=>{
  assert.throws(()=>createStandardStreetModule({...inputs,
    originalTurnSource:turn.replace('foreach my $cnt (1..$MAX_ITEM)',
      'foreach my $cnt (40..1)'),
  }),/source drift/);
  assert.throws(()=>createStandardStreetModule({...inputs,
    itemDsl:itemDsl.replace(/\bplus\s+-20m\b/i,'plus 1m'),
  }),/source metadata changed|PLUS source|source drift/);
});
test('B-36 source #1,#10,#40 one initial sparse update equals Perl original',()=>{
  const {repo,run}=ready();
  const result=run('reviewed-sparse-multi-plus',2,{
    timespanSeconds:60,randomDraws:[0,0,0,0],
  });
  assert.equal(result.code,'COMMITTED',JSON.stringify(result.details));
  assert.equal(result.world.revision,3);
  assert.equal(result.world.nowSeconds,1000000);
  assert.deepEqual(result.details.items.map(x=>x.itemId),[1,10,40]);
  assert.deepEqual(result.details.items.map(x=>x.drawsUsed),[1,1,2]);
  assert.deepEqual(result.details.items.map(x=>x.signedDelta),[-1,1,-1]);
  assert.deepEqual([0,9,39,78].map(i=>result.world.market.wholesale[i]),actual.first.stocks);
  assert.equal(result.details.drawsUsed,actual.first.randomDrawsUsed);
  assert.equal(result.world.market.originalWholesaleCsv,actual.first.wireCsv);
  assert.deepEqual(result.world.market.sparseWrittenSlots,actual.first.definedIndices);
  assert.equal(validateSourceSparseMarket(result.world.market),true);
  assert.equal(result.world.shops[0].item[62],1);
  assert.equal(result.world.shops[0].item[78],5);
  assert.equal(repo.read().revision,3);
});
test('B-36 sampled double-turn and capped third match consecutive original Perl',()=>{
  const {run}=ready();
  for(const [rev,seconds,draws,want] of [
    [2,60,[0,0,0,0],actual.first],
    [3,60,[0,900000,0,999999],actual.second],
    [4,600,[0,0,0],actual.third],
  ]){
    const result=run('reviewed-sparse-multi-plus',rev,{
      timespanSeconds:seconds,randomDraws:draws,
    });
    assert.equal(result.code,'COMMITTED',JSON.stringify(result.details));
    assert.equal(result.world.revision,rev+1);
    assert.deepEqual([0,9,39,78].map(i=>result.world.market.wholesale[i]),want.stocks);
    assert.equal(result.world.market.originalWholesaleCsv,want.wireCsv);
    assert.deepEqual(result.world.market.sparseWrittenSlots,want.definedIndices);
    assert.equal(result.details.drawsUsed,want.randomDrawsUsed);
  }
});
test('B-36 independently marked artificial positive starting stock tests minus PLUS',()=>{
  const {repo}=ready();
  const w=repo.read();
  const synthetic={...w,market:{...w.market,
    wholesale:w.market.wholesale.map((v,i)=>i===0?20:i===39?10:v),
    sparseWrittenSlots:[0,39],
    originalWholesaleCsv:Array.from({length:40},
      (_,i)=>i===0?'20':i===39?'10':'').join(','),
  }};
  assert.equal(validateSourceSparseMarket(synthetic.market),true);
  const result=module.apply({world:synthetic,command:input(2)});
  assert.deepEqual([0,9,39,78].map(i=>result.market.wholesale[i]),actual.seeded.stocks);
  assert.equal(result.market.originalWholesaleCsv,actual.seeded.wireCsv);
});
test('B-36 invalid timespans, random consumption and CAS revision reject atomically',()=>{
  const {run,repo}=ready(),before=JSON.stringify(repo.read());
  for(const inputCase of [
    [0,[0,0,0,0]],[3601,[0,0,0]],
    [60,[]],[60,[0,0,0]],[60,[0,0,0,0,0]],
    [60,[-1,0,0,0]],[60,[0,0,0,1000000]],
  ]){
    assert.equal(run('reviewed-sparse-multi-plus',2,{
      timespanSeconds:inputCase[0],randomDraws:inputCase[1],
    }).code,'SOURCE_BOUNDARY_REJECTED');
    assert.equal(JSON.stringify(repo.read()),before);
  }
  assert.throws(()=>run('reviewed-sparse-multi-plus',2,{
    timespanSeconds:60,randomDraws:[0,0,0,0.5],
  }),/command non-safe JSON number/);
  assert.equal(JSON.stringify(repo.read()),before);
  assert.equal(run('reviewed-sparse-multi-plus',1,{
    timespanSeconds:60,randomDraws:[0,0,0,0],
  }).code,'REVISION_CONFLICT');
});
test('B-36 unknown fields and uninitialized worlds remain rejected',()=>{
  const world=createMemoryWorld({
    worldId:'uninitialized',streetId:'standard-street',nowSeconds:1000000,
  });
  const repository=createMemoryWorldAdapter(world);
  assert.equal(executeMemoryCommand({repository,streetModule:module,
    command:input(0)}).code,'SOURCE_BOUNDARY_REJECTED');
  const {run}=ready();
  assert.equal(run('reviewed-sparse-multi-plus',2,{
    timespanSeconds:60,randomDraws:[0,0,0,0],unreviewedItemId:2,
  }).code,'SOURCE_BOUNDARY_REJECTED');
});
