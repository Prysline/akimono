import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {projectDragonLogRenewal} from '../src/original-r4-dragon-log-rotation.mjs';
const cwd=new URL('./original-perl/',import.meta.url);
const bytes=readFileSync(new URL('pinned-drlog.cgi',cwd));
assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),'e60cda027c87de25585ee59bf64a4cb24b9d1476');
const perl=String.raw`use utf8; use JSON::PP; use File::Temp qw(tempdir);
my $in=JSON::PP->new->utf8->decode(do{local $/;<STDIN>});
our($COMMON_DIR,$COTEMP_DIR,$NOW_TIME,$LOG_EXPIRE_TIME,@DLOG,@ops);
my $root=tempdir(CLEANUP=>1);$COMMON_DIR="$root/common";$COTEMP_DIR="$root/stage";
mkdir $_ or die $! for($COMMON_DIR,$COTEMP_DIR);
$NOW_TIME=$in->{now};$LOG_EXPIRE_TIME=$in->{expireSeconds};@DLOG=@{$in->{queue}};
sub GetPath {"$_[0]/$_[1].cgi"}
sub put {my($p,$s)=@_;open my $h,'>:encoding(UTF-8)',$p or die $!;print {$h} $s;close $h or die $!}
sub get {my($p)=@_;return undef unless -e $p;open my $h,'<:encoding(UTF-8)',$p or die $!;my $s=do{local $/;<$h>};close $h;return $s//''}
sub basename {my($p)=@_;$p=~s{.*/}{};$p=~s{\.cgi$}{};return $p}
sub RenameAndCheck {my($a,$b)=@_;push @ops,{kind=>'rename-live',from=>basename($a),to=>basename($b)};rename($a,$b) or die $!}
sub OpenAndCheck {my($p)=@_;open(OUT,'>:encoding(UTF-8)',$p) or die $!;push @ops,{kind=>'write-stage',file=>basename($p)}}
for my $k(keys %{$in->{live}}){my $f=$in->{live}{$k};next unless defined $f;my $p=GetPath($COMMON_DIR,$k);put($p,$f->{text});utime($f->{mtime},$f->{mtime},$p) or die $!}
my $stage=GetPath($COTEMP_DIR,'dra-log0');put($stage,$in->{stagedText}) if defined $in->{stagedText};
require './pinned-drlog.cgi';RenewDraLog();
my %live;for my $k(keys %{$in->{live}}){my $p=GetPath($COMMON_DIR,$k);$live{$k}=-e $p?{text=>get($p),mtime=>(stat($p))[9]}:undef}
$ops[-1]{text}=get($stage) if @ops&&$ops[-1]{kind} eq 'write-stage';
print JSON::PP->new->utf8->encode({live=>\%live,stagedText=>get($stage),queue=>\@DLOG,operations=>\@ops});
`;
const oracle=input=>JSON.parse(execFileSync('perl',['-e',perl],{cwd,input:JSON.stringify(input),encoding:'utf8'}));
const fixture=(over={})=>({now:1000000,expireSeconds:100,live:{'dra-log0':{text:'現役\nlast',mtime:999950},'dra-log1':{text:'older\n',mtime:999899},'dra-log2':{text:'oldest\n',mtime:999000}},stagedText:null,queue:['1000000\t0\t新消息\n'],...over});
function compare(input){const before=structuredClone(input),a=projectDragonLogRenewal(input),o=oracle(input);for(const k of ['live','stagedText','queue','operations'])assert.deepEqual(a[k],o[k],k);assert.deepEqual(input,before);assert.equal(a.committable,false);return a;}
test('R4 actual dragon log rotation renames live files before writing stage',()=>{const a=compare(fixture());assert.equal(a.rotated,true);assert.deepEqual(a.operations.map(x=>x.kind),['rename-live','rename-live','write-stage']);assert.equal(a.live['dra-log0'],null);assert.equal(a.live['dra-log2'].text,'older\n');});
test('R4 actual log equality, newer, stage preference, and repeated source queue',()=>{for(const mtime of [999900,999901]){const x=fixture();x.live['dra-log1'].mtime=mtime;const a=compare(x);assert.equal(a.rotated,false);assert.equal(a.stagedText,x.queue[0]+'現役\nlast');const b=compare({...x,stagedText:'already staged\n'});assert.equal(b.stagedText,x.queue[0]+'already staged\n');compare({...x,stagedText:'',queue:b.queue});compare({...x,stagedText:b.stagedText,queue:b.queue});}});
test('R4 actual missing generations and no pending log',()=>{const x=fixture();x.live['dra-log1']=null;compare(x);x.live['dra-log0']=null;compare(x);compare({...x,queue:[],stagedText:'untouched\n'});compare({...x,now:50});assert.throws(()=>projectDragonLogRenewal({...x,live:{}}),/invalid source snapshot/);});
