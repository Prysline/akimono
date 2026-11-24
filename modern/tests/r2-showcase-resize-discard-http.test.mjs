/**
 * Player-reachable source #63 USE -> 2 indexed shelves -> independent shelf
 * edits -> original no-time discard -> two-generation local save/reload.
 * Uses the live GameCore/HTTP commands, never a synthetic shelf count.
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
async function boot(directory){
  const child=spawn(process.execPath,['scripts/dev-local.mjs'],{
    cwd:join(root,'modern'),
    env:{...process.env,AKIMONO_PORT:'0',AKIMONO_SAVE_DIR:directory,
      AKIMONO_E2E_FIXED_NOW:'1000000',AKIMONO_E2E_DETERMINISTIC_RNG:'1'},
    stdio:['ignore','pipe','pipe'],
  });
  let stderr='';
  child.stderr.on('data',x=>stderr+=x);
  const url=await Promise.race([
    new Promise((resolve,reject)=>{
      let output='';
      child.stdout.on('data',x=>{
        output+=x;
        const match=output.match(/http:\/\/127\.0\.0\.1:\d+/);
        if(match)resolve(match[0]);
      });
      child.once('error',reject);
      child.once('exit',code=>reject(Error(
        'showcase HTTP server exit '+code+': '+stderr)));
    }),
    new Promise((_,reject)=>setTimeout(()=>reject(Error(
      'showcase HTTP startup timeout '+stderr)),10000)),
  ]);
  return {
    url,
    state:async()=>await (await fetch(url+'/api/state')).json(),
    post:async(route,data={})=>{
      const response=await fetch(url+route,{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify(data),
      });
      return {status:response.status,...await response.json()};
    },
    stop:async()=>{
      if(child.exitCode!==null||child.signalCode!==null)return;
      await new Promise(resolve=>{child.once('exit',resolve);child.kill();});
    },
  };
}
test('source #63 grows two shelves, second shelf is independently writable, no-time discard survives saves',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'akimono-r2-shelves-'));
  const servers=[];
  t.after(async()=>{
    for(const srv of servers)await srv.stop();
    await rm(directory,{recursive:true,force:true});
  });
  let srv=await boot(directory);servers.push(srv);
  const [html,script]=await Promise.all([
    fetch(srv.url).then(r=>r.text()),
    fetch(srv.url+'/app.js').then(r=>r.text()),
  ]);
  assert.match(html,/id="showcase-shelves"/);
  assert.match(html,/id="shop-showcase-time"/);
  assert.match(script,/button\.className='text-link shelf-action-link'/);
  assert.doesNotMatch(script,/time\.textContent='行動時間：'/);
  assert.match(html,/id="showcase-shelf"/);
  assert.doesNotMatch(html,/id="shelf-item"/);
  assert.match(html,/id="set-showcase" class="primary" type="submit">陳列/);
  assert.doesNotMatch(html,/id="showcase-shelf-current"/);
  assert.match(html,/id="discard-form"/);
  assert.match(script,/showcaseSlotDescription\(s,index\)/);
  assert.match(script,/option\.textContent='架'\+\(index\+1\)\+'（'\+/);
  assert.match(script,/dataset\.shelfIndex=String\(index\)/);
  assert.match(script,/call\('\/api\/discard'/);
  assert.equal((await srv.post('/api/initialize')).ok,true);
  assert.equal((await srv.post('/api/open-shop',{expectedRevision:1,
    ownerName:'擴建測試',shopName:'來源多架測試店'})).ok,true);
  const before=await srv.state();
  assert.equal(before.shop.showcasecount,1);
  assert.deepEqual(before.shop.showcase,[0]);
  assert.equal(before.shop.item[62],1);
  const options=before.useOffers.filter(x=>x.itemId===63);
  assert.equal(options.length,8);
  assert.deepEqual(options.map(x=>[x.useId,x.timePerUseSeconds,
    x.moneyPerUse,x.singleUseOnly]),Array.from({length:8},(_,i)=>
    [i,(i+1)*1800,(i+1)*10000,true]));
  const grown=await srv.post('/api/use',{
    expectedRevision:before.world.revision,itemId:63,useId:1,
    requestedCount:1,
  });
  assert.equal(grown.ok,true,JSON.stringify(grown));
  assert.equal(grown.details.showcaseCountBefore,1);
  assert.equal(grown.details.showcaseCountAfter,2);
  assert.equal(grown.details.originalFunctionReturn,'展示架已經改成2個了');
  assert.equal(grown.details.timeSpentSeconds,3600);
  assert.equal(grown.details.moneySpent,20000);
  assert.equal(grown.state.shop.money,80000);
  assert.equal(grown.state.shop.item[62],0);
  assert.equal(grown.state.shop.showcasecount,2);
  assert.deepEqual(grown.state.shop.showcase,[0,0]);
  assert.deepEqual(grown.state.shop.price,[0,0]);
  const denied=await srv.post('/api/use',{
    expectedRevision:grown.state.world.revision,itemId:63,useId:2,
    requestedCount:1,
  });
  assert.equal(denied.ok,false,'consumed #63 tool cannot resize again');
  assert.equal(denied.state.world.revision,grown.state.world.revision);

  const supply=await srv.post('/api/supply',{
    expectedRevision:grown.state.world.revision,timespanSeconds:3600,
  });
  assert.equal(supply.ok,true,JSON.stringify(supply));
  let offers=await srv.state(),book=offers.marketOffers.find(x=>x.itemId===10);
  assert.ok(book?.canBuy,'source PLUS supplies the actual reviewed #10 stock');
  const bought=await srv.post('/api/buy',{
    expectedRevision:offers.world.revision,itemId:10,requestedCount:1,
    marketShelf:book.shelf,expectedPrice:book.price,
  });
  assert.equal(bought.ok,true,JSON.stringify(bought));
  const shown=await srv.post('/api/showcase',{
    expectedRevision:bought.state.world.revision,shelf:1,itemId:10,per:100,
  });
  assert.equal(shown.ok,true,JSON.stringify(shown));
  assert.deepEqual(shown.state.shop.showcase,[0,10]);
  assert.deepEqual(shown.state.shop.price,[0,5000]);
  const wrongShelf=await srv.post('/api/showcase',{
    expectedRevision:shown.state.world.revision,shelf:2,itemId:0,per:100,
  });
  assert.equal(wrongShelf.ok,false);
  assert.equal(wrongShelf.state.world.revision,shown.state.world.revision);
  const first=await srv.post('/api/showcase',{
    expectedRevision:shown.state.world.revision,shelf:0,itemId:10,per:100,
  });
  assert.equal(first.ok,true,JSON.stringify(first));
  assert.deepEqual(first.state.shop.showcase,[10,10]);
  const removed=await srv.post('/api/showcase',{
    expectedRevision:first.state.world.revision,shelf:1,itemId:0,per:100,
  });
  assert.equal(removed.ok,true,JSON.stringify(removed));
  assert.deepEqual(removed.state.shop.showcase,[10,0],
    'clearing the second shelf cannot change the first');
  assert.deepEqual(removed.state.shop.price,[5000,0]);

  const saved=await srv.post('/api/save',{
    expectedRevision:removed.state.world.revision,expectedGeneration:0,
  });
  assert.equal(saved.ok,true,JSON.stringify(saved));
  await srv.stop();
  srv=await boot(directory);servers.push(srv);
  const loaded=await srv.post('/api/load');
  assert.equal(loaded.ok,true,JSON.stringify(loaded));
  assert.deepEqual(loaded.state.world,saved.state.world);
  assert.equal(loaded.state.shop.showcasecount,2);
  assert.deepEqual(loaded.state.shop.showcase,[10,0]);

  const timeBefore=loaded.state.shop.time;
  const fundsBefore=loaded.state.shop.money;
  const itemBefore=loaded.state.shop.item[9];
  const discarded=await srv.post('/api/discard',{
    expectedRevision:loaded.state.world.revision,itemId:10,count:1,
  });
  assert.equal(discarded.ok,true,JSON.stringify(discarded));
  assert.equal(discarded.details.discardedCount,1);
  assert.equal(discarded.details.timeSpentSeconds,0);
  assert.equal(discarded.state.shop.time,timeBefore);
  assert.equal(discarded.state.shop.money,fundsBefore);
  assert.equal(discarded.state.shop.item[9],itemBefore-1);
  assert.deepEqual(discarded.state.shop.showcase,[10,0],
    'discard does not silently mutate the selected display slot');
  const invalidDiscard=await srv.post('/api/discard',{
    expectedRevision:discarded.state.world.revision,itemId:10,count:2,
  });
  assert.equal(invalidDiscard.ok,false);
  assert.equal(invalidDiscard.state.world.revision,
    discarded.state.world.revision);

  const savedAgain=await srv.post('/api/save',{
    expectedRevision:discarded.state.world.revision,expectedGeneration:1,
  });
  assert.equal(savedAgain.ok,true,JSON.stringify(savedAgain));
  assert.equal(savedAgain.state.save.generation,2);
  await srv.stop();
  srv=await boot(directory);servers.push(srv);
  const final=await srv.post('/api/load');
  assert.equal(final.ok,true,JSON.stringify(final));
  assert.deepEqual(final.state.world,savedAgain.state.world);
});
