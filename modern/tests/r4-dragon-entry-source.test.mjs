import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {projectDragonEntry,reviewDragonEntryConfig} from '../src/original-r4-dragon-entry.mjs';
const cwd=new URL('./original-perl/',import.meta.url);
const pins={'inc-dras-dredit':'3d995cc43a0c55c35903595ed2eb57805ece1578','inc-dragon':'76bb00f247733630cbcc374a82f693638f653b71','drreadb':'1b13a1a855490c80c88b0fa117676c68b6440753','drreada':'01110533ae1a223f687f13b02f0aaeebd30c3155','drreadc':'f363bcdab6022581976b6b99dd5e095b51f5f238','drwrite':'0abc25f24ea6bd06576d5d1ba31eeb82419a2fee'};
const read=name=>readFileSync(new URL('pinned-'+name+'.cgi',cwd));for(const [name,sha] of Object.entries(pins)){const b=read(name);assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),sha,name);}
const review=reviewDragonEntryConfig(read('inc-dragon').toString('utf8'));
const perl=String.raw`use utf8; use JSON::PP; use File::Temp qw(tempdir);
BEGIN {*CORE::GLOBAL::rand=sub {die "UNEXPECTED_RNG\n"}}
my $in=JSON::PP->new->utf8->decode(do {local $/;<STDIN>});
our ($COMMON_DIR,$COTEMP_DIR,$MYDIR,$NOW_TIME,$DT,%id2idx,%Q,@trace);
my $root=tempdir(CLEANUP=>1);$COMMON_DIR="$root/common";$COTEMP_DIR="$root/stage";mkdir $_ or die $! for ($COMMON_DIR,$COTEMP_DIR);
$MYDIR=$in->{street};$NOW_TIME=6000000;$DT={id=>$in->{actorId}};
my $i=0;for my $id(@{$in->{activeShopIds}}){$id2idx{$id}=$i++}
%Q=(%{$in->{command}},code=>$in->{command}{kind});my $rcode=$Q{rcode}//0;
sub GetPath {"$_[0]/$_[1].cgi"}
sub put {my($p,$s)=@_;open my $h,'>:encoding(UTF-8)',$p or die $!;print {$h} $s;close $h or die $!}
sub get {my($p)=@_;return '' unless -e $p;open my $h,'<:encoding(UTF-8)',$p or die $!;my $s=do {local $/;<$h>};close $h;return $s//''}
my %files=(dragonText=>'dra-dr',stableText=>'dra-st',ranchText=>'dra-rc',jockeyText=>'dra-jk',raceText=>"dra-rd$rcode");for my $k(keys %files){put(GetPath($COMMON_DIR,$files{$k}),$in->{$k}) if $in->{$k} ne ''}
sub l {$_[0]}
sub OutError {die "SOURCE_REFUSAL\n"}
sub OpenAndCheck {my($p)=@_;my($f)=$p=~/([^\/]+)\.cgi$/;push @trace,$f;open(OUT,'>:encoding(UTF-8)',$p) or die $!}
sub CoDataCA {push @trace,'common-commit';1}
require './pinned-inc-dragon.cgi';require './pinned-drreadb.cgi';require './pinned-drreada.cgi';require './pinned-drreadc.cgi';require './pinned-drwrite.cgi';
my $ok=do './pinned-inc-dras-dredit.cgi';my $err=$@;die "unexpected entry failure $err $!" unless $ok||$err eq "SOURCE_REFUSAL\n";
my %out;for my $k(keys %files){my $p=GetPath($COTEMP_DIR,$files{$k});$out{$k}=get(-e $p?$p:GetPath($COMMON_DIR,$files{$k}));}
print JSON::PP->new->utf8->encode({ok=>$ok?JSON::PP::true:JSON::PP::false,%out,trace=>\@trace});
`;
const oracle=input=>JSON.parse(execFileSync('perl',['-e',perl],{cwd,input:JSON.stringify(input),encoding:'utf8'}));
const DF='no birth fm color name town owner stable race apt sp spp sr srp ag agp pw pwp hl hlp fl flp con wt gr prize sdwin g3win g2win g1win'.split(' ');
const SF='no birth name town owner emp tr con wt sp sr ag pw hl fl sdwin g3win g2win g1win'.split(' ');
const JF='no birth name town owner race ahead back sp sdwin g3win g2win g1win'.split(' ');
const RF='no birth name town owner prize sdwin g3win g2win g1win'.split(' ');
const row=(keys,r)=>keys.map(k=>r[k]??'').join(',')+'\n';
const dragon=(over={})=>row(DF,{no:1,birth:5000000,fm:0,color:0,name:'Dragon name',town:'alpha',owner:1,stable:7,race:0,apt:1400,sp:25,sr:30,ag:10,pw:40,hl:20,fl:10,con:70,wt:49,prize:0,...over});
const stable=(over={})=>row(SF,{no:7,birth:5000000,name:'Stable name',town:'beta',owner:1,emp:0,tr:20,con:25,wt:0,sp:1,sr:1,...over});
const jockey=(over={})=>row(JF,{no:3,birth:5000000,name:'Jockey name',town:'beta',owner:1,race:0,ahead:20,back:5,...over});
const ranch=(over={})=>row(RF,{no:4,birth:5000000,name:'Ranch name',town:'alpha',owner:1,...over});
const fixture=(over={})=>({street:'alpha',activeShopIds:[1,2],actorId:1,dragonText:dragon(),stableText:stable(),ranchText:ranch(),jockeyText:jockey(),raceText:'',command:{kind:'torace',dr:1,rcode:0,jock:0,str:1},...over});
const project=input=>projectDragonEntry({...input,review});
function compare(input){const before=structuredClone(input),o=oracle(input),a=project(input);assert.equal(o.ok,true);for(const k of ['dragonText','stableText','ranchText','jockeyText','raceText'])assert.deepEqual(a[k],o[k],k);assert.deepEqual(a.payments,[]);assert.deepEqual(a.drawBounds,[]);assert.equal(a.committable,false);assert.deepEqual(input,before);return {a,o};}
test('R4 actual boarding changes only owned dragon stable, normal UI policy refuses racing and invalid IDs',()=>{
  const input=fixture({command:{kind:'ent',dr:1,ent:7}});const {o}=compare({...input,dragonText:dragon({stable:''})});assert.deepEqual(o.trace,['dra-dr','common-commit']);
  compare({...input,stableText:stable({town:'beta',owner:99})}); // visible foreign source row, not a payment yet
  const busy={...input,dragonText:dragon({race:2})};assert.equal(oracle(busy).ok,true);assert.throws(()=>project(busy),/currently racing/);
  const stale={...input,stableText:stable({town:'alpha',owner:99})};assert.equal(oracle(stale).ok,true);assert.throws(()=>project(stale),/source form/);
  for(const bad of [{...input,command:{...input.command,dr:99}},{...input,command:{...input.command,ent:99}},{...input,dragonText:dragon({town:'beta'})}])assert.throws(()=>project(bad),/R4 dragon entry:/);
});
test('R4 actual race entry source table, all strategies, conditions and jockey stage order',()=>{
  for(const str of [0,1,2,3])for(const rcode of [0,1]){const input=fixture({command:{kind:'torace',dr:1,rcode,jock:3,str},raceText:'0,2,1\n',dragonText:dragon({race:1,prize:125,apt:2800,wt:57,con:50})});const {o}=compare(input);assert.deepEqual(o.trace,['dra-jk','dra-rd'+rcode,'dra-dr','common-commit']);}
  const {o}=compare(fixture());assert.deepEqual(o.trace,['dra-rd0','dra-dr','common-commit']);
  compare(fixture({dragonText:dragon({stable:'',apt:2600,con:105,wt:50}),raceText:'0,0,0\n'}));
  compare(fixture({command:{kind:'torace',dr:1,rcode:0,jock:3,str:1},jockeyText:jockey({no:4,town:'alpha',owner:99})+jockey()}));
});
test('R4 actual registration permits oversubscription; closed/prize/busy denial; no invented jockey',()=>{
  let raceText='';for(let i=1;i<=11;i++){const {a}=compare(fixture({dragonText:dragon({no:i}),raceText,command:{kind:'torace',dr:i,rcode:0,jock:0,str:1}}));raceText=a.raceText;}assert.equal(raceText.trimEnd().split('\n').length,12);
  for(const input of [fixture({raceText:'1,0,0\n'}),fixture({dragonText:dragon({prize:1})}),fixture({dragonText:dragon({race:2})}),fixture({ranchText:''}),fixture({command:{kind:'torace',dr:1,rcode:0,jock:3,str:1},jockeyText:jockey({race:2})})]){const o=oracle(input);assert.equal(o.ok,false);assert.deepEqual(o.trace,[]);assert.throws(()=>project(input),/R4 dragon entry:/);}
  const unknown=fixture({command:{kind:'torace',dr:1,rcode:0,jock:99,str:1}});assert.equal(oracle(unknown).ok,true);assert.throws(()=>project(unknown),/jockey not in current source form/);
});
