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
import {planGenuineMarketStep,legalMarketWaitMinutes,chooseGenuineFundingSale} from './genuine-market-plan.mjs';
const cwd=fileURLToPath(new URL('../../',import.meta.url));
const ok=(r,code='COMMITTED')=>{
  assert.equal(r.code,code,JSON.stringify({code:r.code,error:r.error,reason:r.details?.reason,clock:r.state?.world?.nowSeconds,shop:r.state?.shop?.time,money:r.state?.shop?.money,exp:r.state?.shop?.exp}));
  return r;
};
export async function genuinePlayer(t,{now='896401',crossPeriod=false,fullCommerce=false,fundMarketWithWork=false,fundingWorkBudget=120,fundingSaleItems=[],onTick=null,onPurchase=null,trace=false}={}){
  assert.ok(!fundMarketWithWork||crossPeriod,'earned market funding requires the real settlement path');
  assert.ok(Number.isSafeInteger(fundingWorkBudget)&&fundingWorkBudget>0);
  assert.ok(Array.isArray(fundingSaleItems)&&fundingSaleItems.every(id=>Number.isSafeInteger(id)&&id>=1&&id<=79));
  // Test strategy reserve, not a game parameter. Retain cash for pending
  // source upkeep as well as the next purchase; it never enters the server.
  const fundingReserve=()=>fundMarketWithWork?Math.max(45000,Math.ceil(state.shop.costtoday??0)+10000):0;
  let fundingWorks=0;
  const directory=await mkdtemp(join(tmpdir(),'akimono-p3-v2-high-'));
  let child,url,state,stderr='',requests=0;
  const started=Date.now();
  const context=()=>({requests,elapsedMs:Date.now()-started,revision:state?.world?.revision,
    period:state?.world?.period?.settledCount,historyCommands:state?.historyCommands,
    checkpointRevision:state?.historyCheckpointRevision,generation:state?.save?.generation,
    money:state?.shop?.money,remaining:state?.shop?state.world.nowSeconds-state.shop.time:null});
  const diagnostic=(phase,extra={})=>{if(trace)t.diagnostic(JSON.stringify({phase,...context(),...extra}));};
  // Timeout is a test failure, never a retry or a new randomly generated player.
  // Include response body consumption: a hung server must not hold CI forever.
  async function request(route,options={}){
    const begin=Date.now(),sequence=++requests;
    try{
      const response=await fetch(url+route,{...options,signal:AbortSignal.timeout(300000)});
      const payload=await response.json();
      const result=options.method==='POST'?{status:response.status,...payload}:payload;
      if(Date.now()-begin>=10000||sequence%25===0)diagnostic('http-response',{route,sequence,durationMs:Date.now()-begin,code:result.code});
      return result;
    }catch(error){
      throw Error('genuine HTTP request failed '+JSON.stringify({route,body:options.body,sequence,durationMs:Date.now()-begin,...context(),stderr:stderr.slice(-4000)}),{cause:error});
    }
  }
  const stop=async()=>{
    if(!child||child.exitCode!==null||child.signalCode!==null)return;
    await new Promise(resolve=>{child.once('exit',resolve);child.kill();});
  };
  t.after(async()=>{await stop();await rm(directory,{recursive:true,force:true});});
  async function boot(){
    stderr='';
    const env={...process.env,AKIMONO_PORT:'0',AKIMONO_SAVE_DIR:directory,
      AKIMONO_E2E_DETERMINISTIC_RNG:'0',AKIMONO_REVIEWED_CROSS_PERIOD:crossPeriod?'1':'0',AKIMONO_REVIEWED_FULL_COMMERCE:fullCommerce?'1':'0'};
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
    state=await request('/api/state');
  }
  async function post(route,body={}){
    const result=await request(route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
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
    assert.ok(minutes>=1&&minutes<=60&&(crossPeriod||minutes*60<boundary()),'source period budget exhausted: '+JSON.stringify({minutes,boundary:boundary(),remaining:state.shop?remaining():null,exp:state.shop?.exp,stock:state.shop?.item,money:state.shop?.money}));
    const before=state.world;
    const nowSeconds=before.nowSeconds,revision=before.revision;
    const priorPeriods=state.world.period.settledCount,crosses=minutes*60>=boundary();
    const result=await command('/api/advance-reviewed-time',{minutes});
    assert.equal(state.world.nowSeconds,nowSeconds+minutes*60);
    assert.equal(state.world.revision,revision+1);
    assert.equal(state.world.period.settledCount,priorPeriods+(crosses&&before.shops.length===1?1:0));
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
    const offer=quote(id,useId);
    // Snapshot after all time waits. An advance may emit legitimate logs.
    // Reviewed frozen declarative/gathering/gift/sword-map USEs do not.
    const silentUse=fullCommerce&&crossPeriod&&([9,10,12,14,15,16,17,20,21,22,23,27,28,29,35,36,37,39,66,79].includes(id)||id===26&&useId!==0);
    const beforeLogs=silentUse?Object.fromEntries(['log0.cgi','log1.cgi','log2.cgi'].map(name=>[name,structuredClone(state.world.period.disk.live[name])])):null;
    const result=await command('/api/use',{itemId:id,useId,requestedCount:count,...(offer.targetShopId?{targetShopId:offer.targetShopId}:{})});
    assert.equal(result.details.effectiveCount,count);
    if(silentUse){
      assert.ok(!Object.hasOwn(result.details,'originalInlineLogCalls'));
      for(const [name,entry] of Object.entries(beforeLogs))assert.deepEqual(state.world.period.disk.live[name],entry,'original silent USE #'+id+'/'+useId+': '+name);
    }
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
  async function earnMarketFunds(purpose){
    assert.ok(fundMarketWithWork&&fundingWorks<fundingWorkBudget,'legal source work funding budget '+JSON.stringify({
      purpose,fundingWorks,fundingWorkBudget,money:state.shop.money,reserve:fundingReserve(),
      costtoday:state.shop.costtoday,period:state.world.period.settledCount,
      exp:state.shop.exp,surplus:fundingSaleItems.map(id=>[id,stock(id)])}));
    const sale=chooseGenuineFundingSale({currentItem:state.shop.showcase[0],stock,surplusItems:fundingSaleItems});
    if(sale!==null)await list(sale);
    if(!stock(13))await market(13);
    const result=await use(13,1);
    fundingWorks++;
    assert.equal(result.details.moneyEarned,10000,'real P5 work receipt');
    return result;
  }
  async function market(id,count=1,{partial=false,sell=[]}={}){
    let needed=count,attempts=0;
    const reasonCounts={};
    const context=(offer,plan)=>JSON.stringify({id,needed,owned:stock(id),money:state.shop.money,
      offer:offer?{price:offer.price,stock:offer.marketStock,limit:offer.limit,timeSeconds:offer.timeSeconds,canBuy:offer.canBuy}:null,
      plan,reasonCounts,boundary:boundary(),remaining:remaining(),period:state.world.period.settledCount,fundingWorks});
    while(needed>0){
      const offer=state.marketOffers.find(x=>x.itemId===id);
      const plan=planGenuineMarketStep({offer,owned:stock(id),needed,partial,money:state.shop.money,
        remaining:remaining(),reserve:id===13?0:fundingReserve()});
      reasonCounts[plan.kind+':'+(plan.reason??'')]=(reasonCounts[plan.kind+':'+(plan.reason??'')]??0)+1;
      assert.ok(++attempts<=240,'live market budget exhausted '+context(offer,plan));
      if(plan.kind==='buy'){
        const before=state.world;
        const result=await command('/api/buy',{itemId:id,requestedCount:plan.quantity,marketShelf:offer.shelf,expectedPrice:offer.price});
        assert.equal(result.details.purchasedCount,plan.quantity);
        if(onPurchase)onPurchase(result,before,offer);
        needed-=plan.quantity;
        continue;
      }
      if(plan.kind==='time'){
        await enoughTime(plan.seconds);continue;
      }
      // Frozen #63 is a zero-price tool (PLUS 1d, LIMIT 1/1). When
      // it is absent, wait for real supply rather than earn an unrelated
      // cash reserve; an eight-shelf shop can lose money doing that work.
      if(fundMarketWithWork&&id!==13&&(plan.kind==='fund'||(id!==63&&!offer&&state.shop.money<fundingReserve()&&stock(13)))){
        await earnMarketFunds({kind:'market',id,needed,plan});continue;
      }
      if(plan.kind==='fund'){
        const product=sell.find(item=>stock(item)>0);
        // Without a funded strategy or a sale source, waiting for a fixed
        // price cannot create the missing cash. Report the actual obstacle.
        if(product)await list(product);
      }
      const minutes=legalMarketWaitMinutes({crossPeriod,boundary:boundary()});
      assert.ok(minutes>=1,'market blocked at source period boundary '+context(offer,plan));
      await tick(minutes);
    }
  }
  async function ore(id,count){
    const useId={5:0,6:1,7:2}[id];assert.ok(useId!==undefined);
    for(let n=0;stock(id)<count;n++){
      assert.ok(n<200,'source mining budget #'+id+' target '+count+' actual '+stock(id));
      while(fundMarketWithWork&&state.shop.money<fundingReserve())await earnMarketFunds({kind:'ore',id,count});
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
    diagnostic('save-begin',{expectedGeneration:generation});
    const result=ok(await post('/api/save',{expectedRevision:state.world.revision,expectedGeneration:generation}),'SAVED');
    diagnostic('save-committed');
    assert.equal(state.save.generation,generation+1);
    const snapshot=result.state.world;
    await stop();diagnostic('restart-stopped');await boot();diagnostic('restart-booted');ok(await post('/api/load'),'LOADED');
    assert.deepEqual(state.world,snapshot);
    assert.equal(state.save.format,'akimono.local-world-save.v2');
    assert.equal(state.save.generation,generation+1);
    diagnostic('restart-verified');
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
      const status=await request('/api/state');
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
  assert.equal(Boolean(state.reviewedFullCommerce),fullCommerce);
  return {directory,diagnostic,get state(){return state},get fundingWorks(){return fundingWorks},stock,exp,quote,remaining,boundary,tick,enoughTime,use,deny,list,market,ore,gather,stones,discard,saveAndRestart,rejectDamagedOldestPrefix,rejectDamagedNewestPrefix,rejectForgedLatest,post,request};
}
