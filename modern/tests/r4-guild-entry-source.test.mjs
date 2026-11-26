import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {reviewGuildEntry,projectGuildEntry} from '../src/original-r4-guild-entry.mjs';
const cwd=new URL('./original-perl/',import.meta.url);
const reader=readFileSync(new URL('pinned-gd-m.cgi',cwd),'utf8'),entry=readFileSync(new URL('pinned-inc-gd-entry.cgi',cwd),'utf8');
const reviewed=reviewGuildEntry({reader,entry});
const perl=String.raw`use utf8; use JSON::PP; use File::Temp qw(tempdir);
my $in=JSON::PP->new->utf8->decode(do {local $/;<STDIN>});
our (@ENTRY,@MYENTRY,@ENTRYnamelist,@OtherDir,$Ecount,$DT,$MYDIR,$NOW_TIME,$COMMON_DIR,$COTEMP_DIR,%GUILD,%GUILD_DETAIL,%DTevent,%Q,$GUILDIDX_name,@trace,@logs);
my $root=tempdir(CLEANUP=>1);$COMMON_DIR="$root/live";$COTEMP_DIR="$root/stage";mkdir $_ or die $! for ($COMMON_DIR,$COTEMP_DIR);
sub GetPath {"$_[0]/$_[1].cgi"}
sub put {my($p,$s)=@_;open my $h,'>:encoding(UTF-8)',$p or die $!;print {$h} $s;close $h or die $!}
sub get {my($p)=@_;open my $h,'<:encoding(UTF-8)',$p or die $!;my $s=do {local $/;<$h>};close $h;return $s//''}
my $live=GetPath($COMMON_DIR,'entry');my $stage=GetPath($COTEMP_DIR,'entry');put($live,$in->{entryText});
$DT=$in->{actor};$MYDIR=$in->{street};$NOW_TIME=$in->{now};@OtherDir=@{$in->{townOrder}};@ENTRYnamelist=qw(no tm town id guild);$Ecount=-1;$GUILDIDX_name=0;
for my $code(keys %{$in->{definitions}}){my $d=$in->{definitions}{$code};$GUILD{$code}=[$d->{name}];$GUILD_DETAIL{$code}={leadt=>$d->{leadt},leader=>$d->{leader},member=>$d->{member},%{$d->{representatives}}};}
$DTevent{guildbattle}=1 if $in->{guildbattle};
my $c=$in->{command};%Q=$c->{kind} eq 'grant'?(edit=>'new',%{$c->{selections}}):(edit=>'join',guild=>$c->{guild});
sub l {my($key,@args)=@_;return {key=>$key,args=>\@args}}
sub OutError {die "SOURCE_REFUSAL\n"}
sub PushLog {push @logs,[@_];1}
sub RenewLog {push @trace,'renew';1}
sub DataWrite {push @trace,'street-stage';1}
sub DataCommitOrAbort {push @trace,'street-commit';1}
sub UnLock {push @trace,'street-unlock';1}
sub OpenAndCheck {open(OUT,'>:encoding(UTF-8)',$_[0]) or die $!;push @trace,'common-stage'}
sub CoDataCA {rename($stage,$live) or die $!;push @trace,'common-commit';1}
sub CoUnLock {push @trace,'common-unlock';1}
my $source=get('./pinned-gd-m.cgi');my $i=index($source,"sub ReadEntry\n");die 'missing ReadEntry' if $i<0;
eval substr($source,$i)."\n1;" or die $@;
ReadEntry();
my $ok=do './pinned-inc-gd-entry.cgi';die "unexpected original failure: $@ $!" unless $ok || $@ eq "SOURCE_REFUSAL\n";
print JSON::PP->new->utf8->encode({ok=>$ok?JSON::PP::true:JSON::PP::false,actor=>$DT,entryText=>get($live),logs=>\@logs,trace=>\@trace,pending=>-e $stage?1:0});
`;
const oracle=input=>JSON.parse(execFileSync('perl',['-e',perl],{cwd,input:JSON.stringify(input),encoding:'utf8'}));
function fixture(command,opts={}){
  return {street:'alpha',actor:{id:2,shopname:'Shop2',guild:command.kind==='grant'?'red':'',user:{keep:1}},
    definitions:{red:{name:'Red',member:'member',leadt:'alpha',leader:1,representatives:{alpha:2}},blue:{name:'Blue',member:'blue member',leadt:'beta',leader:1,representatives:{}}},
    townOrder:['alpha','beta'],entryText:'',now:1000000,guildbattle:false,command,...opts};
}
const grant=selections=>({kind:'grant',selections}),join=guild=>({kind:'join',guild});
test('R4 guild entry actual ReadEntry/new/join/WriteEntry: bytes, expiry slots, cross-street stable IDs and publication intent',()=>{
  const scenarios=[
    fixture(grant({alpha:4})),
    fixture(grant({alpha:4,beta:4}),{guildbattle:true,entryText:'9,1000000,alpha,4,red\n'}),
    fixture(grant({alpha:4}),{entryText:'9,999999,alpha,4,red\n1,1000000,beta,4,blue\n'}),
    fixture(grant({alpha:4}),{entryText:'9,1000000,alpha,4,blue\n'}),
    fixture(join('red'),{entryText:'4,1000000,alpha,2,blue\n3,1000001,alpha,2,red\n2,1000001,beta,2,red\n1,999999,alpha,8,blue\n'}),
    fixture(join('gone'),{entryText:'1,1000000,alpha,2,gone\n'}),
  ];
  for(const input of scenarios){
    const before=structuredClone(input),original=oracle(input);assert.equal(original.ok,true);
    const result=projectGuildEntry({reviewed,...input});
    assert.deepEqual(result.actor,original.actor);assert.equal(result.entryText,original.entryText);
    assert.deepEqual(result.logCalls,original.logs);assert.deepEqual(result.publication,original.trace);
    assert.equal(original.pending,0);assert.equal(result.committable,false);assert.equal(result.worldStateWritten,false);assert.deepEqual(input,before);
  }
  assert.equal(projectGuildEntry({reviewed,...scenarios[2]}).entryText,'1,1172800,alpha,4,red\n1,1000000,beta,4,blue\n');
});
test('R4 guild entry original refusals retain live file and actor, never stage or publish',()=>{
  for(const input of [
    fixture(grant({alpha:4}),{entryText:'9,1000000,alpha,4,red\n'}),
    fixture(grant({})),
    fixture(grant({alpha:4}),{actor:{id:3,shopname:'Member',guild:'red',user:{}}}),
    fixture(join('red'),{entryText:'1,1000000,alpha,2,red\n',guildbattle:true}),
    fixture(join('red'),{entryText:'1,999999,alpha,2,red\n'}),
    fixture(join('red'),{entryText:'1,1000000,beta,2,red\n'}),
    fixture(join('red'),{entryText:'1,1000000,alpha,2,blue\n'}),
    fixture(join('red'),{actor:{id:2,shopname:'Shop2',guild:'blue',user:{}},entryText:'1,1000000,alpha,2,red\n'}),
  ]){
    const before=structuredClone(input),original=oracle(input);assert.equal(original.ok,false);assert.equal(original.entryText,input.entryText);
    assert.deepEqual(original.actor,input.actor);assert.deepEqual(original.logs,[]);assert.deepEqual(original.trace,[]);assert.equal(original.pending,0);
    assert.throws(()=>projectGuildEntry({reviewed,...input}),/R4 guild entry:/);assert.deepEqual(input,before);
  }
  assert.throws(()=>reviewGuildEntry({reader:reader+'\n',entry}),/source drift/);
  assert.throws(()=>projectGuildEntry({reviewed,...fixture(grant({alpha:4}),{entryText:'1,1000000,alpha,4,red'})}),/canonical/);
});
