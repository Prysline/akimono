/** D62 controlled source read views using the existing D9 local HTTP authority. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';
test('D62 warehouse, market survey and shelf read views share committed D9 snapshot and survive both v2 generations',async t=>{
 const p=await genuinePlayer(t,{now:'896401',crossPeriod:true,marketCommerce:true});
 const view=()=>structuredClone({warehouse:p.state.warehouse,showcaseView:p.state.showcaseView});
 const row=id=>p.state.warehouse.rows.find(x=>x.itemId===id);
 assert.equal(p.state.warehouse.marketItems.length,79);
 assert.equal(row(79).count,5);assert.equal(row(63).count,1);
 assert.deepEqual(p.state.warehouse.survey,[]);
 assert.deepEqual(p.state.showcaseView.rows,[{shelf:0,itemId:0,taxRate:null,tax:null}]);
 assert.equal(p.state.itemCatalog.find(x=>x.itemId===79).scale,'枚');
 assert.equal(p.state.itemCatalog.find(x=>x.itemId===78).scale,'組');
 const before=view();const first=await p.saveAndRestart(0);assert.deepEqual(view(),before);
 const rejected=await p.post('/api/discard',{expectedRevision:first.revision-1,itemId:63,count:1});
 assert.equal(rejected.ok,false);assert.deepEqual(p.state.world,first);assert.deepEqual(view(),before);
 await p.discard(63);assert.equal(row(63),undefined);
 assert.equal(row(79).count,5);assert.equal(p.state.warehouse.marketItems.find(x=>x.itemId===63).count,0);
 const after=view();const second=await p.saveAndRestart(1);assert.equal(second.revision,first.revision+1);assert.deepEqual(view(),after);
});
