import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,execFileSync} from 'node:child_process';
import {createLocalWorldSaveStore,LOCAL_SAVE_FORMAT}
  from '../src/local-world-save-store.mjs';
import {createMemoryWorld,createMemoryWorldAdapter,executeMemoryCommand,
  encodeMemorySnapshot} from '../src/game-core-contract.mjs';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=rel=>readFile(join(root,rel),'utf8');
const names=[
  'itemDsl','rebelDsl','originalAdminInitSource','originalDataReadSource',
  'originalDataWriteSource','originalTurnSource','originalWholeSource',
  'originalConfigSource','originalCompilerSource',
  'originalBuySource','originalBuyItemSource','originalBuyCalcSource',
  'originalMarketSource','originalItemSource','originalDetailSource',
];
const paths=[
  'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
  'modern/tests/original-perl/core-inc-admin-func.cgi',
  'modern/tests/original-perl/inc-func.cgi',
  'modern/tests/original-perl/write.cgi',
  'modern/tests/original-perl/inc-turn.cgi',
  'modern/tests/original-perl/whole.cgi','_config.cgi',
  'modern/tests/original-perl/inc-makeitem.cgi',
  'modern/tests/original-perl/buy-s.cgi',
  'modern/tests/original-perl/item.cgi',
  'modern/tests/original-perl/calc.cgi',
  'modern/tests/original-perl/market.cgi',
  'modern/tests/original-perl/item.cgi',
  'modern/tests/original-perl/core-detail.cgi',
];
const originals=await Promise.all(paths.map(read));
const street=createStandardStreetModule(Object.fromEntries(names.map((n,i)=>[n,originals[i]])));
const sourceSupply=JSON.parse(execFileSync('perl',['original-market-buy10-probe.pl'],{
  cwd:join(root,'modern/tests/original-perl'),encoding:'utf8',
})).supply;
function sample(){
  const repository=createMemoryWorldAdapter(createMemoryWorld({
    worldId:'save-fixture',streetId:'standard-street',nowSeconds:1000000,
  }));
  const apply=(kind,args={})=>executeMemoryCommand({
    repository,streetModule:street,command:{kind,
      expectedRevision:repository.read().revision,...args},
  });
  assert.ok(apply('initialize-source-market').ok);
  assert.ok(apply('open-shop',{
    shopId:1,ownerName:'來源店主',shopName:'磁碟持續經營',
  }).ok);
  assert.ok(apply('reviewed-sparse-all-plus',{
    timespanSeconds:60,randomDraws:sourceSupply.draws,
  }).ok);
  const offer=street.quoteMarketItem10(repository.read());
  assert.ok(apply('buy-market-item-10',{
    shopId:1,requestedCount:1,marketShelf:offer.shelf,expectedPrice:offer.price,
  }).ok);
  assert.ok(apply('edit-showcase',{
    shopId:1,shelf:0,itemId:10,per:100,priceOverride:5000,
  }).ok);
  return {repository,apply};
}
async function inDir(t){
  const directory=await mkdtemp(join(tmpdir(),'akimono-b43-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  return directory;
}
test('B-43 two verified generations exactly restore source purchase, shelf and WorldState CAS',async t=>{
  const directory=await inDir(t);
  const store=createLocalWorldSaveStore({directory});
  assert.deepEqual(store.status(),{
    available:false,generation:0,recoveryWarning:false,unreadable:false,
  });
  const {repository,apply}=sample();
  const first=repository.read();
  const saved=store.save(first,{expectedGeneration:0});
  assert.equal(saved.generation,1);
  assert.equal(saved.revision,5);
  const second=apply('advance-source-time',{
    shopId:1,minutes:30,
    randomDraws:JSON.parse(execFileSync('perl',['original-b41-real-sale-probe.pl'],{
      cwd:join(root,'modern/tests/original-perl'),encoding:'utf8',
    })).sale30.consumedSamples,
  });
  assert.ok(second.ok);
  assert.equal(second.world.shops[0].money,100000);
  store.save(second.world,{expectedGeneration:1});
  const loaded=store.load();
  assert.equal(loaded.generation,2);
  assert.equal(loaded.recovered,false);
  assert.equal(encodeMemorySnapshot(loaded.world),encodeMemorySnapshot(second.world));
  const recovered=createMemoryWorldAdapter(loaded.world);
  assert.equal(recovered.read().revision,6);
  const quote=street.quoteMarketItem10(recovered.read());
  const bought=executeMemoryCommand({repository:recovered,streetModule:street,
    command:{kind:'buy-market-item-10',expectedRevision:6,
      shopId:1,requestedCount:1,marketShelf:quote.shelf,
      expectedPrice:quote.price}});
  assert.ok(bought.ok,JSON.stringify(bought.details));
  assert.equal(bought.world.shops[0].item[9],1);
  assert.equal(bought.world.shops[0].money,95000);
  assert.throws(()=>store.save(bought.world,{expectedGeneration:1}),
    /存檔世代衝突/);
  assert.throws(()=>store.save({...bought.world,worldId:'another'},{
    expectedGeneration:2,
  }),/禁止用新世界覆寫/);
  assert.equal(store.load().generation,2);
});
test('B-43 corrupted latest slot recovers prior generation and prevents overwriting last good save',async t=>{
  const directory=await inDir(t);
  const store=createLocalWorldSaveStore({directory});
  const {repository}=sample();
  store.save(repository.read(),{expectedGeneration:0});
  store.save(repository.read(),{expectedGeneration:1});
  await writeFile(join(directory,'world-a.json'),'{"corrupted":', 'utf8');
  assert.deepEqual(store.status(),{
    available:true,generation:1,recoveryWarning:true,unreadable:false,
  });
  const old=store.load();
  assert.equal(old.recovered,true);
  assert.equal(old.world.revision,5);
  store.save(old.world,{expectedGeneration:1});
  assert.equal(store.load().generation,2);
  await writeFile(join(directory,'world-a.json'),'corrupted','utf8');
  await writeFile(join(directory,'world-b.json'),'corrupted','utf8');
  assert.equal(store.status().unreadable,true);
  assert.throws(()=>store.load(),/存檔損毀/);
  assert.throws(()=>store.save(repository.read(),{expectedGeneration:0}),
    /all existing save records are invalid/);
  assert.equal(await readFile(join(directory,'world-a.json'),'utf8'),'corrupted');
});
test('B-43 source-backed saved world rejects arbitrary stock and integrity mismatch',async t=>{
  const directory=await inDir(t),store=createLocalWorldSaveStore({directory});
  const {repository}=sample(),world=repository.read();
  assert.throws(()=>store.save({...world,shops:[{
    ...world.shops[0],item:world.shops[0].item.map((n,i)=>i===9?17:n),
    itemtoday:{'10':-2},
  }]},{expectedGeneration:0}),/invalid|source|save/);
  // A harmless-looking valid JSON with forged checksum is never accepted.
  store.save(world,{expectedGeneration:0});
  const filename=join(directory,'world-b.json');
  const record=JSON.parse(await readFile(filename,'utf8'));
  assert.equal(record.format,LOCAL_SAVE_FORMAT);
  record.world=record.world.replace('"money":95000','"money":999999');
  await writeFile(filename,JSON.stringify(record),'utf8');
  assert.equal(store.status().unreadable,true);
  assert.throws(()=>store.load(),/存檔損毀/);
});
async function boot(directory){
  const child=spawn(process.execPath,['scripts/dev-local.mjs'],{
    cwd:join(root,'modern'),
    env:{...process.env,AKIMONO_PORT:'0',AKIMONO_SAVE_DIR:directory,
      AKIMONO_E2E_FIXED_NOW:'1000000',
      AKIMONO_E2E_DETERMINISTIC_RNG:'1'},
    stdio:['ignore','pipe','pipe'],
  });
  const url=await Promise.race([
    new Promise((resolve,reject)=>{
      let output='',err='';
      child.stderr.on('data',x=>err+=x);
      child.stdout.on('data',x=>{
        output+=x;
        const match=output.match(/http:\/\/127\.0\.0\.1:\d+/);
        if(match)resolve(match[0]);
      });
      child.once('error',reject);
      child.once('exit',code=>reject(Error('server exited '+code+': '+err)));
    }),
    new Promise((_,reject)=>setTimeout(()=>reject(Error('server start timeout')),10000)),
  ]);
  const post=async(endpoint,data={})=>{
    const res=await fetch(url+endpoint,{
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify(data),
    });
    return {status:res.status,...await res.json()};
  };
  const state=async()=>await (await fetch(url+'/api/state')).json();
  // SIGTERM-terminated children keep exitCode=null, but signalCode is set.
  // A repeated cleanup must never await an already emitted 'exit' event.
  let stopping=null;
  const stop=()=>stopping??=(
    child.exitCode!==null||child.signalCode!==null
      ?Promise.resolve()
      :new Promise(resolve=>{
        child.once('exit',resolve);
        child.kill();
      })
  );
  return {child,url,post,state,stop};
}
test('B-43 real HTTP save -> stop Node -> restart -> load -> continue sale and two-slot corruption recovery',async t=>{
  const directory=await inDir(t);
  const servers=[];
  t.after(async()=>{for(const s of servers)await s.stop()});
  let server=await boot(directory);servers.push(server);
  const html=await (await fetch(server.url)).text();
  assert.match(html,/id="save-world"/);
  assert.match(html,/id="load-world"/);
  const initialized=await server.post('/api/initialize');
  assert.ok(initialized.ok);
  assert.equal(initialized.state.world.schema,'akimono.memory-world.v2');
  assert.equal(initialized.state.world.period.town.develop,5001);
  assert.equal(initialized.state.world.period.dtPeople,500000);
  assert.deepEqual(initialized.state.world.period.eventState,{},
    'original first-world empty active EVENT table is reviewed');
  assert.ok((await server.post('/api/open-shop',{
    expectedRevision:1,ownerName:'實際店主',shopName:'可復原測試商店',
  })).ok);
  assert.ok((await server.post('/api/supply',{
    expectedRevision:2,timespanSeconds:60,
  })).ok);
  let st=await server.state();
  assert.ok((await server.post('/api/buy',{
    expectedRevision:3,requestedCount:1,marketShelf:st.item10.shelf,
    expectedPrice:st.item10.price,
  })).ok);
  assert.ok((await server.post('/api/showcase',{
    expectedRevision:4,itemId:10,priceOverride:5000,
  })).ok);
  const first=await server.post('/api/advance-time',{expectedRevision:5,minutes:30});
  assert.ok(first.ok,JSON.stringify(first));
  assert.equal(first.state.shop.money,100000);
  assert.equal(first.state.shop.item[9],0);
  const saved1=await server.post('/api/save',{
    expectedRevision:6,expectedGeneration:0,
  });
  assert.ok(saved1.ok,JSON.stringify(saved1));
  assert.equal(saved1.state.save.generation,1);
  const conflict=await server.post('/api/save',{
    expectedRevision:5,expectedGeneration:1,
  });
  assert.equal(conflict.status,409);
  assert.equal(conflict.state.save.generation,1);
  const quote=await server.state();
  assert.ok((await server.post('/api/buy',{
    expectedRevision:6,requestedCount:1,
    marketShelf:quote.item10.shelf,expectedPrice:5000,
  })).ok);
  const saved2=await server.post('/api/save',{
    expectedRevision:7,expectedGeneration:1,
  });
  assert.ok(saved2.ok,JSON.stringify(saved2));
  assert.equal(saved2.state.save.generation,2);
  const oldId=saved2.state.world.worldId;
  await server.stop();
  server=await boot(directory);servers.push(server);
  const pending=await server.state();
  assert.equal(pending.world,null);
  assert.equal(pending.save.generation,2);
  const refusedNew=await server.post('/api/initialize');
  assert.equal(refusedNew.status,409);
  const loaded=await server.post('/api/load');
  assert.ok(loaded.ok,JSON.stringify(loaded));
  assert.equal(loaded.state.world.worldId,oldId);
  assert.equal(loaded.state.world.revision,7);
  assert.equal(loaded.state.world.schema,'akimono.memory-world.v2');
  assert.equal(loaded.state.world.period.town.develop,5001);
  assert.equal(loaded.state.world.period.dtPeople,500000);
  assert.equal(loaded.state.world.period.settledCount,0);
  assert.equal(loaded.state.world.period.eventState,null,
    'source EVENT callbacks not yet executed: active event state unknown');
  assert.equal(loaded.state.shop.item[9],1);
  assert.equal(loaded.state.shop.money,95000);
  assert.equal(loaded.state.shop.paytoday,10000);
  const duplicate=await server.post('/api/load');
  assert.equal(duplicate.status,409);
  const next=await server.post('/api/advance-time',{
    expectedRevision:7,minutes:30,
  });
  assert.ok(next.ok,JSON.stringify(next));
  assert.equal(next.state.shop.item[9],0);
  assert.equal(next.state.shop.saletoday,10000);
  assert.equal(next.state.shop.money,100000);
  const saved3=await server.post('/api/save',{
    expectedRevision:8,expectedGeneration:2,
  });
  assert.ok(saved3.ok);
  await server.stop();
  await writeFile(join(directory,'world-b.json'),'crash-torn-json','utf8');
  server=await boot(directory);servers.push(server);
  assert.equal((await server.state()).save.recoveryWarning,true);
  const fromBackup=await server.post('/api/load');
  assert.ok(fromBackup.ok,JSON.stringify(fromBackup));
  assert.equal(fromBackup.details.recoveredPreviousGeneration,true);
  assert.equal(fromBackup.state.world.revision,7);
  assert.equal(fromBackup.state.shop.item[9],1);
  const resumed=await server.post('/api/advance-time',{
    expectedRevision:7,minutes:30,
  });
  assert.ok(resumed.ok);
  assert.equal(resumed.state.shop.saletoday,10000);
  const overwriteBad=await server.post('/api/save',{
    expectedRevision:8,expectedGeneration:2,
  });
  assert.ok(overwriteBad.ok);
  assert.equal(overwriteBad.state.save.generation,3);
});
