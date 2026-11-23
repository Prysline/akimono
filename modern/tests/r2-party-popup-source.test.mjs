/**
 * Source #77 festival party: full frozen Perl UseItem + popup callback
 * against shared GameCore, including original rank rounding and logs.
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
    worldId:'r2-party-source',streetId:'standard-street',
    nowSeconds:1000000,
  }));
  for(const [kind,attrs] of [
    ['initialize-source-market',{}],
    ['open-shop',{shopId:1,ownerName:'節慶測試',shopName:'慶祝來源驗證店'}],
  ]){
    const result=executeMemoryCommand({repository,streetModule:street,
      command:{kind,expectedRevision:repository.read().revision,...attrs}});
    assert.equal(result.code,'COMMITTED');
  }
  return repository.read();
}
function compare(rank){
  const rule=street.useItem.getRule(77,0);
  assert.equal(rule.source,'original-reviewed-celebration-popup');
  assert.equal(rule.time,7200);
  assert.equal(rule.singleUseOnly,true);
  assert.deepEqual(rule.sourceUseMessages,['明天的活力正在沸騰']);
  const initial=fresh(),stock=[...initial.shops[0].item];
  stock[76]=1;
  const world=validateMemoryWorld({...initial,shops:[{
    ...initial.shops[0],item:stock,rank,money:100000,time:956800,
  }]});
  const oracle=JSON.parse(execFileSync('perl',[
    'original-r2-party-use-probe.pl',
    JSON.stringify({itemId:77,useId:0,rank,stock,
      wholesale:world.market.wholesale,
      money:100000,paytoday:0,time:956800,
      nowSeconds:world.nowSeconds}),
  ],{cwd:join(root,'modern/tests/original-perl'),
    encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024}));
  assert.equal(oracle.compiled.time,rule.time);
  assert.equal(oracle.compiled.exptime,rule.exptime);
  assert.equal(oracle.compiled.param1,1000);
  assert.equal(oracle.compiled.param2,'開了派對');
  assert.deepEqual(oracle.compiled.use.map(x=>[x.no,x.count,x.proba]),
    [[77,1,1000]]);
  const repo=createMemoryWorldAdapter(world);
  const result=executeMemoryCommand({repository:repo,streetModule:street,
    command:{kind:'use-item',expectedRevision:world.revision,shopId:1,
      itemId:77,useId:0,requestedCount:1}});
  assert.equal(result.code,'COMMITTED',result.details?.reason);
  const after=result.world.shops[0];
  assert.equal(result.details.effectiveCount,oracle.result.count);
  assert.equal(after.rank,oracle.result.rank);
  assert.deepEqual(after.item,oracle.result.stock);
  assert.equal(after.money,oracle.result.money);
  assert.equal(after.time,oracle.result.time);
  assert.equal(after.paytoday,oracle.result.paytoday);
  assert.deepEqual(result.world.market.wholesale,oracle.result.wholesale);
  assert.deepEqual(after.exp??{},oracle.result.exp);
  assert.deepEqual(result.details.originalUseItem,oracle.result.useitem);
  assert.deepEqual(result.details.originalUseMsg,oracle.result.usemsg);
  assert.deepEqual(result.details.originalAddItem,oracle.result.additem);
  assert.deepEqual(result.details.originalAddMsg,oracle.result.addmsg);
  assert.equal(result.details.originalFunctionReturn,
    oracle.result.functionReturn);
  assert.deepEqual(result.details.originalInlineLogCalls,oracle.result.logs);
  assert.equal(result.details.randomDrawsUsed,0);
  return result;
}
test('R2 #77 original party popup rank formula matches true frozen Perl',()=>{
  for(const rank of [0,1,1000,5010,8000,9999,10000])
    compare(rank);
});
test('R2 #77 party consumes one gift and is single-use source gated',()=>{
  const rule=street.useItem.getRule(77,0);
  assert.equal(rule.requiresOwnedItem,true);
  const initial=fresh();
  for(const [hasItem,count] of [[false,1],[true,2]]){
    const stock=[...initial.shops[0].item];stock[76]=hasItem?1:0;
    const world=validateMemoryWorld({...initial,shops:[{
      ...initial.shops[0],item:stock,
    }]});
    const repo=createMemoryWorldAdapter(world);
    const before=encodeMemorySnapshot(repo.read());
    const result=executeMemoryCommand({repository:repo,
      streetModule:street,command:{kind:'use-item',
        expectedRevision:world.revision,shopId:1,
        itemId:77,useId:0,requestedCount:count}});
    assert.equal(result.code,'SOURCE_BOUNDARY_REJECTED');
    assert.equal(encodeMemorySnapshot(repo.read()),before);
  }
});
test('R2 #77 source popup formula/param drift must fail closed',()=>{
  for(const [from,to] of [
    ['my $up=int($USE->{param1}*(2-$DT->{rank}/5000));',
      'my $up=int($USE->{param1}*(2-$DT->{rank}/4000));'],
    ['param\t1000,開了派對','param\t800,開了派對'],
  ]){
    const changed=sources.itemDsl.replace(from,to);
    assert.notEqual(changed,sources.itemDsl);
    assert.throws(()=>createStandardStreetModule({...sources,itemDsl:changed}),
      /source|popup|callback|drift/i);
  }
});
test('R2 all 110 registered USEs include exactly one party popup',()=>{
  const world=fresh(),offers=street.listUseOffers(world);
  assert.equal(offers.length,110);
  const party=offers.filter(x=>x.itemId===77);
  assert.equal(party.length,1);
  assert.equal(party[0].canUse,false);
  assert.equal(world.shops[0].item[76],0);
});
