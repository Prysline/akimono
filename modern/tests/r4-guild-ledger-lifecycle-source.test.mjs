import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {reviewGuildLedgerLifecycle,projectGuildLedgerLifecycle} from '../src/original-r4-guild-ledger-lifecycle.mjs';
const cwd=new URL('./original-perl/',import.meta.url);
const read=name=>readFileSync(new URL('pinned-'+name+'.cgi',cwd),'utf8');
const sources={guild:read('guild'),guildsub:read('guildsub'),sub:read('sub'),config:read('config')};
const reviewed=reviewGuildLedgerLifecycle(sources);
const perl=String.raw`use utf8; use JSON::PP; use File::Temp qw(tempdir);
my $in=JSON::PP->new->utf8->decode(do {local $/;<STDIN>});
our ($DATA_DIR,$TEMP_DIR,$COMMON_DIR,$GUILDBAL_FILE,$GUILD_FILE,%GUILD,%GUILD_DATA,@DT,@logs,$GUILDIDX_name,$GUILDIDX_dealrate,$GUILDIDX_feerate);
my $root=tempdir(CLEANUP=>1);$DATA_DIR="$root/live";$TEMP_DIR="$root/stage";$COMMON_DIR="$root/common";
mkdir $_ or die $! for ($DATA_DIR,$TEMP_DIR,$COMMON_DIR);$GUILD_FILE='guild';$GUILDBAL_FILE='guildbal';
sub GetPath {@_==1?"$DATA_DIR/$_[0].cgi":"$_[0]/$_[1].cgi"}
sub put {my($p,$s)=@_;open my $h,'>:encoding(UTF-8)',$p or die $!;print {$h} $s;close $h or die $!}
sub get {my($p)=@_;open my $h,'<:encoding(UTF-8)',$p or die $!;my $s=do {local $/;<$h>};close $h;return $s//''}
sub OpenAndCheck {open(OUT,'>:encoding(UTF-8)',$_[0]) or die $!}
sub l {my($key,@args)=@_;return {key=>$key,args=>\@args}}
sub PushLog {push @logs,[@_];1}
sub defrows {return {map {$_=>{shortname=>$GUILD{$_}[0],dealrate=>0+$GUILD{$_}[1],feerate=>0+$GUILD{$_}[2]}} keys %GUILD}}
sub ledgerrows {my %copy;for my $id(keys %GUILD_DATA){$copy{$id}={map {$_=>$_ eq 'guild'?$GUILD_DATA{$id}{$_}:0+$GUILD_DATA{$id}{$_}} keys %{$GUILD_DATA{$id}}}}return \%copy}
require './pinned-guild.cgi';require './pinned-guildsub.cgi';require './pinned-sub.cgi';require './pinned-config.cgi';
($GUILDIDX_name,$GUILDIDX_dealrate,$GUILDIDX_feerate)=(0,1,2);
for my $id(keys %{$in->{loaded}}){my $d=$in->{loaded}{$id};$GUILD{$id}=[$d->{shortname},$d->{dealrate},$d->{feerate}]}
for my $id(keys %{$in->{common}}){my $d=$in->{common}{$id};put("$COMMON_DIR/$id.pl",join('',map {"$_=$d->{$_}\n"} qw(shortname dealrate feerate)));put("$COMMON_DIR/$id.gif",'GIF89a')}
put(GetPath($GUILDBAL_FILE),$in->{ledgerText}) if defined $in->{ledgerText};@DT=@{$in->{shops}};
ReadGuild('');ReadGuildData();for my $e(@{$in->{edits}}){EditGuildMoney($e->{guildId},$e->{amount})}
MakeGuildFile() if $in->{rebuild};WriteGuildData();my $ledger=ledgerrows();my $old=defrows();
my $wire=get(GetPath($TEMP_DIR,$GUILDBAL_FILE));rename(GetPath($TEMP_DIR,$GUILDBAL_FILE),GetPath($GUILDBAL_FILE)) or die $!;ReadGuildData();my $staged=ledgerrows();
my ($definitionWire,$reloadError);if($in->{rebuild}){$definitionWire=get(GetPath($TEMP_DIR,$GUILD_FILE));eval $definitionWire;$reloadError=$@}
print JSON::PP->new->utf8->encode({shops=>\@DT,ledger=>$ledger,stagedLedgerRows=>$staged,oldDefinitions=>$old,definitions=>defrows(),logCalls=>\@logs,wire=>$wire,definitionWire=>$definitionWire,reloadError=>$reloadError//''});
`;
const oracle=input=>JSON.parse(execFileSync('perl',['-e',perl],{cwd,input:JSON.stringify(input),encoding:'utf8'}));
const red={shortname:'Red',dealrate:10,feerate:500},commonRed={shortname:'Red',dealrate:'10',feerate:'500'};
const fixture=(over={})=>({loaded:{red},common:{red:commonRed},ledgerText:null,shops:[{id:2,guild:'red',user:{_so_e:'member',keep:1}},{id:1,guild:'',user:{}}],edits:[],rebuild:false,...over});
const edit=(guildId,amount)=>({guildId,amount});
const compare=input=>{
  const before=structuredClone(input),o=oracle(input),actual=projectGuildLedgerLifecycle({reviewed,...input});
  assert.equal(o.reloadError,'');assert.deepEqual(o.oldDefinitions,input.loaded);for(const k of ['shops','ledger','stagedLedgerRows','definitions'])assert.deepEqual(actual[k],o[k],k);
  const logKey=x=>JSON.stringify([x[0],x[1],x[2].key,x[2].args,x[3]]);
  const sorted=logs=>[...logs].sort((a,b)=>logKey(a).localeCompare(logKey(b)));assert.deepEqual(sorted(actual.logCandidates),sorted(o.logCalls));assert.equal(actual.nativeOrderResolved,false);
  assert.equal(actual.committable,false);assert.equal(actual.worldStateWritten,false);assert.deepEqual(input,before);return {o,actual};
};
test('R4 guild lifecycle actual missing row, empty reload, sparse edits and per-street ledger separation',()=>{
  const created=compare(fixture({loaded:{},rebuild:true}));assert.equal(created.o.wire,'');assert.deepEqual(created.actual.added,['red']);
  const missing=compare(fixture({ledgerText:created.o.wire,edits:[edit('red',120000)]}));assert.equal(missing.o.wire,'red\t\n');assert.deepEqual(missing.actual.ledger,{});
  const alpha=compare(fixture({ledgerText:missing.o.wire,edits:[edit('red',120000),edit('red',-1000)]}));assert.deepEqual(alpha.actual.ledger.red,{money:119000,in:120000,out:1000});
  const beta=compare(fixture({ledgerText:missing.o.wire,edits:[edit('red',50000)]}));assert.deepEqual(beta.actual.ledger.red,{money:50000,in:50000});
  compare(fixture({ledgerText:'red\t\n',edits:[edit('red',0)]}));compare(fixture({ledgerText:'red\tmoney\t-1\tguild\tred\n',edits:[edit('red',-100)]}));
});
test('R4 guild lifecycle actual definition removal and delayed old-ledger cleanup',()=>{
  const input=fixture({common:{blue:{shortname:'Blue',dealrate:'500',feerate:'10'}},ledgerText:'red\tmoney\t-1\n',rebuild:true});
  const first=compare(input);assert.deepEqual(first.actual.removed,['red']);assert.deepEqual(first.actual.added,['blue']);assert.equal(first.actual.shops[0].guild,'');assert.deepEqual(first.actual.shops[0].user,{keep:1});assert.equal(first.o.wire,'red\tmoney\t-1\n');
  const second=compare(fixture({loaded:first.actual.definitions,common:input.common,shops:first.actual.shops,ledgerText:first.o.wire}));assert.equal(second.o.wire,'blue\t\n');assert.deepEqual(second.actual.stagedLedgerRows,{blue:{}});
});
test('R4 original accepted leading-zero rates use Perl literal semantics; invalid generated octal remains refused',()=>{
  const good=fixture({common:{red:{shortname:'Red',dealrate:'0100',feerate:'0010'}},rebuild:true});const result=compare(good);assert.equal(result.actual.definitions.red.dealrate,64);assert.equal(result.actual.definitions.red.feerate,8);assert.match(result.o.definitionWire,/,0100,0010,/);
  const bad=fixture({common:{red:{shortname:'Red',dealrate:'0080',feerate:'10'}},rebuild:true});const original=oracle(bad);assert.match(original.reloadError,/Illegal octal digit/);assert.match(original.definitionWire,/,0080,10,/);assert.throws(()=>projectGuildLedgerLifecycle({reviewed,...bad}),/invalid octal/);
  assert.throws(()=>reviewGuildLedgerLifecycle({...sources,guild:sources.guild+'\n'}),/source drift/);
  assert.throws(()=>projectGuildLedgerLifecycle({reviewed,...fixture({ledgerText:'red\tmoney\n'})}),/unreviewed ledger/);
});
