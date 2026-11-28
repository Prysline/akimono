import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {reviewOriginalRegistrationLookup,projectOriginalRegistrationLookup} from '../src/original-r4-lifecycle-directory.mjs';
const cwd=new URL('./original-perl/',import.meta.url);
const read=p=>readFileSync(new URL(p,cwd),'utf8');
const review=reviewOriginalRegistrationLookup({newShop:read('new.cgi'),name:read('pinned-name.cgi')});
const perl=String.raw`use utf8;use JSON::PP;use File::Temp qw(tempdir);use File::Path qw(make_path);use Cwd qw(getcwd);
my $in=JSON::PP->new->utf8->decode(do{local $/;<STDIN>});
my $cwd=getcwd();my $root=tempdir(CLEANUP=>1);
our($MYDIR,@OtherDir,$NEW_OTHERTOWN_BLOCK);
$MYDIR=$in->{currentTown};@OtherDir=@{$in->{otherDir}};$NEW_OTHERTOWN_BLOCK=$in->{otherTownBlockEnabled}?1:0;
open my $src,'<:encoding(UTF-8)',"$cwd/new.cgi" or die $!;
my $s=do{local $/;<$src>};close $src;
my($part)=$s=~/(^sub GetDoubleIP\n\{[\s\S]*?^\}\s*$)/m;
die 'missing original GetDoubleIP' unless defined $part;
eval "package main;no strict;no warnings;use utf8;\n$part\n1;" or die $@;
require "$cwd/pinned-name.cgi";
make_path("$root/$MYDIR");
for my $t(keys %{$in->{files}}){
  my $rows=$in->{files}{$t};next unless defined $rows;
  make_path("$root/$t/data");
  open my $f,'>:encoding(UTF-8)',"$root/$t/data/user.cgi" or die $!;
  my $id=0;for my $row(@$rows){$id++;print {$f} join("\t","owner$id",$row->{shopName},$id,'time',$row->{ip},'synthetic-agent','synthetic')."\n";}
  close $f or die $!;
}
chdir "$root/$MYDIR" or die $!;
my $count=$in->{kind} eq 'double-ip'?scalar GetDoubleIP($in->{value}):scalar GetDoubleName($in->{value});
chdir $cwd or die $!;
print JSON::PP->new->utf8->encode({matchCount=>0+$count});
`;
const oracle=input=>JSON.parse(execFileSync('perl',['-e',perl],{cwd,input:JSON.stringify(input),encoding:'utf8'}));
const hit={ip:'192.0.2.5',shopName:'Same shop'},miss={ip:'192.0.2.6',shopName:'Other shop'};
const f={kind:'double-ip',currentTown:'street',otherDir:['first','second','third'],files:{street:[hit],first:[],second:[hit,hit],third:[hit]},otherTownBlockEnabled:true,value:hit.ip};
function compare(input){const before=structuredClone(input);const a=projectOriginalRegistrationLookup({review,...input}),o=oracle(input);assert.equal(a.matchCount,o.matchCount);assert.deepEqual(input,before);assert.equal(a.committable,false);return a;}
test('R4 actual ordered GetDoubleIP stops at first match or missing file',()=>{
  const a=compare(f);assert.equal(a.matchCount,2);assert.deepEqual(a.visited,['first','second']);
  const b=compare({...f,files:{...f.files,first:null}});assert.equal(b.matchCount,0);assert.equal(b.stoppedOnMissing,'first');
  const c=compare({...f,files:{...f.files,first:[miss],second:null}});assert.deepEqual(c.visited,['first','second']);assert.equal(c.matchCount,0);
  compare({...f,files:{...f.files,first:[hit],second:null}});
  compare({...f,files:{...f.files,first:[],second:[],third:[]}});
  assert.throws(()=>projectOriginalRegistrationLookup({review,...f,files:{street:[hit]}}),/missing directory provenance/);
});
test('R4 actual GetDoubleName conditional lexical street directory behavior',()=>{
  const x={...f,kind:'double-name',value:hit.shopName};const a=compare(x);assert.equal(a.matchCount,0);assert.deepEqual(a.visited,[]);
  const b=compare({...x,otherTownBlockEnabled:false});assert.equal(b.matchCount,1);assert.deepEqual(b.visited,['street']);
  const c=compare({...x,otherTownBlockEnabled:false,files:{...x.files,street:[miss]}});assert.equal(c.matchCount,0);
  compare({...x,otherTownBlockEnabled:false,files:{...x.files,street:null}});
});
