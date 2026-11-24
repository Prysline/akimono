import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
async function boot(directory,now='1000000'){
  const child=spawn(process.execPath,['scripts/dev-local.mjs'],{cwd:path.join(root,'modern'),env:{...process.env,AKIMONO_PORT:'0',AKIMONO_SAVE_DIR:directory,AKIMONO_E2E_FIXED_NOW:now,AKIMONO_E2E_DETERMINISTIC_RNG:'0',AKIMONO_REVIEWED_NORMAL_TIME:'1'},stdio:['ignore','pipe','pipe']});
  let err='';child.stderr.on('data',x=>err+=x);
  const url=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{child.kill();reject(Error('boot timeout '+err));},15000);
    let output='';
    child.stdout.on('data',x=>{output+=x;const address=output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];if(address){clearTimeout(timer);resolve(address);}});
    child.once('error',e=>{clearTimeout(timer);reject(e);});
    child.once('exit',code=>{clearTimeout(timer);reject(Error('exit '+code+' '+err));});
  });
  const post=async(endpoint,payload={},headers={})=>{const response=await fetch(url+endpoint,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(payload)});return {status:response.status,...await response.json()};};
  return {post,stop:()=>child.exitCode!==null?Promise.resolve():new Promise(resolve=>{child.once('exit',resolve);child.kill();})};
}
const ok=(r,code='COMMITTED')=>{assert.equal(r.code,code,JSON.stringify(r));return r.state;};
test('reviewed normal HTTP time, legal gift USE, two save generations, restart replay and forged trace recovery',async t=>{
  const dir=await mkdtemp(path.join(tmpdir(),'akimono-r4-time-history-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  let server=await boot(dir);t.after(()=>server.stop());
  const post=(p,x,h)=>server.post(p,x,h);
  let state=ok(await post('/api/initialize'));
  state=ok(await post('/api/open-shop',{expectedRevision:state.world.revision,ownerName:'來源店主',shopName:'來源商店'}));
  const time=async minutes=>{const before=state.world;const result=await post('/api/advance-reviewed-time',{expectedRevision:before.revision,minutes});state=ok(result);assert.equal(state.world.nowSeconds,before.nowSeconds+minutes*60);assert.equal(result.details.sourceTrace.eventOrder.length,17);};
  const gift=async()=>{const before=state.world;state=ok(await post('/api/use',{expectedRevision:before.revision,itemId:79,useId:0,requestedCount:1}));assert.equal(state.shop.item[78],before.shops[0].item[78]-2);};
  await gift();await time(60);
  const before=state.world;
  for(const [p,body] of [['/api/advance-reviewed-time',{expectedRevision:before.revision,minutes:1,randomDraws:[0]}],['/api/advance-reviewed-time',{expectedRevision:before.revision,minutes:1,nowSeconds:123}],['/api/advance-reviewed-time',{expectedRevision:before.revision-1,minutes:1}],['/api/supply',{expectedRevision:before.revision,timespanSeconds:60}],['/api/advance-time',{expectedRevision:before.revision,minutes:1}]]){
    const rejected=await post(p,body);assert.equal(rejected.ok,false);assert.deepEqual(rejected.state.world,before);
  }
  assert.equal((await post('/api/advance-reviewed-time',{expectedRevision:before.revision,minutes:1},{origin:'https://example.invalid'})).status,403);
  state=ok(await post('/api/save',{expectedRevision:before.revision,expectedGeneration:0}),'SAVED');
  const first=state.world;
  await server.stop();server=await boot(dir);
  state=ok(await post('/api/load'),'LOADED');assert.deepEqual(state.world,first);
  await gift();await time(60);
  state=ok(await post('/api/save',{expectedRevision:state.world.revision,expectedGeneration:1}),'SAVED');
  const second=state.world;
  await server.stop();server=await boot(dir);
  state=ok(await post('/api/load'),'LOADED');assert.deepEqual(state.world,second);
  await server.stop();
  const latest=path.join(dir,'world-a.json'),record=JSON.parse(await readFile(latest,'utf8'));
  const proof=JSON.parse(record.careerProof);const entry=proof.commands.find(x=>x.kind==='advance-reviewed-world-time');
  assert.ok(entry.trace.eventSamples.length>0);entry.trace.eventSamples[0]=(entry.trace.eventSamples[0]+1)%1000000;
  record.careerProof=JSON.stringify(proof);record.sha256=createHash('sha256').update(JSON.stringify([record.world,record.careerProof])).digest('hex');
  await writeFile(latest,JSON.stringify(record)+'\n');
  server=await boot(dir);const recovered=await post('/api/load');state=ok(recovered,'LOADED');
  assert.equal(recovered.details.recoveredPreviousGeneration,true);assert.deepEqual(state.world,first);
});
test('reviewed HTTP clock fails closed across 36h with no changed history or world',async t=>{
  const dir=await mkdtemp(path.join(tmpdir(),'akimono-r4-time-boundary-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  const server=await boot(dir,'1025980');t.after(()=>server.stop());
  let state=ok(await server.post('/api/initialize'));state=ok(await server.post('/api/open-shop',{expectedRevision:state.world.revision,ownerName:'來源',shopName:'期界'}));
  const rejected=await server.post('/api/advance-reviewed-time',{expectedRevision:state.world.revision,minutes:1});
  assert.equal(rejected.ok,false);assert.deepEqual(rejected.state.world,state.world);assert.equal(rejected.state.historyCommands,state.historyCommands);
});
