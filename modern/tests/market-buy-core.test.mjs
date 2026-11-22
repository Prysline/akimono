import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path,{join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  createPeriodMemoryWorld,createMemoryWorldAdapter,executeMemoryCommand,
  applyGameCommand,encodeMemorySnapshot,
} from '../src/game-core-contract.mjs';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {reviewOriginalPeriodBootstrap,createOriginalPeriodSeed}
  from '../src/original-period-world-seed.mjs';
import {createLocalWorldSaveStore} from '../src/local-world-save-store.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFile(join(root,p),'utf8');
const sources=[
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
];
const rows=await Promise.all(sources.map(async ([key,p])=>[key,await read(p)]));
const src=Object.fromEntries(rows);
const street=createStandardStreetModule(src);
const supply=JSON.parse(execFileSync('perl',['original-market-buy10-probe.pl'],{
  cwd:join(root,'modern/tests/original-perl'),encoding:'utf8',
})).supply;
const mappings=[
  [10,'buy-market-item-10',w=>street.quoteMarketItem10(w)],
  [11,'buy-market-item-11',w=>street.quoteMarketItem11(w)],
  [14,'buy-market-item-14',w=>street.quoteMarketItem14(w)],
];
function seed({withSupply=true}={}){
  const reviewed=reviewOriginalPeriodBootstrap({
    periodSource:src.originalPeriodSource,
    adminSource:src.originalAdminInitSource,
    readSource:src.originalDataReadSource,
    writeSource:src.originalDataWriteSource,
    reviewedB41:street.reviewedB41,
  });
  const repository=createMemoryWorldAdapter(createPeriodMemoryWorld({
    worldId:'r2-shared-market',streetId:'standard-street',
    nowSeconds:897400,period:createOriginalPeriodSeed(reviewed),
  }));
  const act=(kind,fields={})=>executeMemoryCommand({
    repository,streetModule:street,
    command:{kind,expectedRevision:repository.read().revision,...fields},
  });
  for(const [kind,fields] of [
    ['initialize-source-market',{}],
    ['open-shop',{shopId:1,ownerName:'共用市場',shopName:'共用購貨驗證'}],
    ...(withSupply?[['reviewed-sparse-all-plus',{
      timespanSeconds:60,randomDraws:supply.draws,
    }]]:[]),
  ]){
    const r=act(kind,fields);
    assert.ok(r.ok,JSON.stringify(r.details));
  }
  return {repository,act};
}
function buyCommand(world,itemId,quote,count=1){
  return {kind:'market-buy',expectedRevision:world.revision,
    shopId:1,itemId,requestedCount:count,
    marketShelf:quote.shelf,expectedPrice:quote.price};
}
function apply(world,command,customStreet=street){
  return applyGameCommand({world,command,streetModule:customStreet});
}

test('R1 original Core buy-s.cgi callback order and three reviewed DSL item rules are pinned',()=>{
  const source=src.originalBuySource;
  const accounting=source.indexOf('$DT->{paytoday}+=$num*$price;');
  const callback=source.indexOf('require "$ITEM_DIR/funcbuy.cgi"');
  const write=source.indexOf('SetWholeStore($DTS) if $id==0;');
  assert.ok(accounting>0&&accounting<callback&&callback<write);
  assert.equal(street.capabilities.includes('market-buy'),true);
  assert.deepEqual([10,11,14].map(id=>street.marketBuy.getRule(id).itemId),
    [10,11,14]);
  assert.equal(street.marketBuy.getRule(79),null);
  for(const id of [10,11,14]){
    assert.equal(street.marketBuy.getRule(id).buyCallback,null);
    assert.equal(street.marketBuy.getRule(id).marketTimeSeconds,600);
  }
  assert.deepEqual(street.marketBuy.order.map(x=>x.itemId),
    street.catalog.items.map(x=>x.id));
});

test('R2 one GameCore market-buy produces exact three legacy source-backed world transitions',()=>{
  const {repository}=seed();
  const start=repository.read();
  for(const [itemId,legacyKind,quote] of mappings){
    const offer=quote(start);
    assert.ok(offer.marketStock>0,'original PLUS must stock item '+itemId);
    const command=buyCommand(start,itemId,offer,2);
    const common=apply(start,command);
    // Legacy commands do not accept itemId at all.
    const old=apply(start,{
      kind:legacyKind,expectedRevision:start.revision,shopId:1,
      requestedCount:2,marketShelf:offer.shelf,expectedPrice:offer.price,
    });
    assert.ok(common.ok,JSON.stringify(common.details));
    assert.ok(old.ok,JSON.stringify(old.details));
    assert.equal(common.details.action,'market-buy');
    assert.equal(common.details.itemId,itemId);
    assert.equal(common.details.unitPrice,offer.price);
    assert.equal(common.details.tax,0);
    assert.equal(common.details.timeConsumedSeconds,600);
    assert.ok(common.details.purchasedCount>0);
    assert.deepEqual(common.world,old.world,'market-buy drift: '+itemId);
    assert.equal(start.shops[0].item[itemId-1],0);
    assert.equal(common.world.market.wholesale[itemId-1],
      start.market.wholesale[itemId-1]-common.details.purchasedCount);
    assert.equal(common.world.shops[0].paytoday,
      start.shops[0].paytoday+common.details.totalPaid);
  }
  assert.equal(encodeMemorySnapshot(repository.read()),encodeMemorySnapshot(start));
});

test('R2 sequential common purchases use the same memory CAS adapter and preserve all three stocks',()=>{
  const {repository,act}=seed();
  const first=repository.read(),money=first.shops[0].money;
  let spent=0;
  for(const [id,,getQuote] of mappings){
    const quote=getQuote(repository.read());
    const result=act('market-buy',{
      shopId:1,itemId:id,requestedCount:1,
      marketShelf:quote.shelf,expectedPrice:quote.price,
    });
    assert.ok(result.ok,JSON.stringify(result.details));
    spent+=result.details.totalPaid;
    assert.equal(result.world.shops[0].item[id-1],1);
  }
  const end=repository.read();
  assert.equal(end.revision,first.revision+3);
  assert.equal(end.shops[0].money,money-spent);
  assert.equal(end.shops[0].paytoday,spent);
  assert.equal(end.shops[0].time,first.shops[0].time+1800);
  assert.equal(end.market.sourceWriteShape,'whole-store-79');
  assert.equal(end.market.originalWholesaleCsv.split(',').length,79);
  const stale=apply(end,{...buyCommand(first,10,mappings[0][2](first)),
    expectedRevision:first.revision});
  assert.equal(stale.code,'REVISION_CONFLICT');
  assert.deepEqual(stale.world,end);
});

test('R2 no stock, zero cash, carrying cap, stale shelf/price and unsupported item fail without world mutations',()=>{
  const empty=seed({withSupply:false}).repository.read();
  const zero=apply(empty,{kind:'market-buy',
    expectedRevision:empty.revision,shopId:1,itemId:10,
    requestedCount:1,marketShelf:0,expectedPrice:5000});
  assert.equal(zero.code,'SOURCE_BOUNDARY_REJECTED');
  assert.deepEqual(zero.world,empty);
  const {repository}=seed(),start=repository.read();
  const q=street.quoteMarketItem10(start);
  for(const extra of [
    {requestedCount:0},{requestedCount:-1},
    {marketShelf:q.shelf+1},{expectedPrice:q.price-1},
    {itemId:999},{itemId:79},{shopId:2},{skipCallbacks:true},
  ]){
    const command={...buyCommand(start,10,q),...extra};
    const r=apply(start,command);
    assert.equal(r.ok,false,JSON.stringify(extra));
    assert.deepEqual(r.world,start);
  }
  for(const changed of [
    {...start.shops[0],money:0},
    {...start.shops[0],item:start.shops[0].item.map((x,i)=>i===9?20:x)},
  ]){
    const state={...start,shops:[changed]};
    const r=apply(state,buyCommand(state,10,q));
    assert.equal(r.code,'SOURCE_BOUNDARY_REJECTED');
    assert.deepEqual(r.world,state);
  }
  // A fractional command cannot cross the WorldState JSON/CAS boundary,
  // which rejects it before the source-specific action handler.
  assert.throws(()=>apply(start,{
    ...buyCommand(start,10,q),requestedCount:1.5,
  }),/non-safe JSON number/);
  assert.equal(encodeMemorySnapshot(repository.read()),encodeMemorySnapshot(start));
});

test('R2 money/limit clamp is source-equivalent and an unreviewed FUNCBUY is not silently skipped',()=>{
  const original=seed().repository.read(),q=street.quoteMarketItem10(original);
  const withCash={...original,shops:[{...original.shops[0],money:5500}]};
  const bought=apply(withCash,buyCommand(withCash,10,q,99));
  assert.ok(bought.ok,JSON.stringify(bought.details));
  assert.equal(bought.details.purchasedCount,1);
  assert.equal(bought.details.totalPaid,5000);
  const capped={...original,shops:[{
    ...original.shops[0],
    item:original.shops[0].item.map((n,i)=>i===9?19:n),
  }]};
  const r=apply(capped,buyCommand(capped,10,q,99));
  assert.ok(r.ok);
  assert.equal(r.details.purchasedCount,1);
  const unsafeStreet={...street,marketBuy:{
    ...street.marketBuy,
    getRule(id){const found=street.marketBuy.getRule(id);
      return found&&{...found,buyCallback:'unreviewed-perl'};},
  }};
  const refused=apply(original,buyCommand(original,10,q),unsafeStreet);
  assert.equal(refused.code,'SOURCE_BOUNDARY_REJECTED');
  assert.match(refused.details.reason,/FUNCBUY/);
  assert.deepEqual(refused.world,original);
});

test('R1 trusted callback hook occurs after account transfer and before SetWholeStore; missing hook rejects',()=>{
  const world=seed().repository.read(),quote=street.quoteMarketItem10(world);
  const stages=[];
  const adapter={...street.marketBuy,
    getRule(id){
      const original=street.marketBuy.getRule(id);
      return original&&{...original,buyCallback:'synthetic-reviewed-test-hook'};
    },
    runBuyCallback({key,shop,wholesale,receipt}){
      assert.equal(key,'synthetic-reviewed-test-hook');
      assert.equal(shop.money,world.shops[0].money-5000);
      assert.equal(shop.item[9],world.shops[0].item[9]+1);
      assert.equal(wholesale[9],world.market.wholesale[9]-1);
      assert.equal(receipt.totalPaid,5000);
      stages.push('after-accounting');
      return {shop:{...shop,rank:shop.rank+1},wholesale};
    },
    writeMarket(input){
      stages.push('before-wholesale-write');
      return street.marketBuy.writeMarket(input);
    },
  };
  const result=apply(world,buyCommand(world,10,quote),
    {...street,marketBuy:adapter});
  assert.ok(result.ok,JSON.stringify(result.details));
  assert.deepEqual(stages,['after-accounting','before-wholesale-write']);
  assert.equal(result.world.shops[0].rank,world.shops[0].rank+1);
  assert.equal(world.shops[0].rank+1,result.world.shops[0].rank);
});

test('R2 original 72-hour stored-time cap and future shop clock reject without committing',()=>{
  const world=seed().repository.read(),quote=street.quoteMarketItem10(world);
  const overCap={...world,shops:[{
    ...world.shops[0],time:world.nowSeconds-259201,
  }]};
  const result=apply(overCap,buyCommand(overCap,10,quote));
  assert.ok(result.ok,JSON.stringify(result.details));
  assert.equal(result.world.shops[0].time,world.nowSeconds-259200+600);
  const future={...world,shops:[{
    ...world.shops[0],time:world.nowSeconds+1,
  }]};
  const rejected=apply(future,buyCommand(future,10,quote));
  assert.equal(rejected.code,'SOURCE_BOUNDARY_REJECTED');
  assert.deepEqual(rejected.world,future);
});

test('R2 actual two-generation local save and load round-trips the same shared commands',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'akimono-r2-market-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const {repository,act}=seed(),store=createLocalWorldSaveStore({directory});
  let generation=0;
  for(const [id,,getQuote] of mappings){
    const q=getQuote(repository.read());
    const r=act('market-buy',{shopId:1,itemId:id,
      requestedCount:1,marketShelf:q.shelf,expectedPrice:q.price});
    assert.ok(r.ok,JSON.stringify(r.details));
    const saved=store.save(repository.read(),{expectedGeneration:generation});
    generation=saved.generation;
    const restored=store.load();
    assert.equal(restored.generation,generation);
    assert.equal(encodeMemorySnapshot(restored.world),
      encodeMemorySnapshot(repository.read()));
  }
  assert.equal(generation,3);
  // The source PLUS fixture may have sold out all supported goods; loading
  // must still permit the real original shop to continue with an action.
  const restored=createMemoryWorldAdapter(store.load().world);
  const next=executeMemoryCommand({repository:restored,streetModule:street,
    command:{kind:'edit-showcase',expectedRevision:restored.read().revision,
      shopId:1,shelf:0,itemId:10,per:100,priceOverride:5000}});
  assert.ok(next.ok,JSON.stringify(next.details));
  assert.equal(next.world.revision,repository.read().revision+1);
  assert.equal(next.world.shops[0].showcase[0],10);
});


test('R2-A original Perl buy-s.cgi direct oracle: three items x twelve cases, original wholesale CSV and time',()=>{
  const oracle=JSON.parse(execFileSync('perl',['original-r2a-market-buy-oracle.pl'],{
    cwd:join(root,'modern/tests/original-perl'),encoding:'utf8',
  }));
  assert.match(oracle.source,/fixed buy-s.cgi/);
  assert.equal(oracle.nowSeconds,897400);
  assert.equal(oracle.cases.length,36);
  assert.deepEqual(oracle.callbackStages,[
    'item-init','global-after-account','item-after-global',
    'source-market-write',
  ],'actual frozen buy-s.cgi must call item init, global FUNCBUY, item FUNCBUY, SetWholeStore in order');
  const supplied=seed().repository.read();
  const empty=seed({withSupply:false}).repository.read();
  for(const c of oracle.cases){
    const baseline=c.case==='no-stock'?empty:supplied;
    const shop={...baseline.shops[0],item:[...baseline.shops[0].item]};
    if(c.case==='cash-clamp')shop.money=c.price+500;
    if(c.case==='zero-money')shop.money=0;
    const limit=street.marketBuy.getRule(c.itemId).stockLimit;
    if(c.case==='limit-clamp')shop.item[c.itemId-1]=limit-1;
    if(c.case==='limit-reject')shop.item[c.itemId-1]=limit;
    if(c.case==='time-cap')shop.time=baseline.nowSeconds-259201;
    if(c.case==='future-clock')shop.time=baseline.nowSeconds+1;
    const world={...baseline,shops:[shop]};
    const before=encodeMemorySnapshot(world);
    const result=apply(world,{
      kind:'market-buy',expectedRevision:world.revision,
      shopId:1,itemId:c.itemId,requestedCount:c.requestedCount,
      marketShelf:c.marketShelf,expectedPrice:c.expectedPrice,
    });
    const label=c.itemId+'/'+c.case;
    assert.equal(result.ok,c.accepted,label+': direct Perl acceptance');
    assert.equal(encodeMemorySnapshot(world),before,label+': input immutability');
    if(!c.accepted){
      assert.equal(result.code,'SOURCE_BOUNDARY_REJECTED',label);
      assert.deepEqual(result.world,world,label+': refused purchase is atomic');
      assert.equal(c.commits,0,label+': original Perl refused commit');
      continue;
    }
    assert.equal(result.code,'APPLIED',label);
    assert.equal(c.commits,1,label+': original Perl committed once');
    assert.equal(c.writes,1,label+': original Perl wrote once');
    assert.equal(result.details.purchasedCount,c.count,label+': CheckCount/stock/cash clamp');
    assert.equal(result.world.shops[0].money,c.money,label+': cash');
    assert.equal(result.world.shops[0].paytoday,c.paytoday,label+': daily payments');
    assert.equal(result.world.shops[0].item[c.itemId-1],c.stock,label+': item');
    assert.equal(result.world.shops[0].time,c.time,label+': GetTimeDeal/UseTime');
    assert.equal(result.world.market.wholesale[c.itemId-1],c.marketStock,label+': wholesale');
    assert.equal(result.world.market.originalWholesaleCsv,c.wholesaleCsv,label+': exact SetWholeStore sparse wire');
    assert.deepEqual(result.world.market.sparseWrittenSlots,c.sparseWrittenSlots,
      label+': exact original defined slots');
    assert.equal(result.world.revision,world.revision+1,label+': single CAS revision');
    assert.deepEqual(c.stages,[
      'item-init','global-after-account','source-market-write',
    ],label+': source global exists and is harmless below 500000');
  }
});

test('R2-A pins nonempty original @@FUNCBUY, fails closed when its voucher source changes',()=>{
  const global=street.marketBuy.globalBuyCallback;
  assert.deepEqual(global,{
    key:'standard-street-global-wholesale-voucher',
    source:'custom/inc-item-data.cgi:3369',
    minTotal:500000,
  });
  assert.match(src.itemDsl,/\@\@FUNCBUY[\s\S]*?int \$price\/500000;/);
  assert.ok(street.marketBuy.getRule(10).stockLimit*5000<global.minTotal);
  assert.ok(street.marketBuy.getRule(11).stockLimit*2000<global.minTotal);
  assert.ok(street.marketBuy.getRule(14).stockLimit*10000<global.minTotal);
  assert.throws(()=>createStandardStreetModule({
    ...src,itemDsl:src.itemDsl.replace(
      'my $count=int $price/500000;',
      'my $count=int $price/100;',
    ),
  }),/FUNCBUY/);
  const world=seed().repository.read(),q=street.quoteMarketItem10(world);
  const withoutReview={...street,marketBuy:{...street.marketBuy,
    globalBuyCallback:undefined}};
  const denied=apply(world,buyCommand(world,10,q),withoutReview);
  assert.equal(denied.code,'SOURCE_BOUNDARY_REJECTED');
  assert.deepEqual(denied.world,world);
});

test('R2-A global-before-item source lifecycle: accounted amounts visible and unreviewed effect rejects',()=>{
  const world=seed().repository.read(),q=street.quoteMarketItem10(world);
  const noHandler={...street,marketBuy:{
    ...street.marketBuy,
    globalBuyCallback:{...street.marketBuy.globalBuyCallback,minTotal:1},
  }};
  const reject=apply(world,buyCommand(world,10,q),noHandler);
  assert.equal(reject.code,'SOURCE_BOUNDARY_REJECTED');
  assert.match(reject.details.reason,/global FUNCBUY/);
  assert.deepEqual(reject.world,world);
  const stages=[];
  const adapter={...street.marketBuy,
    globalBuyCallback:{...street.marketBuy.globalBuyCallback,minTotal:1},
    getRule(id){
      const rule=street.marketBuy.getRule(id);
      return rule&&{...rule,buyCallback:'reviewed-item-hook-fixture'};
    },
    runBuyCallback({key,phase,shop,wholesale,receipt}){
      assert.equal(shop.money,world.shops[0].money-5000);
      assert.equal(shop.item[9],world.shops[0].item[9]+1);
      assert.equal(wholesale[9],world.market.wholesale[9]-1);
      assert.equal(receipt.totalPaid,5000);
      stages.push(phase);
      if(phase==='global'){
        assert.equal(key,'standard-street-global-wholesale-voucher');
        return {shop:{...shop,rank:shop.rank+1},wholesale};
      }
      assert.equal(phase,'item');
      assert.equal(key,'reviewed-item-hook-fixture');
      assert.equal(shop.rank,world.shops[0].rank+1);
      return {shop:{...shop,rank:shop.rank+1},wholesale};
    },
    writeMarket(input){
      stages.push('market-write');
      return street.marketBuy.writeMarket(input);
    },
  };
  const result=apply(world,buyCommand(world,10,q),{
    ...street,marketBuy:adapter,
  });
  assert.ok(result.ok,JSON.stringify(result.details));
  assert.deepEqual(stages,['global','item','market-write']);
  assert.equal(result.world.shops[0].rank,world.shops[0].rank+2);
  assert.equal(world.shops[0].rank+2,result.world.shops[0].rank);
});


test('R2-B registry compiles ordinary ITEM #39 without a per-item buy program',()=>{
  const registry=street.marketBuyRegistry;
  assert.equal(registry.entries.length,79);
  assert.deepEqual(registry.order.map(x=>x.itemId),street.catalog.items.map(x=>x.id));
  for(const id of [10,11,39]){
    const row=registry.describe(id),rule=street.marketBuy.getRule(id);
    assert.equal(row.classification,'common-static');
    assert.equal(rule.itemId,id);
    assert.equal(rule.shopIndex,id-1);
    assert.equal(rule.wholesaleIndex,id-1);
    assert.equal(rule.buyCallback,null);
    assert.equal(rule.stockLimit,street.reviewedGiftMapUse.limits[id-1].limit);
    assert.equal(rule.marketTimeSeconds,600);
    assert.match(rule.source,/custom\/inc-item-data.cgi:\\d+/);
  }
  const item39=registry.describe(39);
  assert.equal(item39.itemCode,'book-kaitai');
  assert.equal(item39.itemName,'拆解/打包工具');
  assert.equal(item39.sourceLine,266);
  assert.equal(item39.basePrice,500);
  assert.equal(item39.stockLimit,10);
  assert.equal(item39.wholesaleLimit,3);
  assert.equal(registry.describe(1).classification,'dynamic-price');
  assert.match(registry.describe(1).reason,/BASE.*1682/);
  assert.equal(street.marketBuy.getRule(1),null);
  assert.equal(registry.describe(14).classification,'legacy-r2a-price-incomplete');
  assert.match(registry.describe(14).reason,/BASE 50\/150/);
  assert.equal(registry.describe(79).classification,'unsupported');
  assert.match(registry.describe(79).reason,/wholesale cap is zero/);
  assert.equal(street.marketBuy.getRule(79),null);
});

test('R2-B new original ordinary ITEM #39 executes shared market-buy with exact real Perl transaction evidence',()=>{
  const oracle=JSON.parse(execFileSync('perl',['original-r2b-market-buy39-probe.pl'],{
    cwd:join(root,'modern/tests/original-perl'),encoding:'utf8',
  }));
  assert.equal(oracle.itemId,39);
  assert.equal(oracle.cases.length,3);
  const market=seed().repository.read();
  const itemId=39,rule=street.marketBuy.getRule(itemId);
  const place=street.marketBuy.order.findIndex(row=>row.itemId===itemId);
  const shelf=street.marketBuy.order.slice(0,place)
    .filter(row=>market.market.wholesale[row.wholesaleIndex]>0).length;
  assert.ok(market.market.wholesale[38]>0,'real PLUS must supply item #39');
  const baseline=encodeMemorySnapshot(market);
  for(const row of oracle.cases){
    const shop={...market.shops[0],money:row.case==='zero-money'?0:market.shops[0].money};
    const world={...market,shops:[shop]};
    const command={kind:'market-buy',expectedRevision:world.revision,
      shopId:1,itemId,requestedCount:row.requestedCount,
      marketShelf:shelf,expectedPrice:rule.unitPrice+(row.case==='stale-price'?1:0)};
    assert.equal(row.marketShelf,shelf,'original Perl source sort shelf');
    assert.equal(row.expectedPrice,command.expectedPrice,'original Perl quote');
    const result=apply(world,command);
    assert.equal(result.ok,row.accepted,row.case);
    if(!row.accepted){
      assert.equal(result.code,'SOURCE_BOUNDARY_REJECTED');
      assert.deepEqual(result.world,world);
      assert.equal(row.commits,0);
      continue;
    }
    assert.equal(row.commits,1);
    assert.equal(row.writes,1);
    assert.equal(result.details.purchasedCount,row.purchasedCount);
    assert.equal(result.world.shops[0].money,row.money);
    assert.equal(result.world.shops[0].paytoday,row.paytoday);
    assert.equal(result.world.shops[0].item[38],row.stock);
    assert.equal(result.world.shops[0].time,row.time);
    assert.equal(result.world.market.wholesale[38],row.marketStock);
    assert.equal(result.world.market.originalWholesaleCsv,row.wholesaleCsv);
    assert.deepEqual(result.world.market.sparseWrittenSlots,row.sparseWrittenSlots);
    assert.equal(result.world.market.originalWholesaleCsv.split(',').length,79);
    assert.deepEqual(row.stages,[
      'item-init','global-after-account','source-market-write',
    ]);
  }
  assert.equal(encodeMemorySnapshot(market),baseline,'CAS source input unchanged');
  const rejected=apply(market,{...buyCommand(market,39,{shelf,price:500}),
    itemId:1});
  assert.equal(rejected.code,'SOURCE_BOUNDARY_REJECTED');
  assert.match(rejected.details.reason,/BASE/);
  assert.deepEqual(rejected.world,market);
});
