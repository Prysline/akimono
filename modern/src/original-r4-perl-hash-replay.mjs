/** Candidate local replay policy for original Perl EVENT hashes.
 * No time command, WorldState mutation, arbitrary Perl evaluation or commit authority.
 * Actual Perl keys(), under explicitly fixed seed/perturbation and interpreter
 * fingerprint; NOT a claim that historical native CGI processes used these seeds.
 */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {reviewOriginalCompiledEventCatalog} from './original-event-compiled-catalog.mjs';
export const R4_HASH_POLICY='akimono.r4.perl-event-hash-replay.v1';
const fail=s=>{throw new RangeError('R4 hash replay: '+s)};
const reviewedPolicies=new WeakSet();
const pins={itemDsl:'7a18185e98b32aee82ca1ce30d6f3c395157dbcb',rebelDsl:'923634e58a05beca9ab004515fc7669d53a1ba3a',compilerSource:'1da8cce1e76ad6159325a37faec68efaa82c7f69',turnSource:'b8a4980275f475a952846a8d6072fad45f8dff50',readSource:'e7a8add7b0291901e71fe797783b664dff1568a0',writeSource:'203f33b37511e838800a45b84183af98fcf46e4c'};
export function reviewR4HashPolicy(sources){
  for(const [key,sha] of Object.entries(pins)){
    const s=sources[key];
    if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+key);
  }
  const catalog=reviewOriginalCompiledEventCatalog(sources);
  const order=catalog.compiled.map(e=>e.code);
  const p=Object.freeze({policy:R4_HASH_POLICY,declarationOrder:Object.freeze(order),catalog,committable:false});
  reviewedPolicies.add(p);return p;
}
// Static bridge: only native hash assignment, traversal, deletion and insertion.
// No original callbacks, no eval, no shell, no paths/commands from the request.
const perlProgram=[
  'use strict;use warnings;use JSON::PP;use Config;',
  'local $/;my $in=decode_json(<STDIN>);',
  'my %EVENT;for my $code (@{$in->{codes}}){$EVENT{$code}={code=>$code};}',
  'my %DTevent=split(/,/,join(",",map { @$_ } @{$in->{active}}));',
  'my @prior=keys(%DTevent);my @all=keys(%EVENT);',
  'for my $code (@{$in->{expired}}){delete $DTevent{$code};}',
  'for my $row (@{$in->{started}}){$DTevent{$row->[0]}=$row->[1];}',
  'print encode_json({version=>"$^V",arch=>$Config{archname},prior=>[@prior],all=>[@all],now=>[keys(%DTevent)]});'
].join('\n');
const integer=x=>Number.isSafeInteger(x)&&x>=0;
const keysEqual=(a,b)=>Array.isArray(a)&&a.length===b.length&&new Set(a).size===b.length&&a.every(k=>b.includes(k));
export function r4HashSeed({world,minutes}){
  if(typeof world?.worldId!=='string'||!world.worldId||world.worldId.length>200||!integer(world.revision)||!integer(world.nowSeconds)||!integer(minutes)||minutes<1||minutes>60)fail('bounded server world/command identity');
  return '0x'+createHash('sha256').update(JSON.stringify([R4_HASH_POLICY,world.worldId,world.revision,world.nowSeconds,minutes])).digest('hex').slice(0,32);
}
export function resolveR4HashOrders({reviewed,world,minutes,expired=[],started=[],expectedInterpreter=null}){
  if(!reviewedPolicies.has(reviewed))fail('pinned source review required');
  const seed=r4HashSeed({world,minutes});
  const map=world?.period?.eventState;
  if(!map||typeof map!=='object'||Array.isArray(map))fail('known source EVENT map required');
  const active=Object.entries(map),keys=active.map(([k])=>k);
  if(active.some(([k,v])=>!reviewed.declarationOrder.includes(k)||!integer(v))||keys.length>17)fail('invalid active EVENT wire');
  if(!Array.isArray(expired)||new Set(expired).size!==expired.length||expired.some(k=>!keys.includes(k)))fail('invalid expired operations');
  const survivors=keys.filter(k=>!expired.includes(k));
  if(!Array.isArray(started)||started.length>17||started.some(row=>!Array.isArray(row)||row.length!==2||!reviewed.declarationOrder.includes(row[0])||survivors.includes(row[0])||!integer(row[1]))||new Set(started.map(row=>row[0])).size!==started.length)fail('invalid started operations');
  let value;
  try{
    // PATH is the trusted host's environment; remove Perl injection knobs.
    const env={...process.env,PERL_HASH_SEED:seed,PERL_PERTURB_KEYS:'0'};
    for(const k of ['PERL5OPT','PERL5LIB','PERLLIB','PERL_LOCAL_LIB_ROOT','PERL_MB_OPT','PERL_MM_OPT','PERL_HASH_SEED_DEBUG','PERL_UNICODE'])delete env[k];
    value=JSON.parse(execFileSync('perl',['-e',perlProgram],{input:JSON.stringify({codes:reviewed.declarationOrder,active,expired,started}),encoding:'utf8',env,timeout:3000,maxBuffer:16384,stdio:['pipe','pipe','pipe']}));
  }catch{fail('native Perl hash helper unavailable or invalid output')}
  if(typeof value.version!=='string'||typeof value.arch!=='string'||!keysEqual(value.prior,keys)||!keysEqual(value.all,reviewed.declarationOrder)||!keysEqual(value.now,[...survivors,...started.map(row=>row[0])]))fail('invalid native hash orders');
  const interpreter=value.version+'/'+value.arch;
  if(expectedInterpreter!==null&&interpreter!==expectedInterpreter)fail('interpreter fingerprint mismatch');
  // The complete permutations are the evidence; fingerprint alone is not.
  return Object.freeze({policy:R4_HASH_POLICY,seed,interpreter,activeOrder:Object.freeze(value.prior),eventOrder:Object.freeze(value.all),nowOrder:Object.freeze(value.now),committable:false});
}


/** Replay an entire command's hash mutation history in one native Perl
 * process, instead of rebuilding %DTevent from a serialization at the
 * intra-command boundary. The v1 one-slice policy stays unchanged.
 */
export const R4_COMMAND_HASH_POLICY='akimono.r4.perl-command-event-hash-replay.v1';
const commandPerlProgram=[
  'use strict;use warnings;use JSON::PP;use Config;',
  'local $/;my $in=decode_json(<STDIN>);',
  'my %EVENT;for my $code (@{$in->{codes}}){$EVENT{$code}={code=>$code};}',
  'my %DTevent=split(/,/,join(",",map { @$_ } @{$in->{active}}));',
  'my @initial=keys(%DTevent);my @all=keys(%EVENT);my @steps;',
  'for my $step (@{$in->{steps}}){my @prior=keys(%DTevent);',
  'for my $code (@{$step->{expired}}){delete $DTevent{$code};}',
  'for my $row (@{$step->{started}}){$DTevent{$row->[0]}=$row->[1];}',
  'push @steps,{prior=>[@prior],now=>[keys(%DTevent)]};}',
  'print encode_json({version=>"$^V",arch=>$Config{archname},initial=>[@initial],all=>[@all],steps=>[@steps],now=>[keys(%DTevent)]});'
].join('\n');
export function resolveR4CommandHashOrders({reviewed,world,minutes,steps=[],expectedInterpreter=null}){
  if(!reviewedPolicies.has(reviewed)||!Array.isArray(steps)||steps.length>2)fail('bounded command hash history required');
  const seed=r4HashSeed({world,minutes}),map=world?.period?.eventState;
  if(!map||typeof map!=='object'||Array.isArray(map))fail('known source EVENT map required');
  const active=Object.entries(map),keys=active.map(([k])=>k);
  if(active.some(([k,v])=>!reviewed.declarationOrder.includes(k)||!integer(v)))fail('invalid active EVENT wire');
  let known=keys;const expected=[];
  for(const step of steps){
    if(!step||Object.keys(step).sort().join(',')!=='expired,started')fail('exact hash mutation step');
    const {expired,started}=step;
    if(!Array.isArray(expired)||new Set(expired).size!==expired.length||expired.some(k=>!known.includes(k)))fail('invalid expired operations');
    const survivors=known.filter(k=>!expired.includes(k));
    if(!Array.isArray(started)||started.length>17||started.some(row=>!Array.isArray(row)||row.length!==2||!reviewed.declarationOrder.includes(row[0])||survivors.includes(row[0])||!integer(row[1]))||new Set(started.map(row=>row[0])).size!==started.length)fail('invalid started operations');
    const next=[...survivors,...started.map(row=>row[0])];
    expected.push({prior:known,now:next});known=next;
  }
  let value;
  try{
    const env={...process.env,PERL_HASH_SEED:seed,PERL_PERTURB_KEYS:'0'};
    for(const k of ['PERL5OPT','PERL5LIB','PERLLIB','PERL_LOCAL_LIB_ROOT','PERL_MB_OPT','PERL_MM_OPT','PERL_HASH_SEED_DEBUG','PERL_UNICODE'])delete env[k];
    value=JSON.parse(execFileSync('perl',['-e',commandPerlProgram],{input:JSON.stringify({codes:reviewed.declarationOrder,active,steps}),encoding:'utf8',env,timeout:3000,maxBuffer:16384,stdio:['pipe','pipe','pipe']}));
  }catch{fail('native Perl command hash helper unavailable or invalid output')}
  if(typeof value.version!=='string'||typeof value.arch!=='string'||
     !keysEqual(value.initial,keys)||!keysEqual(value.all,reviewed.declarationOrder)||
     !keysEqual(value.now,known)||!Array.isArray(value.steps)||value.steps.length!==steps.length||
     value.steps.some((s,i)=>!keysEqual(s.prior,expected[i].prior)||!keysEqual(s.now,expected[i].now)||
       s.prior.join(',')!==(i?value.steps[i-1].now:value.initial).join(','))||
     value.now.join(',')!==(steps.length?value.steps.at(-1).now:value.initial).join(','))
    fail('invalid native command hash history');
  const interpreter=value.version+'/'+value.arch;
  if(expectedInterpreter!==null&&interpreter!==expectedInterpreter)fail('interpreter fingerprint mismatch');
  return Object.freeze({policy:R4_COMMAND_HASH_POLICY,seed,interpreter,
    initialOrder:Object.freeze(value.initial),eventOrder:Object.freeze(value.all),
    nowOrder:Object.freeze(value.now),steps:Object.freeze(value.steps.map(s=>Object.freeze({prior:Object.freeze(s.prior),now:Object.freeze(s.now)}))),
    committable:false});
}
