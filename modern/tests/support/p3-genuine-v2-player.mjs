/** Genuine v2 HTTP player. Server creates identity, RNG, market, EXP and time.
 * The default test clock starts immediately after a source 36h boundary; no test
 * state, fixture PLUS, client RNG, or settlement bypass enters the game. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const cwd=fileURLToPath(new URL('../../',import.meta.url));
const ok=(r,code='COMMITTED')=>{
  assert.equal(r.code,code,JSON.stringify({code:r.code,error:r.error,reason:r.details?.reason,clock:r.state?.world?.nowSeconds,shop:r.state?.shop?.time,money:r.state?.shop?.money,exp:r.state?.shop?.exp}));
  return r;
};
export async function genuinePlayer(t,{now='896401',crossPeriod=false,marketCommerce=false,onTick=null,onPurchase=null}={}){
  const directory=await mkdtemp(join(tmpdir(),'akimono-p3-v2-high-'));
  let child,url,state,stderr='';
  const stop=async()=>{
    if(!child||child.exitCode!==null||child.signalCode!==null)return;
    await new Promise(resolve=>{child.once('exit',resolve);child.kill();});
  };
  t.after(async()=>{await stop();await rm(directory,{recursive:true,force:true});});
  async function boot(){
    stderr='';
    const env={...process.env,AKIMONO_PORT:'0',AKIMONO_SAVE_DIR:directory,
      AKIMONO_E2E_DETERMINISTIC_RNG:'0',AKIMONO_REVIEWED_CROSS_PERIOD:crossPeriod?'1':'0',
      AKIMONO_REVIEWED_MARKET_COMMERCE:marketCommerce?'1':'0'};
    if(now===null)delete env.AKIMONO_E2E_FIXED_NOW;
    else env.AKIMONO_E2E_FIXED_NOW=now;
    child=spawn(process.execPath,['scripts/dev-local.mjs'],{cwd,env,stdio:['ignore','pipe','pipe']});
    child.stderr.on('data',b=>stderr+=b);
    let timer;
    url=await Promise.race([new Promise((resolve,reject)=>{
      let output='';
      child.stdout.on('data',b=>{output+=b;const match=output.match(/http:\/\/127\.0\.0\.1:\d+/);if(match)resolve(match[0]);});
      child.once('exit',code=>reject(Error('player exit '+code+': '+stderr)));
      child.once('error',reject);
    }),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('player startup timeout '+stderr)),15000);})]).finally(()=>clearTimeout(timer));
    state=await(await fetch(url+'/api/state')).json();
  }
  async function post(route,body={}){
    const response=await fetch(url+route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    const result={status:response.status,...await response.json()};
    if(result.state)state=result.state;
    return result;
  }
  const command=async(route,body)=>ok(await post(route,{expectedRevision:state.world.revision,...body}));
  const stock=id=>state.shop.item[id-1];
  const exp=id=>state.shop.exp?.[String(id)]??0;
  const remaining=()=>state.world.nowSeconds-state.shop.time;
  const quote=(id,useId)=>state.useOffers.find(x=>x.itemId===id&&x.useId===useId);
  const boundary=()=>state.secondsUntilSettlement;
  async function tick(minutes){
    assert.ok(minutes>=1&&minutes<=60&&(crossPeriod||minutes*60<boundary()),'source period budget exhausted: '+JSON.stringify({minutes,boundary:boundary(),remaining:remaining(),exp:state.shop.exp,stock:state.shop.item,money:state.shop.money}));
    const before=state.world;
    const nowSeconds=before.nowSeconds,revision=before.revision;
    const priorPeriods=state.world.period.settledCount,crosses=minutes*60>=boundary();
    const result=await command('/api/advance-reviewed-time',{minutes});
    assert.equal(state.world.nowSeconds,nowSeconds+minutes*60);
    assert.equal(state.world.revision,revision+1);
    assert.equal(state.world.period.settledCount,priorPeriods+(crosses?1:0));
    if(onTick)onTick(result,before);
    return result;
  }
  async function enoughTime(seconds){
    assert.ok(Number.isSafeInteger(seconds)&&seconds>=0);
    for(let n=0;remaining()<seconds;n++){
      assert.ok(n<144,'source action-time acquisition budget '+JSON.stringify({seconds,remaining:remaining(),period:state.world.period.settledCount}));
      await tick(Math.min(60,Math.max(1,Math.ceil((seconds-remaining())/60))));
    }
  }
  async function use(id,useId,count=1){
    // EXP can decay at a real settlement while waiting for action time.
    // Re-quote after each wait; never assume the old shortened clock cost.
    for(let n=0;;n++){
      const offer=quote(id,useId);
      assert.ok(offer,'registered USE #'+id+'/'+useId);
      assert.ok(n<8,'source USE time quote did not converge');
      if(remaining()>=offer.timePerUseSeconds*count)break;
      await enoughTime(offer.timePerUseSeconds*count);
    }
    const result=await command('/api/use',{itemId:id,useId,requestedCount:count});
    assert.equal(result.details.effectiveCount,count);
    return result;
  }
  async function deny(id,useId,extra={}){
    const before=state.world,history=state.historyCommands;
    const result=await post('/api/use',{expectedRevision:before.revision,itemId:id,useId,requestedCount:1,...extra});
    assert.equal(result.ok,false);
    assert.deepEqual(state.world,before);
    assert.equal(state.historyCommands,history);
    return result;
  }
  async function list(id){
    if(state.shop.showcase[0]===id)return;
    await enoughTime(state.showcaseEditTimeSeconds??600);
    await command('/api/showcase',{itemId:id,shelf:0,per:100});
    assert.equal(state.shop.showcase[0],id);
  }
  async function market(id,count=1,{partial=false,sell=[]}={}){
    // Every refill advances full reviewed source time; purchases use live quotes.
    let needed=count,attempts=0;
    while(needed>0){
      if(crossPeriod)assert.ok(++attempts<=240,'live market budget exhausted #'+id+' '+JSON.stringify({stock:stock(id),money:state.shop.money,period:state.world.period.settledCount}));
      const offer=state.marketOffers.find(x=>x.itemId===id);
      if(offer?.canBuy){
        const quantity=Math.min(needed,offer.marketStock,offer.limit-stock(id));
        if(quantity>0&&(partial||quantity===needed)&&state.shop.money>=offer.price*quantity&&remaining()>=offer.timeSeconds){
          const before=state.world;
          const result=await command('/api/buy',{itemId:id,requestedCount:quantity,marketShelf:offer.shelf,expectedPrice:offer.price});
          assert.equal(result.details.purchasedCount,quantity);
          if(onPurchase)onPurchase(result,before,offer);
          needed-=quantity;
          continue;
        }
        if(quantity>0&&state.shop.money>=offer.price*quantity&&remaining()<offer.timeSeconds){
          await enoughTime(offer.timeSeconds);continue;
        }
      }
      if(offer&&state.shop.money<offer.price*Math.min(needed,offer.marketStock)){
        const product=sell.find(item=>stock(item)>0);
        if(product)await list(product);
      }
      await tick(crossPeriod?60:Math.min(60,Math.floor((boundary()-1)/60)));
    }
  }
  async function ore(id,count){
    const useId={5:0,6:1,7:2}[id];assert.ok(useId!==undefined);
    for(let n=0;stock(id)<count;n++){
      assert.ok(n<200,'source mining budget #'+id+' target '+count+' actual '+stock(id));
      if(!stock(9))await market(9);
      await use(9,useId);
    }
  }
  async function gather(id,count){
    const useId={1:0,2:2,3:1,4:3}[id];assert.ok(useId!==undefined);
    for(let n=0;stock(id)<count;n++){
      assert.ok(n<200,'source gathering budget #'+id+' target '+count+' actual '+stock(id));
      if(!stock(12))await market(12);
      await use(12,useId);
    }
  }
  async function stones(count,sell=[]){
    if(stock(8)<count)await market(8,count-stock(8),{partial:true,sell});
  }
  async function discard(id,count=stock(id)){
    const before=state.shop.time;
    await command('/api/discard',{itemId:id,count});
    assert.equal(state.shop.time,before);
  }
  async function saveAndRestart(generation){
    const result=ok(await post('/api/save',{expectedRevision:state.world.revision,expectedGeneration:generation}),'SAVED');
    assert.equal(state.save.generation,generation+1);
    const snapshot=result.state.world;
    await stop();await boot();ok(await post('/api/load'),'LOADED');
    assert.deepEqual(state.world,snapshot);
    assert.equal(state.save.format,'akimono.local-world-save.v2');
    assert.equal(state.save.generation,generation+1);
    return snapshot;
  }
  async function rejectDamagedOldestPrefix(expected){
    const record=JSON.parse(await readFile(join(directory,'world-a.json'),'utf8'));
    let proof=JSON.parse(record.careerProof),segments=[];
    while(proof.anchorKind==='checkpoint'){
      const filename=join(directory,'reviewed-history-v1','prefix-'+proof.checkpoint.prefixSha256+'.json');
      const wire=await readFile(filename,'utf8');
      segments.push({filename,wire});proof=JSON.parse(wire);
    }
    assert.ok(segments.length>=2,'two retained segments required');
    const {filename,wire}=segments.at(-1);
    await writeFile(filename,'damaged earlier retained prefix');
    try{
      // A live status read must recheck disk dependencies even if the slot
      // bytes are unchanged and its most recent prefix is intact.
      const status=await(await fetch(url+'/api/state')).json();
      assert.equal(status.save.unreadable,true);
      await stop();await boot();
      const denied=await post('/api/load');assert.equal(denied.ok,false);
      assert.equal((await post('/api/initialize')).ok,false);
    }finally{await stop();await writeFile(filename,wire);}
    await boot();ok(await post('/api/load'),'LOADED');
    assert.deepEqual(state.world,expected);
  }
  async function rejectDamagedNewestPrefix(first,second){
    const latest=JSON.parse(await readFile(join(directory,'world-a.json'),'utf8'));
    const proof=JSON.parse(latest.careerProof);
    assert.equal(proof.anchorKind,'checkpoint');
    const file=join(directory,'reviewed-history-v1','prefix-'+proof.checkpoint.prefixSha256+'.json');
    const good=await readFile(file,'utf8');
    await stop();
    try{
      await writeFile(file,'damaged P4 newest retained source prefix');
      await boot();ok(await post('/api/load'),'LOADED');
      assert.deepEqual(state.world,first);
      assert.equal(state.save.recoveryWarning,true);
      assert.equal(await readFile(file,'utf8'),'damaged P4 newest retained source prefix');
    }finally{await stop();await writeFile(file,good);}
    await boot();ok(await post('/api/load'),'LOADED');
    assert.deepEqual(state.world,second);
  }
  async function rejectDamagedLatestDisk(first,second,damage){
    // Keep the genuine save envelopes untouched. Only corrupt the actual
    // newest materialized generation, never manufacture a playable world.
    await stop();
    const restore=await damage();
    try{
      await boot();ok(await post('/api/load'),'LOADED');
      assert.deepEqual(state.world,first);
      assert.equal(state.save.recoveryWarning,true);
      assert.equal(state.save.generation,1);
    }finally{await stop();await restore();}
    await boot();ok(await post('/api/load'),'LOADED');
    assert.deepEqual(state.world,second);
    assert.equal(state.save.generation,2);
    assert.equal(state.save.recoveryWarning,false);
  }
  async function rejectForgedLatest(first,mutate,{restore=false,recompute=true}={}){
    const slot=join(directory,'world-a.json');
    await stop();
    const good=await readFile(slot,'utf8'),record=JSON.parse(good);
    mutate(record);
    if(recompute)record.sha256=createHash('sha256').update(JSON.stringify([record.format,record.generation,record.world,record.careerProof])).digest('hex');
    const forged=JSON.stringify(record)+'\n';
    await writeFile(slot,forged);
    await boot();
    ok(await post('/api/load'),'LOADED');
    assert.deepEqual(state.world,first);
    assert.equal(state.save.recoveryWarning,true);
    assert.equal(await readFile(slot,'utf8'),forged);
    if(restore){
      await stop();await writeFile(slot,good);
      await boot();ok(await post('/api/load'),'LOADED');
      assert.deepEqual(state.world,JSON.parse(JSON.parse(good).world));
    }
  }
  await boot();ok(await post('/api/initialize'));
  await command('/api/open-shop',{ownerName:'來源玩家',shopName:'高階鍛造實測'});
  assert.equal(state.save.format,'akimono.local-world-save.v2');
  assert.equal(Boolean(state.reviewedCrossPeriod),crossPeriod);
  assert.equal(Boolean(state.reviewedMarketCommerce),marketCommerce);
  return {directory,get state(){return state},stock,exp,quote,remaining,boundary,tick,enoughTime,use,deny,list,market,ore,gather,stones,discard,saveAndRestart,rejectDamagedOldestPrefix,rejectDamagedNewestPrefix,rejectDamagedLatestDisk,rejectForgedLatest,post};
}
