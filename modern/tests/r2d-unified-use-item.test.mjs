import test from 'node:test';
import assert from 'node:assert/strict';
import path,{join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {createMemoryWorld,createMemoryWorldAdapter,executeMemoryCommand,
  applyGameCommand,encodeMemorySnapshot,validateMemoryWorld}
  from '../src/game-core-contract.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const inputs=[
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
const sources=Object.fromEntries(await Promise.all(inputs.map(
  async ([key,relative])=>[key,await readFile(join(root,relative),'utf8')])));
const street=createStandardStreetModule(sources);
const limitedStreet=createStandardStreetModule({
  ...sources,originalItemHelperSource:null,
});
const perl=(probe,variant)=>JSON.parse(execFileSync('perl',[
  probe,...(variant?[variant]:[]),
],{cwd:join(root,'modern/tests/original-perl'),
  encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024}));
const use=(repo,itemId,extra={})=>executeMemoryCommand({
  repository:repo,streetModule:street,
  command:{kind:'use-item',expectedRevision:repo.read().revision,
    shopId:1,itemId,useId:0,requestedCount:1,...extra},
});
function seed(){
  const repo=createMemoryWorldAdapter(createMemoryWorld({
    worldId:'r2d-source-shared-use',
    streetId:'standard-street',nowSeconds:1000000,
  }));
  const perform=(kind,fields={})=>executeMemoryCommand({
    repository:repo,streetModule:street,
    command:{kind,expectedRevision:repo.read().revision,...fields},
  });
  assert.equal(perform('initialize-source-market').code,'COMMITTED');
  assert.equal(perform('open-shop',{
    shopId:1,ownerName:'原版使用者',shopName:'來源製作驗證店',
  }).code,'COMMITTED');
  return repo;
}
function ownsMap(){
  const repo=seed();
  const x=use(repo,79);
  assert.equal(x.code,'COMMITTED',x.details?.reason);
  return repo;
}
function rejectedWithoutChange(repo,command,code='SOURCE_BOUNDARY_REJECTED',mod=street){
  const before=encodeMemorySnapshot(repo.read());
  const x=executeMemoryCommand({repository:repo,streetModule:mod,
    command:{kind:'use-item',expectedRevision:repo.read().revision,
      shopId:1,itemId:14,useId:0,requestedCount:1,...command}});
  assert.equal(x.ok,false);
  assert.equal(x.code,code,x.details?.reason);
  assert.equal(encodeMemorySnapshot(repo.read()),before);
  return x;
}

test('R2-D one GameCore USE command and Registry; no product-specific executable aliases',()=>{
  assert.ok(street.capabilities.includes('use-item'));
  assert.ok(limitedStreet.capabilities.includes('use-item'));
  assert.equal(street.useItem.getRule(79,0).itemId,79);
  assert.equal(street.useItem.getRule(14,0).itemId,14);
  assert.equal(street.useItem.getRule(14,1),null);
  for(const old of ['gift-exchange-maps','use-original-sword-map-14',
    'use-original-sword-map-14-all-outcomes']){
    assert.equal(street.capabilities.includes(old),false);
    const w=seed().read();
    assert.equal(applyGameCommand({world:w,streetModule:street,
      command:{kind:old,expectedRevision:w.revision,shopId:1}}).code,
    'UNSUPPORTED_ACTION');
  }
});
test('R2-D source #79 Perl six-case Oracle and source #14 Perl six-branch Oracle share use-item',()=>{
  const giftEvidence=perl('original-gift-map-use-probe.pl');
  assert.equal(giftEvidence.length,6);
  for(const scenario of ['mixed','mixed-loss','zero-loss','doubled',
    'doubled-loss','boundary']){
    const evidence=perl('original-b63-sword-map-all-outcomes-probe.pl',scenario);
    const repo=ownsMap(),start=repo.read();
    const result=use(repo,14,{randomDraws:evidence.originalSamples});
    assert.equal(result.code,'COMMITTED',scenario+': '+result.details?.reason);
    const after=result.world.shops[0];
    assert.deepEqual([40,41,42,43,44].map(id=>after.item[id-1]),
      evidence.result.swords,scenario+' sword output from actual Perl');
    assert.equal(after.item[13],evidence.result.maps,scenario+' map stock');
    assert.equal(after.money,start.shops[0].money-12000);
    assert.equal(after.time,start.shops[0].time+7200);
    assert.equal(after.paytoday,start.shops[0].paytoday+12000);
    assert.equal(after.exp['14'],evidence.result.exp14);
    assert.equal(result.details.effectiveCount,evidence.result.count);
    assert.deepEqual(result.details.originalAddItem,evidence.result.created);
    assert.deepEqual(result.details.originalUseItem,
      evidence.result.originalUseItem??[]);
    assert.deepEqual(result.details.originalUseMsg,
      evidence.result.originalUseMsg??[]);
    assert.equal(result.details.originalResultOk,
      evidence.result.originalResultOk??null);
    assert.equal(result.details.originalFunctionReturn,
      evidence.result.callbackResult);
    assert.equal(result.details.randomDrawsUsed,evidence.consumedDraws);
    assert.equal(result.details.mapDestroyed,scenario.endsWith('loss'));
    assert.equal(result.details.doubleRewardTriggered,
      scenario==='boundary'||scenario.startsWith('doubled'));
    assert.deepEqual(result.world.market.wholesale,start.market.wholesale);
  }
});
test('R2-D source material clipping and time accounting remain shared and CAS atomic',()=>{
  const repo=seed();
  const before=repo.read();
  const three=use(repo,79,{requestedCount:3});
  assert.equal(three.code,'COMMITTED',three.details?.reason);
  assert.equal(three.details.effectiveCount,2);
  assert.equal(three.world.shops[0].item[78],1);
  assert.deepEqual([9,12,14].map(id=>three.world.shops[0].item[id-1]),
    [2,2,2]);
  assert.equal(three.world.shops[0].time,before.shops[0].time+3600);
  assert.equal(three.details.moneySpent,0);
  rejectedWithoutChange(repo,{itemId:79,requestedCount:1});
});
test('R2-D source invalid USE, unknown callbacks, stale revision and malformed sample reject atomically',()=>{
  const repo=ownsMap(),oracle=perl('original-b63-sword-map-all-outcomes-probe.pl','mixed');
  const good=oracle.originalSamples;
  for(const command of [
    {itemId:999},{itemId:14,useId:1},{itemId:79,useId:4},
    {itemId:14,randomDraws:good.slice(0,-1)},
    {itemId:14,randomDraws:[...good,0]},
    {itemId:14,randomDraws:[1000000,...good.slice(1)]},
    {itemId:14,randomDraws:good,callback:'unreviewed'},
    {itemId:14,randomDraws:good,randomSeed:123},
  ])rejectedWithoutChange(repo,command);
  rejectedWithoutChange(repo,{
    itemId:14,randomDraws:good,
    expectedRevision:repo.read().revision-1,
  },'REVISION_CONFLICT');
});
test('R2-D source money/time/corrupt EXP reject without modifying WorldState',()=>{
  const owned=ownsMap().read();
  const samples=perl('original-b63-sword-map-all-outcomes-probe.pl','mixed').originalSamples;
  for(const change of [
    shop=>({...shop,money:11999}),
    shop=>({...shop,time:owned.nowSeconds-7100}),
    shop=>({...shop,exp:{14:1001}}),
    shop=>({...shop,item:shop.item.map((v,i)=>i===13?0:v)}),
  ]){
    const snapshot=validateMemoryWorld({
      ...owned,shops:owned.shops.map((shop,i)=>i===0?change(shop):shop),
    });
    rejectedWithoutChange(createMemoryWorldAdapter(snapshot),{
      itemId:14,randomDraws:samples,
    });
  }
});
test('R2-D unreviewed doubling/lostbook and additional sword outputs fail closed without B-63 helper',()=>{
  const repo=ownsMap(),world=repo.read();
  const scenarios=['doubled','mixed-loss','mixed'].map(x=>
    perl('original-b63-sword-map-all-outcomes-probe.pl',x));
  for(const evidence of scenarios){
    const before=encodeMemorySnapshot(repo.read());
    const x=executeMemoryCommand({repository:repo,
      streetModule:limitedStreet,
      command:{kind:'use-item',expectedRevision:world.revision,
        shopId:1,itemId:14,useId:0,requestedCount:1,
        randomDraws:evidence.originalSamples}});
    assert.equal(x.code,'SOURCE_BOUNDARY_REJECTED');
    assert.equal(encodeMemorySnapshot(repo.read()),before);
  }
});
test('R2-D source callback drift and unknown source USE cannot be silently ignored',()=>{
  assert.match(street.useItem.describe(79,1),/original USE effects|no reviewed USE/);
  assert.match(street.useItem.describe(14,1),/no reviewed USE/);
  assert.throws(()=>createStandardStreetModule({
    ...sources,
    itemDsl:sources.itemDsl.replace(
      'return 0 if rand(1000)>100;',
      'return 0 if rand(1000)>100;\n$DT->{money}+=100;'),
  }),/B-63|PLUS source metadata/);
});
