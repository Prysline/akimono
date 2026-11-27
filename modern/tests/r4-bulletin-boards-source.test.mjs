import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {reviewBulletinBoards,projectGuildBoardPost,projectStreetBoardPost,listStreetBoardPosts} from '../src/original-r4-bulletin-boards.mjs';
const cwd=new URL('./original-perl/',import.meta.url);
const read=p=>readFileSync(new URL(p,cwd),'utf8');
const reviewed=reviewBulletinBoards({guildView:read('pinned-gd-bbs.cgi'),guildEdit:read('pinned-inc-gd-bbs.cgi'),street:read('pinned-treebbs.cgi'),streetConfig:read('pinned-inc-treebbs.cgi'),streetEdit:read('pinned-inc-treebbs-edit.cgi'),streetView:read('pinned-inc-treebbs-view.cgi'),decoder:read('pinned-inc-dec.cgi'),sub:read('pinned-sub.cgi'),query:read('inc-func.cgi'),config:read('../../../_config.cgi')});
const perl=String.raw`use utf8;use JSON::PP;use File::Temp qw(tempdir);
my $in=JSON::PP->new->utf8->decode(do{local $/;<STDIN>});
our($COMMON_DIR,$COTEMP_DIR,$LOG_FILE,$datafile,$NOW_TIME,$DT,$TOWN_TITLE,%Q,$addr,$host,$max,@MESSAGE);
my $root=tempdir(CLEANUP=>1);$COMMON_DIR="$root/common";$COTEMP_DIR="$root/stage";mkdir $_ or die $! for($COMMON_DIR,$COTEMP_DIR);
$NOW_TIME=$in->{nowSeconds};$DT=$in->{actor};$TOWN_TITLE=$in->{townTitle};
sub GetPath {"$_[0]/$_[1].cgi"}
sub l {$_[0]}
sub GetMenuTag {''}
sub CoLock {}
sub CoUnLock {}
sub CoDataCA {}
sub OutError {die 'SOURCE_REFUSAL'}
sub OpenAndCheck {open(OUT,'>:encoding(UTF-8)',$_[0]) or die $!}
sub ReadBoard {undef @MESSAGE;open my $f,'<:encoding(UTF-8)',GetPath($COMMON_DIR,$LOG_FILE) or die $!;@MESSAGE=<$f>;close $f;}
my $guild=defined($in->{message});
$LOG_FILE=$guild?'bbslog-'.$DT->{guild}:'treelog';$datafile=GetPath($COMMON_DIR,$LOG_FILE);
open my $f,'>:encoding(UTF-8)',$datafile or die $!;print {$f}$in->{boardBytes};close $f;
if($guild){
 require './pinned-sub.cgi';require './pinned-inc-gd-bbs.cgi';
 my($msg,$err)=WriteGBBS($in->{message},180);die $err if $err;
}else{
 require './pinned-inc-treebbs.cgi';
 $addr=$in->{serverMetadata}{addr};$host=$in->{serverMetadata}{host};my $c=$in->{command};
 %Q=(no=>$c->{kind} eq 'new'?'new':$c->{parentNo},oya=>$c->{rootNo},sub=>$c->{subject},message=>$c->{message},town=>$TOWN_TITLE,name=>$DT->{shopname},smail=>$c->{category});
 my $ok=do './pinned-inc-treebbs-edit.cgi';die "$@ $!" unless $ok;
}
open my $out,'<:encoding(UTF-8)',GetPath($COTEMP_DIR,$LOG_FILE) or die $!;local $/;my $bytes=<$out>//'';close $out;
print JSON::PP->new->utf8->encode({boardBytes=>$bytes});
`;
const oracle=input=>JSON.parse(execFileSync('perl',['-e',perl],{cwd,input:JSON.stringify(input),encoding:'utf8'})).boardBytes;
const actor={id:100,name:'甲',shopname:'甲店',icon:3,guild:'alpha'};
test('R4 original guild board post and duplicate rejection',()=>{
 const f={actor,definition:{code:'alpha'},boardBytes:'',nowSeconds:1000000,townTitle:'標準街',message:'交易 & <木刀>'};
 const a=projectGuildBoardPost({reviewed,...f});assert.equal(a.boardBytes,oracle(f));
 const b={...f,boardBytes:a.boardBytes,nowSeconds:1000001,message:'下一則'};
 assert.equal(projectGuildBoardPost({reviewed,...b}).boardBytes,oracle(b));
 assert.throws(()=>projectGuildBoardPost({reviewed,...f,boardBytes:a.boardBytes,nowSeconds:1000001}),/duplicate/);
});
test('R4 original street board post, reply and thread bump',()=>{
 const f={actor,boardBytes:'',nowSeconds:1000000,townTitle:'標準街',serverMetadata:{addr:'',host:''}};
 const compare=(before,command)=>{const input={...f,boardBytes:before,command};const a=projectStreetBoardPost({reviewed,...input});assert.equal(a.boardBytes,oracle(input));return a.boardBytes;};
 let bytes=compare('',{kind:'new',subject:'交易',message:'有木刀',category:8});
 bytes=compare(bytes,{kind:'new',subject:'問題',message:'請問',category:2});
 bytes=compare(bytes,{kind:'reply',parentNo:1,rootNo:1,subject:'Re: 交易',message:'想購入',category:3});
 const rows=listStreetBoardPosts(bytes);assert.deepEqual(rows.map(x=>x.no),[1,3,2]);assert.equal(rows[0].res,1);assert.ok(rows.every(x=>!Object.hasOwn(x,'host')));
});
