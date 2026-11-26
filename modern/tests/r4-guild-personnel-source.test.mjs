import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {reviewGuildPersonnel,projectGuildPersonnel} from '../src/original-r4-guild-personnel.mjs';
const cwd=new URL('./original-perl/',import.meta.url);
const personnel=readFileSync(new URL('pinned-gd-e.cgi',cwd),'utf8');
const user=readFileSync(new URL('pinned-membership-user.cgi',cwd),'utf8');
const reviewed=reviewGuildPersonnel({personnel,user});
const perl=String.raw`use utf8; use JSON::PP;
my $input=JSON::PP->new->utf8->decode(do {local $/;<STDIN>});
our (@DT,%id2idx,%GUILD,%GUILD_DETAIL,%Q,%DTevent,$DT,$MYDIR,$GUILDIDX_name,@logs,@trace);
@DT=@{$input->{shops}}; $MYDIR=$input->{street}; $GUILDIDX_name=0;
for my $i (0..$#DT) {$id2idx{$DT[$i]{id}}=$i;}
$DT=$DT[$id2idx{$input->{actorId}}];
for my $code (keys %{$input->{definitions}}) {
  my $g=$input->{definitions}{$code};
  $GUILD{$code}=[$g->{name}];
  $GUILD_DETAIL{$code}={leadt=>$g->{leadt},leader=>$g->{leader},%{$g->{representatives}}};
}
%DTevent=(guildbattle=>1100000); # active fixture, handlers do not inspect this gate
my $c=$input->{command}; my $file;
if ($c->{kind} eq 'leave') {%Q=(mode=>'guild',guild=>$c->{confirmation});$file='./pinned-membership-user.cgi';}
else {%Q=(edit=>$c->{kind},id=>$c->{targetId},name=>$c->{title},guild=>$c->{confirmation});$file='./pinned-gd-e.cgi';}
sub l {my ($key,@args)=@_;return {key=>$key,args=>\@args}}
sub OutError {die "SOURCE_REFUSAL\n"}
sub Lock {push @trace,'lock';1}
sub DataRead {push @trace,'read';1}
sub CheckUserPass {push @trace,'auth';1}
sub RequireFile {1}
sub ReadGuild {1}
sub PushLog {push @logs,[@_];1}
sub RenewLog {push @trace,'renew';1}
sub DataWrite {push @trace,'stage';1}
sub DataCommitOrAbort {push @trace,'commit';1}
sub UnLock {push @trace,'unlock';1}
sub OutSkin {1}
my $result=do $file;
die "unexpected original failure: $@ $!" unless $result || $@ eq "SOURCE_REFUSAL\n";
print JSON::PP->new->utf8->encode({ok=>$result?JSON::PP::true:JSON::PP::false,shops=>\@DT,logs=>\@logs,trace=>\@trace});
`;
function oracle(input){
  return JSON.parse(execFileSync('perl',['-e',perl],{cwd,input:JSON.stringify(input),encoding:'utf8'}));
}
function fixture(actorId,command){
  return {street:'alpha',actorId,command,
    shops:[{id:3,guild:'blue',shopname:'Other',user:{}},{id:2,guild:'red',shopname:'Rep',user:{_so_e:'old',keep:1}},
      {id:1,guild:'red',shopname:'Leader',user:{}},{id:4,guild:'red',shopname:'Member',user:{}},
      {id:5,guild:'',shopname:'Guest',user:{}},{id:6,guild:'gone',shopname:'Lost',user:{_so_e:'old'}}],
    definitions:{red:{name:'Red',leadt:'alpha',leader:1,representatives:{alpha:2}},
      blue:{name:'Blue',leadt:'beta',leader:3,representatives:{}}}};
}
test('R4 guild personnel actual pinned CGI differential: stable IDs, Unicode title, leader/representative, fire and leave',()=>{
  const cases=[
    [1,{kind:'name',targetId:2,title:'將'.repeat(20)}],
    [2,{kind:'name',targetId:4,title:'😀'.repeat(20)}],
    [2,{kind:'name',targetId:4,title:''}],
    [1,{kind:'fire',targetId:2,confirmation:'leave'}],
    [2,{kind:'fire',targetId:2,confirmation:'leave'}],
    [1,{kind:'leave',confirmation:'leave'}],
    [4,{kind:'leave',confirmation:'leave'}],
    [6,{kind:'leave',confirmation:'leave'}],
  ];
  for(const [actor,command] of cases){
    const input=fixture(actor,command),before=structuredClone(input),original=oracle(input);
    assert.equal(original.ok,true,JSON.stringify(command));
    const actual=projectGuildPersonnel({reviewed,...input});
    assert.deepEqual(actual.shops,original.shops);
    assert.deepEqual(actual.logCalls,original.logs);
    assert.deepEqual(original.trace.slice(-4),['renew','stage','commit','unlock']);
    assert.equal(actual.committable,false);assert.equal(actual.worldStateWritten,false);
    assert.deepEqual(input,before);
  }
});
test('R4 guild personnel original refusals preserve rows and do not publish',()=>{
  for(const [actor,command] of [
    [4,{kind:'name',targetId:2,title:'x'}],
    [1,{kind:'name',targetId:3,title:'x'}],
    [1,{kind:'name',targetId:99,title:'x'}],
    [1,{kind:'name',targetId:2,title:'將'.repeat(21)}],
    [2,{kind:'fire',targetId:1,confirmation:'leave'}],
    [1,{kind:'fire',targetId:2,confirmation:'no'}],
    [5,{kind:'leave',confirmation:'leave'}],
    [4,{kind:'leave',confirmation:'no'}],
  ]){
    const input=fixture(actor,command),before=structuredClone(input),original=oracle(input);
    assert.equal(original.ok,false);assert.deepEqual(original.shops,input.shops);
    assert.deepEqual(original.logs,[]);assert.ok(!original.trace.includes('commit'));
    assert.throws(()=>projectGuildPersonnel({reviewed,...input}),/R4 guild personnel:/);
    assert.deepEqual(input,before);
  }
  assert.throws(()=>reviewGuildPersonnel({personnel:personnel+'\n',user}),/source drift/);
  assert.throws(()=>projectGuildPersonnel({reviewed:{committable:false},...fixture(1,{kind:'leave',confirmation:'leave'})}),/reviewed context/);
});
