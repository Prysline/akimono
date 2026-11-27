import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {reviewLetterBox,projectLetterBox,parseLetterBox} from '../src/original-r4-letter-box.mjs';
const cwd=new URL('./original-perl/',import.meta.url);
const read=p=>readFileSync(new URL(p,cwd),'utf8');
const reviewed=reviewLetterBox({wrapper:read('pinned-letter.cgi'),edit:read('pinned-inc-letter-edit.cgi'),form:read('pinned-inc-letter-form.cgi'),view:read('pinned-inc-letter.cgi'),helper:read('pinned-plug-letter.cgi'),sub:read('pinned-plug-sub.cgi'),query:read('inc-func.cgi'),config:read('../../../_config.cgi')});
const perl=String.raw`use utf8;use JSON::PP;use File::Temp qw(tempdir);
my $in=JSON::PP->new->utf8->decode(do{local $/;<STDIN>});
our($COMMON_DIR,$COTEMP_DIR,$BOX_FILE,$BOX_STOCK_TIME,$NOW_TIME,$MYDIR,$DT,%Q,@OtherDir,$WriteFlag,$disp,$COLOCKED,@LETTER);
my $root=tempdir(CLEANUP=>1);$COMMON_DIR="$root/common";$COTEMP_DIR="$root/stage";mkdir $_ or die $! for($COMMON_DIR,$COTEMP_DIR);
$BOX_FILE='box';$BOX_STOCK_TIME=172800;$NOW_TIME=$in->{nowSeconds};$MYDIR=$in->{street};$DT=$in->{actor};
@OtherDir=keys %{$in->{directory}};
sub GetPath {"$_[0]/$_[1].cgi"}
sub OpenAndCheck {open(OUT,'>:encoding(UTF-8)',$_[0]) or die $!}
sub l {$_[0]}
sub GetMenuTag {''}
sub GetTime2HMS {$_[0]}
sub GetTime2FormatTime {$_[0]}
sub OutError {die "SOURCE_REFUSAL:$_[0]"}
open my $f,'>:encoding(UTF-8)',GetPath($COMMON_DIR,$BOX_FILE) or die $!;print {$f}$in->{letterBytes};close $f;
require './pinned-plug-letter.cgi';require './pinned-plug-sub.cgi';
ReadLetter();$WriteFlag=0;
my $c=$in->{command};
if($c->{kind} eq 'send'){
 %Q=(mode=>'new',title=>$c->{title},msg=>$c->{msg},$c->{toTown}=>$c->{toId});
 my $ok=do './pinned-inc-letter-edit.cgi';die "$@ $!" unless $ok;
}elsif($c->{kind} eq 'delete'){
 %Q=(mode=>'delete',map{('del_'.$_=>1)}@{$c->{numbers}});
 my $ok=do './pinned-inc-letter-edit.cgi';die "$@ $!" unless $ok;
}else{
 %Q=();
 my $ok=do './pinned-inc-letter.cgi';die "$@ $!" unless $ok;
}
my $bytes=$in->{letterBytes};
if($WriteFlag){WriteLetter();open my $out,'<:encoding(UTF-8)',GetPath($COTEMP_DIR,$BOX_FILE) or die $!;local $/;$bytes=<$out>//'';close $out;}
print JSON::PP->new->utf8->encode({letterBytes=>$bytes,writeRequired=>$WriteFlag?JSON::PP::true:JSON::PP::false});
`;
const oracle=input=>JSON.parse(execFileSync('perl',['-e',perl],{cwd,input:JSON.stringify(input),encoding:'utf8'}));
const a={id:100,shopname:'甲店'},b={id:101,shopname:'乙店'};
const base={letterBytes:'',nowSeconds:1000000,street:'street',actor:a,directory:{street:[100],other:[101]}};
function compare(input){const before=structuredClone(input),p=projectLetterBox({reviewed,...input,localize:key=>key}),o=oracle(input);assert.equal(p.letterBytes,o.letterBytes);assert.equal(p.writeRequired,o.writeRequired);assert.deepEqual(input,before);return {...input,letterBytes:p.letterBytes};}
test('R4 original postal send, receive, mark read and delete across streets',()=>{
 let x=compare({...base,command:{kind:'send',toTown:'other',toId:101,title:'',msg:'你好'}});
 assert.equal(parseLetterBox(x.letterBytes)[0].title,'（無題）');
 x=compare({...x,street:'other',actor:b,command:{kind:'read'}});
 assert.equal(parseLetterBox(x.letterBytes)[0].mode,0);
 x=compare({...x,command:{kind:'delete',numbers:[1]}});
 assert.equal(x.letterBytes,'');
});
test('R4 original postal sender deletion is shared and current mailbox scoped',()=>{
 const x=compare({...base,command:{kind:'send',toTown:'other',toId:101,title:'交易',msg:'請查收'}});
 assert.throws(()=>projectLetterBox({reviewed,...x,actor:{id:102,shopname:'第三店'},command:{kind:'delete',numbers:[1]}}),/mailbox/);
 assert.equal(compare({...x,command:{kind:'delete',numbers:[1]}}).letterBytes,'');
});
