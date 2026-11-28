import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {reviewWis,projectWisSend,projectWisRead} from '../src/original-r4-wis.mjs';
const cwd=new URL('./original-perl/',import.meta.url);
const read=p=>readFileSync(new URL(p,cwd),'utf8');
const reviewed=reviewWis({wis:read('pinned-wis.cgi'),menu:read('../../../custom/inc-menu.cgi'),query:read('inc-func.cgi')});
const perl=String.raw`use utf8;use JSON::PP;use File::Temp qw(tempdir);
my $in=JSON::PP->new->utf8->decode(do{local $/;<STDIN>});
our(@DT,$DT,%id2idx,%Q,$SUBDATA_DIR);
$SUBDATA_DIR=tempdir(CLEANUP=>1);$DT=$in->{actor};@DT=map{{id=>$_}}@{$in->{activeShopIds}};%id2idx=map{($DT[$_]{id}=>$_)}0..$#DT;
$Q{form}='plus';$Q{to}=$in->{recipientId};$Q{msg}=$in->{message};
sub l {$_[0]}
sub GetTagImgKao {''}
sub GetPath {"$_[0]/$_[1].cgi"}
sub OpenAndCheck {open(OUT,'>:encoding(UTF-8)',$_[0]) or die $!}
sub DataRead {}
sub CheckUserPass {}
sub OutSkin {}
sub OutError {die 'SOURCE_REFUSAL'}
my $path=GetPath($SUBDATA_DIR,$in->{recipientId}.'-wis');
open my $f,'>:encoding(UTF-8)',$path or die $!;print {$f}'prior message';close $f;
my $ok=do './pinned-wis.cgi';die "$@ $!" unless $ok;
open my $m,'<:encoding(UTF-8)',$path or die $!;my $bytes=do{local $/;<$m>};close $m;
open my $menu,'<:encoding(UTF-8)','../../../custom/inc-menu.cgi' or die $!;my $s=do{local $/;<$menu>};close $menu;
my($body)=$s=~/(^sub WisRead\n\{[\s\S]*?^\})/m;die 'missing WisRead' unless $body;
eval "$body\n1;" or die $@;
my $read=WisRead($path);
print JSON::PP->new->utf8->encode({sourceBytes=>$bytes,read=>$read,deleted=>(!-e $path?JSON::PP::true:JSON::PP::false)});
`;
test('R4 actual wis overwrites unread message and source menu consumes it',()=>{
 const input={actor:{id:100,name:'甲'},recipientId:101,activeShopIds:[100,101],message:'你好 <朋友> & 交易'};
 const a=projectWisSend({reviewed,...input}),o=JSON.parse(execFileSync('perl',['-e',perl],{cwd,input:JSON.stringify(input),encoding:'utf8'}));
 assert.equal(a.sourceBytes,o.sourceBytes);assert.equal(a.sourceBytes,o.read);assert.equal(o.deleted,true);
 const b=projectWisRead({reviewed,actorId:101,sourceBytes:a.sourceBytes});assert.equal(b.deleteRequired,true);assert.equal(b.subdataName,'101-wis.cgi');
 assert.equal(projectWisRead({reviewed,actorId:101,sourceBytes:null}).deleteRequired,false);
 assert.throws(()=>projectWisSend({reviewed,...input,message:'甲'.repeat(73)}),/72/);
});
