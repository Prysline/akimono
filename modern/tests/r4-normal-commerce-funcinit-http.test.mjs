/** One live career: acquire #24 and change profession through actual USE. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';

test('R4 genuine #24 appraiser and peddle FUNCINIT transport, actual market payment and dual v2 reload',async t=>{
  const purchases=[];
  const p=await genuinePlayer(t,{now:null,crossPeriod:true,fullCommerce:true,fundMarketWithWork:true,
    onPurchase(r,before,offer){
      if(offer.itemId!==78)return;
      const shop=before.shops[0],after=r.state.world,d=r.details;
      const appraiser=shop.item[23]>0,peddle=shop.job==='peddle';
      const seconds=(appraiser?450:600)/(peddle?2:1);
      assert.equal(offer.price,10000);
      assert.equal(offer.timeSeconds,seconds);assert.equal(d.timeConsumedSeconds,seconds);
      assert.equal(d.totalPaid,10000);assert.equal(d.purchasedCount,1);
      assert.equal(after.shops[0].money,shop.money-10000);
      assert.equal(after.shops[0].paytoday,shop.paytoday+10000);
      assert.equal(after.shops[0].time,Math.max(shop.time,before.nowSeconds-259200)+seconds);
      assert.equal(after.shops[0].item[77],shop.item[77]+1);
      assert.equal(after.market.wholesale[77],before.market.wholesale[77]-1);
      assert.equal(after.revision,before.revision+1);assert.equal(after.nowSeconds,before.nowSeconds);
      assert.ok(after.period.disk.live['log0.cgi'].bytes.startsWith([after.nowSeconds,0,1,'local market-buy'].join('\t')+'\n'));
      purchases.push({appraiser,peddle,seconds,cmd:{expectedRevision:before.revision,itemId:78,requestedCount:1,marketShelf:offer.shelf,expectedPrice:offer.price}});
    }});
  await p.market(78);await p.discard(78);
  await p.use(79,0);await p.use(79,3);
  for(const id of [1,2,3,4])await p.gather(id,3);
  for(const id of [5,6,7])await p.ore(id,3);
  // The actual 36-hour settlement decays EXP. Train on the same career
  // until the source threshold is met, without skipping any settlement.
  for(let n=0;n<18&&!p.stock(24);n++){
    if(!p.stock(37))await p.market(37);
    await p.stones(33);
    await p.enoughTime(p.quote(37,2).timePerUseSeconds);
    if(p.exp(37)>=200){
      const before=p.state.shop,trained=await p.use(37,2);
      assert.equal(trained.details.experienceGain,50);
      assert.equal(p.stock(24),1);assert.equal(p.stock(37),0);
      for(let id=1;id<=8;id++)assert.equal(p.stock(id),before.item[id-1]-3);
    }else{
      if(p.stock(19))await p.discard(19,1);
      const trained=await p.use(37,1);
      assert.equal(trained.details.experienceGain,50);
      assert.equal(p.stock(19),1);
    }
  }
  assert.equal(p.stock(24),1,'bounded source training: '+JSON.stringify({exp:p.exp(37),period:p.state.world.period.settledCount,fundingWorks:p.fundingWorks}));
  await p.market(78);
  await p.use(78,12);
  assert.equal(p.state.shop.job,'peddle');assert.equal(p.stock(78),0);
  await p.market(78);
  const before=p.state.world,history=p.state.historyCommands,checkpoint=p.state.historyCheckpointRevision;
  assert.equal((await p.post('/api/buy',purchases.at(-1).cmd)).ok,false);
  assert.deepEqual(p.state.world,before);assert.equal(p.state.historyCommands,history);
  assert.equal(p.state.historyCheckpointRevision,checkpoint);
  const first=await p.saveAndRestart(0);
  assert.equal(first.shops[0].item[23],1);assert.equal(first.shops[0].job,'peddle');
  await p.discard(78);await p.discard(24);await p.market(78);
  const second=await p.saveAndRestart(1);
  assert.equal(second.shops[0].item[23],0);assert.equal(second.shops[0].job,'peddle');
  assert.deepEqual(purchases.map(({appraiser,peddle,seconds})=>[appraiser,peddle,seconds]),
    [[false,false,600],[true,false,450],[true,true,225],[false,true,300]]);
  t.diagnostic(JSON.stringify({transport:purchases.map(x=>x.seconds),fundingWorks:p.fundingWorks,revision:second.revision}));
});
