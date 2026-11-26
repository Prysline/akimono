/** Genuine full-commerce acquisition routes. No fixed clock, fixture PLUS,
 * client RNG, injected cash, inventory, EXP or direct state modification. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';

test('R4 genuine #65 zero-POP listing and #62 self advertisement survive source time, EXP and v2 reload',async t=>{
  const sales={},settlements=[];
  const p=await genuinePlayer(t,{now:null,crossPeriod:true,fullCommerce:true,
    onTick(r){
      for(const [id,count] of Object.entries(r.details.soldByItem))sales[id]=(sales[id]??0)+count;
      if(r.details.settlementReceipt)settlements.push(r.details.settlementReceipt);
    }});
  await p.market(13);
  await p.market(65);
  assert.equal(p.stock(65),1);
  await p.list(65);
  const moneyBefore=p.state.shop.money;
  await p.tick(60);
  assert.equal(p.stock(65),1);
  assert.equal(p.state.shop.showcase[0],65);
  assert.equal(sales[65]??0,0,'zero POP remains listable, not natural demand');
  // Retain the zero-POP item through normal time and source settlement.
  // Genuine work finances the original positive BASE quote for #62.
  for(let n=0;n<100&&p.stock(62)===0;n++){
    const offer=p.state.marketOffers.find(x=>x.itemId===62);
    if(offer?.canBuy&&p.state.shop.money>=offer.price&&p.remaining()>=offer.timeSeconds){
      await p.market(62);break;
    }
    if(p.state.shop.money<160000){
      await p.use(13,1);continue;
    }
    if(offer?.canBuy){await p.enoughTime(offer.timeSeconds);continue;}
    // Keep the shop active via actual USE, not by touching lastlogin.
    await p.use(13,0);
  }
  assert.equal(p.stock(62),1,'actual source market acquisition');
  assert.equal(p.stock(65),1);
  const first=await p.saveAndRestart(0);
  assert.equal(first.shops[0].item[61],1);
  assert.equal(first.shops[0].item[64],1);
  await p.enoughTime(p.quote(62,0).timePerUseSeconds);
  const rank=p.state.shop.rank,priorExp=p.exp(62),use=await p.use(62,0);
  assert.equal(p.stock(62),0);
  assert.equal(use.details.experienceGain,100);
  const logged=use.details.originalInlineLogCalls.map(row=>[p.state.world.nowSeconds,...row].join('\t')+'\n').reverse().join('');
  assert.ok(p.state.world.period.disk.live['log0.cgi'].bytes.startsWith(logged),'original callback log order including mode 3');
  assert.equal(p.exp(62),priorExp+100);
  const up=Math.trunc(500*(2-rank/5000));
  assert.ok([Math.min(10000,rank+up),Math.max(1000,rank-up)].includes(p.state.shop.rank));
  for(let n=0;!settlements.some(x=>Object.hasOwn(x.expAfterLedger,'62'))&&n<37;n++)await p.tick(60);
  assert.ok(settlements.some(x=>Object.hasOwn(x.expAfterLedger,'62')),'#62 EXP survives a real source ledger');
  assert.equal(p.stock(65),1);
  assert.equal(sales[65]??0,0);
  const saved=await p.saveAndRestart(1);
  assert.ok(['log0.cgi','log1.cgi','log2.cgi'].some(k=>saved.period.disk.live[k].bytes.includes(logged)),'actual source advertisement log survives save and restart');
  t.diagnostic(JSON.stringify({item65Sales:sales[65]??0,advertisementExp:p.exp(62),beforeWork:moneyBefore,finalMoney:p.state.shop.money,settlements:settlements.length}));
});

test('R4 genuine leather equipment package #71 manufacture, natural sale, two generations',async t=>{
  const sales={};
  const p=await genuinePlayer(t,{now:null,crossPeriod:true,fullCommerce:true,onTick(r){
    for(const [id,count] of Object.entries(r.details.soldByItem))sales[id]=(sales[id]??0)+count;
  }});
  await p.market(16);
  for(const [useId,id] of [[0,45],[1,51]]){
    for(let n=0;p.stock(id)<10;n++){
      assert.ok(n<10,'source leather manufacturing budget #'+id);
      await p.gather(2,24);
      await p.use(16,useId);
    }
  }
  await p.market(39);
  const packaged=await p.use(39,12);
  assert.equal(packaged.details.effectiveCount,1);
  assert.equal(p.stock(71),10);
  assert.ok(p.state.showcaseOffers.some(o=>o.itemId===71&&o.owned===10));
  const first=await p.saveAndRestart(0);
  assert.equal(first.shops[0].item[70],10);
  await p.enoughTime(600);
  const listed=await p.post('/api/showcase',{expectedRevision:p.state.world.revision,shelf:0,itemId:71,per:10});
  assert.equal(listed.code,'COMMITTED',JSON.stringify(listed.details??listed.error));
  for(let n=0;!sales[71]&&n<24;n++)await p.tick(60);
  assert.ok(sales[71]>0,'actual natural sale of manufactured package');
  assert.ok(p.stock(71)<10);
  await p.saveAndRestart(1);
  await p.tick(1);
  t.diagnostic(JSON.stringify({produced:10,sold:sales[71],held:p.stock(71),exp:p.exp(39)}));
});
