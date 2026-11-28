import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {reviewR4HashPolicy,resolveR4HashOrders,r4HashSeed,resolveR4ExternalCommandHashOrders} from '../src/original-r4-perl-hash-replay.mjs';
import {createR4TimeDraws,createR4CrossPeriodDraws,R4_FULL_PRE_EVENT_DRAWS,R4_FULL_CROSS_SLICE_DRAWS,R4_FULL_CROSS_EVENT_DRAWS} from '../src/r4-time-command-draws.mjs';
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
  const expanded=createR4TimeDraws({world,minutes:60,fullCommerce:true});
  assert.equal(expanded.unit(220),a.unit(220));
  assert.doesNotThrow(()=>expanded.unit(R4_FULL_PRE_EVENT_DRAWS+99));
  assert.throws(()=>expanded.unit(R4_FULL_PRE_EVENT_DRAWS+100),/range/);
  const cross=createR4CrossPeriodDraws({world,minutes:60,fullCommerce:true});
  const limit=2*(R4_FULL_CROSS_SLICE_DRAWS+R4_FULL_CROSS_EVENT_DRAWS);
  assert.equal(R4_FULL_CROSS_EVENT_DRAWS,105,'external mixed cursor includes reviewed callback budget');
  assert.equal(limit,512,'two bounded source slices');
  assert.doesNotThrow(()=>cross.unit(limit-1));
  assert.doesNotThrow(()=>cross.lottery(limit-1));
  assert.throws(()=>cross.unit(limit),/range/);
  assert.throws(()=>cross.lottery(limit),/range/);
  const priorCross=createR4CrossPeriodDraws({world,minutes:60});
  assert.equal(priorCross.unit(449),cross.unit(449),'existing entropy identity unchanged');
  assert.throws(()=>priorCross.unit(450),/range/);
});

test('external replay retains period assignment, pre-NOW traversal and post-NOW deletion across two source slices',()=>{
  const native=String.raw`use strict;use warnings;use JSON::PP;
  my $in=decode_json(do{local $/;<STDIN>});
  my %DTevent=split(/,/,join(',',map{@$_}@{$in->{active}}));
  my @initial=keys %DTevent;my @steps;
  for my $s(@{$in->{steps}}){
    my @before=keys %DTevent;
    $DTevent{rebel}=$s->{periodRebel} if defined $s->{periodRebel};
    my @prior=keys %DTevent;
    delete $DTevent{$_} for @{$s->{expired}};
    $DTevent{$_->[0]}=$_->[1] for @{$s->{started}};
    my @now=keys %DTevent;
    delete $DTevent{rebel} if @{$s->{nowDeleted}};
    push @steps,{before=>\@before,prior=>\@prior,now=>\@now,after=>[keys %DTevent]};
  }
  print encode_json({initial=>\@initial,steps=>\@steps,nextPrior=>[keys %DTevent]});`;
  for(let revision=7;revision<11;revision++)for(const existing of [false,true]){
    const w={...world,revision,period:{eventState:{...world.period.eventState,...(existing?{rebel:1000000}:{})}}},minutes=60;
    const step={periodRebel:1259200,expired:['ken-sale'],started:[['boom-posyon',1010000]],nowDeleted:['rebel']};
    const steps=[step,{periodRebel:null,expired:['happy'],started:[['ken-sale',1019999]],nowDeleted:[]}];
    const first=resolveR4ExternalCommandHashOrders({reviewed,world:w,minutes,pendingPeriodRebel:step.periodRebel});
    const complete=resolveR4ExternalCommandHashOrders({reviewed,world:w,minutes,steps,expectedInterpreter:first.interpreter});
    const oracle=JSON.parse(execFileSync('perl',['-e',native],{input:JSON.stringify({active:Object.entries(w.period.eventState),steps}),
      encoding:'utf8',env:{...process.env,PERL_HASH_SEED:r4HashSeed({world:w,minutes}),PERL_PERTURB_KEYS:'0'}}));
    assert.deepEqual(complete.initialOrder,oracle.initial);
    assert.deepEqual(complete.steps,oracle.steps);
    assert.deepEqual(complete.nextPriorOrder,oracle.nextPrior);
    assert.deepEqual(first.nextPriorOrder,complete.steps[0].prior);
    assert.ok(complete.steps[0].now.includes('rebel'));
    assert.ok(!complete.steps[0].after.includes('rebel'));
    assert.deepEqual(complete.steps[1].before,complete.steps[0].after);
    assert.equal(complete.committable,false);
    assert.throws(()=>resolveR4ExternalCommandHashOrders({reviewed,world:w,minutes,steps:[{...step,nowDeleted:['happy']}]}),/invalid rebel NOW deletion/);
    assert.throws(()=>resolveR4ExternalCommandHashOrders({reviewed,world:w,minutes,steps:[step,{...steps[1],periodRebel:1259200}]}),/first slice/);
    assert.throws(()=>resolveR4ExternalCommandHashOrders({reviewed,world:w,minutes,steps:[{...step,started:[['guildbattle',1259200]]}]}),/invalid external started/);
  }
});
