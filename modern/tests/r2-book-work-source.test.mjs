/**
 * #13/0 and #13/1: frozen Perl GetBuffer -> original Core UseItem ->
 * original Standard Street _local_1, compared against the shared GameCore
 * and B-27 money formatter/logs. This is memory differential, not a
 * claim that B-43 allows arbitrary cash provenance.
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
  const repo=createMemoryWorldAdapter(createMemoryWorld({
    worldId:'r2-work-oracle',streetId:'standard-street',
    nowSeconds:1000000,
  }));
  for(const [kind,attrs] of [
    ['initialize-source-market',{}],
    ['open-shop',{shopId:1,ownerName:'打工測試',shopName:'來源製作驗證店'}],
  ]){
    const result=executeMemoryCommand({
      repository:repo,streetModule:street,
      command:{kind,expectedRevision:repo.read().revision,...attrs},
    });
    assert.equal(result.code,'COMMITTED');
  }
  return repo.read();
}
function compare(useId,{count=1,job='',withBook=true}={}){
  const rule=street.useItem.getRule(13,useId);
  assert.equal(rule?.source,'original-reviewed-book-work-inline');
  assert.equal(rule?.requiresOwnedItem,true);
  assert.equal(rule?.ownedMaximum,1);
  const base=fresh(),old=base.shops[0];
  const stock=[...old.item];
  stock[12]=withBook?1:0;
  const world=validateMemoryWorld({...base,shops:[{
    ...old,item:stock,time:956800,money:100000,job,
  }]});
  const payload={itemId:13,useId,stock,wholesale:world.market.wholesale,
    job,money:100000,paytoday:0,time:956800,exp:{},
    nowSeconds:world.nowSeconds,rank:old.rank,requestedCount:count};
  const oracle=JSON.parse(execFileSync('perl',[
    'original-r2-book-work-use-probe.pl',JSON.stringify(payload),
  ],{cwd:join(root,'modern/tests/original-perl'),
    encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024}));
  assert.equal(oracle.compiled.time,rule.time);
  assert.equal(oracle.compiled.exptime,rule.exptime);
  assert.equal(oracle.compiled.param,rule.inlineCallback.param);
  const repository=createMemoryWorldAdapter(world);
  const before=encodeMemorySnapshot(repository.read());
  const result=executeMemoryCommand({repository,streetModule:street,
    command:{kind:'use-item',expectedRevision:world.revision,
      shopId:1,itemId:13,useId,requestedCount:count}});
  if(!withBook){
    assert.equal(result.code,'SOURCE_BOUNDARY_REJECTED');
    assert.equal(encodeMemorySnapshot(repository.read()),before);
    return;
  }
  assert.equal(result.code,'COMMITTED',result.details?.reason);
  assert.equal(result.details.effectiveCount,oracle.result.count);
  assert.equal(result.world.shops[0].money,oracle.result.money);
  assert.equal(result.world.shops[0].time,oracle.result.time);
  assert.equal(result.world.shops[0].paytoday,oracle.result.paytoday);
  assert.equal(result.world.shops[0].rank,oracle.result.rank);
  assert.deepEqual(result.world.shops[0].item,oracle.result.stock);
  assert.deepEqual(result.world.market.wholesale,oracle.result.wholesale);
  assert.deepEqual(result.world.shops[0].exp??{},oracle.result.exp);
  assert.deepEqual(result.details.originalUseItem,oracle.result.useitem);
  assert.deepEqual(result.details.originalAddItem,oracle.result.additem);
  assert.deepEqual(result.details.originalUseMsg,oracle.result.usemsg);
  assert.deepEqual(result.details.originalAddMsg,oracle.result.addmsg);
  assert.equal(result.details.originalFunctionReturn,oracle.result.returned);
  assert.deepEqual(result.details.originalInlineLogCalls,oracle.result.logs);
  assert.equal(result.details.randomDrawsUsed,0);
}
test('R2 work #13/0/#13/1 matches true source Perl and B-27 yen logs',()=>{
  compare(0);
  compare(1);
  compare(0,{count:3});
  compare(1,{count:2,job:'peddle'});
  compare(0,{count:4,job:'peddle'});
});
test('R2 source book must be owned before work without gifting cash',()=>{
  compare(0,{withBook:false});
  compare(1,{withBook:false});
});
test('R2 unreviewed work money/alias source drift fails closed',()=>{
  for(const [from,to] of [
    ['$DT->{money}+=$USE->{param1}*$count;',
      '$DT->{money}+=$USE->{param1}*$count*2;'],
    ['param\t10000','param\t99999'],
  ]){
    const changed=sources.itemDsl.replace(from,to);
    assert.notEqual(changed,sources.itemDsl);
    assert.throws(()=>createStandardStreetModule({...sources,itemDsl:changed}),
      /source|work|changed|drift/i);
  }
});
