import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadStandardStreetModel } from '../src/standard-street-model.mjs';
import {
  listReviewedWholesalePlusItems, projectReviewedWholesaleTurnItem,
} from '../src/wholesale-turn-model.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [itemDsl, rebelDsl, originalTurn, originalMake, cfg] = await Promise.all([
  'custom/inc-item-data.cgi', 'custom/inc-rebel-data.cgi',
  'modern/tests/original-perl/inc-turn.cgi',
  'modern/tests/original-perl/inc-makeitem.cgi', '_config.cgi',
].map(file => readFile(path.join(root, file), 'utf8')));
const model = loadStandardStreetModel(itemDsl, rebelDsl);
const empty = () => Array(model.maxItem).fill(0);
const shops = (count = 2) => Array.from({length:count},()=>({item:empty()}));
const inputs = Object.freeze({timespanSeconds:600,population:100000,maxUsers:50});

function run(itemId, initial, options = {}, shopData = shops()) {
  const world = empty();world[itemId - 1] = initial;
  return projectReviewedWholesaleTurnItem(model,world,shopData,{
    ...inputs,itemId,random:()=>0,...options,
  });
}

test('B-12 source-fixed PLUS values #1 #10 #40 retain exact time and direction', () => {
  const items=listReviewedWholesalePlusItems(model);
  assert.deepEqual(items,[
    {id:1,code:'yakusou',raw:'-20m',plusSeconds:-1200,wslimit:1000,line:1672},
    {id:10,code:'book-make',raw:'20m',plusSeconds:1200,wslimit:10,line:72},
    {id:40,code:'ken-ki',raw:'-1h',plusSeconds:-3600,wslimit:600,line:1265},
  ]);
  assert.ok(Object.isFrozen(items));
  for (const item of items) assert.ok(Object.isFrozen(item));
});

test('B-12 frozen Core inc-turn source contains positive/negative PLUS and RNG exact pipeline', () => {
  assert.ok(originalTurn.includes('$add=$timespan/abs($ITEM->{plus})*$DTpeople/(100000/(($MAX_USER+$#DT-1)*0.2+1));'));
  assert.ok(originalTurn.includes('if($add>0){$add=$add/2+rand($add/2);}else{$add=0;}'));
  assert.ok(originalTurn.includes('if($add<1 && $add>0){if(rand(1/$add)<1){$add=1;}}'));
  assert.ok(originalTurn.includes('$add=int($add);'));
  assert.ok(originalTurn.includes('$DTwholestore[$cnt-1]+=$ITEM->{plus}>0 ? $add : -$add;'));
  assert.ok(originalTurn.includes('CheckWholeStore();'));
  assert.ok(originalTurn.includes('next if $timespan<=0;'));
  assert.ok(originalMake.includes("if($line =~ s/\\sPLUS\\s+(\\S+)\\s//i){$g_item->{plus}=GetTime($1);}"));
  assert.match(cfg,/\$MAX_USER\s*=\s*50\s*;/);
});

test('B-12 PLUS 20m with two shops, 100000 population, 600sec and draw zero adds two', () => {
  const actual=run(10,3);
  // Preserve Core's floating-operation order: binary rounding can yield
  // 5.500000000000001 instead of 5.5 without changing int(add).
  assert.ok(Math.abs(actual.receipt.base - 5.5) < 1e-10);
  assert.ok(Math.abs(actual.receipt.sampled - 2.75) < 1e-10);
  assert.equal(actual.receipt.units,2);
  assert.equal(actual.receipt.drawsUsed,1);
  assert.equal(actual.receipt.signedDelta,2);
  assert.equal(actual.receipt.beforeCap,5);
  assert.equal(actual.receipt.totalCap,20);
  assert.equal(actual.receipt.finalStock,5);
  assert.equal(actual.worldStock[9],5);
});

test('B-12 higher deterministic draw produces more restock while source array stays unchanged', () => {
  const world=empty();world[9]=3;const active=shops();
  const before=structuredClone({world,active});
  const a=projectReviewedWholesaleTurnItem(model,world,active,{...inputs,itemId:10,random:()=>0.9});
  const b=projectReviewedWholesaleTurnItem(model,world,active,{...inputs,itemId:10,random:()=>0.9});
  assert.deepEqual(a,b);
  assert.equal(a.receipt.units,5);
  assert.equal(a.worldStock[9],8);
  assert.deepEqual({world,active},before);
});

test('B-12 source negative PLUS removes items and clamps stock at zero', () => {
  const herb=run(1,5);
  assert.equal(herb.receipt.plusSeconds,-1200);
  assert.equal(herb.receipt.units,2);
  assert.equal(herb.worldStock[0],3);
  const underflow=run(1,1);
  assert.equal(underflow.receipt.beforeCap,-1);
  assert.equal(underflow.worldStock[0],0);
});

test('B-12 small positive amount uses a second injected random draw to round up', () => {
  const active=shops();
  const base={...inputs,itemId:40};
  let calls=0;
  const one=projectReviewedWholesaleTurnItem(model,
    [ ...empty().slice(0,39),5,...empty().slice(40) ],active,
    {...base,random:()=>{calls++;return 0;}});
  assert.equal(calls,2);
  assert.equal(one.receipt.drawsUsed,2);
  assert.equal(one.receipt.units,1);
  assert.equal(one.worldStock[39],4);

  const none=run(40,5,{random:(()=>{const values=[0,0.99];return ()=>values.shift();})()});
  assert.equal(none.receipt.drawsUsed,2);
  assert.equal(none.receipt.units,0);
  assert.equal(none.worldStock[39],5);
});

test('B-12 earlier shop-held inventory consumes market global capacity after growth', () => {
  const current=shops(2);current[0].item[9]=17;
  const result=run(10,5,{},current);
  assert.equal(result.receipt.units,2);
  assert.equal(result.receipt.beforeCap,7);
  assert.equal(result.receipt.totalCap,20);
  assert.equal(result.receipt.held,17);
  assert.equal(result.receipt.finalStock,3);
  assert.equal(result.worldStock[9],3);
});

test('B-12 world stock already over cap must decrease even during positive PLUS', () => {
  const result=run(10,30);
  assert.equal(result.receipt.signedDelta,2);
  assert.equal(result.receipt.beforeCap,32);
  assert.equal(result.receipt.finalStock,20);
});

test('B-12 all-stock-held makes market stock zero without altering shop stock', () => {
  const a=shops();a[0].item[9]=25;
  const before=structuredClone(a);
  const projected=run(10,10,{},a);
  assert.equal(projected.receipt.totalCap,20);
  assert.equal(projected.worldStock[9],0);
  assert.deepEqual(a,before);
});

test('B-12 zero population yields no RNG but still runs market cap check', () => {
  const result=run(10,30,{population:0,random:()=>{throw Error('No RNG');}});
  assert.equal(result.receipt.base,0);
  assert.equal(result.receipt.units,0);
  assert.equal(result.receipt.drawsUsed,0);
  assert.equal(result.worldStock[9],20);
});

test('B-12 skip zero/negative timespan rather than silently performing market capping', () => {
  assert.throws(()=>run(10,30,{timespanSeconds:0}),/timespanSeconds/);
  assert.throws(()=>run(10,30,{timespanSeconds:-1}),/timespanSeconds/);
});

test('B-12 malformed RNG values reject without changing world and shops', () => {
  for (const value of [NaN,Infinity,-1,1,'0.2',undefined]) {
    const world=empty();world[9]=4;const active=shops();
    const before=structuredClone({world,active});
    assert.throws(()=>projectReviewedWholesaleTurnItem(model,world,active,{
      ...inputs,itemId:10,random:()=>value,
    }),/\[0, 1\)/);
    assert.deepEqual({world,active},before);
  }
  assert.throws(()=>run(10,4,{random:undefined}),/requires explicit random/);
});

test('B-12 selection guards and capacity checks reject unknown or changed source', () => {
  assert.throws(()=>run(79,5),/source-audited PLUS/);
  for (const changed of [{plusRaw:'30m'},{priceRaw:'999'},{limitRaw:'20/20'},{line:73}]) {
    const altered={...model,items:model.items.map(i=>i.id===10?{...i,...changed}:i)};
    assert.throws(()=>projectReviewedWholesaleTurnItem(altered,empty(),shops(),{
      ...inputs,itemId:10,random:()=>0,
    }),/source metadata changed/);
  }
});

test('B-12 refuses other item inventories instead of skipping their unreviewed cap effects', () => {
  const world=empty();world[9]=5;world[0]=1;
  assert.throws(()=>projectReviewedWholesaleTurnItem(model,world,shops(),{
    ...inputs,itemId:10,random:()=>0,
  }),/Other world inventory/);
  const world2=empty();world2[9]=5;const a=shops();a[0].item[0]=1;
  assert.throws(()=>projectReviewedWholesaleTurnItem(model,world2,a,{
    ...inputs,itemId:10,random:()=>0,
  }),/Other shop inventory/);
});

test('B-12 validation rejects unsafe population, maxUsers and inventory shapes', () => {
  for(const bad of [-1,NaN,1.25,Number.MAX_SAFE_INTEGER+1]){
    assert.throws(()=>run(10,5,{population:bad}),/population/);
  }
  assert.throws(()=>run(10,5,{maxUsers:0}),/maxUsers/);
  assert.throws(()=>projectReviewedWholesaleTurnItem(model,[2],shops(),{
    ...inputs,itemId:10,random:()=>0,
  }),/79 slots/);
});
