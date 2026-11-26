# Actual original facility + handler; isolated identity/DataRead/commit adapters.
use utf8;
use strict;
use warnings;
use FindBin;
use File::Temp qw(tempdir);
use Digest::SHA qw(sha1_hex);
use JSON::PP;
our (%Q,%ARMY,%RIOT,%DTevent,%id2idx,$DT,$STATE,$NOW_TIME,$MAX_STOCK_TIME,$USER,
     $TEMP_DIR,$num,$ret,$disp,$TBT,$TRT,$TD,$TRE,$TBE,$NOMENU,$TB,$TR,$TDB,
     $METHOD,$USERPASSFORM,@DIGNITY,@image,@TRACE,@LOGS);
my $root=tempdir(CLEANUP=>1);
$TEMP_DIR="$root/stage";mkdir $TEMP_DIR or die $!;
sub GetPath {return @_==1?"$root/$_[0].cgi":"$_[0]/$_[1].cgi"}
sub OpenAndCheck {open(OUT,'>:encoding(UTF-8)',$_[0]) or die $!}
sub l {my($s,@args)=@_;$s=~s/%([1-9])/defined($args[$1-1])?$args[$1-1]:"%".$1/ge;return $s}
sub GetTagImgJob {''}
sub GetTagImgKao {''}
sub GetMenuTag {''}
sub DignityDefine {'fixture-title'}
sub RequireFile {die 'unexpected include' unless $_[0] eq 'inc-html-ownerinfo.cgi';1}
sub GetMoneyString {$_[0]}
sub GetTime2HMS {$_[0]}
sub OutError {die "SOURCE_REFUSAL:$_[0]\n"}
sub Lock {1}
sub DataRead {1}
sub CheckUserPass {1}
sub PushLog {push @LOGS,[@_];1}
sub RenewLog {1}
sub DataWrite {1}
sub DataCommitOrAbort {push @TRACE,'commit-adapter';1}
sub UnLock {1}
sub OutSkin {1}
sub bytes {my($f)=@_;open my $h,'<:raw',$f or die $!;my $s=do{local $/;<$h>};close $h;return $s}
sub put {my($f,$s)=@_;open my $h,'>:raw',$f or die $!;print {$h} $s;close $h or die $!}
my %pins=(
 'pinned-army-view.cgi'=>'ed89b1213ec236eb224dac048314be4073c30566',
 'pinned-army-s.cgi'=>'6f457b78f530e37aa0ff4074358a57797f5087e2',
 'pinned-army.cgi'=>'cd29bcbfe52bac84794c4c79426bd559d7616d85',
 'calc.cgi'=>'586354a9a300e26d0e12a4efa512fa25760e3197',
 '../../../_config.cgi'=>'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0');
for my $name(keys %pins){
 my $s=bytes("$FindBin::Bin/$name");
 die "source drift $name" unless sha1_hex("blob ".length($s)."\0".$s) eq $pins{$name};
}
require "$FindBin::Bin/calc.cgi";
require "$FindBin::Bin/pinned-army.cgi";
$MAX_STOCK_TIME=259200;$NOW_TIME=1000000;$USER='fixture';@DIGNITY=('base');
# name, handler, army, riot, event, leader, stock seconds, safety, confirmation
my @specs=(
 ['start-exact','rebelon',2500,0,0,2,1800,6000,'rebel'],
 ['start-safety-5000','rebelon',2500,0,0,2,1800,5000,'rebel'],
 ['start-safety-round','rebelon',2500,0,0,2,1800,5001,'rebel'],
 ['start-low-army','rebelon',2499,0,0,2,1800,6000,'rebel'],
 ['start-wrong-confirm','rebelon',2500,0,0,2,1800,6000,'REBEL'],
 ['start-leader-handler-only','rebelon',2500,0,0,1,1800,6000,'rebel'],
 ['start-active-handler-only','rebelon',2500,0,1,2,1800,6000,'rebel'],
 ['start-time-debt-handler-only','rebelon',2500,0,0,2,1799,6000,'rebel'],
 ['start-existing-debt','rebelon',2500,0,0,2,-1,6000,'rebel'],
 ['start-cap','rebelon',2500,0,0,2,300000,6000,'rebel'],
 ['join-exact','rside',100,0,1,2,1200,6000,'rebel'],
 ['join-leader','rside',100,0,1,1,1200,6000,'rebel'],
 ['join-no-event-handler-only','rside',100,0,0,2,1200,6000,'rebel'],
 ['join-already-riot-handler-only','rside',100,1,1,2,1200,6000,'rebel'],
 ['join-no-army-handler-only','rside',0,0,1,2,1200,6000,'rebel'],
 ['join-time-debt-handler-only','rside',100,0,1,2,1199,6000,'rebel'],
 ['join-wrong-confirm','rside',100,0,1,2,1200,6000,''],
 ['guard-leader','lside',300,0,1,1,1200,6000,''],
 ['guard-volunteer','lside',300,0,1,2,1200,6000,''],
 ['guard-riot-denial','lside',300,1,1,2,1200,6000,''],
 ['guard-inactive-handler-only','lside',300,0,0,2,1200,6000,''],
 ['guard-no-army-handler-only','lside',0,0,1,2,1200,6000,''],
 ['guard-time-debt-handler-only','lside',300,0,1,2,1199,6000,''],
 ['guard-existing-debt','lside',300,0,1,2,-1,6000,''],
);
my @cases;
for my $row(@specs){
 my($name,$mode,$count,$riot,$active,$leader,$stock,$safety,$confirmation)=@$row;
 $DT={id=>1,status=>1,dignity=>3,money=>800000,time=>$NOW_TIME-$stock,shopname=>'fixture',paytoday=>19};
 my $other={id=>2,status=>1,time=>$NOW_TIME-6000,shopname=>'peer'};
 $STATE={leader=>$leader,money=>2000000,in=>0,out=>0,develop=>5001,devem=>0,safety=>$safety,safem=>0,army=>1000,robina=>100,robinb=>0};
 %id2idx=(1=>0,2=>1);%DTevent=$active?(rebel=>$NOW_TIME+86400):();
 my $wire=($count?"1,$count,2,300,9,40":"2,300,9,40")."\n".($riot?'1':'')."\n";
 my $live=GetPath('army');my $stage=GetPath($TEMP_DIR,'army');unlink $live,$stage;put($live,$wire);
 $disp=$ret=$TBT=$TRT=$TD=$TRE=$TBE=$TB=$TR=$TDB=$METHOD=$USERPASSFORM='';@LOGS=();@TRACE=();
 my $view=do "$FindBin::Bin/pinned-army-view.cgi";die "view $name: $@ $!" unless $view;
 my %quote;
 for my $p(['canStart','rebelon'],['canJoin','rside'],['canDispatch','lside']){
   $quote{$p->[0]}=$disp=~/NAME=mode VALUE="$p->[1]"/?JSON::PP::true:JSON::PP::false;
 }
 my $world={schema=>'akimono.memory-world.v2',revision=>5,nowSeconds=>$NOW_TIME,events=>undef,
  shops=>[{%$DT},$other],period=>{town=>{%$STATE},eventState=>{%DTevent}}};
 %Q=(mode=>$mode,cmd=>$confirmation);
 my $r=do "$FindBin::Bin/pinned-army-s.cgi";my $err=$@;
 die "handler $name: $err $!" if !defined($r)&&$err!~/^SOURCE_REFUSAL:/;
 my $ok=defined($r);
 die "publication mismatch $name" unless scalar(grep($_ eq 'commit-adapter',@TRACE))==!!$ok;
 die "live bytes changed $name" unless bytes($live) eq $wire;
 push @cases,{name=>$name,mode=>$mode,confirmation=>$confirmation,world=>$world,armyBytes=>$wire,quote=>\%quote,
   ok=>$ok?JSON::PP::true:JSON::PP::false,shops=>$ok?[{%$DT},$other]:undef,
   town=>$ok?{%$STATE}:undef,eventState=>$ok?{%DTevent}:undef,logs=>$ok?[@LOGS]:undef,
   staged=>-e $stage?bytes($stage):undef};
}
binmode STDOUT,':raw';print JSON::PP->new->canonical->utf8->encode({cases=>\@cases});
