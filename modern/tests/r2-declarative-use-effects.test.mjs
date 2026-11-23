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
function fixture(rule,{job='',missingNeed=false,missingNeedId=null}={}){
  const initial=createSourceWorld();
  const old=initial.shops[0];
  const stock=[...old.item];
  for(const action of rule.uses){
    stock[action.itemId-1]=Math.max(stock[action.itemId-1],
      action.countPerUse);
  }
  if(rule.requiresOwnedItem)stock[rule.itemId-1]=1;
  if(missingNeed){
    const needed=rule.uses.find(x=>x.probabilityPermille===0&&
      (missingNeedId===null||x.itemId===missingNeedId));
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
  const randomDraws=[...Array(dry.multiItem?.randomDraws??0).fill(500000),
    ...(rule.afterCallback&&dry.performed?[500000]:[])];
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
function compare(rule,{job='',missingNeed=false,missingNeedId=null,
  destroy=false}={}){
  const {world,randomDraws}=fixture(rule,{job,missingNeed,missingNeedId});
  if(destroy){
    assert.equal(rule.afterCallback?.kind,'lostbook');
    randomDraws[randomDraws.length-1]=0;
  }
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
  if(rule.afterCallback){
    assert.equal(result.details.mapDestroyed,destroy);
    assert.equal(result.details.originalFunctionReturn,perl.result.functionReturn);
  }
  assert.notEqual(encodeMemorySnapshot(repo.read()),before);
}
test('31 source recipes compile to reusable material, production and EXP effects',()=>{
  const offers=street.listUseOffers(createSourceWorld());
  assert.equal(offers.length,85);
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
  assert.equal(offers.length,85);
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
  assert.equal(herb.kind,'upstream-use-not-ready');
  assert.deepEqual(herb.providerCandidates,[
    {itemId:12,useId:0},{itemId:12,useId:1},
    {itemId:12,useId:2},{itemId:12,useId:3},
  ]);
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


test('read-only USE shortcuts track source material/time ceilings',()=>{
  const world=createSourceWorld();
  const offers=street.listUseOffers(world);
  const gift=(id)=>offers.find(x=>x.itemId===79&&x.useId===id);
  assert.equal(world.shops[0].item[78],5);
  assert.equal(gift(0).maxUseCount,2,'five vouchers permit two map exchanges');
  assert.equal(gift(0).maxUseCountReason,'材料最大');
  assert.equal(gift(3).maxUseCount,2,'two-voucher kits cannot exceed stock');
  assert.equal(gift(4).maxUseCount,5,'one-voucher exchange uses all vouchers');
  assert.equal(gift(1).maxUseCount,1,'five-voucher book bundle once');
  assert.equal(gift(2).maxUseCount,0,'ten-voucher book bundle unavailable');
  const sword=offers.find(x=>x.itemId===14&&x.useId===0);
  assert.equal(sword.maxUseCount,0,'unowned map must not be offered as usable');
});


test('missing USE materials show source names instead of internal ITEM numbers',()=>{
  const world=structuredClone(createSourceWorld());
  world.shops[0].item[36]=1; // read-only source reason fixture for #37/0
  const blacksmith=street.listUseOffers(world)
    .find(row=>row.itemId===37&&row.useId===0);
  assert.equal(blacksmith.reason,'材料不足：鐵塊需要 20 件');
  assert.equal(blacksmith.missingMaterialId,5,
    'numeric ITEM ID is available only for developer diagnostics');
  assert.doesNotMatch(blacksmith.reason,/#5/);
});

test('R2 selected eight source #15/#16/#17 manufacturing USEs match frozen Perl',()=>{
  for(const [itemId,useIds] of [[15,[0,2]],[16,[0,1]],[17,[0,1,2,3]]]){
    for(const useId of useIds){
      const rule=street.useItem.getRule(itemId,useId);
      assert.equal(rule?.source,'original-declarative-use-dsl');
      assert.equal(rule?.beforeCallback,undefined);
      assert.equal(rule?.afterCallback,undefined);
      assert.deepEqual(readCommonUseEffectPlan(rule).creates,rule.creates);
      compare(rule);
    }
  }
  for(const [useId,param] of [[1,25],[3,25],[4,50]])
    assert.equal(street.useItem.getRule(15,useId)?.afterCallback?.threshold,param);
});
test('R2 #15/#16/#17 selected first-USE profession clocks match frozen Perl',()=>{
  for(const [itemId,useId,job] of [
    [15,0,'drug'],[16,0,'armor'],[17,0,'weapon'],[17,2,'armor'],
  ])compare(street.useItem.getRule(itemId,useId),{job});
});
test('R2 source advanced Ether requires 20% real #15 proficiency',()=>{
  const ether=street.useItem.getRule(15,2);
  assert.equal(ether.needExperience,200);
  assert.equal(ether.experienceCallback.points,20);
  assert.equal(street.useItem.getRule(15,1).needExperience,200);
});
test('R2 manufacturing requires source-owned book, not merely gathered materials',()=>{
  const rule=street.useItem.getRule(16,0);
  assert.equal(rule.requiresOwnedItem,true);
  const {world}=fixture(rule);
  const unowned=validateMemoryWorld({...world,shops:[{
    ...world.shops[0],item:world.shops[0].item.map((n,i)=>
      i===15?0:n),
  }]});
  const repo=createMemoryWorldAdapter(unowned);
  const before=encodeMemorySnapshot(repo.read());
  const result=executeMemoryCommand({repository:repo,streetModule:street,
    command:{kind:'use-item',expectedRevision:unowned.revision,
      shopId:1,itemId:16,useId:0,requestedCount:1}});
  assert.equal(result.code,'SOURCE_BOUNDARY_REJECTED');
  assert.equal(encodeMemorySnapshot(repo.read()),before);
});

test('R2 eight #20-#23 source iron/steel equipment USEs match frozen Perl',()=>{
  for(const itemId of [20,21,22,23]){
    for(const useId of [0,1]){
      const rule=street.useItem.getRule(itemId,useId);
      assert.equal(rule?.source,'original-declarative-use-dsl');
      assert.equal(rule?.requiresOwnedItem,true);
      assert.equal(rule?.ownedMaximum,20);
      assert.equal(rule?.beforeCallback,undefined);
      assert.equal(rule?.afterCallback,undefined);
      assert.ok(rule.uses.some(x=>x.probabilityPermille===0),
        'iron/steel forging requires real blacksmith or magical knowledge');
      compare(rule);
    }
    for(const useId of [2,3]){
      const advanced=street.useItem.getRule(itemId,useId);
      assert.equal(advanced?.afterCallback?.kind,'lostbook');
      assert.equal(advanced?.afterCallback?.threshold,50);
      compare(advanced);
      compare(advanced,{destroy:true});
    }
  }
});
test('R2 blacksmith and magical NEED are held and never consumed',()=>{
  for(const itemId of [20,21,22,23]){
    const rule=street.useItem.getRule(itemId,0);
    assert.deepEqual(rule.uses.filter(x=>x.probabilityPermille===0)
      .map(x=>x.itemId),[itemId===23?19:18]);
    compare(rule,{missingNeed:true});
  }
});
test('R2 equipment first-USE job time matches original Perl',()=>{
  for(const [itemId,job] of [
    [20,'weapon'],[21,'armor'],[22,'armor'],[23,'weapon'],
  ])compare(street.useItem.getRule(itemId,0),{job});
});
test('R2 all three advanced potion lostbook callbacks match original Perl',()=>{
  for(const [useId,threshold,needExperience] of [
    [1,25,200],[3,25,400],[4,50,600],
  ]){
    const rule=street.useItem.getRule(15,useId);
    assert.equal(rule?.source,'original-declarative-use-dsl');
    assert.equal(rule?.requiresOwnedItem,true);
    assert.equal(rule?.afterCallback?.kind,'lostbook');
    assert.equal(rule?.afterCallback?.threshold,threshold);
    assert.equal(rule.needExperience,needExperience);
    compare(rule);
    compare(rule,{destroy:true});
  }
});
test('R2 original potion unknown callback/param source drift fails closed',()=>{
  for(const [from,to] of [
    ['param\t25','param\t999'],
    ['func\tlostbook','func\tunknown_callback'],
  ]){
    const changed=sources.itemDsl.replace(from,to);
    assert.notEqual(changed,sources.itemDsl);
    assert.throws(()=>createStandardStreetModule({...sources,itemDsl:changed}),
      /unsupported|drift|callback|source/i);
  }
});

test('R2 #20-23 original advanced forging callbacks retain knowledge, EXP and source RNG',()=>{
  for(const itemId of [20,21,22,23]){
    const first=street.useItem.getRule(itemId,0);
    const second=street.useItem.getRule(itemId,1);
    assert.equal(first.needExperience,0);
    assert.equal(second.needExperience,itemId===23?250:200);
    for(const useId of [2,3]){
      const rule=street.useItem.getRule(itemId,useId);
      assert.equal(rule.afterCallback.kind,'lostbook');
      assert.equal(rule.afterCallback.threshold,50);
      assert.deepEqual(rule.uses.filter(x=>x.probabilityPermille===0)
        .map(x=>x.itemId),[itemId===23?19:18]);
      assert.equal(rule.needExperience,
        itemId===23?(useId===2?500:700):(useId===2?400:600));
      assert.equal(rule.experienceCallback.points,20);
    }
  }
});
test('R2 #66 four source ornament manufacturing USEs match true Perl',()=>{
  for(const useId of [0,1,2,3]){
    const rule=street.useItem.getRule(66,useId);
    assert.equal(rule?.source,'original-declarative-use-dsl');
    assert.equal(rule?.requiresOwnedItem,true);
    assert.equal(rule?.ownedMaximum,20);
    assert.deepEqual(rule.uses.filter(x=>x.probabilityPermille===0)
      .map(x=>x.itemId).slice(0,2),[18,19],
      'both original knowledge requirements must be held but not consumed');
    assert.equal(rule.experienceCallback.points,20);
    assert.equal(rule.needExperience,[0,250,500,500][useId]);
    assert.equal(rule.afterCallback?.threshold,
      [undefined,50,50,200][useId]);
    compare(rule);
    if(useId>0)compare(rule,{destroy:true});
  }
  compare(street.useItem.getRule(66,0),{job:'tool'});
});
test('R2 #66 every source NEED is an atomic eligibility gate',()=>{
  const rule=street.useItem.getRule(66,0);
  compare(rule,{missingNeed:true,missingNeedId:18});
  compare(rule,{missingNeed:true,missingNeedId:19});
  const advanced=street.useItem.getRule(66,3);
  assert.equal(advanced.uses.filter(x=>x.probabilityPermille===0).length,3);
  const extra=advanced.uses.filter(x=>x.probabilityPermille===0)
    .find(x=>![18,19].includes(x.itemId));
  assert.ok(extra);
  compare(advanced,{missingNeed:true,missingNeedId:extra.itemId});
});
test('R2 #66 source callback 200 permille or unknown func drift rejects',()=>{
  for(const [needle,replacement] of [
    ['param\t200','param\t201'],
    ['func\tlostbook','func\tunreviewed_effect'],
  ]){
    const changed=sources.itemDsl.replace(needle,replacement);
    assert.notEqual(changed,sources.itemDsl);
    assert.throws(()=>createStandardStreetModule({...sources,itemDsl:changed}),
      /drift|unsupported|callback|source/i);
  }
});
test('R2 #35/#36 source consumption USEs (no GET) match true frozen Perl',()=>{
  for(const [itemId,itemConsumed] of [[35,35],[36,36]]){
    const rule=street.useItem.getRule(itemId,0);
    assert.equal(rule?.source,'original-declarative-use-dsl');
    assert.deepEqual(rule.creates,[]);
    assert.deepEqual(rule.uses.map(x=>[x.itemId,x.countPerUse]),
      [[itemConsumed,1]]);
    assert.equal(rule.money,0);
    assert.equal(rule.experienceCallback,undefined);
    compare(rule);
    compare(rule,{job:'cow'});
  }
});
