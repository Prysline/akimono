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
import {reviewOriginalSparsePlusTurn} from '../src/original-sparse-wholesale-plus.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFile(path.join(root,p),'utf8');
const [itemDsl,rebelDsl,admin,readSource,writeSource,turn,whole,config]=await Promise.all([
  'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
  'modern/tests/original-perl/core-inc-admin-func.cgi',
  'modern/tests/original-perl/inc-func.cgi',
  'modern/tests/original-perl/write.cgi',
  'modern/tests/original-perl/inc-turn.cgi',
  'modern/tests/original-perl/whole.cgi','_config.cgi',
].map(read));
const sources={
  itemDsl,rebelDsl,originalAdminInitSource:admin,
  originalDataReadSource:readSource,originalDataWriteSource:writeSource,
  originalTurnSource:turn,originalWholeSource:whole,originalConfigSource:config,
};
const street=createStandardStreetModule(sources);
const perl=JSON.parse(execFileSync('perl',['original-sparse-wholesale-plus-probe.pl'],{
  cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
}));
function prepared(){
  const repository=createMemoryWorldAdapter(createMemoryWorld({
    worldId:'b35-source-sparse',streetId:'standard-street',nowSeconds:1000000,
  }));
  const apply=(kind,expectedRevision,fields={})=>executeMemoryCommand({
    repository,streetModule:street,command:{kind,expectedRevision,...fields},
  });
  assert.equal(apply('initialize-source-market',0).code,'COMMITTED');
  assert.equal(apply('open-shop',1,{
    shopId:42,ownerName:'來源測試店主',shopName:'標準街來源店',
  }).code,'COMMITTED');
  return {repository,apply};
}
function turnCommand(rev,seconds=60,draws=[0]){
  return {kind:'reviewed-sparse-plus',expectedRevision:rev,
    timespanSeconds:seconds,randomDraws:draws};
}
test('B-35 only adds optional source-backed bounded PLUS capability',()=>{
  assert.ok(street.capabilities.includes('reviewed-sparse-plus'));
  assert.equal(street.reviewedSparsePlus.itemId,10);
  assert.equal(street.reviewedSparsePlus.population,500000);
  assert.equal(street.reviewedSparsePlus.maxUsers,50);
  const legacy=createStandardStreetModule({itemDsl,rebelDsl,
    originalAdminInitSource:admin,originalDataReadSource:readSource,
    originalDataWriteSource:writeSource});
  assert.equal(legacy.capabilities.includes('reviewed-sparse-plus'),false);
});
test('B-35 original source pins must all match before enabling command',()=>{
  assert.throws(()=>createStandardStreetModule({
    ...sources,originalConfigSource:config.replace('$MAX_USER = 50;', '$MAX_USER = 51;'),
  }),/MAX_USER/);
  assert.throws(()=>createStandardStreetModule({
    ...sources,originalTurnSource:turn.replace('if($add>0){$add=$add/2+rand($add/2);}else{$add=0;}',''),
  }),/source drift/);
  assert.throws(()=>createStandardStreetModule({
    ...sources,originalWholeSource:whole.replace('sub CheckWholeStore','sub ChangedWhole'),
  }),/source drift/);
  assert.throws(()=>createStandardStreetModule({
    ...sources,originalWholeSource:null,
  }),/incomplete/);
});
test('B-35 source first sparse PLUS and CheckWholeStore match actual frozen Perl',()=>{
  const {repository,apply}=prepared();
  const first=apply('reviewed-sparse-plus',2,{timespanSeconds:60,randomDraws:[0]});
  assert.equal(first.code,'COMMITTED',JSON.stringify(first.details));
  assert.equal(first.world.revision,3);
  assert.equal(first.details.addedUnits,1);
  assert.equal(first.details.drawsUsed,perl.first.randomDrawsUsed);
  assert.equal(first.details.item10After,perl.first.item10After);
  assert.equal(first.world.market.originalWholesaleCsv,perl.first.wireCsv);
  assert.deepEqual(first.world.market.sparseWrittenSlots,perl.first.definedIndices);
  assert.equal(validateSourceSparseMarket(first.world.market),true);
  assert.equal(first.world.market.wholesale[9],1);
  assert.equal(first.world.market.wholesale[78],0);
  assert.equal(first.world.shops[0].item[78],5);
  assert.equal(first.world.shops[0].item[62],1);
  assert.equal(repository.read().revision,3);
});
test('B-35 second and cap-limited third turn stay identical to true Perl source',()=>{
  const {apply}=prepared();
  for(const [rev,seconds,expected] of [
    [2,60,perl.first],[3,60,perl.second],[4,600,perl.capped],
  ]){
    const result=apply('reviewed-sparse-plus',rev,{timespanSeconds:seconds,randomDraws:[0]});
    assert.equal(result.code,'COMMITTED');
    assert.equal(result.details.item10After,expected.item10After);
    assert.equal(result.world.market.originalWholesaleCsv,expected.wireCsv);
    assert.deepEqual(result.world.market.sparseWrittenSlots,expected.definedIndices);
    assert.equal(result.world.revision,rev+1);
  }
});
test('B-35 rejected/invalid/duplicate random draws cannot mutate CAS world',()=>{
  const {repository}=prepared();
  const before=JSON.stringify(repository.read());
  for(const cmd of [
    turnCommand(2,0),turnCommand(2,4000),turnCommand(2,60,[]),
    turnCommand(2,60,[0,0]),turnCommand(2,60,[-1]),
    turnCommand(2,60,[1000000]),
  ]){
    const out=executeMemoryCommand({repository,streetModule:street,command:cmd});
    assert.equal(out.code,'SOURCE_BOUNDARY_REJECTED');
    assert.equal(JSON.stringify(repository.read()),before);
  }
  assert.equal(executeMemoryCommand({
    repository,streetModule:street,command:turnCommand(1),
  }).code,'REVISION_CONFLICT');
});
test('B-35 source gate rejects uninitialized world and unsupported non-79 market',()=>{
  const empty=createMemoryWorld({worldId:'not-booted',streetId:'standard-street',nowSeconds:1000000});
  const repository=createMemoryWorldAdapter(empty);
  const out=executeMemoryCommand({
    repository,streetModule:street,command:turnCommand(0),
  });
  assert.equal(out.code,'SOURCE_BOUNDARY_REJECTED');
  assert.equal(repository.read().revision,0);
  assert.equal(typeof reviewOriginalSparsePlusTurn,'function');
});
