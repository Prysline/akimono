import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {reviewR4HashPolicy,resolveR4HashOrders,r4HashSeed} from '../src/original-r4-perl-hash-replay.mjs';
import {createR4TimeDraws} from '../src/r4-time-command-draws.mjs';
import {LOTO_RANGE} from '../src/original-b58-loto-startfunc.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const dir=path.join(root,'modern/tests/original-perl');
const sources=Object.fromEntries(await Promise.all(Object.entries({
  itemDsl:'custom/inc-item-data.cgi',rebelDsl:'custom/inc-rebel-data.cgi',
  compilerSource:'modern/tests/original-perl/inc-makeitem.cgi',turnSource:'modern/tests/original-perl/inc-turn.cgi',
  readSource:'modern/tests/original-perl/inc-func.cgi',writeSource:'modern/tests/original-perl/write.cgi',
}).map(async ([k,p])=>[k,await readFile(path.join(root,p),'utf8')])));
const reviewed=reviewR4HashPolicy(sources);
const world={worldId:'r4-p3-hash',revision:7,nowSeconds:1000000,period:{eventState:{'ken-sale':1000001,happy:1003600,'plusup-tetu':1007200}}};
test('R4 deterministic candidate hash bridge matches actual frozen Perl EVENT initializer under the same explicit replay seed',()=>{
  for(let revision=7;revision<11;revision++){
    const w={...world,revision},minutes=60;
    const order=resolveR4HashOrders({reviewed,world:w,minutes});
    const original=JSON.parse(execFileSync('perl',['original-r4-event-hash-order-probe.pl'],{
      cwd:dir,encoding:'utf8',env:{...process.env,PERL_HASH_SEED:r4HashSeed({world:w,minutes}),PERL_PERTURB_KEYS:'0'},
    }));
    assert.deepEqual(order.eventOrder,original.perlEventHashOrder);
    assert.deepEqual(order,resolveR4HashOrders({reviewed,world:w,minutes,expectedInterpreter:order.interpreter}));
    assert.equal(order.committable,false);
  }
});
test('R4 candidate hash replay preserves delete/reinsert history before NOW; forged interpreter, keys and source reject',()=>{
  const minutes=60,expired=['ken-sale'],started=[['boom-posyon',1009999],['ken-sale',1010000]];
  const first=resolveR4HashOrders({reviewed,world,minutes});
  const now=resolveR4HashOrders({reviewed,world,minutes,expired,started,expectedInterpreter:first.interpreter});
  assert.deepEqual(first.activeOrder,now.activeOrder);
  assert.deepEqual(first.eventOrder,now.eventOrder);
  assert.deepEqual([...now.nowOrder].sort(),['boom-posyon','happy','ken-sale','plusup-tetu']);
  assert.deepEqual(now,resolveR4HashOrders({reviewed,world,minutes,expired,started}));
  assert.throws(()=>resolveR4HashOrders({reviewed,world,minutes,expectedInterpreter:'wrong'}),/fingerprint/);
  assert.throws(()=>resolveR4HashOrders({reviewed,world,minutes,expired:['unknown']}),/expired/);
  assert.throws(()=>resolveR4HashOrders({reviewed,world,minutes,started:[['happy',1009999]]}),/started/);
  assert.throws(()=>resolveR4HashOrders({reviewed:{...reviewed},world,minutes}),/pinned/);
  assert.throws(()=>reviewR4HashPolicy({...sources,writeSource:sources.writeSource+' '}),/source drift/);
  assert.throws(()=>resolveR4HashOrders({reviewed,world:{...world,period:{eventState:null}},minutes}),/known/);
});
test('R4 time RNG is restart-reproducible and domain-separated, and lottery covers source integer range',()=>{
  const a=createR4TimeDraws({world,minutes:60}),b=createR4TimeDraws({world,minutes:60});
  const c=createR4TimeDraws({world:{...world,revision:8},minutes:60});
  const tape=Array.from({length:221},(_,i)=>[a.unit(i),a.lottery(i)]);
  assert.deepEqual(tape,Array.from({length:221},(_,i)=>[b.unit(i),b.lottery(i)]));
  assert.notDeepEqual(tape,Array.from({length:221},(_,i)=>[c.unit(i),c.lottery(i)]));
  assert.ok(tape.every(([unit,loto])=>unit>=0&&unit<1000000&&loto.range===LOTO_RANGE&&loto.result>=0&&loto.result<LOTO_RANGE));
  assert.ok(tape.some(([,loto])=>loto.result>=1000000),'lottery cannot be limited to 1e6 integer outcomes');
  assert.throws(()=>a.unit(221),/range/);
  assert.throws(()=>a.lottery(-1),/range/);
});
