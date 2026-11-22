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
  assert.ok(supplied.useOffers.length>=6);
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
  assert.match(html,/<ul id="use-offers" class="use-action-list">/);
  assert.match(html,/id="tab-use"/);
  assert.match(html,/id="tab-use-result"/);
  assert.match(app,/button\.dataset\.openUse=String\(row\.useId\)/);
  assert.match(app,/useOffers/);
  assert.match(app,/call\('\/api\/use'/);
  assert.doesNotMatch(app,/gift-exchange-maps|use-original-sword-map-14/);
  assert.deepEqual((await srv.state()).useOffers.slice(0,6).map(x=>[x.itemId,x.useId]),
    [[79,0],[79,1],[79,2],[79,3],[79,4],[14,0]]);
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


test('R2 pure-source gift variants #79/4 and #79/3 execute real HTTP/CAS/dual-save/restart',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'akimono-r2-gift-variants-http-'));
  const servers=[];
  t.after(async()=>{
    for(const server of servers)await server.stop();
    await rm(dir,{recursive:true,force:true});
  });
  let srv=await boot(dir);servers.push(srv);
  await setup(srv);
  const initial=await srv.state();
  const offering=(state,useId)=>state.useOffers.find(
    row=>row.itemId===79&&row.useId===useId);
  assert.equal(offering(initial,4).canUse,true);
  assert.equal(offering(initial,3).canUse,true);
  assert.equal(offering(initial,2).canUse,false);
  await reject(srv,'/api/use',{
    expectedRevision:initial.world.revision,
    itemId:79,useId:2,requestedCount:1,
  });
  const per4=perl('original-r2-gift-use-variants-probe.pl',
    JSON.stringify({useId:4,initialGift:5,requestedCount:1}));
  const first=await srv.post('/api/use',{
    expectedRevision:initial.world.revision,itemId:79,useId:4,
    requestedCount:1,
  });
  assert.equal(first.code,'COMMITTED',JSON.stringify(first));
  assert.equal(first.state.shop.item[78],per4.result.item[78]);
  assert.equal(first.state.shop.item[24],per4.result.item[24]);
  assert.deepEqual(first.details.originalAddItem,per4.result.additem);
  assert.equal(first.state.shop.time,
    initial.shop.time+per4.compiled.time);
  assert.equal(first.state.world.revision,initial.world.revision+1);
  const save1=await srv.post('/api/save',{
    expectedRevision:first.state.world.revision,expectedGeneration:0,
  });
  assert.equal(save1.code,'SAVED',JSON.stringify(save1));
  await srv.stop();
  srv=await boot(dir);servers.push(srv);
  const load1=await srv.post('/api/load');
  assert.equal(load1.code,'LOADED',JSON.stringify(load1));
  assert.deepEqual(load1.state.world,first.state.world);
  assert.equal(offering(load1.state,3).canUse,true);
  const before3=await srv.state();
  const second=await srv.post('/api/use',{
    expectedRevision:before3.world.revision,itemId:79,useId:3,
    requestedCount:1,
  });
  assert.equal(second.code,'COMMITTED',JSON.stringify(second));
  assert.equal(second.state.shop.item[78],2);
  assert.equal(second.state.shop.item[36],1);
  assert.equal(second.state.shop.item[24],1);
  assert.equal(second.state.shop.time,before3.shop.time+1800);
  assert.equal(second.state.shop.money,before3.shop.money);
  assert.equal(second.state.world.revision,before3.world.revision+1);
  await reject(srv,'/api/use',{
    expectedRevision:before3.world.revision,itemId:79,useId:4,
    requestedCount:1,
  });
  const save2=await srv.post('/api/save',{
    expectedRevision:second.state.world.revision,expectedGeneration:1,
  });
  assert.equal(save2.code,'SAVED',JSON.stringify(save2));
  await srv.stop();
  srv=await boot(dir);servers.push(srv);
  const load2=await srv.post('/api/load');
  assert.equal(load2.code,'LOADED',JSON.stringify(load2));
  assert.deepEqual(load2.state.world,second.state.world);
  assert.equal(load2.state.save.generation,2);
  assert.equal(offering(load2.state,4).canUse,true);
});

test('R2 source-reachable #79/3 kit -> PLUS #8 stones -> #37/1 training, durable two generations and restart',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'akimono-r2-material-chain-'));
  const servers=[];
  t.after(async()=>{
    for(const server of servers)await server.stop();
    await rm(dir,{recursive:true,force:true});
  });
  let srv=await boot(dir);servers.push(srv);
  await setup(srv);
  let before=await srv.state();
  assert.equal(before.shop.item[36],0,'fresh player cannot start with training kit');
  assert.equal(before.shop.item[18],0,'fresh player has no magic knowledge');
  const gift=await srv.post('/api/use',{
    expectedRevision:before.world.revision,
    itemId:79,useId:3,requestedCount:1,
  });
  assert.equal(gift.code,'COMMITTED',JSON.stringify(gift));
  assert.equal(gift.state.shop.item[78],3);
  assert.equal(gift.state.shop.item[36],1,
    'training kit comes from source voucher exchange, not test fixture');
  // Source natural-sale/PLUS time slices require the reviewed original
  // post-buy GetWholeStore wire, not the isolated bootstrap/supply wire.
  await buy(srv,10);
  // Let the actual source time slice run natural sales, PLUS and EVENT
  // checks. No HTTP operation can inject wholesale stock or random draws.
  let obtained=false;
  for(let hour=0;hour<16;hour++){
    const state=await srv.state();
    if((find(state,8)?.marketStock??0)>=30){
      obtained=true;break;
    }
    const turn=await srv.post('/api/advance-time',{
      expectedRevision:state.world.revision,minutes:60,
    });
    assert.equal(turn.code,'COMMITTED',
      'source-reachable magic-stone PLUS turn: '+JSON.stringify(turn));
  }
  assert.equal(obtained,true,'original market supply must yield 30 stones');
  before=await srv.state();
  const stoneOffer=find(before,8);
  assert.equal(stoneOffer.canBuy,true,'real original market buy for #8');
  const buyStones=await srv.post('/api/buy',{
    expectedRevision:before.world.revision,itemId:8,requestedCount:30,
    marketShelf:stoneOffer.shelf,expectedPrice:stoneOffer.price,
  });
  assert.equal(buyStones.code,'COMMITTED',JSON.stringify(buyStones));
  assert.equal(buyStones.details.purchasedCount,30);
  assert.equal(buyStones.state.shop.item[7],30);
  assert.equal(buyStones.state.shop.item[36],1);
  const ready=buyStones.state;
  const trainOffer=ready.useOffers.find(x=>x.itemId===37&&x.useId===1);
  assert.equal(trainOffer.canUse,true,trainOffer.reason);
  const trained=await srv.post('/api/use',{
    expectedRevision:ready.world.revision,
    itemId:37,useId:1,requestedCount:1,
  });
  assert.equal(trained.code,'COMMITTED',JSON.stringify(trained));
  assert.equal(trained.details.experienceGain,50);
  assert.equal(trained.state.shop.item[36],0,'training consumes the gift kit');
  assert.equal(trained.state.shop.item[7],0,'training consumes all 30 stones');
  assert.equal(trained.state.shop.item[18],1,'original USE creates magic knowledge');
  assert.equal(trained.state.shop.exp['37'],50);
  assert.equal(trained.state.shop.item[78],3);
  const checkpoint=trained.state.world;
  const saved1=await srv.post('/api/save',{
    expectedRevision:checkpoint.revision,expectedGeneration:0,
  });
  assert.equal(saved1.code,'SAVED',JSON.stringify(saved1));
  assert.equal(saved1.state.save.generation,1);
  await srv.stop();
  srv=await boot(dir);servers.push(srv);
  const loaded1=await srv.post('/api/load');
  assert.equal(loaded1.code,'LOADED',JSON.stringify(loaded1));
  assert.deepEqual(loaded1.state.world,checkpoint);
  const saved2=await srv.post('/api/save',{
    expectedRevision:checkpoint.revision,expectedGeneration:1,
  });
  assert.equal(saved2.code,'SAVED',JSON.stringify(saved2));
  assert.equal(saved2.state.save.generation,2);
  await srv.stop();
  srv=await boot(dir);servers.push(srv);
  const loaded2=await srv.post('/api/load');
  assert.equal(loaded2.code,'LOADED',JSON.stringify(loaded2));
  assert.equal(loaded2.state.save.generation,2);
  assert.deepEqual(loaded2.state.world,checkpoint);
  // A correctly re-hashed save with invented second training output/EXP
  // still must fail the SOURCE provenance validation and recover generation 1.
  await srv.stop();
  const slot=join(dir,'world-a.json');
  const tampered=JSON.parse(await readFile(slot,'utf8'));
  const forged=JSON.parse(tampered.world);
  forged.shops[0].item[18]=2;
  forged.shops[0].exp['37']=100;
  tampered.world=JSON.stringify(forged);
  tampered.sha256=createHash('sha256')
    .update(tampered.world,'utf8').digest('hex');
  await writeFile(slot,JSON.stringify(tampered)+'\n');
  srv=await boot(dir);servers.push(srv);
  const fallback=await srv.post('/api/load');
  assert.equal(fallback.code,'LOADED',JSON.stringify(fallback));
  assert.equal(fallback.state.save.generation,1);
  assert.equal(fallback.details.recoveredPreviousGeneration,true);
  assert.deepEqual(fallback.state.world,checkpoint);
});
