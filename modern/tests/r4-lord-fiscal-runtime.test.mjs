import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createIndependentLordProjection} from '../src/original-r4-independent-lord.mjs';
import {isReviewedOrdinaryCommand} from '../src/reviewed-ordinary-command-policy.mjs';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';
const read=p=>readFileSync(new URL('./original-perl/'+p,import.meta.url),'utf8');
const sources={lordViewSource:read('pinned-lord-f.cgi'),lordCommandSource:read('pinned-lord-s.cgi'),readSource:read('inc-func.cgi'),logSource:read('pinned-log.cgi')};
test('isolated fiscal command adapter preserves source effects and refuses drift (not player acquisition)',()=>{
  const lord=createIndependentLordProjection(sources);
  const w={revision:9,shops:[{id:1,status:1,name:'店主',shopname:'商店',money:100000,time:900000,taxmode:0}],
    period:{state:'source-reviewed-independent-settlement.v1',settledCount:1,
      town:{leader:1,money:5000,in:0,out:0,develop:5001,devem:0,safety:5001,safem:0,army:1000,robina:0,robinb:0,people:500000},
      eventState:{'ken-sale':1100000},disk:{source:'r4-independent-source-disk.v1',lordTaxRate:0}}};
  const before=structuredClone(w),c={kind:'lord-inside',expectedRevision:9,shopId:1,taxrate:'20',devem:'123',safem:'456'};
  const a=lord.apply(w,c);
  assert.deepEqual(w,before);assert.equal(a.lordTaxRate,20);assert.equal(a.period.town.money,5000);
  assert.equal(a.period.town.people,500000);assert.deepEqual(a.shops,w.shops);
  assert.equal(a.period.town.devem,123);assert.equal(a.period.town.safem,456);
  const side=lord.apply(w,{kind:'lord-tax-side',expectedRevision:9,shopId:1,targetShopId:1,mode:'double'});
  assert.equal(side.shops[0].taxmode,2);
  assert.deepEqual(side.receipt.originalLogCalls,[[2,0,'領主%1は%2の税率を倍にしました。','店主','商店']]);
  assert.equal(lord.apply(w,{kind:'lord-tax-reset',expectedRevision:9,shopId:1}).shops[0].taxmode,'');
  assert.equal(isReviewedOrdinaryCommand(c,{reviewedLordFiscal:true}),true);
  assert.equal(isReviewedOrdinaryCommand(c,{}),false);
  assert.equal(isReviewedOrdinaryCommand({...c,randomDraws:[0]},{reviewedLordFiscal:true}),false);
  assert.throws(()=>lord.apply(w,{...c,taxrate:'41'}),/taxrate/);
  assert.throws(()=>lord.apply(w,{...c,expectedRevision:8}),/revision/);
  assert.throws(()=>lord.apply({...w,period:{...w.period,town:{...w.period.town,leader:0}}},c),/current lord/);
  assert.throws(()=>createIndependentLordProjection({...sources,lordViewSource:sources.lordViewSource+' '}),/frozen source/);
});
test('fresh actual HTTP player cannot acquire fiscal authority; zero-rate save roundtrip',async t=>{
  const p=await genuinePlayer(t,{crossPeriod:true,rebelTime:true,fullCommerce:true,lordFiscal:true,now:null});
  assert.equal(p.state.reviewedLordFiscal,true);assert.equal(p.state.lord,null);
  const before=p.state.world,history=p.state.historyCommands;
  assert.equal(before.period.disk.lordTaxRate,0);
  for(const [route,body] of [
    ['/api/lord-inside',{taxrate:'20',devem:'0',safem:'0'}],
    ['/api/lord-tax-side',{targetShopId:1,mode:'free'}],
    ['/api/lord-tax-reset',{}],
    ['/api/lord-inside',{taxrate:'20',devem:'0',safem:'0',leader:1}]
  ]){
    const response=await p.post(route,{expectedRevision:before.revision,...body});
    assert.equal(response.ok,false);assert.deepEqual(p.state.world,before);assert.equal(p.state.historyCommands,history);
  }
  await p.tick(1);const prior=p.state.world;
  assert.deepEqual(await p.saveAndRestart(0),prior);
  assert.equal(p.state.lord,null);assert.equal(p.state.world.period.disk.lordTaxRate,0);
});
