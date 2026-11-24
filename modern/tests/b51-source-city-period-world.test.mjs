import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  createPeriodMemoryWorld,createMemoryWorld,
  createMemoryWorldAdapter,executeMemoryCommand,
  applyGameCommand,PERIOD_WORLD_SCHEMA,MEMORY_WORLD_SCHEMA,
  validateMemoryWorld,encodeMemorySnapshot,
} from '../src/game-core-contract.mjs';
import {createLocalWorldSaveStore} from './support/legacy-world-save-store.mjs';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {
  reviewOriginalPeriodBootstrap,createOriginalPeriodSeed,
  validateOriginalPeriodSeed,SOURCE_PERIOD_SEED,
} from '../src/original-period-world-seed.mjs';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
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
const keys=[
  'itemDsl','rebelDsl','originalAdminInitSource','originalDataReadSource',
  'originalDataWriteSource','originalTurnSource','originalWholeSource',
  'originalConfigSource','originalCompilerSource','originalBuySource',
  'originalBuyItemSource','originalBuyCalcSource','originalMarketSource',
  'originalItemSource','originalDetailSource','originalPeriodSource',
];
const files=await Promise.all(paths.map(p=>readFile(join(root,p),'utf8')));
const source=Object.fromEntries(keys.map((key,i)=>[key,files[i]]));
const street=createStandardStreetModule(source);
const reviewed=reviewOriginalPeriodBootstrap({
  periodSource:source.originalPeriodSource,
  adminSource:source.originalAdminInitSource,
  readSource:source.originalDataReadSource,
  writeSource:source.originalDataWriteSource,
  reviewedB41:street.reviewedB41,
});
function freshV2(){
  return createPeriodMemoryWorld({
    worldId:'b51-period-city-demo',streetId:'standard-street',
    nowSeconds:1000000,period:createOriginalPeriodSeed(reviewed),
  });
}
test('B-51 reviewed original B-34/B-46 city init and B-42 36h+3h clock seed exact version2 period envelope',()=>{
  assert.equal(reviewed.source,SOURCE_PERIOD_SEED);
  const world=freshV2();
  assert.equal(world.schema,PERIOD_WORLD_SCHEMA);
  assert.equal(world.period.source,SOURCE_PERIOD_SEED);
  assert.equal(world.period.dtPeople,500000);
  assert.equal(world.period.periodSeconds,129600);
  assert.equal(world.period.clockShiftSeconds,10800);
  assert.equal(world.period.settledCount,0);
  assert.equal(world.period.lastSettledBoundarySeconds,null);
  assert.deepEqual(world.period.eventState,{});
  assert.equal(world.events,null);
  assert.deepEqual(world.period.town,{
    leader:0,money:0,in:0,out:0,develop:5001,devem:0,
    safety:5001,safem:0,army:0,robina:2000,robinb:0,
  });
  assert.ok(validateOriginalPeriodSeed(world.period));
  assert.throws(()=>reviewOriginalPeriodBootstrap({
    periodSource:source.originalPeriodSource,
    adminSource:source.originalAdminInitSource,
    readSource:source.originalDataReadSource,
    reviewedB41:{...street.reviewedB41,clockShiftSeconds:32400},
  }),/B-51/);
  assert.throws(()=>reviewOriginalPeriodBootstrap({
    periodSource:source.originalPeriodSource,
    adminSource:source.originalAdminInitSource.replace(
      '500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0','tampered'),
    readSource:source.originalDataReadSource,
    writeSource:source.originalDataWriteSource,
    reviewedB41:street.reviewedB41,
  }),/original|town|changed|B-46/);
});
test('B-51 real GameCore source market/init and open shop preserve city/period state through CAS and B-43 two-slot disk save/load',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'akimono-b51-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const store=createLocalWorldSaveStore({directory});
  const repo=createMemoryWorldAdapter(freshV2());
  const invoke=(kind,extra={})=>executeMemoryCommand({
    repository:repo,streetModule:street,
    command:{kind,expectedRevision:repo.read().revision,...extra},
  });
  const a=invoke('initialize-source-market');
  assert.ok(a.ok,JSON.stringify(a.details));
  const b=invoke('open-shop',{
    shopId:1,ownerName:'來源店主',shopName:'保留城市的單店',
  });
  assert.ok(b.ok,JSON.stringify(b.details));
  const world=repo.read();
  assert.equal(world.revision,2);
  assert.equal(world.period.state,'bootstrap-only-no-period-turn');
  assert.equal(world.shops[0].money,100000);
  const saved=store.save(world,{expectedGeneration:0});
  assert.equal(saved.generation,1);
  for(const invalid of [
    {...world.period,settledCount:1},
    {...world.period,dtPeople:123456},
    {...world.period,eventState:{rebel:123456}},
    {...world.period,town:{...world.period.town,develop:9000}},
  ]){
    assert.throws(()=>store.save({...world,period:invalid},{
      expectedGeneration:1,
    }),/unreviewed or settled v2 city/,
    'disk saver must not persist fabricated city/event/period settlement');
    assert.equal(store.status().generation,1,
      'rejected source period must leave both save generations unchanged');
  }
  const restored=store.load();
  assert.equal(restored.generation,1);
  assert.equal(encodeMemorySnapshot(restored.world),encodeMemorySnapshot(world));
  const resumed=createMemoryWorldAdapter(restored.world);
  assert.equal(resumed.read().period.town.develop,5001);
  assert.equal(resumed.read().period.dtPeople,500000);
  assert.deepEqual(resumed.read().period.eventState,{});
  assert.equal(resumed.read().shops[0].shopname,'保留城市的單店');
});
test('B-51 strict period source seed rejects fake settlements and protects old version1 worlds',()=>{
  const v2=freshV2();
  const old=createMemoryWorld({
    worldId:'old-world',streetId:'standard-street',nowSeconds:1000000,
  });
  assert.equal(old.schema,MEMORY_WORLD_SCHEMA);
  assert.equal(Object.hasOwn(old,'period'),false);
  const period=v2.period;
  assert.deepEqual(period.eventState,{},'fresh source world starts with an empty EVENT CSV');
  assert.ok(validateOriginalPeriodSeed({...period,eventState:null}),
    'B-51 v2 saves with unknown events remain readable');
  for(const changes of [
    {dtPeople:600000},{settledCount:1},
    {lastSettledBoundarySeconds:1026000},
    {town:{...period.town,develop:9000}},
    {eventState:{rebel:123456}},{state:'settled'}, {periodSeconds:86400},
  ]){
    const changed={...period,...changes};
    assert.equal(validateOriginalPeriodSeed(changed),false);
    assert.doesNotThrow(()=>validateMemoryWorld({...v2,period:changed}),
      'generic GameCore must not pretend to validate street semantics');
  }
  assert.throws(()=>validateMemoryWorld({...old,period}),
    /unexpected world fields/);
  assert.throws(()=>validateMemoryWorld({...v2,period:null}),/period record/);
  const repo=createMemoryWorldAdapter(v2);
  const downgrade=repo.compareAndSwap({
    expectedRevision:0,
    nextWorld:{...old,worldId:v2.worldId,revision:1},
  });
  assert.equal(downgrade.ok,false);
  assert.equal(downgrade.code,'INVALID_TRANSITION');
  const dummy={
    id:'standard-street',capabilities:['attempt-period-in-v1'],
    apply:({world})=>({shops:world.shops,period,
      receipt:{source:'testing-generic-contract-only'}}),
  };
  assert.throws(()=>applyGameCommand({
    world:old,streetModule:dummy,
    command:{kind:'attempt-period-in-v1',expectedRevision:0},
  }),/legacy world cannot silently/);
});
