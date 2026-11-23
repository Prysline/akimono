import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  createPeriodMemoryWorld,createMemoryWorld,
  createMemoryWorldAdapter,applyGameCommand,executeMemoryCommand,
  encodeMemorySnapshot,
} from '../src/game-core-contract.mjs';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {createLocalWorldSaveStore} from '../src/local-world-save-store.mjs';
import {reviewOriginalPeriodBootstrap,createOriginalPeriodSeed}
  from '../src/original-period-world-seed.mjs';
import {
  reviewR4WorldTransitionGate,allowR4UnsettledWorldTransition,
  R4_TRANSITION_GATE_SOURCE,
} from '../src/original-r4-world-transition-gate.mjs';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const pairs=[
  ['itemDsl','custom/inc-item-data.cgi'],
  ['rebelDsl','custom/inc-rebel-data.cgi'],
  ['originalAdminInitSource','modern/tests/original-perl/core-inc-admin-func.cgi'],
  ['originalDataReadSource','modern/tests/original-perl/inc-func.cgi'],
  ['originalDataWriteSource','modern/tests/original-perl/write.cgi'],
  ['originalTurnSource','modern/tests/original-perl/inc-turn.cgi'],
  ['originalWholeSource','modern/tests/original-perl/whole.cgi'],
  ['originalConfigSource','_config.cgi'],
  ['originalCompilerSource','modern/tests/original-perl/inc-makeitem.cgi'],
  ['originalBuySource','modern/tests/original-perl/buy-s.cgi'],
  ['originalBuyItemSource','modern/tests/original-perl/item.cgi'],
  ['originalBuyCalcSource','modern/tests/original-perl/calc.cgi'],
  ['originalMarketSource','modern/tests/original-perl/market.cgi'],
  ['originalItemSource','modern/tests/original-perl/item.cgi'],
  ['originalDetailSource','modern/tests/original-perl/core-detail.cgi'],
  ['originalPeriodSource','modern/tests/original-perl/period.cgi'],
];
const sources=Object.fromEntries(await Promise.all(pairs.map(
  async([key,path])=>[key,await readFile(join(root,path),'utf8')],
)));
const street=createStandardStreetModule(sources);
const clock=reviewR4WorldTransitionGate({
  turnSource:sources.originalTurnSource,
  configSource:sources.originalConfigSource,
});
const seed=reviewOriginalPeriodBootstrap({
  periodSource:sources.originalPeriodSource,
  adminSource:sources.originalAdminInitSource,
  readSource:sources.originalDataReadSource,
  writeSource:sources.originalDataWriteSource,
  reviewedB41:street.reviewedB41,
});
function worldAt(nowSeconds){
  return createPeriodMemoryWorld({
    worldId:'r4-cas-guard',streetId:'standard-street',
    nowSeconds,period:createOriginalPeriodSeed(seed),
  });
}
const mkModule=(opts={})=>Object.freeze({
  id:'standard-street',capabilities:['advance-source-time'],
  apply:({world,command})=>({
    shops:world.shops,nowSeconds:world.nowSeconds+command.minutes*60,
    ...(opts.forgePeriod?{
      period:{...world.period,...opts.forgePeriod},
    }:{}),
    ...(opts.nonCommittable?{nonCommittable:true}:{}),
    receipt:{source:'source transition preflight test module'},
  }),
  ...(opts.withoutReviewer?{}:{
    reviewPeriodTransition:street.reviewPeriodTransition,
  }),
});
function run(at,minutes,module=mkModule()){
  const repo=createMemoryWorldAdapter(worldAt(at));
  const start=encodeMemorySnapshot(repo.read());
  const result=executeMemoryCommand({
    repository:repo,streetModule:module,
    command:{kind:'advance-source-time',expectedRevision:0,
      minutes,randomDraws:[]},
  });
  return {repo,start,result};
}

test('R4 source v2 transition hook is installed in real Standard Street but DOES NOT authorize a period commit',()=>{
  assert.equal(clock.source,R4_TRANSITION_GATE_SOURCE);
  assert.equal(clock.committable,false);
  assert.equal(street.reviewedR4Transition.source,clock.source);
  assert.equal(street.reviewedR4Transition.committable,false);
  assert.equal(typeof street.reviewPeriodTransition,'function');
  const original=worldAt(1025900);
  const safeAfter={...original,nowSeconds:1025960,revision:1};
  assert.equal(street.reviewPeriodTransition({
    before:original,after:safeAfter,
  }),true,'same original 36h period time step may be reviewed');
  assert.throws(()=>street.reviewPeriodTransition({
    before:original,after:{...original,nowSeconds:1026000,revision:1},
  }),/unreviewed 36h period settlement/);
  assert.equal(original.period.settledCount,0);
});

test('R4 reviewed same-period time advance can use the real generic GameCore memory CAS',()=>{
  const {repo,result}=run(1025900,1);
  assert.equal(result.ok,true);
  assert.equal(result.code,'COMMITTED');
  assert.equal(result.world.nowSeconds,1025960);
  assert.equal(result.world.revision,1);
  assert.equal(repo.read().period.settledCount,0);
  assert.deepEqual(repo.read().period.town,worldAt(1025900).period.town);
});

test('R4 first 36h rollover and forged settled count are rejected atomically BEFORE memory CAS',()=>{
  for(const [name,module] of [
    ['reviewed Street gate',mkModule()],
    ['reviewer missing',mkModule({withoutReviewer:true})],
  ]){
    const {repo,start,result}=run(1025980,1,module);
    assert.equal(result.ok,false,name);
    assert.equal(result.code,'SOURCE_BOUNDARY_REJECTED',name);
    if(name==='reviewed Street gate')
      assert.match(result.details.reason,/unreviewed 36h period settlement/);
    assert.equal(encodeMemorySnapshot(repo.read()),start,
      'no partial shop/clock/revision/period write before CAS');
    assert.equal(repo.read().revision,0);
  }
  const forged=run(1025900,1,mkModule({forgePeriod:{
    state:'settled',settledCount:1,
    lastSettledBoundarySeconds:1026000,
  }}));
  assert.equal(forged.result.ok,false);
  assert.match(forged.result.details.reason,/unreviewed or settled period/);
  assert.equal(encodeMemorySnapshot(forged.repo.read()),forged.start);
});

test('R4 noncommittable B50/B56 source effects cannot be smuggled through a trusted Street action receipt',()=>{
  const {repo,start,result}=run(1025900,1,
    mkModule({nonCommittable:true}));
  assert.equal(result.ok,false);
  assert.equal(result.code,'SOURCE_BOUNDARY_REJECTED');
  assert.match(result.details.reason,/noncommittable source projection/);
  assert.equal(encodeMemorySnapshot(repo.read()),start);
  const initial=worldAt(1025900);
  const dummy={
    id:'standard-street',
    capabilities:['source-stage'],
    apply:({world})=>({
      shops:world.shops,
      receipt:{source:'not a commit',committable:false},
    }),
  };
  const discarded=applyGameCommand({world:initial,
    command:{kind:'source-stage',expectedRevision:0},
    streetModule:dummy});
  assert.equal(discarded.ok,false);
  assert.equal(discarded.code,'SOURCE_BOUNDARY_REJECTED');
  assert.equal(discarded.world.revision,0);
});

test('R4 source transition gate refuses clock drift, unknown EVENT, corrupt city and unreviewed period revisions',()=>{
  const before=worldAt(1025900);
  const after={...before,nowSeconds:1025960,revision:1};
  for(const bad of [
    {...after,period:{...after.period,dtPeople:600000}},
    {...after,period:{...after.period,eventState:{rebel:3000000}}},
    {...after,period:{...after.period,town:{...after.period.town,
      army:123}}},
    {...after,period:{...after.period,settledCount:1}},
    {...after,revision:20},
    {...after,nowSeconds:1025899},
  ])assert.throws(()=>allowR4UnsettledWorldTransition({
    reviewed:clock,before,after:bad,
  }),/R4 source WorldState transition/);
  assert.throws(()=>reviewR4WorldTransitionGate({
    turnSource:sources.originalTurnSource.replace(
      '$lasttime+=$ONE_DAY_TIME-($lasttime%$ONE_DAY_TIME);',
      '$lasttime+=$ONE_DAY_TIME;',
    ),
    configSource:sources.originalConfigSource,
  }),/original inc-turn order drift/);
  assert.throws(()=>allowR4UnsettledWorldTransition({
    reviewed:{...clock,committable:true},before,after,
  }),/source-reviewed original R4 transition gate/);
});

test('R4 rejected period attempts leave both actual B43 save generations untouched',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'akimono-r4-cas-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const store=createLocalWorldSaveStore({directory});
  const initial=worldAt(1025980);
  const boot=applyGameCommand({
    world:initial,streetModule:street,
    command:{kind:'initialize-source-market',expectedRevision:0},
  });
  assert.equal(boot.ok,true);
  const first=store.save(boot.world,{expectedGeneration:0});
  assert.equal(first.generation,1);
  const repo=createMemoryWorldAdapter(boot.world);
  const snapshotBefore=encodeMemorySnapshot(repo.read());
  const attempt=executeMemoryCommand({
    repository:repo,streetModule:mkModule(),
    command:{kind:'advance-source-time',
      expectedRevision:1,minutes:1,randomDraws:[]},
  });
  assert.equal(attempt.ok,false);
  assert.equal(attempt.code,'SOURCE_BOUNDARY_REJECTED');
  assert.equal(encodeMemorySnapshot(repo.read()),snapshotBefore);
  assert.equal(store.status().generation,1);
  assert.equal(store.load().world.period.settledCount,0);
  assert.equal(store.load().world.nowSeconds,1025980);
  assert.equal(encodeMemorySnapshot(store.load().world),snapshotBefore);
});

test('R4 v1 GameCore remains independent of opt-in Standard Street v2 period review',()=>{
  const before=createMemoryWorld({
    worldId:'legacy-v1',streetId:'standard-street',
    nowSeconds:1025980,
  });
  const streetWithoutPeriodReviewer=mkModule({withoutReviewer:true});
  const after=applyGameCommand({
    world:before,streetModule:streetWithoutPeriodReviewer,
    command:{kind:'advance-source-time',
      expectedRevision:0,minutes:1,randomDraws:[]},
  });
  assert.equal(after.ok,true);
  assert.equal(after.world.nowSeconds,1026040);
  assert.equal(after.world.revision,1);
});
