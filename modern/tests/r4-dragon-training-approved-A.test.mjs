import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {projectDragonTrainingApprovedA as project} from '../src/original-r4-dragon-training.mjs';
const cwd=new URL('./original-perl/',import.meta.url);
const pins={'inc-dr-edit1':'e1b7319efb20ff56b5a2a04783906ca3b649bf2e','inc-dragon':'76bb00f247733630cbcc374a82f693638f653b71','drreadb':'1b13a1a855490c80c88b0fa117676c68b6440753','drreada':'01110533ae1a223f687f13b02f0aaeebd30c3155','drwrite':'0abc25f24ea6bd06576d5d1ba31eeb82419a2fee','drlog':'e60cda027c87de25585ee59bf64a4cb24b9d1476'};
for(const [name,sha] of Object.entries(pins)){const b=readFileSync(new URL('pinned-'+name+'.cgi',cwd));assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),sha,name);}
const perl=String.raw`use utf8; use JSON::PP; use File::Temp qw(tempdir);
our (@draws,@bounds);BEGIN {*CORE::GLOBAL::rand=sub {my($n)=@_;push @bounds,$n;die "NO_DRAW\n" unless @draws;return shift(@draws)*$n}}
my $in=JSON::PP->new->utf8->decode(do {local $/;<STDIN>});
our ($COMMON_DIR,$COTEMP_DIR,$MYDIR,$NOW_TIME,$DT,%id2idx,$TZ_JST,$LOG_EXPIRE_TIME,@DRTIME,@trace,$failStage);
my $root=tempdir(CLEANUP=>1);$COMMON_DIR="$root/common";$COTEMP_DIR="$root/stage";mkdir $_ or die $! for ($COMMON_DIR,$COTEMP_DIR);
$MYDIR=$in->{street};$NOW_TIME=$in->{now};$TZ_JST=32400;$LOG_EXPIRE_TIME=129600;$failStage=$in->{failStage};@draws=@{$in->{draws}};
my $i=0;for my $id(@{$in->{activeShopIds}}){$id2idx{$id}=$i++}$DT={id=>$in->{activeShopIds}[0]};
sub GetPath {"$_[0]/$_[1].cgi"}
sub put {my($p,$s)=@_;open my $h,'>:encoding(UTF-8)',$p or die $!;print {$h} $s;close $h or die $!}
sub get {my($p)=@_;return '' unless -e $p;open my $h,'<:encoding(UTF-8)',$p or die $!;my $s=do {local $/;<$h>};close $h;return $s//''}
put(GetPath($COMMON_DIR,'dra-dr'),$in->{dragonText});put(GetPath($COMMON_DIR,'dra-st'),$in->{stableText});put(GetPath($COMMON_DIR,'dra-rc'),$in->{ranchText});
for my $t(keys %{$in->{payoutByStreet}}){put(GetPath($COMMON_DIR,"drapay-$t"),$in->{payoutByStreet}{$t})}
sub l {my($s,@args)=@_;for my $j(0..$#args){my $n=$j+1;my $v=$args[$j]//'';$s=~s/%$n/$v/g}return $s}
sub OpenAndCheck {my($p)=@_;my($f)=$p=~/([^\/]+)\.cgi$/;push @trace,$f;die "STAGE_FAILURE\n" if $failStage&&$f eq 'dra-dr';open(OUT,'>:encoding(UTF-8)',$p) or die $!}
sub RenameAndCheck {rename($_[0],$_[1]) or die $!}
sub CoDataCA {push @trace,'common-commit';1}
sub CoUnLock {push @trace,'common-unlock';1}
require './pinned-inc-dragon.cgi';require './pinned-drreadb.cgi';require './pinned-drreada.cgi';require './pinned-drwrite.cgi';require './pinned-drlog.cgi';@DRTIME=@{$in->{drTime}};
my $ok=do './pinned-inc-dr-edit1.cgi';my $err=$@;die "unexpected training failure $err $!" unless $ok||$err eq "STAGE_FAILURE\n";
my %pay;opendir(my $dir,$COMMON_DIR) or die $!;for my $f(readdir($dir)){if($f=~/^drapay-(.*)\.cgi$/){$pay{$1}=get("$COMMON_DIR/$f")}}closedir($dir);
my $st=GetPath($COTEMP_DIR,'dra-st');
print JSON::PP->new->utf8->encode({ok=>$ok?JSON::PP::true:JSON::PP::false,dragonText=>get(GetPath($COTEMP_DIR,'dra-dr')),liveDragon=>get(GetPath($COMMON_DIR,'dra-dr')),stableText=>get(-e $st?$st:GetPath($COMMON_DIR,'dra-st')),stableChanged=>-e $st?JSON::PP::true:JSON::PP::false,ranchText=>get(GetPath($COMMON_DIR,'dra-rc')),payoutByStreet=>\%pay,drawBounds=>\@bounds,drTime=>\@DRTIME,drLastText=>get(GetPath($COTEMP_DIR,'dr-last')),newLogText=>get(GetPath($COTEMP_DIR,'dra-log0')),trace=>\@trace});
`;
const oracle=input=>JSON.parse(execFileSync('perl',['-e',perl],{cwd,input:JSON.stringify(input),encoding:'utf8'}));
const DF='no birth fm color name town owner stable race apt sp spp sr srp ag agp pw pwp hl hlp fl flp con wt gr prize sdwin g3win g2win g1win'.split(' ');
const SF='no birth name town owner emp tr con wt sp sr ag pw hl fl sdwin g3win g2win g1win'.split(' ');
const now=6000000,day=86400;
const row=(keys,r)=>keys.map(k=>r[k]??'').join(',')+'\n';
const dragon=(over={})=>row(DF,{no:1,birth:now-5*day,fm:0,color:0,name:'Dragon name',town:'alpha',owner:1,stable:7,race:0,apt:1400,sp:10,sr:10,ag:10,pw:10,hl:20,fl:10,con:99,wt:49,gr:75,...over});
const stable=(over={})=>row(SF,{no:7,birth:now-3*day,name:'Stable name',town:'beta',owner:1,emp:0,tr:20,con:25,wt:0,sp:1,sr:1,ag:0,pw:0,hl:0,fl:0,...over});
const fixture=(over={})=>({street:'alpha',activeShopIds:[1],now,drTime:[now-1,now+100,now+200],dragonText:dragon(),stableText:stable(),ranchText:'',payoutByStreet:{alpha:'1\t-100000\n'},draws:[.5,.5,0,0,.99,0,.99,.99,.99,.99,.99,.99],...over});
// Reuse the exact oracle setup above; legacy source and tests stay unchanged.
const directory={alpha:[1],beta:[1]};
function compare(input){
  const before=structuredClone(input),o=oracle(input),a=project(input);assert.equal(o.ok,true);
  for(const k of ['dragonText','stableText','stableChanged','ranchText','drawBounds','drTime','drLastText','newLogText'])assert.deepEqual(a[k],o[k],k);
  const raw={...input.payoutByStreet};for(const p of a.sourcePayments)raw[p.street]=(raw[p.street]??'')+p.bytes;
  assert.deepEqual(raw,o.payoutByStreet);assert.deepEqual(a.sourcePayments.map(p=>p.ordinal),a.sourcePayments.map((_,i)=>i));
  assert.equal(a.committable,false);assert.equal(a.worldStateWritten,false);assert.deepEqual(input,before);return a;
}
test('approved A local stale slot keeps charge, zero-field training and closure, quarantines blank payee',()=>{
  const input=fixture({activeByStreet:directory,stableText:stable({town:'alpha',owner:99}),dragonText:dragon({gr:0}),draws:[.5,.5,0,0],payoutByStreet:{}});
  const a=compare(input);assert.deepEqual(a.payoutByStreet,{alpha:'1\t-100000\n'});assert.equal(a.stableText,'');assert.equal(a.quarantinedPayments.length,1);
  assert.deepEqual(a.quarantinedPayments[0],{street:'',shopId:null,sourceAction:'boarding-income',sourceNo:1,amount:100000,bytes:'\t100000\n',ordinal:1,disposition:'quarantine',reason:'missing-source-recipient'});
  assert.equal(a.dragonText.split(',')[7],'7');
  compare({...input,dragonText:dragon({gr:90}),draws:[.5,.5,0,0,0,0,0,.99,.99,.99,.99,.99]});
});
test('approved A foreign stale owner preserves source full stable and RNG, filters both unknown owner payments',()=>{
  const a=compare(fixture({street:'beta',activeByStreet:directory,stableText:stable({town:'alpha',owner:99}),dragonText:dragon({gr:0}),draws:[.5,.5,0,0],payoutByStreet:{}}));
  assert.deepEqual(a.payoutByStreet,{alpha:'1\t-100000\n'});assert.equal(a.stableChanged,false);assert.deepEqual(a.quarantinedPayments.map(p=>[p.shopId,p.amount,p.reason]),[[99,100000,'inactive-source-owner'],[99,-200000,'inactive-source-owner']]);
});
test('approved A valid cross-street same ID and repeated bytes settle; missing directory refuses',()=>{
  const input=fixture({activeByStreet:directory}),a=compare(input);assert.equal(a.quarantinedPayments.length,0);assert.deepEqual(a.payoutByStreet,{alpha:'1\t-100000\n1\t-100000\n',beta:'1\t100000\n1\t-200000\n'});
  compare(fixture({activeByStreet:directory,dragonText:'',stableText:stable({town:'alpha',owner:99}),draws:[],payoutByStreet:{}}));
  for(const activeByStreet of [null,{alpha:[1]},{alpha:[2],beta:[1]},{alpha:[1],beta:[1,1]}])assert.throws(()=>project({...input,activeByStreet}),/R4 dragon training:/);
});
