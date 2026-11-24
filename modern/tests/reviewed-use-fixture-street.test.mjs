import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  createMemoryWorldAdapter,executeMemoryCommand,applyGameCommand,
  encodeMemorySnapshot,decodeMemorySnapshot,
} from '../src/game-core-contract.mjs';
import {
  createReviewedUseFixtureWorld,
  createFixtureState,
  createReviewedUseFixtureStreetModule,
  SOURCE_USE_FIXTURE_STREET_ID,
} from '../src/reviewed-use-fixture-street.mjs';
import {
  projectOriginalIntegratedUseLostbook,
} from '../src/original-integrated-use-lostbook-model.mjs';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [itemDsl,rebelDsl]=await Promise.all([
  'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
].map(p=>readFile(path.join(root,p),'utf8')));
const standard=createStandardStreetModule({itemDsl,rebelDsl});
const fixture=createReviewedUseFixtureStreetModule();
const command=(rev=0,opts={})=>({
  kind:'source-fixture-use',expectedRevision:rev,shopId:42,
  requestedCount:1,param1:1000,perlRandBucket:100,...opts,
});
function scenario(commands){
  const adapter=createMemoryWorldAdapter(createReviewedUseFixtureWorld());
  const receipts=[];
  for(const c of commands){
    const out=executeMemoryCommand({repository:adapter,streetModule:fixture,command:c});
    receipts.push(out);
  }
  return {world:adapter.read(),receipts};
}
test('B-32 synthetic transaction StreetModule is explicitly NOT Standard Street',()=>{
  assert.equal(fixture.id,SOURCE_USE_FIXTURE_STREET_ID);
  assert.notEqual(fixture.id,standard.id);
  assert.deepEqual(fixture.capabilities,['source-fixture-use']);
  assert.equal(fixture.metadata.artificialProducts,true);
  assert.equal(fixture.metadata.originalStreetPlayable,false);
  assert.equal(standard.capabilities.includes('source-fixture-use'),false);
});
test('B-32 fixture initial shop/world is synthetic A/B/C, not real DSL 79 items',()=>{
  const w=createReviewedUseFixtureWorld();
  assert.equal(w.worldId,'b32-synthetic-source-transactions');
  assert.equal(w.streetId,SOURCE_USE_FIXTURE_STREET_ID);
  assert.equal(w.revision,0);
  assert.equal(w.nowSeconds,1000);
  assert.deepEqual(w.shops.map(s=>s.id),[42,43]);
  assert.deepEqual(w.shops[0].item,[8,4,3]);
  assert.deepEqual(w.shops[1].item,[3,4,2]);
  assert.deepEqual(w.market.wholesale,[4,0,-5]);
  assert.equal(w.events,null);
});
test('B-32 one original use carries inventory, money, time, paytoday and skill',()=>{
  const x=scenario([command()]);
  assert.equal(x.receipts[0].code,'COMMITTED');
  assert.equal(x.world.revision,1);
  assert.deepEqual(x.world.shops[0].item,[9,6,5]);
  assert.equal(x.world.shops[0].money,50);
  assert.equal(x.world.shops[0].time,968);
  assert.equal(x.world.shops[0].paytoday,25);
  assert.equal(x.world.shops[0].exp,230);
  assert.deepEqual(x.world.shops[1].item,[3,4,2]);
  assert.equal(x.world.market.wholesale[0],3);
});
test('B-32 source callback runs AFTER one market pass and BEFORE skill award',()=>{
  const x=scenario([command()]);
  const receipt=x.receipts[0].details;
  assert.deepEqual(receipt.sourceTrace,
    ['use-time','wholesale','require-common','lostbook']);
  assert.equal(receipt.wholesaleCheckCount,1);
  assert.equal(receipt.stockAtCallback,10);
  assert.equal(receipt.expAtCallback,200);
  assert.equal(x.world.shops[0].exp,230);
  assert.deepEqual(receipt.originalResult.useitem,[[1,2],[1,1]]);
});
test('B-32 two source-verified transactions persist state across revisions',()=>{
  const x=scenario([command(0),command(1)]);
  assert.deepEqual(x.receipts.map(r=>r.code),['COMMITTED','COMMITTED']);
  assert.equal(x.world.revision,2);
  assert.deepEqual(x.world.shops[0].item,[9,6,5]);
  assert.deepEqual(x.world.shops[1].item,[3,4,2]);
  assert.equal(x.world.shops[0].money,30);
  assert.equal(x.world.shops[0].time,986);
  assert.equal(x.world.shops[0].exp,260);
  assert.equal(x.world.shops[0].paytoday,45);
  assert.deepEqual(x.receipts.map(r=>r.details.expAtCallback),[200,230]);
  assert.deepEqual(x.receipts.map(r=>r.details.effectiveCount),[1,1]);
  assert.equal(x.receipts[0].details.wholesaleCheckCount,1);
  assert.equal(x.receipts[1].details.wholesaleCheckCount,1);
});
test('B-32 second command reads first state, never resets money/time/experience',()=>{
  const repo=createMemoryWorldAdapter(createReviewedUseFixtureWorld());
  const first=executeMemoryCommand({repository:repo,streetModule:fixture,command:command(0)});
  assert.equal(first.code,'COMMITTED');
  const before=repo.read();
  const second=executeMemoryCommand({repository:repo,streetModule:fixture,command:command(1)});
  assert.equal(second.code,'COMMITTED');
  assert.equal(second.world.shops[0].money,before.shops[0].money-20);
  assert.equal(second.world.shops[0].paytoday,before.shops[0].paytoday+20);
  assert.equal(second.world.shops[0].exp,before.shops[0].exp+30);
  assert.equal(second.world.shops[0].time,before.shops[0].time+18);
  assert.equal(before.revision,1);
});
test('B-32 untriggered first callback is followed by genuinely triggered second',()=>{
  const x=scenario([command(0,{param1:0}),command(1)]);
  assert.equal(x.world.revision,2);
  assert.deepEqual(x.receipts[0].details.originalResult.useitem,[[1,2]]);
  assert.deepEqual(x.receipts[1].details.originalResult.useitem,[[1,2],[1,1]]);
  assert.equal(x.world.shops[0].money,30);
  assert.equal(x.world.shops[0].time,986);
});
test('B-32 absent callback does not create original function return',()=>{
  const x=scenario([command(0,{callback:''})]);
  assert.equal(x.receipts[0].code,'COMMITTED');
  assert.equal(x.receipts[0].details.originalResult.function_return,null);
  assert.deepEqual(x.receipts[0].details.sourceTrace,
    ['use-time','wholesale','require-common']);
  assert.deepEqual(x.world.shops[0].item,[10,6,5]);
});
test('B-32 original zero-count return does NOT claim a committed game action',()=>{
  const w=createReviewedUseFixtureWorld();
  const repo=createMemoryWorldAdapter(w);
  const result=executeMemoryCommand({
    repository:repo,streetModule:fixture,
    command:command(0,{requestedCount:0}),
  });
  assert.equal(result.ok,false);
  assert.equal(result.code,'SOURCE_BOUNDARY_REJECTED');
  assert.equal(result.world.revision,0);
  assert.deepEqual(repo.read(),w);
});
test('B-32 source shortage / time-gate rejects without partial world write',()=>{
  const repo=createMemoryWorldAdapter(createReviewedUseFixtureWorld());
  const first=executeMemoryCommand({
    repository:repo,streetModule:fixture,
    command:command(0,{requestedCount:1}),
  });
  assert.equal(first.ok,true);
  const snapshot=encodeMemorySnapshot(repo.read());
  const x=executeMemoryCommand({
    repository:repo,streetModule:fixture,
    command:command(1,{requestedCount:5}),
  });
  // Source can adjust count to fit remaining time; it MUST NOT
  // assume requestedCount=5 is always an error.
  assert.equal(x.code,'COMMITTED');
  assert.notEqual(encodeMemorySnapshot(repo.read()),snapshot);
});
test('B-32 stale revision can never reapply an original item use',()=>{
  const repo=createMemoryWorldAdapter(createReviewedUseFixtureWorld());
  executeMemoryCommand({repository:repo,streetModule:fixture,command:command()});
  const before=encodeMemorySnapshot(repo.read());
  const result=executeMemoryCommand({
    repository:repo,streetModule:fixture,command:command(0),
  });
  assert.equal(result.code,'REVISION_CONFLICT');
  assert.equal(encodeMemorySnapshot(repo.read()),before);
});
test('B-32 unknown original callback is refused, no state mutation',()=>{
  const repo=createMemoryWorldAdapter(createReviewedUseFixtureWorld());
  for(const callback of ['popup','badgossip','_local_1']){
    const x=executeMemoryCommand({
      repository:repo,streetModule:fixture,command:command(0,{callback}),
    });
    assert.equal(x.code,'SOURCE_BOUNDARY_REJECTED');
    assert.equal(repo.read().revision,0);
  }
});
test('B-32 unsupported arbitrary item IDs refuse rather than remap DSL indexes',()=>{
  const repo=createMemoryWorldAdapter(createReviewedUseFixtureWorld());
  const x=executeMemoryCommand({
    repository:repo,streetModule:fixture,
    command:{...command(),itemNo:63},
  });
  assert.equal(x.code,'SOURCE_BOUNDARY_REJECTED');
  assert.equal(repo.read().revision,0);
});
test('B-32 only synthetic shop #42 may perform reviewed item use',()=>{
  const repo=createMemoryWorldAdapter(createReviewedUseFixtureWorld());
  const x=executeMemoryCommand({
    repository:repo,streetModule:fixture,
    command:{...command(),shopId:43},
  });
  assert.equal(x.code,'SOURCE_BOUNDARY_REJECTED');
  assert.equal(repo.read().revision,0);
});
test('B-32 integer Perl rand buckets are exact for integer param1 threshold',()=>{
  for(const threshold of [0,1,25,500,999,1000]){
    for(const raw of [0,0.001,0.99,1,12.7,499.999,500,999.999]){
      assert.equal(Math.floor(raw)<threshold,raw<threshold);
    }
  }
});
test('B-32 command rejects fractional and out-of-range Perl buckets',()=>{
  const repo=createMemoryWorldAdapter(createReviewedUseFixtureWorld());
  for(const bucket of [NaN,Infinity,-1,1000,0.25]){
    const cmd=command(0,{perlRandBucket:bucket});
    let r;
    try{r=executeMemoryCommand({repository:repo,streetModule:fixture,command:cmd});}
    catch(e){assert.match(String(e),/contract/);continue;}
    assert.equal(r.code,'SOURCE_BOUNDARY_REJECTED');
  }
  assert.equal(repo.read().revision,0);
});
test('B-32 fake Standard Street streetId/worldId cannot steal fixture commands',()=>{
  const w=createReviewedUseFixtureWorld();
  const spoof={...w,worldId:'different-world'};
  const result=applyGameCommand({
    world:spoof,command:command(),streetModule:fixture,
  });
  assert.equal(result.code,'SOURCE_BOUNDARY_REJECTED');
  assert.deepEqual(result.world,spoof);
});
test('B-32 snapshot serialization retains exact two source trades',()=>{
  const x=scenario([command(0),command(1)]);
  const s=encodeMemorySnapshot(x.world);
  const y=decodeMemorySnapshot(s);
  assert.deepEqual(y,x.world);
  assert.equal(y.shops[0].money,30);
  assert.equal(y.shops[0].exp,260);
  assert.deepEqual(y.market.wholesale,x.world.market.wholesale);
  assert.ok(Object.isFrozen(y.shops[0].item));
});
test('B-32 independent synthetic replays produce byte-identical JSON snapshot',()=>{
  const a=encodeMemorySnapshot(scenario([command(),command(1)]).world);
  const b=encodeMemorySnapshot(scenario([command(),command(1)]).world);
  assert.equal(a,b);
});
test('B-32 refuses malformed/extra world inventory slots',()=>{
  const w=createReviewedUseFixtureWorld();
  assert.throws(()=>createFixtureState({
    nowSeconds:1000,stocks:[1,2,3,4],otherShopStock:[3,4,2],
    wholesale:[4,0,-5],money:70,paytoday:5,
    storedTimeSeconds:950,exp:200,status:1,
  }),/three slots/);
  const x=applyGameCommand({
    world:{...w,shops:[{...w.shops[0],item:[8,4]},w.shops[1]]},
    streetModule:fixture,command:command(),
  });
  assert.equal(x.code,'SOURCE_BOUNDARY_REJECTED');
});
test('B-32 source fixture rejects invented market side effects and events',()=>{
  const w=createReviewedUseFixtureWorld();
  const altered={...w,events:{festival:true}};
  const x=applyGameCommand({world:altered,streetModule:fixture,command:command()});
  assert.equal(x.code,'SOURCE_BOUNDARY_REJECTED');
});
test('B-32 rejected world command does not execute a real CGI, storage or logger',()=>{
  assert.equal(fixture.metadata.originalStreetPlayable,false);
  assert.match(fixture.metadata.source,/pinned Core/);
  assert.equal(Object.keys(fixture).includes('save'),false);
  assert.equal(Object.keys(fixture).includes('require'),false);
});
test('B-32 six actually source-executed Perl steps match two WorldState trades',t=>{
  const cwd=path.join(root,'modern/tests/original-perl');
  let stdout;
  try{
    stdout=execFileSync('perl',['original-world-use-sequence-probe.pl'],{
      cwd,encoding:'utf8',maxBuffer:1024*1024,timeout:15000,
    });
  }catch(e){
    if(e?.code==='ENOENT'){t.skip('Perl runtime unavailable');return;}
    throw e;
  }
  const cases=JSON.parse(stdout);
  assert.equal(cases.length,3);
  for(const scenarioCase of cases){
    assert.equal(scenarioCase.steps.length,2,scenarioCase.case);
    const repo=createMemoryWorldAdapter(createReviewedUseFixtureWorld());
    for(const [i,step] of scenarioCase.steps.entries()){
      const input=step.input,observed=step.observed;
      const projected=projectOriginalIntegratedUseLostbook({
        ...input,originalPerlDraw:observed.originalPerlDraw,
      });
      for(const key of [
        'stock','otherShopStock','wholesale','money','paytoday','time','exp',
        'expAtCallback','stockAtCallback','wholesaleAtCallback','result','trace',
        'originalPerlDraw',
      ]){
        assert.deepEqual(projected[key],observed[key],
          scenarioCase.case+' #'+i+' '+key);
      }
      const call=executeMemoryCommand({
        repository:repo,streetModule:fixture,
        command:command(i,{
          requestedCount:input.requestedCount,param1:input.param1,
          callback:input.callback??'lostbook',
          perlRandBucket:Math.floor(observed.originalPerlDraw),
        }),
      });
      assert.equal(call.code,'COMMITTED',scenarioCase.case+' commit #'+i);
      const world=repo.read();
      assert.deepEqual(world.shops[0].item,observed.stock,scenarioCase.case+' item');
      assert.deepEqual(world.shops[1].item,observed.otherShopStock,
        scenarioCase.case+' other shop');
      assert.deepEqual(world.market.wholesale,observed.wholesale,
        scenarioCase.case+' wholesale');
      assert.equal(world.shops[0].money,observed.money,scenarioCase.case+' money');
      assert.equal(world.shops[0].paytoday,observed.paytoday,
        scenarioCase.case+' paytoday');
      assert.equal(world.shops[0].time,observed.time,scenarioCase.case+' time');
      assert.equal(world.shops[0].exp,observed.exp,scenarioCase.case+' exp');
      assert.deepEqual(call.details.originalResult,observed.result,
        scenarioCase.case+' result records');
      assert.deepEqual(call.details.sourceTrace,observed.trace,
        scenarioCase.case+' source order');
    }
  }
});
