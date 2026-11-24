import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';

function tDiagnostic(p,receipt){
  // Receipt remains independently checked by CAS/history, and this test
  // checks the source accounting against the pre-command live player.
  assert.ok(p.state.world.period.disk.live['play.cgi'].bytes.length>0);
  assert.ok(receipt.prize.itemId>0);
}
async function crossOnce(p){
  const target=p.state.world.period.settledCount+1;
  for(let n=0;n<37;n++){
    const before=p.state.world;
    const minutes=Math.min(60,Math.ceil(p.boundary()/60));
    const r=await p.tick(minutes);
    if(p.state.world.period.settledCount===target){
      const period=p.state.world.period;
      assert.equal(period.disk.generations[0]['play.cgi'].bytes,before.period.disk.live['play.cgi'].bytes);
      assert.equal(period.disk.live['lasttime.cgi'].mtime,p.state.world.nowSeconds);
      assert.ok(r.details.sourceTrace.slices.some(s=>s.dateupdate===1));
      const receipt=r.details.settlementReceipt,old=before.shops[0],shop=p.state.shop;
      assert.ok(receipt,'same source settlement receipt');
      const decayed=Object.fromEntries(Object.entries(old.exp??{}).map(([id,n])=>[id,n-Math.trunc(n*60/1000)-5]).filter(([,n])=>n>0));
      assert.deepEqual(receipt.expAfterLedger,decayed);
      assert.deepEqual(shop.exp,decayed);
      assert.equal(shop.rankingcount,(old.rankingcount??0)+1);
      assert.equal(receipt.rankingCount,shop.rankingcount);
      assert.equal(shop.rankingyesterday,1);
      assert.equal(shop.saletoday>=0,true);
      assert.equal(shop.saleyesterday,receipt.saleBeforeLedger);
      assert.equal(shop.payyesterday,receipt.payBeforeLedger);
      assert.equal(shop.taxyesterday,receipt.taxBeforeLedger);
      assert.equal(shop.costyesterday,receipt.maintenance);
      assert.equal(receipt.cashAfterLedger,receipt.cashBeforeLedger-receipt.maintenance);
      assert.equal(shop.profitstock,Math.trunc(((old.profitstock??0)*3+shop.saleyesterday-shop.payyesterday)/4));
      assert.equal(receipt.cityTaxIn,shop.taxyesterday);
      assert.equal(period.town.in,shop.taxyesterday);
      const yesterday={...old.itemtoday};
      if(receipt.naturalSaleCount)yesterday[receipt.soldItemId]=(yesterday[receipt.soldItemId]??0)+receipt.naturalSaleCount;
      assert.deepEqual(shop.itemyesterday,yesterday);
      const prize=receipt.prize;
      assert.equal(prize.stockAfter-prize.stockBefore,prize.granted);
      assert.equal(prize.granted+prize.discarded,prize.wanted);
      assert.notEqual(period.dtPeople,before.period.dtPeople);
      tDiagnostic(p,receipt);
      return;
    }
  }
  assert.fail('source period not reached by 37 ordinary time commands');
}

test('P3 crossing v2: real skill, craft, two more settlements, 260 legal ordinary operations and checkpoint restarts',async t=>{
  const p=await genuinePlayer(t,{crossPeriod:true});
  await p.use(79,0);await p.use(79,3);
  await p.ore(5,20);await p.ore(6,5);await p.ore(7,3);
  await p.use(37,0);
  await p.ore(5,310);
  await p.market(20);
  await p.use(20,0);
  assert.equal(p.exp(20),20);
  assert.equal(p.stock(18),1);
  assert.ok(p.stock(41)>0);
  await p.list(41);
  const priorPeriods=p.state.world.period.settledCount;
  await crossOnce(p);
  assert.equal(p.state.world.period.settledCount,priorPeriods+1);
  const first=await p.saveAndRestart(0);
  assert.ok(p.stock(5)>=260);
  const anchorBefore=p.state.historyCheckpointRevision;
  let anchor=anchorBefore,rotations=0;
  const initialStock=p.stock(5);
  const rev=p.state.world.revision,clock=p.state.world.nowSeconds;
  for(let i=0;i<260;i++){
    await p.discard(5,1);
    assert.equal(p.state.world.revision,rev+i+1);
    assert.equal(p.state.world.nowSeconds,clock);
    assert.equal(p.stock(5),initialStock-i-1);
    assert.ok(p.state.historyCommands<=128);
    if(anchor!==p.state.historyCheckpointRevision){
      const next=p.state.historyCheckpointRevision;
      assert.ok(Number.isSafeInteger(next)&&(anchor===null||next>anchor));
      anchor=next;rotations++;
    }
  }
  assert.ok(rotations>=2);
  assert.equal(p.stock(18),1);
  await p.ore(5,20);
  const exp=p.exp(20);
  const made=await p.use(20,0);
  assert.equal(made.details.experienceGain,20);
  assert.ok(p.exp(20)>=exp,'earned craft EXP after restart');
  assert.equal(p.stock(18),1);
  await crossOnce(p);
  assert.equal(p.state.world.period.settledCount,priorPeriods+2);
  const second=await p.saveAndRestart(1);
  assert.ok(second.revision>first.revision+256);
  assert.equal(second.period.disk.generations[1]['play.cgi'].bytes,first.period.disk.generations[0]['play.cgi'].bytes);
  assert.equal(p.stock(18),1);
  t.diagnostic('P3 real crossing settlements '+first.period.settledCount+'→'+second.period.settledCount+', checkpoint rotations '+rotations+', exact durable v2 generations');
  await p.rejectForgedLatest(first,record=>{
    const world=JSON.parse(record.world);world.shops[0].item[40]++;
    record.world=JSON.stringify(world);
  });
});
