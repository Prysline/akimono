import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {createMemoryWorld,createMemoryWorldAdapter,executeMemoryCommand,
  PERIOD_WORLD_SCHEMA} from '../src/game-core-contract.mjs';
import {projectOriginalSparseAllPlus,reviewR4EmptyStreetPlus}
  from '../src/original-sparse-all-plus.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const paths=[
  ['itemDsl','custom/inc-item-data.cgi'],
  ['rebelDsl','custom/inc-rebel-data.cgi'],
  ['originalAdminInitSource','modern/tests/original-perl/core-inc-admin-func.cgi'],
  ['originalDataReadSource','modern/tests/original-perl/inc-func.cgi'],
  ['originalDataWriteSource','modern/tests/original-perl/write.cgi'],
  ['originalTurnSource','modern/tests/original-perl/inc-turn.cgi'],
  ['originalWholeSource','modern/tests/original-perl/whole.cgi'],
  ['originalConfigSource','_config.cgi'],
  ['originalCompilerSource','modern/tests/original-perl/inc-makeitem.cgi'],
];
const source=Object.fromEntries(await Promise.all(paths.map(
  async ([k,p])=>[k,await readFile(path.join(root,p),'utf8')])));
const street=createStandardStreetModule(source);
const oracle=JSON.parse(execFileSync('perl',
  ['original-r4-dynamic-population-plus-probe.pl'],{
    cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8'}));
function opened(){
  const repo=createMemoryWorldAdapter(createMemoryWorld({
    worldId:'r4-pop-plus',streetId:'standard-street',nowSeconds:1000000,
  }));
  const act=(kind,extra={})=>executeMemoryCommand({
    repository:repo,streetModule:street,
    command:{kind,expectedRevision:repo.read().revision,...extra},
  });
  assert.equal(act('initialize-source-market').ok,true);
  assert.equal(act('open-shop',{
    shopId:1,ownerName:'原版店主',shopName:'來源人口測試',
  }).ok,true);
  return repo.read();
}
test('R4 dynamic original population PLUS matches frozen Perl all 79 cells in three cases',()=>{
  const original=opened(),before=JSON.stringify(original);
  assert.equal(oracle.cases.length,3);
  for(const c of oracle.cases){
    // Artificial post-period population is pure test input only. This
    // envelope is NOT committed or represented as a valid settled save.
    const world={...original,schema:PERIOD_WORLD_SCHEMA,
      period:{dtPeople:c.dtPeople}};
    if(c.dtPeople!==500000){
      assert.throws(()=>projectOriginalSparseAllPlus({
        world,reviewed:street.reviewedAllPlus,
        compiled:street.reviewedGiftMapUse,
        timespanSeconds:120,randomDraws:c.consumedSamples,
      }),/post-period population/);
    }
    const result=projectOriginalSparseAllPlus({
      world,reviewed:street.reviewedAllPlus,
      compiled:street.reviewedGiftMapUse,
      timespanSeconds:120,randomDraws:c.consumedSamples,
      r4PeriodPopulation:true,
    });
    assert.deepEqual(result.market.wholesale,c.wholesale,
      'true Perl wholesale stock at population '+c.dtPeople);
    assert.deepEqual(result.market.sparseWrittenSlots,c.definedIndices);
    assert.equal(result.market.originalWholesaleCsv,c.wireCsv);
    assert.equal(result.receipt.drawsUsed,c.drawsUsed);
  }
  assert.equal(JSON.stringify(original),before);
});
test('R4 dynamic PLUS rejects invalid population without touching original source world',()=>{
  const original=opened(),before=JSON.stringify(original);
  for(const pop of [0,-1,1.5,null,Number.MAX_SAFE_INTEGER]){
    assert.throws(()=>projectOriginalSparseAllPlus({
      world:{...original,schema:PERIOD_WORLD_SCHEMA,
        period:{dtPeople:pop}},
      reviewed:street.reviewedAllPlus,
      compiled:street.reviewedGiftMapUse,
      timespanSeconds:120,randomDraws:[],
      r4PeriodPopulation:true,
    }));
  }
  assert.equal(JSON.stringify(original),before);
});

test('R4 empty street PLUS uses zero holdings and original zero-shop coefficient and caps',()=>{
  const reviewed=reviewR4EmptyStreetPlus({
    turnSource:source.originalTurnSource,wholeSource:source.originalWholeSource,
  });
  const original=opened(),before=JSON.stringify(original);
  assert.equal(oracle.emptyCases.length,3);
  for(const c of oracle.emptyCases){
    // Oracle fixture only; not a player save or claimed committed closure.
    const world={...original,shops:[],schema:PERIOD_WORLD_SCHEMA,
      period:{dtPeople:c.dtPeople},market:{...original.market,
        wholesale:[...c.inputWholesale],sparseWrittenSlots:Array.from({length:79},(_,i)=>i),
        originalWholesaleCsv:c.inputWholesale.join(','),sourceWriteShape:'whole-store-79'}};
    const args={world,reviewed:street.reviewedAllPlus,compiled:street.reviewedGiftMapUse,
      timespanSeconds:60,randomDraws:c.consumedSamples,r4PeriodPopulation:true};
    const prior=JSON.stringify(world);
    assert.throws(()=>projectOriginalSparseAllPlus(args),/exactly one shop/);
    assert.throws(()=>projectOriginalSparseAllPlus({...args,r4EmptyStreetReview:{...reviewed}}),/reviewed empty street/);
    assert.throws(()=>projectOriginalSparseAllPlus({...args,r4EmptyStreetReview:reviewed,
      world:{...world,shops:original.shops}}),/reviewed empty street/);
    const result=projectOriginalSparseAllPlus({...args,r4EmptyStreetReview:reviewed});
    assert.deepEqual(result.shops,[]);
    assert.deepEqual(result.market.wholesale,c.wholesale);
    assert.deepEqual(result.market.sparseWrittenSlots,c.definedIndices);
    assert.equal(result.market.originalWholesaleCsv,c.wireCsv);
    assert.equal(result.receipt.drawsUsed,c.drawsUsed);
    assert.equal(JSON.stringify(world),prior);
  }
  assert.equal(JSON.stringify(original),before);
});
