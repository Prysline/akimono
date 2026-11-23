/**
 * R2 #62/1 in-memory two-shop source difference against frozen Perl:
 * true UseItem + original target inline callback + one WorldState CAS.
 * Intentionally NOT a browser HTTP, auth or B-43 persistence test.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path,{join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {createMemoryWorld,createMemoryWorldAdapter,
  executeMemoryCommand,validateMemoryWorld,encodeMemorySnapshot}
  from '../src/game-core-contract.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const files=[
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
const sources=Object.fromEntries(await Promise.all(files.map(
  async ([key,file])=>[key,await readFile(join(root,file),'utf8')])));
const street=createStandardStreetModule(sources);
function seed(){
  const repo=createMemoryWorldAdapter(createMemoryWorld({
    worldId:'r2-original-target-advertisement',
    streetId:'standard-street',nowSeconds:1000000,
  }));
  for(const [kind,fields] of [
    ['initialize-source-market',{}],
    ['open-shop',{shopId:1,ownerName:'宣傳者',shopName:'自家廣告來源店'}],
    ['open-shop',{shopId:2,ownerName:'目標者',shopName:'目標廣告來源店'}],
  ]){
    const result=executeMemoryCommand({repository:repo,streetModule:street,
      command:{kind,expectedRevision:repo.read().revision,...fields}});
    assert.equal(result.code,'COMMITTED',result.details?.reason);
  }
  return repo.read();
}
function fixture({rank=5000,actorRank=5010,job=''}={}){
  const original=seed();
  const actors=original.shops.map((shop,i)=>({
    ...shop,rank:i===0?actorRank:rank,
    ...(i===0?{
      item:shop.item.map((n,j)=>j===61?1:n),
      time:956800,money:100000,job,
    }:{}),
  }));
  return validateMemoryWorld({...original,shops:actors});
}
function compare(options={}){
  const world=fixture(options),rule=street.useItem.getRule(62,1);
  assert.equal(rule.source,'original-reviewed-target-advertisement-memory-only');
  assert.equal(rule.time,18000);
  assert.equal(rule.exptime,18000);
  assert.equal(rule.experienceCallback,undefined);
  const oracle=JSON.parse(execFileSync('perl',[
    'original-r2-target-advertise-use-probe.pl',JSON.stringify({
      itemId:62,useId:1,stock:world.shops[0].item,
      targetStock:world.shops[1].item,
      rank:world.shops[0].rank,targetRank:world.shops[1].rank,
      job:world.shops[0].job,
      exp:world.shops[0].exp,
      wholesale:world.market.wholesale,
      money:world.shops[0].money,
      paytoday:world.shops[0].paytoday,time:world.shops[0].time,
      nowSeconds:world.nowSeconds,requestedCount:1,randomDraws:[],
    }),
  ],{cwd:join(root,'modern/tests/original-perl'),
    encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024}));
  assert.equal(oracle.compiled.time,rule.time);
  assert.equal(oracle.compiled.exptime,rule.exptime);
  assert.equal(oracle.compiled.exp,0);
  assert.deepEqual(oracle.compiled.use.map(x=>[
    x.no,x.count,x.proba,
  ]),[[62,1,1000]]);
  const repo=createMemoryWorldAdapter(world);
  const command={kind:'use-item',expectedRevision:world.revision,
    shopId:1,targetShopId:2,itemId:62,useId:1,requestedCount:1};
  const result=executeMemoryCommand({repository:repo,streetModule:street,command});
  assert.equal(result.code,'COMMITTED',result.details?.reason);
  const [actor,target]=result.world.shops;
  assert.equal(result.world.revision,world.revision+1);
  assert.equal(result.details.targetShopId,2);
  assert.equal(result.details.effectiveCount,oracle.result.count);
  assert.deepEqual(actor.item,oracle.result.stock);
  assert.deepEqual(target.item,oracle.result.targetStock);
  assert.deepEqual(actor.exp,oracle.result.exp);
  assert.equal(actor.rank,oracle.result.rank);
  assert.equal(target.rank,oracle.result.targetRank);
  assert.equal(actor.money,oracle.result.money);
  assert.equal(actor.paytoday,oracle.result.paytoday);
  assert.equal(actor.time,oracle.result.time);
  assert.deepEqual(result.world.market.wholesale,oracle.result.wholesale);
  assert.deepEqual(result.details.originalUseItem,oracle.result.useitem);
  assert.deepEqual(result.details.originalUseMsg,oracle.result.usemsg);
  assert.deepEqual(result.details.originalAddItem,oracle.result.additem);
  assert.deepEqual(result.details.originalAddMsg,oracle.result.addmsg);
  assert.equal(result.details.originalFunctionReturn,oracle.result.functionReturn);
  assert.deepEqual(result.details.originalInlineLogCalls,oracle.result.logs);
  assert.equal(result.details.experienceGain,0);
  assert.equal(result.details.randomDrawsUsed,0);
  assert.equal(oracle.result.drawsUsed,0);
  assert.deepEqual(oracle.result.randomRanges,[]);
  assert.equal(target.money,world.shops[1].money);
  assert.equal(target.time,world.shops[1].time);
  return result;
}
test('R2 #62/1 frozen Perl two-shop rank, logs, no RNG/EXP and shared CAS',()=>{
  for(const rank of [0,1000,4999,5010,9000,9999,10000])
    compare({rank});
});
test('R2 #62/1 peddler receives no unlisted job speedup',()=>{
  compare({rank:5000,job:'peddle'});
});
test('R2 #62/1 invalid/own/missing targets and stale revision reject atomically',()=>{
  const world=fixture(),repo=createMemoryWorldAdapter(world);
  for(const override of [
    {targetShopId:1},{targetShopId:3},{targetShopId:0},
    {targetShopId:'2'},{targetShopId:2,requestedCount:2},
    {targetShopId:2,randomDraws:[500000]},
    {targetShopId:2,callback:'fake'},
    {targetShopId:2,expectedRevision:world.revision-1},
    {itemId:62,useId:0,targetShopId:2},
    {itemId:65,useId:0,targetShopId:2},
  ]){
    const before=encodeMemorySnapshot(repo.read());
    const result=executeMemoryCommand({repository:repo,streetModule:street,
      command:{kind:'use-item',expectedRevision:world.revision,
        shopId:1,itemId:62,useId:1,requestedCount:1,...override}});
    assert.equal(result.ok,false,JSON.stringify(override));
    assert.equal(encodeMemorySnapshot(repo.read()),before);
  }
});
test('R2 #62/1 target status/guild/out-of-bounds ranks are not mutable',()=>{
  const world=fixture();
  for(const targetPatch of [
    {status:0},{guild:'untrusted'},{rank:10001},
    {rank:-1},{shopname:''},
  ]){
    const changed=validateMemoryWorld({...world,
      shops:[world.shops[0],{...world.shops[1],...targetPatch}]});
    const repo=createMemoryWorldAdapter(changed);
    const prior=encodeMemorySnapshot(repo.read());
    const result=executeMemoryCommand({repository:repo,streetModule:street,
      command:{kind:'use-item',expectedRevision:changed.revision,
        shopId:1,targetShopId:2,itemId:62,useId:1,requestedCount:1}});
    assert.equal(result.code,'SOURCE_BOUNDARY_REJECTED',JSON.stringify(targetPatch));
    assert.equal(encodeMemorySnapshot(repo.read()),prior);
  }
});
test('R2 #62/1 reviewed source declaration and inline Perl changes fail closed',()=>{
  for(const [from,to] of [
    ['target|nocount','nocount'],
    ['exp\t0%','exp\t10%'],
    ['$DTS->{rank}+=$up;','$DTS->{rank}-=$up;'],
  ]){
    const changed=sources.itemDsl.replace(from,to);
    assert.notEqual(changed,sources.itemDsl);
    assert.throws(()=>createStandardStreetModule({...sources,itemDsl:changed}),
      /source|advertis|drift|original/i);
  }
});
