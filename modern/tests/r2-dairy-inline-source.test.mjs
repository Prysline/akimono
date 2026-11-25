/**
 * Real frozen source Perl callback, not a written expected result.
 * Tests all R2 #25/0-1 and #26/0 inline USEs through shared GameCore.
 * Separately proves these source-executable worlds are not implicitly
 * accepted by the B-43 durable-save validator.
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
function fresh(){
  const repo=createMemoryWorldAdapter(createMemoryWorld({
    worldId:'r2-cow-inline-source',streetId:'standard-street',
    nowSeconds:1000000,
  }));
  for(const [kind,attrs] of [
    ['initialize-source-market',{}],
    ['open-shop',{shopId:1,ownerName:'來源酪農',shopName:'乳製品來源店'}],
  ]){
    const cmd={kind,expectedRevision:repo.read().revision,...attrs};
    assert.equal(executeMemoryCommand({repository:repo,
      streetModule:street,command:cmd}).code,'COMMITTED');
  }
  return repo.read();
}
function original(rule,world,requestedCount,randomDraws){
  const s=world.shops[0];
  return JSON.parse(execFileSync('perl',[
    'original-r2-dairy-inline-use-probe.pl',
    JSON.stringify({itemId:rule.itemId,useId:rule.useId,
      stock:s.item,wholesale:world.market.wholesale,exp:s.exp??{},
      money:s.money,paytoday:s.paytoday,time:s.time,
      rank:s.rank,job:s.job??'',nowSeconds:world.nowSeconds,
      requestedCount,randomDraws}),
  ],{cwd:join(root,'modern/tests/original-perl'),
    encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024}));
}
function compare(itemId,useId,{
  count=1,job='',rank=5010,draws=null,missingCow=false,
  cows=3,milkStock=40,storedTime=956800,expectedCount=null,
}={}){
  const rule=street.useItem.getRule(itemId,useId);
  assert.equal(rule?.source,'original-reviewed-dairy-inline-use');
  assert.equal(rule.inlineCallback.kind,itemId===25?'milk-cow':'drink-milk');
  const initial=fresh(),old=initial.shops[0];
  const stock=[...old.item];
  if(itemId===25){stock[24]=missingCow?0:cows;stock[25]=milkStock===40?0:milkStock;}
  else stock[25]=milkStock;
  const world=validateMemoryWorld({...initial,shops:[{
    ...old,item:stock,rank,job,money:100000,time:storedTime,exp:{},
  }]});
  const total=itemId===25?count+1:count<10?1:0;
  const randomDraws=draws??Array(total).fill(500000);
  const oracle=original(rule,world,count,randomDraws);
  assert.equal(oracle.compiled.time,rule.time);
  assert.equal(oracle.compiled.exptime,rule.exptime);
  assert.equal(oracle.compiled.exp,rule.experienceCallback?.points??0);
  assert.equal(oracle.compiled.money,rule.money);
  assert.deepEqual(oracle.compiled.uses.map(x=>
    [x.no,x.count,x.proba]),rule.uses.map(x=>
    [x.itemId,x.countPerUse,x.probabilityPermille]));
  const repo=createMemoryWorldAdapter(world);
  const snapshot=encodeMemorySnapshot(repo.read());
  const cmd={kind:'use-item',expectedRevision:world.revision,
    shopId:1,itemId,useId,requestedCount:count,
    ...(randomDraws.length?{randomDraws}:{})};
  const result=executeMemoryCommand({repository:repo,streetModule:street,
    command:cmd});
  if(missingCow){
    assert.equal(oracle.result.count,0);
    assert.equal(result.code,'SOURCE_BOUNDARY_REJECTED');
    assert.equal(encodeMemorySnapshot(repo.read()),snapshot);
    return;
  }
  assert.equal(result.code,'COMMITTED',result.details?.reason);
  assert.equal(result.details.effectiveCount,oracle.result.count);
  if(expectedCount!==null)assert.equal(oracle.result.count,expectedCount);
  assert.deepEqual(result.world.shops[0].item,oracle.result.stock);
  assert.equal(result.world.shops[0].rank,oracle.result.rank);
  assert.deepEqual(result.world.shops[0].exp??{},oracle.result.exp);
  assert.equal(result.world.shops[0].money,oracle.result.money);
  assert.equal(result.world.shops[0].paytoday,oracle.result.paytoday);
  assert.equal(result.world.shops[0].time,oracle.result.time);
  assert.deepEqual(result.world.market.wholesale,oracle.result.wholesale);
  assert.deepEqual(result.details.originalUseItem,oracle.result.useitem);
  assert.deepEqual(result.details.originalUseMsg,oracle.result.usemsg);
  assert.deepEqual(result.details.originalAddItem,oracle.result.additem);
  assert.deepEqual(result.details.originalAddMsg,oracle.result.addmsg);
  assert.equal(result.details.originalFunctionReturn,
    oracle.result.functionReturn);
  assert.deepEqual(result.details.originalInlineLogCalls,oracle.result.logs);
  assert.equal(result.details.randomDrawsUsed,oracle.result.drawsUsed);
}
test('R2 cow both variants source Perl milking output and cow death RNG',()=>{
  compare(25,0);compare(25,1);compare(25,0,{count:3,job:'cow'});
  compare(25,1,{count:3,job:'cow'});
  compare(25,0,{count:3,draws:[500000,0,0,0]});
  compare(25,1,{count:3,draws:[500000,0,0,0]});
});
test('R2 milk drinking uses original small/medium/large rank branches',()=>{
  compare(26,0,{count:1});
  compare(26,0,{count:9,rank:9999,draws:[500000],job:'cow'});
  compare(26,0,{count:10});
  compare(26,0,{count:30,rank:4});
  compare(26,0,{count:40,rank:10000});
});
test('R2 cow NEED missing rejects without callback RNG or world mutation',()=>{
  compare(25,0,{missingCow:true,draws:[]});
  compare(25,1,{missingCow:true,draws:[]});
});
test('R2 unknown dairy callback text fails closed',()=>{
  for(const [before,after] of [
    ['AddItem(26,$val,','AddItem(27,$val,'],
    ['if($count>=30)','if($count>=40)'],
  ]){
    const changed=sources.itemDsl.replace(before,after);
    assert.notEqual(changed,sources.itemDsl);
    assert.throws(()=>createStandardStreetModule({...sources,
      itemDsl:changed}),/R2 dairy inline source|drift|changed/i);
  }
});
test('R2 read-only milk acquisition hint points to source-reviewed cow callback',()=>{
  const original=fresh();
  const cowWorld=validateMemoryWorld({...original,shops:[{
    ...original.shops[0],
    item:original.shops[0].item.map((v,i)=>i===24?1:v),
  }]});
  const ferment=street.listUseOffers(cowWorld).find(x=>
    x.itemId===26&&x.useId===1);
  const milk=ferment.materialRoutes.find(x=>x.itemId===26);
  assert.equal(milk.kind,'registered-use');
  assert.deepEqual(milk.provider,{itemId:25,useId:0});
  assert.ok(milk.providerCandidates.some(x=>x.itemId===25&&x.useId===1));
  assert.equal(cowWorld.shops[0].item[25],0,
    'source hint must not grant milk as an inventory side effect');
});

// P4: controlled Perl differential only; these are not player acquisitions.
test('P4 dairy source clips requested count before callback RNG and rank branching',()=>{
  compare(25,0,{count:3,storedTime:996400,expectedCount:1,draws:[500000,500000]});
  compare(26,0,{count:40,milkStock:9,expectedCount:9,draws:[500000]});
});
test('P4 capped milk AddItem and partial cow mortality preserve original callback receipts',()=>{
  compare(25,0,{milkStock:2499,draws:[999999,500000]});
  compare(25,1,{milkStock:2500,draws:[999999,0]});
  compare(25,1,{count:3,cows:3,draws:[500000,0,500000,500000]});
});
