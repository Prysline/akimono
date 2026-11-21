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
import {NAYUTA_FUNCTURN_SOURCE,projectNayutaCallbackOnly}
  from '../src/original-nayuta-functurn.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFile(path.join(root,p),'utf8');
const [itemDsl,rebelDsl,originalAdminInitSource,originalDataReadSource,
  originalDataWriteSource,originalTurnSource,originalWholeSource,
  originalConfigSource,originalCompilerSource,originalMarketSource,
  originalItemSource,originalDetailSource]=await Promise.all([
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
const sources={itemDsl,rebelDsl,originalAdminInitSource,
  originalDataReadSource,originalDataWriteSource,originalTurnSource,
  originalWholeSource,originalConfigSource,originalCompilerSource,
  originalMarketSource,originalItemSource,originalDetailSource};
const street=createStandardStreetModule(sources);
const original=JSON.parse(execFileSync('perl',['original-nayuta-functurn-probe.pl'],{
  cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
}));
function fresh(){
  const repository=createMemoryWorldAdapter(createMemoryWorld({
    worldId:'b39-nayuta-source',streetId:'standard-street',nowSeconds:1000000,
  }));
  const call=(kind,expectedRevision,more={})=>executeMemoryCommand({
    repository,streetModule:street,command:{kind,expectedRevision,...more},
  });
  assert.equal(call('initialize-source-market',0).code,'COMMITTED');
  assert.equal(call('open-shop',1,{
    shopId:42,ownerName:'B39來源店主',shopName:'B39來源新店',
  }).code,'COMMITTED');
  return {repository,call};
}
function withArtificallyStockedNayuta(world){
  return {...world,shops:world.shops.map(s=>({
    ...s,item:s.item.map((v,i)=>i===69?1:v),
    showcase:[70],price:[50000],
  }))};
}
function executeOn(world,draws,extra={}){
  const repository=createMemoryWorldAdapter(world);
  const result=executeMemoryCommand({repository,streetModule:street,
    command:{kind:'reviewed-nayuta-functurn',expectedRevision:2,
      randomDraws:draws,...extra},
  });
  return {repository,result};
}
test('B-39 true ITEM #70 FUNCTURN is the only reviewed item callback',()=>{
  assert.ok(street.capabilities.includes('reviewed-nayuta-functurn'));
  assert.equal(street.reviewedNayuta.source,NAYUTA_FUNCTURN_SOURCE);
  assert.equal(street.reviewedNayuta.itemId,70);
  assert.equal(street.reviewedNayuta.timespanSeconds,8640);
  assert.equal(street.reviewedNayuta.callbackRankUnits,100);
  assert.equal(street.reviewedNayuta.point,20000);
  const legacy=createStandardStreetModule({...sources,
    originalMarketSource:null,originalItemSource:null,
    originalDetailSource:null});
  assert.ok(!legacy.capabilities.includes('reviewed-nayuta-functurn'));
  assert.ok(legacy.capabilities.includes('reviewed-sparse-all-plus'));
});
test('B-39 original ITEM #70 and original FUNCTURN dispatch are source-pinned',()=>{
  assert.throws(()=>createStandardStreetModule({...sources,
    itemDsl:itemDsl.replace('funct\t_local_','funct\tanother_sub'),
  }),/FUNCT|callback|source/);
  assert.throws(()=>createStandardStreetModule({...sources,
    itemDsl:itemDsl.replace('$TIMESPAN/86.4','$TIMESPAN/100'),
  }),/code drift|source/);
  assert.throws(()=>createStandardStreetModule({...sources,
    originalTurnSource:originalTurnSource.replace(
      'my @itemt=sort {$a->{no}<=>$b->{no}} grep($_->{functurn},@ITEM);',
      'my @itemt=();'),
  }),/code drift/);
  assert.throws(()=>createStandardStreetModule({...sources,
    originalCompilerSource:originalCompilerSource.replace(
      'sub GetLocalFunction','sub AlteredLocalFunction'),
  }),/code drift/);
});
test('B-39 true original new shop callback no stock: Perl/Node parity at 8640s',()=>{
  const {repository,call}=fresh(),p=original.empty;
  const response=call('reviewed-nayuta-functurn',2,{
    randomDraws:p.consumedSamples,
  });
  assert.equal(response.code,'COMMITTED',JSON.stringify(response.details));
  assert.equal(response.world.revision,3);
  assert.equal(response.world.nowSeconds,1000000);
  const shop=response.world.shops[0],rc=response.details;
  assert.equal(shop.rank,p.rank);
  assert.equal(shop.temprank,p.temprank);
  assert.equal(shop.money,p.money);
  assert.equal(shop.trush,p.trush);
  assert.equal(shop.costtoday,p.costtoday);
  assert.equal(rc.saleCount,p.saleCount);
  assert.equal(rc.drawsUsed,p.randomDrawsUsed);
  assert.equal(rc.naturalDrawsUsed,0);
  assert.equal(rc.callback.invokedByOriginalLoop,true);
  assert.equal(rc.callback.matchingShops,0);
  assert.equal(rc.callback.rankIncrease,0);
  assert.deepEqual(rc.callback.debugMessages,p.callbackLog);
  assert.deepEqual(response.world.market.wholesale,p.numericWholesale);
  assert.deepEqual(response.world.market.sparseWrittenSlots,p.definedIndices);
  assert.equal(response.world.market.originalWholesaleCsv,p.originalWholesaleCsv);
  assert.ok(validateSourceSparseMarket(response.world.market));
  assert.equal(repository.read().revision,3);
});
test('B-39 artificially held ITEM #70: source real FUNCTURN boosts rank before 59 PLUS',()=>{
  const {repository}=fresh(),p=original.displayed;
  const world=withArtificallyStockedNayuta(repository.read());
  const {repository:repo,result:r}=executeOn(world,p.consumedSamples);
  assert.equal(r.code,'COMMITTED',JSON.stringify(r.details));
  assert.equal(r.world.revision,3);
  assert.equal(r.world.nowSeconds,1000000);
  const sh=r.world.shops[0],rc=r.details;
  assert.equal(sh.item[69],p.item70);
  assert.equal(sh.rank,p.rank);
  assert.equal(sh.temprank,p.temprank);
  assert.equal(sh.money,p.money);
  assert.equal(sh.trush,p.trush);
  assert.equal(sh.costtoday,p.costtoday);
  assert.equal(sh.saletoday,p.saletoday);
  assert.equal(sh.taxtoday,p.taxtoday);
  assert.equal(rc.saleCount,0);
  assert.equal(rc.naturalDrawsUsed,1);
  assert.equal(rc.drawsUsed,p.randomDrawsUsed);
  assert.equal(rc.callback.itemId,70);
  assert.equal(rc.callback.matchingShops,1);
  assert.equal(rc.callback.rankIncrease,100);
  assert.deepEqual(rc.callback.debugMessages,p.callbackLog);
  assert.deepEqual(r.world.market.wholesale,p.numericWholesale);
  assert.deepEqual(r.world.market.sparseWrittenSlots,p.definedIndices);
  assert.equal(r.world.market.originalWholesaleCsv,p.originalWholesaleCsv);
  assert.equal(r.world.market.wholesale[69],0);
  assert.equal(r.world.market.sparseWrittenSlots.length,61);
  assert.ok(validateSourceSparseMarket(r.world.market));
  assert.equal(repo.read().revision,3);
});
test('B-39 direct original INLINE callback branch: <1 RNG, expensive shelf and rank cap',()=>{
  const q=street.reviewedNayuta;
  const cases=[
    [original.fractionYes,60,[0],70,50000,5010],
    [original.fractionNo,60,[999999],70,50000,5010],
    [original.abovePrice,8640,[],70,50001,5010],
    [original.rankCapped,8640,[],70,50000,9980],
  ];
  for(const [want,seconds,draws,shelf,price,rank] of cases){
    const got=projectNayutaCallbackOnly({
      reviewed:q,timespanSeconds:seconds,randomDraws:draws,
      showcaseItemId:shelf,listedPrice:price,rank,
      shopName:'單獨回呼測資',
    });
    assert.equal(got.rank,want.rank);
    assert.equal(got.drawsUsed,want.drawsUsed);
    assert.deepEqual(got.debugMessages,want.callbackLog);
  }
});
test('B-39 B-37 public bound remains 3600; 8640 only internal verified path',()=>{
  const {call,repository}=fresh();
  const start=JSON.stringify(repository.read());
  assert.equal(call('reviewed-sparse-all-plus',2,{
    timespanSeconds:8640,randomDraws:original.empty.consumedSamples,
  }).code,'SOURCE_BOUNDARY_REJECTED');
  assert.equal(JSON.stringify(repository.read()),start);
});
test('B-39 missing, extra, out-of-range random samples or forged input fail CAS',()=>{
  const {repository,call}=fresh(),before=JSON.stringify(repository.read());
  for(const draws of [
    [],original.empty.consumedSamples.slice(0,-1),
    [...original.empty.consumedSamples,0],[-1],Array(120).fill(1000000),
  ]){
    assert.equal(call('reviewed-nayuta-functurn',2,{
      randomDraws:draws,
    }).code,'SOURCE_BOUNDARY_REJECTED');
    assert.equal(JSON.stringify(repository.read()),before);
  }
  assert.equal(call('reviewed-nayuta-functurn',1,{
    randomDraws:original.empty.consumedSamples,
  }).code,'REVISION_CONFLICT');
  assert.equal(call('reviewed-nayuta-functurn',2,{
    randomDraws:original.empty.consumedSamples,notInOriginal:true,
  }).code,'SOURCE_BOUNDARY_REJECTED');
  assert.equal(JSON.stringify(repository.read()),before);
});
test('B-39 rejects fabricated stock, price override or full-sale draw without commit',()=>{
  const {repository}=fresh();
  const real=repository.read();
  const withStock=withArtificallyStockedNayuta(real);
  for(const w of [
    {...real,shops:[{...real.shops[0],item:real.shops[0].item.map(
      (v,i)=>i===69?1:v)}]},
    {...withStock,shops:[{...withStock.shops[0],price:[50001]}]},
    {...withStock,shops:[{...withStock.shops[0],money:99999}]},
  ]){
    const res=executeOn(w,original.displayed.consumedSamples);
    assert.equal(res.result.code,'SOURCE_BOUNDARY_REJECTED');
    assert.equal(JSON.stringify(res.repository.read()),JSON.stringify(w));
  }
  const a=executeOn(withStock,[
    500000,...original.displayed.consumedSamples.slice(1),
  ]);
  assert.equal(a.result.code,'SOURCE_BOUNDARY_REJECTED');
  assert.equal(JSON.stringify(a.repository.read()),JSON.stringify(withStock));
});
