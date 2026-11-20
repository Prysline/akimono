import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {
  createMemoryWorld,validateMemoryWorld,createMemoryWorldAdapter,
  executeMemoryCommand,encodeMemorySnapshot,decodeMemorySnapshot,
} from '../src/game-core-contract.mjs';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {compileReviewedGiftMapUse}
  from '../src/reviewed-gift-map-use.mjs';
import {loadStandardStreetModel}
  from '../src/standard-street-model.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [itemDsl,rebelDsl,compiler,useCore,wholeCore,calcCore]=await Promise.all([
  'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
  'modern/tests/original-perl/inc-makeitem.cgi',
  'modern/tests/original-perl/use.cgi',
  'modern/tests/original-perl/whole.cgi',
  'modern/tests/original-perl/calc.cgi',
].map(p=>readFile(path.join(root,p),'utf8')));
const sourceModel=loadStandardStreetModel(itemDsl,rebelDsl);
const street=createStandardStreetModule({itemDsl,rebelDsl});
const rule=street.reviewedGiftMapUse;
const nowSeconds=1_000_000;
const open=()=>({
  kind:'open-shop',expectedRevision:0,shopId:42,
  ownerName:'試驗店主',shopName:'標準街真禮物卷來源測試店',
});
const exchange=(rev=1,requestedCount=1,extra={})=>({
  kind:'gift-exchange-maps',expectedRevision:rev,shopId:42,requestedCount,...extra,
});
function createShop(){
  const world=createMemoryWorld({
    worldId:'b33-real-gift-source-fixture',
    streetId:'standard-street',nowSeconds,
  });
  const opened=executeMemoryCommand({
    repository:createMemoryWorldAdapter(world),streetModule:street,command:open(),
  });
  assert.equal(opened.code,'COMMITTED',opened.details?.reason);
  return opened.world;
}
function withWholesaleFixture(opened){
  // NOT a real market initialized by the game. The tester explicitly
  // supplies a 79-slot zero wholesale fixture, tagged nonproduction.
  return validateMemoryWorld({
    ...opened,market:{
      source:'explicit-b33-test-fixture',
      wholesale:Array(79).fill(0),
    },
  });
}
function prepared(){
  const initial=withWholesaleFixture(createShop());
  return {initial,repo:createMemoryWorldAdapter(initial)};
}
function run(repo,command){return executeMemoryCommand({
  repository:repo,streetModule:street,command,
});}
test('B-33 gift catalog is the real Standard Street ITEM #79, not B32 A/B/C',()=>{
  assert.equal(rule.itemId,79);
  assert.equal(rule.itemCode,'gift');
  assert.equal(rule.name,'交換地圖集');
  assert.equal(street.catalog.items[78].name,'禮物卷');
  assert.equal(street.id,'standard-street');
  assert.ok(street.capabilities.includes('gift-exchange-maps'));
  assert.ok(!street.capabilities.includes('source-fixture-use'));
});
test('B-33 actual source first gift USE has exactly reviewed compiler fields',()=>{
  assert.equal(rule.useNo,0);
  assert.equal(rule.sourceFile,'custom/inc-item-data.cgi');
  assert.ok(rule.sourceLine>2700);
  assert.equal(rule.resultOk,'感謝您的使用');
  assert.equal(rule.time,1800);
  assert.equal(rule.exptime,1800);
  assert.equal(rule.money,0);
  assert.equal(rule.exp,0);
});
test('B-33 frozen compiler explicitly scales USE time, and defaults exptime',()=>{
  assert.ok(compiler.includes('$g_use->{time}=int(GetNumber($1)*$g_define->{itemusetimerate});'));
  assert.ok(compiler.includes('$g_use->{exptime}=$g_use->{time} if $g_use->{exptime}==0'));
  assert.ok(compiler.includes("if($val[2]eq''){$val[2]=1000;}"));
  assert.ok(compiler.includes("'itemno'=>'$use->{itemno}'"));
  assert.ok(calcCore.includes('sub GetItemUseTime'));
});
test('B-33 source compiler resolves 2 gift materials and 3 original map items',()=>{
  assert.deepEqual(rule.use.map(x=>[x.itemId,x.countPerUse,x.probabilityPermille]),
    [[79,2,1000]]);
  assert.deepEqual(rule.create.map(x=>[x.itemId,x.countPerUse,x.probabilityPermille]),
    [[12,1,1000],[9,1,1000],[14,1,1000]]);
  assert.deepEqual(rule.create.map(x=>x.originalName),[
    '到附近山區的地圖','到附近礦山的地圖','到劍市的地圖',
  ]);
});
test('B-33 original compiled limits include zero-price books without inventing price',()=>{
  assert.equal(rule.limits.length,79);
  assert.deepEqual(rule.limits[12],{code:true,limit:1,wslimit:1});
  assert.deepEqual(rule.limits[62],{code:true,limit:1,wslimit:1});
  assert.deepEqual(rule.limits[78],{code:true,limit:10,wslimit:0});
  for(const id of [9,12,14])
    assert.deepEqual(rule.limits[id-1],{code:true,limit:3,wslimit:3});
});
test('B-33 gift compiler rejects altered item reward quantity',()=>{
  assert.throws(()=>compileReviewedGiftMapUse({
    itemDsl:itemDsl.replace(/get\s+1\s+到附近山區的地圖/,
      'get 2 到附近山區的地圖'),rebelDsl,model:sourceModel,
  }),/reviewed gift map/);
});
test('B-33 gift compiler rejects unreviewed callback added to the real USE',()=>{
  const needle='name\t交換地圖集';
  assert.ok(itemDsl.includes(needle));
  assert.throws(()=>compileReviewedGiftMapUse({
    itemDsl:itemDsl.replace(needle,needle+'\n\t\tfunc\tpopup'),
    rebelDsl,model:sourceModel,
  }),/reviewed gift map/);
});
test('B-33 gift compiler rejects altered source time multiplier',()=>{
  assert.throws(()=>compileReviewedGiftMapUse({
    itemDsl:itemDsl.replace('ItemUseTimeRate\t\t0.5','ItemUseTimeRate 0.75'),
    rebelDsl,model:sourceModel,
  }),/reviewed gift map/);
});
test('B-33 source-reviewer still leaves all OTHER 115 USE entries nonexecuting',()=>{
  assert.equal(street.catalog.uses.length,116);
  assert.equal(street.catalog.uses.every(x=>x.runtimeSupported===false),true);
  assert.equal(street.capabilities.filter(x=>x.includes('gift')).length,1);
  assert.equal(street.capabilities.includes('use-item'),false);
});
test('B-33 original opening grant contains five true gift vouchers',()=>{
  const w=createShop(),shop=w.shops[0];
  assert.equal(shop.item.length,79);
  assert.equal(shop.item[78],5);
  for(const id of [9,12,14])assert.equal(shop.item[id-1],0);
  assert.equal(shop.money,100000);
  assert.equal(shop.paytoday,0);
  assert.equal(shop.time,956800);
  assert.equal(w.market,null);
});
test('B-33 no wholesale fixture refuses source transaction without changing state',()=>{
  const initial=createShop();
  const repo=createMemoryWorldAdapter(initial);
  const x=run(repo,exchange());
  assert.equal(x.code,'SOURCE_BOUNDARY_REJECTED');
  assert.deepEqual(repo.read(),initial);
  assert.match(x.details.reason,/missing explicit 79-slot/);
});
test('B-33 explicitly seeded wholesale fixture is visibly nonproduction',()=>{
  const w=withWholesaleFixture(createShop());
  assert.equal(w.market.source,'explicit-b33-test-fixture');
  assert.equal(w.market.wholesale.length,79);
  assert.equal(w.market.wholesale.every(x=>x===0),true);
  assert.equal(w.events,null);
  assert.ok(Object.isFrozen(w.market.wholesale));
});
test('B-33 one REAL gift exchange consumes two gift and creates three map items',()=>{
  const {repo}=prepared();
  const x=run(repo,exchange());
  assert.equal(x.code,'COMMITTED',x.details?.reason);
  assert.equal(x.world.revision,2);
  assert.equal(x.world.shops[0].item[78],3);
  for(const id of [9,12,14])assert.equal(x.world.shops[0].item[id-1],1);
  assert.equal(x.details.spentGift,2);
  assert.deepEqual(x.details.gainedMaps,[[12,1],[9,1],[14,1]]);
  assert.deepEqual(x.details.discarded,[]);
  assert.deepEqual(x.details.originalUseMsg,[null]);
  assert.deepEqual(x.details.originalAddMsg,[null,null,null]);
  assert.equal(x.details.originalFunctionReturn,null);
  assert.equal(x.details.originalResultOk,'感謝您的使用');
});
test('B-33 actual compiler scaled source time 1800 seconds is consumed',()=>{
  const {repo}=prepared();
  const x=run(repo,exchange());
  assert.equal(x.world.shops[0].time,958600);
  assert.equal(x.world.shops[0].money,100000);
  assert.equal(x.world.shops[0].paytoday,0);
  assert.equal(x.world.shops[0].rank,5010);
  assert.equal(x.world.shops[0].exp,undefined);
});
test('B-33 full original market check executes once in real-source transaction',()=>{
  const {repo}=prepared();
  const x=run(repo,exchange());
  assert.equal(x.details.originalWholeStoreChecks,1);
  assert.equal(x.world.market.wholesale.every(v=>v===0),true);
  assert.equal(x.world.market.source,'explicit-b33-test-fixture');
});
test('B-33 original requestedCount three is reduced by five-voucher material gate',()=>{
  const {repo}=prepared();
  const x=run(repo,exchange(1,3));
  assert.equal(x.code,'COMMITTED',x.details?.reason);
  assert.equal(x.details.requestedCount,3);
  assert.equal(x.details.effectiveCount,2);
  assert.equal(x.world.shops[0].item[78],1);
  for(const id of [9,12,14])assert.equal(x.world.shops[0].item[id-1],2);
  assert.equal(x.world.shops[0].time,960400);
});
test('B-33 two successive real gift exchanges preserve inventory and time',()=>{
  const {repo}=prepared();
  const a=run(repo,exchange(1,1)),b=run(repo,exchange(2,1));
  assert.equal(a.code,'COMMITTED');
  assert.equal(b.code,'COMMITTED');
  assert.equal(repo.read().revision,3);
  assert.equal(repo.read().shops[0].item[78],1);
  assert.deepEqual([9,12,14].map(i=>repo.read().shops[0].item[i-1]),[2,2,2]);
  assert.equal(repo.read().shops[0].time,960400);
});
test('B-33 third gift exchange is rejected when voucher stock is one',()=>{
  const {repo}=prepared();
  run(repo,exchange(1,1));
  run(repo,exchange(2,1));
  const before=encodeMemorySnapshot(repo.read());
  const third=run(repo,exchange(3,1));
  assert.equal(third.ok,false);
  assert.equal(third.code,'SOURCE_BOUNDARY_REJECTED');
  assert.equal(encodeMemorySnapshot(repo.read()),before);
});
test('B-33 original zero-count request is rejected without side effects',()=>{
  const {repo}=prepared();
  const initial=encodeMemorySnapshot(repo.read());
  const x=run(repo,exchange(1,0));
  assert.equal(x.code,'SOURCE_BOUNDARY_REJECTED');
  assert.equal(encodeMemorySnapshot(repo.read()),initial);
});
test('B-33 stale revision cannot consume gift twice or overwrite map stock',()=>{
  const {repo}=prepared();
  run(repo,exchange(1,1));
  const before=encodeMemorySnapshot(repo.read());
  const stale=run(repo,exchange(1,1));
  assert.equal(stale.code,'REVISION_CONFLICT');
  assert.equal(encodeMemorySnapshot(repo.read()),before);
});
test('B-33 arbitrary synthetic item ID cannot be sent as gift recipe override',()=>{
  const {repo}=prepared();
  const x=run(repo,exchange(1,1,{itemId:1}));
  assert.equal(x.code,'SOURCE_BOUNDARY_REJECTED');
  assert.equal(repo.read().revision,1);
});
test('B-33 unknown callback override cannot be injected into source gift rule',()=>{
  const {repo}=prepared();
  const x=run(repo,exchange(1,1,{callback:'lostbook'}));
  assert.equal(x.code,'SOURCE_BOUNDARY_REJECTED');
  assert.equal(repo.read().revision,1);
});
test('B-33 malformed market fixture is refused and not auto-corrected',()=>{
  const initial=createShop();
  for(const market of [
    {source:'explicit-b33-test-fixture',wholesale:[0,0]},
    {source:'wrong',wholesale:Array(79).fill(0)},
  ]){
    const repo=createMemoryWorldAdapter(validateMemoryWorld({...initial,market}));
    const x=run(repo,exchange());
    assert.equal(x.code,'SOURCE_BOUNDARY_REJECTED');
    assert.equal(repo.read().revision,1);
  }
});
test('B-33 real gift map result preserves source status and remaining original inventory',()=>{
  const {repo}=prepared();
  const x=run(repo,exchange());
  const a=x.world.shops[0],old=createShop().shops[0];
  assert.equal(a.status,old.status);
  assert.equal(a.showcasecount,old.showcasecount);
  assert.deepEqual(a.showcase,old.showcase);
  assert.deepEqual(a.price,old.price);
  assert.equal(a.name,old.name);
  for(let i=0;i<79;i++){
    if(![8,11,13,78].includes(i))assert.equal(a.item[i],old.item[i],i);
  }
});
test('B-33 real gift map world JSON snapshot is pure, immutable and replayable',()=>{
  function scenario(){
    const {repo}=prepared();
    run(repo,exchange(1));
    run(repo,exchange(2));
    return encodeMemorySnapshot(repo.read());
  }
  const bytes=scenario();
  assert.equal(bytes,scenario());
  const restored=decodeMemorySnapshot(bytes);
  assert.equal(restored.shops[0].item[78],1);
  assert.ok(Object.isFrozen(restored.shops[0].item));
  assert.equal(restored.market.source,'explicit-b33-test-fixture');
});
test('B-33 full pinned Core order matches reviewed gift use callback-free branch',()=>{
  for(const s of [
    "RequireFile('inc-item.cgi');","CheckWholeStore();",
    '$USE->{result}->{count}=$count;',
    'sub MakeAmount',
  ])assert.ok(useCore.includes(s));
  assert.ok(useCore.indexOf('CheckWholeStore();')<
    useCore.indexOf("RequireFile('inc-item.cgi');"));
  assert.ok(wholeCore.includes('sub CheckWholeStore'));
});
test('B-33 six REAL original Perl source-compiler/Core cases match Node one by one',t=>{
  const cwd=path.join(root,'modern/tests/original-perl');
  let stdout;
  try{
    stdout=execFileSync('perl',['original-gift-map-use-probe.pl'],{
      cwd,encoding:'utf8',maxBuffer:4*1024*1024,timeout:25000,
    });
  }catch(e){
    if(e?.code==='ENOENT'){t.skip('Perl runtime unavailable');return;}
    throw e;
  }
  const cases=JSON.parse(stdout);
  assert.equal(cases.length,6);
  for(const c of cases){
    const probes=c.case==='three-sequential'?c.steps:[c.observed];
    let state=prepared().initial;
    if(c.case==='map-storage-full'){
      state=validateMemoryWorld({...state,shops:state.shops.map((s,i)=>i===0?{
        ...s,item:c.initialStock,
      }:s)});
    }
    for(const [i,actual] of probes.entries()){
      assert.deepEqual(actual.giftRule.use,[[79,2,1000]],c.case+' source use');
      assert.deepEqual(actual.giftRule.create,
        [[12,1,1000],[9,1,1000],[14,1,1000]],c.case+' source create');
      assert.equal(actual.giftRule.time,1800,c.case+' source time');
      assert.equal(actual.giftRule.exptime,1800,c.case+' source exp time');
      for(let k=0;k<79;k++){
        assert.deepEqual([rule.limits[k].limit,rule.limits[k].wslimit],
          actual.itemLimits[k],c.case+' full ITEM limit #'+(k+1));
      }
      const old=encodeMemorySnapshot(state);
      const x=executeMemoryCommand({
        repository:createMemoryWorldAdapter(state),streetModule:street,
        command:exchange(state.revision,c.case==='three-sequential'?1:c.requestedCount),
      });
      if(actual.result.count===0){
        assert.equal(x.code,'SOURCE_BOUNDARY_REJECTED',c.case);
        assert.equal(encodeMemorySnapshot(x.world),old);
      }else{
        assert.equal(x.code,'COMMITTED',c.case+': '+x.details?.reason);
        assert.equal(x.details.effectiveCount,actual.result.count,c.case);
        assert.deepEqual(x.world.shops[0].item,actual.stock,c.case+' stock');
        assert.deepEqual(x.world.market.wholesale,actual.wholesale,c.case+' market');
        assert.equal(x.world.shops[0].money,actual.money,c.case+' money');
        assert.equal(x.world.shops[0].paytoday,actual.paytoday,c.case+' paytoday');
        assert.equal(x.world.shops[0].time,actual.time,c.case+' time');
        assert.deepEqual(x.details.gainedMaps,actual.result.additem,
          c.case+' source map additions');
        assert.deepEqual(x.details.spentGift,
          actual.result.useitem[0][1],c.case+' used vouchers');
        state=x.world;
      }
    }
  }
});
