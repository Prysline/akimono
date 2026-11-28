import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {reviewDragonDispatchSources,projectDragonDispatch} from '../src/original-r4-dragon-dispatch.mjs';
const cwd=new URL('./original-perl/',import.meta.url);
const read=p=>readFileSync(new URL(p,cwd),'utf8');
const review=reviewDragonDispatchSources({wrapper:read('pinned-slime.cgi'),dragon:read('pinned-inc-dragon.cgi'),config:read('../../../_config.cgi')});
const perl=String.raw`use utf8;use JSON::PP;use File::Temp qw(tempdir);
my $in=JSON::PP->new->utf8->decode(do{local $/;<STDIN>});
our($NOW_TIME,$TZ_JST,$COMMON_DIR,$COTEMP_DIR,@DRTIME,@DRTIMESET,@trace,%Q,$GUEST_USER,$i);
$NOW_TIME=$in->{now};$TZ_JST=32400;$GUEST_USER=1;
my $root=tempdir(CLEANUP=>1);$COMMON_DIR="$root/common";$COTEMP_DIR="$root/stage";
mkdir $_ or die $! for($COMMON_DIR,$COTEMP_DIR);
sub GetPath {"$_[0]/$_[1].cgi"}
sub put {my($p,$s)=@_;open my $h,'>:encoding(UTF-8)',$p or die $!;print {$h}$s;close $h or die $!}
put(GetPath($COMMON_DIR,'dr-last'),'@DRTIME=('.join(',',@{$in->{drTime}}).");\n1;\n") if defined $in->{drTime};
sub l {$_[0]}
sub GetMenuTag {''}
sub DataRead {push @trace,'street-read';1}
sub CheckUserPass {die 'expected guest allowed' unless $_[0]==1;push @trace,'guest-allowed-auth';1}
sub CoLock {push @trace,'common-lock';1}
sub CoUnLock {push @trace,'common-unlock';1}
sub CoDataCA {push @trace,'common-commit';1}
sub OpenAndCheck {push @trace,'dr-last-stage';open(OUT,'>:encoding(UTF-8)',$_[0]) or die $!}
sub OutSkin {push @trace,'render';1}
sub RequireFile {my($n)=@_;if($n eq 'inc-dragon.cgi'){push @trace,'inc-dragon';require './pinned-inc-dragon.cgi'}
 elsif($n eq 'inc-dr-edit1.cgi'){push @trace,'inc-dr-edit1'}
 elsif($n eq 'inc-dr-edit2.cgi'){push @trace,'inc-dr-edit2'}
 elsif($n eq 'inc-dragon-info.cgi'){push @trace,'view'}
 else{die "unexpected source include $n"}return 1;}
require './pinned-drwrite.cgi';
my $ok=do './pinned-slime.cgi';die "source wrapper $@ $!" unless $ok;
print JSON::PP->new->utf8->encode({clock=>\@DRTIME,trace=>\@trace,globalIndexDefined=>defined($i)?JSON::PP::true:JSON::PP::false});
`;
const oracle=input=>JSON.parse(execFileSync('perl',['-e',perl],{cwd,input:JSON.stringify(input),encoding:'utf8'}));
function compare(input,dispatch,raceCode=null){const a=projectDragonDispatch({review,...input}),o=oracle(input);assert.deepEqual(a.clock,o.clock);assert.deepEqual(a.trace,o.trace);assert.equal(a.dispatch,dispatch);assert.equal(a.raceCode,raceCode);assert.equal(o.globalIndexDefined,false);assert.equal(a.committable,false);return a;}
test('R4 actual slime request dispatcher strict due boundaries and priority',()=>{
 const now=6000000;
 compare({now,drTime:[now,now,now]},'none');
 compare({now,drTime:[now-1,now-1,now-1]},'training');
 compare({now,drTime:[now,now-1,now]},'race',0);
 compare({now,drTime:[now,now,now-1]},'race',1);
 compare({now,drTime:[now,now-1,now-1]},'race',1);
 compare({now,drTime:[now-1,now+1,now+1]},'training');
});
test('R4 actual slime initial clock, publication before street read and equality',()=>{
 assert.deepEqual(compare({now:6000000,drTime:null},'initialize').clock,[6026400,6012000,6008400]);
 for(const now of [6000000,64800,86400+50400,86400+46800]){const a=compare({now,drTime:null},'initialize');assert.ok(a.clock.every(x=>x>now));}
 assert.throws(()=>projectDragonDispatch({review,now:1,drTime:[1,2]}),/reviewed clock/);
});
