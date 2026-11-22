import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path,{join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {createMemoryWorldAdapter,createPeriodMemoryWorld,
  applyGameCommand,executeMemoryCommand} from '../src/game-core-contract.mjs';
import {createLocalWorldSaveStore} from '../src/local-world-save-store.mjs';
import {reviewOriginalPeriodBootstrap,createOriginalPeriodSeed}
  from '../src/original-period-world-seed.mjs';
import {sourceCommandDraws} from '../src/local-source-command-draws.mjs';
import {projectB41Sale} from '../src/original-b41-playable-sale.mjs';
import {reviewOriginalB61SwordDemand,projectOriginalSwordStart,
  projectOriginalSwordExpiry,projectOriginalSwordDemand,
  isReviewedB61SwordPeriod,B61_SWORD_SOURCE,B61_SWORD_CODE}
  from '../src/original-b61-sword-demand-event.mjs';

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
const rows=await Promise.all(files.map(read));
const src=Object.fromEntries(names.map((k,i)=>[k,rows[i]]));
const street=createStandardStreetModule(src);
const reviewed=street.reviewedB61Sword;
const order=street.reviewedEventCatalog.compiled.map(x=>x.code).toReversed();
const perlDir=join(root,'modern/tests/original-perl');
const oracle=JSON.parse(execFileSync('perl',[
  'original-b61-sword-demand-probe.pl',
],{cwd:perlDir,encoding:'utf8'}));
const plusOracle=JSON.parse(execFileSync('perl',[
  'original-market-buy10-probe.pl',
],{cwd:perlDir,encoding:'utf8'})).supply;

function seedPeriod(){
  const period=reviewOriginalPeriodBootstrap({
    periodSource:src.originalPeriodSource,
    adminSource:src.originalAdminInitSource,
    readSource:src.originalDataReadSource,
    writeSource:src.originalDataWriteSource,
    reviewedB41:street.reviewedB41,
  });
  return createOriginalPeriodSeed(period);
}
function setup(){
  const repository=createMemoryWorldAdapter(createPeriodMemoryWorld({
    worldId:'b61-real-source-ken-demand-world',
    streetId:'standard-street',nowSeconds:897400,period:seedPeriod(),
  }));
  const act=(kind,fields={})=>executeMemoryCommand({
    repository,streetModule:street,
    command:{kind,expectedRevision:repository.read().revision,...fields},
  });
  assert.ok(act('initialize-source-market').ok);
  assert.ok(act('open-shop',{
    shopId:1,ownerName:'原版玩家',shopName:'B61 真正營運的書店',
  }).ok);
  assert.ok(act('reviewed-sparse-all-plus',{
    timespanSeconds:60,randomDraws:plusOracle.draws,
  }).ok);
  const q=street.quoteMarketOffer(repository.read(),10);
  assert.ok(act('market-buy',{itemId:10,
    shopId:1,requestedCount:1,
    marketShelf:q.shelf,expectedPrice:q.price,
  }).ok);
  assert.ok(act('edit-showcase',{
    shopId:1,shelf:0,itemId:10,per:100,priceOverride:5000,
  }).ok);
  return {repository,act};
}
function exactSaleDraws(world,minutes){
  const samples=sourceCommandDraws({
    world,kind:'advance-source-time',
    args:{shopId:1,minutes},count:121,
  });
  for(let i=1;i<=samples.length;i++){
    const draws=samples.slice(0,i);
    try {
      projectB41Sale({
        world,reviewed:street.reviewedB41,
        reviewedAllPlus:street.reviewedAllPlus,
        compiled:street.reviewedGiftMapUse,
        shopId:1,minutes,randomDraws:draws,
        reviewedB59Iron:street.reviewedB59Iron,
        reviewedB60Happy:street.reviewedB60Happy,
        reviewedB61Sword:reviewed,
        reviewedEventTimeSlice:true,
      });
      return draws;
    }catch(error){
      if(error.message.includes('crosses original period settlement'))
        throw error;
    }
  }
  throw Error('B-61 source original B-41 random draw prefix not found');
}
function eventDraws(world,minutes,{sword=false,iron=false,happy=false}={}){
  const state=world.period.eventState;
  const occupiedKeys=Object.entries(state).filter(
    ([,time])=>time>=world.nowSeconds+minutes*60).map(([key])=>key);
  const out=[];
  for(const code of order){
    if(occupiedKeys.includes(code))continue;
    const trigger=(code==='ken-sale'&&sword)||
      (code==='plusup-tetu'&&iron)||
      (code==='happy'&&happy);
    out.push(trigger?0:999999);
    if(trigger)out.push(0,0);
  }
  return out;
}
function slice(repository,minutes,flags={}){
  const world=repository.read();
  return executeMemoryCommand({
    repository,streetModule:street,
    command:{kind:'advance-source-time-reviewed-events',
      expectedRevision:world.revision,shopId:1,minutes,
      saleDraws:exactSaleDraws(world,minutes),
      eventHashOrderFixture:order,
      eventDraws:eventDraws(world,minutes,flags)},
  });
}
function close(a,b,label){
  assert.ok(Math.abs(a-b)<1e-9,
    label+': '+a+' vs '+b);
}
test('B-61 true original Perl compiler PARAM output, GetMarketStatus and original buyer preparation match source-demand JS',()=>{
  assert.equal(reviewed.source,B61_SWORD_SOURCE);
  assert.equal(street.reviewedB56.sword,B61_SWORD_SOURCE);
  assert.equal(reviewed.publicGameplay,false);
  assert.equal(reviewed.startProba,100);
  assert.equal(reviewed.swordItems.length,5);
  const line=oracle.generatedEventFile.trim().split(/\r?\n/);
  assert.equal(line.length,5);
  for(let i=0;i<5;i++){
    const id=40+i;
    assert.equal(line[i],
      '$ITEM['+id+']->{popular}=int($ITEM['+id+']->{popular}/2);');
    const x=oracle.market.baseline.swordItems[i];
    const y=oracle.market.active.swordItems[i];
    assert.equal(x.itemId,id);
    assert.equal(y.itemId,id);
    assert.equal(x.popularSeconds,reviewed.swordItems[i].basePopularSeconds);
    assert.equal(y.popularSeconds,reviewed.swordItems[i].eventPopularSeconds);
    const base=projectOriginalSwordDemand({
      reviewed,timespanSeconds:60,activeAtDataRead:false,
    }).rows[i];
    const active=projectOriginalSwordDemand({
      reviewed,timespanSeconds:60,activeAtDataRead:true,
    }).rows[i];
    close(Number(base.potentialBuyersApprox),x.potentialBuyers,'source baseline #'+id);
    close(Number(active.potentialBuyersApprox),y.potentialBuyers,'source active #'+id);
    close(Number(active.potentialBuyersApprox),Number(base.potentialBuyersApprox)*2,
      'source 2x sword potential #'+id);
    assert.equal(base.nominalPriceChanged,false);
    assert.equal(active.realSwordSalesSupported,false);
  }
  assert.equal(oracle.market.baseline.displayedSword.sourceUppoint,54);
  assert.equal(oracle.market.active.displayedSword.sourceUppoint,27);
  assert.equal(oracle.market.active.displayedSword.averageMarketPrice,1200,
    'demand did not change source nominal price');
});
test('B-61 real original combined EVENT END+START strict expiry/retrigger agrees with Node',()=>{
  assert.equal(oracle.cases.length,5);
  const cases=Object.fromEntries(oracle.cases.map(x=>[x.name,x]));
  const first=cases['first-start'];
  const started=projectOriginalSwordStart({
    reviewed,startSeconds:first.input.startSeconds,
    spanSeconds:first.input.spanSeconds,
    randomDraws:first.input.randomDraws.slice(1),
  });
  assert.equal(started.expiresAtSeconds,first.output.eventState['ken-sale']);
  assert.equal(started.expiresAtSeconds,1044100);
  for(const name of ['active-group','expiry-equal',
    'expired-no-restart','expired-restart']){
    const c=cases[name],at=c.input.expiresAtSeconds;
    const expired=projectOriginalSwordExpiry({
      reviewed,eventState:{'ken-sale':at},
      startSeconds:c.input.startSeconds,
      spanSeconds:c.input.spanSeconds,
    });
    assert.equal(expired.expired,
      at<c.input.startSeconds+c.input.spanSeconds,name);
    assert.equal(expired.occupied,
      name==='active-group'||name==='expiry-equal',name);
    if(name==='expired-no-restart')
      assert.deepEqual(expired.remainingEventState,c.output.eventState);
    if(name==='expired-restart')
      assert.equal(projectOriginalSwordStart({
        reviewed,startSeconds:c.input.startSeconds,
        spanSeconds:c.input.spanSeconds,
        randomDraws:c.input.randomDraws.slice(1),
      }).expiresAtSeconds,c.output.eventState['ken-sale']);
  }
});
test('B-61 real #10 shop persists active sword-demand EVENT across disk/reload; future demand changes without fake sword sales',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'akimono-b61-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const {repository}=setup(),before=repository.read();
  assert.deepEqual(before.period.eventState,{});
  const first=slice(repository,30,{sword:true});
  assert.ok(first.ok,JSON.stringify(first.details));
  assert.equal(first.world.period.eventState['ken-sale'],
    before.nowSeconds+21600);
  assert.equal(first.details.eventDrawsUsed,19);
  assert.equal(first.details.swordDemandWasActiveAtDataRead,false);
  assert.equal(first.details.sourceSwordDemandPreview.activeAtDataRead,false);
  assert.equal(first.details.sourceSwordDemandPreview.rows.length,5);
  assert.deepEqual(first.details.eventLogEmissions,[
    {eventCode:'ken-sale',level:2,shopId:0,
      message:reviewed.startMessage},
  ]);
  const store=createLocalWorldSaveStore({directory});
  store.save(repository.read(),{expectedGeneration:0});
  const resumed=createMemoryWorldAdapter(store.load().world);
  assert.deepEqual(resumed.read(),first.world);
  const active=resumed.read();
  const old=applyGameCommand({
    world:active,streetModule:street,
    command:{kind:'advance-source-time',
      expectedRevision:active.revision,shopId:1,
      minutes:30,randomDraws:exactSaleDraws(active,30)},
  });
  assert.equal(old.ok,false,'source EVENT cannot be discarded by legacy sale');
  const isolated=executeMemoryCommand({
    repository:resumed,streetModule:street,
    command:{kind:'reviewed-sparse-all-plus',
      expectedRevision:active.revision,timespanSeconds:60,
      randomDraws:plusOracle.draws},
  });
  assert.equal(isolated.ok,false);
  assert.equal(isolated.code,'SOURCE_BOUNDARY_REJECTED');
  assert.deepEqual(resumed.read(),active);

  const second=slice(resumed,30);
  assert.ok(second.ok,JSON.stringify(second.details));
  assert.equal(second.details.swordDemandWasActiveAtDataRead,true);
  assert.equal(second.details.sourceSwordDemandPreview.activeAtDataRead,true);
  assert.equal(second.details.eventDrawsUsed,16,
    '16 other 17 gates only, active event group skips one');
  assert.equal(second.details.eventStarts.includes('ken-sale'),false);
  for(let i=0;i<5;i++){
    const b=first.details.sourceSwordDemandPreview.rows[i];
    const a=second.details.sourceSwordDemandPreview.rows[i];
    assert.equal(a.effectivePopularSeconds,
      Math.trunc(b.effectivePopularSeconds/2));
    close(Number(a.potentialBuyersApprox),Number(b.potentialBuyersApprox)*2,
      'actual world 2x sword source potential '+(40+i));
    assert.equal(second.world.shops[0].item[39+i],0,
      'no fabricated sword stock added to real book shop');
  }
  assert.equal(second.world.period.eventState['ken-sale'],
    first.world.period.eventState['ken-sale']);
  // 5×1h followed by the earlier 30+30min hits the 6h event deadline.
  let curr=second;
  for(let i=0;i<5;i++){
    curr=slice(resumed,60);
    assert.ok(curr.ok,JSON.stringify({i,details:curr.details}));
    assert.equal(curr.details.swordDemandExpired,false);
    assert.equal(curr.details.swordDemandWasActiveAtDataRead,true);
    assert.equal(curr.world.period.eventState['ken-sale'],
      first.world.period.eventState['ken-sale']);
  }
  assert.equal(curr.world.nowSeconds,
    first.world.period.eventState['ken-sale']);
  const expired=slice(resumed,30);
  assert.ok(expired.ok,JSON.stringify(expired.details));
  assert.equal(expired.details.swordDemandExpired,true);
  assert.equal(expired.details.swordDemandWasActiveAtDataRead,true);
  assert.equal(expired.details.sourceSwordDemandPreview.activeAtDataRead,true,
    'original DataRead applies demand even in the expiry slice');
  assert.deepEqual(expired.world.period.eventState,{});
  assert.deepEqual(expired.details.eventLogEmissions,[
    {eventCode:'ken-sale',level:2,shopId:0,
      message:reviewed.endMessage},
  ]);
  const restored=slice(resumed,30);
  assert.ok(restored.ok,JSON.stringify(restored.details));
  assert.equal(restored.details.swordDemandWasActiveAtDataRead,false);
  assert.equal(restored.details.sourceSwordDemandPreview.activeAtDataRead,false);
  close(Number(restored.details.sourceSwordDemandPreview.rows[0].potentialBuyersApprox),
    Number(first.details.sourceSwordDemandPreview.rows[0].potentialBuyersApprox),
    'original baseline returns after next DataRead');
  store.save(resumed.read(),{expectedGeneration:1});
  assert.deepEqual(store.load().world,restored.world);
});
test('B-61 fail closed: unknown / parallel active EVENT, unsupported starts, source drift and bad RNG do not mutate CAS',()=>{
  const {repository}=setup(),world=repository.read();
  const sourceSale=exactSaleDraws(world,30);
  const valid=eventDraws(world,30,{sword:true});
  const act=(w,extra={})=>applyGameCommand({
    world:w,streetModule:street,
    command:{kind:'advance-source-time-reviewed-events',
      expectedRevision:w.revision,shopId:1,minutes:30,
      saleDraws:sourceSale,eventHashOrderFixture:order,
      eventDraws:valid,...extra},
  });
  for(const opts of [
    {eventDraws:valid.slice(0,-1)},
    {eventDraws:[...valid,0]},
    {eventDraws:valid.map((v,i)=>i===valid.length-1?-1:v)},
    {eventDraws:eventDraws(world,30,{sword:true,happy:true})},
    {eventDraws:eventDraws(world,30,{sword:true,iron:true})},
    {eventDraws:eventDraws(world,30).map((x,i)=>
      order[i]==='boom-posyon'?0:x)},
    {eventHashOrderFixture:order.slice(0,16)},
  ]){
    const r=act(world,opts);
    assert.equal(r.ok,false,JSON.stringify(opts).slice(0,450));
    assert.equal(r.code,'SOURCE_BOUNDARY_REJECTED');
    assert.deepEqual(repository.read(),world);
  }
  const drift=[
    {itemDsl:src.itemDsl.replace(
      /(param\s+木刀\s+)pop\/2/,'$1pop/3')},
    {turnSource:src.originalTurnSource.replace(
      '#イベント終了処理','#イベント終了修改')},
    {compilerSource:src.originalCompilerSource.replace(
      '$key=~s/^pop$/popular/i;','$key=~s/^foo$/popular/i;')},
    {compiledCatalog:{...street.reviewedEventCatalog,
      compiled:street.reviewedEventCatalog.compiled.map(e=>
        e.code==='ken-sale'?{...e,startProba:101}:e)}},
  ];
  const argumentsOriginal={
    itemDsl:src.itemDsl,turnSource:src.originalTurnSource,
    compilerSource:src.originalCompilerSource,
    readSource:src.originalDataReadSource,
    compiledCatalog:street.reviewedEventCatalog,
    model:{items:reviewed.swordItems.map(x=>({
      id:x.itemId,name:x.name,
    }))},
  };
  for(const row of drift)
    assert.throws(()=>reviewOriginalB61SwordDemand({
      ...argumentsOriginal,...row,
    }),/B-61/);
  for(const state of [
    {'ken-sale':12345,happy:12345},
    {'ken-sale':-1},{'ken-sale':'bad'},
    {unreviewed:12345},{'ken-sale':1.5},
  ]){
    const w={...world,period:{...world.period,eventState:state}};
    assert.equal(isReviewedB61SwordPeriod({
      period:w.period,reviewed,nowSeconds:w.nowSeconds,
    }),false);
    try{
      const res=act(w);
      assert.equal(res.ok,false);
      assert.equal(res.code,'SOURCE_BOUNDARY_REJECTED');
    }catch(error){
      assert.match(error.message,/B-31 contract: WorldState/);
    }
    assert.deepEqual(repository.read(),world);
  }
  const stale=act(world,{expectedRevision:world.revision+1});
  assert.equal(stale.code,'REVISION_CONFLICT');
  assert.deepEqual(repository.read(),world);
});
