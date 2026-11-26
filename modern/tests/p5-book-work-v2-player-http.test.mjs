/** P5 genuine HTTP/CAS acceptance candidate.
 * The clock is the server's real clock, all PLUS/USE RNG is server-owned.
 * Only negative disk and command tests alter data; no positive asset fixture.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';
import {inspectDairyCheckpoint as inspectCheckpoint} from './support/p4-dairy-proof.mjs';

const rate=[3000,10000],normal=[7200,14400],peddle=[4800,9600];
async function deny(p,route,body){
  const world=p.state.world,history=p.state.historyCommands,checkpoint=p.state.historyCheckpointRevision;
  const r=await p.post(route,{expectedRevision:world.revision,...body});
  assert.equal(r.ok,false,JSON.stringify(body));
  assert.deepEqual(p.state.world,world);
  assert.equal(p.state.historyCommands,history);
  assert.equal(p.state.historyCheckpointRevision,checkpoint);
  return r;
}
async function waitOffer(p,id){
  for(let n=0;n<240;n++){
    const q=p.state.marketOffers.find(x=>x.itemId===id);
    if(q?.canBuy)return q;
    await p.tick(60);
  }
  assert.fail('bounded real PLUS market budget #'+id);
}
async function work(p,useId,requestedCount=1,{effectiveCount=requestedCount,wait=true}={}){
  const expected=(p.state.shop.job==='peddle'?peddle:normal)[useId];
  assert.equal(p.quote(13,useId).timePerUseSeconds,expected);
  if(wait)await p.enoughTime(expected*effectiveCount);
  const before=p.state.world,old=before.shops[0];
  const r=await p.post('/api/use',{expectedRevision:before.revision,itemId:13,useId,requestedCount});
  assert.equal(r.code,'COMMITTED',JSON.stringify(r.details??r.error));
  const d=r.details,after=p.state.shop;
  assert.equal(d.requestedCount,requestedCount);
  assert.equal(d.effectiveCount,effectiveCount);
  assert.equal(d.moneySpent,0);
  assert.equal(d.moneyEarned,rate[useId]*effectiveCount);
  assert.equal(after.money,old.money+d.moneyEarned);
  assert.equal(after.paytoday,old.paytoday);
  assert.equal(d.useTimeSeconds,expected);
  assert.equal(d.timeSpentSeconds,expected*effectiveCount);
  assert.equal(after.time,Math.max(old.time,before.nowSeconds-259200)+d.timeSpentSeconds);
  assert.equal(p.stock(13),1);
  assert.deepEqual(after.item,old.item);
  assert.deepEqual(after.exp??{},old.exp??{});
  assert.equal(after.job,old.job);
  assert.deepEqual(d.originalUseItem,[]);
  assert.deepEqual(d.originalAddItem,[]);
  assert.equal(d.randomDrawsUsed,0);
  assert.equal(d.originalInlineLogCalls.length,2);
  assert.deepEqual(d.originalInlineLogCalls[0],[0,1,'バイトし、'+d.originalFunctionReturn]);
  assert.deepEqual(d.originalInlineLogCalls[1],[3,0,old.shopname+'がバイトしたようです']);
  assert.equal(p.state.world.revision,before.revision+1);
  return {useId,requestedCount,effectiveCount,earned:d.moneyEarned,time:d.timeSpentSeconds};
}
async function history(p,generation){
  const record=JSON.parse(await readFile(join(p.directory,generation%2?'world-b.json':'world-a.json'),'utf8'));
  assert.equal(record.format,'akimono.local-world-save.v2');
  assert.equal(record.generation,generation);
  const world=JSON.parse(record.world);
  assert.deepEqual(world,p.state.world);
  let proof=JSON.parse(record.careerProof),commands=[],revision=world.revision,segments=0;
  while(true){
    const anchor=JSON.parse(proof.anchor);
    assert.equal(anchor.revision+proof.commands.length,revision);
    commands=[...proof.commands,...commands];
    revision=anchor.revision;
    if(proof.anchorKind==='fresh')break;
    assert.equal(proof.anchorKind,'checkpoint');
    proof=JSON.parse(await readFile(join(p.directory,'reviewed-history-v1','prefix-'+proof.checkpoint.prefixSha256+'.json'),'utf8'));
    segments++;
  }
  const buys=commands.filter(c=>c.kind==='market-buy'&&c.itemId===13);
  assert.equal(buys.length,1);
  assert.equal(buys[0].expectedPrice,0);
  const jobs=commands.filter(c=>c.kind==='use-item'&&c.itemId===13);
  assert.ok(jobs.length>0);
  for(const c of jobs){
    assert.deepEqual(Object.keys(c).sort(),['expectedRevision','itemId','kind','requestedCount','shopId','useId']);
    assert.ok(c.expectedRevision>buys[0].expectedRevision);
  }
  return {record,commands,jobs,segments};
}

test('P5 new player: lawful zero-price book, clipped work, career, two v2 generations, cash spending and authenticated replay',async t=>{
  const purchases=[],works=[];
  const p=await genuinePlayer(t,{now:null,crossPeriod:true,
    onPurchase(r,before,offer){
      const d=r.details,old=before.shops[0],after=r.state.shop;
      assert.equal(d.unitPrice,offer.price);
      assert.equal(d.totalPaid,d.purchasedCount*offer.price);
      assert.equal(after.money,old.money-d.totalPaid);
      assert.equal(after.paytoday,old.paytoday+d.totalPaid);
      assert.equal(d.tax,0);
      assert.equal(after.item[d.itemId-1],old.item[d.itemId-1]+d.purchasedCount);
      assert.equal(r.state.world.market.wholesale[d.itemId-1],offer.marketStock-d.purchasedCount);
      assert.equal(after.time,Math.max(old.time,before.nowSeconds-259200)+d.timeConsumedSeconds);
      assert.equal(d.timeConsumedSeconds,offer.timeSeconds);
      assert.equal(r.state.world.revision,before.revision+1);
      purchases.push({itemId:d.itemId,count:d.purchasedCount,paid:d.totalPaid,time:d.timeConsumedSeconds});
    }
  });
  assert.equal(p.state.shop.money,100000);
  assert.equal(p.stock(13),0);
  assert.equal(p.state.world.market.wholesale[12],0);
  await p.deny(13,0);await p.deny(13,1);
  await deny(p,'/api/buy',{itemId:13,requestedCount:1,marketShelf:0,expectedPrice:0});
  await waitOffer(p,13);
  const book=p.state.marketOffers.find(x=>x.itemId===13);
  assert.equal(book.price,0);
  assert.equal(book.timeSeconds,600);
  assert.equal(book.limit,1);
  assert.equal(book.marketStock,1);
  for(const extra of [{expectedPrice:-1},{expectedPrice:1},{marketShelf:book.shelf+1},
    {marketStock:1},{itemId:63},{itemId:999},{requestedCount:0},
    {expectedRevision:p.state.world.revision-1}]){
    await deny(p,'/api/buy',{itemId:13,requestedCount:1,marketShelf:book.shelf,expectedPrice:0,...extra});
  }
  await p.market(13);
  assert.equal(p.stock(13),1);
  assert.deepEqual(purchases[0],{itemId:13,count:1,paid:0,time:600});
  assert.equal(p.state.world.market.wholesale[12],0);
  await deny(p,'/api/buy',{itemId:13,requestedCount:1,marketShelf:book.shelf,expectedPrice:0});
  await deny(p,'/api/showcase',{itemId:13,shelf:0,per:100});
  assert.equal(p.state.shop.showcase[0],0);
  await p.tick(60);
  assert.equal(p.state.world.market.wholesale[12],0,'one held book saturates whole street source cap');
  works.push(await work(p,0));
  works.push(await work(p,1));
  await p.enoughTime(normal[0]);
  const effective=Math.floor(p.remaining()/normal[0]);
  assert.ok(effective>=1&&effective<=36);
  works.push(await work(p,0,effective+2,{effectiveCount:effective,wait:false}));
  assert.ok(p.remaining()<normal[0]);
  await p.deny(13,0);
  for(const extra of [{requestedCount:0},{requestedCount:-1},{requestedCount:1.5},
    {expectedRevision:p.state.world.revision-1},{randomDraws:[0]},
    {money:999999},{income:999999},{job:'peddle'},{time:0}]){
    await p.deny(13,1,extra);
  }
  await deny(p,'/api/advance-reviewed-time',{minutes:60,randomDraws:[0]});
  const career=await waitOffer(p,78);
  assert.ok(career.price>0);
  await deny(p,'/api/buy',{itemId:78,requestedCount:1,marketShelf:career.shelf,expectedPrice:0});
  await p.market(78);
  await p.use(78,12);
  assert.equal(p.state.shop.job,'peddle');
  assert.equal(p.stock(78),0);
  works.push(await work(p,0,2));
  works.push(await work(p,1));
  const first=await p.saveAndRestart(0);
  assert.equal(p.stock(13),1);
  assert.equal(p.state.shop.job,'peddle');
  const firstHistory=await history(p,1);
  assert.equal(firstHistory.jobs.length,works.length);
  works.push(await work(p,1,2));
  // Legitimate #8 purchases and discards exercise funds and checkpoint
  // rotation without using fixture stock, EXP, time or injected history.
  for(let batch=0;batch<3;batch++){
    await p.market(8,43,{partial:true});
    for(let n=0;n<43;n++)await p.discard(8,1);
  }
  assert.equal(p.stock(8),0);
  assert.ok(purchases.some(x=>x.itemId===8&&x.paid>0));
  assert.ok(Number.isSafeInteger(p.state.historyCheckpointRevision));
  works.push(await work(p,0));
  const second=await p.saveAndRestart(1);
  assert.ok(second.revision>first.revision);
  assert.equal(p.stock(13),1);
  assert.equal(p.state.shop.job,'peddle');
  const verified=await inspectCheckpoint(p,2);
  const retained=await history(p,2);
  assert.ok(verified.segments>=1);
  assert.equal(retained.jobs.length,works.length);
  assert.deepEqual(retained.jobs.map(c=>[c.useId,c.requestedCount]),works.map(c=>[c.useId,c.requestedCount]));
  await deny(p,'/api/save',{expectedGeneration:1});
  await p.rejectDamagedNewestPrefix(first,second);
  for(const mutate of [
    r=>{r.checkpointAuth='0'.repeat(64);},
    r=>{const proof=JSON.parse(r.careerProof);proof.checkpoint.mac='0'.repeat(64);r.careerProof=JSON.stringify(proof);},
    r=>{const proof=JSON.parse(r.careerProof);proof.checkpoint.sourceFingerprint='0'.repeat(64);r.careerProof=JSON.stringify(proof);},
    r=>{const proof=JSON.parse(r.careerProof);proof.checkpoint.prefixSha256='0'.repeat(64);r.careerProof=JSON.stringify(proof);},
    r=>{const w=JSON.parse(r.world);w.shops[0].money+=3000;r.world=JSON.stringify(w);},
  ])await p.rejectForgedLatest(first,mutate,{restore:true});
  await p.rejectForgedLatest(first,r=>{r.format='akimono.local-world-save.v1';},{restore:true});
  const afterRestart=await work(p,0);
  t.diagnostic('P5 real player purchases='+JSON.stringify(purchases)+
    ' work='+JSON.stringify(works)+' second restart work='+JSON.stringify(afterRestart)+
    ' generations=1,2 revisions='+first.revision+'→'+second.revision+
    ' checkpoint='+p.state.historyCheckpointRevision+' retained segments='+verified.segments);
});

test('P5 fresh v2 proof independently rejects checksum-correct fake cash, book and work commands',async t=>{
  const p=await genuinePlayer(t,{now:null,crossPeriod:true});
  await p.market(13);
  await work(p,0);
  const first=await p.saveAndRestart(0);
  await work(p,1);
  const second=await p.saveAndRestart(1);
  const h=await history(p,2);
  assert.equal(h.record.checkpointAuth,undefined,'fresh replay, not HMAC-only rejection');
  assert.equal(h.segments,0);
  for(const mutate of [
    r=>{const w=JSON.parse(r.world);w.shops[0].money+=12345;r.world=JSON.stringify(w);},
    r=>{const w=JSON.parse(r.world);w.shops[0].item[12]=0;r.world=JSON.stringify(w);},
    r=>{const proof=JSON.parse(r.careerProof);const c=proof.commands.find(c=>c.kind==='market-buy'&&c.itemId===13);c.expectedPrice=1;r.careerProof=JSON.stringify(proof);},
    r=>{const proof=JSON.parse(r.careerProof);const c=proof.commands.find(c=>c.kind==='use-item'&&c.itemId===13);c.useId=1;r.careerProof=JSON.stringify(proof);},
  ])await p.rejectForgedLatest(first,mutate,{restore:true});
  assert.deepEqual(p.state.world,second);
  await p.rejectForgedLatest(first,r=>{r.sha256='0'.repeat(64);},{recompute:false});
});
