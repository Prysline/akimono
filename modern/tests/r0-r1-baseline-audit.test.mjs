import test from 'node:test';
import assert from 'node:assert/strict';
import {checkAudit,loadAudit} from '../scripts/r0-r1-audit.mjs';
test('R0/R1 inventory matches actual tests, frozen source blobs and DSL declarations',async()=>{const m=await loadAudit();const r=await checkAudit(m);assert.equal(r.tests,m.tests.length);assert.equal(r.features,220);});
test('R0/R1 missing test row cannot pass inventory',async()=>{const m=await loadAudit();m.tests.pop();await assert.rejects(checkAudit(m),/missing or stale/);});
test('R0/R1 wrong source SHA is rejected',async()=>{const m=await loadAudit();m.frozen[0].sha='0'.repeat(40);await assert.rejects(checkAudit(m),/frozen manifest baseline mismatch/);});
test('R0/R1 fixture cannot be promoted to real player',async()=>{const m=await loadAudit();const row=m.tests.find(x=>x.evidenceLevel==='fixture');assert.ok(row);row.realPlayer=true;await assert.rejects(checkAudit(m),/fixture mislabeled/);});
test('R0/R1 scoped completion without linked player evidence fails',async()=>{const m=await loadAudit();const row=m.features.find(x=>x.status.startsWith('受控正式驗收'));assert.ok(row);row.evidence=[];await assert.rejects(checkAudit(m),/completed without player evidence/);});
