import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reviewOriginalPalaceRules,describeOriginalPalace,projectOriginalPalaceMission,PALACE_COMMAND} from '../src/original-r4-palace-mission.mjs';
import {reviewTownFiles} from '../src/original-r4-town-files.mjs';
import {normalizeLocalSourceText} from '../src/local-source-text.mjs';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';
const read=p=>normalizeLocalSourceText(readFileSync(new URL(p,import.meta.url),'utf8'));
const sources={viewSource:read('./original-perl/pinned-palace.cgi'),handlerSource:read('./original-perl/pinned-palace-s.cgi'),
 configSource:read('../../custom/inc-palace.cgi'),readSource:read('./original-perl/inc-func.cgi')};
const reviewed=reviewOriginalPalaceRules(sources);
const townReview=reviewTownFiles({custom:read('./original-perl/pinned-custom.cgi'),read:sources.readSource,write:read('./original-perl/write.cgi')});
const args={reviewed,townReview};
const command={kind:PALACE_COMMAND,expectedRevision:1,shopId:1};
function fixture(index,owned,rank=10000){
  const task=reviewed.tasks[index],item=Array(79).fill(0);item[task.itemId-1]=owned;
  return {schema:'akimono.memory-world.v2',worldId:'isolated-palace-source',revision:1,nowSeconds:1000000,events:null,
    shops:[{id:1,status:1,item,dignity:0,rank,profitstock:500000,saletoday:0,taxtoday:0,paytoday:0,rankingcount:0,point:999999}],
    period:{disk:{townData:index?{evt:String(index)}:{}}}};
}
test('Palace source review, six configurations and isolated deductions (not player acquisition)',()=>{
  assert.deepEqual(reviewed.tasks.map(x=>[x.itemId,x.count]),[[57,300],[68,50],[31,2000],[41,200],[53,200],[47,200]]);
  for(const name of Object.keys(sources))assert.throws(()=>reviewOriginalPalaceRules({...sources,[name]:sources[name]+' '}),/source drift/);
  for(const task of reviewed.tasks){
    const world=fixture(task.index,task.count+1),before=structuredClone(world);
    const input={...args,world,command};
    const result=projectOriginalPalaceMission(input);
    assert.deepEqual(world,before);
    assert.equal(result.shops[0].item[task.itemId-1],1);
    assert.equal(result.shops[0].dignity,1);
    assert.equal(result.receipt.consumedCount,task.count);
    assert.equal(result.town.evt,String(result.receipt.nextMissionIndex));
    assert.deepEqual(projectOriginalPalaceMission(input),result,'repeatable server draw');
    assert.throws(()=>projectOriginalPalaceMission({...input,world:fixture(task.index,task.count-1)}),/inventory insufficient/);
  }
});
test('Palace source projection refuses stale point, invalid evt and client fields',()=>{
  const world=fixture(0,300,1);
  assert.equal(describeOriginalPalace({...args,world}).point,4);
  assert.throws(()=>projectOriginalPalaceMission({...args,world,command}),/20000/);
  const eligible=fixture(0,300);
  for(const townData of [{evt:'6'},{evt:0},{evt:'00'},{dominion:'g'}])
    assert.throws(()=>describeOriginalPalace({...args,world:{...eligible,period:{disk:{townData}}}}),/town wire/);
  for(const extra of [{randomDraws:[0]},{point:20000},{evt:0},{itemId:57},{dignity:1}])
    assert.throws(()=>projectOriginalPalaceMission({...args,world:eligible,command:{...command,...extra}}),/exact source command/);
});
test('Genuine P3 HTTP player: palace rejects early audience and client injection; empty evt survives save and restart',async t=>{
  const p=await genuinePlayer(t,{crossPeriod:true});
  assert.ok(p.state.palace);
  assert.equal(p.state.palace.index,0);
  assert.equal(p.state.palace.canMeet,false);
  assert.equal(p.state.palace.itemId,57);
  assert.equal(p.state.palace.count,300);
  const before=p.state.world;
  assert.deepEqual(before.period.disk.townData,{});
  assert.equal(before.period.disk.live['play.cgi'].bytes.split('\n')[4],'');
  const history=p.state.historyCommands;
  const denied=await p.post('/api/palace-complete',{expectedRevision:before.revision});
  assert.equal(denied.ok,false);
  assert.match(denied.details.reason,/20000/);
  assert.deepEqual(p.state.world,before);
  assert.equal(p.state.historyCommands,history);
  for(const extra of [{point:20000},{evt:0},{itemId:57},{dignity:1},{randomDraws:[0]}]){
    const r=await p.post('/api/palace-complete',{expectedRevision:before.revision,...extra});
    assert.equal(r.ok,false);
    assert.deepEqual(p.state.world,before);
    assert.equal(p.state.historyCommands,history);
  }
  await p.saveAndRestart(0);
  assert.deepEqual(p.state.world,before);
  assert.equal(p.state.palace.canMeet,false);
});
