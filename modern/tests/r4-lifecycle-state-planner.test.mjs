import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';
import {normalizeLocalSourceText} from '../src/local-source-text.mjs';
import {createIndependentDiskProjection} from '../src/original-r4-independent-world-disk.mjs';
import {reviewOriginalSoloSort} from '../src/original-period-solo-sort.mjs';
import {createLifecycleStatePlanner} from '../src/reviewed-shop-lifecycle-command.mjs';
import {applyGameCommand} from '../src/game-core-contract.mjs';
const read=p=>normalizeLocalSourceText(readFileSync(new URL(p,import.meta.url),'utf8'));
const sourceTexts={membership:read('./original-perl/pinned-membership-user.cgi'),form:read('./original-perl/pinned-other.cgi'),compiler:read('./original-perl/inc-makeitem.cgi'),dsl:read('../../custom/inc-item-data.cgi'),core:read('./original-perl/inc-func.cgi'),writer:read('./original-perl/write.cgi'),subdata:read('./original-perl/pinned-user.cgi')};
const localeSources={coreLocaleSource:read('./original-perl/pinned-core-zh_TW.po'),localLocaleSource:read('../../locale/zh_TW.po'),localeLoaderSource:read('../../custom/inc-locale.cgi')};
const sources={sourceTexts,localeSources,detailSource:read('./original-perl/core-detail.cgi'),configSource:read('../../_config.cgi'),turnSource:read('./original-perl/inc-turn.cgi'),errorSource:read('./original-perl/pinned-error.cgi'),newSource:read('./original-perl/new.cgi')};
const diskSources={...sources,writeSource:sourceTexts.writer,readSource:sourceTexts.core,
  customSource:read('./original-perl/pinned-custom.cgi'),periodSource:read('./original-perl/period.cgi'),
  logSource:read('./original-perl/pinned-log.cgi'),itemDsl:sourceTexts.dsl};
const sort=reviewOriginalSoloSort({detailSource:sources.detailSource,readSource:sourceTexts.core});
const disk=createIndependentDiskProjection({sources:diskSources,sort,street:{}});
test('LC-D1/D2 state planner composes actual v2 HTTP world disk, owner preflight, restart/close and header without publication',async t=>{
  const player=await genuinePlayer(t,{crossPeriod:true,marketCommerce:true});
  // Actual ordinary HTTP time commands, not edited age, RNG or world.
  for(let i=0;i<4;i++)await player.tick(60);
  let world=player.state.world;
  const before=structuredClone(world),history=player.state.historyCommands;
  const shop=world.shops[0],binding={worldId:world.worldId,streetId:world.streetId,shopId:shop.id,ownerName:shop.name,revision:world.revision};
  // Authentication and subdata context are explicitly controlled, not a
  // claim that this local HTTP adapter has a real account/session store.
  const options={readWorld:()=>world,resolveAuthenticatedActor:()=>binding,
    readReviewedLifecycleHeader:disk.readLifecycleHeader,readSubdataNames:()=>['1-alpha.cgi','10-keep.cgi'],
    readArchiveContext:actor=>({scriptName:'/membership/user.cgi',remoteAddress:'192.0.2.5',remoteHost:'',trueIp:'192.0.2.5',user:actor.ownerName}),sources};
  const plan=createLifecycleStatePlanner(options);
  const input={kind:'restart-shop',body:{expectedRevision:world.revision,confirmation:'restart'},request:{}};
  const restart=await plan(input);
  assert.equal(restart.effect.shop.id,shop.id);
  assert.equal(restart.effect.shop.money,100000);
  assert.equal(restart.effect.shop.foundation,world.nowSeconds);
  assert.equal(restart.headerEffect.canonicalReloadHeader.nextid,100);
  assert.deepEqual(restart.headerEffect.canonicalReloadHeader,disk.readLifecycleHeader(world));
  assert.deepEqual(restart.effect.subdataDeletionSelection,['1-alpha.cgi']);
  const close=await plan({...input,kind:'close-shop',body:{expectedRevision:world.revision,confirmation:'closeshop'}});
  assert.deepEqual(close.effect.activeShops,[]);
  assert.equal(close.headerEffect.canonicalReloadHeader.blockip,shop.remoteaddr);
  assert.ok(close.effect.archiveGeneration.live.bytes.includes('自行關店'));
  for(const c of [restart,close]){
    assert.equal(c.committable,false);assert.equal(c.worldStateWritten,false);
    const denied=applyGameCommand({world,command:{kind:c.prepared.command.kind,expectedRevision:world.revision},
      streetModule:{id:world.streetId,capabilities:[c.prepared.command.kind],apply:()=>({shops:c.effect.activeShops??[c.effect.shop],receipt:c,committable:c.committable})}});
    assert.equal(denied.code,'SOURCE_BOUNDARY_REJECTED');assert.deepEqual(denied.world,before);
  }
  assert.deepEqual(world,before);
  await assert.rejects(plan({...input,body:{...input.body,header:{nextid:1}}}),/exact request/);
  const bad=structuredClone(world);
  bad.period.disk.live['play.cgi'].bytes=bad.period.disk.live['play.cgi'].bytes.replace(',100,,0,',',101,,0,');
  assert.notEqual(bad.period.disk.live['play.cgi'].bytes,world.period.disk.live['play.cgi'].bytes);
  world=bad;
  await assert.rejects(plan(input),/live source bytes differ/);
  world=before;
  const race=createLifecycleStatePlanner({...options,readSubdataNames:()=>{world={...world,nowSeconds:world.nowSeconds+1};return [];}});
  await assert.rejects(race(input),/world changed during source planning/);
  world=before;
  assert.deepEqual(await player.saveAndRestart(0),before);
  assert.equal(player.state.historyCommands,history);
});
