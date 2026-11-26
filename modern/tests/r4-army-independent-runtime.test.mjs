import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';
import {createIndependentArmyProjection} from '../src/original-r4-independent-army.mjs';
import {isReviewedOrdinaryCommand} from '../src/reviewed-ordinary-command-policy.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sources={armyViewSource:read('./original-perl/pinned-army-view.cgi'),
  armyCommandSource:read('./original-perl/pinned-army-s.cgi'),armyFileSource:read('./original-perl/pinned-army.cgi'),
  armyCalcSource:read('./original-perl/calc.cgi'),configSource:read('../../_config.cgi')};
const army=createIndependentArmyProjection(sources);
// Isolated adapter cases only. These assets are NOT player acquisition proof.
test('independent army adapter keeps original effects and over-cap soldiers after dignity decay',()=>{
  const world={schema:'akimono.memory-world.v2',revision:5,events:null,nowSeconds:1000000,
    shops:[{id:1,status:1,dignity:1,money:2500000,time:990000,paytoday:7}],
    period:{eventState:{'ken-sale':1005000},disk:{live:{}}}};
  const command={kind:'hire-army',expectedRevision:5,shopId:1,requestedCount:1200};
  const before=structuredClone(world);
  const result=army.apply(world,command);
  assert.equal(result.receipt.count,1000);assert.equal(result.receipt.cost,1000000);
  assert.equal(result.shops[0].money,1500000);assert.equal(result.shops[0].time,992400);
  assert.equal(result.shops[0].paytoday,7);assert.equal(result.armyBytes,'1,1000\n\n');
  assert.deepEqual(world,before);
  const decayed={...world,revision:6,shops:[{...result.shops[0],dignity:0}],
    period:{...world.period,disk:{live:{'army.cgi':{bytes:result.armyBytes,mtime:world.nowSeconds}}}}};
  assert.equal(army.describe(decayed).count,1000);assert.equal(army.describe(decayed).canHire,false);
  assert.throws(()=>army.apply(decayed,{...command,expectedRevision:6}),/dignity-capacity/);
  const fired=army.apply(decayed,{...command,kind:'fire-army',expectedRevision:6});
  assert.equal(fired.armyBytes,'\n\n');assert.equal(fired.shops[0].money,1500000);
  assert.equal(fired.shops[0].time,993000);
  assert.throws(()=>army.apply({...world,shops:[{...world.shops[0],time:999999}]},command),/facility time/);
  assert.throws(()=>army.apply(world,{...command,armyBytes:'1,1\n\n'}),/exact command/);
  assert.throws(()=>army.describe({...world,period:{...world.period,eventState:{rebel:1000100}}}),/rebel context/);
  for(const bytes of ['2,1\n\n','1,0\n\n','1,1\n1\n','1,1\n2\n']){
    assert.throws(()=>army.validate({...world,period:{...world.period,disk:{live:{'army.cgi':{bytes,mtime:world.nowSeconds}}}}}),/canonical/);
  }
  assert.equal(isReviewedOrdinaryCommand(command,{reviewedArmy:true}),true);
  assert.equal(isReviewedOrdinaryCommand({...command,randomDraws:[0]},{reviewedArmy:true}),false);
  assert.equal(isReviewedOrdinaryCommand(command,{reviewedArmy:false}),false);
});
test('genuine fresh HTTP player cannot hire/fire or inject army assets; save/restart preserves refusal',async t=>{
  const p=await genuinePlayer(t,{crossPeriod:true});
  assert.equal(p.state.army.count,0);assert.equal(p.state.army.maximum,0);
  assert.equal(p.state.army.canHire,false);assert.equal(p.state.army.canFire,false);
  await p.enoughTime(2400);
  const before=p.state.world,history=p.state.historyCommands;
  for(const [route,body] of [
    ['/api/army-hire',{}],['/api/army-fire',{}],
    ['/api/army-hire',{dignity:1}],['/api/army-hire',{armyBytes:'1,1\n\n'}],
    ['/api/army-hire',{unitPrice:0}],['/api/army-fire',{shopId:2}],
    ['/api/army-hire',{requestedCount:0}],['/api/army-hire',{expectedRevision:before.revision-1}]
  ]){
    const response=await p.post(route,{expectedRevision:before.revision,requestedCount:1,...body});
    assert.equal(response.ok,false);
    assert.deepEqual(p.state.world,before);assert.equal(p.state.historyCommands,history);
    assert.equal(Object.hasOwn(p.state.world.period.disk.live,'army.cgi'),false);
  }
  await p.saveAndRestart(0);
  assert.deepEqual(p.state.world,before);assert.equal(p.state.army.count,0);
  assert.equal(p.state.army.canHire,false);
});
