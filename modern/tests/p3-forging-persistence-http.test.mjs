/**
 * P3 first stage: source market/gifts, mining, training and iron manufacture.
 * On-disk rewriting below is exclusively the negative corruption/forgery test.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {encodeMemorySnapshot,validateMemoryWorld} from '../src/game-core-contract.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
async function boot(directory,{reviewedTime=false,now='1000000'}={}){
  const child=spawn(process.execPath,[reviewedTime?'scripts/dev-local.mjs':'tests/support/legacy-dev-local.mjs'],{
    cwd:join(root,'modern'),env:{...process.env,
      AKIMONO_PORT:'0',AKIMONO_SAVE_DIR:directory,
      AKIMONO_E2E_FIXED_NOW:now,AKIMONO_E2E_DETERMINISTIC_RNG:reviewedTime?'0':'1',
    },stdio:['ignore','pipe','pipe'],
  });
  let stderr='';
  child.stderr.on('data',b=>stderr+=b);
  let timer;
  const url=await Promise.race([
    new Promise((resolve,reject)=>{
      let output='';
      child.stdout.on('data',b=>{
        output+=b;
        const match=output.match(/http:\/\/127\.0\.0\.1:\d+/);
        if(match)resolve(match[0]);
      });
      child.once('exit',code=>reject(Error('P3 server exit '+code+': '+stderr)));
      child.once('error',reject);
    }),
    new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(Error('P3 startup timeout '+stderr)),15000);
    }),
  ]).finally(()=>clearTimeout(timer));
  const state=async()=>await(await fetch(url+'/api/state')).json();
  const post=async(route,body={})=>{
    const response=await fetch(url+route,{method:'POST',
      headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    return {status:response.status,...await response.json()};
  };
  let stopping=null;
  const stop=()=>stopping??=child.exitCode!==null||child.signalCode!==null?
    Promise.resolve():new Promise(resolve=>{child.once('exit',resolve);child.kill();});
  return {state,post,stop};
}
async function open(s){
  assert.equal((await s.post('/api/initialize')).code,'COMMITTED');
  assert.equal((await s.post('/api/open-shop',{
    expectedRevision:1,ownerName:'來源鍛造者',shopName:'P3 鍛造存檔',
  })).code,'COMMITTED');
}
async function use(s,itemId,useId,requestedCount=1){
  const before=await s.state();
  const result=await s.post('/api/use',{expectedRevision:before.world.revision,
    itemId,useId,requestedCount});
  assert.equal(result.code,'COMMITTED',JSON.stringify(result));
  assert.equal(result.state.world.revision,before.world.revision+1);
  return result;
}
async function supply(s){
  const before=await s.state();
  const result=await s.post('/api/supply',{expectedRevision:before.world.revision,
    timespanSeconds:3600});
  assert.equal(result.code,'COMMITTED',JSON.stringify(result));
  return result;
}
async function buy(s,itemId,requestedCount=1){
  const before=await s.state();
  const offer=before.marketOffers.find(o=>o.itemId===itemId);
  assert.equal(offer?.canBuy,true,'original PLUS quote #'+itemId);
  const result=await s.post('/api/buy',{expectedRevision:before.world.revision,
    itemId,requestedCount,marketShelf:offer.shelf,expectedPrice:offer.price});
  assert.equal(result.code,'COMMITTED',JSON.stringify(result));
  assert.equal(result.details.purchasedCount,requestedCount);
  return result;
}
async function save(s,generation){
  const before=await s.state();
  const result=await s.post('/api/save',{expectedRevision:before.world.revision,
    expectedGeneration:generation});
  assert.equal(result.code,'SAVED',JSON.stringify(result));
  assert.equal(result.state.save.generation,generation+1);
  return result.state.world;
}
async function denied(s,fields,status=409){
  const before=await s.state();
  const result=await s.post('/api/use',{expectedRevision:before.world.revision,
    itemId:78,useId:0,requestedCount:1,...fields});
  assert.equal(result.status,status,JSON.stringify(result));
  assert.deepEqual((await s.state()).world,before.world);
}
async function restartLoad(s,dir,servers,options){
  await s.stop();
  const next=await boot(dir,options);servers.push(next);
  const loaded=await next.post('/api/load');
  assert.equal(loaded.code,'LOADED',JSON.stringify(loaded));
  return {s:next,loaded};
}
const hash=s=>createHash('sha256').update(s,'utf8').digest('hex');
const rehash=record=>{
  record.sha256=hash(Object.hasOwn(record,'careerProof')?
    JSON.stringify([record.world,record.careerProof]):record.world);
};

for(const [book,skill,product] of [[20,18,41],[21,18,47],[22,18,53],[23,19,58]]){
  test('P3 #'+book+'/0 legitimate iron craft survives two disk generations without career',async t=>{
    const dir=await mkdtemp(join(tmpdir(),'akimono-p3-iron-'));
    const servers=[];
    t.after(async()=>{for(const server of servers)await server.stop();
      await rm(dir,{recursive:true,force:true});});
    let s=await boot(dir);servers.push(s);
    await open(s);
    await denied(s,{itemId:book,useId:0}); // no book
    await use(s,79,0); // voucher -> mine map
    const mine=await use(s,9,0,skill===18?3:2);
    assert.equal(mine.details.effectiveCount,skill===18?3:2);
    assert.ok(mine.state.shop.item[4]>=(skill===18?60:40));
    if(skill===18){
      assert.ok(mine.state.shop.item[5]>=5);
      assert.ok(mine.state.shop.item[6]>=3);
    }
    // All supply is the existing source PLUS fragment, never a fake shelf
    // or a client-selected random draw. This does not advance the world clock.
    await supply(s);
    await buy(s,book);
    await denied(s,{itemId:book,useId:0}); // book but missing NEED
    if(book===20||book===23)await use(s,79,3);
    else await buy(s,37); // original positive PLUS route, one kit
    if(skill===19){
      let ready=false;
      for(let i=0;i<16;i++){
        const state=await s.state();
        if((state.marketOffers.find(x=>x.itemId===8)?.marketStock??0)>=34){
          ready=true;break;
        }
        await supply(s);
      }
      assert.equal(ready,true,'source supply of 30 training + 4 forging stones');
      await buy(s,8,34);
    }
    const trained=await use(s,37,skill===18?0:1);
    assert.equal(trained.state.shop.item[skill-1],1);
    assert.equal(trained.state.shop.item[36],0);
    assert.equal(trained.state.shop.exp['37'],50);
    await denied(s,{itemId:book,useId:1}); // insufficient EXP
    await denied(s,{itemId:book,useId:4}); // illegal USE
    await denied(s,{itemId:book,useId:0,randomDraws:[0]},400);
    await denied(s,{itemId:book,useId:0,
      expectedRevision:trained.state.world.revision-1});
    const craft=async()=>{
      const before=await s.state();
      const done=await use(s,book,0);
      assert.equal(done.details.effectiveCount,1);
      assert.equal(done.details.experienceGain,20);
      assert.equal(done.state.shop.item[skill-1],1,'NEED must not consume skill');
      assert.equal(done.state.shop.item[book-1],1);
      assert.equal(done.state.shop.item[4],before.shop.item[4]-20);
      if(skill===19)assert.equal(done.state.shop.item[7],before.shop.item[7]-2);
      assert.ok(done.state.shop.item[product-1]>before.shop.item[product-1]);
      assert.equal(done.state.shop.money,before.shop.money);
      assert.equal(done.state.shop.job??'','');
      return done;
    };
    await craft();
    const first=await save(s,0);
    let step=await restartLoad(s,dir,servers);s=step.s;
    assert.deepEqual(step.loaded.state.world,first);
    await craft();
    if(book===21){
      const before=await s.state();
      assert.ok(before.showcaseOffers.some(o=>o.itemId===47&&o.owned>0));
      const listed=await s.post('/api/showcase',{
        expectedRevision:before.world.revision,itemId:47,shelf:0,
        priceOverride:1234,
      });
      assert.equal(listed.code,'COMMITTED',JSON.stringify(listed));
      assert.equal(listed.state.shop.showcase[0],47);
      assert.equal(listed.state.shop.price[0],1234);
      assert.equal(listed.state.shop.time-before.shop.time,600);
      const rejected=await s.post('/api/advance-time',{
        expectedRevision:listed.state.world.revision,minutes:1,
      });
      assert.equal(rejected.ok,false);
      assert.deepEqual((await s.state()).world,listed.state.world);
    }
    const second=await save(s,1);
    step=await restartLoad(s,dir,servers);s=step.s;
    assert.deepEqual(step.loaded.state.world,second);
    assert.equal(step.loaded.state.shop.exp[String(book)],40);
    assert.equal(step.loaded.state.save.generation,2);
    const stale=await s.post('/api/save',{expectedRevision:second.revision,
      expectedGeneration:1});
    assert.equal(stale.ok,false);
    assert.deepEqual((await s.state()).world,second);
    await s.stop();
    const slot=join(dir,'world-a.json');
    const good=await readFile(slot,'utf8');
    const record=JSON.parse(good);
    const proof=JSON.parse(record.careerProof);
    assert.equal(proof.anchorKind,'fresh');
    assert.ok(proof.commands.length<=128);
    assert.equal(proof.commands.some(c=>c.itemId===78),false);
    if(book!==20)return;
    for(const variant of ['skill','product','exp','job','book','material',
      'rng','command','capacity','missing-proof','corrupt','proof-wire-size','file-size','prefix']){
      const forged=JSON.parse(good);
      const world=JSON.parse(forged.world);
      const history=JSON.parse(forged.careerProof);
      if(variant==='skill')world.shops[0].item[18]=1;
      if(variant==='product')world.shops[0].item[43]=1;
      if(variant==='exp')world.shops[0].exp['20']=600;
      if(variant==='job')world.shops[0].job='weapon';
      if(variant==='book')world.shops[0].item[65]=1;
      if(variant==='material')world.shops[0].item[6]+=1;
      if(variant==='rng'){
        const command=history.commands.find(c=>c.randomDraws?.length);
        command.randomDraws[0]=(command.randomDraws[0]+1)%1000000;
      }
      if(variant==='command')history.commands.at(-1).useId=3;
      if(variant==='capacity')while(history.commands.length<=128)
        history.commands.push(history.commands.at(-1));
      forged.world=encodeMemorySnapshot(validateMemoryWorld(world));
      forged.careerProof=JSON.stringify(history);
      if(variant==='missing-proof')delete forged.careerProof;
      if(variant==='proof-wire-size')forged.careerProof+=' '.repeat(500001);
      if(variant==='prefix'){
        // A second independently replayable branch of the SAME fresh anchor.
        // Changing both the open-shop command and resulting shop name must
        // still be rejected when the older genuine lineage is present.
        history.commands.find(c=>c.kind==='open-shop').shopName='不同歷史店舖';
        world.shops[0].shopname='不同歷史店舖';
        forged.world=encodeMemorySnapshot(validateMemoryWorld(world));
        forged.careerProof=JSON.stringify(history);
      }
      rehash(forged);
      if(variant==='corrupt')forged.sha256='0'.repeat(64);
      await writeFile(slot,JSON.stringify(forged)+'\n'+
        (variant==='file-size'?' '.repeat(2200001):''));
      if(variant==='prefix'){
        const older=join(dir,'world-b.json');
        const originalOlder=await readFile(older,'utf8');
        await rm(older);
        try{
          const isolated=await boot(dir);servers.push(isolated);
          const replayed=await isolated.post('/api/load');
          assert.equal(replayed.code,'LOADED',JSON.stringify(replayed));
          assert.equal(replayed.state.save.generation,2);
          assert.equal(replayed.state.world.shops[0].shopname,'不同歷史店舖');
          await isolated.stop();
        }finally{await writeFile(older,originalOlder);}
      }
      s=await boot(dir);servers.push(s);
      const recovered=await s.post('/api/load');
      assert.equal(recovered.code,'LOADED',variant+': '+JSON.stringify(recovered));
      assert.deepEqual(recovered.state.world,first,variant);
      assert.equal(recovered.state.save.recoveryWarning,true,variant);
      await s.stop();
    }
  });
}

test('P3 #23/0 earned mining EXP transfers to weapon career; trained craft after a career checkpoint and two restarts',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'akimono-p3-career-staff-'));
  const servers=[];
  t.after(async()=>{for(const server of servers)await server.stop();
    await rm(dir,{recursive:true,force:true});});
  let s=await boot(dir);servers.push(s);
  await open(s);
  await use(s,79,0);
  const mine=await use(s,9,0,1);
  assert.equal(mine.details.effectiveCount,1);
  assert.equal(mine.state.shop.exp['9'],20);
  assert.ok(mine.state.shop.item[4]>=20);
  await supply(s);await buy(s,23);await buy(s,78);
  await use(s,79,3);
  let ready=false;
  for(let i=0;i<16;i++){
    const state=await s.state();
    if((state.marketOffers.find(x=>x.itemId===8)?.marketStock??0)>=32){
      ready=true;break;
    }
    await supply(s);
  }
  assert.equal(ready,true);
  await buy(s,8,32);
  const trained=await use(s,37,1);
  assert.equal(trained.state.shop.exp['37'],50);
  assert.equal(trained.state.shop.item[18],1);
  const career=await use(s,78,7);
  assert.equal(career.state.shop.job,'weapon');
  assert.equal(career.state.shop.exp['23'],10);
  assert.equal(career.state.shop.exp['9']??0,0);
  assert.equal(career.state.shop.exp['37'],50);
  assert.equal(career.state.shop.item[77],0);
  const craft=async(exp,seconds)=>{
    const before=await s.state();
    const done=await use(s,23,0);
    assert.equal(done.details.effectiveCount,1);
    assert.equal(done.details.experienceGain,20);
    assert.equal(done.state.shop.exp['23'],exp);
    assert.equal(done.state.shop.time-before.shop.time,seconds);
    assert.equal(done.state.shop.item[18],1);
    assert.equal(done.state.shop.item[22],1);
    assert.equal(done.state.shop.item[4],before.shop.item[4]-20);
    assert.equal(done.state.shop.item[7],before.shop.item[7]-2);
    assert.ok(done.state.shop.item[57]>before.shop.item[57]);
    assert.equal(done.state.shop.money,before.shop.money);
    assert.equal(done.state.shop.job,'weapon');
  };
  const first=await save(s,0);
  let step=await restartLoad(s,dir,servers);s=step.s;
  assert.deepEqual(step.loaded.state.world,first);
  await craft(30,1788);
  const second=await save(s,1);
  step=await restartLoad(s,dir,servers);s=step.s;
  assert.deepEqual(step.loaded.state.world,second);
  assert.equal(step.loaded.state.save.generation,2);
  // No artificial time, inventory, or EXP grant makes the next USE legal.
  await denied(s,{itemId:23,useId:1});
  await denied(s,{itemId:23,useId:0,randomDraws:[0]},400);
  const proof=JSON.parse(JSON.parse(await readFile(join(dir,'world-a.json'),'utf8')).careerProof);
  assert.ok(proof.commands.some(c=>c.itemId===78&&c.useId===7));
  assert.ok(proof.commands.some(c=>c.itemId===37&&c.useId===1));
});

test('P3 real accessory book purchase and single-skill checkpoint persist; dual NEED and EXP remain enforced',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'akimono-p3-accessory-gates-'));
  const servers=[];
  t.after(async()=>{for(const server of servers)await server.stop();
    await rm(dir,{recursive:true,force:true});});
  let s=await boot(dir);servers.push(s);
  await open(s);
  await denied(s,{itemId:66,useId:0});
  await denied(s,{itemId:79,useId:2}); // ten vouchers required, new shop only five
  await supply(s);await buy(s,66);
  await denied(s,{itemId:66,useId:0});
  const first=await save(s,0);
  let step=await restartLoad(s,dir,servers);s=step.s;
  assert.deepEqual(step.loaded.state.world,first);
  await use(s,79,3);
  let ready=false;
  for(let i=0;i<16;i++){
    if(((await s.state()).marketOffers.find(x=>x.itemId===8)?.marketStock??0)>=30){
      ready=true;break;
    }
    await supply(s);
  }
  assert.equal(ready,true);
  await buy(s,8,30);
  await use(s,37,1);
  for(let i=0;i<4;i++)await denied(s,{itemId:66,useId:i});
  await denied(s,{itemId:37,useId:2});
  const second=await save(s,1);
  step=await restartLoad(s,dir,servers);s=step.s;
  assert.deepEqual(step.loaded.state.world,second);
  assert.equal(step.loaded.state.shop.item[65],1);
  assert.equal(step.loaded.state.shop.item[18],1);
  assert.equal(step.loaded.state.shop.item[17],0);
  assert.equal(step.loaded.state.shop.exp['37'],50);
  assert.equal(step.loaded.state.save.generation,2);
  for(let i=0;i<4;i++)await denied(s,{itemId:66,useId:i});
});

test('P3 reviewed nonsettling time: legitimate dual skills, iron accessory and two durable checkpoints',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'akimono-p3-reviewed-accessory-'));
  const servers=[];
  t.after(async()=>{for(const server of servers)await server.stop();
    await rm(dir,{recursive:true,force:true});});
  // A legal fresh-world clock near the start of a source period. No edits
  // to inventory, money, EXP, time, event state, or random samples.
  const options={reviewedTime:true,now:'900000'};
  let s=await boot(dir,options);servers.push(s);
  await open(s);
  const initial=await s.state();
  assert.equal(initial.reviewedTimeMode,true);
  assert.equal(initial.world.nowSeconds-initial.shop.time,43200);
  let ticks=0;
  const tick=async()=>{
    const before=await s.state();
    assert.ok(++ticks<=34,'nonsettling source time budget exhausted');
    const result=await s.post('/api/advance-reviewed-time',{
      expectedRevision:before.world.revision,minutes:60,
    });
    assert.equal(result.code,'COMMITTED',JSON.stringify(result));
    assert.equal(result.state.world.nowSeconds,before.world.nowSeconds+3600);
    assert.equal(result.details.sourceTrace.eventOrder.length,17);
    assert.ok(result.state.world.period.eventState!==null);
    assert.equal(result.state.world.period.settledCount,0);
    return result.state;
  };
  const enoughTime=async seconds=>{
    for(;;){
      const state=await s.state();
      if(state.world.nowSeconds-state.shop.time>=seconds)return state;
      await tick();
    }
  };
  const market=async(id,count=1)=>{
    for(;;){
      const state=await s.state();
      const offer=state.marketOffers.find(x=>x.itemId===id);
      if(offer?.canBuy&&offer.marketStock>=count){
        await enoughTime(1200);
        return buy(s,id,count);
      }
      await tick();
    }
  };
  const mine=async(useId,count=1)=>{
    await enoughTime(count*3600);
    if((await s.state()).shop.item[8]===0)await market(9);
    const result=await use(s,9,useId,count);
    assert.equal(result.details.effectiveCount,count);
    return result;
  };
  await use(s,79,0);await use(s,79,3);
  await mine(0,3);
  for(let i=0;i<4&&(await s.state()).shop.item[4]<60;i++)await mine(0);
  for(let i=0;i<4&&(await s.state()).shop.item[5]<5;i++)await mine(1);
  for(let i=0;i<4&&(await s.state()).shop.item[6]<3;i++)await mine(2);
  let ready=await s.state();
  assert.ok(ready.shop.item[4]>=60&&ready.shop.item[5]>=5&&ready.shop.item[6]>=3);
  await enoughTime(21600);
  const smith=await use(s,37,0);
  assert.equal(smith.state.shop.item[17],1);
  await market(66);
  await denied(s,{itemId:66,useId:0});
  await market(37);
  await market(8,30);
  await enoughTime(21600);
  const magic=await use(s,37,1);
  assert.equal(magic.state.shop.item[18],1);
  assert.equal(magic.state.shop.exp['37'],100);
  assert.ok(magic.state.world.nowSeconds>initial.world.nowSeconds);
  await enoughTime(2700);
  const first=await save(s,0);
  let step=await restartLoad(s,dir,servers,options);s=step.s;
  assert.deepEqual(step.loaded.state.world,first);
  const before=await s.state();
  const crafted=await use(s,66,0);
  assert.equal(crafted.details.effectiveCount,1);
  assert.equal(crafted.details.experienceGain,20);
  assert.equal(crafted.state.shop.item[17],1);
  assert.equal(crafted.state.shop.item[18],1);
  assert.equal(crafted.state.shop.item[4],before.shop.item[4]-20);
  assert.ok(crafted.state.shop.item[66]>before.shop.item[66]);
  await tick();await enoughTime(2700);
  const again=await use(s,66,0);
  assert.equal(again.state.shop.exp['66'],40);
  assert.equal(again.state.shop.item[17],1);
  assert.equal(again.state.shop.item[18],1);
  const second=await save(s,1);
  step=await restartLoad(s,dir,servers,options);s=step.s;
  assert.deepEqual(step.loaded.state.world,second);
  assert.equal(step.loaded.state.save.generation,2);
  const record=JSON.parse(await readFile(join(dir,'world-a.json'),'utf8'));
  const proof=JSON.parse(record.careerProof);
  assert.ok(proof.commands.some(x=>x.kind==='advance-reviewed-world-time'&&x.trace));
  assert.ok(proof.commands.some(x=>x.kind==='use-item'&&x.itemId===37&&x.useId===0));
  assert.ok(proof.commands.some(x=>x.kind==='use-item'&&x.itemId===37&&x.useId===1));
  assert.ok(proof.commands.some(x=>x.kind==='use-item'&&x.itemId===66&&x.useId===0));
  await denied(s,{itemId:66,useId:1});
});

/** Source-only helpers for v2 player tests. No fixture supply or injected assets. */
function reviewedPlayer(s){
  let ticks=0;
  const time=async()=>{
    const before=await s.state();
    assert.ok(++ticks<=34,'nonsettling time budget exhausted');
    assert.ok(before.secondsUntilSettlement>3600,'no crossing 36h');
    const result=await s.post('/api/advance-reviewed-time',{expectedRevision:before.world.revision,minutes:60});
    assert.equal(result.code,'COMMITTED',JSON.stringify(result));
    assert.equal(result.state.world.nowSeconds,before.world.nowSeconds+3600);
    return result.state;
  };
  const ensureTime=async seconds=>{
    for(;;){const state=await s.state();if(state.world.nowSeconds-state.shop.time>=seconds)return state;await time();}
  };
  const market=async(id,count=1)=>{
    for(;;){
      const state=await s.state();
      const offer=state.marketOffers.find(x=>x.itemId===id);
      if(offer?.canBuy&&offer.marketStock>=count){await ensureTime(1800);return buy(s,id,count);}
      await time();
    }
  };
  const herbs=async count=>{
    while((await s.state()).shop.item[0]<count){
      if((await s.state()).shop.item[11]===0)await market(12);
      await ensureTime(3600);await use(s,12,0);
    }
  };
  const brew=async useId=>{
    if((await s.state()).shop.item[14]===0)await market(15);
    if(useId===0||useId===2)await herbs(useId===0?10:20);
    await ensureTime(1800);return use(s,15,useId);
  };
  return {time,ensureTime,market,herbs,brew};
}

test('v2 sole player path: P1 advanced medicine, source EXP, real time and two generations',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'akimono-v2-p1-'));
  const servers=[];t.after(async()=>{for(const server of servers)await server.stop();await rm(dir,{recursive:true,force:true});});
  const options={reviewedTime:true,now:'900000'};
  let s=await boot(dir,options);servers.push(s);await open(s);
  let player=reviewedPlayer(s);
  await use(s,79,0);
  await player.herbs(160);
  await player.market(15);
  await denied(s,{itemId:15,useId:1});
  for(let i=0;i<10;i++)await player.brew(0);
  const high=await player.brew(1);
  assert.equal(high.state.shop.exp['15'],220);
  assert.ok(high.state.shop.item[30]>0);
  await player.time();
  const first=await save(s,0);
  let step=await restartLoad(s,dir,servers,options);s=step.s;
  assert.deepEqual(step.loaded.state.world,first);
  player=reviewedPlayer(s);
  while((await s.state()).shop.exp['15']<600){
    if((await s.state()).shop.item[29]<10)await player.brew(0);
    else await player.brew(1);
  }
  while((await s.state()).shop.item[31]<20)await player.brew(2);
  while((await s.state()).shop.item[32]<10){
    if((await s.state()).shop.item[31]<10)await player.brew(2);
    await player.brew(3);
  }
  while((await s.state()).shop.item[30]<10){
    if((await s.state()).shop.item[29]<10)await player.brew(0);
    await player.brew(1);
  }
  const before=await s.state();
  const elixir=await player.brew(4);
  assert.equal(elixir.state.shop.item[33],before.shop.item[33]+5);
  assert.equal(elixir.state.shop.item[30],before.shop.item[30]-10);
  assert.equal(elixir.state.shop.item[32],before.shop.item[32]-10);
  const second=await save(s,1);
  step=await restartLoad(s,dir,servers,options);s=step.s;
  assert.deepEqual(step.loaded.state.world,second);
  const record=JSON.parse(await readFile(join(dir,'world-a.json'),'utf8'));
  assert.equal(record.format,'akimono.local-world-save.v2');
  assert.ok(JSON.parse(record.careerProof).commands.some(x=>x.kind==='use-item'&&x.itemId===15&&x.useId===4));
});

test('v2 sole player path: P2 source career transfer and dairy survive normal time and two restarts',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'akimono-v2-p2-'));
  const servers=[];t.after(async()=>{for(const server of servers)await server.stop();await rm(dir,{recursive:true,force:true});});
  const options={reviewedTime:true,now:'900000'};
  let s=await boot(dir,options);servers.push(s);await open(s);
  let player=reviewedPlayer(s);
  await use(s,79,0);
  await player.herbs(10);
  await player.market(15);
  const medicine=await player.brew(0);
  await player.market(78);
  await player.ensureTime(10800);
  const changed=await use(s,78,11);
  assert.equal(changed.state.shop.job,'cow');
  assert.ok(changed.state.shop.exp['25']>0);
  assert.equal(changed.state.shop.item[29],medicine.state.shop.item[29]);
  await use(s,79,4);
  await player.ensureTime(3600);
  const milk=await use(s,25,0);
  assert.ok(milk.state.shop.item[25]>0);
  await player.time();
  const first=await save(s,0);
  let step=await restartLoad(s,dir,servers,options);s=step.s;
  assert.deepEqual(step.loaded.state.world,first);
  player=reviewedPlayer(s);
  await player.market(78);await player.ensureTime(10800);
  const drug=await use(s,78,0);
  assert.equal(drug.state.shop.job,'drug');
  assert.ok(drug.state.shop.exp['15']>0);
  await player.brew(0);await player.time();
  const second=await save(s,1);
  step=await restartLoad(s,dir,servers,options);s=step.s;
  assert.deepEqual(step.loaded.state.world,second);
  assert.equal(step.loaded.state.shop.job,'drug');
});

test('v2 player refuses old development v1 records without silently migrating or overwriting',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'akimono-v2-no-migration-'));
  const servers=[];t.after(async()=>{for(const server of servers)await server.stop();await rm(dir,{recursive:true,force:true});});
  let s=await boot(dir);servers.push(s);await open(s);await save(s,0);await s.stop();
  const slot=join(dir,'world-b.json'),original=await readFile(slot,'utf8');
  assert.equal(JSON.parse(original).format,'akimono.local-world-save.v1');
  const options={reviewedTime:true,now:'900000'};
  s=await boot(dir,options);servers.push(s);
  assert.equal((await s.state()).save.unreadable,true);
  assert.equal((await s.post('/api/load')).ok,false);
  assert.equal((await s.post('/api/initialize')).ok,false);
  assert.equal(await readFile(slot,'utf8'),original);
  const reset=await s.post('/api/reset',{confirm:'RESET_LOCAL_TEST_WORLD',expectedRevision:null,expectedWorldId:null,expectedGeneration:0});
  assert.equal(reset.code,'RESET');
  await open(s);await save(s,0);
  assert.equal(JSON.parse(await readFile(slot,'utf8')).format,'akimono.local-world-save.v2');
});
