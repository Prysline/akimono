/**
 * Native CloseShop hash-wire replay for the independent R4 local player.
 * Source-reviewed prerequisite only: no archive IO, session unlink or CAS.
 * Reconstruct DataRead's canonical numeric maps, then apply the actual
 * natural-sale shelf mutations in order. Never accept an archive permutation.
 */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {r4HashSeed} from './original-r4-perl-hash-replay.mjs';

export const R4_CLOSE_HASH_POLICY='akimono.r4.perl-close-archive-hash-replay.v1';
const fail=m=>{throw new RangeError('R4 close archive hash: '+m)};
const reviews=new WeakSet();
const pins=Object.freeze({
  readSource:'e7a8add7b0291901e71fe797783b664dff1568a0',
  turnSource:'b8a4980275f475a952846a8d6072fad45f8dff50',
  writeSource:'203f33b37511e838800a45b84183af98fcf46e4c',
  userSource:'46fe3b13e68ee83997aa919125ab210372af2822',
});
const maps=['itemyesterday','itemtoday','exp','user'];
const numeric=maps.slice(0,3);
const plain=v=>v!==null&&typeof v==='object'&&Object.getPrototypeOf(v)===Object.prototype;
const safe=n=>Number.isSafeInteger(n)&&n>=0;
const id=k=>/^[1-9]\d*$/.test(k)&&Number(k)<=79;
const blob=s=>createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex');
export function reviewR4CloseArchiveHash(sources){
  for(const [key,sha] of Object.entries(pins)){
    if(typeof sources?.[key]!=='string'||blob(sources[key])!==sha)fail('source drift '+key);
  }
  const review=Object.freeze({policy:R4_CLOSE_HASH_POLICY,committable:false});
  reviews.add(review);return review;
}
function wire(m,k){
  if(!plain(m)||Object.keys(m).length>79)fail('invalid map '+k);
  if(k==='user'){
    // Local account records do not model original AutoVar user data.
    if(Object.keys(m).length)fail('nonempty original user map not reviewed');
    return '';
  }
  if(Object.entries(m).some(([key,v])=>!id(key)||!safe(v)))fail('invalid numeric map '+k);
  return Object.entries(m).flat().join(',');
}
const perlProgram=[
  'use strict;use warnings;use JSON::PP;use Config;',
  'local $/;my $in=decode_json(<STDIN>);',
  'my @list=("","","",@{$in->{maps}});my %DT;',
  '@DT{qw(itemyesterday itemtoday exp)}=map{{split(/,/,$_)}}@list[3,4,5];',
  '$DT{user}={};my $DT=\\%DT;',
  'for my $row (@{$in->{sales}}){my ($itemno,$sale)=@$row;$DT->{itemtoday}{$itemno}+=$sale;}',
  'print encode_json({version=>"$^V",arch=>$Config{archname},wire=>{map {$_=>join(",",%{$DT->{$_}})} qw(itemyesterday itemtoday exp user)}});',
].join('\n');
function shelfShape(s){
  return plain(s)&&Number.isSafeInteger(s.showcasecount)&&s.showcasecount>=1&&s.showcasecount<=8&&
    Array.isArray(s.showcase)&&s.showcase.length===s.showcasecount&&s.showcase.every(n=>safe(n)&&n<=79)&&
    Array.isArray(s.price)&&s.price.length===s.showcasecount&&s.price.every(safe)&&
    Array.isArray(s.item)&&s.item.length===79&&s.item.every(safe);
}
export function resolveR4CloseArchiveHashOrders({reviewed,world,minutes,shopAfterSale,shelfSales,expectedInterpreter=null}){
  if(!reviews.has(reviewed))fail('pinned source review required');
  const seed=r4HashSeed({world,minutes});
  if(!Array.isArray(world.shops)||world.shops.length!==1)fail('one command-start shop required');
  const before=world.shops[0],after=shopAfterSale;
  if(!shelfShape(before)||!shelfShape(after)||before.id!==1||after.id!==before.id||
     before.showcasecount!==after.showcasecount||before.showcase.join(',')!==after.showcase.join(',')||
     before.price.join(',')!==after.price.join(',')||
     !Array.isArray(shelfSales)||shelfSales.length>before.showcasecount)
    fail('exact source shelf state required');
  const initial=Object.fromEntries(maps.map(k=>[k,wire(before[k],k)]));
  const expected=Object.fromEntries(maps.map(k=>[k,wire(after[k],k)]));
  const stock=[...before.item],today={...before.itemtoday},sales=[];
  let prior=-1;
  for(const row of shelfSales){
    const {shelf,itemId,count,unitPrice,stockBefore,stockAfter}=row??{};
    if(!Number.isSafeInteger(shelf)||shelf<=prior||shelf>=before.showcasecount||
       !safe(itemId)||itemId<1||itemId>79||before.showcase[shelf]!==itemId||
       unitPrice!==before.price[shelf]||!safe(unitPrice)||unitPrice<1||
       !safe(count)||count<1||stockBefore!==stock[itemId-1]||
       count>stockBefore||stockAfter!==stockBefore-count)
      fail('invalid ordered source shelf sale');
    prior=shelf;stock[itemId-1]=stockAfter;
    today[itemId]=(today[itemId]??0)+count;
    if(!safe(today[itemId]))fail('unsafe cumulative itemtoday');
    sales.push([itemId,count]);
  }
  if(stock.some((n,i)=>n!==after.item[i])||wire(today,'itemtoday')!==expected.itemtoday||
     maps.filter(k=>k!=='itemtoday').some(k=>initial[k]!==expected[k]))
    fail('source sale mutations do not reconstruct archive maps');
  return resolveNativeArchiveOrders({seed,initial,after,sales,expectedInterpreter,policy:R4_CLOSE_HASH_POLICY});
}
function resolveNativeArchiveOrders({seed,initial,after,sales,expectedInterpreter,policy}){
  let native;
  try{
    const env={...process.env,PERL_HASH_SEED:seed,PERL_PERTURB_KEYS:'0'};
    for(const k of ['PERL5OPT','PERL5LIB','PERLLIB','PERL_LOCAL_LIB_ROOT','PERL_MB_OPT','PERL_MM_OPT','PERL_HASH_SEED_DEBUG','PERL_UNICODE'])delete env[k];
    native=JSON.parse(execFileSync('perl',['-e',perlProgram],{
      input:JSON.stringify({maps:numeric.map(k=>initial[k]),sales}),
      encoding:'utf8',env,timeout:3000,maxBuffer:32768,stdio:['pipe','pipe','pipe'],
    }));
  }catch{fail('native Perl close hash helper unavailable or invalid output')}
  if(typeof native?.version!=='string'||typeof native.arch!=='string'||!plain(native.wire)||
     Object.keys(native.wire).length!==maps.length)fail('invalid native archive output');
  const interpreter=native.version+'/'+native.arch;
  if(expectedInterpreter!==null&&interpreter!==expectedInterpreter)fail('interpreter fingerprint mismatch');
  const orders={};
  for(const k of maps){
    const s=native.wire[k];
    if(typeof s!=='string')fail('missing native map '+k);
    const pairs=s===''?[]:s.split(','),keys=[];
    if(pairs.length!==2*Object.keys(after[k]).length)fail('native map length '+k);
    for(let i=0;i<pairs.length;i+=2){
      const key=pairs[i];
      if(keys.includes(key)||!Object.hasOwn(after[k],key)||String(after[k][key])!==pairs[i+1])
        fail('native map value or key mismatch '+k);
      keys.push(key);
    }
    orders[k]=Object.freeze(keys);
  }
  return Object.freeze({policy,seed,interpreter,
    archiveHashOrders:Object.freeze(orders),committable:false});
}

// Voluntary close starts at the current DataRead wire, without time advancement
// or sale mutations. Separate deterministic domain; not a historical CGI seed.
export const R4_VOLUNTARY_CLOSE_HASH_POLICY='akimono.r4.perl-voluntary-close-archive-hash-replay.v1';
export function resolveR4VoluntaryCloseArchiveHashOrders({reviewed,world,shopId,expectedInterpreter=null}){
  if(!reviews.has(reviewed))fail('pinned source review required');
  if(typeof world?.worldId!=='string'||!world.worldId||world.worldId.length>100||
     typeof world.streetId!=='string'||!world.streetId||world.streetId.length>100||
     !safe(world.revision)||!safe(world.nowSeconds)||!safe(shopId)||shopId<1||
     !Array.isArray(world.shops)||world.shops.length!==1)
    fail('one current command-start shop and server identity required');
  const shop=world.shops[0];
  if(!shelfShape(shop)||shop.id!==shopId||shop.status!==1)
    fail('exact current active source shelf state required');
  const initial=Object.fromEntries(maps.map(k=>[k,wire(shop[k],k)]));
  const seed='0x'+createHash('sha256').update(JSON.stringify([
    R4_VOLUNTARY_CLOSE_HASH_POLICY,world.worldId,world.streetId,world.revision,world.nowSeconds,shopId,
  ])).digest('hex').slice(0,32);
  return resolveNativeArchiveOrders({seed,initial,after:shop,sales:[],expectedInterpreter,policy:R4_VOLUNTARY_CLOSE_HASH_POLICY});
}
