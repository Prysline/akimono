/**
 * R2 pure #79 USE #1..#4: same shared GameCore, source-run frozen Perl
 * (GetBuffer/GetItemNumber + UseItem + CheckWholeStore) for every recipe.
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

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const paths=[
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
const model=createStandardStreetModule(Object.fromEntries(
  await Promise.all(paths.map(async ([name,relative])=>[
    name,await readFile(join(root,relative),'utf8'),
  ]))));
function sourceWorld(){
  const repo=createMemoryWorldAdapter(createMemoryWorld({
    worldId:'r2-gift-source-exchanges',streetId:'standard-street',
    nowSeconds:1000000,
  }));
  const command=(kind,opts={})=>executeMemoryCommand({
    repository:repo,streetModule:model,
    command:{kind,expectedRevision:repo.read().revision,...opts},
  });
  assert.equal(command('initialize-source-market').code,'COMMITTED');
  assert.equal(command('open-shop',{shopId:1,
    ownerName:'原版無回呼禮券測試',shopName:'真來源玩家店舖'}).code,'COMMITTED');
  return repo.read();
}
function perlVariant(useId,initialGift=5){
  return JSON.parse(execFileSync('perl',[
    'original-r2-gift-use-variants-probe.pl',
    JSON.stringify({useId,initialGift,requestedCount:1}),
  ],{cwd:join(root,'modern/tests/original-perl'),encoding:'utf8',
    timeout:15000}));
}
test('R2 all four originally callback-free gift USEs compile into source-backed executable Registry',()=>{
  const offers=model.listUseOffers(sourceWorld());
  assert.deepEqual(offers.map(x=>[x.itemId,x.useId]),
    [[79,0],[79,1],[79,2],[79,3],[79,4],[14,0]]);
  assert.deepEqual(offers.slice(1,5).map(x=>x.canUse),
    [true,false,true,true]);
  for(const useId of [1,2,3,4]){
    const rule=model.useItem.getRule(79,useId);
    assert.equal(rule.useId,useId);
    assert.equal(rule.source,'original-pure-gift-dsl');
    assert.equal(rule.beforeCallback,undefined);
    assert.equal(rule.afterCallback,undefined);
  }
});
test('R2 #79 USE #1..#4 results compare original Perl per stock/wholesale/economy/log',()=>{
  for(const useId of [1,2,3,4]){
    const origin=perlVariant(useId,useId===2?10:5);
    const expected=origin.result;
    const base=sourceWorld();
    const initialGift=useId===2?10:5;
    const world=initialGift===5?base:validateMemoryWorld({
      ...base,shops:base.shops.map(s=>({...s,item:s.item.map((v,i)=>
        i===78?initialGift:v)})),
    });
    const repo=createMemoryWorldAdapter(world);
    const before=encodeMemorySnapshot(repo.read());
    const result=executeMemoryCommand({repository:repo,streetModule:model,
      command:{kind:'use-item',expectedRevision:world.revision,
        shopId:1,itemId:79,useId,requestedCount:1}});
    assert.equal(result.code,'COMMITTED',result.details?.reason);
    const s=result.world.shops[0];
    assert.equal(result.details.effectiveCount,expected.count);
    assert.deepEqual(s.item,expected.item);
    assert.deepEqual(result.world.market.wholesale,expected.wholesale);
    assert.equal(s.money,expected.money);
    assert.equal(s.time,expected.time);
    assert.equal(s.paytoday,expected.paytoday);
    assert.deepEqual(result.details.originalUseItem,expected.useitem);
    assert.deepEqual(result.details.originalAddItem,expected.additem);
    assert.deepEqual(result.details.originalUseMsg,expected.usemsg);
    assert.deepEqual(result.details.originalAddMsg,expected.addmsg);
    assert.notEqual(encodeMemorySnapshot(repo.read()),before);
  }
});
test('R2 original #79 USE #2 cannot be executed from initial 5-voucher world',()=>{
  const world=sourceWorld();
  const repo=createMemoryWorldAdapter(world);
  const initial=encodeMemorySnapshot(world);
  const expected=perlVariant(2,5);
  assert.equal(expected.result.count,0);
  const result=executeMemoryCommand({repository:repo,streetModule:model,
    command:{kind:'use-item',expectedRevision:world.revision,
      shopId:1,itemId:79,useId:2,requestedCount:1}});
  assert.equal(result.code,'SOURCE_BOUNDARY_REJECTED');
  assert.equal(encodeMemorySnapshot(repo.read()),initial);
});
