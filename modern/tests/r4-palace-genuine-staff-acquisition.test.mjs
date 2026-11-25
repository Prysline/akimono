/** R4 acquisition milestone, NOT a successful palace mission proof.
 * Start an actual local player from the server clock and fresh save directory.
 * Use only the existing source HTTP commands, server RNG and normal time.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';

const MATERIAL=3,MAP=12,BOOK=17,STAFF=57;
function diagnostic(p){
  const s=p.state.shop;
  return JSON.stringify({period:p.state.world.period.settledCount,
    revision:p.state.world.revision,point:p.state.shopSummary.point,
    rank:s.rank,money:s.money,branches:p.stock(MATERIAL),staff:p.stock(STAFF),
    woodExp:p.exp(BOOK),gatherExp:p.exp(MAP)});
}
test('R4 genuine player acquires 300 wooden staffs via forest and woodcraft, then v2 save/restart (acquisition only)',async t=>{
  const p=await genuinePlayer(t,{crossPeriod:true,now:null});
  const born=p.state.world;
  assert.equal(p.stock(STAFF),0);
  assert.equal(p.stock(MATERIAL),0);
  assert.equal(p.stock(BOOK),0);
  assert.equal(p.stock(MAP),0);
  assert.equal(p.state.shop.dignity,0);
  assert.equal(p.state.palace.index,0);
  assert.deepEqual(born.period.disk.townData,{});
  // Normal starter gift: two vouchers exchanged for actual maps.
  await p.use(79,0);
  assert.equal(p.stock(MAP),1);
  await p.market(BOOK);
  assert.equal(p.stock(BOOK),1);
  let produced=0,branchesUsed=0;
  for(let attempt=0;p.stock(STAFF)<300;attempt++){
    assert.ok(attempt<48,'source staff craft budget exhausted '+diagnostic(p));
    await p.gather(MATERIAL,20);
    assert.ok(p.stock(MATERIAL)>=20);
    const beforeStaff=p.stock(STAFF),beforeBranches=p.stock(MATERIAL);
    const result=await p.use(BOOK,1);
    const receipt=result.details;
    assert.equal(receipt.sourceUseItemId,BOOK);
    assert.equal(receipt.useNo,1);
    assert.equal(receipt.effectiveCount,1);
    assert.deepEqual(receipt.originalUseItem.find(([id])=>id===MATERIAL),[MATERIAL,20]);
    assert.equal(p.stock(MATERIAL),beforeBranches-20);
    assert.equal(p.stock(BOOK),1,'source woodcraft book is retained');
    const output=receipt.acquired.find(row=>row.itemId===STAFF);
    assert.ok(output,'source MakeAmount receipt for wooden staff');
    assert.equal(output.attemptedCount,20);
    assert.ok(Number.isSafeInteger(output.produced)&&output.produced>=0);
    assert.equal(p.stock(STAFF)-beforeStaff,output.produced);
    produced+=output.produced;branchesUsed+=20;
    assert.equal(p.stock(STAFF),produced,'all held staffs are genuine craft outputs');
  }
  assert.ok(produced>=300&&produced<=600);
  assert.ok(branchesUsed>=300);
  assert.ok(p.exp(BOOK)>0&&p.exp(MAP)>0);
  assert.equal(p.state.shop.dignity,0);
  assert.equal(p.state.palace.owned,produced);
  assert.equal(p.state.palace.requiredPoint,20000);
  assert.equal(p.state.palace.point,p.state.shopSummary.point);
  assert.equal(p.state.palace.canComplete,p.state.palace.point>=20000);
  // No gate bypass. This is a legal acquisition checkpoint, not a forced
  // grant of dignity and not a claim that the score requirement is met.
  assert.deepEqual(p.state.world.period.disk.townData,{});
  const snapshot=await p.saveAndRestart(0);
  assert.equal(snapshot.shops[0].item[STAFF-1],produced);
  assert.equal(p.state.palace.owned,produced);
  assert.equal(p.state.palace.dignity,0);
  assert.deepEqual(snapshot.period.disk.townData,{});
  assert.equal(snapshot.period.disk.live['play.cgi'].bytes.split('\n')[4],'');
  t.diagnostic('R4 real craft acquisition: '+branchesUsed+' branches consumed, '+produced+
    ' staffs retained; '+diagnostic(p)+'; palace completion not attempted');
});
