/**
 * Seven original mountain/mine gathering USEs: source DSL, shared GameCore
 * and frozen Perl GetBuffer/UseItem/MakeAmount/lostbook differential.
 * In-memory original-world fixture, NOT complete durable player proof.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path,{join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {projectOriginalUseTransaction} from '../src/original-use-transaction-model.mjs';
import {originalSourceUseClock} from '../src/shared-use-experience.mjs';
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
  async ([key,p])=>[key,await readFile(join(root,p),'utf8')])));
const street=createStandardStreetModule(sources);
function makeWorld(){
  const memory=createMemoryWorldAdapter(createMemoryWorld({
    worldId:'gathering-map-oracle',streetId:'standard-street',nowSeconds:1000000,
  }));
  const send=(kind,extra={})=>executeMemoryCommand({repository:memory,
    streetModule:street,command:{kind,expectedRevision:memory.read().revision,
      ...extra}});
  assert.equal(send('initialize-source-market').code,'COMMITTED');
  assert.equal(send('open-shop',{shopId:1,ownerName:'原版採集',
    shopName:'山區礦山驗證'}).code,'COMMITTED');
  assert.equal(send('use-item',{shopId:1,itemId:79,useId:0,
    requestedCount:1}).code,'COMMITTED');
  return validateMemoryWorld({...memory.read(),shops:[{
    ...memory.read().shops[0],time:956800,
  }]});
}
function oracle(rule,world,draws){
  const s=world.shops[0];
  return JSON.parse(execFileSync('perl',[
    'original-r2-gathering-use-probe.pl',JSON.stringify({
      itemId:rule.itemId,useId:rule.useId,
      stock:s.item,wholesale:world.market.wholesale,
      exp:s.exp??{},money:s.money,paytoday:s.paytoday,time:s.time,
      job:s.job??'',nowSeconds:world.nowSeconds,randomDraws:draws,
    }),
  ],{cwd:join(root,'modern/tests/original-perl'),encoding:'utf8',
    timeout:30000,maxBuffer:4*1024*1024}));
}
function compare(itemId,useId,{destroy=false,job=''}={}){
  const rule=street.useItem.getRule(itemId,useId);
  assert.equal(rule.source,'original-gather-lostbook-use-dsl');
  const base=makeWorld(),old=base.shops[0];
  const world=validateMemoryWorld({...base,shops:[{...old,job}]});
  const clock=originalSourceUseClock({rule,job,experience:0});
  const dry=projectOriginalUseTransaction({
    shops:world.shops.map(x=>x.item),actingShopIndex:0,
    items:rule.limits,wholesale:world.market.wholesale,
    uses:rule.uses,creates:rule.creates,requestedCount:1,
    experience:0,experienceOld:0,needExperience:0,job,
    needJob:'',point:0,needPoint:0,rank:old.rank,needPopularity:0,
    needsEvent:false,eventActive:false,money:old.money,
    costPerUse:0,paytoday:old.paytoday,nowSeconds:world.nowSeconds,
    storedTimeSeconds:old.time,baseUseTimeSeconds:clock.base,
    trainedUseTimeSeconds:clock.trained,maxStockTimeSeconds:259200,
    shopStatus:true,random:()=>0.5,
  });
  assert.equal(dry.performed,true);
  const draws=[...Array(dry.multiItem.randomDraws).fill(500000),
    destroy?0:999999];
  const truth=oracle(rule,world,draws);
  assert.equal(truth.compiled.time,rule.time);
  assert.equal(truth.compiled.exptime,rule.exptime);
  assert.equal(truth.compiled.exp,20);
  assert.equal(truth.compiled.param,10);
  assert.deepEqual(truth.compiled.creates.map(x=>[
    x.no,x.count,x.proba]),rule.creates.map(x=>[
      x.itemId,x.countPerUse,x.probabilityPermille]));
  const memory=createMemoryWorldAdapter(world);
  const result=executeMemoryCommand({repository:memory,streetModule:street,
    command:{kind:'use-item',expectedRevision:world.revision,shopId:1,
      itemId,useId,requestedCount:1,randomDraws:draws}});
  assert.equal(result.code,'COMMITTED',
    itemId+'/'+useId+': '+result.details?.reason);
  assert.equal(result.details.randomDrawsUsed,truth.result.drawsUsed);
  assert.deepEqual(result.world.shops[0].item,truth.result.stock);
  assert.deepEqual(result.world.market.wholesale,truth.result.wholesale);
  assert.deepEqual(result.world.shops[0].exp,truth.result.exp);
  assert.equal(result.world.shops[0].time,truth.result.time);
  assert.equal(result.world.shops[0].money,truth.result.money);
  assert.deepEqual(result.details.originalAddItem,truth.result.additem);
  assert.deepEqual(result.details.originalAddMsg,truth.result.addmsg);
  assert.deepEqual(result.details.originalUseItem,truth.result.useitem);
  assert.deepEqual(result.details.originalUseMsg,truth.result.usemsg);
  assert.equal(result.details.originalFunctionReturn,truth.result.functionReturn);
  assert.equal(result.details.mapDestroyed,destroy);
}
test('seven source map gathering USEs match frozen Perl',()=>{
  for(const [itemId,count] of [[12,4],[9,3]])
    for(let useId=0;useId<count;useId++)compare(itemId,useId);
});
test('source lostbook destroys only the used map, after outputs',()=>{
  compare(12,0,{destroy:true});
  compare(9,2,{destroy:true});
});
test('mountain profession reduces only declared first-USE clock',()=>{
  compare(12,0,{job:'material'});
  compare(9,0,{job:'material'});
  compare(12,2,{job:'material'});
});
test('unowned map and unsupported source callback fail atomically',()=>{
  const world=makeWorld();
  const noMap=validateMemoryWorld({...world,shops:[{
    ...world.shops[0],item:world.shops[0].item.map((v,i)=>
      i===11?0:v),
  }]});
  const memory=createMemoryWorldAdapter(noMap);
  const before=encodeMemorySnapshot(noMap);
  const response=executeMemoryCommand({repository:memory,streetModule:street,
    command:{kind:'use-item',expectedRevision:noMap.revision,
      shopId:1,itemId:12,useId:0,requestedCount:1}});
  assert.equal(response.code,'SOURCE_BOUNDARY_REJECTED');
  assert.equal(encodeMemorySnapshot(memory.read()),before);
  assert.throws(()=>createStandardStreetModule({...sources,
    itemDsl:sources.itemDsl.replace('param\t10\n\t\tngmsg\t什麼都沒找到…',
      'param\t15\n\t\tngmsg\t什麼都沒找到…'),
  }),/drift|source|unsupported/i);
});
