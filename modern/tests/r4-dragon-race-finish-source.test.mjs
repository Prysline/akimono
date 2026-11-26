import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {projectRaceFinish,reviewRaceFinishConfig} from '../src/original-r4-dragon-race-finish.mjs';
const cwd=new URL('./original-perl/',import.meta.url);
const pins={'inc-dr-edit2':'4085a0743b1a8e59d2d1eb0da62ca5af222f9f75','inc-dragon':'76bb00f247733630cbcc374a82f693638f653b71','drreadb':'1b13a1a855490c80c88b0fa117676c68b6440753','drreada':'01110533ae1a223f687f13b02f0aaeebd30c3155','drreadc':'f363bcdab6022581976b6b99dd5e095b51f5f238','drwrite':'0abc25f24ea6bd06576d5d1ba31eeb82419a2fee','drlog':'e60cda027c87de25585ee59bf64a4cb24b9d1476'};
const read=name=>readFileSync(new URL('pinned-'+name+'.cgi',cwd));for(const [name,sha] of Object.entries(pins)){const b=read(name);assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),sha,name);}
const review=reviewRaceFinishConfig(read('inc-dragon').toString('utf8'));
const perl=String.raw`use utf8; use JSON::PP; use File::Temp qw(tempdir);
our (@draws,@bounds);BEGIN {*CORE::GLOBAL::rand=sub {my($n)=@_;push @bounds,$n;die "NO_DRAW\n" unless @draws;return shift(@draws)*$n}}
my $in=JSON::PP->new->utf8->decode(do {local $/;<STDIN>});
our ($COMMON_DIR,$COTEMP_DIR,$MYDIR,$NOW_TIME,$DT,%id2idx,@DRTIME,@trace,$LOG_EXPIRE_TIME,$IMAGE_URL,$IMAGE_EXT,$i,$TZ_JST);
my $root=tempdir(CLEANUP=>1);$COMMON_DIR="$root/common";$COTEMP_DIR="$root/stage";mkdir $_ or die $! for ($COMMON_DIR,$COTEMP_DIR);
$MYDIR=$in->{street};$NOW_TIME=$in->{now};$LOG_EXPIRE_TIME=129600;@draws=@{$in->{draws}};$DT={id=>$in->{activeByStreet}{$MYDIR}[0]};$TZ_JST=32400;
$IMAGE_URL='./image';$IMAGE_EXT='.png';$i=$in->{sourceGlobalIndex};my $idx=0;for my $id(@{$in->{activeByStreet}{$MYDIR}}){$id2idx{$id}=$idx++}
sub GetPath {"$_[0]/$_[1].cgi"}
sub put {my($p,$s)=@_;open my $h,'>:encoding(UTF-8)',$p or die $!;print {$h} $s;close $h or die $!}
sub get {my($p)=@_;return '' unless -e $p;open my $h,'<:encoding(UTF-8)',$p or die $!;my $s=do {local $/;<$h>};close $h;return $s//''}
put(GetPath($COMMON_DIR,'dra-dr'),$in->{dragonText});put(GetPath($COMMON_DIR,'dra-jk'),$in->{jockeyText});put(GetPath($COMMON_DIR,'dra-rc'),$in->{ranchText});put(GetPath($COMMON_DIR,'dra-st'),$in->{stableText});for my $t(keys %{$in->{payoutByStreet}}){put(GetPath($COMMON_DIR,"drapay-$t"),$in->{payoutByStreet}{$t})}
for my $c(0,1){put(GetPath($COMMON_DIR,"dra-rd$c"),$in->{raceByCode}[$c]) if $in->{raceByCode}[$c] ne '';put(GetPath($COMMON_DIR,"dra-rlog$c"),$in->{raceLogByCode}[$c]) if defined $in->{raceLogByCode}[$c]}
sub l {my($s,@args)=@_;for my $j(0..$#args){my $n=$j+1;my $v=$args[$j]//'';$s=~s/%$n/$v/g}return $s}
sub OpenAndCheck {my($p)=@_;my($f)=$p=~/([^\/]+)\.cgi$/;push @trace,$f;open(OUT,'>:encoding(UTF-8)',$p) or die $!}
sub RenameAndCheck {rename($_[0],$_[1]) or die $!}
sub CoDataCA {push @trace,'common-commit';1}
sub CoUnLock {push @trace,'common-unlock';1}
require './pinned-inc-dragon.cgi';require './pinned-drreadb.cgi';require './pinned-drreada.cgi';require './pinned-drreadc.cgi';require './pinned-drwrite.cgi';require './pinned-drlog.cgi';@DRTIME=@{$in->{drTime}};
my $ok=do './pinned-inc-dr-edit2.cgi';die "unexpected closure failure $@ $!" unless $ok;
my(@r,@log);for my $c(0,1){my $p=GetPath($COTEMP_DIR,"dra-rd$c");push @r,get(-e $p?$p:GetPath($COMMON_DIR,"dra-rd$c"));$p=GetPath($COMMON_DIR,"dra-rlog$c");push @log,(-e $p?get($p):undef);}
my %pay;opendir(my $dir,$COMMON_DIR) or die $!;for my $f(readdir($dir)){if($f=~/^drapay-(.*)\.cgi$/){$pay{$1}=get("$COMMON_DIR/$f")}}closedir($dir);
print JSON::PP->new->utf8->encode({payoutByStreet=>\%pay,ranchText=>get(GetPath($COTEMP_DIR,'dra-rc')),stableText=>get(GetPath($COTEMP_DIR,'dra-st')),raceCode=>0+$rcode,raceByCode=>\@r,raceLogByCode=>\@log,dragonText=>get(GetPath($COTEMP_DIR,'dra-dr')),jockeyText=>get(GetPath($COTEMP_DIR,'dra-jk')),drTime=>\@DRTIME,drLastText=>get(GetPath($COTEMP_DIR,'dr-last')),newLogText=>get(GetPath($COTEMP_DIR,'dra-log0')),drawBounds=>\@bounds,trace=>\@trace});
`;
const oracle=input=>JSON.parse(execFileSync('perl',['-e',perl],{cwd,input:JSON.stringify(input),encoding:'utf8'}));
const DF=["no","birth","fm","color","name","town","owner","stable","race","apt","sp","spp","sr","srp","ag","agp","pw","pwp","hl","hlp","fl","flp","con","wt","gr","prize","sdwin","g3win","g2win","g1win"],JF=["no","birth","name","town","owner","race","ahead","back","sp","sdwin","g3win","g2win","g1win"],SF=["no","birth","name","town","owner","emp","tr","con","wt","sp","sr","ag","pw","hl","fl","sdwin","g3win","g2win","g1win"],RC=["no","birth","name","town","owner","prize","sdwin","g3win","g2win","g1win"],RD=["no","dr","birth","fm","color","name","ranch","rcname","stable","stname","jock","jkname","prize","strate","sp1","sp2","sp3","sp4","pop","time","str","lose"];
const row=(keys,r)=>keys.map(k=>r[k]??'').join(',')+'\n';
const dragon=(n,over={})=>row(DF,{no:n,birth:5000000,fm:0,color:n-1,name:'Dragon '+n,town:n===2?'beta':'alpha',owner:1,stable:7,race:3,con:35,wt:40,gr:5,prize:0,...over});
const jockey=(over={})=>row(JF,{no:3,birth:5000000,name:'Jockey',town:'beta',owner:1,race:3,ahead:95,back:20,sp:0,...over});
const ranch=(over={})=>row(RC,{no:4,birth:5000000,name:'Ranch',town:'alpha',owner:1,prize:0,...over});
const stable=(over={})=>row(SF,{no:7,birth:5000000,name:'Stable',town:'alpha',owner:1,tr:95,con:80,wt:99,...over});
const entry=(n,over={})=>row(RD,{no:n,dr:n,birth:5000000,fm:0,color:n-1,name:'Dragon '+n,ranch:4,rcname:'Ranch',stable:7,stname:'Stable',jock:n===1?3:0,jkname:n===1?'Jockey':'',prize:0,strate:1,sp1:1000,sp2:1000,sp3:1000,sp4:1000,pop:n,time:100+n,str:1,lose:'実力不足',...over});
const now=6000000;
const fixture=(over={})=>({street:'alpha',activeByStreet:{alpha:[1],beta:[1]},now,drTime:[now+100,now-1,now+100],raceByCode:['4,0,0\n'+[1,2,3,4].map(n=>entry(n)).join(''),'0,0,0\n'],raceLogByCode:['old\n',null],dragonText:[1,2,3,4].map(n=>dragon(n)).join(''),jockeyText:jockey(),ranchText:ranch(),stableText:stable(),payoutByStreet:{alpha:'1\t500000\n'},draws:[.5,.9,.9,.9,.5],...over});
function compare(input){
  const before=structuredClone(input),o=oracle(input),a=projectRaceFinish({...input,review});
  for(const k of ['raceCode','raceByCode','raceLogByCode','dragonText','jockeyText','ranchText','stableText','drTime','drLastText','newLogText','drawBounds'])assert.deepEqual(a[k],o[k],k);
  const raw={...input.payoutByStreet};for(const p of a.sourcePayments)raw[p.street]=(raw[p.street]??'')+p.bytes;assert.deepEqual(raw,o.payoutByStreet);
  assert.deepEqual(o.trace,['dra-dr','dra-jk','dra-rc','dra-st','dra-rd'+a.raceCode,'dr-last','dra-log0','common-commit','common-unlock']);assert.equal(a.committable,false);assert.deepEqual(input,before);return a;
}
test('R4 actual Race4 three prizes, all four finish effects, same-ID distinct streets and repeated bytes',()=>{
  const a=compare(fixture());assert.deepEqual(a.rankedDragonIds,[1,2,3,4]);assert.deepEqual(a.payments.map(p=>p.amount),[500000,300000,200000]);assert.equal(a.payoutByStreet.alpha,'1\t500000\n1\t500000\n1\t200000\n');assert.deepEqual(a.drawBounds,[8,20,20,20,2]);
  const major=compare(fixture({raceByCode:['0,0,0\n','4,9,1\n'+entry(1)+entry(2,{sp4:2000})+entry(3)+entry(4)],drTime:[now+100,now-1,now-1],draws:[.2,.2,.2,.1]}));assert.equal(major.payments[0].amount,4000000);assert.equal(major.rankedDragonIds[0],2);
  compare(fixture({raceByCode:['4,0,0\n'+entry(1)+entry(2)+entry(3,{sp4:3000})+entry(4),'0,0,0\n'],draws:[.2,.2,.2,.1]}));
});
test('R4 actual Race4 cleared local owner preserves draw and source award evidence without invalid settlement',()=>{
  const input=fixture({dragonText:dragon(1,{owner:99})+dragon(2)+dragon(3)+dragon(4),stableText:stable({owner:99}),ranchText:ranch({owner:99}),jockeyText:jockey({town:'alpha',owner:99})});const a=compare(input);
  assert.deepEqual(a.quarantinedPayments.map(x=>[x.shopId,x.amount]),[[99,500000]]);assert.equal(a.stableText,'');assert.equal(a.ranchText,'');assert.equal(a.jockeyText,'');assert.deepEqual(a.drawBounds,[8,20,20,20,2]);assert.equal(a.payoutByStreet.alpha,'1\t500000\n1\t200000\n');
  compare(fixture({dragonText:dragon(2)+dragon(3)+dragon(4),jockeyText:'',ranchText:'',stableText:'',draws:[.5]}));
});
test('R4 final phase rejects missing authoritative directory, extra draws and zero divisors',()=>{
  for(const input of [fixture({activeByStreet:{alpha:[1]}}),fixture({draws:[]}),fixture({draws:[.5,.9,.9,.9,.5,.1]}),fixture({raceByCode:['4,0,0\n'+entry(1,{sp4:0})+entry(2)+entry(3),'']})])assert.throws(()=>projectRaceFinish({...input,review}),/R4 race finish:/);
});
