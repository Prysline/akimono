import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,fork} from 'node:child_process';
import {mkdtempSync,rmSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {jointDigest,jointCanonical,createJointSourceProjector} from '../src/r4-joint-source-projection.mjs';
import {createJointCandidateJournal} from '../src/r4-joint-candidate-journal.mjs';
import {guildSources,dragonSources,projectorFor} from './support/r4-joint-candidate-sources.mjs';
const perl=fileURLToPath(new URL('./original-perl/original-r4-guild-peer-buy-probe.pl',import.meta.url));
const {cases}=JSON.parse(execFileSync('perl',[perl],{encoding:'utf8'}));
const oracle=cases.find(x=>x.spec.name==='same-bulk-negative');
// Peer numeric oracle omits the opposite side's unused daily counter;
// initialize those counters explicitly for this separate DragonBalance fixture.
const withDragon=s=>({saletoday:0,paytoday:0,...s,dragon:0,drmoney:0});
const genesis={
  lineage:'source-sandbox',commonBytes:'old dragon state',
  streets:{
    alpha:{shops:[withDragon(oracle.before.buyer),withDragon(oracle.before.seller)],definitions:{alpha:{dealrate:150},beta:{dealrate:250}},ledgers:oracle.before.ledgers},
    beta:{shops:[withDragon(oracle.before.buyer)],definitions:{alpha:{dealrate:150},beta:{dealrate:250}},ledgers:oracle.before.ledgers},
  },
};
function fixture(t){
  const directory=mkdtempSync(path.join(os.tmpdir(),'akimono-r4-joint-'));
  t.after(()=>rmSync(directory,{recursive:true,force:true}));
  const projector=projectorFor(genesis);
  return {directory,journal:createJointCandidateJournal({directory,projector}),projector};
}
const trade={kind:'guild-buy',lineage:genesis.lineage,id:'buy-1',expectedRevision:0,street:'alpha',buyerId:oracle.before.buyer.id,sellerId:oracle.before.seller.id,
  command:{itemId:79,shelf:0,offeredPrice:oracle.spec.offer,requestedCount:oracle.spec.want},nowSeconds:1000000,townTaxRate:10,sendItemTime:1200,rankDraws:oracle.spec.draws??[]};
const producer=(revision,id,action,commonBefore,commonAfter,rows)=>({kind:'dragon-produce',lineage:genesis.lineage,id,expectedRevision:revision,sourceKind:'race-prize',sourceAction:action,batch:0,commonBefore:jointDigest(commonBefore),commonAfter,rows});
const row={street:'alpha',shopId:oracle.before.buyer.id,amount:500};
const consume=(revision,id,street)=>({kind:'dragon-consume',lineage:genesis.lineage,id,expectedRevision:revision,street,settlementId:'period-1'});
test('joint candidate exact peer source + producer identity + street-specific consumer and replay on actual disk (not player)',async t=>{
  const {journal,directory,projector}=fixture(t);
  const a=await journal.publish(trade);
  assert.equal(a.mode,'published-candidate');assert.equal(a.committable,false);
  assert.deepEqual(a.state.streets.alpha.shops,[withDragon(oracle.after.buyer),withDragon(oracle.after.seller)]);
  assert.deepEqual(a.state.streets.alpha.ledgers,oracle.after.ledgers);
  assert.equal(a.state.streets.alpha.ledgers.alpha.money,-2000);
  assert.deepEqual(a.receipt.details.purchase,oracle.receipt);
  const b=producer(1,'producer-1','race-1',genesis.commonBytes,'dragon state 1',[row,{...row,street:'beta',amount:-300}]);
  const c=producer(2,'producer-2','race-2','dragon state 1','dragon state 2',[row]);
  assert.equal((await journal.publish(b)).mode,'published-candidate');
  assert.equal((await journal.publish(c)).mode,'published-candidate');
  assert.equal((await journal.publish(b)).mode,'replay');
  await assert.rejects(journal.publish({...b,rows:[{...row,amount:501}]}),/identity reused/);
  await assert.rejects(journal.publish({...c,id:'another-id'}),/identity reused/);
  assert.equal((await journal.publish(producer(1,'stale','race-3','dragon state 2','bad',[row]))).mode,'conflict');
  await assert.rejects(journal.publish(producer(3,'unknown','race-3','dragon state 2','bad',[{...row,shopId:9999}])),/unknown street\/shop/);
  const d=await journal.publish(consume(3,'alpha-period','alpha'));
  assert.equal(d.mode,'published-candidate');
  assert.equal(d.receipt.details.payoutText,row.shopId+'\t500\n'+row.shopId+'\t500\n');
  assert.equal(new Set(d.receipt.details.paymentIds).size,2);
  assert.equal(d.state.streets.alpha.shops[0].dragon,1000);
  assert.equal(d.state.streets.alpha.shops[0].money,oracle.after.buyer.money,'only DragonBalance accumulation, no fabricated period cash settlement');
  assert.equal(d.state.streets.beta.shops[0].dragon,0);
  const e=await journal.publish(consume(4,'beta-period','beta'));
  assert.equal(e.state.streets.beta.shops[0].dragon,-300);
  assert.equal(e.state.payments.filter(x=>x.consumedBy===null).length,0);
  assert.equal(e.state.commonBytes,'dragon state 2');
  assert.equal((await journal.publish(consume(3,'alpha-period','alpha'))).mode,'replay');
  await assert.rejects(journal.publish({...consume(5,'alpha-again','alpha'),settlementId:'period-2'}),/subsequent period/);
  const restarted=createJointCandidateJournal({directory,projector:projectorFor(genesis)});
  assert.deepEqual(restarted.read().state,e.state);
  assert.equal(readdirSync(directory).length,5);
  const record=path.join(directory,'revision-000003.json');
  const altered=JSON.parse(readFileSync(record,'utf8'));altered.command.rows[0].amount++;
  writeFileSync(record,jointCanonical(altered));
  assert.throws(()=>restarted.read(),/source replay mismatch/);
  assert.throws(()=>createJointSourceProjector({genesis,guildSources,dragonSources:{...dragonSources,period:dragonSources.period+' '}}),/source drift/);
});
function child(t,directory,command){
  const c=fork(fileURLToPath(new URL('./support/r4-joint-candidate-worker.mjs',import.meta.url)),[],{stdio:['ignore','pipe','pipe','ipc']});
  const queue=[],waiters=[];let failure=null,stderr='';
  c.stderr.on('data',b=>stderr+=b);
  c.on('message',m=>{if(waiters.length)waiters.shift()(m);else queue.push(m)});
  const exit=new Promise(resolve=>c.once('exit',(code,signal)=>{failure={code,signal};resolve(failure);for(const w of waiters.splice(0))w({phase:'exited',code,signal,stderr})}));
  t.after(async()=>{if(!failure)c.kill('SIGKILL');await exit});
  const next=async expected=>{
    const m=queue.length?queue.shift():failure?{phase:'exited',...failure,stderr}:await new Promise(resolve=>waiters.push(resolve));
    assert.equal(m.phase,expected,JSON.stringify(m));return m;
  };
  c.send({directory,genesis,command});
  return {next,go:()=>c.send('continue'),kill:()=>c.kill('SIGKILL'),exit};
}
test('two actual publisher processes race same global revision; exclusive link cannot overwrite winner', {timeout:30000},async t=>{
  const {directory,journal}=fixture(t);
  const a=child(t,directory,trade);
  const p=producer(0,'producer-race','race-1',genesis.commonBytes,'dragon committed',[row]);
  const b=child(t,directory,p);
  await Promise.all([a.next('staged'),b.next('staged')]);
  assert.equal(journal.read().state.revision,0);
  a.go();await a.next('published');
  assert.equal(journal.read().state.revision,1);
  b.go();assert.equal((await b.next('done')).mode,'conflict');
  a.go();assert.equal((await a.next('done')).mode,'published-candidate');
  await Promise.all([a.exit,b.exit]);
  const winner=journal.read().state;
  assert.deepEqual(winner.streets.alpha.ledgers,oracle.after.ledgers);
  assert.equal(winner.commonBytes,genesis.commonBytes);assert.equal(winner.payments.length,0);
  const retry=await journal.publish({...p,expectedRevision:1});
  assert.equal(retry.state.revision,2);assert.equal(retry.state.payments.length,1);
  assert.equal(retry.state.commonBytes,'dragon committed');
});
test('actual process kill before/after publication retains no partial common/consumer generation', {timeout:30000},async t=>{
  const {directory,journal}=fixture(t);
  const p=producer(0,'producer-crash','race-1',genesis.commonBytes,'new dragon state',[row]);
  const a=child(t,directory,p);await a.next('staged');a.kill();assert.equal((await a.exit).signal,'SIGKILL');
  assert.equal(journal.read().state.revision,0);assert.equal(journal.read().state.payments.length,0);
  const b=child(t,directory,p);await b.next('staged');b.go();await b.next('published');b.kill();assert.equal((await b.exit).signal,'SIGKILL');
  assert.equal(journal.read().state.commonBytes,'new dragon state');assert.equal(journal.read().state.payments.length,1);
  assert.equal((await journal.publish(p)).mode,'replay');
  const q=consume(1,'consume-crash','alpha');
  const c=child(t,directory,q);await c.next('staged');c.kill();await c.exit;
  assert.equal(journal.read().state.payments[0].consumedBy,null);assert.equal(journal.read().state.streets.alpha.shops[0].dragon,0);
  const d=child(t,directory,q);await d.next('staged');d.go();await d.next('published');d.kill();await d.exit;
  const loaded=journal.read().state;
  assert.equal(loaded.revision,2);assert.equal(loaded.streets.alpha.shops[0].dragon,500);
  assert.notEqual(loaded.payments[0].consumedBy,null);
  assert.equal((await journal.publish(q)).mode,'replay');assert.deepEqual(journal.read().state,loaded);
});
