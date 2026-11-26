/** Necessary read-only HTTP/v2 integration, not formal C player acceptance. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';
test('R4 original warehouse and balance read models survive real local actions and both v2 generations',async t=>{
 const p=await genuinePlayer(t,{now:'896401',crossPeriod:true,fullCommerce:true});
 const row=id=>p.state.warehouse.rows.find(x=>x.itemId===id);
 assert.equal(p.state.balance.source,'r4-frozen-inc-info-independent.v1');
 assert.equal(p.state.balance.shelfMaintenance,0);
 assert.equal(p.state.balance.foundedLabel,'00秒');
 assert.equal(row(79).count,5);assert.equal(row(79).marketPrice,null);
 await p.use(79,0);assert.equal(p.stock(9),1);assert.equal(row(9).count,1);assert.equal(row(9).storage,true);
 await p.list(79);
 assert.equal(row(79).displayedStock,p.stock(79));assert.equal(row(79).marketPrice,10000);
 const before=structuredClone({warehouse:p.state.warehouse,balance:p.state.balance});
 const first=await p.saveAndRestart(0);
 assert.deepEqual({warehouse:p.state.warehouse,balance:p.state.balance},before);
 const denied=await p.post('/api/discard',{itemId:9,count:1,expectedRevision:first.revision-1});
 assert.equal(denied.ok,false);assert.deepEqual(p.state.world,first);
 assert.deepEqual({warehouse:p.state.warehouse,balance:p.state.balance},before);
 await p.discard(9);
 assert.equal(p.stock(9),0);assert.equal(row(9),undefined,'no stock, sales or EXP: original row no longer qualifies');
 assert.equal(row(79).marketPrice,10000);
 const after=structuredClone({warehouse:p.state.warehouse,balance:p.state.balance});
 const second=await p.saveAndRestart(1);
 assert.equal(second.revision,first.revision+1);
 assert.deepEqual({warehouse:p.state.warehouse,balance:p.state.balance},after);
});
