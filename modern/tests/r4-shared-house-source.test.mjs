import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {reviewSharedHouse,projectSharedHouse,parseSharedHouses} from '../src/original-r4-shared-house.mjs';
const cwd=new URL('./original-perl/',import.meta.url);
const read=p=>readFileSync(new URL(p,cwd),'utf8');
const reviewed=reviewSharedHouse({wrapper:read('pinned-bride.cgi'),town:read('pinned-hometown.cgi'),edit:read('pinned-inc-html-bride-edit.cgi'),form:read('pinned-inc-html-bride.cgi'),view:read('pinned-inc-html-bride-list.cgi'),map:read('../../../custom/inc-hometown.cgi'),calc:read('calc.cgi'),config:read('../../../_config.cgi'),itemDsl:read('../../../custom/inc-item-data.cgi'),rebelDsl:read('../../../custom/inc-rebel-data.cgi')});
const perl=String.raw`use utf8;use JSON::PP;use File::Temp qw(tempdir);
my $in=JSON::PP->new->utf8->decode(do{local $/;<STDIN>});
our(@DT,$DT,%id2idx,%Q,@ITEM,$NOW_TIME,$MAX_MONEY,$HouseMax,$TEMP_DIR,@trace,@logs);
@DT=@{$in->{shops}};%id2idx=map{($DT[$_]{id}=>$_)}0..$#DT;$DT=$DT[$id2idx{$in->{actorId}}];
$NOW_TIME=$in->{nowSeconds};$MAX_MONEY=999999999;$HouseMax=5;
$ITEM[1]={name=>'藥草',price=>50,limit=>4000,flag=>'',scale=>'份'};
$ITEM[40]={name=>'木刀',price=>1200,limit=>600,flag=>'',scale=>'把'};
my $root=tempdir(CLEANUP=>1);$TEMP_DIR="$root/stage";mkdir $TEMP_DIR or die $!;
sub GetPath {return @_==1?"$root/$_[0].cgi":"$_[0]/$_[1].cgi";}
open my $f,'>:encoding(UTF-8)',GetPath('bride') or die $!;print {$f}$in->{brideBytes};close $f;
sub l {my($key,@args)=@_;return {key=>$key,args=>\@args};}
sub GetTagImgKao {''}
sub OutError {die 'SOURCE_REFUSAL'}
sub Lock {}
sub DataRead {}
sub CheckUserPass {}
sub RequireFile {my($name)=@_;if($name eq 'inc-html-bride-edit.cgi'){my $ok=do './pinned-inc-html-bride-edit.cgi';die "$@ $!" unless $ok;}elsif($name ne 'inc-html-bride.cgi'&&$name ne 'inc-html-bride-list.cgi'){die "unexpected include $name";}}
sub OpenAndCheck {push @trace,'bride-stage';open(OUT,'>:encoding(UTF-8)',$_[0]) or die $!}
sub DataWrite {push @trace,'data-write'}
sub PushLog {push @logs,[@_]}
sub RenewLog {push @trace,'renew-log'}
sub DataCommitOrAbort {push @trace,'commit-request'}
sub UnLock {push @trace,'unlock'}
sub OutSkin {}
require './calc.cgi';
my $c=$in->{command};%Q=(mode=>$c->{kind},tg=>$c->{targetId},idx=>$c->{no},place=>$c->{place},it=>$c->{item},num=>$c->{count});
my $ok=do './pinned-bride.cgi';die "source wrapper $@ $!" unless $ok;
open my $out,'<:encoding(UTF-8)',GetPath($TEMP_DIR,'bride') or die $!;local $/;my $bytes=<$out>//'';close $out;
print JSON::PP->new->utf8->encode({shops=>\@DT,brideBytes=>$bytes,stages=>\@trace,logCalls=>\@logs});
`;
const oracle=input=>JSON.parse(execFileSync('perl',['-e',perl],{cwd,input:JSON.stringify(input),encoding:'utf8'}));
const shop=(id,name)=>({id,status:1,name,shopname:name+'店',point:20000,money:100000000,item:Array.from({length:79},(_,i)=>i===0?100:i===39?5:0)});
const base={shops:[shop(100,'甲'),shop(101,'乙')],actorId:100,brideBytes:'',nowSeconds:1000000};
function compare(input){const before=structuredClone(input),a=projectSharedHouse({reviewed,...input}),o=oracle(input);for(const k of ['shops','brideBytes','stages','logCalls'])assert.deepEqual(a[k],o[k],k);assert.deepEqual(input,before);return {...input,shops:a.shops,brideBytes:a.brideBytes};}
test('R4 original proposal, marriage, shared storage, construction and expansion',()=>{
 let x=compare({...base,command:{kind:'new',targetId:101}});
 x=compare({...x,actorId:101,command:{kind:'agree',no:1}});
 x=compare({...x,actorId:100,command:{kind:'plus',no:1,item:-1,count:10000000}});
 x=compare({...x,command:{kind:'con',no:1,place:101}});
 x=compare({...x,command:{kind:'plus',no:1,item:1,count:20}});
 x=compare({...x,actorId:101,command:{kind:'minus',no:1,item:0,count:10}});
 assert.equal(x.shops[1].item[0],110);
 x=compare({...x,command:{kind:'plus',no:1,item:-1,count:30000000}});
 x=compare({...x,command:{kind:'more',no:1}});
 assert.equal(parseSharedHouses(x.brideBytes)[0].mode,5);
 x=compare({...x,command:{kind:'minus',no:1,item:-1,count:1000000}});
 x=compare({...x,command:{kind:'divorce',no:1}});assert.equal(x.brideBytes,'');
});
test('R4 original proposal withdrawal returns deposit, rejection does not',()=>{
 const x=compare({...base,command:{kind:'new',targetId:101}});
 const y=compare({...x,command:{kind:'end',no:1}});assert.equal(y.shops[0].money,100000000);
 const z=compare({...x,actorId:101,command:{kind:'dis',no:1}});assert.equal(z.shops[0].money,95000000);assert.equal(z.brideBytes,'');
});
