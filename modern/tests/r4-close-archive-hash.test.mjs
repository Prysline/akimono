import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {r4HashSeed} from '../src/original-r4-perl-hash-replay.mjs';
import {reviewR4CloseArchiveHash,resolveR4CloseArchiveHashOrders,resolveR4VoluntaryCloseArchiveHashOrders,R4_VOLUNTARY_CLOSE_HASH_POLICY} from '../src/original-r4-close-archive-hash.mjs';

const paths={readSource:'inc-func.cgi',turnSource:'inc-turn.cgi',writeSource:'write.cgi',userSource:'pinned-user.cgi'};
const sources=Object.fromEntries(await Promise.all(Object.entries(paths).map(async([k,p])=>[
  k,await readFile(new URL('./original-perl/'+p,import.meta.url),'utf8'),
])));
const reviewed=reviewR4CloseArchiveHash(sources);
function example(){
  const item=Array(79).fill(0);item[9]=8;item[12]=5;
  const before={id:1,showcasecount:4,showcase:[10,13,10,0],price:[100,200,100,0],item,
    itemyesterday:{1:9,10:2,25:1,79:3},itemtoday:{2:1,10:3,65:2},exp:{3:100,14:20,79:2},user:{}};
  const after=structuredClone(before);
  after.item[9]=3;after.item[12]=4;after.itemtoday[10]=8;after.itemtoday[13]=1;
  const shelfSales=[
    {shelf:0,itemId:10,count:2,unitPrice:100,stockBefore:8,stockAfter:6},
    {shelf:1,itemId:13,count:1,unitPrice:200,stockBefore:5,stockAfter:4},
    {shelf:2,itemId:10,count:3,unitPrice:100,stockBefore:6,stockAfter:3},
  ];
  return {reviewed,world:{worldId:'isolated-close-hash-unit',revision:12,nowSeconds:100000,shops:[before]},
    minutes:60,shopAfterSale:after,shelfSales};
}
test('R4 native archive hash order replays source DataRead and repeated shelf sale mutations',()=>{
  const a=example(),before=structuredClone(a.world),after=structuredClone(a.shopAfterSale);
  const readLine=sources.readSource.split('\n').find(l=>l.includes('@DT{qw(itemyesterday itemtoday exp)}='));
  const saleLine=sources.turnSource.split('\n').find(l=>l.includes('$DT->{itemtoday}{$itemno}+=$sale;'));
  assert.ok(readLine);assert.ok(saleLine);
  const maps=['itemyesterday','itemtoday','exp','user'];
  const originalJoins=maps.map(k=>{
    const s='join(",",%{$DT->{'+k+'}})';
    assert.ok(sources.writeSource.includes(s));return s;
  });
  const script=[
    'use strict;use warnings;use JSON::PP;local $/;my $in=decode_json(<STDIN>);',
    'my @list=("","","",@{$in->{maps}});my %DT;',readLine,
    '$DT{user}={};my $DT=\\%DT;',
    'for my $row (@{$in->{sales}}){my ($itemno,$sale)=@$row;',saleLine,'}',
    'print encode_json(['+originalJoins.join(',')+']);',
  ].join('\n');
  for(const revision of [12,13,14]){
    a.world.revision=revision;
    const got=resolveR4CloseArchiveHashOrders(a);
    const env={...process.env,PERL_HASH_SEED:r4HashSeed(a),PERL_PERTURB_KEYS:'0'};
    const native=JSON.parse(execFileSync('perl',['-e',script],{
      env,encoding:'utf8',input:JSON.stringify({
        maps:maps.slice(0,3).map(k=>Object.entries(before.shops[0][k]).flat().join(',')),
        sales:a.shelfSales.map(x=>[x.itemId,x.count]),
      }),
    }));
    assert.deepEqual(native,maps.map(k=>got.archiveHashOrders[k].flatMap(id=>[id,after[k][id]]).join(',')));
    assert.deepEqual(resolveR4CloseArchiveHashOrders({...a,expectedInterpreter:got.interpreter}),got);
    assert.equal(got.committable,false);
  }
  assert.deepEqual(a.world.shops,before.shops);assert.deepEqual(a.shopAfterSale,after);
});
test('R4 native archive hash rejects unreviewed or forged mutation evidence',()=>{
  const a=example();
  assert.throws(()=>reviewR4CloseArchiveHash({...sources,turnSource:sources.turnSource+'\n'}),/source drift/);
  assert.throws(()=>resolveR4CloseArchiveHashOrders({...a,reviewed:{...reviewed}}),/pinned source/);
  assert.throws(()=>resolveR4CloseArchiveHashOrders({...a,shelfSales:[...a.shelfSales].reverse()}),/ordered source shelf/);
  assert.throws(()=>resolveR4CloseArchiveHashOrders({...a,shelfSales:a.shelfSales.slice(0,2)}),/reconstruct/);
  assert.throws(()=>resolveR4CloseArchiveHashOrders({...a,expectedInterpreter:'wrong'}),/fingerprint/);
  a.shopAfterSale.exp[14]=21;
  assert.throws(()=>resolveR4CloseArchiveHashOrders(a),/reconstruct/);
  const b=example();b.world.shops[0].user={a:'b'};b.shopAfterSale.user={a:'b'};
  assert.throws(()=>resolveR4CloseArchiveHashOrders(b),/nonempty original user/);
});
test('R4 native archive hash preserves empty maps without inventing sales',()=>{
  const a=example(),s=a.world.shops[0];
  s.itemyesterday={};s.itemtoday={};s.exp={};
  a.shopAfterSale=structuredClone(s);a.shelfSales=[];
  assert.deepEqual(resolveR4CloseArchiveHashOrders(a).archiveHashOrders,{itemyesterday:[],itemtoday:[],exp:[],user:[]});
});


test('R4 voluntary close replays current native DataRead map order with no time or sale mutation',()=>{
  const a=example(),shop=a.world.shops[0];shop.status=1;
  const world={...a.world,streetId:'standard-street'},input={reviewed,world,shopId:1};
  const before=structuredClone(world),got=resolveR4VoluntaryCloseArchiveHashOrders(input);
  const maps=['itemyesterday','itemtoday','exp','user'];
  const readLine=sources.readSource.split('\n').find(l=>l.includes('@DT{qw(itemyesterday itemtoday exp)}='));
  assert.ok(readLine&&!readLine.includes('\n'));
  const originalJoins=maps.map(k=>{const s='join(",",%{$DT->{'+k+'}})';assert.ok(sources.writeSource.includes(s));return s;});
  const script=['use strict;use warnings;use JSON::PP;local $/;my $in=decode_json(<STDIN>);',
    'my @list=("","","",@{$in->{maps}});my %DT;',readLine,
    '$DT{user}={};my $DT=\\%DT;', 'print encode_json(['+originalJoins.join(',')+']);'].join('\n');
  const native=JSON.parse(execFileSync('perl',['-e',script],{encoding:'utf8',env:{...process.env,PERL_HASH_SEED:got.seed,PERL_PERTURB_KEYS:'0'},input:JSON.stringify({maps:maps.slice(0,3).map(k=>Object.entries(shop[k]).flat().join(','))})}));
  assert.deepEqual(native,maps.map(k=>got.archiveHashOrders[k].flatMap(id=>[id,shop[k][id]]).join(',')));
  assert.equal(got.policy,R4_VOLUNTARY_CLOSE_HASH_POLICY);assert.equal(got.committable,false);
  assert.deepEqual(resolveR4VoluntaryCloseArchiveHashOrders({...input,expectedInterpreter:got.interpreter}),got);
  assert.notEqual(resolveR4VoluntaryCloseArchiveHashOrders({...input,world:{...world,revision:13}}).seed,got.seed);
  assert.deepEqual(world,before);
  assert.throws(()=>resolveR4VoluntaryCloseArchiveHashOrders({...input,shopId:2}),/active source/);
  assert.throws(()=>resolveR4VoluntaryCloseArchiveHashOrders({...input,expectedInterpreter:'wrong'}),/fingerprint/);
  assert.throws(()=>resolveR4VoluntaryCloseArchiveHashOrders({...input,world:{...world,shops:[shop,{...shop,id:2}]}}),/one current/);
  assert.throws(()=>resolveR4VoluntaryCloseArchiveHashOrders({...input,world:{...world,shops:[{...shop,user:{a:'b'}}]}}),/nonempty original user/);
});
