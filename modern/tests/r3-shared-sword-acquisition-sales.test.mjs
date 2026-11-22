import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {createPeriodMemoryWorld,createMemoryWorldAdapter,
  executeMemoryCommand} from '../src/game-core-contract.mjs';
import {createLocalWorldSaveStore} from '../src/local-world-save-store.mjs';
import {reviewOriginalPeriodBootstrap,createOriginalPeriodSeed}
  from '../src/original-period-world-seed.mjs';
import {projectB41Sale} from '../src/original-b41-playable-sale.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const locations=[
 ['itemDsl','custom/inc-item-data.cgi'],
 ['rebelDsl','custom/inc-rebel-data.cgi'],
 ['originalAdminInitSource','modern/tests/original-perl/core-inc-admin-func.cgi'],
 ['originalDataReadSource','modern/tests/original-perl/inc-func.cgi'],
 ['originalDataWriteSource','modern/tests/original-perl/write.cgi'],
 ['originalTurnSource','modern/tests/original-perl/inc-turn.cgi'],
 ['originalWholeSource','modern/tests/original-perl/whole.cgi'],
 ['originalConfigSource','_config.cgi'],
 ['originalCompilerSource','modern/tests/original-perl/inc-makeitem.cgi'],
 ['originalBuySource','modern/tests/original-perl/buy-s.cgi'],
 ['originalBuyItemSource','modern/tests/original-perl/item.cgi'],
 ['originalBuyCalcSource','modern/tests/original-perl/calc.cgi'],
 ['originalMarketSource','modern/tests/original-perl/market.cgi'],
 ['originalItemSource','modern/tests/original-perl/item.cgi'],
 ['originalDetailSource','modern/tests/original-perl/core-detail.cgi'],
 ['originalPeriodSource','modern/tests/original-perl/period.cgi'],
 ['originalUseSource','modern/tests/original-perl/use.cgi'],
 ['originalItemHelperSource','modern/tests/original-perl/core-inc-item.cgi'],
];
const source=Object.fromEntries(await Promise.all(locations.map(
 async ([k,p])=>[k,await readFile(path.join(root,p),'utf8')])));
const street=createStandardStreetModule(source);
const supply=JSON.parse(execFileSync('perl',
 ['original-market-buy10-probe.pl'],{
  cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
 })).supply;
const eventOrder=street.reviewedEventCatalog.compiled.map(x=>x.code).toReversed();
const prices=[1200,1500,3200,8000,12000];

function newWorld(){
 const seed=createOriginalPeriodSeed(reviewOriginalPeriodBootstrap({
  periodSource:source.originalPeriodSource,
  adminSource:source.originalAdminInitSource,
  readSource:source.originalDataReadSource,
  writeSource:source.originalDataWriteSource,
  reviewedB41:street.reviewedB41,
 }));
 const repository=createMemoryWorldAdapter(createPeriodMemoryWorld({
  worldId:'r3-real-source-five-swords',streetId:'standard-street',
  nowSeconds:897400,period:seed,
 }));
 const command=(kind,fields={})=>executeMemoryCommand({
  repository,streetModule:street,
  command:{kind,expectedRevision:repository.read().revision,...fields},
 });
 assert.equal(command('initialize-source-market').ok,true);
 assert.equal(command('open-shop',{shopId:1,ownerName:'來源劍商',
  shopName:'五種來源商品共用展示架'}).ok,true);
 assert.equal(command('reviewed-sparse-all-plus',{
  timespanSeconds:60,randomDraws:supply.draws,
 }).ok,true);
 return {repository,command};
}
function sourceDraws(world,minutes){
 for(let n=59;n<=121;n++){
  const randomDraws=[500000,...Array(n-1).fill(0)];
  try{
   projectB41Sale({
    world,shopId:1,minutes,randomDraws,
    reviewed:street.reviewedB41,
    reviewedAllPlus:street.reviewedAllPlus,
    compiled:street.reviewedGiftMapUse,
    reviewedB59Iron:street.reviewedB59Iron,
    reviewedB60Happy:street.reviewedB60Happy,
    reviewedB61Sword:street.reviewedB61Sword,
    reviewedB62Map:street.reviewedB62Map,
    reviewedB63Map:street.reviewedB63Map,
    reviewedEventTimeSlice:true,
   });
   return randomDraws;
  }catch(err){
   if(!/missing natural\/PLUS source draw|missing original random draw|unused source random samples/.test(err.message))
    throw err;
  }
 }
 throw Error('original sale/PLUS source sample prefix not found');
}
function runTime(repo,minutes){
 const world=repo.read();
 const result=executeMemoryCommand({
  repository:repo,streetModule:street,
  command:{
   kind:'advance-source-time-reviewed-events',
   expectedRevision:world.revision,shopId:1,minutes,
   saleDraws:sourceDraws(world,minutes),
   eventDraws:eventOrder.map(()=>999999),
   eventHashOrderFixture:eventOrder,
  },
 });
 assert.equal(result.ok,true,JSON.stringify(result.details));
 assert.deepEqual(result.world.period.eventState,{});
 return result;
}
test('R3 all five real source #14 first-USE swords share one sale engine; source-capped CAS/disk reload',async t=>{
 const folder=await mkdtemp(path.join(tmpdir(),'akimono-r3-sword-'));
 t.after(()=>rm(folder,{recursive:true,force:true}));
 const store=createLocalWorldSaveStore({
  directory:folder,marketBuyRegistry:street.marketBuyRegistry,
  useItem:street.useItem,
 });
 const {repository,command}=newWorld();
 const initial=repository.read();
 for(let id=40;id<=44;id++)
  assert.equal(initial.market.wholesale[id-1],0,
   'cannot invent wholesale swords');
 const offer=street.quoteMarketOffer(initial,14);
 assert.ok(offer.canBuy);
 const bought=command('market-buy',{
  shopId:1,itemId:14,requestedCount:1,
  marketShelf:offer.shelf,expectedPrice:offer.price,
 });
 assert.equal(bought.ok,true,JSON.stringify(bought.details));
 const use=command('use-item',{
  shopId:1,itemId:14,useId:0,requestedCount:1,
  randomDraws:[999999,...Array(50).fill(0),999999],
 });
 assert.equal(use.ok,true,JSON.stringify(use.details));
 for(let id=40;id<=44;id++)
  assert.equal(use.world.shops[0].item[id-1],10);
 const originalRevision=repository.read().revision;
 let prior=JSON.stringify(repository.read());
 const stale=executeMemoryCommand({
  repository,streetModule:street,
  command:{kind:'edit-showcase',expectedRevision:originalRevision-1,
    shopId:1,shelf:0,itemId:41,per:100,priceOverride:1500},
 });
 assert.equal(stale.code,'REVISION_CONFLICT');
 assert.equal(JSON.stringify(repository.read()),prior);
 let totalSold=0;
 for(let i=0;i<5;i++){
  const id=40+i,price=prices[i];
  const shown=command('edit-showcase',{
   shopId:1,shelf:0,itemId:id,per:100,priceOverride:price,
  });
  assert.equal(shown.ok,true,JSON.stringify(shown.details));
  const stock=repository.read().shops[0].item[id-1];
  const result=runTime(repository,30);
  assert.equal(result.details.soldItemId,id);
  const after=result.world.shops[0].item[id-1];
  assert.ok(after<=stock,'natural sale never increases owned stock');
  totalSold+=stock-after;
  // Two-generation durable checkpoints are genuine CAS source worlds.
  const generation=store.status().generation;
  store.save(result.world,{expectedGeneration:generation});
  if(i===1){
   const loaded=store.load();
   assert.equal(loaded.world.revision,result.world.revision);
   assert.deepEqual(loaded.world.period.eventState,{});
   // Restarted adapter must continue the same source-driven five-item loop.
   const restarted=createMemoryWorldAdapter(loaded.world);
   const current=restarted.read();
   assert.equal(current.shops[0].item[41],repository.read().shops[0].item[41]);
  }
 }
 assert.ok(totalSold>0);
 assert.equal(store.status().available,true);
 assert.ok(store.status().generation>=5);
 const saved=store.load();
 assert.equal(saved.world.revision,repository.read().revision);
 assert.equal(saved.world.shops[0].money,repository.read().shops[0].money);
 for(let id=40;id<=44;id++)
  assert.ok(Object.hasOwn(saved.world.shops[0].itemtoday,String(id)));
});
