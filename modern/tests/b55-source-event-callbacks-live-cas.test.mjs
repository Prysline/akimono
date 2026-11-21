import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path,{join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {createMemoryWorldAdapter,createPeriodMemoryWorld,
  executeMemoryCommand,applyGameCommand} from '../src/game-core-contract.mjs';
import {reviewOriginalPeriodBootstrap,createOriginalPeriodSeed}
  from '../src/original-period-world-seed.mjs';
import {createLocalWorldSaveStore} from '../src/local-world-save-store.mjs';
import {reviewOriginalInstantEventCallbacks,
  projectOriginalInstantEventCallback,B55_SOURCE}
  from '../src/original-instant-event-callbacks.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFile(join(root,p),'utf8');
const names=[
  'itemDsl','rebelDsl','originalAdminInitSource','originalDataReadSource',
  'originalDataWriteSource','originalTurnSource','originalWholeSource',
  'originalConfigSource','originalCompilerSource',
  'originalBuySource','originalBuyItemSource','originalBuyCalcSource',
  'originalMarketSource','originalItemSource','originalDetailSource',
  'originalPeriodSource',
];
const paths=[
  'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
  'modern/tests/original-perl/core-inc-admin-func.cgi',
  'modern/tests/original-perl/inc-func.cgi',
  'modern/tests/original-perl/write.cgi',
  'modern/tests/original-perl/inc-turn.cgi',
  'modern/tests/original-perl/whole.cgi','_config.cgi',
  'modern/tests/original-perl/inc-makeitem.cgi',
  'modern/tests/original-perl/buy-s.cgi',
  'modern/tests/original-perl/item.cgi',
  'modern/tests/original-perl/calc.cgi',
  'modern/tests/original-perl/market.cgi',
  'modern/tests/original-perl/item.cgi',
  'modern/tests/original-perl/core-detail.cgi',
  'modern/tests/original-perl/period.cgi',
];
const texts=await Promise.all(paths.map(read));
const source=Object.fromEntries(names.map((name,i)=>[name,texts[i]]));
const street=createStandardStreetModule(source);
const oracle=JSON.parse(execFileSync('perl',[
  'original-b55-instant-event-callback-probe.pl',
],{cwd:join(root,'modern/tests/original-perl'),encoding:'utf8'}));
const contract=reviewOriginalInstantEventCallbacks({
  itemDsl:source.itemDsl,turnSource:source.originalTurnSource,
  compilerSource:source.originalCompilerSource,
  compiledCatalog:street.reviewedEventCatalog,
});
test('B-55 real Perl STARTFUNC manbiki and goutou returns EXACT item/rank/log/draws against Node',()=>{
  assert.equal(contract.source,B55_SOURCE);
  assert.equal(contract.eventGateIncluded,false);
  assert.equal(contract.periodCommittable,false);
  assert.ok(street.capabilities.includes('reviewed-instant-event-callback-fixture'));
  assert.equal(oracle.cases.length,10);
  for(const row of oracle.cases){
    const original=structuredClone(row.input.shop);
    const result=projectOriginalInstantEventCallback({
      reviewed:contract,shop:original,
      eventCode:row.input.eventCode,randomDraws:row.input.randomDraws,
    });
    assert.deepEqual(result.shop.item,row.output.item,row.name+' exact 79 stock slots');
    assert.equal(result.shop.rank,row.output.rank,row.name+' rank');
    assert.equal(result.shop.money,row.output.money,row.name+' cash unchanged');
    assert.equal(result.returnCode,row.output.returnCode,row.name+' original ret=0');
    assert.equal(result.message,row.output.message,row.name+' source log with bounded format stub');
    assert.equal(result.randomDrawsUsed,row.output.randomDrawsUsed,row.name+' RNG');
    assert.equal(result.eventPersisted,false,'false source callback return never invents active event');
    assert.deepEqual(original,row.input.shop,'no source input mutation');
  }
});
test('B-55 callback source drift, unreviewed item and missing/unused RNG all reject',()=>{
  for(const broken of [
    {itemDsl:source.itemDsl.replace(
      'my $cnt=int($DT->{item}[$itemno-1]/10);',
      'my $cnt=int($DT->{item}[$itemno-1]/4);')},
    {itemDsl:source.itemDsl.replace(
      'startfunc\t_local_(400,200)','startfunc\t_local_(400,100)')},
    {turnSource:source.originalTurnSource.replace(
      '($ret,$msg)=&$func(split(/[:,]/,$E->{startfuncparam}));',
      '($ret,$msg)=0;')},
  ])assert.throws(()=>reviewOriginalInstantEventCallbacks({
    itemDsl:source.itemDsl,turnSource:source.originalTurnSource,
    compilerSource:source.originalCompilerSource,
    compiledCatalog:street.reviewedEventCatalog,...broken,
  }),/B-55/);
  const shop=oracle.cases[1].input.shop;
  for(const attempt of [
    {eventCode:'happy'},
    {randomDraws:[]},
    {randomDraws:[0,0]},
    {randomDraws:[-1]},
    {shop:{...shop,item:[1]}},
    {shop:{...shop,showcase:[2]}},
  ])assert.throws(()=>projectOriginalInstantEventCallback({
    reviewed:contract,shop,eventCode:'manbiki',randomDraws:[0],...attempt,
  }),/B-55/);
});
test('B-55 original robbery callback changes a REAL purchased source shop through GameCore CAS, B-43 durable save/reload and later selling',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'akimono-b55-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const reviewedSeed=reviewOriginalPeriodBootstrap({
    periodSource:source.originalPeriodSource,
    adminSource:source.originalAdminInitSource,
    readSource:source.originalDataReadSource,
    writeSource:source.originalDataWriteSource,
    reviewedB41:street.reviewedB41,
  });
  const repo=createMemoryWorldAdapter(createPeriodMemoryWorld({
    worldId:'b55-real-callback-cas-world',streetId:'standard-street',
    nowSeconds:1000000,period:createOriginalPeriodSeed(reviewedSeed),
  }));
  const act=(kind,extra={})=>executeMemoryCommand({repository:repo,streetModule:street,
    command:{kind,expectedRevision:repo.read().revision,...extra}});
  assert.ok(act('initialize-source-market').ok);
  assert.ok(act('open-shop',{
    shopId:1,ownerName:'原版測試店主',shopName:'真實回呼測試商店',
  }).ok);
  const plusOracle=JSON.parse(execFileSync('perl',[
    'original-market-buy10-probe.pl',
  ],{cwd:join(root,'modern/tests/original-perl'),encoding:'utf8'})).supply;
  assert.ok(act('reviewed-sparse-all-plus',{
    timespanSeconds:60,randomDraws:plusOracle.draws,
  }).ok);
  const buy=()=>{
    const offer=street.quoteMarketItem10(repo.read());
    const r=act('buy-market-item-10',{
      shopId:1,requestedCount:1,marketShelf:offer.shelf,
      expectedPrice:offer.price,
    });
    assert.ok(r.ok,JSON.stringify(r.details));return r;
  };
  buy();
  assert.ok(act('edit-showcase',{
    shopId:1,shelf:0,itemId:10,per:100,priceOverride:5000,
  }).ok);
  const saleOracle=JSON.parse(execFileSync('perl',[
    'original-b41-real-sale-probe.pl',
  ],{cwd:join(root,'modern/tests/original-perl'),encoding:'utf8'}));
  const sold=act('advance-source-time',{
    shopId:1,minutes:30,randomDraws:saleOracle.sale30.consumedSamples,
  });
  assert.ok(sold.ok,JSON.stringify(sold.details));
  assert.equal(repo.read().period.eventState,null,'other EVENT callbacks unknown');
  buy();
  const before=repo.read(),oldRank=before.shops[0].rank;
  const applied=act('reviewed-instant-event-callback-fixture',{
    eventCode:'goutou',randomDraws:[0],
  });
  assert.ok(applied.ok,JSON.stringify(applied.details));
  assert.equal(applied.details.naturalEventTriggered,false,
    'callback-only test cannot pretend original natural start gate ran');
  assert.equal(applied.world.shops[0].rank,oldRank-Math.trunc(oldRank/5));
  assert.equal(applied.world.shops[0].item[9],1,
    'one original #10 stock cannot be stolen by floor(stock/4)');
  assert.equal(applied.world.period.eventState,null,
    'no invented original EVENT timer or state');
  const failed=act('reviewed-instant-event-callback-fixture',{
    eventCode:'goutou',randomDraws:[0,900000],
  });
  assert.equal(failed.ok,false,'unused source RNG rejects whole command');
  assert.deepEqual(repo.read(),applied.world,'invalid callback does not commit');
  const store=createLocalWorldSaveStore({directory});
  const saved=store.save(repo.read(),{expectedGeneration:0});
  assert.equal(saved.generation,1);
  const restored=store.load();
  assert.deepEqual(restored.world,repo.read(),'full genuine callback CAS world persists');
  const resumed=createMemoryWorldAdapter(restored.world);
  // The next sale remains stochastic. Feed bounded, explicit SOURCE
  // samples that exercise the source sale branch (not a guarantee that
  // production's B-54 replay stream always sells within 30 minutes).
  const stream=[500000,...Array(120).fill(0)];
  let next=null;
  for(let n=59;n<=121;n++){
    const command={kind:'advance-source-time',
      expectedRevision:restored.world.revision,shopId:1,minutes:30,
      randomDraws:stream.slice(0,n)};
    const probe=applyGameCommand({world:restored.world,
      streetModule:street,command});
    if(probe.ok){
      next=executeMemoryCommand({repository:resumed,streetModule:street,
        command});
      break;
    }
    assert.equal(probe.code,'SOURCE_BOUNDARY_REJECTED');
    assert.match(probe.details.reason,
      /missing natural\/PLUS source draw|missing original random draw|unused source random samples/,
      'only source shared draw-prefix mismatch can be retried');
  }
  assert.ok(next?.ok,JSON.stringify(next?.details));
  assert.equal(next.world.shops[0].item[9],0,
    'after source robbery the player can still naturally sell real #10');
  assert.equal(next.world.period.eventState,null);
});
