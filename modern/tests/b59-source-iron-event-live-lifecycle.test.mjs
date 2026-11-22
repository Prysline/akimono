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
import {projectOriginalSparseAllPlus} from '../src/original-sparse-all-plus.mjs';
import {createLocalWorldSaveStore} from '../src/local-world-save-store.mjs';
import {sourceCommandDraws} from '../src/local-source-command-draws.mjs';
import {reviewOriginalB59IronEvent,projectOriginalIronStart,
  projectOriginalIronExpiry,isReviewedB59EventPeriod,B59_IRON_SOURCE}
  from '../src/original-b59-iron-event-lifecycle.mjs';

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
const srcList=await Promise.all(files.map(read));
const src=Object.fromEntries(names.map((k,i)=>[k,srcList[i]]));
const street=createStandardStreetModule(src);
const perlDir=join(root,'modern/tests/original-perl');
const oracle=JSON.parse(execFileSync('perl',[
  'original-b59-iron-event-probe.pl',
],{cwd:perlDir,encoding:'utf8'}));
const marketOracle=JSON.parse(execFileSync('perl',[
  'original-market-buy10-probe.pl',
],{cwd:perlDir,encoding:'utf8'})).supply;
const review=street.reviewedB59Iron;
const order=street.reviewedEventCatalog.compiled.map(e=>e.code).toReversed();
const ironCode='plusup-tetu';
function makePeriod(){
  const reviewed=reviewOriginalPeriodBootstrap({
    periodSource:src.originalPeriodSource,
    adminSource:src.originalAdminInitSource,
    readSource:src.originalDataReadSource,
    writeSource:src.originalDataWriteSource,
    reviewedB41:street.reviewedB41,
  });
  return createOriginalPeriodSeed(reviewed);
}
function startWorld({nowSeconds=897400}={}){
  const adapter=createMemoryWorldAdapter(createPeriodMemoryWorld({
    worldId:'b59-original-iron-vein-source-world',
    streetId:'standard-street',nowSeconds,period:makePeriod(),
  }));
  const act=(kind,fields={})=>executeMemoryCommand({
    repository:adapter,streetModule:street,
    command:{kind,expectedRevision:adapter.read().revision,...fields},
  });
  assert.ok(act('initialize-source-market').ok);
  assert.ok(act('open-shop',{shopId:1,ownerName:'原版店主',
    shopName:'真實鐵礦脈活動商店'}).ok);
  return {adapter,act};
}
function boughtWorld(){
  const {adapter,act}=startWorld();
  const plus=act('reviewed-sparse-all-plus',{
    timespanSeconds:60,randomDraws:marketOracle.draws,
  });
  assert.ok(plus.ok,JSON.stringify(plus.details));
  const item=street.quoteMarketItem10(adapter.read());
  assert.ok(act('buy-market-item-10',{
    shopId:1,requestedCount:1,
    marketShelf:item.shelf,expectedPrice:item.price,
  }).ok);
  assert.ok(act('edit-showcase',{
    shopId:1,shelf:0,itemId:10,per:100,priceOverride:5000,
  }).ok);
  return {adapter,act};
}
function exactDraws(world,minutes){
  const samples=sourceCommandDraws({
    world,kind:'advance-source-time',args:{shopId:1,minutes},
    count:121,
  });
  for(let n=1;n<=121;n++){
    const trial=samples.slice(0,n);
    try{
      projectB41Sale({
        world,reviewed:street.reviewedB41,
        reviewedAllPlus:street.reviewedAllPlus,
        compiled:street.reviewedGiftMapUse,shopId:1,minutes,
        randomDraws:trial,reviewedB59Iron:review,
        reviewedB60Happy:street.reviewedB60Happy,
        reviewedB61Sword:street.reviewedB61Sword,
        reviewedEventTimeSlice:true,
      });
      return trial;
    }catch(error){
      if(error?.message?.includes('crosses original period settlement'))
        throw error;
    }
  }
  throw new Error('B-59 source natural-sale and 59-PLUS random prefix missing');
}
function eventDraws(world,minutes,{startIron=false,startOther=null}={}){
  const events=world.period.eventState;
  const active=events?.[ironCode]??null;
  const occupied=active!==null&&active>=world.nowSeconds+minutes*60;
  const draws=[];
  for(const code of order){
    if(code===ironCode&&occupied)continue;
    const starts=(code===ironCode&&startIron)||
      (code===startOther);
    draws.push(starts?0:999999);
    if(starts){
      if(code===ironCode)draws.push(0,0);
      // other activated events have no source callback draw if their source
      // branch is unreviewed: it must be rejected instead of consumed.
    }
  }
  return draws;
}
function sliceOn(adapter,minutes,{startIron=false,startOther=null}={}){
  const world=adapter.read();
  const drawList=exactDraws(world,minutes);
  const draws=eventDraws(world,minutes,{startIron,startOther});
  return executeMemoryCommand({
    repository:adapter,streetModule:street,
    command:{kind:'advance-source-time-reviewed-events',
      expectedRevision:world.revision,
      shopId:1,minutes,saleDraws:drawList,
      eventDraws:draws,eventHashOrderFixture:order},
  });
}

test('B-59 original compiler and real Perl fixed expiry/start fragments match iron activation, strict expiry and logs',()=>{
  assert.equal(review.source,B59_IRON_SOURCE);
  assert.equal(street.reviewedB56.iron,B59_IRON_SOURCE);
  assert.equal(review.publicGameplay,false);
  assert.equal(review.itemId,5);
  assert.equal(review.plusSeconds,720);
  assert.equal(review.basePlusSeconds,-1200);
  assert.equal(oracle.originalCompiler.assignment,'$ITEM[5]->{plus}=720;');
  assert.equal(oracle.originalCompiler.startProba,100);
  assert.equal(oracle.cases.length,5);
  const cases=Object.fromEntries(oracle.cases.map(c=>[c.name,c]));
  const originalStart=cases['start-12h-and-random-plus'];
  const projected=projectOriginalIronStart({
    reviewed:review,startSeconds:originalStart.input.startSeconds,
    spanSeconds:originalStart.input.spanSeconds,
    randomDraws:originalStart.input.randomDraws.slice(1),
  });
  assert.equal(projected.expiresAtSeconds,
    originalStart.output.activeState[ironCode]);
  assert.equal(projected.randomDrawsUsed+1,
    originalStart.output.drawsUsed);
  for(const key of ['active-blocks-gate','strict-end-equality-occupied',
    'expired-then-gate-miss','expired-and-retrigger']){
    const row=cases[key];
    const end=projectOriginalIronExpiry({
      reviewed:review,
      eventState:{[ironCode]:row.input.activeUntilSeconds},
      startSeconds:row.input.startSeconds,
      spanSeconds:row.input.spanSeconds,
    });
    assert.equal(end.expired,
      row.input.activeUntilSeconds<
        row.input.startSeconds+row.input.spanSeconds,key);
    assert.equal(end.occupied,
      key==='active-blocks-gate'||key==='strict-end-equality-occupied',key);
    assert.equal(end.endMessage===null,
      key==='active-blocks-gate'||key==='strict-end-equality-occupied',key);
    if(key==='expired-then-gate-miss')
      assert.deepEqual(end.remainingEventState,row.output.activeState);
    if(key==='expired-and-retrigger'){
      const restarted=projectOriginalIronStart({
        reviewed:review,startSeconds:row.input.startSeconds,
        spanSeconds:row.input.spanSeconds,
        randomDraws:row.input.randomDraws.slice(1),
      });
      assert.equal(restarted.expiresAtSeconds,
        row.output.activeState[ironCode]);
    }
  }
});

test('B-59 full original Perl 59-PLUS/CheckWholeStore output agrees with Node ITEM5 baseline and active iron modifier',()=>{
  const {adapter}=startWorld();
  const base=oracle.wholesale.baseline,active=oracle.wholesale.withIron;
  const input=adapter.read();
  const project=(effect,p)=>projectOriginalSparseAllPlus({
    world:input,reviewed:street.reviewedAllPlus,
    compiled:street.reviewedGiftMapUse,
    timespanSeconds:60,randomDraws:p.consumedSamples,
    reviewedB59Iron:review,ironEventActive:effect,
  });
  const before=project(false,base),after=project(true,active);
  assert.deepEqual(before.market.wholesale,base.wholesale79,
    'baseline Node original source wholesale all 79 items');
  assert.deepEqual(after.market.wholesale,active.wholesale79,
    'event loaded by DataRead changes true source wholesale');
  assert.equal(before.market.wholesale[4],base.wholesale5);
  assert.equal(after.market.wholesale[4],active.wholesale5);
  assert.ok(after.market.wholesale[4]>before.market.wholesale[4]);
  assert.equal(before.receipt.ironVeinModifierApplied,false);
  assert.equal(after.receipt.ironVeinModifierApplied,true);
  assert.equal(after.receipt.drawsUsed,active.drawsUsed);
});

test('B-59 live market/shop CAS starts real iron EVENT, saves/reloads, applies next-slice wholesale, holds strict expiry, ends, then reverts',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'akimono-b59-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const {adapter}=boughtWorld();
  const before=adapter.read();
  assert.deepEqual(before.period.eventState,{});
  const first=sliceOn(adapter,30,{startIron:true});
  assert.ok(first.ok,JSON.stringify(first.details));
  assert.equal(first.world.revision,before.revision+1);
  assert.equal(first.world.nowSeconds,before.nowSeconds+1800);
  assert.equal(first.world.period.eventState[ironCode],before.nowSeconds+43200);
  assert.equal(first.details.ironVeinModifierApplied,false,
    'new event cannot modify preceding PLUS stage in its own turn');
  assert.equal(first.details.ironEventWasActiveAtDataRead,false);
  assert.equal(first.details.ironEventExpired,false);
  assert.equal(first.details.eventDrawsUsed,19);
  assert.equal(first.details.eventStateConfirmedEmpty,false);
  assert.deepEqual(first.details.eventLogEmissions,[
    {eventCode:ironCode,level:2,shopId:0,message:review.startMessage},
  ]);
  // The stand-alone old PLUS command must not quietly ignore known
  // source event data and overwrite the live market without the modifier.
  const isolated=executeMemoryCommand({
    repository:adapter,streetModule:street,
    command:{kind:'reviewed-sparse-all-plus',
      expectedRevision:adapter.read().revision,
      timespanSeconds:60,randomDraws:marketOracle.draws},
  });
  assert.equal(isolated.ok,false);
  assert.equal(isolated.code,'SOURCE_BOUNDARY_REJECTED');
  assert.deepEqual(adapter.read(),first.world);

  const disk=createLocalWorldSaveStore({directory});
  disk.save(adapter.read(),{expectedGeneration:0});
  assert.deepEqual(disk.load().world,first.world);
  const resumed=createMemoryWorldAdapter(disk.load().world);

  const oldPlayer=applyGameCommand({
    world:resumed.read(),streetModule:street,
    command:{kind:'advance-source-time',
      expectedRevision:resumed.read().revision,
      shopId:1,minutes:30,randomDraws:exactDraws(resumed.read(),30)},
  });
  assert.equal(oldPlayer.ok,false,
    'legacy B-41 cannot silently discard a known source active event');

  const second=sliceOn(resumed,30);
  assert.ok(second.ok,JSON.stringify(second.details));
  assert.equal(second.details.ironVeinModifierApplied,true,
    'only a NEXT source DataRead makes ITEM5 plus=720 active');
  assert.equal(second.details.ironEventWasActiveAtDataRead,true);
  assert.equal(second.details.eventStarts.includes(ironCode),false,
    'occupied event group suppresses new gate');
  assert.equal(second.details.eventDrawsUsed,16);
  assert.equal(second.world.period.eventState[ironCode],
    first.world.period.eventState[ironCode]);
  assert.ok(second.world.market.wholesale[4]>=first.world.market.wholesale[4],
    'source iron supply grows/retains wholesale after event starts');
  assert.deepEqual(second.world.period.town,before.period.town);
  assert.equal(second.world.shops[0].id,1);
  assert.equal(second.world.shops[0].item.length,79);

  // 11 additional 1h slices bring the local clock exactly to event expiry.
  let latest=second;
  for(let i=0;i<11;i++){
    latest=sliceOn(resumed,60);
    assert.ok(latest.ok,JSON.stringify({at:i,details:latest.details}));
    assert.equal(latest.details.ironVeinModifierApplied,true);
    assert.equal(latest.details.ironEventExpired,false);
    assert.equal(latest.world.period.eventState[ironCode],
      first.world.period.eventState[ironCode]);
  }
  assert.equal(latest.world.nowSeconds,first.world.period.eventState[ironCode],
    'strict source equality: EVENT still active exactly at segment end');
  const expires=sliceOn(resumed,30);
  assert.ok(expires.ok,JSON.stringify(expires.details));
  assert.equal(expires.details.ironVeinModifierApplied,true,
    'event loaded at beginning still affects this PLUS before expiry stage');
  assert.equal(expires.details.ironEventExpired,true);
  assert.equal(expires.details.eventStateConfirmedEmpty,true);
  assert.deepEqual(expires.world.period.eventState,{});
  assert.deepEqual(expires.details.eventLogEmissions,[
    {eventCode:ironCode,level:2,shopId:0,message:review.endMessage},
  ]);
  const normal=sliceOn(resumed,30);
  assert.ok(normal.ok,JSON.stringify(normal.details));
  assert.equal(normal.details.ironVeinModifierApplied,false,
    'only NEXT read after expiry restores original -20m baseline');
  assert.equal(normal.details.ironEventWasActiveAtDataRead,false);
  assert.deepEqual(normal.world.period.eventState,{});
  assert.ok(normal.world.market.wholesale[4]<
    expires.world.market.wholesale[4],
    'baseline iron supply now shrinks actual post-expiry wholesale');
  disk.save(resumed.read(),{expectedGeneration:1});
  assert.deepEqual(disk.load().world,normal.world);
});

test('B-59 rejects unknown/multiple/corrupt active EVENT, invalid duration, unreviewed EVENT, and stale CAS with zero mutation',()=>{
  const {adapter}=boughtWorld();
  const base=adapter.read(),saleDraws=exactDraws(base,30);
  const full=eventDraws(base,30,{startIron:true});
  const make=(world,fields={})=>applyGameCommand({
    world,streetModule:street,
    command:{
      kind:'advance-source-time-reviewed-events',
      expectedRevision:world.revision,
      shopId:1,minutes:30,
      saleDraws,eventDraws:full,eventHashOrderFixture:order,...fields,
    },
  });
  const badCommands=[
    {eventDraws:full.slice(0,-1)},
    {eventDraws:[...full,0]},
    {eventDraws:full.filter((_,i)=>i!==full.findIndex(
      (x,n)=>n>full.indexOf(0)&&x===0))},
    {eventDraws:eventDraws(base,30,{startIron:true,startOther:'happy'})},
    {eventHashOrderFixture:order.slice(0,16)},
  ];
  for(const fields of badCommands){
    const result=make(base,fields);
    assert.equal(result.ok,false,JSON.stringify(fields));
    assert.equal(result.code,'SOURCE_BOUNDARY_REJECTED');
    assert.deepEqual(adapter.read(),base);
  }
  const corrupt=[
    null,{'another-event':1234},{[ironCode]:-1},
    {[ironCode]:1,'happy':2},{[ironCode]:1.5},
    {[ironCode]:'wrong'},[],
  ];
  for(const state of corrupt){
    const world={...base,period:{...base.period,eventState:state}};
    assert.equal(isReviewedB59EventPeriod({
      period:world.period,reviewed:review,nowSeconds:world.nowSeconds,
    }),false);
    // GameCore rejects non-safe snapshots even before StreetModule can
    // return a source refusal; both paths must leave the live CAS unchanged.
    try{
      const result=make(world);
      assert.equal(result.ok,false,JSON.stringify(state));
      assert.equal(result.code,'SOURCE_BOUNDARY_REJECTED');
    }catch(error){
      assert.match(error.message,/B-31 contract: WorldState/);
    }
    assert.deepEqual(adapter.read(),base);
  }
  for(const changed of [
    {itemDsl:src.itemDsl.replace('plus=720','plus=721')},
    {turnSource:src.originalTurnSource.replace(
      'delete $DTevent{$key};','delete $DTevent{$other};')},
    {readSource:src.originalDataReadSource.replace(
      'foreach(keys(%DTevent)){require(GetPath($ITEM_DIR,"event",$_));}',
      'foreach(keys(%DTevent)){}')},
    {reviewedAllPlus:{...street.reviewedAllPlus,
      plusSeconds:street.reviewedAllPlus.plusSeconds.map((n,i)=>
        i===4?720:n)}},
  ]){
    assert.throws(()=>reviewOriginalB59IronEvent({
      itemDsl:src.itemDsl,turnSource:src.originalTurnSource,
      compilerSource:src.originalCompilerSource,
      readSource:src.originalDataReadSource,
      compiledCatalog:street.reviewedEventCatalog,
      reviewedAllPlus:street.reviewedAllPlus,
      model:street.reviewedB59Iron?{
        items:[{id:5,name:'鐵塊'}]}:null,
      ...changed,
    }),/B-59/);
  }
  const stale=make(base,{expectedRevision:base.revision+1});
  assert.equal(stale.code,'REVISION_CONFLICT');
  assert.deepEqual(adapter.read(),base);
});
