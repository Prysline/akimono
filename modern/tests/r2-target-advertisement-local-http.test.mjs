/**
 * R2 #62/1 optional local-only HTTP audit.
 * Normal player HTTP stays single-shop and has no target ID.
 * Uses real source PLUS/map buy/USE/sale and probes the R4 EVENT gate.
 * Does not fabricate actor inventory/money to force a positive HTTP USE;
 * positive two-shop #62/1 stays covered by the frozen-Perl memory oracle.
 * Two-shop B-43 save must fail closed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
async function boot(directory,audit){
  const child=spawn(process.execPath,['scripts/dev-local.mjs'],{
    cwd:join(root,'modern'),env:{...process.env,
      AKIMONO_PORT:'0',AKIMONO_SAVE_DIR:directory,
      AKIMONO_E2E_FIXED_NOW:'1000000',
      AKIMONO_E2E_DETERMINISTIC_RNG:'1',
      AKIMONO_R2_TARGET_AD_MEMORY_ONLY:audit?'1':'0',
    },stdio:['ignore','pipe','pipe'],
  });
  let stderr='',out='';
  child.stderr.on('data',chunk=>stderr+=chunk);
  const url=await Promise.race([
    new Promise((resolve,reject)=>{
      child.stdout.on('data',b=>{
        out+=b;
        const match=out.match(/http:\/\/127\.0\.0\.1:\d+/);
        if(match)resolve(match[0]);
      });
      child.once('error',reject);
      child.once('exit',code=>reject(Error('R2 #62/1 server exit '+code+': '+stderr)));
    }),
    new Promise((_,reject)=>setTimeout(
      ()=>reject(Error('R2 #62/1 boot timed out: '+stderr)),15000)),
  ]);
  let stopping=null;
  return {
    url,
    state:async()=>await (await fetch(url+'/api/state')).json(),
    post:async(uri,payload={})=>{
      const response=await fetch(url+uri,{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify(payload),
      });
      return {status:response.status,...await response.json()};
    },
    stop:()=>stopping??=(child.exitCode!==null||child.signalCode!==null?
      Promise.resolve():new Promise(resolve=>{
        child.once('exit',resolve);child.kill();
      })),
  };
}
async function rejected(srv,uri,payload,status){
  const before=await srv.state();
  const r=await srv.post(uri,payload);
  assert.equal(r.status,status,JSON.stringify(r));
  assert.equal(r.ok,false);
  const after=await srv.state();
  assert.deepEqual(after.world,before.world,'CAS rejection must not mutate world');
  assert.deepEqual(after.save,before.save,'rejection must not mutate disk save');
  return r;
}
test('R2 #62/1 target HTTP fields and test-only target creation are disabled by default',
async t=>{
  const dir=await mkdtemp(join(tmpdir(),'akimono-r2-target-off-'));
  const s=await boot(dir,false);
  t.after(async()=>{await s.stop();await rm(dir,{recursive:true,force:true});});
  assert.equal((await s.post('/api/initialize')).code,'COMMITTED');
  assert.equal((await s.post('/api/open-shop',{
    expectedRevision:1,ownerName:'普通商人',shopName:'單店',
  })).code,'COMMITTED');
  const original=await s.state();
  assert.equal(original.targetAdvertisementAudit,null);
  await rejected(s,'/api/r2/open-target-shop',{
    expectedRevision:2,ownerName:'無效',shopName:'無效',
  },403);
  const disabled=await rejected(s,'/api/r2/target-advertisement-preflight',{
    expectedRevision:2,targetShopId:2,
  },403);
  assert.equal(disabled.code,'R2_AUDIT_DISABLED');
  await rejected(s,'/api/use',{
    expectedRevision:2,itemId:62,useId:1,requestedCount:1,targetShopId:2,
  },403);
  assert.equal((await s.state()).world.shops.length,1);
});
test('R2 #62/1 preflight uses true GameCore source projection but does not commit or authorize any player USE',
async t=>{
  const dir=await mkdtemp(join(tmpdir(),'akimono-r2-preflight-'));
  const s=await boot(dir,true);
  t.after(async()=>{await s.stop();await rm(dir,{recursive:true,force:true});});
  assert.equal((await s.post('/api/initialize')).code,'COMMITTED');
  assert.equal((await s.post('/api/open-shop',{
    expectedRevision:1,ownerName:'廣告測試人',shopName:'來源操作店',
  })).code,'COMMITTED');
  assert.equal((await s.post('/api/supply',{
    expectedRevision:2,timespanSeconds:3600,
  })).code,'COMMITTED');
  const opened=await s.post('/api/r2/open-target-shop',{
    expectedRevision:3,ownerName:'原版目標',shopName:'合法來源目標',
  });
  assert.equal(opened.code,'COMMITTED',JSON.stringify(opened));
  const before=await s.state(),revision=before.world.revision;
  assert.equal(before.world.shops[0].item[61],0,
    'no arbitrary advertising package may be granted to simulate success');
  assert.deepEqual(before.world.period.eventState,{},
    'source event state is still known empty before time advances');
  for(const [payload,status,code] of [
    [{expectedRevision:revision,targetShopId:1},409,'INVALID_SOURCE_TARGET'],
    [{expectedRevision:revision,targetShopId:999},409,'INVALID_SOURCE_TARGET'],
    [{expectedRevision:revision-1,targetShopId:2},409,'REVISION_CONFLICT'],
  ]){
    const blocked=await rejected(s,'/api/r2/target-advertisement-preflight',
      payload,status);
    assert.equal(blocked.code,code);
  }
  for(const extraFields of [
    {shopId:1},{itemId:62},{useId:1},{randomDraws:[]},
    {money:99999999},{targetShopId:'2'},
  ]){
    const bad=await rejected(s,'/api/r2/target-advertisement-preflight',{
      expectedRevision:revision,targetShopId:2,...extraFields,
    },400);
    assert.equal(bad.ok,false);
  }
  const projected=await s.post('/api/r2/target-advertisement-preflight',{
    expectedRevision:revision,targetShopId:2,
  });
  assert.equal(projected.status,200,JSON.stringify(projected));
  assert.equal(projected.code,'R2_PREFLIGHT_CHECKED');
  assert.equal(projected.details.sourceRevision,revision);
  assert.equal(projected.details.targetShopId,2);
  assert.equal(projected.details.memoryOnly,true);
  assert.equal(projected.details.authenticated,false);
  assert.equal(projected.details.committed,false);
  assert.equal(projected.details.persisted,false);
  assert.equal(projected.details.authoritativeUseApproval,false);
  assert.equal(projected.details.sourceProjectionSucceeded,false);
  assert.equal(projected.details.sourceProjectionCode,'SOURCE_BOUNDARY_REJECTED');
  assert.match(projected.details.sourceRejectionReason,/source USE item not owned/);
  assert.equal(Object.hasOwn(projected.details,'projectedTargetRank'),false);
  assert.deepEqual(projected.state.world,before.world);
  assert.deepEqual(projected.state.save,before.save);
  assert.deepEqual(await s.state(),before,
    'even a successful preflight HTTP response must not mutate WorldState');
});
test('R2 #62/1 HTTP source shop targeting and R4 EVENT/B43 barriers fail closed without fabricated funds',
async t=>{
  const dir=await mkdtemp(join(tmpdir(),'akimono-r2-target-http-'));
  const servers=[];
  t.after(async()=>{
    for(const s of servers)await s.stop();
    await rm(dir,{recursive:true,force:true});
  });
  let s=await boot(dir,true);servers.push(s);
  assert.equal((await s.post('/api/initialize')).code,'COMMITTED');
  assert.equal((await s.post('/api/open-shop',{
    expectedRevision:1,ownerName:'廣告人',shopName:'自家廣告來源店',
  })).code,'COMMITTED');
  const first=await s.state();
  assert.deepEqual(first.targetAdvertisementAudit.targets,[]);
  const openedReadiness=first.targetAdvertisementAudit.readiness;
  assert.equal(openedReadiness.evidenceOnly,true);
  assert.equal(openedReadiness.authoritativeUseApproval,false);
  assert.equal(openedReadiness.authenticated,false);
  assert.equal(openedReadiness.actorShopId,1);
  assert.equal(openedReadiness.packageOwned,0);
  assert.equal(openedReadiness.sourceQuote,null);
  assert.equal(openedReadiness.cash,100000);
  assert.equal(openedReadiness.eventStateKnowledge,'source-known');
  assert.equal(openedReadiness.twoShopDiskSaveRejected,false);
  // A real, clean one-shop B-43 generation is our recovery baseline.
  const saved=await s.post('/api/save',{
    expectedRevision:first.world.revision,expectedGeneration:0,
  });
  assert.equal(saved.code,'SAVED',JSON.stringify(saved));
  const supply=await s.post('/api/supply',{
    expectedRevision:first.world.revision,timespanSeconds:3600,
  });
  assert.equal(supply.code,'COMMITTED',JSON.stringify(supply));
  const supplied=await s.state();
  const offer=supplied.marketOffers.find(x=>x.itemId===62);
  assert.equal(offer?.canBuy,true,'source PLUS must actually supply #62');
  // The real source #62 quote exceeds starting money. It must refuse
  // an unaffordable buy without inventing balance or inventory.
  assert.equal(supplied.shop.money,100000);
  assert.ok(offer.price>supplied.shop.money);
  const quotedReadiness=supplied.targetAdvertisementAudit.readiness;
  assert.deepEqual(quotedReadiness.sourceQuote,{
    itemId:62,unitPrice:offer.price,marketStock:offer.marketStock,
    sourceListed:true,cashShortfall:offer.price-supplied.shop.money,
  });
  assert.equal(quotedReadiness.packageOwned,0);
  assert.equal(quotedReadiness.authoritativeUseApproval,false);
  assert.deepEqual((await s.state()).targetAdvertisementAudit.readiness,
    quotedReadiness,'read-only audit cannot alter source quote or CAS');
  await rejected(s,'/api/buy',{
    expectedRevision:supplied.world.revision,
    itemId:62,requestedCount:1,
    marketShelf:offer.shelf,expectedPrice:offer.price,
  },409);
  // B-41 only certifies source-purchased #14 maps for natural sales;
  // a gift-voucher map is not silently upgraded to that sale provenance.
  // Buy a real source #14 map, USE it and sell its swords before buying #62.
  const mapOffer=supplied.marketOffers.find(x=>x.itemId===14);
  assert.equal(mapOffer?.canBuy,true,'source PLUS must supply #14 map');
  const boughtMap=await s.post('/api/buy',{
    expectedRevision:supplied.world.revision,
    itemId:14,requestedCount:1,marketShelf:mapOffer.shelf,
    expectedPrice:mapOffer.price,
  });
  assert.equal(boughtMap.code,'COMMITTED',JSON.stringify(boughtMap));
  const map=await s.post('/api/use',{
    expectedRevision:boughtMap.state.world.revision,
    itemId:14,useId:0,requestedCount:1,
  });
  assert.equal(map.code,'COMMITTED',JSON.stringify(map));
  assert.ok(map.state.shop.item[43]>0,
    'frozen #14 source GET must yield #44 swords in deterministic test');
  const showcase=await s.post('/api/showcase',{
    expectedRevision:map.state.world.revision,itemId:44,per:200,
  });
  assert.equal(showcase.code,'COMMITTED',JSON.stringify(showcase));
  // One B-41 time slice performs a real sword sale. A further slice
  // is forbidden once R4 EVENT state becomes unknown (null). The local
  // server cannot simply run additional sales to mint #62 buying money.
  const firstSale=await s.post('/api/advance-time',{
    expectedRevision:showcase.state.world.revision,minutes:60,
  });
  assert.equal(firstSale.code,'COMMITTED',JSON.stringify(firstSale));
  const earned=firstSale.state;
  assert.ok(earned.shop.money>showcase.state.shop.money,
    'source #44 sale credited actual money');
  assert.ok(earned.shop.money<earned.marketOffers.find(x=>x.itemId===62).price,
    'one certified source sale cannot fund #62');
  assert.equal(earned.world.period.eventState,null,
    'the next EVENT-dependent slice has no reviewed source overlay');
  assert.equal(earned.targetAdvertisementAudit.readiness.eventStateKnowledge,
    'unreviewed');
  assert.ok(earned.targetAdvertisementAudit.readiness.sourceQuote.cashShortfall>0);
  await rejected(s,'/api/advance-time',{
    expectedRevision:earned.world.revision,minutes:60,
  },400);
  const created=await s.post('/api/r2/open-target-shop',{
    expectedRevision:earned.world.revision,
    ownerName:'目標商人',shopName:'目標廣告來源店',
  });
  assert.equal(created.code,'COMMITTED',JSON.stringify(created));
  assert.deepEqual(created.state.targetAdvertisementAudit.targets,[
    {shopId:2,shopName:'目標廣告來源店'},
  ]);
  assert.equal(created.state.targetAdvertisementAudit.readiness.
    twoShopDiskSaveRejected,true);
  assert.equal(created.state.targetAdvertisementAudit.readiness.
    authoritativeUseApproval,false);
  const before=created.state.world;
  assert.equal(before.shops[0].item[61],0,
    'the target audit must not fabricate an advertising package');
  assert.equal(before.shops[1].item[61],0);
  const prev=await s.state();
  const projected=await s.post('/api/r2/target-advertisement-preflight',{
    expectedRevision:before.revision,targetShopId:2,
  });
  assert.equal(projected.code,'R2_PREFLIGHT_CHECKED',JSON.stringify(projected));
  assert.equal(projected.details.sourceProjectionSucceeded,false);
  assert.equal(projected.details.sourceProjectionCode,'SOURCE_BOUNDARY_REJECTED');
  assert.match(projected.details.sourceRejectionReason,
    /unreviewed source EVENT/);
  assert.deepEqual(await s.state(),prev,
    'unreviewed EVENT preflight must also leave world and save unchanged');
  // The audit's two-shop world must not accidentally unlock other
  // single-shop commands, even if their individual Registry rules exist.
  for(const [uri,payload] of [
    ['/api/use',{expectedRevision:before.revision,
      itemId:79,useId:0,requestedCount:1}],
    ['/api/discard',{expectedRevision:before.revision,
      itemId:9,count:1}],
    ['/api/advance-time',{expectedRevision:before.revision,minutes:1}],
    ['/api/showcase',{expectedRevision:before.revision,
      itemId:44,per:100}],
  ]){
    const denied=await rejected(s,uri,payload,409);
    assert.equal(denied.code,'UNREVIEWED_TWO_SHOP_ACTION');
  }
  for(const patch of [
    {targetShopId:1},{targetShopId:999},
    {targetShopId:'2'},
  ])await rejected(s,'/api/use',{
    expectedRevision:before.revision,itemId:62,useId:1,
    requestedCount:1,...patch,
  },patch.targetShopId==='2'?400:409);
  await rejected(s,'/api/use',{
    expectedRevision:before.revision,itemId:62,useId:1,
    requestedCount:1,targetShopId:2,randomDraws:[0],
  },400);
  const unsupported=await rejected(s,'/api/use',{
    expectedRevision:before.revision,itemId:65,useId:1,
    requestedCount:1,targetShopId:2,
  },409);
  assert.equal(unsupported.code,'UNREVIEWED_TWO_SHOP_ACTION');
  // A valid authoritative target ID still cannot bypass original
  // ownership and unknown EVENT gates. The independent memory-only
  // frozen Perl oracle is the positive #62/1 comparison.
  const blocked=await rejected(s,'/api/use',{
    expectedRevision:before.revision,itemId:62,useId:1,
    requestedCount:1,targetShopId:2,
  },409);
  assert.equal(blocked.code,'SOURCE_BOUNDARY_REJECTED');
  const stale=await rejected(s,'/api/use',{
    expectedRevision:before.revision-1,itemId:62,useId:1,
    requestedCount:1,targetShopId:2,
  },409);
  assert.equal(stale.code,'REVISION_CONFLICT');
  const refused=await rejected(s,'/api/save',{
    expectedRevision:before.revision,expectedGeneration:1,
  },409);
  assert.equal(refused.code,'MULTI_SHOP_PERSISTENCE_UNREVIEWED');
  // Restart cannot load the multi-shop in-memory branch. The already saved
  // one-shop generation remains valid and exactly recoverable.
  await s.stop();
  s=await boot(dir,false);servers.push(s);
  const loaded=await s.post('/api/load');
  assert.equal(loaded.code,'LOADED',JSON.stringify(loaded));
  assert.deepEqual(loaded.state.world,first.world);
  assert.equal(loaded.state.world.shops.length,1);
  assert.equal(loaded.state.save.generation,1);
  assert.equal(loaded.state.targetAdvertisementAudit,null);
});
