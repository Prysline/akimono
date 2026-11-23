/**
 * #78 all fourteen career guide USEs: compare source-pinned complete
 * frozen Perl GetBuffer + original UseItem + real inline body against
 * the shared GameCore transaction (no fake callback expectations).
 * Source EXP edge cases deliberately preserve "$exps==$exp1".
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
    worldId:'r2-source-career',streetId:'standard-street',
    nowSeconds:1000000,
  }));
  for(const [kind,attrs] of [
    ['initialize-source-market',{}],
    ['open-shop',{shopId:1,ownerName:'轉職測試',shopName:'轉職來源驗證店'}],
  ]){
    const result=executeMemoryCommand({repository,streetModule:street,
      command:{kind,expectedRevision:repository.read().revision,...attrs}});
    assert.equal(result.code,'COMMITTED');
  }
  return repository.read();
}
const sourceDonors=[9,10,12,14,15,16,17,66,20,21,22,23,25];
function compare(useId,{
  exp={},job='cow',withBook=true,count=1,
}={}){
  const rule=street.useItem.getRule(78,useId);
  assert.equal(rule?.source,'original-reviewed-career-change-inline');
  assert.equal(rule?.inlineCallback?.kind,'career-change');
  assert.equal(rule?.singleUseOnly,true);
  assert.equal(rule?.time,10800);
  assert.equal(rule?.ownedMaximum,1);
  const initial=fresh();
  const stock=[...initial.shops[0].item];
  stock[77]=withBook?1:0;
  const world=validateMemoryWorld({...initial,shops:[{
    ...initial.shops[0],item:stock,exp:{...exp},
    job,money:100000,time:956800,
  }]});
  const oracle=JSON.parse(execFileSync('perl',[
    'original-r2-career-use-probe.pl',JSON.stringify({
      itemId:78,useId,stock,
      wholesale:world.market.wholesale,exp,job,
      money:100000,paytoday:0,time:956800,
      nowSeconds:world.nowSeconds,requestedCount:count,
    }),
  ],{cwd:join(root,'modern/tests/original-perl'),
    encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024}));
  assert.equal(oracle.compiled.time,rule.time);
  assert.equal(oracle.compiled.exptime,rule.exptime);
  assert.equal(oracle.compiled.param1,rule.inlineCallback.targetItemId);
  assert.equal(oracle.compiled.param4,
    rule.inlineCallback.job||'_default_');
  assert.deepEqual(oracle.compiled.use.map(x=>[
    x.no,x.count,x.proba,
  ]),[[78,1,1000]]);
  const repo=createMemoryWorldAdapter(world);
  const before=encodeMemorySnapshot(repo.read());
  const result=executeMemoryCommand({repository:repo,streetModule:street,
    command:{kind:'use-item',expectedRevision:world.revision,shopId:1,
      itemId:78,useId,requestedCount:count}});
  if(!withBook||count!==1){
    assert.equal(result.code,'SOURCE_BOUNDARY_REJECTED');
    assert.equal(encodeMemorySnapshot(repo.read()),before);
    return {result,oracle};
  }
  assert.equal(result.code,'COMMITTED',result.details?.reason);
  const after=result.world.shops[0];
  assert.equal(result.details.effectiveCount,oracle.result.count);
  assert.equal(after.job,oracle.result.job);
  assert.deepEqual(after.exp,oracle.result.exp);
  assert.deepEqual(after.item,oracle.result.stock);
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
  assert.equal(result.details.randomDrawsUsed,0);
  return {result,oracle};
}
test('R2 all fourteen #78 career USE options compare full source Perl',()=>{
  for(let useId=0;useId<14;useId++){
    compare(useId);
    compare(useId,{exp:{9:300,10:200,12:400,15:100,25:50,66:200},
      job:'book'});
  }
});
test('R2 source career intentionally skips DONOR ID equal to target EXP VALUE',()=>{
  // Frozen code "next if !$exp || $exps==$exp1" compares NUMERIC
  // donor item number against target's old EXP, not the target number.
  const {result,oracle}=compare(0,{exp:{9:200,10:100,12:50,15:9}});
  assert.equal(result.world.shops[0].exp['9'],200,
    'DONOR 9 must survive because original target EXP was 9');
  assert.equal(oracle.result.exp['9'],200);
  assert.equal(result.world.shops[0].exp['15'],88,
    'original target EXP is added twice if its own donor entry was consumed');
});
test('R2 source career at capped and zero proficiency matches frozen Perl',()=>{
  compare(3,{exp:{66:1000,9:200,25:100,12:75}});
  compare(12,{exp:{14:14,9:100,25:30}});
  const {result}=compare(13,{exp:{9:1000,25:140,66:600}});
  assert.equal(result.world.shops[0].job,'');
  assert.deepEqual(result.world.shops[0].exp,
    {9:1000,25:140,66:600});
  assert.deepEqual(result.details.originalInlineLogCalls,[]);
});
test('R2 source career guide requires owned book and single-use',()=>{
  compare(0,{withBook:false});
  compare(13,{withBook:false});
  compare(0,{count:2});
  compare(13,{count:2});
});
test('R2 career source transfer typo/param/name drift is fail-closed',()=>{
  for(const [from,to] of [
    ['next if !$exp || $exps==$exp1;',
      'next if !$exp || $exps==$USE->{param1};'],
    ['0,,0,_default_','0,,0,tool'],
    ['66,9:10:12:14','67,9:10:12:14'],
  ]){
    const changed=sources.itemDsl.replace(from,to);
    assert.notEqual(changed,sources.itemDsl);
    assert.throws(()=>createStandardStreetModule({...sources,itemDsl:changed}),
      /source|career|drift|callback/i);
  }
});
test('R2 career registered options count without manufacturing arbitrary EXP',()=>{
  const world=fresh();
  const rows=street.listUseOffers(world);
  assert.equal(rows.length,109);
  const career=rows.filter(x=>x.itemId===78);
  assert.equal(career.length,14);
  assert.ok(career.every(x=>x.canUse===false));
  assert.ok(career.every(x=>x.materialRoutes.some(y=>y.itemId===78)));
  assert.equal(world.shops[0].item[77],0);
});
