import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {projectRaceClosure,reviewRaceClosureConfig} from '../src/original-r4-dragon-race-closure.mjs';
const cwd=new URL('./original-perl/',import.meta.url);
const pins={'inc-dr-edit2-entry':'5ddfbd3e330b0f2c6c97122a273588b5e6d3323b','inc-dragon':'76bb00f247733630cbcc374a82f693638f653b71','drreadb':'1b13a1a855490c80c88b0fa117676c68b6440753','drreada':'01110533ae1a223f687f13b02f0aaeebd30c3155','drreadc':'f363bcdab6022581976b6b99dd5e095b51f5f238','drwrite':'0abc25f24ea6bd06576d5d1ba31eeb82419a2fee','drlog':'e60cda027c87de25585ee59bf64a4cb24b9d1476'};
const read=name=>readFileSync(new URL('pinned-'+name+'.cgi',cwd));for(const [name,sha] of Object.entries(pins)){const b=read(name);assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),sha,name);}
const review=reviewRaceClosureConfig(read('inc-dragon').toString('utf8'));
const perl=String.raw`use utf8; use JSON::PP; use File::Temp qw(tempdir);
our (@draws,@bounds);BEGIN {*CORE::GLOBAL::rand=sub {my($n)=@_;push @bounds,$n;die "NO_DRAW\n" unless @draws;return shift(@draws)*$n}}
my $in=JSON::PP->new->utf8->decode(do {local $/;<STDIN>});
our ($COMMON_DIR,$COTEMP_DIR,$MYDIR,$NOW_TIME,$DT,%id2idx,@DRTIME,@trace,$LOG_EXPIRE_TIME);
my $root=tempdir(CLEANUP=>1);$COMMON_DIR="$root/common";$COTEMP_DIR="$root/stage";mkdir $_ or die $! for ($COMMON_DIR,$COTEMP_DIR);
$MYDIR=$in->{street};$NOW_TIME=$in->{now};$LOG_EXPIRE_TIME=129600;@draws=@{$in->{draws}};$DT={id=>$in->{activeShopIds}[0]};
my $i=0;for my $id(@{$in->{activeShopIds}}){$id2idx{$id}=$i++}
sub GetPath {"$_[0]/$_[1].cgi"}
sub put {my($p,$s)=@_;open my $h,'>:encoding(UTF-8)',$p or die $!;print {$h} $s;close $h or die $!}
sub get {my($p)=@_;return '' unless -e $p;open my $h,'<:encoding(UTF-8)',$p or die $!;my $s=do {local $/;<$h>};close $h;return $s//''}
put(GetPath($COMMON_DIR,'dra-dr'),$in->{dragonText});put(GetPath($COMMON_DIR,'dra-jk'),$in->{jockeyText});
for my $c(0,1){put(GetPath($COMMON_DIR,"dra-rd$c"),$in->{raceByCode}[$c]) if $in->{raceByCode}[$c] ne '';put(GetPath($COMMON_DIR,"dra-rlog$c"),$in->{raceLogByCode}[$c]) if defined $in->{raceLogByCode}[$c]}
sub l {my($s,@args)=@_;for my $j(0..$#args){my $n=$j+1;my $v=$args[$j]//'';$s=~s/%$n/$v/g}return $s}
sub OpenAndCheck {my($p)=@_;my($f)=$p=~/([^\/]+)\.cgi$/;push @trace,$f;open(OUT,'>:encoding(UTF-8)',$p) or die $!}
sub RenameAndCheck {rename($_[0],$_[1]) or die $!}
sub CoDataCA {push @trace,'common-commit';1}
sub CoUnLock {push @trace,'common-unlock';1}
require './pinned-inc-dragon.cgi';require './pinned-drreadb.cgi';require './pinned-drreada.cgi';require './pinned-drreadc.cgi';require './pinned-drwrite.cgi';require './pinned-drlog.cgi';@DRTIME=@{$in->{drTime}};
my $ok=do './pinned-inc-dr-edit2-entry.cgi';die "unexpected closure failure $@ $!" unless $ok;
my(@r,@log);for my $c(0,1){my $p=GetPath($COTEMP_DIR,"dra-rd$c");push @r,get(-e $p?$p:GetPath($COMMON_DIR,"dra-rd$c"));$p=GetPath($COMMON_DIR,"dra-rlog$c");push @log,(-e $p?get($p):undef);}
print JSON::PP->new->utf8->encode({raceCode=>0+$rcode,raceByCode=>\@r,raceLogByCode=>\@log,dragonText=>get(GetPath($COTEMP_DIR,'dra-dr')),jockeyText=>get(GetPath($COTEMP_DIR,'dra-jk')),drTime=>\@DRTIME,drLastText=>get(GetPath($COTEMP_DIR,'dr-last')),newLogText=>get(GetPath($COTEMP_DIR,'dra-log0')),drawBounds=>\@bounds,trace=>\@trace});
`;
const oracle=input=>JSON.parse(execFileSync('perl',['-e',perl],{cwd,input:JSON.stringify(input),encoding:'utf8'}));
const DF='no birth fm color name town owner stable race apt sp spp sr srp ag agp pw pwp hl hlp fl flp con wt gr prize sdwin g3win g2win g1win'.split(' ');
const JF='no birth name town owner race ahead back sp sdwin g3win g2win g1win'.split(' ');
const RF='no dr birth fm color name ranch rcname stable stname jock jkname prize strate sp1 sp2 sp3 sp4 pop time str lose'.split(' ');
const now=6000000,row=(keys,r)=>keys.map(k=>r[k]??'').join(',')+'\n';
const dragon=i=>row(DF,{no:i,birth:5000000,fm:0,color:0,name:'Dragon '+i,town:'alpha',owner:1,race:2,prize:i});
const jockey=i=>row(JF,{no:i,birth:5000000,name:'Jockey '+i,town:i===2?'alpha':'beta',owner:i===2?99:1,race:2});
const entry=i=>row(RF,{no:i,dr:i,birth:5000000,name:'Dragon '+i,jock:i,prize:i,sp1:1000,sp2:1000,sp3:1000,sp4:1000,str:1});
const fixture=(n,over={})=>({street:'alpha',activeShopIds:[1],now,drTime:[now+100,now-1,now+100],dragonText:Array.from({length:n},(_,i)=>dragon(i+1)).join(''),jockeyText:Array.from({length:n},(_,i)=>jockey(i+1)).join(''),raceByCode:['0,11,0\n'+Array.from({length:n},(_,i)=>entry(i+1)).join(''),'0,0,1\n'],raceLogByCode:['old race','other race'],draws:n<3?[.75]:n>10?Array(n).fill(.5):[],...over});
const project=input=>projectRaceClosure({...input,review});
function compare(input){const before=structuredClone(input),o=oracle(input),a=project(input);for(const k of ['raceCode','raceByCode','raceLogByCode','dragonText','jockeyText','drTime','drLastText','newLogText','drawBounds'])assert.deepEqual(a[k],o[k],k);assert.deepEqual(o.trace,['dra-dr','dra-jk','dra-rd'+a.raceCode,'dr-last','dra-log0','common-commit','common-unlock']);assert.deepEqual(a.payments,[]);assert.equal(a.committable,false);assert.deepEqual(input,before);return a;}
test('R4 actual phase zero cancels fewer than three, advances old deadline and wraps race index',()=>{for(const n of [0,1,2]){const a=compare(fixture(n));assert.equal(a.raceByCode[0],'0,0,1\n');assert.equal(a.drTime[1],now-1+172800);assert.equal(a.rejectedDragonIds.length,n);assert.equal(a.raceLogByCode[0],null);}});
test('R4 actual phase zero accepts normal entries without draw and renumbers slots',()=>{for(const n of [3,10]){const a=compare(fixture(n));assert.equal(a.raceByCode[0].split('\n')[0],'1,11,0');assert.equal(a.drTime[1],now-1+7200);assert.equal(a.selectedDragonIds.length,n);assert.deepEqual(a.drawBounds,[]);}});
test('R4 actual oversubscription uses opposite prize ordering and exact draws, preserves other race',()=>{const ordinary=compare(fixture(12));assert.deepEqual(ordinary.selectedDragonIds,[1,2,3,4,5,6,7,8,9,10]);const input=fixture(12);const major=compare({...input,drTime:[now+100,now-1,now-1],raceByCode:[input.raceByCode[1],input.raceByCode[0]]});assert.equal(major.raceCode,1);assert.deepEqual(major.selectedDragonIds,[12,11,10,9,8,7,6,5,4,3]);assert.deepEqual(major.rejectedDragonIds,[2,1]);assert.equal(major.raceLogByCode[0],'old race');for(const bad of [{...input,drTime:[now-1,now-1,now-1]},{...input,draws:[]},{...input,raceByCode:['1,0,0\n','']}])assert.throws(()=>project(bad),/R4 race closure:/);});
