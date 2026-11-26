import test from 'node:test';
import assert from 'node:assert/strict';
import {checkAudit,loadAudit} from '../scripts/r0-r1-audit.mjs';
test('R0/R1 inventory matches actual tests, frozen source blobs and DSL declarations',async()=>{const m=await loadAudit();const r=await checkAudit(m);assert.equal(r.tests,m.tests.length);assert.equal(r.features,220);});
test('R0/R1 missing test row cannot pass inventory',async()=>{const m=await loadAudit();m.tests.pop();await assert.rejects(checkAudit(m),/missing or stale/);});
test('R0/R1 wrong source SHA is rejected',async()=>{const m=await loadAudit();m.frozen[0].sha='0'.repeat(40);await assert.rejects(checkAudit(m),/frozen manifest baseline mismatch/);});
test('R0/R1 fixture cannot be promoted to real player',async()=>{const m=await loadAudit();const row=m.tests.find(x=>x.evidenceLevel==='fixture');assert.ok(row);row.realPlayer=true;await assert.rejects(checkAudit(m),/fixture mislabeled/);});
test('R0/R1 scoped completion without linked player evidence fails',async()=>{const m=await loadAudit();const row=m.features.find(x=>x.status.startsWith('受控正式驗收'));assert.ok(row);row.evidence=[];await assert.rejects(checkAudit(m),/completed without player evidence/);});

import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';
import {auditFormalRegistry} from '../scripts/r1-formal-registry-audit.mjs';
test('R1 exact formal source Registry audit separates declarations, registration and player proof',async t=>{
 const m=await loadAudit(),r=await auditFormalRegistry(m);
 assert.equal(r.marketEntries,79);assert.equal(r.rows.length,220);
 assert.equal(r.zero13,true);assert.equal(r.market63,null);
 for(const row of r.rows){const f=m.features.find(x=>x.kind===row.kind&&x.id===row.id);if(f.registered!==null)assert.equal(row.registered,f.registered,row.kind+' '+row.id);if(f.kind==='EVENT')assert.equal(row.compiled,f.compiled,f.id);}
 for(const k of ['initialize-source-market','open-shop','market-buy','use-item','edit-showcase','advance-reviewed-world-time'])assert.ok(r.capabilities.includes(k),k);
 t.diagnostic('R1_REGISTRY '+JSON.stringify({capabilities:r.capabilities,rows:r.rows.map(({kind,id,compiled,registered,classification})=>({kind,id,compiled,registered,classification}))}));
});
test('R1 live HTTP rejects unauthorized fields, stale/invalid revisions and old capabilities without committing; canonical v2 restart',async t=>{
 const p=await genuinePlayer(t,{now:null,crossPeriod:true});
 const before=structuredClone(p.state.world),history=p.state.historyCommands,checkpoint=p.state.historyCheckpointRevision,gen=p.state.save.generation,rev=before.revision;
 const buy={itemId:13,requestedCount:1,marketShelf:0,expectedPrice:0,expectedRevision:rev};
 const use={itemId:79,useId:0,requestedCount:1,expectedRevision:rev};
 for(const [route,body] of [
   ['/api/buy',{...buy,shopId:2}],['/api/buy',{...buy,expectedRevision:-1}],['/api/buy',{...buy,expectedRevision:rev-1}],
   ['/api/use',{...use,randomDraws:[0]}],['/api/use',{...use,targetShopId:2}],['/api/use',{...use,expectedRevision:1.25}],
   ['/api/advance-reviewed-time',{minutes:1,expectedRevision:rev,nowSeconds:1}],['/api/advance-reviewed-time',{minutes:1,expectedRevision:rev-1}],
   ['/api/discard',{itemId:63,count:1,expectedRevision:rev,money:999999}],
   ['/api/showcase',{itemId:63,per:100,shelf:0,expectedRevision:rev}],
   ['/api/showcase',{itemId:0,per:100,shelf:0,expectedRevision:rev,shopId:2}],
   ['/api/supply',{expectedRevision:rev}],['/api/advance-time',{minutes:1,expectedRevision:rev}],
   ['/api/save',{expectedRevision:rev,expectedGeneration:gen,careerProof:{}}]
 ]){const denied=await p.post(route,body);assert.equal(denied.ok,false,route);assert.ok(denied.state,route+' authoritative response');assert.deepEqual(p.state.world,before,route);assert.equal(p.state.historyCommands,history,route);assert.equal(p.state.historyCheckpointRevision,checkpoint,route);assert.equal(p.state.save.generation,gen,route);}
 await p.enoughTime(p.state.showcaseEditTimeSeconds??600);
 const r=await p.post('/api/showcase',{expectedRevision:p.state.world.revision,itemId:0,per:100,shelf:0});
 assert.equal(r.code,'COMMITTED');assert.equal(p.state.shop.showcase[0],0);
 const snapshot=await p.saveAndRestart(gen);assert.deepEqual(p.state.world,snapshot);
});
