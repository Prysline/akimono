import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceCommandDraws,LOCAL_SOURCE_DRAW_POLICY}
  from '../src/local-source-command-draws.mjs';

const base=Object.freeze({
  worldId:'b54-reviewed-world-uuid',
  revision:5,nowSeconds:1000000,
});
function samples({world=base,kind='advance-source-time',
  args={shopId:1,minutes:30},count=121}={}){
  return sourceCommandDraws({world,kind,args,count});
}
test('B-54 source millionth stream is stable for identical world, revision, clock and command',()=>{
  assert.equal(LOCAL_SOURCE_DRAW_POLICY,'akimono.local-source-review-draws.v1');
  const a=samples();
  assert.ok(Object.isFrozen(a));
  assert.equal(a.length,121);
  assert.ok(a.every(n=>Number.isSafeInteger(n)&&n>=0&&n<1000000));
  assert.deepEqual(samples(),a,'same source action must replay identical draw order');
  assert.deepEqual(samples({count:59}),a.slice(0,59),
    'source probe of prefixes does not consume or alter the draw stream');
});
test('B-54 stream domain-separates revision, world, clock, command and arguments',()=>{
  const a=samples();
  for(const query of [
    {world:{...base,revision:6}},
    {world:{...base,worldId:'new-uuid'}},
    {world:{...base,nowSeconds:1000001}},
    {args:{shopId:1,minutes:60}},
    {kind:'reviewed-sparse-all-plus',args:{timespanSeconds:1800}},
  ])assert.notDeepEqual(samples(query).slice(0,8),a.slice(0,8));
});
test('B-54 reject unsupported command fields, invalid state, unsafe entropy requests',()=>{
  for(const attempt of [
    {world:{...base,revision:-1}},
    {world:{...base,worldId:''}},
    {world:{...base,nowSeconds:1.2}},
    {kind:'fake-event-callback'},
    {args:{shopId:1,minutes:30,randomDraws:[1]}},
    {args:{minutes:30}},
    {args:{shopId:1,minutes:0}},
    {args:{shopId:1,minutes:30.5}},
    {count:0},{count:122},
  ])assert.throws(()=>samples(attempt),/B-54/);
});
