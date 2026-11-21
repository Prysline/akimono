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
import {NATURAL_PLUS_SOURCE} from '../src/original-natural-sale-plus.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFile(path.join(root,p),'utf8');
const [itemDsl,rebelDsl,admin,readSource,writeSource,turn,whole,config,
  compiler,marketSource,itemSource,detailSource]=await Promise.all([
    'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
    'modern/tests/original-perl/core-inc-admin-func.cgi',
    'modern/tests/original-perl/inc-func.cgi',
    'modern/tests/original-perl/write.cgi',
    'modern/tests/original-perl/inc-turn.cgi',
    'modern/tests/original-perl/whole.cgi','_config.cgi',
    'modern/tests/original-perl/inc-makeitem.cgi',
    'modern/tests/original-perl/market.cgi',
    'modern/tests/original-perl/item.cgi',
    'modern/tests/original-perl/core-detail.cgi',
  ].map(read));
const settings={itemDsl,rebelDsl,originalAdminInitSource:admin,
  originalDataReadSource:readSource,originalDataWriteSource:writeSource,
  originalTurnSource:turn,originalWholeSource:whole,originalConfigSource:config,
  originalCompilerSource:compiler,originalMarketSource:marketSource,
  originalItemSource:itemSource,originalDetailSource:detailSource,
};
const street=createStandardStreetModule(settings);
const perl=JSON.parse(execFileSync('perl',['original-natural-sale-plus-probe.pl'],{
  cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
}));
function newWorld(){
  const repository=createMemoryWorldAdapter(createMemoryWorld({
    worldId:'b38-natural-plus',streetId:'standard-street',nowSeconds:1000000,
  }));
  const exec=(kind,expectedRevision,data={})=>executeMemoryCommand({
    repository,streetModule:street,command:{kind,expectedRevision,...data},
  });
  assert.equal(exec('initialize-source-market',0).code,'COMMITTED');
  assert.equal(exec('open-shop',1,{
    shopId:42,ownerName:'B38原版店主',shopName:'B38標準街測試店',
  }).code,'COMMITTED');
  return {repository,exec};
}
function artificial(original){
  const shop=original.shops[0];
  return {...original,shops:[{
    ...shop,
    showcase:[10],price:[5000],
    item:shop.item.map((count,i)=>i===9?1:count),
  }]};
}
function resultFrom(world,draws){
  const repo=createMemoryWorldAdapter(world);
  return {
    repo,
    response:executeMemoryCommand({repository:repo,streetModule:street,
      command:{kind:'reviewed-natural-sale-plus',expectedRevision:2,
        randomDraws:draws},
    }),
  };
}
test('B-38 exact source-gated natural region + all-plus capability',()=>{
  assert.equal(street.reviewedNaturalPlus.source,NATURAL_PLUS_SOURCE);
  assert.ok(street.capabilities.includes('reviewed-natural-sale-plus'));
  assert.equal(street.reviewedNaturalPlus.timespanSeconds,1728);
  assert.equal(street.reviewedNaturalPlus.saleItemId,10);
  const legacy=createStandardStreetModule({
    ...settings,originalMarketSource:null,
    originalItemSource:null,originalDetailSource:null,
  });
  assert.ok(!legacy.capabilities.includes('reviewed-natural-sale-plus'));
  assert.ok(legacy.capabilities.includes('reviewed-sparse-all-plus'));
});
test('B-38 source drift rejected before exposing original natural sale',()=>{
  assert.throws(()=>createStandardStreetModule({...settings,
    originalMarketSource:marketSource.replace('sub GetMarketStatus','sub FakeMarket'),
  }),/source drift/);
  assert.throws(()=>createStandardStreetModule({...settings,
    originalDetailSource:detailSource.replace('sub GetUserTaxRate','sub FakeTax'),
  }),/source drift/);
  assert.throws(()=>createStandardStreetModule({...settings,
    originalTurnSource:turn.replace('GetMarketStatus();','GetNewMarketStatus();'),
  }),/source drift/);
  assert.throws(()=>createStandardStreetModule({...settings,
    originalItemSource:itemSource.replace('sub GetSaleTax','sub FakeSaleTax'),
  }),/source drift/);
  assert.throws(()=>createStandardStreetModule({...settings,
    originalMarketSource:null,
  }),/incomplete.*source/);
});
test('B-38 source REAL empty-showcase new shop decays rank then full all-plus',()=>{
  const {repository,exec}=newWorld();
  const original=perl.sourceIdle;
  const res=exec('reviewed-natural-sale-plus',2,{
    randomDraws:original.consumedSamples,
  });
  assert.equal(res.code,'COMMITTED',JSON.stringify(res.details));
  assert.equal(res.world.revision,3);
  assert.equal(res.world.nowSeconds,1000000);
  assert.equal(res.details.natural.saleCount,0);
  assert.equal(res.details.natural.drawsUsed,0);
  assert.equal(res.details.drawsUsed,original.randomDrawsUsed);
  assert.equal(res.world.shops[0].money,original.money);
  assert.equal(res.world.shops[0].rank,original.rank);
  assert.equal(res.world.shops[0].temprank,original.temprank);
  assert.equal(res.world.shops[0].costtoday,original.costtoday);
  assert.equal(res.world.shops[0].trush,original.trush);
  assert.equal(res.world.market.originalWholesaleCsv,original.originalWholesaleCsv);
  assert.deepEqual(res.world.market.wholesale,original.numericWholesale);
  assert.deepEqual(res.world.market.sparseWrittenSlots,original.definedIndices);
  assert.ok(validateSourceSparseMarket(res.world.market));
  assert.equal(repository.read().revision,3);
});
test('B-38 explicit artificial #10 stock: original sale, tax, rank, global RNG before PLUS',()=>{
  const {repository}=newWorld();
  const {repo,response:res}=resultFrom(
    artificial(repository.read()),perl.sourceSale.consumedSamples);
  const source=perl.sourceSale;
  assert.equal(res.code,'COMMITTED',JSON.stringify({
    reason:res.details,sourceDraws:source.randomDrawsUsed,
    sampleCount:source.consumedSamples.length,
    samplePrefix:source.consumedSamples.slice(0,14),
    sourceSaleCount:source.saleCount,sourceRank:source.rank,
  }));
  assert.equal(res.world.revision,3);
  assert.equal(res.world.nowSeconds,1000000);
  assert.equal(res.details.natural.saleScope,undefined);
  assert.equal(res.details.natural.saleCount,source.saleCount);
  assert.equal(res.details.natural.drawsUsed,3);
  assert.equal(res.details.drawsUsed,source.randomDrawsUsed);
  assert.equal(res.world.shops[0].item[9],source.item10);
  assert.equal(res.world.shops[0].money,source.money);
  assert.equal(res.world.shops[0].trush,source.trush);
  assert.equal(res.world.shops[0].saletoday,source.saletoday);
  assert.equal(res.world.shops[0].taxtoday,source.taxtoday);
  assert.equal(res.world.shops[0].costtoday,source.costtoday);
  assert.equal(res.world.shops[0].rank,source.rank);
  assert.equal(res.world.shops[0].temprank,source.temprank);
  assert.equal(res.world.shops[0].itemtoday[10],source.saleCount);
  assert.equal(res.world.shops[0]._sale_count_[10].count,source.saleCountRecord);
  assert.equal(res.world.shops[0]._sale_count_[10].price,source.salePriceRecord);
  assert.deepEqual(res.world.market.wholesale,source.numericWholesale);
  assert.deepEqual(res.world.market.sparseWrittenSlots,source.definedIndices);
  assert.equal(res.world.market.originalWholesaleCsv,source.originalWholesaleCsv);
  assert.ok(validateSourceSparseMarket(res.world.market));
  assert.equal(repo.read().revision,3);
});
test('B-38 consumed natural RNG matters: wrong prefix rejected without commit',()=>{
  const {repository}=newWorld();
  const w=artificial(repository.read());
  const {repo,response:r}=resultFrom(w,[...perl.sourceSale.consumedSamples.slice(1)]);
  assert.equal(r.code,'SOURCE_BOUNDARY_REJECTED');
  assert.equal(JSON.stringify(repo.read()),JSON.stringify(w));
});
test('B-38 invalid random stream and unauthorized shop data are fail-closed',()=>{
  const {repository,exec}=newWorld();
  const old=JSON.stringify(repository.read());
  for(const samples of [
    [],perl.sourceIdle.consumedSamples.slice(0,-1),
    [...perl.sourceIdle.consumedSamples,0],
    [-1],Array(122).fill(0),
  ]){
    assert.equal(exec('reviewed-natural-sale-plus',2,{
      randomDraws:samples,
    }).code,'SOURCE_BOUNDARY_REJECTED');
    assert.equal(JSON.stringify(repository.read()),old);
  }
  assert.equal(exec('reviewed-natural-sale-plus',1,{
    randomDraws:perl.sourceIdle.consumedSamples,
  }).code,'REVISION_CONFLICT');
  assert.equal(exec('reviewed-natural-sale-plus',2,{
    randomDraws:perl.sourceIdle.consumedSamples,skippedTax:true,
  }).code,'SOURCE_BOUNDARY_REJECTED');
  assert.equal(JSON.stringify(repository.read()),old);
});
test('B-38 naturally sold #10 must be explicit synthetic shop fixture not inferred acquisition',()=>{
  const {repository}=newWorld();
  const world=repository.read();
  const bad={...world,shops:[{
    ...world.shops[0],showcase:[10],price:[5000],
  }]};
  assert.equal(resultFrom(bad,perl.sourceSale.consumedSamples).response.code,
    'SOURCE_BOUNDARY_REJECTED');
});
