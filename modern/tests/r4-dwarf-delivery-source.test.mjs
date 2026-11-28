import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {reviewDwarfDelivery,projectDwarfDelivery,parseDwarfDelivery} from '../src/original-r4-dwarf-delivery.mjs';
import {parseLetterBox} from '../src/original-r4-letter-box.mjs';
const cwd=new URL('./original-perl/',import.meta.url);
const read=p=>readFileSync(new URL(p,cwd),'utf8');
const config=read('../../../_config.cgi');
const reviewed=reviewDwarfDelivery({wrapper:read('pinned-dwarf.cgi'),edit:read('pinned-inc-dwarf-edit.cgi'),form:read('pinned-inc-dwarf-form.cgi'),view:read('pinned-inc-dwarf.cgi'),calc:read('calc.cgi'),config,itemDsl:read('../../../custom/inc-item-data.cgi'),rebelDsl:read('../../../custom/inc-rebel-data.cgi'),letterSources:{wrapper:read('pinned-letter.cgi'),edit:read('pinned-inc-letter-edit.cgi'),form:read('pinned-inc-letter-form.cgi'),view:read('pinned-inc-letter.cgi'),helper:read('pinned-plug-letter.cgi'),sub:read('pinned-sub.cgi'),query:read('inc-func.cgi'),config}});
const perl=String.raw`use utf8;use JSON::PP;use File::Temp qw(tempdir);
my $in=JSON::PP->new->utf8->decode(do{local $/;<STDIN>});
our(@DT,$DT,%id2idx,%Q,@ITEM,$NOW_TIME,$DTTaxrate,$MAX_MONEY,$BOX_STOCK_TIME,$MYDIR,$TEMP_DIR,$COMMON_DIR,$COTEMP_DIR,$BOX_FILE,@trace);
@DT=@{$in->{shops}};%id2idx=map{($DT[$_]{id}=>$_)}0..$#DT;$DT=$DT[$id2idx{$in->{actorId}}];
$NOW_TIME=$in->{nowSeconds};$DTTaxrate=$in->{townTaxRate};$MAX_MONEY=999999999;$BOX_STOCK_TIME=172800;$MYDIR=$in->{street};$BOX_FILE='box';
$ITEM[1]={name=>'藥草',price=>50,limit=>4000,flag=>'',scale=>'份'};
$ITEM[40]={name=>'木刀',price=>1200,limit=>600,flag=>'',scale=>'把'};
my $root=tempdir(CLEANUP=>1);$TEMP_DIR="$root/stage";$COMMON_DIR="$root/common";$COTEMP_DIR="$root/costage";mkdir $_ or die $! for($TEMP_DIR,$COMMON_DIR,$COTEMP_DIR);
sub GetPath {return @_==1?"$root/$_[0].cgi":"$_[0]/$_[1].cgi";}
sub put {my($path,$s)=@_;open my $f,'>:encoding(UTF-8)',$path or die $!;print {$f}$s;close $f;}
sub bytes {open my $f,'<:encoding(UTF-8)',$_[0] or die $!;local $/;return <$f>//'';}
put(GetPath('dwarf'),$in->{dwarfBytes});put(GetPath($COMMON_DIR,$BOX_FILE),$in->{letterBytes});
sub l {my($s,@a)=@_;$s=~s/%(\d+)/$a[$1-1]/ge;return $s;}
sub GetTagImgKao {''}
sub OutError {die "SOURCE_REFUSAL:$_[0]"}
sub Lock {}
sub CoLock {}
sub CoDataCA {push @trace,'common-commit'}
sub CoUnLock {push @trace,'common-unlock'}
sub DataRead {}
sub CheckUserPass {}
sub RequireFile {my($name)=@_;if($name eq 'inc-dwarf-edit.cgi'){my $ok=do './pinned-inc-dwarf-edit.cgi';die "$@ $!" unless $ok;}elsif($name ne 'inc-dwarf.cgi'){die "unexpected include $name";}}
sub OpenAndCheck {push @trace,($_[0] eq GetPath($COTEMP_DIR,$BOX_FILE)?'letter-stage':'dwarf-stage');open(OUT,'>:encoding(UTF-8)',$_[0]) or die $!}
sub DataWrite {push @trace,'data-write'}
sub DataCommitOrAbort {push @trace,'commit-request'}
sub UnLock {push @trace,'unlock'}
sub OutSkin {}
require './calc.cgi';require './pinned-plug-letter.cgi';
my $c=$in->{command};my $mode=$c->{kind};
if($mode eq 'new'){
 %Q=(mode=>'new',to=>$c->{toId},item=>$c->{itemId},num=>$c->{count},price=>$c->{price},unit=>$c->{unit},notice=>$c->{notice});
}elsif($mode eq 'delete'){
 %Q=(mode=>'delete',map{('del_'.$_=>1)}@{$c->{numbers}});
}else{
 %Q=(mode=>'plus',ng=>($mode eq 'reject'?1:0),map{('act_'.$_=>1)}@{$c->{numbers}});
}
my $ok=do './pinned-dwarf.cgi';die "source wrapper $@ $!" unless $ok;
my $box=GetPath($COTEMP_DIR,$BOX_FILE);
print JSON::PP->new->utf8->encode({shops=>\@DT,dwarfBytes=>bytes(GetPath($TEMP_DIR,'dwarf')),letterBytes=>(-e $box?bytes($box):$in->{letterBytes}),stages=>\@trace});
`;
const oracle=input=>JSON.parse(execFileSync('perl',['-e',perl],{cwd,input:JSON.stringify(input),encoding:'utf8'}));
const shop=(id,name)=>({id,status:1,shopname:name,money:100000,paytoday:0,saletoday:0,taxtoday:0,item:Array.from({length:79},(_,i)=>i===0?100:i===39?5:0)});
const base={shops:[shop(100,'甲店'),shop(101,'乙店')],actorId:100,street:'street',dwarfBytes:'',letterBytes:'',nowSeconds:1000000,townTaxRate:10};
function compare(input){const before=structuredClone(input),a=projectDwarfDelivery({reviewed,...input,localize:(key,...args)=>key.replace(/%(\d+)/g,(_,n)=>args[n-1])}),o=oracle(input);for(const k of ['shops','dwarfBytes','letterBytes','stages'])assert.deepEqual(a[k],o[k],k);assert.deepEqual(input,before);return {...input,shops:a.shops,dwarfBytes:a.dwarfBytes,letterBytes:a.letterBytes};}
test('R4 original local parcel send with notice, receive payment and remove completed row',()=>{
 let x=compare({...base,command:{kind:'new',toId:101,itemId:1,count:20,price:50,unit:true,notice:true}});
 assert.equal(parseDwarfDelivery(x.dwarfBytes)[0].price,1000);assert.equal(parseLetterBox(x.letterBytes)[0].fromid,1);
 x=compare({...x,actorId:101,command:{kind:'receive',numbers:[1]}});
 assert.equal(x.shops[0].money,100900);assert.equal(x.shops[1].item[0],120);
 x=compare({...x,actorId:100,command:{kind:'delete',numbers:[1]}});
 assert.equal(x.dwarfBytes,'');assert.equal(x.shops[0].item[0],80);
});
test('R4 original local parcel refusal and sender return, without notice',()=>{
 let x=compare({...base,command:{kind:'new',toId:101,itemId:40,count:2,price:2400,notice:false}});
 x=compare({...x,actorId:101,command:{kind:'reject',numbers:[1]}});
 assert.equal(parseDwarfDelivery(x.dwarfBytes)[0].mode,3);
 x=compare({...x,actorId:100,command:{kind:'delete',numbers:[1]}});
 assert.equal(x.shops[0].item[39],5);assert.equal(x.shops[0].money,99760);assert.equal(x.dwarfBytes,'');
});
