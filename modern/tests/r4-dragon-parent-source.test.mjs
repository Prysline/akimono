import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {projectDragonParent} from '../src/original-r4-dragon-parent.mjs';
const cwd=new URL('./original-perl/',import.meta.url);
const pins={'inc-dras-predit':'4030330b0a2faf4d45158dbee22df62c91870ca7','name':'ae3b3a862fc78b8775795ed88d5d1911861b3d80','inc-dragon':'76bb00f247733630cbcc374a82f693638f653b71','drreadb':'1b13a1a855490c80c88b0fa117676c68b6440753','drreada':'01110533ae1a223f687f13b02f0aaeebd30c3155','drreadc':'f363bcdab6022581976b6b99dd5e095b51f5f238','drwrite':'0abc25f24ea6bd06576d5d1ba31eeb82419a2fee','drlog':'e60cda027c87de25585ee59bf64a4cb24b9d1476'};
const read=name=>readFileSync(new URL('pinned-'+name+'.cgi',cwd));for(const [name,sha] of Object.entries(pins)){const b=read(name);assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),sha,name);}
const config=readFileSync(new URL('../../_config.cgi',import.meta.url));assert.equal(createHash('sha1').update('blob '+config.length+'\0').update(config).digest('hex'),'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0');
const ngNames=/@NG_SHOP_NAME\s*=\s*qw\(([^)]+)\)/.exec(config.toString('utf8'))[1].trim().split(/\s+/);
const perl=String.raw`use utf8; use JSON::PP; use File::Temp qw(tempdir);
our (@draws,@bounds);BEGIN {*CORE::GLOBAL::rand=sub {my($n)=@_;push @bounds,$n;die "NO_DRAW\n" unless @draws;return shift(@draws)*($n||1)}}
my $in=JSON::PP->new->utf8->decode(do {local $/;<STDIN>});
our ($COMMON_DIR,$COTEMP_DIR,$MYDIR,$NOW_TIME,$DT,%id2idx,@DRTIME,@trace,$LOG_EXPIRE_TIME,$IMAGE_URL,$IMAGE_EXT,$i,$TZ_JST,%Q,@NG_SHOP_NAME);
my $root=tempdir(CLEANUP=>1);$COMMON_DIR="$root/common";$COTEMP_DIR="$root/stage";mkdir $_ or die $! for ($COMMON_DIR,$COTEMP_DIR);
$MYDIR=$in->{street};$NOW_TIME=$in->{now};$LOG_EXPIRE_TIME=129600;@draws=@{$in->{draws}};$DT={id=>$in->{actorId}};@NG_SHOP_NAME=@{$in->{ngNames}};%Q=(%{$in->{command}},code=>$in->{command}{kind});$TZ_JST=32400;
$IMAGE_URL='./image';$IMAGE_EXT='.png';$i=$in->{sourceGlobalIndex};my $idx=0;for my $id(@{$in->{activeShopIds}}){$id2idx{$id}=$idx++}
sub GetPath {"$_[0]/$_[1].cgi"}
sub put {my($p,$s)=@_;open my $h,'>:encoding(UTF-8)',$p or die $!;print {$h} $s;close $h or die $!}
sub get {my($p)=@_;return '' unless -e $p;open my $h,'<:encoding(UTF-8)',$p or die $!;my $s=do {local $/;<$h>};close $h;return $s//''}
put(GetPath($COMMON_DIR,'dra-dr'),$in->{dragonText});put(GetPath($COMMON_DIR,'dra-pr'),$in->{parentText});
sub OutError {die "SOURCE_REFUSAL\n"}
sub l {my($s,@args)=@_;for my $j(0..$#args){my $n=$j+1;my $v=$args[$j]//'';$s=~s/%$n/$v/g}return $s}
sub OpenAndCheck {my($p)=@_;my($f)=$p=~/([^\/]+)\.cgi$/;push @trace,$f;open(OUT,'>:encoding(UTF-8)',$p) or die $!}
sub RenameAndCheck {rename($_[0],$_[1]) or die $!}
sub CoDataCA {push @trace,'common-commit';1}
sub CoUnLock {push @trace,'common-unlock';1}
require './pinned-inc-dragon.cgi';require './pinned-drreadb.cgi';require './pinned-drwrite.cgi';require './pinned-drlog.cgi';require './pinned-name.cgi';
my $ok=do './pinned-inc-dras-predit.cgi';my $err=$@;die "unexpected parent failure $err $!" unless $ok||$err eq "SOURCE_REFUSAL\n";
my $d=GetPath($COTEMP_DIR,'dra-dr');my $p=GetPath($COTEMP_DIR,'dra-pr');
print JSON::PP->new->utf8->encode({ok=>$ok?JSON::PP::true:JSON::PP::false,dragonText=>get(-e $d?$d:GetPath($COMMON_DIR,'dra-dr')),parentText=>get(-e $p?$p:GetPath($COMMON_DIR,'dra-pr')),parentChanged=>-e $p?JSON::PP::true:JSON::PP::false,newLogText=>get(GetPath($COTEMP_DIR,'dra-log0')),drawBounds=>\@bounds,trace=>\@trace});
`;
const oracle=input=>JSON.parse(execFileSync('perl',['-e',perl],{cwd,input:JSON.stringify(input),encoding:'utf8'}));
const DF=["no","birth","fm","color","name","town","owner","stable","race","apt","sp","spp","sr","srp","ag","agp","pw","pwp","hl","hlp","fl","flp","con","wt","gr","prize","sdwin","g3win","g2win","g1win"],PF=["no","birth","fm","color","name","town","owner","apt","hr","preg","sp","sr","ag","pw","hl","fl","prize","sdwin","g3win","g2win","g1win"],now=6000000;
const row=(keys,r)=>keys.map(k=>r[k]??'').join(',')+'\n';
const dragon=(over={})=>row(DF,{no:1,birth:now-864001,fm:1,color:2,name:'Dragon name',town:'alpha',owner:1,race:0,apt:2200,sp:50,spp:10,sr:30,srp:5,ag:20,pw:40,hl:20,fl:10,prize:300,...over});
const parent=(n,over={})=>row(PF,{no:n,birth:now-2000000,fm:n===1?1:0,color:0,name:'Parent '+n,town:n===1?'alpha':'beta',owner:1,apt:n===1?1400:2600,hr:n===1?20:80,sp:40,sr:30,ag:20,pw:40,hl:20,fl:10,prize:300,...over});
const fixture=(over={})=>({street:'alpha',activeShopIds:[1],actorId:1,now,dragonText:dragon(),parentText:parent(2)+parent(1),command:{kind:'retire',dr:1,check:'retire'},draws:[.5],ngNames:['管理','支','11','12','aa','http','?'],...over});
function compare(input){const before=structuredClone(input),o=oracle(input),a=projectDragonParent(input);assert.equal(o.ok,true);for(const k of ['dragonText','parentText','parentChanged','newLogText','drawBounds'])assert.deepEqual(a[k],o[k],k);assert.deepEqual(o.trace,[...(a.newLogText?['dra-log0']:[]),...(a.parentChanged?['dra-pr']:[]),'dra-dr','common-commit']);assert.deepEqual(a.payments,[]);assert.deepEqual(input,before);return a;}
test('R4 actual retire source inherited base traits, threshold and literal log placeholders',()=>{const a=compare(fixture({ngNames}));assert.ok(a.newLogText.includes('%1'));compare(fixture({dragonText:dragon({prize:299}),draws:[],ngNames}));const boundary=fixture({dragonText:dragon({birth:now-864000}),ngNames});assert.equal(oracle(boundary).ok,true);assert.throws(()=>projectDragonParent(boundary),/normal retire/);});
test('R4 actual breeding source cross-street sire, weighted heredity, draw order and no payment',()=>{const input=fixture({dragonText:'',command:{kind:'preg',dr:1,pr:2,name:'新生競技龍名稱'},draws:Array(10).fill(.5),ngNames});const a=compare(input);assert.equal(a.dragonText.split(',')[9],'2360');compare({...input,parentText:parent(2,{sp:0})+parent(1,{sp:0})});const boundary={...input,parentText:parent(2)+parent(1,{preg:now-259200})};assert.equal(oracle(boundary).ok,true);assert.throws(()=>projectDragonParent(boundary),/normal breeding/);});
test('R4 source parent denials and normal form policy',()=>{for(const input of [fixture({dragonText:dragon({race:2}),ngNames}),fixture({command:{kind:'retire',dr:1,check:'wrong'},ngNames}),fixture({dragonText:dragon({birth:now-863999}),ngNames})]){const o=oracle(input);assert.equal(o.ok,false);assert.deepEqual(o.trace,[]);assert.throws(()=>projectDragonParent(input),/R4 parent:/);}const b=fixture({dragonText:'',command:{kind:'preg',dr:1,pr:2,name:'管理測試名稱'},draws:Array(10).fill(.5),ngNames});assert.equal(oracle(b).ok,false);assert.throws(()=>projectDragonParent(b),/invalid name/);});
