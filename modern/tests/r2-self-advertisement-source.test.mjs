/**
 * #62/0 exact source self-advertising using frozen Perl GetBuffer,
 * original UseItem, and isolated inline callback for rank/EXP/logs.
 * #62/1 and /2 and #65 target/guild/event effects stay unregistered.
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
const sources=Object.fromEntries(await Promise.all(sourcePaths.map(
  async ([key,file])=>[key,await readFile(join(root,file),'utf8')])));
const street=createStandardStreetModule(sources);

function fresh(){
  const repository=createMemoryWorldAdapter(createMemoryWorld({
    worldId:'r2-self-advertisement',streetId:'standard-street',
    nowSeconds:1000000,
  }));
  for(const [kind,attrs] of [
    ['initialize-source-market',{}],
    ['open-shop',{shopId:1,ownerName:'廣告驗證',shopName:'自家廣告來源店'}],
  ]){
    const result=executeMemoryCommand({repository,streetModule:street,
      command:{kind,expectedRevision:repository.read().revision,...attrs}});
    assert.equal(result.code,'COMMITTED');
  }
  return repository.read();
}
function compare({
  rank=5010,draw=500000,job='',initialExp=0,
}={}){
  const rule=street.useItem.getRule(62,0);
  assert.equal(rule?.source,'original-reviewed-self-advertisement');
  assert.equal(rule?.singleUseOnly,true);
  assert.equal(rule?.inlineCallback?.kind,'advertise-self');
  assert.equal(rule?.experienceCallback?.points,100);
  const initial=fresh(),stock=[...initial.shops[0].item];
  stock[61]=1;
  const exp=initialExp?{'62':initialExp}:{};
  const world=validateMemoryWorld({...initial,shops:[{
    ...initial.shops[0],item:stock,rank,job,exp,
    money:100000,time:956800,
  }]});
  const oracle=JSON.parse(execFileSync('perl',[
    'original-r2-self-advertise-use-probe.pl',JSON.stringify({
      itemId:62,useId:0,stock,exp,rank,job,
      wholesale:world.market.wholesale,money:100000,
      paytoday:0,time:956800,nowSeconds:world.nowSeconds,
      requestedCount:1,randomDraws:[draw],
    }),
  ],{cwd:join(root,'modern/tests/original-perl'),
    encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024}));
  assert.equal(oracle.compiled.time,rule.time);
  assert.equal(oracle.compiled.exptime,rule.exptime);
  assert.equal(oracle.compiled.exp,rule.experienceCallback.points);
  assert.deepEqual(oracle.compiled.use.map(x=>[
    x.no,x.count,x.proba,
  ]),[[62,1,1000]]);
  const repo=createMemoryWorldAdapter(world);
  const result=executeMemoryCommand({repository:repo,streetModule:street,
    command:{kind:'use-item',expectedRevision:world.revision,
      shopId:1,itemId:62,useId:0,requestedCount:1,
      randomDraws:[draw]}});
  assert.equal(result.code,'COMMITTED',result.details?.reason);
  const after=result.world.shops[0];
  assert.equal(result.details.effectiveCount,oracle.result.count);
  assert.equal(after.rank,oracle.result.rank);
  assert.deepEqual(after.item,oracle.result.stock);
  assert.deepEqual(after.exp,oracle.result.exp);
  assert.equal(after.money,oracle.result.money);
  assert.equal(after.time,oracle.result.time);
  assert.equal(after.paytoday,oracle.result.paytoday);
  assert.deepEqual(result.world.market.wholesale,oracle.result.wholesale);
  assert.deepEqual(result.details.originalUseItem,oracle.result.useitem);
  assert.deepEqual(result.details.originalUseMsg,oracle.result.usemsg);
  assert.deepEqual(result.details.originalAddItem,oracle.result.additem);
  assert.deepEqual(result.details.originalAddMsg,oracle.result.addmsg);
  assert.equal(result.details.originalFunctionReturn,
    oracle.result.functionReturn);
  assert.deepEqual(result.details.originalInlineLogCalls,oracle.result.logs);
  assert.equal(result.details.randomDrawsUsed,oracle.result.drawsUsed);
  assert.deepEqual(oracle.result.randomRanges,[1000]);
  return result;
}
test('R2 #62/0 original Perl self advertisement success/failure RNG boundary',()=>{
  for(const rank of [0,1000,5010,9000,10000]){
    compare({rank,draw:0});
    compare({rank,draw:249999});
    compare({rank,draw:250000});
    compare({rank,draw:999999});
  }
});
test('R2 #62/0 peddler clock and EXP at cap match frozen Perl',()=>{
  compare({rank:7000,draw:500000,job:'peddle'});
  compare({rank:1000,draw:0,job:'peddle',initialExp:900});
  compare({rank:9999,draw:250000,initialExp:1000});
});
test('R2 #62/0 exact RNG samples, ownership and nocount fail closed',()=>{
  const initial=fresh();
  for(const [hasItem,count,draws] of [
    [false,1,[]],[true,2,[500000]],[true,1,[]],
    [true,1,[500000,500000]],
  ]){
    const stock=[...initial.shops[0].item];
    stock[61]=hasItem?1:0;
    const world=validateMemoryWorld({...initial,shops:[{
      ...initial.shops[0],item:stock,
    }]});
    const repo=createMemoryWorldAdapter(world);
    const before=encodeMemorySnapshot(repo.read());
    const result=executeMemoryCommand({repository:repo,streetModule:street,
      command:{kind:'use-item',expectedRevision:world.revision,
        shopId:1,itemId:62,useId:0,requestedCount:count,
        ...(draws.length?{randomDraws:draws}:{})}});
    assert.equal(result.code,'SOURCE_BOUNDARY_REJECTED');
    assert.equal(encodeMemorySnapshot(repo.read()),before);
  }
});
test('R2 source #62 target and guild, and #65 target/event remain refused',()=>{
  assert.equal(street.listUseOffers(fresh()).length,111);
  for(const [itemId,useIds] of [
    [62,[1,2]],[65,[0,1,2]],
  ])
    for(const useId of useIds){
      assert.equal(street.useItem.getRule(itemId,useId),null);
      assert.match(street.useItem.describe(itemId,useId),/reviewed|source|original/i);
    }
});
test('R2 #62 source inline and job declaration changes are rejected',()=>{
  for(const [from,to] of [
    ['rand(1000)<250','rand(1000)<500'],
    ['exp\t10%','exp\t20%'],
    ['target|nocount','nocount'],
  ]){
    const changed=sources.itemDsl.replace(from,to);
    assert.notEqual(changed,sources.itemDsl);
    assert.throws(()=>createStandardStreetModule({...sources,itemDsl:changed}),
      /source|advertis|drift|original/i);
  }
});
