/**
 * R2 #62/1 optional local-only HTTP audit.
 * Normal player HTTP stays single-shop and has no target ID.
 * The audit uses actual source open-shop -> PLUS -> market-buy -> UseItem,
 * NOT a forged actor inventory. Two-shop B-43 save must fail closed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
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
function oracle(world){
  const [shop,target]=world.shops;
  return JSON.parse(execFileSync('perl',[
    'original-r2-target-advertise-use-probe.pl',JSON.stringify({
      itemId:62,useId:1,stock:shop.item,targetStock:target.item,
      rank:shop.rank,targetRank:target.rank,
      job:shop.job??'',exp:shop.exp??{},
      wholesale:world.market.wholesale,
      money:shop.money,paytoday:shop.paytoday,time:shop.time,
      nowSeconds:world.nowSeconds,
      requestedCount:1,randomDraws:[],
    }),
  ],{cwd:join(root,'modern/tests/original-perl'),
    encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024}));
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
  await rejected(s,'/api/use',{
    expectedRevision:2,itemId:62,useId:1,requestedCount:1,targetShopId:2,
  },403);
  assert.equal((await s.state()).world.shops.length,1);
});
test('R2 #62/1 genuine HTTP market purchase, source-created target, Perl diff, single CAS, no B-43 multi-shop persistence',
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
  // Starting gold is 100000; the genuine #62 quote exceeds that.
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
  let earned=showcase.state,saleItemId=44;
  for(let hour=0;hour<12;hour++){
    const live=earned.marketOffers.find(x=>x.itemId===62);
    if(live?.canBuy&&earned.shop.money>=live.price)break;
    // The reviewed #14 source also produces #43; switch to that real
    // sword if both #44 sales alone do not cover the quoted #62 price.
    if(earned.shop.item[saleItemId-1]===0){
      if(saleItemId!==44)break;
      saleItemId=43;
      const edited=await s.post('/api/showcase',{
        expectedRevision:earned.world.revision,itemId:saleItemId,per:200,
      });
      assert.equal(edited.code,'COMMITTED',JSON.stringify(edited));
      earned=edited.state;
    }
    const step=await s.post('/api/advance-time',{
      expectedRevision:earned.world.revision,minutes:60,
    });
    assert.equal(step.code,'COMMITTED',JSON.stringify(step));
    earned=step.state;
  }
  const affordable=earned.marketOffers.find(x=>x.itemId===62);
  assert.equal(affordable?.canBuy,true,
    'advertising package must remain available from source PLUS');
  assert.ok(earned.shop.money>=affordable.price,
    'only authentic source sales may fund the expensive original package');
  const bought=await s.post('/api/buy',{
    expectedRevision:earned.world.revision,
    itemId:62,requestedCount:1,
    marketShelf:affordable.shelf,expectedPrice:affordable.price,
  });
  assert.equal(bought.code,'COMMITTED',JSON.stringify(bought));
  assert.equal(bought.state.world.shops[0].item[61],1,
    'advertising package must come from market-buy');
  const created=await s.post('/api/r2/open-target-shop',{
    expectedRevision:bought.state.world.revision,
    ownerName:'目標商人',shopName:'目標廣告來源店',
  });
  assert.equal(created.code,'COMMITTED',JSON.stringify(created));
  assert.deepEqual(created.state.targetAdvertisementAudit.targets,[
    {shopId:2,shopName:'目標廣告來源店'},
  ]);
  const before=created.state.world;
  assert.equal(before.shops[0].item[61],1);
  assert.equal(before.shops[1].item[61],0);
  const perl=oracle(before);
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
  await rejected(s,'/api/use',{
    expectedRevision:before.revision,itemId:65,useId:1,
    requestedCount:1,targetShopId:2,
  },403);
  const executed=await s.post('/api/use',{
    expectedRevision:before.revision,itemId:62,useId:1,
    requestedCount:1,targetShopId:2,
  });
  assert.equal(executed.code,'COMMITTED',JSON.stringify(executed));
  assert.equal(executed.details.targetShopId,2);
  assert.equal(executed.state.world.revision,before.revision+1);
  const [actor,target]=executed.state.world.shops;
  assert.deepEqual(actor.item,perl.result.stock);
  assert.deepEqual(target.item,perl.result.targetStock);
  assert.equal(actor.time,perl.result.time);
  assert.equal(actor.money,perl.result.money);
  assert.equal(actor.paytoday,perl.result.paytoday);
  assert.equal(actor.rank,perl.result.rank);
  assert.equal(target.rank,perl.result.targetRank);
  assert.deepEqual(actor.exp??{},perl.result.exp);
  assert.deepEqual(executed.details.originalUseItem,perl.result.useitem);
  assert.deepEqual(executed.details.originalInlineLogCalls,perl.result.logs);
  assert.equal(executed.details.originalFunctionReturn,
    perl.result.functionReturn);
  assert.equal(executed.details.experienceGain,0);
  assert.equal(executed.details.randomDrawsUsed,0);
  assert.equal(perl.result.drawsUsed,0);
  assert.deepEqual(perl.result.randomRanges,[]);
  await rejected(s,'/api/use',{
    expectedRevision:before.revision,itemId:62,useId:1,
    requestedCount:1,targetShopId:2,
  },409);
  const refused=await rejected(s,'/api/save',{
    expectedRevision:executed.state.world.revision,expectedGeneration:1,
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
