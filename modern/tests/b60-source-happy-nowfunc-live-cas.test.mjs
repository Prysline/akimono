import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path,{join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {createMemoryWorldAdapter,createPeriodMemoryWorld,
  applyGameCommand,executeMemoryCommand} from '../src/game-core-contract.mjs';
import {reviewOriginalPeriodBootstrap,createOriginalPeriodSeed}
  from '../src/original-period-world-seed.mjs';
import {projectB41Sale} from '../src/original-b41-playable-sale.mjs';
import {createLocalWorldSaveStore} from '../src/local-world-save-store.mjs';
import {sourceCommandDraws} from '../src/local-source-command-draws.mjs';
import {reviewOriginalB60HappyEvent,projectOriginalHappyStart,
  projectOriginalHappyExpiry,projectOriginalHappyNow,
  isReviewedB60HappyPeriod,B60_HAPPY_SOURCE,B60_HAPPY_CODE}
  from '../src/original-b60-happy-event-nowfunc.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFile(join(root,p),'utf8');
const names=[
  'itemDsl','rebelDsl','originalAdminInitSource','originalDataReadSource',
  'originalDataWriteSource','originalTurnSource','originalWholeSource',
  'originalConfigSource','originalCompilerSource',
  'originalBuySource','originalBuyItemSource','originalBuyCalcSource',
  'originalMarketSource','originalItemSource','originalDetailSource',
  'originalPeriodSource',
];
const files=[
  'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
  'modern/tests/original-perl/core-inc-admin-func.cgi',
  'modern/tests/original-perl/inc-func.cgi',
  'modern/tests/original-perl/write.cgi',
  'modern/tests/original-perl/inc-turn.cgi',
  'modern/tests/original-perl/whole.cgi','_config.cgi',
  'modern/tests/original-perl/inc-makeitem.cgi',
  'modern/tests/original-perl/buy-s.cgi',
  'modern/tests/original-perl/item.cgi',
  'modern/tests/original-perl/calc.cgi',
  'modern/tests/original-perl/market.cgi',
  'modern/tests/original-perl/item.cgi',
  'modern/tests/original-perl/core-detail.cgi',
  'modern/tests/original-perl/period.cgi',
];
const list=await Promise.all(files.map(read));
const src=Object.fromEntries(names.map((k,i)=>[k,list[i]]));
const street=createStandardStreetModule(src);
const perlDir=join(root,'modern/tests/original-perl');
const original=JSON.parse(execFileSync('perl',[
  'original-b60-happy-event-probe.pl',
],{cwd:perlDir,encoding:'utf8'}));
const supply=JSON.parse(execFileSync('perl',[
  'original-market-buy10-probe.pl',
],{cwd:perlDir,encoding:'utf8'})).supply;
const reviewed=street.reviewedB60Happy;
const order=street.reviewedEventCatalog.compiled.map(x=>x.code).toReversed();

function seedPeriod(){
  const reviewed=reviewOriginalPeriodBootstrap({
    periodSource:src.originalPeriodSource,
    adminSource:src.originalAdminInitSource,
    readSource:src.originalDataReadSource,
    writeSource:src.originalDataWriteSource,
    reviewedB41:street.reviewedB41,
  });
  return createOriginalPeriodSeed(reviewed);
}
function openRealShop(){
  const adapter=createMemoryWorldAdapter(createPeriodMemoryWorld({
    worldId:'b60-source-happy-live-real-shop',
    streetId:'standard-street',nowSeconds:897400,
    period:seedPeriod(),
  }));
  const act=(kind,fields={})=>executeMemoryCommand({
    repository:adapter,streetModule:street,
    command:{kind,expectedRevision:adapter.read().revision,...fields},
  });
  assert.equal(act('initialize-source-market').ok,true);
  assert.equal(act('open-shop',{
    shopId:1,ownerName:'實際商店店主',shopName:'B60 原版感謝祭商店',
  }).ok,true);
  assert.equal(act('reviewed-sparse-all-plus',{
    timespanSeconds:60,randomDraws:supply.draws,
  }).ok,true);
  const quote=street.quoteMarketItem10(adapter.read());
  assert.equal(act('buy-market-item-10',{
    shopId:1,requestedCount:1,marketShelf:quote.shelf,
    expectedPrice:quote.price,
  }).ok,true);
  assert.equal(act('edit-showcase',{
    shopId:1,shelf:0,itemId:10,per:100,priceOverride:5000,
  }).ok,true);
  return {adapter,act};
}
function saleDraws(world,minutes){
  const sourceSamples=sourceCommandDraws({
    world,kind:'advance-source-time',args:{shopId:1,minutes},
    count:121,
  });
  for(let n=1;n<=sourceSamples.length;n++){
    const samples=sourceSamples.slice(0,n);
    try{
      projectB41Sale({
        world,reviewed:street.reviewedB41,
        reviewedAllPlus:street.reviewedAllPlus,
        compiled:street.reviewedGiftMapUse,
        shopId:1,minutes,randomDraws:samples,
        reviewedB59Iron:street.reviewedB59Iron,
        reviewedB60Happy:reviewed,
        reviewedB61Sword:street.reviewedB61Sword,
        reviewedEventTimeSlice:true,
      });
      return samples;
    }catch(error){
      if(error.message.includes('crosses original period settlement'))
        throw error;
    }
  }
  throw new Error('B-60 failed to find exact original sale/PLUS sample prefix');
}
function fixtureEventDraws(world,minutes,{
  startHappy=false,startIron=false,other=null,nowDraw=900000,
  durationDraws=[0,0],
}={}){
  const map=world.period.eventState;
  const durationEnd=world.nowSeconds+minutes*60;
  const alreadyHappy=Object.hasOwn(map,B60_HAPPY_CODE)&&
    map[B60_HAPPY_CODE]>=durationEnd;
  const alreadyIron=Object.hasOwn(map,'plusup-tetu')&&
    map['plusup-tetu']>=durationEnd;
  const result=[];
  for(const code of order){
    if((code===B60_HAPPY_CODE&&alreadyHappy)||
       (code==='plusup-tetu'&&alreadyIron))continue;
    const triggering=(code===B60_HAPPY_CODE&&startHappy)||
      (code==='plusup-tetu'&&startIron)||code===other;
    result.push(triggering?0:999999);
    if(code===B60_HAPPY_CODE&&triggering)
      result.push(...durationDraws);
    if(code==='plusup-tetu'&&triggering)
      result.push(0,0);
  }
  if(alreadyHappy||startHappy)result.push(nowDraw);
  return result;
}
function slice(adapter,minutes,opts={}){
  const world=adapter.read();
  return executeMemoryCommand({
    repository:adapter,streetModule:street,
    command:{kind:'advance-source-time-reviewed-events',
      expectedRevision:world.revision,shopId:1,minutes,
      saleDraws:saleDraws(world,minutes),
      eventDraws:fixtureEventDraws(world,minutes,opts),
      eventHashOrderFixture:order},
  });
}

test('B-60 original frozen Perl end/start/NOWFUNC output matches JS ranks, duration and real source rand range',()=>{
  assert.equal(reviewed.source,B60_HAPPY_SOURCE);
  assert.equal(street.reviewedB56.happy,B60_HAPPY_SOURCE);
  assert.equal(reviewed.publicGameplay,false);
  assert.equal(original.runtimeCompiledNowFunc,'_local_now');
  assert.equal(original.cases.length,9);
  for(const c of original.cases){
    const {input,output}=c;
    const initialEventState=input.activeUntilSeconds===null?{}:
      {[B60_HAPPY_CODE]:input.activeUntilSeconds};
    const life=projectOriginalHappyExpiry({
      reviewed,eventState:initialEventState,
      startSeconds:input.nowSeconds,spanSeconds:input.timespanSeconds,
    });
    const gateIsEntered=output.logs.some(x=>x[2]===reviewed.startMessage);
    const start=gateIsEntered?projectOriginalHappyStart({
      reviewed,startSeconds:input.nowSeconds,
      spanSeconds:input.timespanSeconds,
      randomDraws:input.randomDraws.slice(
        life.occupied?0:1,life.occupied?2:3),
    }):null;
    const actualState=start?{happy:start.expiresAtSeconds}:
      life.remainingEventState;
    assert.deepEqual(actualState,output.activeState,c.name+' original active state');
    const hadNow=Object.hasOwn(actualState,'happy');
    if(hadNow){
      const shop={id:1,status:1,rank:input.rank};
      const effect=projectOriginalHappyNow({
        reviewed,shop,timespanSeconds:input.timespanSeconds,
        randomDraws:[input.randomDraws.at(-1)],
      });
      assert.equal(effect.shop.rank,output.rank,c.name+' final rank');
      assert.equal(effect.rankGain,output.rankGain,c.name+' rank addition');
      assert.equal(effect.randMax,output.drawRanges.at(-1),c.name+' rand(time)');
      assert.equal(effect.message,null,'source NOWFUNC return code 0');
    }else{
      assert.equal(output.rank,input.rank);
      assert.equal(output.rankGain,0);
    }
  }
});
test('B-60 full original NOWFUNC DSL/Perl source body is strictly guarded; malformed random or world is rejected',()=>{
  const args={
    itemDsl:src.itemDsl,turnSource:src.originalTurnSource,
    compilerSource:src.originalCompilerSource,
    readSource:src.originalDataReadSource,
    compiledCatalog:street.reviewedEventCatalog,
  };
  for(const changed of [
    {itemDsl:src.itemDsl.replace(
      '$time=int($time/36);','$time=int($time/35);')},
    {itemDsl:src.itemDsl.replace(
      '$_->{rank}+=int(rand($time));','$_->{rank}+=int(rand(123));')},
    {itemDsl:src.itemDsl.replace(
      '$time=10*3600 if $time>10*3600;',
      '$time=11*3600 if $time>10*3600;')},
    {turnSource:src.originalTurnSource.replace(
      'my($msg)=&$func(split(/[:,]/,$E->{funcparam}));',
      'my($msg)=&$other(split(/[:,]/,$E->{funcparam}));')},
    {compiledCatalog:{...street.reviewedEventCatalog,
      compiled:street.reviewedEventCatalog.compiled.map(e=>
        e.code==='happy'?{...e,startProba:101}:e)}},
  ])
    assert.throws(()=>reviewOriginalB60HappyEvent({...args,...changed}),/B-60/);
  const shop={id:1,status:1,rank:9999};
  for(const bad of [
    {randomDraws:[]},{randomDraws:[1000000]},
    {randomDraws:[-1]},{randomDraws:[0,0]},
    {timespanSeconds:0},{timespanSeconds:3601},
    {shop:{...shop,rank:10001}},
    {reviewed:{...reviewed,rankCap:9999}},
  ]){
    assert.throws(()=>projectOriginalHappyNow({
      reviewed,shop,timespanSeconds:1800,
      randomDraws:[900000],...bad,
    }),/B-60/);
  }
  assert.equal(projectOriginalHappyNow({
    reviewed,shop,timespanSeconds:1800,
    randomDraws:[900000],
  }).shop.rank,10000,'actual source NOWFUNC rank cap 10000');
});
test('B-60 true market/shop CAS: festival starts and increases rank in SAME source turn, saves, reloads, persists, equality expiry then ends',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'akimono-b60-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  const {adapter}=openRealShop(),initial=adapter.read();
  const saleBaseline=projectB41Sale({
    world:initial,reviewed:street.reviewedB41,
    reviewedAllPlus:street.reviewedAllPlus,
    compiled:street.reviewedGiftMapUse,
    shopId:1,minutes:30,randomDraws:saleDraws(initial,30),
    reviewedB59Iron:street.reviewedB59Iron,
    reviewedB60Happy:reviewed,reviewedB61Sword:street.reviewedB61Sword,
    reviewedEventTimeSlice:true,
  });
  const started=slice(adapter,30,{startHappy:true});
  assert.ok(started.ok,JSON.stringify(started.details));
  assert.equal(started.world.revision,initial.revision+1);
  assert.equal(started.world.period.eventState.happy,initial.nowSeconds+18000,
    'source starts 5h festival exactly without moving its start before PLUS');
  assert.equal(started.details.festivalWasActiveAtDataRead,false);
  assert.equal(started.details.festivalNowRun,true);
  assert.equal(started.details.festivalRankGain,45);
  assert.equal(started.details.festivalRandomMax,50);
  assert.equal(started.world.shops[0].rank,
    Math.min(10000,saleBaseline.shops[0].rank+45));
  assert.equal(started.details.eventDrawsUsed,20,
    '17 original event gates + two duration rand + new NOWFUNC rand');
  assert.deepEqual(started.details.eventLogEmissions,[
    {eventCode:'happy',level:2,shopId:0,message:reviewed.startMessage},
  ]);
  assert.deepEqual(started.world.market,saleBaseline.market,
    'same start turn NOWFUNC cannot retrospectively change preceding PLUS');
  assert.equal(started.details.eventStateConfirmedEmpty,false);

  const disk=createLocalWorldSaveStore({directory:dir});
  disk.save(adapter.read(),{expectedGeneration:0});
  assert.deepEqual(disk.load().world,started.world);
  const recovered=createMemoryWorldAdapter(disk.load().world);
  const known=recovered.read();
  const oldPlayer=applyGameCommand({
    world:known,streetModule:street,
    command:{kind:'advance-source-time',expectedRevision:known.revision,
      shopId:1,minutes:30,randomDraws:saleDraws(known,30)},
  });
  assert.equal(oldPlayer.ok,false,'legacy B-41 cannot omit active festival NOWFUNC');
  const isolated=executeMemoryCommand({
    repository:recovered,streetModule:street,
    command:{kind:'reviewed-sparse-all-plus',
      expectedRevision:known.revision,timespanSeconds:60,
      randomDraws:supply.draws},
  });
  assert.equal(isolated.ok,false,
    'standalone source wholesale cannot bypass persistent NOWFUNC');
  assert.equal(isolated.code,'SOURCE_BOUNDARY_REJECTED');
  assert.deepEqual(recovered.read(),known);

  const next=slice(recovered,30,{nowDraw:800000});
  assert.ok(next.ok,JSON.stringify(next.details));
  assert.equal(next.details.festivalWasActiveAtDataRead,true);
  assert.equal(next.details.festivalNowRun,true);
  assert.equal(next.details.festivalRankGain,40);
  assert.equal(next.details.eventDrawsUsed,17,
    '16 other event gates + one NOWFUNC rand, no repeated happy gate');
  assert.equal(next.world.period.eventState.happy,
    started.world.period.eventState.happy);
  assert.equal(next.details.eventStarts.includes('happy'),false);

  // Four more 1h slices = 5h after original activation.
  let latest=next;
  for(let i=0;i<4;i++){
    latest=slice(recovered,60,{nowDraw:999999});
    assert.ok(latest.ok,JSON.stringify({i,details:latest.details}));
    assert.equal(latest.details.festivalEventExpired,false);
    assert.equal(latest.details.festivalNowRun,true);
    assert.equal(latest.details.festivalRandomMax,100);
    assert.equal(latest.world.period.eventState.happy,
      started.world.period.eventState.happy);
  }
  assert.equal(latest.world.nowSeconds,
    started.world.period.eventState.happy,
    'original strict end equality: festival still occupies group');
  const expired=slice(recovered,30);
  assert.ok(expired.ok,JSON.stringify(expired.details));
  assert.equal(expired.details.festivalEventExpired,true);
  assert.equal(expired.details.festivalWasActiveAtDataRead,true);
  assert.equal(expired.details.festivalNowRun,false,
    'expired before NOWFUNC in original event ordering');
  assert.equal(expired.details.festivalRankGain,0);
  assert.equal(expired.details.eventDrawsUsed,17,
    'after expiry all 17 gates are tested, no nowfunc rand');
  assert.deepEqual(expired.world.period.eventState,{});
  assert.deepEqual(expired.details.eventLogEmissions,[
    {eventCode:'happy',level:2,shopId:0,message:reviewed.endMessage},
  ]);
  const fresh=slice(recovered,30,{startHappy:true,nowDraw:900000});
  assert.ok(fresh.ok,JSON.stringify(fresh.details));
  assert.equal(fresh.details.festivalNowRun,true);
  assert.equal(fresh.details.festivalRankGain,45);
  assert.equal(fresh.world.period.eventState.happy,
    expired.world.nowSeconds+18000);
  disk.save(recovered.read(),{expectedGeneration:1});
  assert.deepEqual(disk.load().world,fresh.world);
});
test('B-60 unknown/multiple EVENT, missing/misordered NOWFUNC draw, unsupported start and revision mismatch are atomically rejected',()=>{
  const {adapter}=openRealShop();
  const world=adapter.read();
  const baselineSale=saleDraws(world,30);
  const valid=fixtureEventDraws(world,30,{startHappy:true});
  const run=(w,options={})=>applyGameCommand({
    world:w,streetModule:street,
    command:{kind:'advance-source-time-reviewed-events',
      expectedRevision:w.revision,shopId:1,minutes:30,
      saleDraws:baselineSale,eventDraws:valid,
      eventHashOrderFixture:order,...options},
  });
  for(const changed of [
    {eventDraws:valid.slice(0,-1)},
    {eventDraws:[...valid,0]},
    {eventDraws:valid.map((x,i)=>i===valid.length-1?
      {range:6096454,result:0}:x)},
    {eventDraws:valid.map((x,i)=>i===valid.length-1?-1:x)},
    {eventDraws:fixtureEventDraws(world,30,{
      startHappy:true,startIron:true,
    })},
    {eventDraws:fixtureEventDraws(world,30,{other:'ken-sale'})},
    {eventHashOrderFixture:order.slice(0,-1)},
  ]){
    const r=run(world,changed);
    assert.equal(r.ok,false,JSON.stringify(changed).slice(0,500));
    assert.equal(r.code,'SOURCE_BOUNDARY_REJECTED');
    assert.deepEqual(adapter.read(),world);
  }
  for(const value of [
    {happy:12000,'plusup-tetu':13000},
    {happy:-1},{happy:1.5},{'not-a-real-event':12000},
  ]){
    const corrupt={...world,period:{
      ...world.period,eventState:value,
    }};
    assert.equal(isReviewedB60HappyPeriod({
      period:corrupt.period,reviewed,nowSeconds:corrupt.nowSeconds,
    }),false);
    try{
      const r=run(corrupt);
      assert.equal(r.ok,false);
      assert.equal(r.code,'SOURCE_BOUNDARY_REJECTED');
    }catch(error){
      // An invalid scalar (fractional expiry) can be rejected by GameCore
      // snapshot validation before the reviewed StreetModule is reached.
      assert.match(error.message,/B-31 contract: WorldState/);
    }
    assert.deepEqual(adapter.read(),world);
  }
  const stale=run(world,{expectedRevision:world.revision+1});
  assert.equal(stale.code,'REVISION_CONFLICT');
  assert.deepEqual(adapter.read(),world);
});
