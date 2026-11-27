import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {reviewGuildCommands,projectGuildCommand} from '../src/original-r4-guild-commands.mjs';
const cwd=new URL('./original-perl/',import.meta.url);
const read=p=>readFileSync(new URL(p,cwd),'utf8');
const reviewed=reviewGuildCommands({handler:read('pinned-gd-s.cgi'),guild:read('pinned-guild.cgi'),calc:read('calc.cgi')});
const perl=String.raw`use utf8;use JSON::PP;use File::Temp qw(tempdir);
my $in=JSON::PP->new->utf8->decode(do{local $/;<STDIN>});
our ($DT,$NOW_TIME,$MYDIR,$MAX_STOCK_TIME,$USER,%GUILD,%GUILD_DATA,%GUILD_DETAIL,%Q,$GUILDIDX_name,$COMMON_DIR,$TEMP_DIR,$GUILDBAL_FILE,@draws,@ranges);
BEGIN {*CORE::GLOBAL::rand=sub {push @ranges,$_[0];die 'unexpected draw' unless @draws;return $_[0]*shift(@draws)/1000000;};}
$DT=$in->{actor};$NOW_TIME=$in->{nowSeconds};$MYDIR=$in->{street};$USER='fixture';$MAX_STOCK_TIME=259200;@draws=@{$in->{randomDraws}};
$GUILDIDX_name=0;
my $root=tempdir(CLEANUP=>1);$COMMON_DIR="$root/common";$TEMP_DIR="$root/stage";mkdir $_ or die $! for($COMMON_DIR,$TEMP_DIR);$GUILDBAL_FILE='guildbal.cgi';
for my $k(keys %{$in->{definitions}}){
 my $d=$in->{definitions}{$k};$GUILD{$k}=[$d->{name}];$GUILD_DETAIL{$k}={leadt=>$d->{leadt},leader=>$d->{leader},%{$d->{representatives}}};
 open my $f,'>',"$COMMON_DIR/$k.pl" or die $!;close $f;
}
my $live="$root/guildbal.cgi";open my $f,'>',$live or die $!;
for my $k(keys %{$in->{ledgers}}){my $g=$in->{ledgers}{$k};print {$f} join("\t",$k,map{($_,$g->{$_})}qw(money in out atk def))."\n";}
close $f;
sub GetPath {@_==1?$live:join('/',@_)}
sub OpenAndCheck {open(OUT,'>:encoding(UTF-8)',$_[0]) or die $!}
sub l {$_[0]}
sub GetMoneyString {$_[0]}
sub OutError {die "SOURCE_REFUSAL:$_[0]"}
sub Lock {}
sub DataRead {}
sub CheckUserPass {}
sub ReadGuild {}
sub PushLog {}
sub RenewLog {}
sub DataWrite {}
sub DataCommitOrAbort {}
sub UnLock {}
sub OutSkin {}
require './calc.cgi';require './pinned-guild.cgi';
%Q=(mode=>$in->{command}{kind},cnt1=>$in->{command}{amount}//0,cnt2=>0,tg=>$in->{command}{targetGuild}//'');
my $ok=do './pinned-gd-s.cgi';die "source handler $@ $!" unless $ok;
die 'unused draw' if @draws;
my @removed=sort grep{!-e "$COMMON_DIR/$_.pl"}keys %GUILD;
print JSON::PP->new->utf8->encode({actor=>$DT,ledgers=>\%GUILD_DATA,drawRanges=>\@ranges,definitionRemoval=>\@removed});
`;
const oracle=input=>JSON.parse(execFileSync('perl',['-e',perl],{cwd,input:JSON.stringify(input),encoding:'utf8'}));
const f={actor:{id:1,status:1,shopname:'Shop A',guild:'alpha',money:1000000,paytoday:0,saletoday:0,time:956800,user:{_so_e:1}},street:'street',
 definitions:{alpha:{name:'Alpha',leadt:'street',leader:1,representatives:{}},beta:{name:'Beta',leadt:'other',leader:2,representatives:{}}},
 ledgers:{alpha:{money:1000000,in:0,out:0,atk:400,def:800},beta:{money:2000000,in:0,out:0,atk:200,def:300}},nowSeconds:1000000,randomDraws:[]};
function compare(input){
 const untouched=structuredClone(input),a=projectGuildCommand({reviewed,...input}),o=oracle(input);
 for(const k of ['actor','ledgers','drawRanges','definitionRemoval'])assert.deepEqual(a[k],o[k],k);
 assert.deepEqual(input,untouched);assert.equal(a.committable,false);return a;
}
test('R4 original guild donation and military upgrade normal operations',()=>{
 const a=compare({...f,command:{kind:'fund',amount:50000}});assert.equal(a.actor.money,950000);assert.equal(a.ledgers.alpha.in,50000);
 const b=compare({...f,command:{kind:'force'},ledgers:{...f.ledgers,alpha:{...f.ledgers.alpha,money:4000000,atk:950}}});assert.equal(b.ledgers.alpha.atk,990);assert.equal(b.ledgers.alpha.out,0);
});
test('R4 original guild break successful and defended outcomes',()=>{
 const a=compare({...f,command:{kind:'break',targetGuild:'beta'},randomDraws:[0]});
 assert.equal(a.receipt.attack,187500);assert.equal(a.actor.saletoday,19750);assert.equal(a.logCalls[1].length,2);
 const b=compare({...f,command:{kind:'break',targetGuild:'beta'},randomDraws:[0],ledgers:{...f.ledgers,alpha:{...f.ledgers.alpha,atk:100}}});assert.equal(b.receipt.attack,0);
});
test('R4 original guild break definition removal is an intent only',()=>{
 const a=compare({...f,command:{kind:'break',targetGuild:'beta'},randomDraws:[0],
 ledgers:{alpha:{...f.ledgers.alpha,money:1000,atk:1000},beta:{...f.ledgers.beta,money:2000,def:0}}});
 assert.deepEqual(a.definitionRemoval,['beta']);assert.equal(a.ledgers.alpha.def,1000);
});
