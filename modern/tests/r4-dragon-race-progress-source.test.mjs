import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {projectRaceProgress,reviewRaceProgressConfig} from '../src/original-r4-dragon-race-progress.mjs';
const cwd=new URL('./original-perl/',import.meta.url);
const pins={'inc-dr-edit2':'4085a0743b1a8e59d2d1eb0da62ca5af222f9f75','inc-dragon':'76bb00f247733630cbcc374a82f693638f653b71','drreadb':'1b13a1a855490c80c88b0fa117676c68b6440753','drreada':'01110533ae1a223f687f13b02f0aaeebd30c3155','drreadc':'f363bcdab6022581976b6b99dd5e095b51f5f238','drwrite':'0abc25f24ea6bd06576d5d1ba31eeb82419a2fee','drlog':'e60cda027c87de25585ee59bf64a4cb24b9d1476'};
const read=name=>readFileSync(new URL('pinned-'+name+'.cgi',cwd));for(const [name,sha] of Object.entries(pins)){const b=read(name);assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),sha,name);}
const review=reviewRaceProgressConfig(read('inc-dragon').toString('utf8'));
const perl=String.raw`use utf8; use JSON::PP; use File::Temp qw(tempdir);
our (@draws,@bounds);BEGIN {*CORE::GLOBAL::rand=sub {my($n)=@_;push @bounds,$n;die "NO_DRAW\n" unless @draws;return shift(@draws)*$n}}
my $in=JSON::PP->new->utf8->decode(do {local $/;<STDIN>});
our ($COMMON_DIR,$COTEMP_DIR,$MYDIR,$NOW_TIME,$DT,%id2idx,@DRTIME,@trace,$LOG_EXPIRE_TIME,$IMAGE_URL,$IMAGE_EXT,$i);
my $root=tempdir(CLEANUP=>1);$COMMON_DIR="$root/common";$COTEMP_DIR="$root/stage";mkdir $_ or die $! for ($COMMON_DIR,$COTEMP_DIR);
$MYDIR=$in->{street};$NOW_TIME=$in->{now};$LOG_EXPIRE_TIME=129600;@draws=@{$in->{draws}};$DT={id=>$in->{activeShopIds}[0]};
$IMAGE_URL='./image';$IMAGE_EXT='.png';$i=$in->{sourceGlobalIndex};my $idx=0;for my $id(@{$in->{activeShopIds}}){$id2idx{$id}=$idx++}
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
my $ok=do './pinned-inc-dr-edit2.cgi';die "unexpected closure failure $@ $!" unless $ok;
my(@r,@log);for my $c(0,1){my $p=GetPath($COTEMP_DIR,"dra-rd$c");push @r,get(-e $p?$p:GetPath($COMMON_DIR,"dra-rd$c"));$p=GetPath($COMMON_DIR,"dra-rlog$c");push @log,(-e $p?get($p):undef);}
print JSON::PP->new->utf8->encode({raceCode=>0+$rcode,raceByCode=>\@r,raceLogByCode=>\@log,dragonText=>get(GetPath($COTEMP_DIR,'dra-dr')),jockeyText=>get(GetPath($COTEMP_DIR,'dra-jk')),drTime=>\@DRTIME,drLastText=>get(GetPath($COTEMP_DIR,'dr-last')),newLogText=>get(GetPath($COTEMP_DIR,'dra-log0')),drawBounds=>\@bounds,trace=>\@trace});
`;
const oracle=input=>JSON.parse(execFileSync('perl',['-e',perl],{cwd,input:JSON.stringify(input),encoding:'utf8'}));
const RF='no dr birth fm color name ranch rcname stable stname jock jkname prize strate sp1 sp2 sp3 sp4 pop time str lose'.split(' ');
const now=6000000;
const row=(n,over={})=>RF.map(k=>({no:n,dr:n,birth:5000000,fm:0,color:n-1,name:'Dragon '+n,prize:n,strate:n-1,sp1:1000+n*100,sp2:1500-n*100,sp3:1000,sp4:1000,str:1,...over})[k]??'').join(',')+'\n';
const fixture=(over={})=>({street:'alpha',activeShopIds:[1],now,drTime:[now+100,now-1,now+100],dragonText:'',jockeyText:'',raceByCode:['1,0,0\n'+row(1)+row(2)+row(3),'0,0,0\n'],raceLogByCode:['old\n',null],draws:[.1,.2,.3,.5],...over});
function compare(input){
  const before=structuredClone(input),o=oracle(input),a=projectRaceProgress({...input,review});
  for(const k of ['raceCode','raceByCode','raceLogByCode','drTime','drLastText','drawBounds'])assert.deepEqual(a[k],o[k],k);
  assert.deepEqual(o.trace,['dra-rd'+a.raceCode,'dr-last','common-commit','common-unlock']);
  assert.equal(o.newLogText,'');assert.deepEqual(a.payments,[]);assert.equal(a.committable,false);assert.deepEqual(input,before);return a;
}
test('R4 actual Race1 popularity, first segment, commentary and source global index',()=>{
  const a=compare(fixture());assert.deepEqual(a.rankedDragonIds,[3,2,1]);assert.deepEqual(a.drawBounds,[100,100,100,2]);
  const b=compare(fixture({sourceGlobalIndex:1}));assert.notEqual(a.commentaryAppend,b.commentaryAppend);assert.deepEqual(a.raceByCode,b.raceByCode);
  compare(fixture({raceByCode:['0,0,0\n','1,9,1\n'+row(1)+row(2)+row(3)],drTime:[now+100,now-1,now-1]}));
});
test('R4 actual Race2 and Race3 cumulative time, leader changes and append commentary',()=>{
  const a=compare(fixture());const b=compare(fixture({raceByCode:a.raceByCode,raceLogByCode:a.raceLogByCode,draws:[.5]}));
  const c=compare(fixture({raceByCode:b.raceByCode,raceLogByCode:b.raceLogByCode,draws:[.5]}));
  assert.equal(c.raceByCode[0].split('\n')[0],'4,0,0');assert.equal(c.drTime[1],now-1+21600);
  assert.ok(c.raceLogByCode[0].startsWith(a.raceLogByCode[0]));
  compare(fixture({raceByCode:['2,0,0\n'+row(1,{time:200,sp2:900})+row(2,{time:201,sp2:2000})+row(3,{time:202,sp2:1000}),''],draws:[.9],sourceGlobalIndex:1}));
});
test('R4 race progress denies non-due, missing draw, zero source divisor and unreviewed global index',()=>{
  for(const input of [fixture({draws:[]}),fixture({sourceGlobalIndex:99}),fixture({drTime:[now-1,now-1,now-1]}),fixture({raceByCode:['1,0,0\n'+row(1,{sp1:0})+row(2)+row(3),'']})])assert.throws(()=>projectRaceProgress({...input,review}),/R4 race progress:/);
});
