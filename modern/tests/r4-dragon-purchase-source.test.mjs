import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {projectDragonPurchase} from '../src/original-r4-dragon-purchase.mjs';
const cwd=new URL('./original-perl/',import.meta.url);
const pins={'inc-dras-dredit':'3d995cc43a0c55c35903595ed2eb57805ece1578','inc-dragon':'76bb00f247733630cbcc374a82f693638f653b71','drreadb':'1b13a1a855490c80c88b0fa117676c68b6440753','drwrite':'0abc25f24ea6bd06576d5d1ba31eeb82419a2fee','drlog':'e60cda027c87de25585ee59bf64a4cb24b9d1476','name':'ae3b3a862fc78b8775795ed88d5d1911861b3d80'};
const hash=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
for(const [name,sha] of Object.entries(pins))assert.equal(hash(readFileSync(new URL('pinned-'+name+'.cgi',cwd))),sha,name);
const config=readFileSync(new URL('../../_config.cgi',import.meta.url));assert.equal(hash(config),'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0');
const ngNames=/@NG_SHOP_NAME\s*=\s*qw\(([^)]+)\)/.exec(config.toString('utf8'))[1].trim().split(/\s+/);
const perl=String.raw`use utf8; use JSON::PP; use File::Temp qw(tempdir);
our (@draws,@bounds);BEGIN {*CORE::GLOBAL::rand=sub {my($n)=@_;push @bounds,$n;die "NO_DRAW\n" unless @draws;return shift(@draws)*$n}}
my $in=JSON::PP->new->utf8->decode(do {local $/;<STDIN>});
our ($COMMON_DIR,$COTEMP_DIR,$MYDIR,$NOW_TIME,$DT,%id2idx,%Q,@NG_SHOP_NAME,$failStage,@trace);
my $root=tempdir(CLEANUP=>1);$COMMON_DIR="$root/common";$COTEMP_DIR="$root/stage";mkdir $_ or die $! for ($COMMON_DIR,$COTEMP_DIR);
$MYDIR=$in->{street};$NOW_TIME=$in->{now};$failStage=$in->{failStage};@NG_SHOP_NAME=@{$in->{ngNames}};@draws=@{$in->{draws}};
my $i=0;for my $row(@{$in->{shops}}){$id2idx{$row->{id}}=$i++;$DT=$row if $row->{id}==$in->{actorId}}
%Q=(code=>'new',map {$_=>$in->{command}{$_}} qw(name fm dist));
sub GetPath {"$_[0]/$_[1].cgi"}
sub put {my($p,$s)=@_;open my $h,'>:encoding(UTF-8)',$p or die $!;print {$h} $s;close $h or die $!}
sub get {my($p)=@_;return '' unless -e $p;open my $h,'<:encoding(UTF-8)',$p or die $!;my $s=do {local $/;<$h>};close $h;return $s//''}
my $pay=GetPath($COMMON_DIR,"drapay-$MYDIR");my $dragon=GetPath($COMMON_DIR,'dra-dr');my $stage=GetPath($COTEMP_DIR,'dra-dr');my $ranch=GetPath($COMMON_DIR,'dra-rc');
put($ranch,$in->{ranchText});put($dragon,$in->{dragonText});put($pay,$in->{payoutText});
sub l {$_[0]}
sub OutError {die "SOURCE_REFUSAL\n"}
sub OpenAndCheck {push @trace,'dragon-stage';die "STAGE_FAILURE\n" if $failStage;open(OUT,'>:encoding(UTF-8)',$_[0]) or die $!}
sub CoDataCA {push @trace,'common-commit';1}
require './pinned-inc-dragon.cgi';require './pinned-drreadb.cgi';require './pinned-drwrite.cgi';require './pinned-drlog.cgi';require './pinned-name.cgi';
my $ok=do './pinned-inc-dras-dredit.cgi';my $err=$@;die "unexpected dragon failure $err $!" unless $ok||$err eq "SOURCE_REFUSAL\n"||$err eq "STAGE_FAILURE\n";
print JSON::PP->new->utf8->encode({ok=>$ok?JSON::PP::true:JSON::PP::false,dragonText=>get($stage),liveDragon=>get($dragon),ranchText=>get($ranch),payoutText=>get($pay),actor=>$DT,drawBounds=>\@bounds,trace=>\@trace});
`;
const oracle=input=>JSON.parse(execFileSync('perl',['-e',perl],{cwd,input:JSON.stringify(input),encoding:'utf8'}));
const ranch=(no,town,owner)=>[no,999999,'Ranch name',town,owner,'','','','',''].join(',')+'\n';
const fixture=(over={})=>({street:'alpha',shops:[{id:2,money:500000},{id:1,money:500000}],actorId:1,now:1000000,ranchText:ranch(1,'alpha',1),dragonText:'',payoutText:'',command:{kind:'dragon-new',name:'競技龍名稱測試',fm:1,dist:2},draws:Array(10).fill(0),ngNames,...over});
const compare=input=>{const before=structuredClone(input),o=oracle(input),a=projectDragonPurchase(input);assert.equal(o.ok,true);for(const k of ['dragonText','ranchText','payoutText','actor','drawBounds'])assert.deepEqual(a[k],o[k],k);assert.equal(o.liveDragon,input.dragonText);assert.deepEqual(o.trace,['dragon-stage','common-commit']);assert.equal(a.committable,false);assert.deepEqual(input,before);return a};
test('R4 dragon purchase actual pinned handler: ten RNG calls, sparse wire, same-street ownership and deferred payout',()=>{
  const a=compare(fixture());const b=compare(fixture({dragonText:a.dragonText,payoutText:a.payoutText,draws:[.99,.99,.99,.99,0,.99,.99,.99,.99,.99]}));
  const c=compare(fixture({dragonText:b.dragonText,payoutText:b.payoutText,command:{kind:'dragon-new',name:'abcdef',fm:0,dist:0}}));
  assert.equal(c.payoutText,'1\t-500000\n'.repeat(3));
  const remote=compare(fixture({street:'beta',ranchText:ranch(2,'beta',1),dragonText:c.dragonText}));assert.equal(remote.payment.dragonNo,4);
  const capped=fixture({dragonText:c.dragonText});const o=oracle(capped);assert.equal(o.ok,false);assert.deepEqual(o.drawBounds,[]);assert.equal(o.payoutText,'');assert.throws(()=>projectDragonPurchase(capped),/capacity/);
});
test('R4 purchase actual refusals use frozen CheckNGName and no RNG or publication; source partial append is preserved',()=>{
  for(const input of [fixture({ranchText:ranch(2,'beta',1)}),fixture({shops:[{id:1,money:499999}]}),fixture({command:{kind:'dragon-new',name:'管理測試名稱',fm:0,dist:0}}),fixture({command:{kind:'dragon-new',name:'a'.repeat(21),fm:0,dist:0}}),fixture({command:{kind:'dragon-new',name:'abc,def',fm:0,dist:0}})]){
    const o=oracle(input);assert.equal(o.ok,false);assert.deepEqual(o.trace,[]);assert.deepEqual(o.drawBounds,[]);assert.equal(o.payoutText,input.payoutText);assert.equal(o.liveDragon,input.dragonText);assert.throws(()=>projectDragonPurchase(input),/R4 dragon purchase:/);
  }
  const input=fixture({failStage:true});const o=oracle(input),a=projectDragonPurchase(input);assert.equal(o.ok,false);assert.equal(o.payoutText,a.payoutText);assert.equal(o.dragonText,'');assert.equal(o.liveDragon,input.dragonText);assert.deepEqual(o.trace,['dragon-stage']);assert.equal(a.committable,false);
});
