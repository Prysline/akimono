/** Full commerce EXP tie policy: frozen DataRead reconstructs the hash,
 * UseItem updates one key then sorts keys by value. Use actual native Perl
 * tie order with a command-derived local replay seed; not historical PRNG
 * or historical CGI process hash identity. No client-provided permutation.
 */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
export const R4_USE_EXP_HASH_POLICY='akimono.r4.use-exp-hash-replay.v1';
const fail=s=>{throw new RangeError('R4 EXP hash: '+s)};
const reviewed=new WeakSet();
const pin=(text,sha)=>typeof text==='string'&&createHash('sha1').update('blob '+Buffer.byteLength(text)+'\0').update(text).digest('hex')===sha;
export function reviewUseExpHash({useSource,readSource}){
  if(!pin(useSource,'1bf4537cc41e344c144d840d43175c4c232765bb')||
     !pin(readSource,'e7a8add7b0291901e71fe797783b664dff1568a0'))fail('frozen source drift');
  if(!useSource.includes('my @key=sort { $DT->{exp}{$a} <=> $DT->{exp}{$b} }keys(%{$DT->{exp}});')||
     !readSource.includes('@DT{qw(itemyesterday itemtoday exp)}=map{{split(/,/,$_)}}@list[3,4,5];'))fail('source hash semantics');
  const r=Object.freeze({policy:R4_USE_EXP_HASH_POLICY,committable:false});
  reviewed.add(r);return r;
}
const validInt=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
export function r4UseExpHashSeed({world,command}){
  if(typeof world?.worldId!=='string'||!world.worldId||world.worldId.length>200||
     !validInt(world.revision,0,Number.MAX_SAFE_INTEGER)||!validInt(world.nowSeconds,0,Number.MAX_SAFE_INTEGER)||
     command?.kind!=='use-item'||command.expectedRevision!==world.revision||
     !validInt(command.shopId,1,100)||!validInt(command.itemId,1,79)||
     !validInt(command.useId,0,100)||!validInt(command.requestedCount,1,Number.MAX_SAFE_INTEGER))fail('command identity');
  return '0x'+createHash('sha256').update(JSON.stringify([R4_USE_EXP_HASH_POLICY,world.worldId,world.revision,world.nowSeconds,command.shopId,command.itemId,command.useId,command.requestedCount])).digest('hex').slice(0,32);
}
const perl=[
  'use strict;use warnings;use JSON::PP;',
  'local $/;my $in=decode_json(<STDIN>);',
  'my %exp=split(/,/,join(",",map{@$_}@{$in->{entries}}));',
  '$exp{$in->{target}}=$in->{value};',
  'print encode_json([map{0+$_}sort{$exp{$a}<=>$exp{$b}}keys(%exp)]);',
].join('\n');
export function resolveR4UseExpOrder({review,world,command,records,exp,itemId}){
  if(!reviewed.has(review)||itemId!==command.itemId)fail('source-reviewed order');
  const entries=Object.entries(records),keys=Object.keys(exp);
  if(entries.length>79||keys.length>79||entries.some(([k,v])=>!validInt(Number(k),1,79)||String(Number(k))!==k||!validInt(v,0,1000))||
     !validInt(exp[itemId],0,1000)||keys.some(k=>Number(k)!==itemId&&exp[k]!==records[k])||
     entries.some(([k,v])=>Number(k)!==itemId&&exp[k]!==v))fail('bounded EXP hash input');
  const env={...process.env,PERL_HASH_SEED:r4UseExpHashSeed({world,command}),PERL_PERTURB_KEYS:'0'};
  for(const key of ['PERL5OPT','PERL5LIB','PERLLIB','PERL_LOCAL_LIB_ROOT','PERL_MB_OPT','PERL_MM_OPT','PERL_HASH_SEED_DEBUG','PERL_UNICODE'])delete env[key];
  let order;
  try{order=JSON.parse(execFileSync('perl',['-e',perl],{input:JSON.stringify({entries,target:itemId,value:exp[itemId]}),encoding:'utf8',env,timeout:3000,maxBuffer:4096,stdio:['pipe','pipe','pipe']}));}
  catch{fail('native Perl EXP helper unavailable');}
  if(!Array.isArray(order)||order.length!==keys.length||new Set(order).size!==keys.length||
     order.some((k,i)=>!validInt(k,1,79)||!Object.hasOwn(exp,k)||i>0&&exp[order[i-1]]>exp[k]))fail('invalid native EXP key order');
  return order.map(String);
}
