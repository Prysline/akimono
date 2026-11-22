/**
 * Original Standard Street #10/#37/#39: every callback-free USE runs the
 * same declarative compiler, effect plan and formal GameCore transaction.
 * Expectations are observed by executing frozen original Perl GetBuffer,
 * GetItemNumber, UseItem, MakeAmount and CheckWholeStore (not hand-written
 * success values). This is an in-memory original-world differential, NOT
 * proof that every recipe is reachable from a fresh player/save.
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
import {readCommonUseEffectPlan} from '../src/shared-use-effect-plan.mjs';
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
function createSourceWorld(){
  const repo=createMemoryWorldAdapter(createMemoryWorld({
    worldId:'r2-source-use-effects',streetId:'standard-street',
    nowSeconds:1000000,
  }));
  for(const [kind,attrs] of [
    ['initialize-source-market',{}],
    ['open-shop',{shopId:1,ownerName:'製作測試',shopName:'來源製作驗證店'}],
  ]){
    const response=executeMemoryCommand({repository:repo,streetModule:street,
      command:{kind,expectedRevision:repo.read().revision,...attrs}});
    assert.equal(response.code,'COMMITTED',response.details?.reason);
  }
  return repo.read();
}
function fixture(rule,{job='',missingNeed=false}={}){
  const initial=createSourceWorld();
  const old=initial.shops[0];
  const stock=[...old.item];
  for(const action of rule.uses){
    stock[action.itemId-1]=Math.max(stock[action.itemId-1],
      action.countPerUse);
  }
  if(missingNeed){
    const needed=rule.uses.find(x=>x.probabilityPermille===0);
    assert.ok(needed,'must select a NEED recipe');
    stock[needed.itemId-1]=0;
  }
  const exp=rule.needExperience?
    {[rule.itemId]:rule.needExperience}:{};
  const world=validateMemoryWorld({...initial,shops:[{
    ...old,item:stock,job,exp,time:956800,money:100000,
  }]});
  const shop=world.shops[0];
  const clock=originalSourceUseClock({rule,job,experience:exp[rule.itemId]??0});
  const dry=projectOriginalUseTransaction({
    shops:world.shops.map(s=>s.item),actingShopIndex:0,
    items:rule.limits,wholesale:world.market.wholesale,
    uses:rule.uses,creates:rule.creates,requestedCount:1,
    experience:exp[rule.itemId]??0,experienceOld:exp[rule.itemId]??0,
    needExperience:rule.needExperience??0,job,
    needJob:'',point:0,needPoint:0,rank:shop.rank,needPopularity:0,
    needsEvent:false,eventActive:false,money:shop.money,
    costPerUse:rule.money,paytoday:shop.paytoday,nowSeconds:world.nowSeconds,
    storedTimeSeconds:shop.time,baseUseTimeSeconds:clock.base,
    trainedUseTimeSeconds:clock.trained,maxStockTimeSeconds:259200,
    shopStatus:true,random:()=>0.5,
  });
  const randomDraws=Array(dry.multiItem?.randomDraws??0).fill(500000);
  return {world,randomDraws};
}
function frozenPerl(rule,world,randomDraws){
  const shop=world.shops[0];
  const payload={itemId:rule.itemId,useId:rule.useId,
    stock:shop.item,wholesale:world.market.wholesale,
    exp:shop.exp??{},money:shop.money,paytoday:shop.paytoday,
    time:shop.time,nowSeconds:world.nowSeconds,job:shop.job??'',
    requestedCount:1,randomDraws};
  return JSON.parse(execFileSync('perl',[
    'original-r2-declarative-use-probe.pl',JSON.stringify(payload),
  ],{cwd:join(root,'modern/tests/original-perl'),
    encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024}));
}
function compare(rule,{job='',missingNeed=false}={}){
  const {world,randomDraws}=fixture(rule,{job,missingNeed});
  const perl=frozenPerl(rule,world,randomDraws);
  const source=perl.compiled;
  assert.equal(source.time,rule.time);
  assert.equal(source.exptime,rule.exptime);
  assert.equal(source.exp,rule.experienceCallback?.points??0);
  assert.equal(source.money,rule.money);
  assert.equal(source.needexp,rule.needExperience);
  assert.deepEqual(source.uses.map(v=>[v.no,v.count,v.proba]),
    rule.uses.map(v=>[v.itemId,v.countPerUse,v.probabilityPermille]));
  assert.deepEqual(source.creates.map(v=>[v.no,v.count,v.proba]),
    rule.creates.map(v=>[v.itemId,v.countPerUse,v.probabilityPermille]));
  const repo=createMemoryWorldAdapter(world);
  const before=encodeMemorySnapshot(repo.read());
  const result=executeMemoryCommand({repository:repo,streetModule:street,
    command:{kind:'use-item',expectedRevision:world.revision,shopId:1,
      itemId:rule.itemId,useId:rule.useId,requestedCount:1,
      ...(randomDraws.length?{randomDraws}:{})}});
  if(missingNeed){
    assert.equal(perl.result.count,0,'original NEED must gate');
    assert.equal(result.code,'SOURCE_BOUNDARY_REJECTED');
    assert.equal(encodeMemorySnapshot(repo.read()),before);
    return;
  }
  assert.equal(result.code,'COMMITTED',
    rule.itemId+'/'+rule.useId+': '+result.details?.reason);
  assert.equal(result.details.effectiveCount,perl.result.count);
  assert.deepEqual(result.world.shops[0].item,perl.result.stock);
  assert.deepEqual(result.world.market.wholesale,perl.result.wholesale);
  assert.deepEqual(result.world.shops[0].exp??{},perl.result.exp);
  assert.equal(result.world.shops[0].time,perl.result.time);
  assert.equal(result.world.shops[0].money,perl.result.money);
  assert.equal(result.world.shops[0].paytoday,perl.result.paytoday);
  assert.deepEqual(result.details.originalUseItem,perl.result.useitem);
  assert.deepEqual(result.details.originalUseMsg,perl.result.usemsg);
  assert.deepEqual(result.details.originalAddItem,perl.result.additem);
  assert.deepEqual(result.details.originalAddMsg,perl.result.addmsg);
  assert.equal(result.details.randomDrawsUsed,perl.result.drawsUsed);
  assert.notEqual(encodeMemorySnapshot(repo.read()),before);
}
test('31 source recipes compile to reusable material, production and EXP effects',()=>{
  const offers=street.listUseOffers(createSourceWorld());
  assert.equal(offers.length,37);
  assert.deepEqual(offers.slice(0,6).map(v=>[v.itemId,v.useId]),
    [[79,0],[79,1],[79,2],[79,3],[79,4],[14,0]]);
  let n=0;
  for(const [itemId,count] of [[10,8],[37,4],[39,19]]){
    for(let useId=0;useId<count;useId++){
      const rule=street.useItem.getRule(itemId,useId);
      assert.equal(rule.source,'original-declarative-use-dsl');
      assert.equal(rule.beforeCallback,undefined);
      assert.equal(rule.afterCallback,undefined);
      assert.deepEqual(readCommonUseEffectPlan(rule).uses,rule.uses);
      assert.deepEqual(readCommonUseEffectPlan(rule).creates,rule.creates);
      n++;
    }
  }
  assert.equal(n,31);
  assert.equal(street.useItem.getRule(39,19),null);
});
test('every one of the 31 original #10/#37/#39 USEs matches frozen Perl',()=>{
  for(const [itemId,count] of [[10,8],[37,4],[39,19]]){
    for(let useId=0;useId<count;useId++){
      compare(street.useItem.getRule(itemId,useId));
    }
  }
});
test('source NEED is held but not consumed, including an atomic failure case',()=>{
  const rule=street.useItem.getRule(39,0);
  assert.ok(rule.uses.some(x=>x.probabilityPermille===0));
  compare(rule);
  compare(rule,{missingNeed:true});
});
test('source job clocks compare actual frozen Perl UseItem after source job formula',()=>{
  for(const [itemId,useId,job] of [
    [10,0,'book'],[39,0,'weapon'],[39,1,'armor'],[39,12,'tool'],
  ])compare(street.useItem.getRule(itemId,useId),{job});
});
test('effect plan or DSL drift cannot silently become a new executable USE',()=>{
  const rule=street.useItem.getRule(10,0);
  assert.throws(()=>readCommonUseEffectPlan({...rule,
    effectPlan:rule.effectPlan.map((op,i)=>i?op:
      {...op,actions:[]})}),/nonmatching material effect/);
  assert.throws(()=>createStandardStreetModule({...sources,
    itemDsl:sources.itemDsl.replace('name\t寫作『藥劑調和入門』',
      'func\tunknown_callback\n\t\tname\t寫作『藥劑調和入門』'),
  }),/source|unsupported|audit|missing|drift/i);
});

test('R2 material routes distinguish owned, real market PLUS, registered upstream and missing player acquisition',()=>{
  const world=createSourceWorld();
  const offers=street.listUseOffers(world);
  assert.equal(offers.length,37);
  const offer=(itemId,useId)=>offers.find(x=>x.itemId===itemId&&x.useId===useId);
  const source=(itemId,useId,materialId)=>offer(itemId,useId).materialRoutes
    .find(row=>row.itemId===materialId);
  const kit=source(37,1,37);
  assert.equal(kit.missing,1);
  assert.equal(kit.kind,'registered-use');
  assert.deepEqual(kit.provider,{itemId:79,useId:3});
  const stone=source(37,1,8);
  assert.equal(stone.missing,30);
  assert.equal(stone.kind,'source-plus');
  assert.equal(stone.sourcePlus,'6h');
  assert.equal(stone.marketStock,0,'fresh source world is sparse, not prefilled');
  const herb=source(10,0,1);
  assert.equal(herb.missing,30);
  assert.equal(herb.kind,'source-acquisition-not-implemented');
  assert.equal(herb.sourcePlus,null,
    'negative original PLUS cannot be presented as positive market supply');
  assert.equal(source(10,0,30).kind,'source-plus');
  assert.equal(source(10,0,32).kind,'source-plus');
  const soul=source(39,0,38);
  assert.equal(soul.kind,'upstream-use-not-ready');
  assert.deepEqual(soul.providerCandidates,[{itemId:37,useId:3}]);
  // Route descriptions must not mutate the original shop or wholesale state.
  assert.deepEqual(street.listUseOffers(world),offers);
  assert.equal(world.shops[0].item[7],0);
  assert.equal(world.market.wholesale[7],0);
});
