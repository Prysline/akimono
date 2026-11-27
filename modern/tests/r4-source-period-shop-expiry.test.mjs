import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  reviewR4PeriodShopExpiry,projectR4PeriodShopExpiry,
  R4_EXPIRED_SHOP_SOURCE,
} from '../src/original-r4-period-shop-expiry.mjs';
const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const [periodSource,configSource]=await Promise.all([
  readFile(join(root,'modern/tests/original-perl/period.cgi'),'utf8'),
  readFile(join(root,'_config.cgi'),'utf8'),
]);
const reviewed=reviewR4PeriodShopExpiry({periodSource,configSource});
const original=()=>JSON.parse(execFileSync('perl',
  ['original-r4-period-shop-expiry-probe.pl'],{
    cwd:join(root,'modern/tests/original-perl'),encoding:'utf8',
  }));

test('R4 true frozen period.cgi shop expiration triggers exact CloseShop and original PushLog without deleting shop',()=>{
  assert.equal(reviewed.source,R4_EXPIRED_SHOP_SOURCE);
  assert.equal(reviewed.minimumShopAgeSeconds,43200);
  assert.equal(reviewed.absenceLimitSeconds,604800);
  assert.equal(reviewed.committable,false);
  assert.equal(reviewed.closeShopEffectKnown,false);
  const oracle=original();
  assert.equal(oracle.cases.length,9);
  for(const row of oracle.cases){
    const before=JSON.stringify(row.input);
    const got=projectR4PeriodShopExpiry({reviewed,...row.input});
    assert.equal(got.expiredOwner,row.output.expiredOwner,row.name);
    assert.deepEqual(got.closeCalls,row.output.closeCalls,row.name+' CloseShop');
    assert.deepEqual(got.logs,row.output.logs,row.name+' PushLog');
    assert.deepEqual(got.shop,row.output.shop,row.name+' no fake closure');
    assert.equal(got.committable,false);
    assert.equal(JSON.stringify(row.input),before,'original input unchanged');
  }
  assert.deepEqual(oracle.cases[1].output.closeCalls,[
    {shopId:1,reason:'経営者不在'},
  ]);
  assert.deepEqual(oracle.cases[1].output.logs,[
    [1,0,'原版無人店が経営者不在のため閉店しました。'],
  ]);
  assert.equal(oracle.cases[0].output.expiredOwner,false,
    'exactly 12 hours must not close');
  assert.equal(oracle.cases[3].output.expiredOwner,false,
    'exactly seven days must not close');
  assert.equal(oracle.cases[4].output.expiredOwner,true,
    'seven days plus one second does close');
});
test('R4 original period close-call oracle stable between independent Perl processes',()=>{
  for(let i=0;i<2;i++)for(const row of original().cases){
    const got=projectR4PeriodShopExpiry({reviewed,...row.input});
    assert.deepEqual(got.closeCalls,row.output.closeCalls);
    assert.deepEqual(got.logs,row.output.logs);
  }
});
test('R4 expiry source drift, wrong settings and invalid timestamps fail closed',()=>{
  assert.throws(()=>reviewR4PeriodShopExpiry({
    periodSource:periodSource.replace(
      '$DT->{lastlogin}+$EXPIRE_TIME<$NOW_TIME',
      '$DT->{lastlogin}+$EXPIRE_TIME<=$NOW_TIME',
    ),configSource,
  }),/original CloseShop source/);
  assert.throws(()=>reviewR4PeriodShopExpiry({
    periodSource,configSource:configSource.replace(
      '3600*24*7','3600*24*8',
    ),
  }),/EXPIRE_TIME seven-day source changed/);
  const row=original().cases[1].input;
  for(const changes of [
    {nowSeconds:-1},{nowSeconds:1.2},{shop:{...row.shop,lastlogin:-1}},
    {shop:{...row.shop,blocklogin:null}},
    {shop:{...row.shop,shopname:''}},
  ])assert.throws(()=>projectR4PeriodShopExpiry({
    reviewed,...row,...changes,
  }),/R4 original absent shop closure/);
  assert.throws(()=>projectR4PeriodShopExpiry({
    reviewed:{...reviewed,closeShopEffectKnown:true},...row,
  }),/source-reviewed original CloseShop invocation/);
});

test('R4 independent localized expiry reason and announcement match frozen period.cgi with zh_TW l()',()=>{
  const localized=reviewR4PeriodShopExpiry({periodSource,configSource,localized:true});
  const start=periodSource.indexOf('#経営者不在'),end=periodSource.indexOf('#ドラゴンレース清算',start);
  const block=periodSource.slice(start,end);
  const cases=original().cases;
  const perl=[
    'use utf8;use JSON::PP;no strict;no warnings;local $/;my $in=decode_json(<STDIN>);$EXPIRE_TIME=3600*24*7;',
    'sub l{my($s,@a)=@_;$s="沒有上線" if $s eq "経営者不在";$s="%1因為沒有上線所以店鋪被關閉了。" if $s eq "%1が経営者不在のため閉店しました。";$s=~s/%([1-9])/$a[$1-1]/ge;return $s}',
    'sub CloseShop{push @close,{shopId=>$_[0],reason=>$_[1]}} sub PushLog{push @log,[@_]}',
    'my @out;for my $x (@{$in->{inputs}}){$DT=$x->{shop};$NOW_TIME=$x->{nowSeconds};@close=();@log=();eval $in->{block};die $@ if $@;push @out,{closeCalls=>[@close],logs=>[@log]}}print encode_json([@out]);',
  ].join('\n');
  const expected=JSON.parse(execFileSync('perl',['-e',perl],{input:JSON.stringify({block,inputs:cases.map(c=>c.input)}),encoding:'utf8'}));
  for(let i=0;i<cases.length;i++){
    const got=projectR4PeriodShopExpiry({reviewed:localized,...cases[i].input});
    assert.deepEqual(got.closeCalls,expected[i].closeCalls);
    assert.deepEqual(got.logs,expected[i].logs);
    assert.equal(got.expiredOwner,cases[i].output.expiredOwner);
    assert.deepEqual(got.shop,cases[i].output.shop);
  }
});
