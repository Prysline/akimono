import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createStandardStreetModule}
  from '../src/standard-street-module.mjs';
import {projectSharedNaturalSale}
  from '../src/shared-natural-sale-core.mjs';
import {createMemoryWorld,createMemoryWorldAdapter,executeMemoryCommand}
  from '../src/game-core-contract.mjs';
import {projectOriginalSparseAllPlus}
  from '../src/original-sparse-all-plus.mjs';

import {R3_ITEM_CALLBACK_STAGE,projectR3ItemCallbackStage}
  from '../src/r3-reviewed-item-callback-stage.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const paths=[
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
  ['originalUseSource','modern/tests/original-perl/use.cgi'],
  ['originalItemHelperSource','modern/tests/original-perl/core-inc-item.cgi'],
];
const source=Object.fromEntries(await Promise.all(paths.map(
  async ([k,p])=>[k,await readFile(path.join(root,p),'utf8')])));
const street=createStandardStreetModule(source);
const oracle=JSON.parse(execFileSync('perl',
  ['original-r3-shared-sale-probe.pl'],{
    cwd:path.join(root,'modern/tests/original-perl'),
    encoding:'utf8',
  }));
test('R3 original Perl executable arithmetic covers six ITEMS and four original-stock/display boundaries',()=>{
  assert.equal(oracle.cases.length,24);
  assert.deepEqual([...new Set(oracle.cases.map(x=>x.itemId))],
    [10,40,41,42,43,44]);
  assert.equal(street.reviewedB41.saleRules[42].point,800,
    'Original GetNumber(80%) is 800, not 80% of source POP-derived POINT');
  assert.equal(street.reviewedB41.saleRules[43].point,700);
  assert.equal(street.reviewedB41.saleRules[44].point,600);
});
for(const original of oracle.cases){
  test('R3 real Perl inc-turn/market vs ONE GameCore calculator: #'+
    original.itemId+' stock '+original.originalStock+
    (original.displayed?' shown':' not shown'),()=>{
    const id=original.itemId;
    const rule=street.reviewedB41.saleRules[id];
    assert.equal(rule.unitPrice,original.originalPrice);
    assert.equal(rule.popularSeconds,original.originalPopular);
    assert.equal(rule.point,original.originalPoint);
    assert.equal(rule.cost,original.originalCost);
    const item=Array(79).fill(0);
    item[id-1]=original.originalStock;
    item[62]=1;item[78]=5;
    const shop={
      id:1,status:1,rank:5010,money:100000,
      item,showcasecount:1,
      showcase:[original.displayed?id:0],
      price:[original.displayed?original.originalPrice:0],
      trush:0,saletoday:0,taxtoday:0,costtoday:0,
      itemtoday:{},itemyesterday:{},taxmode:0,
    };
    const before=JSON.stringify(shop);
    const computed=projectSharedNaturalSale({
      shop,rule:original.displayed?rule:null,
      upkeepCosts:street.reviewedB41.upkeepCosts,
      spanSeconds:1800,randomDraws:original.consumedSamples,
    });
    assert.equal(JSON.stringify(shop),before,'pure projection must not mutate source state');
    const actual=computed.shop;
    assert.equal(computed.sold,original.saleCount);
    assert.equal(actual.item[id-1],original.stockAfter);
    assert.equal(actual.money,original.money);
    assert.equal(actual.rank,original.rank);
    assert.equal(actual.trush,original.trush);
    assert.equal(actual.saletoday,original.saletoday);
    assert.ok(Math.abs(actual.costtoday-original.costtoday)<1e-9);
    assert.equal(actual.temprank,original.temprank);
    assert.equal(actual.itemtoday[id]??0,original.saleCount);
    assert.equal(actual._sale_count_[id]?.count??0,original.saleRecordCount);
    assert.ok(computed.drawsUsed<=original.randomDrawsUsed);
    assert.equal(actual.taxtoday,original.taxtoday);
  });
}
test('R3 shared calculator fails closed on unknown price, missing draw, overflow, and source rule without modifying input',()=>{
  const rule=street.reviewedB41.saleRules[40];
  const item=Array(79).fill(0);item[39]=10;item[62]=1;item[78]=5;
  const shop={item,showcase:[40],price:[1200],rank:5010,money:100000,
    trush:0,saletoday:0,costtoday:0,itemtoday:{}};
  const before=JSON.stringify(shop);
  const arg={shop,rule,upkeepCosts:street.reviewedB41.upkeepCosts,
    spanSeconds:1800,randomDraws:[500000,0,0,0]};
  for(const change of [
    {randomDraws:[]},
    {rule:{...rule,unitPrice:0}},
    {rule:{...rule,popularSeconds:0}},
    {shop:{...shop,money:Number.MAX_SAFE_INTEGER}},
    {shop:{...shop,item:[...item.slice(0,39),-1,...item.slice(40)]}},
  ]){
    assert.throws(()=>projectSharedNaturalSale({...arg,...change}));
    assert.equal(JSON.stringify(shop),before);
  }
});

test('R3 original #70 FUNCTURN has no eligible owners but still consumes 1-minute rand(1)',()=>{
  const reviewed=street.reviewedB41.itemCallbacks;
  assert.equal(reviewed.source,R3_ITEM_CALLBACK_STAGE);
  assert.deepEqual(reviewed.turnIds,[70]);
  assert.deepEqual(reviewed.saleIds,[]);
  const item=Array(79).fill(0);item[62]=1;item[78]=5;item[40]=2;
  const shop={item,showcase:[41],price:[1500],rank:5010};
  const before=JSON.stringify(shop);
  for(const [span,used] of [[60,1],[86,1],[87,0],[1800,0]]){
    const result=projectR3ItemCallbackStage({
      reviewed,shop,spanSeconds:span,randomDraws:[500000],
    });
    assert.deepEqual(result.itemTurnDispatched,[70]);
    assert.equal(result.drawsUsed,used);
    assert.equal(result.itemTurnAffectedShops,0);
    assert.equal(result.itemSaleCallbackCount,0);
    assert.equal(JSON.stringify(shop),before);
  }
  assert.throws(()=>projectR3ItemCallbackStage({
    reviewed,shop,spanSeconds:60,randomDraws:[],
  }),/rand\(1\)/);
  const artificial=[...item];artificial[69]=1;
  assert.throws(()=>projectR3ItemCallbackStage({
    reviewed,shop:{...shop,item:artificial},spanSeconds:1800,randomDraws:[],
  }),/stocked ITEM #70/);
});
test('R3 ITEM callback source declaration and inc-turn dispatch edits are refused',()=>{
  assert.throws(()=>createStandardStreetModule({...source,
    itemDsl:source.itemDsl.replace('funct\t_local_','funct\tother_'),
  }),/FUNCT|callback|source/);
  assert.throws(()=>createStandardStreetModule({...source,
    itemDsl:source.itemDsl.replace('funct\t_local_','funcs\t_local_'),
  }),/FUNCT|callback|source/);
  assert.throws(()=>createStandardStreetModule({...source,
    originalTurnSource:source.originalTurnSource.replace(
      'foreach(@DT){delete $_->{_sale_count_}}','foreach(@DT){}'),
  }),/drift|source/);
});

const perlCallbacks=JSON.parse(execFileSync('perl',
  ['original-r3-item-callback-stage-probe.pl'],{
    cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
  }));
test('R3 executable frozen original ITEM FUNCTURN/FUNCSALE dispatch matches no-owner Node callback projection',()=>{
  assert.equal(perlCallbacks.cases.length,7);
  const reviewed=street.reviewedB41.itemCallbacks;
  for(const original of perlCallbacks.cases){
    assert.equal(original.temporarySaleCountExists,false,
      'original FUNCSALE dispatcher must remove per-turn temporary sales');
    assert.equal(original.drawsUsed,original.span<86.4?1:0,
      'original #70 consumes rand(1) below the 86.4s source threshold');
    if(original.owned>0)continue; // real gameplay has no reviewed #70 source
    const stock=Array(79).fill(0);stock[62]=1;stock[78]=5;
    const shop={item:stock,rank:5010,showcase:[0],price:[0],
      _sale_count_:{10:{count:1,price:5000}}};
    const before=JSON.stringify(shop);
    const actual=projectR3ItemCallbackStage({
      reviewed,shop,spanSeconds:original.span,randomDraws:[original.draw],
    });
    assert.equal(actual.drawsUsed,original.drawsUsed);
    assert.equal(original.rankAfter,original.rankBefore);
    assert.equal(actual.itemTurnAffectedShops,0);
    assert.equal(actual.itemSaleCallbackCount,0);
    assert.equal(Object.hasOwn(actual.shop,'_sale_count_'),false);
    assert.equal(JSON.stringify(shop),before,'source stage must not mutate input');
  }
  const wouldAffect=perlCallbacks.cases.find(x=>x.name==='owned-shown-60-low');
  const wouldNotAffect=perlCallbacks.cases.find(x=>x.name==='owned-shown-60-high');
  assert.equal(wouldAffect.rankAfter,wouldAffect.rankBefore+1);
  assert.equal(wouldNotAffect.rankAfter,wouldNotAffect.rankBefore);
});

const priceOracle=JSON.parse(execFileSync('perl',
  ['original-r3-price-sale-probe.pl'],{
    cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
  }));
test('R3 frozen original natural-sale oracle has 24 price/ITEM cases',()=>{
  assert.equal(priceOracle.cases.length,24);
  assert.deepEqual([...new Set(priceOracle.cases.map(x=>x.percent))],
    [50,100,150,200]);
});
for(const sourcePrice of priceOracle.cases){
  test('R3 common source price '+sourcePrice.percent+'% ITEM #'+
    sourcePrice.itemId+' matches frozen Perl',()=>{
    const id=sourcePrice.itemId,stock=Array(79).fill(0);
    stock[id-1]=sourcePrice.initialStock;stock[62]=1;stock[78]=5;
    const shop={id:1,status:1,rank:5010,money:100000,item:stock,
      showcasecount:1,showcase:[id],price:[sourcePrice.listedPrice],
      trush:0,saletoday:0,taxtoday:0,costtoday:0,
      itemtoday:{},itemyesterday:{},taxmode:0};
    const prev=JSON.stringify(shop);
    const rule=street.reviewedB41.saleRules[id];
    assert.equal(rule.unitPrice,sourcePrice.standardPrice);
    const result=projectSharedNaturalSale({
      shop,rule,upkeepCosts:street.reviewedB41.upkeepCosts,
      spanSeconds:1800,randomDraws:sourcePrice.consumedSamples,
    });
    assert.equal(JSON.stringify(shop),prev,'pure sale never mutates shop');
    assert.equal(result.sold,sourcePrice.sold);
    assert.equal(result.shop.item[id-1],sourcePrice.stockAfter);
    assert.equal(result.shop.money,sourcePrice.money);
    assert.equal(result.shop.rank,sourcePrice.rank);
    assert.equal(result.shop.trush,sourcePrice.trush);
    assert.equal(result.shop.saletoday,sourcePrice.saletoday);
    assert.equal(result.shop.taxtoday,sourcePrice.taxtoday);
    assert.equal(result.shop.temprank,sourcePrice.temprank);
    assert.ok(Math.abs(result.shop.costtoday-sourcePrice.costtoday)<1e-9);
    assert.equal(result.shop._sale_count_[id]?.price??0,
      sourcePrice.salePriceRecord);
    assert.ok(result.drawsUsed<=sourcePrice.randomDrawsUsed);
  });
}

test('R3 sourced non-default percentage price and markup GetSaleTax drift must fail before GameCore',()=>{
  assert.throws(()=>createStandardStreetModule({...source,
    originalItemSource:source.originalItemSource.replace(
      '$taxrate=$taxrate*5 if $taxrate>0;',
      '$taxrate=$taxrate*4 if $taxrate>0;'),
  }),/source drift/);
  assert.throws(()=>createStandardStreetModule({...source,
    originalTurnSource:source.originalTurnSource.replace(
      '$rank/=($DT->{price}[$cnt]-$ITEM[$itemno]->{price})/10000 if $rank<1;',
      '$rank/=($DT->{price}[$cnt]-$ITEM[$itemno]->{price})/9000 if $rank<1;'),
  }),/source drift/);
});

const integratedOriginal=JSON.parse(execFileSync('perl',
 ['original-r3-integrated-priced-turn-probe.pl'],{
  cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
 }));
test('R3 24 direct frozen Perl natural+ITEM callback+PLUS source combinations',()=>{
 assert.equal(integratedOriginal.cases.length,24);
 assert.ok(integratedOriginal.cases.some(c=>c.span===60));
 assert.ok(integratedOriginal.cases.some(c=>c.percent===150));
});

const integratedRepository=createMemoryWorldAdapter(createMemoryWorld({
 worldId:'r3-integrated-source-math-fixture',streetId:'standard-street',
 nowSeconds:1000000,
}));
for(const [kind,revision,options] of [
 ['initialize-source-market',0,{}],
 ['open-shop',1,{shopId:1,ownerName:'原版整合測試',shopName:'R3價稅時間'}],
]){
 const done=executeMemoryCommand({
  repository:integratedRepository,streetModule:street,
  command:{kind,expectedRevision:revision,...options},
 });
 assert.equal(done.code,'COMMITTED',JSON.stringify(done.details));
}
const integratedBase=integratedRepository.read();
for(const original of integratedOriginal.cases){
 test('R3 fully ordered original one-shop pre-EVENT turn: #'+
   original.itemId+' '+original.percent+'% '+original.span+'s',()=>{
  const id=original.itemId;
  const item=Array(79).fill(0);item[id-1]=10;item[62]=1;item[78]=5;
  const shop={
   ...integratedBase.shops[0],rank:5010,money:100000,item,
   showcasecount:1,showcase:[id],price:[original.listedPrice],
   trush:0,saletoday:0,taxtoday:0,costtoday:0,
   itemtoday:{},itemyesterday:{},taxmode:0,
  };
  const world={...integratedBase,shops:[shop]};
  const before=JSON.stringify(world);
  const rule=street.reviewedB41.saleRules[id];
  assert.equal(rule.unitPrice,original.basePrice);
  const natural=projectSharedNaturalSale({
   shop,rule,upkeepCosts:street.reviewedB41.upkeepCosts,
   spanSeconds:original.span,randomDraws:original.draws,
  });
  const callback=projectR3ItemCallbackStage({
   reviewed:street.reviewedB41.itemCallbacks,shop:natural.shop,
   spanSeconds:original.span,
   randomDraws:original.draws.slice(natural.drawsUsed),
  });
  const plus=projectOriginalSparseAllPlus({
   world:{...world,shops:[callback.shop]},
   reviewed:street.reviewedAllPlus,
   compiled:street.reviewedGiftMapUse,
   timespanSeconds:original.span,
   randomDraws:original.draws.slice(natural.drawsUsed+callback.drawsUsed),
  });
  const final=plus.shops[0];
  assert.equal(JSON.stringify(world),before,'pre-EVENT stage must stay pure');
  assert.equal(natural.sold,original.sold);
  assert.equal(callback.drawsUsed,original.span===60?1:0);
  assert.equal(Object.hasOwn(final,'_sale_count_'),false);
  assert.equal(final.item[id-1],original.shopStock);
  assert.equal(final.money,original.money);
  assert.equal(final.rank,original.rank);
  assert.equal(final.trush,original.trush);
  assert.equal(final.saletoday,original.saletoday);
  assert.equal(final.taxtoday,original.taxtoday);
  assert.equal(final.temprank,original.temprank);
  assert.ok(Math.abs(final.costtoday-original.costtoday)<1e-9);
  assert.deepEqual(plus.market.wholesale,original.wholesale);
  assert.equal(natural.drawsUsed+callback.drawsUsed+
   plus.receipt.drawsUsed,original.drawsUsed);
 });
}

const twoShelfOracle=JSON.parse(execFileSync('perl',
  ['original-r3-multi-shelf-sale-probe.pl'],{
    cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
  }));
test('original frozen inc-turn two-shelf source oracle includes eight distinct source stock and order cases',()=>{
  assert.equal(twoShelfOracle.cases.length,8);
  assert.deepEqual(twoShelfOracle.cases.map(x=>x.name),[
    'same-item-different-direct-prices','two-swords-different-items',
    'mixed-book-and-sword','first-shelf-empty','second-shelf-empty',
    'same-item-one-stock','two-empty-shelves','reverse-shelf-order',
  ]);
});
for(const sourceRow of twoShelfOracle.cases){
  test('R3 two-shelf source Perl natural market and RNG: '+sourceRow.name,()=>{
    const item=Array(79).fill(0);
    for(const [id,stock] of Object.entries(sourceRow.startingStocks))
      item[Number(id)-1]=stock;
    item[62]=0;item[78]=5;
    const shop={
      id:1,status:1,rank:5010,money:80000,paytoday:20000,
      item,showcasecount:2,showcase:[...sourceRow.shown],
      price:[...sourceRow.prices],trush:0,saletoday:0,
      taxtoday:0,costtoday:0,itemtoday:{},itemyesterday:{},taxmode:0,
    };
    const unchanged=JSON.stringify(shop);
    const computed=projectSharedNaturalSale({
      shop,rule:null,saleRules:street.reviewedB41.saleRules,
      upkeepCosts:street.reviewedB41.upkeepCosts,
      spanSeconds:1800,randomDraws:sourceRow.consumedSamples,
    });
    assert.equal(JSON.stringify(shop),unchanged,'source projector must be pure');
    const actual=computed.shop;
    for(const id of [10,40,41]){
      assert.equal(actual.item[id-1],sourceRow.stockAfter[id],
        'post-sale ITEM '+id);
      assert.equal(actual.itemtoday[id]??0,sourceRow.soldByItem[id],
        'source sale ITEM '+id);
      assert.equal(actual._sale_count_[id]?.count??0,
        sourceRow.saleRecordCounts[id],'original shared sale log ITEM '+id);
      assert.equal(actual._sale_count_[id]?.price??0,
        sourceRow.saleRecordGross[id],'original gross log ITEM '+id);
    }
    for(const key of ['money','rank','temprank','trush',
      'saletoday','taxtoday'])
      assert.equal(actual[key],sourceRow[key],
        'original source '+key+' '+sourceRow.name);
    assert.ok(Math.abs(actual.costtoday-sourceRow.costtoday)<1e-9);
    assert.equal(computed.drawsUsed,sourceRow.naturalDrawsUsed,
      'exact frozen inc-turn natural draws must match before 59 PLUS');
    assert.ok(sourceRow.drawsUsed>=computed.drawsUsed,
      'original PLUS source shares the remaining random stream');
  });
}
test('two-shelf shared natural sale refuses unreviewed third shelf, unknown ITEM and EVENT override',()=>{
  const item=Array(79).fill(0);item[39]=10;item[78]=5;
  const shop={item,rank:5010,money:80000,showcasecount:2,
    showcase:[40,40],price:[1200,1200],
    trush:0,saletoday:0,taxtoday:0,costtoday:0,itemtoday:{}};
  const base={shop,rule:null,saleRules:street.reviewedB41.saleRules,
    upkeepCosts:street.reviewedB41.upkeepCosts,
    spanSeconds:1800,randomDraws:Array(121).fill(0)};
  for(const delta of [
    {shop:{...shop,showcasecount:3,showcase:[40,40,40],price:[1200,1200,1200]}},
    {shop:{...shop,showcase:[40,999]}},
    {popularOverride:5400},
    {saleRules:{}},
  ])assert.throws(()=>projectSharedNaturalSale({...base,...delta}),
      /R3 shared natural-sale/);
});
