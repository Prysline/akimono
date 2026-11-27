import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {reviewRequestBoard,projectRequestBoard,parseRequestBoard} from '../src/original-r4-request-board.mjs';
const cwd=new URL('./original-perl/',import.meta.url);
const read=p=>readFileSync(new URL(p,cwd),'utf8');
const reviewed=reviewRequestBoard({handler:read('pinned-req-s.cgi'),reader:read('pinned-inc-req.cgi'),detail:read('pinned-req-l.cgi'),list:read('pinned-req.cgi'),form:read('pinned-req-f.cgi'),calc:read('calc.cgi'),config:read('../../../_config.cgi'),itemDsl:read('../../../custom/inc-item-data.cgi'),rebelDsl:read('../../../custom/inc-rebel-data.cgi'),action:read('../../../action.cgi')});
const perl=String.raw`use utf8;use JSON::PP;use File::Temp qw(tempdir);
my $in=JSON::PP->new->utf8->decode(do{local $/;<STDIN>});
our(@DT,$DT,%id2idx,%Q,@ITEM,$NOW_TIME,$DTTaxrate,$REQUEST_LIMIT,$REQUEST_CAPACITY,$MAX_MONEY,$TEMP_DIR,$id,@trace);
@DT=@{$in->{shops}};%id2idx=map{($DT[$_]{id}=>$_)}0..$#DT;$DT=$DT[$id2idx{$in->{actorId}}];
$NOW_TIME=$in->{nowSeconds};$DTTaxrate=$in->{townTaxRate};$REQUEST_LIMIT=172800;$REQUEST_CAPACITY=1;$MAX_MONEY=999999999;
$ITEM[1]={name=>'藥草',price=>50,limit=>4000,flag=>'',scale=>'份'};
$ITEM[40]={name=>'木刀',price=>1200,limit=>600,flag=>'',scale=>'把'};
my $root=tempdir(CLEANUP=>1);$TEMP_DIR="$root/stage";mkdir $TEMP_DIR or die $!;
sub GetPath {return @_==1?"$root/$_[0].cgi":"$_[0]/$_[1].cgi";}
open my $f,'>:encoding(UTF-8)',GetPath('request') or die $!;print {$f}$in->{requestBytes};close $f;
sub l {$_[0]}
sub GetTagImgKao {''}
sub GetTagImgJob {''}
sub GetMenuTag {''}
sub GetMoneyString {$_[0]}
sub OutError {die "SOURCE_REFUSAL:$_[0]"}
sub Lock {}
sub DataRead {}
sub CheckUserPass {}
sub RequireFile {die "unexpected include $_[0]" unless $_[0] eq 'inc-req.cgi';require './pinned-inc-req.cgi';}
sub OpenAndCheck {push @trace,'request-stage';open(OUT,'>:encoding(UTF-8)',$_[0]) or die $!}
sub DataWrite {push @trace,'data-write'}
sub DataCommitOrAbort {push @trace,'commit-request'}
sub UnLock {push @trace,'unlock'}
sub OutSkin {}
require './calc.cgi';
my $c=$in->{command};
%Q=(mode=>$c->{kind},id=>$in->{actorId},idx=>$c->{no},it=>$c->{itemno},prn=>$c->{prn},num=>$c->{num},pr=>$c->{pr},unit=>$c->{unit});
my $ok=do './pinned-req-s.cgi';die "source handler $@ $!" unless $ok;
open my $out,'<:encoding(UTF-8)',GetPath($TEMP_DIR,'request') or die $!;my $bytes=do{local $/;<$out>};close $out;
print JSON::PP->new->utf8->encode({shops=>\@DT,requestBytes=>$bytes//'',stages=>\@trace,globalIdDefined=>defined($id)?JSON::PP::true:JSON::PP::false});
`;
const oracle=input=>JSON.parse(execFileSync('perl',['-e',perl],{cwd,input:JSON.stringify(input),encoding:'utf8'}));
const shop=id=>({id,status:1,shopname:'Shop '+id,money:100000,paytoday:0,saletoday:0,taxtoday:0,item:Array.from({length:79},(_,i)=>i===0?100:i===39?5:0)});
const base={shops:[shop(1),shop(2)],actorId:1,requestBytes:'',nowSeconds:1000000,townTaxRate:10};
function compare(input){const before=structuredClone(input),a=projectRequestBoard({reviewed,...input}),o=oracle(input);for(const k of ['shops','requestBytes','stages'])assert.deepEqual(a[k],o[k],k);assert.equal(o.globalIdDefined,false);assert.deepEqual(input,before);assert.equal(a.committable,false);return {...input,shops:a.shops,requestBytes:a.requestBytes};}
test('R4 normal request sale, fulfill and collect through original handler',()=>{
 let x=compare({...base,command:{kind:'new',itemno:1,num:20,prn:-1,pr:50,unit:true}});
 assert.equal(parseRequestBoard(x.requestBytes)[0].pr,1000);
 x=compare({...x,actorId:2,command:{kind:'plus',no:1}});
 x=compare({...x,actorId:1,command:{kind:'thank',no:1}});
 assert.equal(x.requestBytes,'');assert.equal(x.shops[0].money,100900);assert.equal(x.shops[1].item[0],120);
});
test('R4 normal cash reward and barter request',()=>{
 let x=compare({...base,command:{kind:'new',itemno:-1,num:1200,prn:40,pr:1}});
 x=compare({...x,actorId:2,command:{kind:'plus',no:1}});
 x=compare({...x,actorId:1,command:{kind:'thank',no:1}});
 assert.equal(x.shops[0].item[39],6);assert.equal(x.shops[1].money,101200);
 let y=compare({...base,command:{kind:'new',itemno:40,num:1,prn:1,pr:24}});
 y=compare({...y,actorId:2,command:{kind:'plus',no:1}});
 compare({...y,actorId:1,command:{kind:'thank',no:1}});
});
test('R4 request withdrawal returns escrow, not tax or a second payment',()=>{
 const x=compare({...base,command:{kind:'new',itemno:1,num:20,prn:-1,pr:1000}});
 const y=compare({...x,command:{kind:'end',no:1}});
 assert.equal(y.shops[0].money,99900);assert.equal(y.shops[0].item[0],100);
 assert.throws(()=>projectRequestBoard({reviewed,...x,actorId:2,command:{kind:'end',no:1}}),/withdrawal/);
 assert.throws(()=>projectRequestBoard({reviewed,...x,command:{kind:'plus',no:1}}),/fulfillment/);
 assert.throws(()=>projectRequestBoard({reviewed,...x,nowSeconds:1172801,command:{kind:'end',no:1}}),/unavailable/);
});
