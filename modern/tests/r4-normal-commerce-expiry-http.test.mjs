/** Actual local HTTP lifecycle: no fixed clock, chosen seed, or injected assets. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';
import {independentPeriodDiskDigest,PERIOD_DISK_DIRECTORY} from '../src/r4-independent-period-disk-store.mjs';

test('R4 genuine absent owner closes at source settlement, archives once, reloads and crosses an empty street boundary',async t=>{
  const p=await genuinePlayer(t,{now:null,crossPeriod:true,fullCommerce:true,trace:true});
  assert.equal(p.state.reviewedOwnerClosure,true);
  // Ordinary source transactions build this career; no administrative time
  // or state setter. Last login is refreshed by the final listing action.
  await p.market(10,2);
  await p.list(10);
  const owner=p.state.shop;
  const last=owner.lastlogin,expires=last+604800;
  assert.equal(last,p.state.world.nowSeconds);
  assert.ok(owner.foundation<=last);
  let beforeClose=null,closed=null,receipt=null;
  for(let n=0;n<207&&closed===null;n++){
    const prior=p.state.world;
    const nextNow=prior.nowSeconds+3600;
    const shouldClose=p.boundary()<=3600&&nextNow>expires&&nextNow-owner.foundation>43200;
    if(shouldClose){
      beforeClose=await p.saveAndRestart(0);
      assert.deepEqual(beforeClose,prior);
      assert.equal(beforeClose.shops[0].lastlogin,last);
      assert.equal(Object.hasOwn(beforeClose.period.disk.live,'log/delete.cgi'),false);
    }
    const step=await p.tick(60);
    if(!shouldClose){
      assert.equal(p.state.world.shops.length,1,'owner must not disappear before actual source expiry settlement');
      assert.equal(p.state.shop.lastlogin,last);
      assert.ok(!step.details.closureReceipt);
    }else{
      closed=p.state.world;receipt=step.details;
      assert.deepEqual(closed.shops,[]);
    }
  }
  assert.ok(beforeClose&&closed&&receipt,'bounded actual seven-day absence plus one source period');
  assert.equal(closed.nowSeconds,beforeClose.nowSeconds+3600);
  assert.equal(closed.period.settledCount,beforeClose.period.settledCount+1);
  assert.equal(receipt.closureReceipt.shopId,owner.id);
  assert.equal(receipt.closureReceipt.reason,'沒有上線');
  assert.deepEqual(receipt.closureReceipt.deletedSessions,[]);
  assert.deepEqual(receipt.closureReceipt.remainingSessions,[]);
  assert.equal(receipt.settlementReceipt.cashAfterLedger,0-receipt.settlementReceipt.maintenance);
  assert.equal(receipt.settlementReceipt.rankingCount,beforeClose.shops[0].rankingcount+1);
  assert.equal(receipt.closureReceipt.archiveHash.interpreter,receipt.sourceTrace.interpreter);
  assert.equal(receipt.closureReceipt.archiveHash.seed,receipt.sourceTrace.seed);
  const archive=closed.period.disk.live['log/delete.cgi'];
  assert.equal(archive.mtime,closed.nowSeconds);
  const rows=archive.bytes.trimEnd().split('\n');
  assert.equal(rows.length,3);
  assert.equal(rows[0],[closed.nowSeconds,'','','','','','沒有上線'].join('\t'));
  const scalar=rows[1].split(','),sections=rows[2].split(':');
  assert.equal(scalar.length,32);assert.equal(scalar[0],String(owner.id));assert.equal(scalar[1],String(last));
  assert.ok(scalar.includes(owner.shopname));
  assert.equal(sections.length,7);assert.equal(sections[2].split(',').length,79);
  for(const [i,k] of ['itemyesterday','itemtoday','exp','user'].entries()){
    const parts=sections[i+3]===''?[]:sections[i+3].split(',');
    assert.deepEqual(parts.filter((_,j)=>j%2===0),receipt.closureReceipt.archiveHash.archiveHashOrders[k]);
  }
  assert.equal(closed.period.disk.live['play.cgi'].bytes.split('\n').length,7);
  assert.ok(closed.period.disk.live['log0.cgi'].bytes.includes(owner.shopname+'因為沒有上線所以店鋪被關閉了。'));
  assert.equal(closed.period.disk.generations[0]['play.cgi'].bytes,beforeClose.period.disk.live['play.cgi'].bytes);
  const path=join(p.directory,PERIOD_DISK_DIRECTORY,independentPeriodDiskDigest(closed));
  assert.equal(await readFile(join(path,'log','delete.cgi'),'utf8'),archive.bytes);
  assert.equal(Math.floor((await stat(join(path,'log','delete.cgi'))).mtimeMs/1000),archive.mtime);
  assert.deepEqual(await readdir(join(path,'log')),['delete.cgi']);
  assert.equal((await p.post('/api/advance-reviewed-time',{expectedRevision:closed.revision-1,minutes:1})).ok,false);
  assert.deepEqual(p.state.world,closed);
  await p.saveAndRestart(1);
  assert.deepEqual(p.state.world,closed);
  assert.equal((await p.post('/api/open-shop',{expectedRevision:closed.revision,ownerName:'另一位',shopName:'不能重用舊編號'})).ok,false);
  assert.deepEqual(p.state.world,closed);
  // Empty streets keep original PLUS/EVENT, but no per-shop settlement.
  const untilBoundary=p.boundary();
  let elapsed=0;
  for(let n=0;elapsed<untilBoundary&&n<37;n++){
    const step=await p.tick(60);elapsed+=3600;
    assert.equal(step.details.settlementReceipt,null);
    assert.equal(step.details.closureReceipt,null);
    assert.equal(step.details.naturalSaleCount,0);
    assert.deepEqual(p.state.world.shops,[]);
    assert.deepEqual(p.state.world.period.disk.live['log/delete.cgi'],archive);
  }
  assert.ok(elapsed>=untilBoundary);
  const empty=p.state.world;
  assert.equal(empty.period.settledCount,closed.period.settledCount);
  assert.equal(empty.period.lastSettledBoundarySeconds,closed.period.lastSettledBoundarySeconds);
  assert.deepEqual(empty.period.town,closed.period.town);
  await p.saveAndRestart(2);
  assert.deepEqual(p.state.world,empty);
  const laterPath=join(p.directory,PERIOD_DISK_DIRECTORY,independentPeriodDiskDigest(empty),'log','delete.cgi');
  assert.equal(await readFile(laterPath,'utf8'),archive.bytes);
  t.diagnostic(JSON.stringify({lastlogin:last,closedAt:closed.nowSeconds,settlements:closed.period.settledCount,closedRevision:closed.revision,emptyRevision:empty.revision}));
});
