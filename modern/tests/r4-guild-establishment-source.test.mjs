import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {reviewGuildEstablishment,projectGuildEstablishment} from '../src/original-r4-guild-establishment.mjs';
const cwd=new URL('./original-perl/',import.meta.url);
const read=name=>readFileSync(new URL(name,cwd),'utf8');
const sources={handler:read('pinned-gd-b.cgi'),sub:read('pinned-sub.cgi'),config:read('pinned-config.cgi')};
const reviewed=reviewGuildEstablishment(sources);
const perl=String.raw`use utf8; use JSON::PP; use File::Temp qw(tempdir); use MIME::Base64;
my $in=JSON::PP->new->utf8->decode(do {local $/;<STDIN>});
our (%Q,%MIMETYPE,@OtherDir,$DT,$MYDIR,$COMMON_DIR,@trace,$fail_street);
$COMMON_DIR=tempdir(CLEANUP=>1);$DT=$in->{actor};$MYDIR=$in->{street};@OtherDir=@{$in->{townOrder}};
my $c=$in->{command};my $p="$COMMON_DIR/$c->{code}.pl";my $g="$COMMON_DIR/$c->{code}.gif";
sub put {my($path,$bytes)=@_;open my $h,'>:raw',$path or die $!;print {$h} $bytes;close $h or die $!}
sub get {my($path,$mode)=@_;return undef unless -e $path;open my $h,$mode,$path or die $!;my $s=do {local $/;<$h>};close $h;return $s//''}
use Encode qw(encode_utf8);
put($p,encode_utf8($in->{existing}{definitionText})) if defined $in->{existing}{definitionText};
put($g,decode_base64($in->{existing}{imageBase64})) if defined $in->{existing}{imageBase64};
%Q=(%{$c->{fields}},%{$c->{representatives}},mode=>$c->{mode},code=>$c->{code},upfile=>defined($c->{imageBase64})?decode_base64($c->{imageBase64}):'');
%MIMETYPE=(upfile=>$c->{mime});$fail_street=$in->{failStreet};
sub l {$_[0]}
sub OutError {die "SOURCE_REFUSAL\n"}
sub GetTagImgKao {''}
sub CoLock {push @trace,'common-lock';1}
sub CoUnLock {push @trace,'common-unlock';1}
sub DataRead {push @trace,'read';1}
sub CheckUserPass {push @trace,'auth';1}
sub ReadGuild {1}
sub ReadGuildData {1}
sub OpenAndCheck {push @trace,'image-live-write' if $Q{upfile} && -e $g;push @trace,'definition-live-write';open(OUT,'>:encoding(UTF-8)',$_[0]) or die $!}
sub Lock {push @trace,'street-lock';1}
sub UnLock {push @trace,'street-unlock';1}
sub DataWrite {push @trace,'street-stage';die "STREET_FAILURE\n" if $fail_street;1}
sub DataCommitOrAbort {push @trace,'street-commit';1}
sub OutSkin {1}
require './pinned-sub.cgi';require './pinned-config.cgi';
my $ok=do './pinned-gd-b.cgi';my $err=$@;
die "unexpected original failure: $err $!" unless $ok || $err eq "SOURCE_REFUSAL\n" || $err eq "STREET_FAILURE\n";
my %def=ReadConfig($p);my $raw=get($g,'<:raw');binmode(STDOUT,':raw');
print JSON::PP->new->utf8->encode({ok=>$ok?JSON::PP::true:JSON::PP::false,actor=>$DT,definitionText=>get($p,'<:encoding(UTF-8)'),definition=>\%def,imageBase64=>defined($raw)?encode_base64($raw,''):undef,trace=>\@trace});
`;
const oracle=input=>JSON.parse(execFileSync('perl',['-e',perl],{cwd,input:JSON.stringify(input),encoding:'utf8'}));
function fixture(command={},over={}){
  return {street:'alpha',actor:{id:10,guild:'',dignity:0,money:500000,user:{keep:1}},townOrder:['alpha','beta'],existing:{definitionText:null,imageBase64:null},
    command:{mode:'make',code:'red',fields:{name:'Red & Co',shortname:'Red',dealrate:'10',feerate:'500',member:'member',comment:'welcome',appeal:'activity',needed:'apply',url:''},representatives:{alpha:11,beta:20},imageBase64:Buffer.from([71,73,70,56,57,97,0,255]).toString('base64'),mime:'image/gif',...command},...over};
}
test('R4 guild establishment actual gd-b, CutStr and ReadConfig: exact definition/image bytes and actor',()=>{
  const a=fixture();const old=oracle(a);assert.equal(old.ok,true);
  const scenarios=[a,fixture({mode:'edit',imageBase64:null,representatives:{alpha:12,beta:''}},{existing:{definitionText:old.definitionText,imageBase64:old.imageBase64}}),fixture({mode:'edit'},{actor:{id:20,guild:'blue',dignity:0,money:0,user:{}}}),fixture({fields:{...a.command.fields,name:'將'.repeat(31),shortname:'A'.repeat(11)+'|',comment:'a# b "<>&',dealrate:'0100extra',url:'http://'}}),fixture({fields:{...a.command.fields,member:'😀'.repeat(7),url:'https://example.test/?a=1&b=2'}})];
  for(const input of scenarios){
    const before=structuredClone(input),original=oracle(input);assert.equal(original.ok,true);
    const actual=projectGuildEstablishment({reviewed,...input});
    for(const k of ['actor','definitionText','definition','imageBase64'])assert.deepEqual(actual[k],original[k],k);
    assert.deepEqual(actual.publication,original.trace);assert.equal(actual.committable,false);assert.equal(actual.worldStateWritten,false);assert.deepEqual(input,before);
  }
});
test('R4 guild establishment original rejects invalid rate, duplicate, missing image and MIME without publication',()=>{
  const a=fixture(),old=oracle(a);
  for(const input of [fixture({fields:{...a.command.fields,dealrate:'9'}}),fixture({fields:{...a.command.fields,feerate:'501'}}),fixture({fields:{...a.command.fields,name:'0'}}),fixture({fields:{...a.command.fields,dealrate:'1x'}}),fixture({imageBase64:null}),fixture({mime:'image/png'}),fixture({},{existing:{definitionText:old.definitionText,imageBase64:old.imageBase64}})]){
    const before=structuredClone(input),original=oracle(input);assert.equal(original.ok,false);assert.deepEqual(original.actor,input.actor);assert.equal(original.definitionText,input.existing.definitionText);assert.equal(original.imageBase64,input.existing.imageBase64);assert.ok(!original.trace.includes('definition-live-write'));assert.throws(()=>projectGuildEstablishment({reviewed,...input}),/R4 guild establishment:/);assert.deepEqual(input,before);
  }
  assert.throws(()=>reviewGuildEstablishment({...sources,sub:sources.sub+'\n'}),/source drift/);
});
test('R4 original establishment partial publication is evidence, not a modern commit contract',()=>{
  const input=fixture({},{failStreet:true});const original=oracle(input);const projected=projectGuildEstablishment({reviewed,...input});
  assert.equal(original.ok,false);assert.equal(original.definitionText,projected.definitionText);assert.equal(original.imageBase64,projected.imageBase64);assert.ok(original.trace.includes('common-unlock'));assert.ok(original.trace.includes('street-stage'));assert.ok(!original.trace.includes('street-commit'));assert.equal(projected.committable,false);
});
