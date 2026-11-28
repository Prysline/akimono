import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {reviewDragonRanchProducer,projectDragonRanchNew} from '../src/original-r4-dragon-ranch-producer.mjs';
const cwd=new URL('./original-perl/',import.meta.url);
const read=name=>readFileSync(new URL('pinned-'+name+'.cgi',cwd),'utf8');
const sources={handler:read('inc-dras-rcedit'),config:read('inc-dragon'),reader:read('drreadb'),writer:read('drwrite'),pay:read('drlog')};
const reviewed=reviewDragonRanchProducer(sources);
const perl=String.raw`use utf8; use JSON::PP; use File::Temp qw(tempdir);
my $in=JSON::PP->new->utf8->decode(do {local $/;<STDIN>});
our ($COMMON_DIR,$COTEMP_DIR,$MYDIR,$NOW_TIME,$DT,%id2idx,%Q,$LOG_EXPIRE_TIME,$failStage,$ng,@trace);
my $root=tempdir(CLEANUP=>1);$COMMON_DIR="$root/common";$COTEMP_DIR="$root/stage";mkdir $_ or die $! for ($COMMON_DIR,$COTEMP_DIR);
$MYDIR=$in->{street};$NOW_TIME=$in->{now};$LOG_EXPIRE_TIME=1000;$failStage=$in->{failStage};$ng=$in->{ng};
my $i=0;for my $row(@{$in->{shops}}){$id2idx{$row->{id}}=$i++;$DT=$row if $row->{id}==$in->{actorId}}
%Q=(code=>'new',name=>$in->{command}{name});
sub GetPath {"$_[0]/$_[1].cgi"}
sub put {my($p,$s)=@_;open my $h,'>:encoding(UTF-8)',$p or die $!;print {$h} $s;close $h or die $!}
sub get {my($p)=@_;return '' unless -e $p;open my $h,'<:encoding(UTF-8)',$p or die $!;my $s=do {local $/;<$h>};close $h;return $s//''}
my $pay=GetPath($COMMON_DIR,"drapay-$MYDIR");my $ranch=GetPath($COMMON_DIR,'dra-rc');my $stage=GetPath($COTEMP_DIR,'dra-rc');
put($ranch,$in->{ranchText});put($pay,$in->{payoutText});
sub l {my($s,@args)=@_;for my $j(0..$#args){my $n=$j+1;$s=~s/%$n/$args[$j]/g}return $s}
sub CheckNGName {$ng?1:0}
sub OutError {die "SOURCE_REFUSAL\n"}
sub OpenAndCheck {if($_[0] eq $stage){push @trace,'ranch-stage';die "STAGE_FAILURE\n" if $failStage}else{push @trace,'dragon-log-stage'}open(OUT,'>:encoding(UTF-8)',$_[0]) or die $!}
sub RenameAndCheck {rename($_[0],$_[1]) or die $!}
sub CoDataCA {push @trace,'common-commit';1}
require './pinned-inc-dragon.cgi';require './pinned-drreadb.cgi';require './pinned-drwrite.cgi';require './pinned-drlog.cgi';
my $ok=do './pinned-inc-dras-rcedit.cgi';my $err=$@;die "unexpected ranch failure $err $!" unless $ok||$err eq "SOURCE_REFUSAL\n"||$err eq "STAGE_FAILURE\n";
print JSON::PP->new->utf8->encode({ok=>$ok?JSON::PP::true:JSON::PP::false,ranchText=>get($stage),liveRanch=>get($ranch),payoutText=>get($pay),actor=>$DT,logText=>get(GetPath($COTEMP_DIR,'dra-log0')),trace=>\@trace});
`;
const oracle=input=>JSON.parse(execFileSync('perl',['-e',perl],{cwd,input:JSON.stringify(input),encoding:'utf8'}));
const fixture=(over={})=>({street:'alpha',shops:[{id:2,money:1000000},{id:1,money:2000000}],actorId:1,now:1000000,ranchText:'',payoutText:'',command:{kind:'ranch-new',name:'牧場名字測試'},...over});
const project=input=>projectDragonRanchNew({reviewed,...input,checkNGName:()=>!!input.ng});
const compare=input=>{const before=structuredClone(input),o=oracle(input),actual=project(input);assert.equal(o.ok,true);for(const k of ['ranchText','payoutText','actor','logText'])assert.deepEqual(actual[k],o[k],k);assert.equal(o.liveRanch,input.ranchText);assert.deepEqual(o.trace,['ranch-stage','dragon-log-stage','common-commit']);assert.equal(actual.committable,false);assert.equal(actual.worldStateWritten,false);assert.deepEqual(input,before);return actual};
test('R4 ranch new actual frozen config/read/handler/write/pay: cross-street identity and deferred cost bytes',()=>{
  const first=compare(fixture());assert.equal(first.payment.amount,-1000000);assert.equal(first.actor.money,2000000);assert.equal(first.payment.ranchNo,1);
  const remote='9,999999,Remote ranch,beta,1,,,,,\n';const local='7,999999,Local ranch,alpha,2,0,1,0,0,0\n';
  const r=compare(fixture({ranchText:remote+local,payoutText:'1\t-1000000\n',command:{kind:'ranch-new',name:'😀'.repeat(20)}}));assert.equal(r.payment.ranchNo,10);assert.equal(r.payoutText,'1\t-1000000\n1\t-1000000\n');
  const stale='10,999999,Stale ranch,alpha,99,,,,,\n';const reset=compare(fixture({ranchText:stale+local}));assert.equal(reset.payment.ranchNo,1);assert.ok(!reset.ranchText.includes('Stale ranch'));
  compare(fixture({actorId:2,command:{kind:'ranch-new',name:'abcdef'}}));
});
test('R4 ranch new rejects existing ownership, low cash, bad names and untrusted payment fields',()=>{
  for(const input of [fixture({ranchText:'1,999999,Own ranch,alpha,1,,,,,\n'}),fixture({shops:[{id:1,money:999999}]}),fixture({command:{kind:'ranch-new',name:'abcde'}}),fixture({command:{kind:'ranch-new',name:'a'.repeat(21)}}),fixture({command:{kind:'ranch-new',name:'abc,def'}}),fixture({ng:true})]){
    const o=oracle(input);assert.equal(o.ok,false);assert.equal(o.payoutText,input.payoutText);assert.equal(o.ranchText,'');assert.deepEqual(o.trace,[]);assert.throws(()=>project(input),/R4 dragon ranch:/);
  }
  assert.throws(()=>project(fixture({command:{kind:'ranch-new',name:'abcdef',amount:1}})),/source context/);
  assert.throws(()=>reviewDragonRanchProducer({...sources,config:sources.config+'\n'}),/source drift/);
});
test('R4 original first-slot collision and live payment before failed stage are evidence, not publication permission',()=>{
  const collision=fixture({ranchText:'9,999999,Stale ranch,alpha,99,,,,,\n1,999999,Remote ranch,beta,1,,,,,\n'});const o=oracle(collision);assert.equal(o.ok,true);assert.deepEqual(o.ranchText.trimEnd().split('\n').map(s=>s.split(',')[0]),['1','1']);assert.throws(()=>project(collision),/ID collision/);
  const input=fixture({failStage:true});const failed=oracle(input);const candidate=project(input);assert.equal(failed.ok,false);assert.equal(failed.payoutText,candidate.payoutText);assert.equal(failed.ranchText,'');assert.equal(failed.liveRanch,input.ranchText);assert.deepEqual(failed.trace,['ranch-stage']);assert.equal(candidate.committable,false);
});
