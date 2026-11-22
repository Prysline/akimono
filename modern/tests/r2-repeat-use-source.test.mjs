/**
 * R2 repeatable source #14: each oracle row executes frozen Perl, including
 * its real EXP update, callback, MakeAmount, CheckWholeStore and RNG order.
 * Node is compared against observed Perl fields, never invented results.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path,{join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {createMemoryWorld,createMemoryWorldAdapter,executeMemoryCommand,
  validateMemoryWorld,encodeMemorySnapshot} from '../src/game-core-contract.mjs';
import {originalUseTimeSeconds,originalUseExperience}
  from '../src/shared-use-experience.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const sourcePaths=[
  ['itemDsl','custom/inc-item-data.cgi'],
  ['rebelDsl','custom/inc-rebel-data.cgi'],
  ['originalAdminInitSource','modern/tests/original-perl/core-inc-admin-func.cgi'],
  ['originalDataReadSource','modern/tests/original-perl/inc-func.cgi'],
  ['originalDataWriteSource','modern/tests/original-perl/write.cgi'],
  ['originalTurnSource','modern/tests/original-perl/inc-turn.cgi'],
  ['originalWholeSource','modern/tests/original-perl/whole.cgi'],
  ['originalConfigSource','_config.cgi'],
  ['originalCompilerSource','modern/tests/original-perl/inc-makeitem.cgi'],
  ['originalMarketSource','modern/tests/original-perl/market.cgi'],
  ['originalItemSource','modern/tests/original-perl/item.cgi'],
  ['originalDetailSource','modern/tests/original-perl/core-detail.cgi'],
  ['originalBuySource','modern/tests/original-perl/buy-s.cgi'],
  ['originalBuyItemSource','modern/tests/original-perl/item.cgi'],
  ['originalBuyCalcSource','modern/tests/original-perl/calc.cgi'],
  ['originalUseSource','modern/tests/original-perl/use.cgi'],
  ['originalItemHelperSource','modern/tests/original-perl/core-inc-item.cgi'],
];
const source=Object.fromEntries(await Promise.all(sourcePaths.map(
  async ([name,pathname])=>[name,await readFile(join(root,pathname),'utf8')])));
const module=createStandardStreetModule(source);
const normal=()=>{
  const draws=[999999];
  for(let n=0;n<5;n++)draws.push(0,0,...Array(8).fill(999999));
  return [...draws,999999];
};
const gaussian=(before=999999,after=999999)=>
  [before,...Array(10).fill(0),after];
const oracle=(initial,steps)=>JSON.parse(execFileSync('perl',[
  'original-r2-repeat-use-probe.pl',JSON.stringify({initial,steps}),
],{cwd:join(root,'modern/tests/original-perl'),encoding:'utf8',
  timeout:30000,maxBuffer:4*1024*1024}));
function shopWorld(){
  const repo=createMemoryWorldAdapter(createMemoryWorld({
    worldId:'r2-repeat-real-original-14',streetId:'standard-street',
    nowSeconds:1000000,
  }));
  const execute=(kind,opts={})=>executeMemoryCommand({repository:repo,
    streetModule:module,command:{kind,expectedRevision:repo.read().revision,
      ...opts}});
  assert.equal(execute('initialize-source-market').code,'COMMITTED');
  assert.equal(execute('open-shop',{shopId:1,
    ownerName:'原版 R2 多次探針',shopName:'共用熟練地圖驗證'}).code,'COMMITTED');
  assert.equal(execute('use-item',{shopId:1,itemId:79,useId:0,
    requestedCount:1}).code,'COMMITTED');
  return repo.read();
}
function withShop(base,mutate){
  return validateMemoryWorld({...base,
    shops:base.shops.map((s,i)=>i? s:{...s,...mutate(s)})});
}
function originalInitial(world){
  const s=world.shops[0];
  return {money:s.money,time:s.time,paytoday:s.paytoday,
    nowSeconds:world.nowSeconds,maps:s.item[13],exp:s.exp??{},
    swords:Object.fromEntries([40,41,42,43,44].map(id=>[id,s.item[id-1]])),
    wholesale:Object.fromEntries([40,41,42,43,44].map(
      id=>[id,world.market.wholesale[id-1]]))};
}
function compareWithPerl(world,steps){
  const truth=oracle(originalInitial(world),steps);
  assert.equal(truth.limitExp,3600);
  const repo=createMemoryWorldAdapter(world);
  const initial=encodeMemorySnapshot(repo.read());
  for(let i=0;i<steps.length;i++){
    const expected=truth.results[i];
    const before=repo.read();
    const offer=module.listUseOffers(before).find(x=>x.itemId===14);
    assert.equal(offer.timePerUseSeconds,expected.sourceUseTimeSeconds,
      'offer must reflect current frozen Perl GetItemUseTime');
    const result=executeMemoryCommand({repository:repo,streetModule:module,
      command:{kind:'use-item',expectedRevision:before.revision,
        shopId:1,itemId:14,useId:0,
        requestedCount:steps[i].requestedCount,
        randomDraws:expected.originalSamples}});
    if(expected.effectiveCount<=0){
      assert.equal(result.code,'SOURCE_BOUNDARY_REJECTED',
        'illegal original USE must not commit');
      assert.equal(encodeMemorySnapshot(repo.read()),
        encodeMemorySnapshot(before));
      continue;
    }
    assert.equal(result.code,'COMMITTED',result.details?.reason);
    const s=result.world.shops[0];
    assert.equal(result.details.useTimeSeconds,expected.sourceUseTimeSeconds);
    assert.equal(result.details.effectiveCount,expected.effectiveCount);
    assert.equal(s.money,expected.money);
    assert.equal(s.time,expected.time);
    assert.equal(s.paytoday,expected.paytoday);
    assert.equal(s.item[13],expected.maps);
    assert.deepEqual([40,41,42,43,44].map(id=>s.item[id-1]),
      expected.swords);
    assert.deepEqual(s.exp,expected.exp);
    assert.deepEqual([40,41,42,43,44].map(
      id=>result.world.market.wholesale[id-1]),expected.wholesale);
    assert.deepEqual(result.details.originalUseItem,expected.originalUseItem);
    assert.deepEqual(result.details.originalUseMsg,expected.originalUseMsg);
    assert.deepEqual(result.details.originalAddItem,expected.originalAddItem);
    assert.deepEqual(result.details.originalAddMsg,expected.originalAddMsg);
    assert.equal(result.details.originalFunctionReturn,
      expected.originalFunctionReturn??null);
    assert.equal(result.details.originalResultOk,expected.originalResultOk??null);
    assert.equal(result.details.randomDrawsUsed,expected.consumedDraws);
    assert.equal(result.details.experienceGain,
      (expected.exp['14']??0)-(expected.expOld??0));
  }
  return {repo,truth,initial};
}
test('R2 direct frozen Perl GetItemUseTime at EXP 0/20/40/980/1000',()=>{
  const world=shopWorld();
  for(const experience of [0,20,40,980,1000]){
    const w=withShop(world,s=>({exp:{...(s.exp??{}),14:experience}}));
    const observed=oracle(originalInitial(w),[{
      requestedCount:1,randomDraws:normal(),
    }]).results[0];
    assert.equal(originalUseTimeSeconds({
      time:7200,exptime:3600,experience,
    }),observed.sourceUseTimeSeconds);
    compareWithPerl(w,[{requestedCount:1,randomDraws:normal()}]);
  }
});
test('R2 first/second/third/fourth #14 direct Perl sequence including multi-trip request',()=>{
  const base=shopWorld();
  const {truth}=compareWithPerl(base,[
    {requestedCount:1,randomDraws:normal()},
    {requestedCount:1,randomDraws:normal()},
    {requestedCount:1,randomDraws:normal()},
    {requestedCount:2,randomDraws:gaussian()},
  ]);
  assert.deepEqual(truth.results.slice(0,3).map(x=>x.sourceUseTimeSeconds),
    [7200,7128,7056],'source time series measured by frozen Perl');
  assert.deepEqual(truth.results.slice(0,3).map(x=>x.exp['14']),
    [20,40,60],'source EXP after successive real UseItem calls');
});
test('R2 frozen Perl #14 original callback doubling, lostbook and near-limit overflow',()=>{
  const base=shopWorld();
  const stock=withShop(base,s=>({item:s.item.map((v,i)=>
    i===39?599:i===40?499:i===41?299:i===42?99:i===43?74:v)}));
  compareWithPerl(stock,[{requestedCount:1,randomDraws:gaussian(0,0)}]);
  compareWithPerl(base,[{requestedCount:1,randomDraws:normal().map(
    (v,i,a)=>i===a.length-1?0:v)}]);
});
test('R2 frozen Perl #14 alternative ITEM EXP, capped EXP, LIMIT_EXP reductions',()=>{
  const base=shopWorld();
  const cases=[
    {10:300,14:0},
    {10:800,11:850,12:900,13:950,14:100},
    {14:980},
    {14:1000},
  ];
  for(const exp of cases){
    const world=withShop(base,()=>({exp}));
    const {truth}=compareWithPerl(world,[{
      requestedCount:1,randomDraws:normal(),
    }]);
    const e=originalUseExperience({
      records:exp,itemId:14,points:20,count:truth.results[0].effectiveCount,
      limit:3600,
    });
    assert.deepEqual(e.exp,truth.results[0].exp);
  }
});
test('R2 frozen Perl #14 financial/time clipping and failed source command are atomic',()=>{
  const base=shopWorld();
  for(const change of [
    {money:11999},{time:base.nowSeconds-7100},
    {money:24000},{time:base.nowSeconds-14300},
  ]){
    const world=withShop(base,()=>change);
    const count=change.money===24000||change.time===base.nowSeconds-14300?
      3:1;
    // A count clipped to one uses the original 50 Bernoulli draws.
    compareWithPerl(world,[{requestedCount:count,randomDraws:normal()}]);
  }
});
