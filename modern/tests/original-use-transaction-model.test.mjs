import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {projectOriginalUseTransaction} from '../src/original-use-transaction-model.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const pinned=await Promise.all([
  'modern/tests/original-perl/use.cgi',
  'modern/tests/original-perl/calc.cgi',
].map(p=>readFile(path.join(root,p),'utf8')));
const [useSource,calcSource]=pinned;
const items=()=>[
  {code:true,limit:10,wslimit:8},
  {code:true,limit:6,wslimit:-10},
  {code:false,limit:5,wslimit:1},
];
const fixture=()=>({
  shops:[[8,4,3],[3,4,2]],actingShopIndex:0,
  items:items(),wholesale:[4,0,-5],
  uses:[
    {itemId:1,countPerUse:2,probabilityPermille:1000},
    {itemId:2,countPerUse:1,probabilityPermille:0},
  ],
  creates:[
    {itemId:1,countPerUse:5,probabilityPermille:1000},
    {itemId:2,countPerUse:4,probabilityPermille:1000},
    {itemId:1,countPerUse:2,probabilityPermille:1000},
    {itemId:3,countPerUse:2,probabilityPermille:1000},
  ],
  requestedCount:4,experience:200,needExperience:100,
  experienceOld:null,job:'worker',needJob:'worker',
  point:10,needPoint:10,rank:20,needPopularity:10,
  needsEvent:true,eventActive:true,money:70,costPerUse:20,
  paytoday:5,nowSeconds:1000,storedTimeSeconds:950,
  baseUseTimeSeconds:20,trainedUseTimeSeconds:10,
  maxStockTimeSeconds:259200,shopStatus:true,
});
const run=overrides=>projectOriginalUseTransaction({...fixture(),...overrides});
function replay(values){
  let n=0;
  return ()=>{if(n>=values.length)throw Error('unexpected RNG call');return values[n++];};
}

test('B-23 source evidence: original gate, accounting, materials, outputs, wholesale order',()=>{
  const start=useSource.indexOf('#熟練度不足で作業不可能');
  const money=useSource.indexOf('#費用不足でcountを補正',start);
  const time=useSource.indexOf('#時間不足でcountを補正',money);
  const material=useSource.indexOf('#材料不足でcountを補正',time);
  const settled=useSource.indexOf('$USE->{result}->{count}=$count',material);
  const spend=useSource.indexOf('UseTime($usetime*$count)',settled);
  const goods=useSource.indexOf('#アイテム消費',spend);
  const create=useSource.indexOf('#アイテム取得',goods);
  const check=useSource.indexOf('CheckWholeStore();',create);
  const callback=useSource.indexOf("RequireFile('inc-item.cgi');",check);
  assert.ok(start>=0&&start<money&&money<time&&time<material&&material<settled
    &&settled<spend&&spend<goods&&goods<create&&create<check&&check<callback);
  assert.ok(useSource.slice(settled,spend).includes('return if !$count'));
  assert.equal(useSource.slice(goods,callback).match(/CheckWholeStore\(\);/g)?.length,1);
});
test('B-23 pinned calc source applies expold before per-use time and caps late',()=>{
  assert.ok(calcSource.includes('$USE->{result}->{expold}ne'));
  assert.ok(calcSource.includes('return $USE->{time}-int(($USE->{time}-$USE->{exptime})*$exp/1000)'));
  assert.ok(calcSource.includes('$DT->{time}=$NOW_TIME-$MAX_STOCK_TIME if $tmp>$MAX_STOCK_TIME'));
});
test('B-23 full fixture: count2, charged40, time36, repeated products and capped market',()=>{
  const r=run();
  assert.equal(r.count,2);
  assert.equal(r.useTimeSeconds,18);
  assert.equal(r.timeSpentSeconds,36);
  assert.equal(r.moneySpent,40);
  assert.equal(r.money,30);
  assert.equal(r.paytoday,45);
  assert.equal(r.storedTimeSeconds,986);
  assert.deepEqual(r.shops,[[10,6,5],[3,4,2]]);
  assert.deepEqual(r.wholesale,[3,0,-3]);
  assert.deepEqual(r.multiItem.added,[
    {itemId:1,amount:6},{itemId:2,amount:2},
    {itemId:1,amount:0},{itemId:3,amount:2},
  ]);
  assert.deepEqual(r.multiItem.marketAfterOverflow,[12,6,-3]);
  assert.equal(r.wholeStoreChecks,1);
});
test('B-23 source-compatible preflight order: money caps to 3 then time caps to 2',()=>{
  const r=run();
  assert.deepEqual(r.gateSteps.map(x=>x.step),[
    'experience','job','point','popularity','event','money','time',
    'material:1','material:2',
  ]);
  assert.deepEqual(r.gateSteps.map(x=>x.count),[4,4,4,4,4,3,2,2,2]);
});
test('B-23 zero count returns BEFORE initialization and wholesale check',()=>{
  const r=run({money:10,wholesale:[99,99,-5]});
  assert.equal(r.count,0);
  assert.equal(r.performed,false);
  assert.equal(r.wholeStoreChecks,0);
  assert.equal(r.multiItem,null);
  assert.deepEqual(r.wholesale,[99,99,-5]);
  assert.equal(r.money,10);
  assert.equal(r.storedTimeSeconds,950);
  assert.deepEqual(r.shops,[[8,4,3],[3,4,2]]);
});
test('B-23 experience gate zero blocks all later spending and production',()=>{
  const r=run({needExperience:201});
  assert.equal(r.count,0);assert.equal(r.performed,false);
});
test('B-23 job gate zero',()=>{
  assert.equal(run({needJob:'other'}).count,0);
});
test('B-23 point gate zero',()=>{
  assert.equal(run({needPoint:11}).count,0);
});
test('B-23 popularity gate zero',()=>{
  assert.equal(run({needPopularity:21}).count,0);
});
test('B-23 event gate zero',()=>{
  assert.equal(run({eventActive:false}).count,0);
});
test('B-23 time preflight may be the limiting resource',()=>{
  const r=run({money:500,storedTimeSeconds:981});
  assert.equal(r.count,1);
  assert.equal(r.storedTimeSeconds,999);
});
test('B-23 material preflight may be the limiting resource',()=>{
  const r=run({money:500,storedTimeSeconds:800,shops:[[3,4,3],[3,4,2]]});
  assert.equal(r.count,1);
  assert.deepEqual(r.multiItem.consumed,[{itemId:1,amount:2}]);
});
test('B-23 probability zero still checks ONE material unit in original gate',()=>{
  const r=run({shops:[[8,0,3],[3,4,2]]});
  assert.equal(r.count,0);
  assert.equal(r.performed,false);
  assert.equal(r.gateSteps.at(-1).step,'material:2');
});
test('B-23 material with probability zero does not consume RNG or inventory',()=>{
  const r=run();
  assert.deepEqual(r.multiItem.consumed,[{itemId:1,amount:4}]);
  assert.equal(r.randomDraws,0);
});
test('B-23 repeated material preflight does NOT aggregate original requirements',()=>{
  const r=run({requestedCount:1,uses:[
    {itemId:1,countPerUse:6,probabilityPermille:1000},
    {itemId:1,countPerUse:6,probabilityPermille:1000},
  ],creates:[]});
  assert.equal(r.count,1);
  assert.equal(r.shops[0][0],-4);
  assert.deepEqual(r.multiItem.consumed,[
    {itemId:1,amount:6},{itemId:1,amount:6},
  ]);
});
test('B-23 amount with zero cost does not divide by zero',()=>{
  const r=run({costPerUse:0,money:0});
  assert.equal(r.count,2);
  assert.equal(r.money,0);
  assert.equal(r.paytoday,5);
});
test('B-23 source late UseTime cap does not affect count already chosen',()=>{
  const r=run({nowSeconds:1000000,storedTimeSeconds:700000,requestedCount:1});
  assert.equal(r.count,1);
  assert.equal(r.storedTimeSeconds,740818);
});
test('B-23 inactive shop skips UseTime state update, not material or payment',()=>{
  const r=run({shopStatus:false,requestedCount:1});
  assert.equal(r.count,1);
  assert.equal(r.storedTimeSeconds,950);
  assert.equal(r.money,50);
  assert.deepEqual(r.multiItem.consumed,[{itemId:1,amount:2}]);
});
test('B-23 expold takes priority in GetItemUseTime',()=>{
  const r=run({experienceOld:1000,money:100});
  assert.equal(r.useTimeSeconds,10);
  assert.equal(r.count,4);
  assert.equal(r.storedTimeSeconds,990);
});
test('B-23 stochastic material draws before creation, shared RNG sequence',()=>{
  const r=run({requestedCount:1,uses:[
    {itemId:1,countPerUse:3,probabilityPermille:500},
  ],creates:[
    {itemId:2,countPerUse:20,probabilityPermille:500},
  ],random:replay([0,0.5,0,0.5,0.25])});
  assert.equal(r.randomDraws,5);
  assert.deepEqual(r.multiItem.samples.map(x=>[x.phase,x.draws,x.amount]),[
    ['consume',3,2],['create',2,12],
  ]);
  assert.equal(r.money,50);
});
test('B-23 probability-only B22 model retains its explicit stochastic RNG guard',()=>{
  assert.throws(()=>run({requestedCount:1,uses:[
    {itemId:1,countPerUse:3,probabilityPermille:500},
  ]}),/random/);
});
test('B-23 original future-time negative count is not silently converted to zero',()=>{
  assert.throws(()=>run({storedTimeSeconds:1019,requestedCount:1}),
    /Original UseTime: bad request/);
});
test('B-23 empty use/create still checks wholesale WHEN effective count > 0',()=>{
  const r=run({requestedCount:1,uses:[],creates:[],wholesale:[99,99,-5]});
  assert.equal(r.count,1);
  assert.deepEqual(r.wholesale,[5,2,-5]);
  assert.equal(r.wholeStoreChecks,1);
});
test('B-23 inputs unchanged and outputs are frozen',()=>{
  const raw=fixture();
  const before=structuredClone(raw);
  const r=projectOriginalUseTransaction(raw);
  assert.deepEqual(raw,before);
  assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.gateSteps));
  assert.ok(Object.isFrozen(r.shops)&&Object.isFrozen(r.shops[0]));
  assert.ok(Object.isFrozen(r.wholesale)&&Object.isFrozen(r.multiItem));
  assert.throws(()=>{r.shops[0][0]=8;},TypeError);
});
test('B-23 fixture shape errors do not change or normalize original numeric formula',()=>{
  assert.throws(()=>run({requestedCount:-1}),/Unrepresentable/);
  assert.throws(()=>run({costPerUse:-10}),/Negative fixture/);
  assert.throws(()=>run({actingShopIndex:5}),/Acting shop/);
  assert.throws(()=>run({items:[]}),/Items/);
  assert.throws(()=>run({baseUseTimeSeconds:0,trainedUseTimeSeconds:0}),/denominator/);
});
test('B-23 review boundary: no unauthorized callback, exp redistribution, files or CGI',()=>{
  const r=run();
  assert.equal('callbackExecuted' in r,false);
  assert.equal('commitWorld' in r,false);
  assert.equal('experienceAfter' in r,false);
  assert.match(r.scope,/no callback, CGI or durable transaction/);
});
