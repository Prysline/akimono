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
    {rule:{...rule,unitPrice:1300}},
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
