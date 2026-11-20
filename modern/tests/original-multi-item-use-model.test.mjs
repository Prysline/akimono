import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {projectOriginalMultiItemUse} from '../src/original-multi-item-use-model.mjs';

const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [useSource,wholeSource]=await Promise.all([
  'modern/tests/original-perl/use.cgi',
  'modern/tests/original-perl/whole.cgi',
].map(p=>readFile(path.join(dir,p),'utf8')));
const config=()=>[
  {code:true,limit:10,wslimit:8},
  {code:true,limit:6,wslimit:-10},
  {code:false,limit:5,wslimit:1},
];
const defaults=()=>({
  shops:[[8,4,3],[3,4,2]],
  actingShopIndex:0,
  wholesale:[4,0,-5],
  items:config(),
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
  count:2,
});
const model=values=>projectOriginalMultiItemUse({...defaults(),...values});
function replay(values){
  let i=0;
  return ()=>{if(i>=values.length)throw Error('extra random draw');return values[i++];};
}

test('B-22 pinned source: materials before all creations, wholesale check once at end',()=>{
  const consume=useSource.indexOf('#アイテム消費');
  const create=useSource.indexOf('#アイテム取得');
  const whole=useSource.indexOf('CheckWholeStore();',create);
  const callback=useSource.indexOf("RequireFile('inc-item.cgi');",whole);
  assert.ok(consume>=0&&consume<create&&create<whole&&whole<callback);
  const piece=useSource.slice(consume,callback);
  assert.equal(piece.match(/CheckWholeStore\(\);/g)?.length,1);
  assert.ok(piece.includes('foreach my $item (@{$USE->{use}})'));
  assert.ok(piece.includes('foreach my $item (@{$USE->{result}->{create}})'));
});
test('B-22 pinned original wholesale scans ALL shops for every coded item',()=>{
  assert.ok(wholeSource.includes('foreach my $cnt (1..$MAX_ITEM)'));
  assert.ok(wholeSource.includes('next if !$ITEM[$cnt]->{code};'));
  assert.ok(wholeSource.includes('foreach my $DT (@DT)'));
  assert.ok(wholeSource.includes('$limit+=$DT->{item}[$cnt-1];'));
  assert.ok(wholeSource.includes('my $shopcount=@DT; $shopcount||=1;'));
});
test('B-22 source baseline output retains exact original stock/market numbers',()=>{
  const r=model();
  assert.deepEqual(r.shops,[[10,6,5],[3,4,2]]);
  assert.deepEqual(r.marketAfterOverflow,[12,6,-3]);
  assert.deepEqual(r.wholesale,[3,0,-3]);
  assert.equal(r.wholeStoreChecks,1);
  assert.equal(r.randomDraws,0);
});
test('B-22 source material zero-probability not consumed, even though declared',()=>{
  const r=model();
  assert.deepEqual(r.consumed,[{itemId:1,amount:4}]);
  assert.deepEqual(r.samples.slice(0,2).map(x=>x.amount),[4,0]);
});
test('B-22 duplicate output items processed in source order, including zero kept',()=>{
  const r=model();
  assert.deepEqual(r.added,[
    {itemId:1,amount:6},{itemId:2,amount:2},
    {itemId:1,amount:0},{itemId:3,amount:2},
  ]);
  assert.deepEqual(r.discarded,[
    {itemId:1,amount:4},{itemId:2,amount:6},
    {itemId:1,amount:4},{itemId:3,amount:2},
  ]);
});
test('B-22 wholesale cap is applied only after ALL overflow has accumulated',()=>{
  const r=model();
  assert.deepEqual(r.wholesaleChecks,[
    {itemId:1,shopSum:13,limit:16,from:12,to:3},
    {itemId:2,shopSum:10,limit:10,from:6,to:0},
  ]);
});
test('B-22 an uncoded item is produced but bypasses wholesale correction',()=>{
  const r=model();
  assert.equal(r.shops[0][2],5);
  assert.equal(r.marketAfterOverflow[2],-3);
  assert.equal(r.wholesale[2],-3);
  assert.ok(!r.wholesaleChecks.some(x=>x.itemId===3));
});
test('B-22 no use and no create STILL triggers original wholesale check',()=>{
  const r=model({uses:[],creates:[],wholesale:[99,99,-5]});
  assert.deepEqual(r.wholesale,[5,2,-5]);
  assert.deepEqual(r.shops,[[8,4,3],[3,4,2]]);
  assert.equal(r.wholeStoreChecks,1);
  assert.deepEqual(r.samples,[]);
});
test('B-22 source consumes materials before production of the same item',()=>{
  const r=model({
    uses:[{itemId:1,countPerUse:6,probabilityPermille:1000}],
    creates:[{itemId:1,countPerUse:5,probabilityPermille:1000}],
    count:1,
  });
  assert.deepEqual(r.consumed,[{itemId:1,amount:6}]);
  assert.deepEqual(r.added,[{itemId:1,amount:5}]);
  assert.equal(r.shops[0][0],7);
});
test('B-22 original source does not validate material availability again in extracted loop',()=>{
  const r=model({
    uses:[{itemId:1,countPerUse:20,probabilityPermille:1000}],
    creates:[],count:1,
  });
  assert.equal(r.shops[0][0],-12);
  assert.equal(r.wholesale[0],4);
  assert.deepEqual(r.consumed,[{itemId:1,amount:20}]);
});
test('B-22 stochastic use samples precede stochastic creation, with shared sequence',()=>{
  const r=model({
    uses:[{itemId:1,countPerUse:3,probabilityPermille:500}],
    creates:[{itemId:2,countPerUse:20,probabilityPermille:500}],
    count:1,random:replay([0,0.5,0,0.5,0.25]),
  });
  assert.equal(r.randomDraws,5);
  assert.deepEqual(r.samples.map(x=>[x.phase,x.draws,x.amount]),[
    ['consume',3,2],['create',2,12],
  ]);
  assert.equal(r.shops[0][0],6);
  assert.equal(r.shops[0][1],6);
  assert.deepEqual(r.added,[{itemId:2,amount:2}]);
});
test('B-22 source MakeAmount zero/full branches take no random draws',()=>{
  let calls=0;
  const r=model({random:()=>{calls++;return .4;}});
  assert.equal(r.randomDraws,0);
  assert.equal(calls,0);
});
test('B-22 item already above cap may generate original negative retained output',()=>{
  const r=model({
    shops:[[12,4,3],[3,4,2]],
    uses:[],creates:[{itemId:1,countPerUse:2,probabilityPermille:1000}],count:1,
  });
  assert.deepEqual(r.added,[{itemId:1,amount:-2}]);
  assert.deepEqual(r.discarded,[{itemId:1,amount:4}]);
  assert.equal(r.shops[0][0],10);
});
test('B-22 no-code item preserves a negative wholesale value',()=>{
  const r=model({uses:[],creates:[],wholesale:[4,0,-30]});
  assert.equal(r.wholesale[2],-30);
});
test('B-22 negative wslimit acts as absolute fixed cap',()=>{
  const r=model();
  assert.equal(r.wholesaleChecks[1].limit,10);
});
test('B-22 positive fractional wholesale cap uses int(wslimit*shopcount+.99)',()=>{
  const items=config();
  items[0].wslimit=.5;
  const r=model({items,uses:[],creates:[]});
  assert.equal(r.wholesaleChecks[0].limit,1);
  assert.equal(r.wholesale[0],0);
});
test('B-22 changing the acting shop changes only that shop before global cap',()=>{
  const r=model({actingShopIndex:1,uses:[],creates:[
    {itemId:1,countPerUse:2,probabilityPermille:1000},
  ],count:1});
  assert.equal(r.shops[0][0],8);
  assert.equal(r.shops[1][0],5);
  assert.equal(r.wholeStoreChecks,1);
});
test('B-22 material and create arrays may repeat item IDs (source allows it)',()=>{
  const r=model({
    uses:[
      {itemId:1,countPerUse:1,probabilityPermille:1000},
      {itemId:1,countPerUse:2,probabilityPermille:1000},
    ],
    creates:[],count:1,
  });
  assert.deepEqual(r.consumed,[{itemId:1,amount:1},{itemId:1,amount:2}]);
  assert.equal(r.shops[0][0],5);
});
test('B-22 stochastic invalid RNG and absent callback fail as JS fixture errors',()=>{
  const stochastic={uses:[{itemId:1,countPerUse:20,probabilityPermille:500}],
    creates:[],count:1};
  assert.throws(()=>model(stochastic),/random/);
  assert.throws(()=>model({...stochastic,random:()=>1}),/random/);
  assert.throws(()=>model({...stochastic,random:()=>NaN}),/random/);
});
test('B-22 invalid slots, item IDs or capacity are rejected as unrepresentable fixtures',()=>{
  assert.throws(()=>model({shops:[[8],[3]]}),/shop row length/);
  assert.throws(()=>model({wholesale:[0]}),/wholesale length/);
  assert.throws(()=>model({uses:[{itemId:4,countPerUse:1,probabilityPermille:1000}]}),/itemId/);
  assert.throws(()=>model({count:0}),/count/);
  assert.throws(()=>model({items:[{code:true,limit:NaN,wslimit:1}]}),/shop row length|limit/);
});
test('B-22 input data stays unchanged, output nested arrays frozen',()=>{
  const inArgs=defaults(),before=structuredClone(inArgs);
  const r=projectOriginalMultiItemUse(inArgs);
  assert.deepEqual(inArgs,before);
  assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.shops));
  assert.ok(Object.isFrozen(r.shops[0])&&Object.isFrozen(r.wholesale));
  assert.ok(Object.isFrozen(r.samples[0])&&Object.isFrozen(r.added[0]));
  assert.throws(()=>{r.shops[0][0]=99},TypeError);
});
test('B-22 no time, money, item callback, persistence, or CGI effect is granted',()=>{
  const r=model();
  assert.equal('moneyDeducted' in r,false);
  assert.equal('callbackExecuted' in r,false);
  assert.equal('commitWorld' in r,false);
  assert.match(r.scope,/no CGI or durable transaction/);
});
