use strict;
use warnings;
use FindBin;
use File::Temp qw(tempdir);
use Digest::SHA qw(sha1_hex);
use JSON::PP;
our (%Q,%ARMY,%RIOT,%DTevent,%id2idx,$DT,$NOW_TIME,$MAX_STOCK_TIME,$USER,
     $TEMP_DIR,$num,$ret,$disp,$TBT,$TRT,$TD,$TRE,$TBE,$NOMENU,@TRACE);
my $root=tempdir(CLEANUP=>1);
$TEMP_DIR="$root/stage";mkdir $TEMP_DIR or die $!;
sub GetPath {return @_==1?"$root/$_[0].cgi":"$_[0]/$_[1].cgi"}
sub OpenAndCheck {open(OUT,'>:encoding(UTF-8)',$_[0]) or die $!}
sub l {$_[0]}
sub GetTagImgJob {''}
sub GetMenuTag {''}
sub GetMoneyString {$_[0]}
sub GetTime2HMS {$_[0]}
sub OutError {die "SOURCE_REFUSAL:$_[0]\n"}
sub Lock {1}
sub DataRead {1}
sub CheckUserPass {1}
sub PushLog {1}
sub RenewLog {1}
sub DataWrite {1}
sub DataCommitOrAbort {push @TRACE,'commit-adapter';1}
sub UnLock {1}
sub OutSkin {1}
sub bytes {my($f)=@_;open my $h,'<:raw',$f or die $!;my $s=do{local $/;<$h>};close $h;return $s}
sub put {my($f,$s)=@_;open my $h,'>:raw',$f or die $!;print {$h} $s;close $h or die $!}
my %pins=(
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
# Frozen configuration has 72*60*60; do not load full deployment config.
$MAX_STOCK_TIME=72*60*60;$NOW_TIME=1000000;$USER='fixture';
my @specs=(
 ['hire-normal','plus',2,500000,43200,"100,9\n\n",0,8],
 ['hire-cash-clamp','plus',3,2500,43200,"1,1000\n\n",0,8],
 ['hire-capacity-clamp','plus',3,500000,43200,"1,2999\n\n",0,8],
 ['hire-rebel-price','plus',3,5000,43200,"1,1000\n1\n",1,10],
 ['hire-at-capacity','plus',3,500000,43200,"1,3000\n\n",0,1],
 ['hire-above-capacity','plus',1,500000,43200,"1,2000\n\n",0,1],
 ['hire-zero-dignity','plus',0,500000,43200,"\n\n",0,1],
 ['hire-no-money','plus',3,999,43200,"\n\n",0,1],
 ['hire-negative-money','plus',3,-200,43200,"\n\n",0,1],
 ['hire-existing-time-debt','plus',3,500000,-1,"\n\n",0,1],
 ['hire-zero-stocktime','plus',3,500000,0,"\n\n",0,1],
 ['hire-time-cap','plus',3,500000,300000,"\n\n",0,1],
 ['hire-absent-file','plus',3,500000,43200,undef,0,1],
 ['fire-partial','fire',3,1234,43200,"1,1000\n1\n",1,3],
 ['fire-all-stale-ids','fire',3,1234,1,"1,100,99,90\n99,1\n",0,500],
 ['fire-no-army','fire',3,1234,43200,"\n\n",0,1],
 ['fire-time-debt','fire',3,1234,-1,"1,100\n\n",0,1],
);
my @cases;
for my $s(@specs){
 my($name,$mode,$dig,$cash,$stock,$wire,$rebel,$count)=@$s;
 $DT={id=>1,status=>1,dignity=>$dig,money=>$cash,time=>$NOW_TIME-$stock,paytoday=>19,saletoday=>27};
 %id2idx=(1=>0);%DTevent=$rebel?(rebel=>900001):();
 %Q=(mode=>$mode,cnt1=>$count,cnt2=>0);@TRACE=();$disp=$ret=$TBT=$TRT=$TD=$TRE=$TBE='';
 my $live=GetPath('army');my $stage=GetPath($TEMP_DIR,'army');
 unlink $live,$stage;
 put($live,$wire) if defined $wire;
 my $before={%$DT};
 my $r=do "$FindBin::Bin/pinned-army-s.cgi";my $err=$@;
 die "unexpected source execution $name: $err $!" if !defined($r)&&$err!~/^SOURCE_REFUSAL:/;
 my $published=scalar(grep($_ eq 'commit-adapter',@TRACE));
 die "publication mismatch $name" unless $published==!!defined($r);
 die "live bytes changed $name" if defined($wire)?bytes($live) ne $wire:-e $live;
 push @cases,{name=>$name,mode=>$mode,before=>$before,nowSeconds=>$NOW_TIME,
   eventState=>{%DTevent},armyBytes=>$wire,count=>$count,ok=>defined($r)?JSON::PP::true:JSON::PP::false,
   after=>defined($r)?{%$DT}:undef,staged=>-e $stage?bytes($stage):undef};
}
binmode STDOUT,':raw';print JSON::PP->new->canonical->utf8->encode({cases=>\@cases});
