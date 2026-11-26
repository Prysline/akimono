import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {reviewDragonFacilityProducer,projectDragonFacility} from '../src/original-r4-dragon-facility-producer.mjs';
const cwd=new URL('./original-perl/',import.meta.url);
const read=name=>readFileSync(new URL('pinned-'+name+'.cgi',cwd),'utf8');
const sources={stable:read('inc-dras-stedit'),jockey:read('inc-dras-jkedit'),config:read('inc-dragon'),reader:read('drreada'),writer:read('drwrite'),pay:read('drlog')};
const reviewed=reviewDragonFacilityProducer(sources);
const perl=String.raw`use utf8; use JSON::PP; use File::Temp qw(tempdir);
our (@draws,@bounds);BEGIN {*CORE::GLOBAL::rand=sub {my($n)=@_;push @bounds,$n;die "NO_DRAW\n" unless @draws;return shift(@draws)*$n}}
my $in=JSON::PP->new->utf8->decode(do {local $/;<STDIN>});
our ($COMMON_DIR,$COTEMP_DIR,$MYDIR,$NOW_TIME,$DT,%id2idx,%Q,$LOG_EXPIRE_TIME,$failStage,$ng,@trace);
my $root=tempdir(CLEANUP=>1);$COMMON_DIR="$root/common";$COTEMP_DIR="$root/stage";mkdir $_ or die $! for ($COMMON_DIR,$COTEMP_DIR);
$MYDIR=$in->{street};$NOW_TIME=$in->{now};$LOG_EXPIRE_TIME=1000;$failStage=$in->{failStage};$ng=$in->{ng};
my $i=0;for my $row(@{$in->{shops}}){$id2idx{$row->{id}}=$i++;$DT=$row if $row->{id}==$in->{actorId}}
@draws=@{$in->{draws}};my $kind=$in->{command}{kind};my $stable=$kind ne 'jockey-new';my $file=$stable?'dra-st':'dra-jk';
%Q=(code=>$kind eq 'stable-large'?'large':'new',name=>$in->{command}{name},emp=>$in->{command}{emp},lar=>$in->{command}{lar});
sub GetPath {"$_[0]/$_[1].cgi"}
sub put {my($p,$s)=@_;open my $h,'>:encoding(UTF-8)',$p or die $!;print {$h} $s;close $h or die $!}
sub get {my($p)=@_;return '' unless -e $p;open my $h,'<:encoding(UTF-8)',$p or die $!;my $s=do {local $/;<$h>};close $h;return $s//''}
my $pay=GetPath($COMMON_DIR,"drapay-$MYDIR");my $ranch=GetPath($COMMON_DIR,$file);my $stage=GetPath($COTEMP_DIR,$file);
put($ranch,$in->{facilityText});put($pay,$in->{payoutText});
sub l {my($s,@args)=@_;for my $j(0..$#args){my $n=$j+1;$s=~s/%$n/$args[$j]/g}return $s}
sub CheckNGName {$ng?1:0}
sub OutError {die "SOURCE_REFUSAL\n"}
sub OpenAndCheck {if($_[0] eq $stage){push @trace,'facility-stage';die "STAGE_FAILURE\n" if $failStage}else{push @trace,'dragon-log-stage'}open(OUT,'>:encoding(UTF-8)',$_[0]) or die $!}
sub RenameAndCheck {rename($_[0],$_[1]) or die $!}
sub CoDataCA {push @trace,'common-commit';1}
require './pinned-inc-dragon.cgi';require './pinned-drreada.cgi';require './pinned-drwrite.cgi';require './pinned-drlog.cgi';
my $ok=do ($stable?'./pinned-inc-dras-stedit.cgi':'./pinned-inc-dras-jkedit.cgi');my $err=$@;die "unexpected facility failure $err $!" unless $ok||$err eq "SOURCE_REFUSAL\n"||$err eq "STAGE_FAILURE\n";
print JSON::PP->new->utf8->encode({ok=>$ok?JSON::PP::true:JSON::PP::false,facilityText=>get($stage),liveFacility=>get($ranch),payoutText=>get($pay),actor=>$DT,logText=>get(GetPath($COTEMP_DIR,'dra-log0')),trace=>\@trace,drawBounds=>\@bounds});
`;
const oracle=input=>JSON.parse(execFileSync('perl',['-e',perl],{cwd,input:JSON.stringify(input),encoding:'utf8'}));
const fixture=(over={})=>({street:'alpha',shops:[{id:2,money:500000},{id:1,money:500000}],actorId:1,now:1000000,facilityText:'',payoutText:'',command:{kind:'stable-new',name:'abcdef',emp:5},draws:[0,0.5,0.99],...over});
const project=input=>projectDragonFacility({reviewed,...input,checkNGName:()=>!!input.ng});
const compare=input=>{const before=structuredClone(input),o=oracle(input),actual=project(input);assert.equal(o.ok,true);for(const k of ['facilityText','payoutText','actor','logText','drawBounds'])assert.deepEqual(actual[k],o[k],k);assert.equal(o.liveFacility,input.facilityText);assert.deepEqual(o.trace,['facility-stage',...(input.command.kind==='stable-large'?[]:['dragon-log-stage']),'common-commit']);assert.equal(actual.committable,false);assert.equal(actual.worldStateWritten,false);assert.deepEqual(input,before);return actual};
const stable=(no,town='alpha',owner=1,sp=1,sr=0,birth=999999)=>[no,birth,'Stable ranch',town,owner,0,0,0,0,sp,sr,0,0,0,0,0,0,0,0].join(',')+'\n';
const jockey=(no,town='alpha',owner=1)=>[no,999999,'Jockey name',town,owner,0,1,16,0,0,0,0,0].join(',')+'\n';
const large={kind:'stable-large',lar:0};
test('R4 actual stable/jockey new source: exact rows, draw bounds, tie and greater trait branch',()=>{
  const s=compare(fixture({facilityText:stable(5,'beta',1)}));assert.equal(s.payment.facilityNo,6);assert.equal(s.payment.amount,-500000);assert.equal(s.actor.money,500000);assert.deepEqual(s.facilityText.split('\n')[0].split(',').slice(5,10),['5','0','7','14','1']);
  const command={kind:'jockey-new',name:'騎手名稱測試'};
  const tie=compare(fixture({command,draws:[0.5,0.5],facilityText:jockey(4,'beta',1)}));assert.deepEqual(tie.facilityText.split('\n')[0].split(',').slice(6,8),['7','22']);
  const ahead=compare(fixture({command,draws:[0.99,0]}));assert.deepEqual(ahead.facilityText.split('\n')[0].split(',').slice(6,8),['29','0']);
  compare(fixture({facilityText:stable(5,'alpha',99)+stable(4,'beta',1)}));
});
test('R4 actual stable enlargement: equality at age limit, exact fields, deferred fee and no RNG/log',()=>{
  const a=compare(fixture({command:large,draws:[],facilityText:stable(3),payoutText:'1\t-500000\n'}));assert.equal(a.facilityText.split(',')[9],'2');assert.equal(a.logText,'');assert.equal(a.payoutText,'1\t-500000\n1\t-500000\n');
  const b=compare(fixture({command:{...large,lar:1},draws:[],facilityText:stable(3,'alpha',1,2,0,827200)}));assert.equal(b.facilityText.split(',')[10],'1');
});
test('R4 source facility refusals: raw capacity includes stale rows, ownership, cash, age and level cap',()=>{
  const cap=Array.from({length:10},(_,i)=>stable(20-i,'alpha',99+i)).join('');
  const jkcap=Array.from({length:20},(_,i)=>jockey(40-i,'beta',99+i)).join('');
  for(const input of [fixture({facilityText:cap}),fixture({facilityText:stable(1)}),fixture({shops:[{id:1,money:499999}]}),fixture({ng:true}),fixture({command:{kind:'jockey-new',name:'abcdef'},draws:[0,0],facilityText:jkcap}),fixture({command:large,draws:[]}),fixture({command:large,draws:[],facilityText:stable(3,'alpha',1,2)}),fixture({command:large,draws:[],facilityText:stable(3,'alpha',1,3,0,100000)})]){
    const o=oracle(input);assert.equal(o.ok,false);assert.equal(o.payoutText,input.payoutText);assert.equal(o.facilityText,'');assert.deepEqual(o.trace,[]);assert.deepEqual(o.drawBounds,[]);assert.throws(()=>project(input),/R4 dragon facility:/);
  }
  assert.throws(()=>project(fixture({command:{kind:'stable-new',name:'abcdef',emp:6}})),/training selection/);
  assert.throws(()=>project(fixture({draws:[0,0]})),/RNG draw shape/);
  assert.throws(()=>reviewDragonFacilityProducer({...sources,stable:sources.stable+'\n'}),/source drift/);
});
