/**
 * R2-E: real zh-Hant HTTP -> source market PLUS -> market-buy -> use-item
 * -> GameCore CAS -> two-slot B-43 disk -> process restart/load/recovery.
 * Source Perl is actually executed, not reconstructed from JSON fixtures.
 * All test deterministic USE draws are selected by the LOCAL TEST environment;
 * the HTTP API cannot accept, inject or reorder source callback random draws.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const perl=(file,...args)=>JSON.parse(execFileSync('perl',[file,...args],{
  cwd:join(root,'modern/tests/original-perl'),encoding:'utf8',
  timeout:30000,maxBuffer:4*1024*1024,
}));
async function boot(directory,scenario='mixed'){
  const child=spawn(process.execPath,['scripts/dev-local.mjs'],{
    cwd:join(root,'modern'),env:{...process.env,
      AKIMONO_PORT:'0',AKIMONO_SAVE_DIR:directory,
      AKIMONO_E2E_FIXED_NOW:'1000000',
      AKIMONO_E2E_DETERMINISTIC_RNG:'1',
      AKIMONO_E2E_USE_SCENARIO:scenario,
    },stdio:['ignore','pipe','pipe'],
  });
  let stderr='';
  child.stderr.on('data',b=>stderr+=b);
  const url=await Promise.race([
    new Promise((resolve,reject)=>{
      let output='';
      child.stdout.on('data',b=>{
        output+=b;
        const url=output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
        if(url)resolve(url);
      });
      child.once('error',reject);
      child.once('exit',code=>reject(Error(
        'R2-E source server died '+code+': '+stderr)));
    }),
    new Promise((_,reject)=>setTimeout(
      ()=>reject(Error('R2-E source server boot timeout '+stderr)),15000)),
  ]);
  const state=async()=>await (await fetch(url+'/api/state')).json();
  const post=async(endpoint,payload={})=>{
    const response=await fetch(url+endpoint,{
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify(payload),
    });
    return {status:response.status,...await response.json()};
  };
  let stopping=null;
  const stop=()=>stopping??=(child.exitCode!==null||child.signalCode!==null?
    Promise.resolve():new Promise(resolve=>{
      child.once('exit',resolve);child.kill();
    }));
  return {url,state,post,stop};
}
const find=(s,id)=>s.marketOffers.find(x=>x.itemId===id);
const useOffer=(s,id)=>s.useOffers.find(x=>x.itemId===id&&x.useId===0);
const usePayload=(s,id,requestedCount=1)=>({
  expectedRevision:s.world.revision,itemId:id,useId:0,requestedCount,
});
async function setup(server){
  const init=await server.post('/api/initialize');
  assert.equal(init.code,'COMMITTED',JSON.stringify(init));
  const open=await server.post('/api/open-shop',{
    expectedRevision:1,ownerName:'R2-E 原版商人',
    shopName:'單一世界共用交易製作',
  });
  assert.equal(open.code,'COMMITTED',JSON.stringify(open));
  const supply=await server.post('/api/supply',{
    expectedRevision:2,timespanSeconds:3600,
  });
  assert.equal(supply.code,'COMMITTED',JSON.stringify(supply));
  const supplied=await server.state();
  assert.equal(supplied.itemCatalog.length,79);
  assert.ok(supplied.marketOffers.length>0&&supplied.marketOffers.length<79);
  assert.ok(supplied.marketOffers.every(o=>o.marketStock>0));
  assert.equal(supplied.useOffers.length,2);
  for(const id of [10,11,14,39]){
    const row=find(supplied,id);
    assert.equal(row.canBuy,true,'true original PLUS stock #'+id);
    assert.ok(Number.isSafeInteger(row.shelf));
    assert.ok(row.price>0);
  }
  assert.notEqual(find(supplied,14).price,10000,
    'BASE source dynamic map price is not the old fixed market price');
  return supplied;
}
async function buy(server,id){
  const before=await server.state(),offer=find(before,id);
  assert.equal(offer.canBuy,true,'source market offer #'+id);
  const result=await server.post('/api/buy',{
    expectedRevision:before.world.revision,itemId:id,requestedCount:1,
    marketShelf:offer.shelf,expectedPrice:offer.price,
  });
  assert.equal(result.code,'COMMITTED',JSON.stringify(result));
  const after=result.state;
  assert.equal(result.details.action,'market-buy');
  assert.equal(after.shop.item[id-1],before.shop.item[id-1]+1);
  assert.equal(after.shop.money,before.shop.money-offer.price);
  assert.equal(after.shop.paytoday,before.shop.paytoday+offer.price);
  assert.equal(after.world.revision,before.world.revision+1);
  assert.equal(after.world.market.wholesale[id-1],offer.marketStock-1);
  return result;
}
async function use(server,id,requestedCount=1){
  const before=await server.state();
  const result=await server.post('/api/use',usePayload(before,id,requestedCount));
  assert.equal(result.status,200,JSON.stringify(result));
  assert.equal(result.code,'COMMITTED',JSON.stringify(result));
  assert.equal(result.details.action,'use-item');
  assert.equal(result.details.itemId,id);
  assert.equal(result.state.world.revision,before.world.revision+1);
  return {before,result};
}
async function reject(server,endpoint,payload,status=409){
  const before=await server.state();
  const result=await server.post(endpoint,payload);
  assert.equal(result.status,status,JSON.stringify(result));
  assert.equal(result.ok,false);
  const after=await server.state();
  assert.deepEqual(after.world,before.world,'rejection changes no WorldState');
  assert.deepEqual(after.save,before.save,'rejection changes no disk generation');
  return result;
}

test('R2-E real browser HTTP #10/#11/#14/#39 buy, original Perl #79/#14 USE, CAS, B43 generation/restart/replay/recovery',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'akimono-r2e-real-use-'));
  const servers=[];
  t.after(async()=>{
    for(const s of servers)await s.stop();
    await rm(directory,{recursive:true,force:true});
  });
  let srv=await boot(directory);servers.push(srv);
  const html=await (await fetch(srv.url)).text();
  const app=await (await fetch(srv.url+'/app.js')).text();
  assert.match(html,/lang="zh-Hant"/);
  assert.match(html,/id="use-offers"/);
  assert.match(html,/id="market-offers"/);
  assert.match(app,/data-use-item/);
  assert.match(app,/useOffers/);
  assert.match(app,/call\('\/api\/use'/);
  assert.doesNotMatch(app,/gift-exchange-maps|use-original-sword-map-14/);
  assert.deepEqual((await srv.state()).useOffers.map(x=>x.itemId),
    [79,14]);
  assert.equal(useOffer(await srv.state(),79).canUse,false);
  await reject(srv,'/api/use',{
    expectedRevision:0,itemId:79,useId:0,requestedCount:1},409);
  await setup(srv);
  const fresh=await srv.state();
  assert.equal(useOffer(fresh,79).canUse,true);
  assert.equal(useOffer(fresh,14).canUse,false);
  await reject(srv,'/api/use',{
    ...usePayload(fresh,79),randomDraws:[0]},400);
  await reject(srv,'/api/use',{
    ...usePayload(fresh,79),kind:'gift-exchange-maps'},400);
  await reject(srv,'/api/use',{
    ...usePayload(fresh,14),useId:1},409);
  await reject(srv,'/api/use',{
    ...usePayload(fresh,11)},409);
  await reject(srv,'/api/use',{
    ...usePayload(fresh,79),expectedRevision:fresh.world.revision-1},409);
  for(const id of [39,10,11,14])await buy(srv,id);
  const purchased=await srv.state();
  assert.equal(purchased.shop.item[13],1);
  assert.equal(purchased.shop.item[78],5);
  assert.equal(useOffer(purchased,14).canUse,true);
  const originalGift=perl('original-gift-map-use-probe.pl')
    .find(x=>x.case==='one').observed;
  const {before:beforeGift,result:gift}=await use(srv,79);
  assert.equal(gift.details.effectiveCount,originalGift.result.count);
  assert.deepEqual(gift.details.originalUseItem,originalGift.result.useitem);
  assert.deepEqual(gift.details.originalAddItem,originalGift.result.additem);
  assert.deepEqual(gift.details.originalUseMsg,originalGift.result.usemsg);
  assert.deepEqual(gift.details.originalAddMsg,originalGift.result.addmsg);
  assert.equal(gift.state.shop.item[78],3);
  for(const id of [9,12,14])
    assert.equal(gift.state.shop.item[id-1],beforeGift.shop.item[id-1]+1);
  assert.equal(gift.state.shop.time,beforeGift.shop.time+1800);
  assert.equal(gift.state.shop.money,beforeGift.shop.money);
  assert.equal(gift.details.randomDrawsUsed,0);
  assert.equal(gift.details.originalWholeStoreChecks,1);

  const swordOracle=perl('original-b63-sword-map-all-outcomes-probe.pl','mixed');
  const {before:beforeMap,result:map}=await use(srv,14);
  const afterMap=map.state;
  assert.deepEqual([40,41,42,43,44].map(id=>afterMap.shop.item[id-1]),
    swordOracle.result.swords,'actual original Perl sword GET');
  assert.deepEqual(map.details.originalAddItem,swordOracle.result.created);
  assert.deepEqual(map.details.originalUseItem,
    swordOracle.result.originalUseItem??[]);
  assert.deepEqual(map.details.originalUseMsg,
    swordOracle.result.originalUseMsg??[]);
  assert.equal(map.details.originalResultOk,
    swordOracle.result.originalResultOk??null);
  assert.equal(map.details.originalFunctionReturn,
    swordOracle.result.callbackResult);
  assert.equal(map.details.randomDrawsUsed,swordOracle.consumedDraws);
  assert.equal(afterMap.shop.exp['14'],swordOracle.result.exp14);
  assert.equal(afterMap.shop.item[13],beforeMap.shop.item[13]);
  assert.equal(afterMap.shop.money,beforeMap.shop.money-12000);
  assert.equal(afterMap.shop.paytoday,beforeMap.shop.paytoday+12000);
  assert.equal(afterMap.shop.time,beforeMap.shop.time+7200);
  assert.equal(afterMap.world.market.originalWholesaleCsv.split(',').length,79);
  assert.equal(useOffer(afterMap,14).canUse,true);
  await reject(srv,'/api/use',{...usePayload(afterMap,14),useId:1});
  await reject(srv,'/api/use',{
    ...usePayload(afterMap,79),callback:'unreviewed'},400);
  const saved=await srv.post('/api/save',{
    expectedRevision:afterMap.world.revision,expectedGeneration:0,
  });
  assert.equal(saved.code,'SAVED',JSON.stringify(saved));
  assert.equal(saved.state.save.generation,1);
  const checkpoint=saved.state.world;
  await srv.stop();
  srv=await boot(directory);servers.push(srv);
  assert.equal((await srv.state()).world,null);
  const loaded=await srv.post('/api/load');
  assert.equal(loaded.code,'LOADED',JSON.stringify(loaded));
  assert.deepEqual(loaded.state.world,checkpoint);
  assert.equal(loaded.state.shop.item[78],3);
  assert.equal(loaded.state.shop.exp['14'],20);
  assert.deepEqual([40,41,42,43,44].map(id=>loaded.state.shop.item[id-1]),
    swordOracle.result.swords);
  await reject(srv,'/api/use',{...usePayload(loaded.state,14),useId:1});
  await reject(srv,'/api/use',{
    ...usePayload(loaded.state,79),
    expectedRevision:loaded.state.world.revision-1,
  });
  const {result:gift2}=await use(srv,79);
  assert.equal(gift2.state.shop.item[78],1);
  assert.deepEqual([9,12].map(id=>gift2.state.shop.item[id-1]),[2,2]);
  assert.equal(useOffer(gift2.state,79).canUse,false);
  await reject(srv,'/api/use',usePayload(gift2.state,79));
  const newer=await srv.post('/api/save',{
    expectedRevision:gift2.state.world.revision,expectedGeneration:1,
  });
  assert.equal(newer.code,'SAVED',JSON.stringify(newer));
  assert.equal(newer.state.save.generation,2);
  await reject(srv,'/api/save',{
    expectedRevision:gift2.state.world.revision,expectedGeneration:1},400);
  const checkpoint2=newer.state.world;
  await srv.stop();
  srv=await boot(directory);servers.push(srv);
  const latest=await srv.post('/api/load');
  assert.equal(latest.code,'LOADED',JSON.stringify(latest));
  assert.deepEqual(latest.state.world,checkpoint2);
  assert.equal(latest.state.save.generation,2);
  await buy(srv,10);
  const afterRebuy=await srv.state();
  assert.equal(afterRebuy.shop.exp['14'],20);
  assert.equal(afterRebuy.shop.item[78],1);
  // Generation-2 is slot A: forge a new SHA256 after illegally changing
  // gift stock to 4. Semantic source guards must still reject this save
  // and recover generation 1, not merely check a cryptographic digest.
  await srv.stop();
  const slot=join(directory,'world-a.json');
  const tampered=JSON.parse(await readFile(slot,'utf8'));
  const forged=JSON.parse(tampered.world);
  forged.shops[0].item[78]=4; // Impossible: source gift USE consumes 2.
  tampered.world=JSON.stringify(forged);
  tampered.sha256=createHash('sha256')
    .update(tampered.world,'utf8').digest('hex');
  await writeFile(slot,JSON.stringify(tampered)+'\n');
  srv=await boot(directory);servers.push(srv);
  const recoverable=await srv.state();
  assert.equal(recoverable.save.generation,1);
  assert.equal(recoverable.save.recoveryWarning,true);
  const recovered=await srv.post('/api/load');
  assert.equal(recovered.code,'LOADED',JSON.stringify(recovered));
  assert.equal(recovered.details.recoveredPreviousGeneration,true);
  assert.deepEqual(recovered.state.world,checkpoint);
  await reject(srv,'/api/use',{...usePayload(recovered.state,14),useId:1});
  const rebuy=await buy(srv,10);
  assert.equal(rebuy.state.shop.item[9],checkpoint.shops[0].item[9]+1);
  const repaired=await srv.post('/api/save',{
    expectedRevision:rebuy.state.world.revision,expectedGeneration:1,
  });
  assert.equal(repaired.code,'SAVED',JSON.stringify(repaired));
  assert.equal(repaired.state.save.generation,2);
  assert.equal(repaired.state.save.recoveryWarning,false);
});
test('R2-E full original Perl doubled/lostbook #14 USE callbacks survive durable HTTP source world',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'akimono-r2e-map-doubled-'));
  const servers=[];
  t.after(async()=>{
    for(const s of servers)await s.stop();
    await rm(dir,{recursive:true,force:true});
  });
  let srv=await boot(dir,'doubled-loss');servers.push(srv);
  await setup(srv);
  await buy(srv,14);
  const evidence=perl('original-b63-sword-map-all-outcomes-probe.pl',
    'doubled-loss');
  const {before,result}=await use(srv,14);
  assert.deepEqual([40,41,42,43,44].map(id=>result.state.shop.item[id-1]),
    evidence.result.swords);
  assert.equal(result.details.doubleRewardTriggered,true);
  assert.equal(result.details.mapDestroyed,true);
  assert.equal(result.details.randomDrawsUsed,12);
  assert.deepEqual(result.details.originalUseItem,
    evidence.result.originalUseItem??[]);
  assert.deepEqual(result.details.originalUseMsg,
    evidence.result.originalUseMsg??[]);
  assert.deepEqual(result.details.originalAddItem,evidence.result.created);
  assert.equal(result.details.originalResultOk,
    evidence.result.originalResultOk);
  assert.equal(result.state.shop.item[13],before.shop.item[13]-1);
  assert.equal(result.state.shop.exp['14'],20);
  const saved=await srv.post('/api/save',{
    expectedRevision:result.state.world.revision,expectedGeneration:0,
  });
  assert.equal(saved.code,'SAVED',JSON.stringify(saved));
  await srv.stop();
  srv=await boot(dir,'doubled-loss');servers.push(srv);
  const reloaded=await srv.post('/api/load');
  assert.equal(reloaded.code,'LOADED',JSON.stringify(reloaded));
  assert.deepEqual(reloaded.state.world,result.state.world);
  await reject(srv,'/api/use',usePayload(reloaded.state,14));
});
test('R2-E source USE local draw policy is command/revision scoped and does not accept arbitrary item IDs or sample budgets',async()=>{
  const {sourceCommandDraws}=await import('../src/local-source-command-draws.mjs');
  const world={worldId:'r2e-command-draws',revision:4,nowSeconds:1000000};
  const args={shopId:1,itemId:14,useId:0,requestedCount:1};
  const one=sourceCommandDraws({world,kind:'use-item',args,count:52});
  assert.equal(one.length,52);
  assert.ok(one.every(x=>Number.isSafeInteger(x)&&x>=0&&x<1000000));
  assert.deepEqual(one,sourceCommandDraws({world,kind:'use-item',args,count:52}));
  assert.notDeepEqual(one,sourceCommandDraws({
    world:{...world,revision:5},kind:'use-item',args,count:52}));
  assert.throws(()=>sourceCommandDraws({world,kind:'use-item',args,count:53}),
    /sample budget/);
  assert.throws(()=>sourceCommandDraws({world,kind:'use-item',
    args:{...args,unknownCallback:'lostbook'},count:52}),
    /arguments|contract/);
});


test('R2 repeated map USE real HTTP from bought map through trained time, CAS, save and restart',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'akimono-r2-repeat-http-'));
  const servers=[];
  t.after(async()=>{
    for(const server of servers)await server.stop();
    await rm(dir,{recursive:true,force:true});
  });
  let srv=await boot(dir,'mixed');servers.push(srv);
  await setup(srv);
  await buy(srv,14);
  await use(srv,79); // original 5 vouchers -> 3, obtains another real map
  const durations=[];
  for(let i=0;i<3;i++){
    const before=await srv.state();
    const offer=useOffer(before,14);
    assert.equal(offer.canUse,true,offer.reason);
    const {result}=await use(srv,14);
    durations.push(result.details.timeSpentSeconds);
    assert.equal(result.details.useTimeSeconds,offer.timePerUseSeconds);
    assert.equal(result.state.shop.time,
      before.shop.time+offer.timePerUseSeconds);
    assert.equal(result.state.shop.money,before.shop.money-12000);
    assert.equal(result.state.shop.exp['14'],20*(i+1));
    assert.equal(result.state.world.revision,before.world.revision+1);
    assert.equal(result.details.mapDestroyed,false);
    assert.equal(result.state.shop.item[13],before.shop.item[13]);
  }
  assert.deepEqual(durations,[7200,7128,7056]);
  const checkpoint=(await srv.state()).world;
  const saved=await srv.post('/api/save',{
    expectedRevision:checkpoint.revision,expectedGeneration:0,
  });
  assert.equal(saved.code,'SAVED',JSON.stringify(saved));
  await srv.stop();
  srv=await boot(dir,'mixed');servers.push(srv);
  const loaded=await srv.post('/api/load');
  assert.equal(loaded.code,'LOADED',JSON.stringify(loaded));
  assert.deepEqual(loaded.state.world,checkpoint);
  const before=await srv.state();
  const offer=useOffer(before,14);
  assert.equal(offer.timePerUseSeconds,6984);
  assert.equal(offer.canUse,true,offer.reason);
  await reject(srv,'/api/use',{
    ...usePayload(before,14),expectedRevision:before.world.revision-1,
  });
  await reject(srv,'/api/use',{
    ...usePayload(before,14),useId:1,
  });
  const {result:fourth}=await use(srv,14);
  assert.equal(fourth.details.timeSpentSeconds,6984);
  assert.equal(fourth.state.shop.exp['14'],80);
  assert.equal(fourth.state.shop.money,before.shop.money-12000);
  assert.equal(fourth.state.shop.time,before.shop.time+6984);
  assert.equal(fourth.state.world.revision,before.world.revision+1);
  const savedAgain=await srv.post('/api/save',{
    expectedRevision:fourth.state.world.revision,expectedGeneration:1,
  });
  assert.equal(savedAgain.code,'SAVED',JSON.stringify(savedAgain));
  await srv.stop();
  srv=await boot(dir,'mixed');servers.push(srv);
  const loadedAgain=await srv.post('/api/load');
  assert.equal(loadedAgain.code,'LOADED',JSON.stringify(loadedAgain));
  assert.equal(loadedAgain.state.shop.exp['14'],80);
  assert.deepEqual(loadedAgain.state.world,fourth.state.world);
});
