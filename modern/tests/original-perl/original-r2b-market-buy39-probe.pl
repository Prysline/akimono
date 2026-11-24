use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use File::Temp qw(tempdir);
use File::Spec;
use lib $FindBin::Bin;
use OriginalSparseAllPlusHarness;
binmode STDOUT,':encoding(UTF-8)';
our (%Q,@ITEM,@DT,@DTwholestore,$DT,$DTS,$NOW_TIME,$MAX_STOCK_TIME,
  $TIME_SEND_ITEM,$MAX_ITEM,$USER,$NOMENU,$id,$itemno,$showcase,$price,
  $num,$ret,$disp,$TBT,$TRT,$TD,$TRE,$TBE,$DTTaxrate,
  $writes,$commits,$last_error,$rendered,$DEFINE_FUNCBUY,$ITEM_DIR,
  @R2B_TRACE);
require './calc.cgi';
require './item.cgi';
require './whole.cgi';
sub l {$_[0]}
sub OutError {$last_error=$_[0];die "GAME_ERROR:".$_[0]."\n";}
sub Lock {1}
sub UnLock {1}
sub DataRead {1}
sub DataWrite {$writes++;1}
sub DataCommitOrAbort {$commits++;1}
sub CheckUserPass {1}
sub CheckGuild {(0,0,0)}
sub GetUserTaxRate {0}
sub CheckShowCaseNumber {
  my($s,$slot)=@_;
  OutError('invalid source shelf') if $slot<0||$slot>=$s->{showcasecount};
  1;
}
sub GetMoneyString {$_[0]}
sub GetTime2HMS {$_[0].'s'}
sub GetTagImgJob {''}
sub GetMenuTag {''}
sub PushLog {1}
sub RenewLog {1}
sub RequireFile {push @R2B_TRACE,'item-init';1}
sub OutSkin {$rendered++;die "__SOURCE_DONE__\n";}
$TBT=$TRT=$TD=$TRE=$TBE='';
$MAX_ITEM=79;$NOW_TIME=897400;$MAX_STOCK_TIME=259200;
$TIME_SEND_ITEM=1200;$USER='r2b-original-39';$DTTaxrate=0;
my $supply=OriginalSparseAllPlusHarness::run(
  timespanSeconds=>60,randomDraws=>[(0)x118]);
for my $i (0..$#main::out_item){
  my $item=$main::out_item[$i];
  $ITEM[$item->{no}]={%$item,sort=>$i};
}
# ITEM #39 is plain PRICE+LIMIT without BASE or item-level FUNCB.
die 'fixed original ITEM #39 review drift' unless
  $ITEM[39]{code} eq 'book-kaitai' &&
  $ITEM[39]{name} eq '拆解/打包工具' &&
  $ITEM[39]{price}==500 && $ITEM[39]{limit}==10 &&
  $ITEM[39]{wslimit}==3 && !$ITEM[39]{pricehalf} &&
  !$ITEM[39]{funcbuy} && $supply->{numericWholesale}[38]>0;

# Run the ACTUAL source global FUNCBUY (no effect below 500000 G).
my $dsl=File::Spec->catfile($FindBin::Bin,'../../../custom/inc-item-data.cgi');
open my $in,'<:encoding(UTF-8)',$dsl or die $!;
local $/;my $source=<$in>;close $in;
my ($global)=$source=~/^\@\@FUNCBUY\s*\n(.*?)(?=^\@\@END)/ms;
die 'original global callback not found' unless
  $global && $global=~/my \$count=int \$price\/500000;/;
$global=~s/\@\@ITEMNO"禮物卷"/79/g;
die 'unsafe unresolved callback macro' if $global=~/\@\@ITEMNO/;
my $dir=tempdir(CLEANUP=>1);$ITEM_DIR=$dir;
open my $fh,'>:encoding(UTF-8)',File::Spec->catfile($dir,'funcbuy.cgi') or die $!;
print $fh "package item;\nour \$BUY;\n";
print $fh 'push @main::R2B_TRACE,"global-after-account";'."\n";
print $fh $global."\n1;\n";close $fh;
$DEFINE_FUNCBUY=1;
my $saved=\&SetWholeStore;
{no warnings 'redefine';*SetWholeStore=sub{
  push @R2B_TRACE,'source-market-write';
  return $saved->(@_);
};}
my @cases;
for my $scenario ('success','stale-price','zero-money'){
  $DT={id=>1,status=>1,money=>100000,paytoday=>0,
    time=>854200,rank=>5010,item=>[(0)x79],
    showcasecount=>1,showcase=>[0],price=>[0],
    shopname=>'R2B original ordinary goods'};
  $DT->{item}[62]=1;$DT->{item}[78]=5;
  $DT->{money}=0 if $scenario eq 'zero-money';
  @DT=($DT);@DTwholestore=@{$supply->{wholesale}};
  my $offer=GetWholeStore();
  my($shelf)=grep {$offer->{showcase}[$_]==39}
    0..$offer->{showcasecount}-1;
  die 'ordinary source item missing from market' unless defined $shelf;
  my $offerprice=$offer->{price}[$shelf];
  die 'source #39 price drift' unless $offerprice==500;
  $TIME_SEND_ITEM=1200;
  $commits=$writes=$rendered=0;$last_error='';@R2B_TRACE=();
  %Q=(id=>0,it=>39,sc=>$shelf,
    pr=>$offerprice+($scenario eq 'stale-price'?1:0),
    num1=>2,num2=>0);
  delete $INC{File::Spec->catfile($dir,'funcbuy.cgi')};
  my $ok=do './buy-s.cgi';
  my $error=$@||($last_error?"GAME_ERROR:$last_error":'');
  die "source did not finish ($scenario): $error"
    if !$rendered && !$last_error;
  my @defined=grep {defined($DTwholestore[$_])}
    0..$#DTwholestore;
  no warnings 'uninitialized';
  push @cases,{
    case=>$scenario,accepted=>($rendered?JSON::PP::true:JSON::PP::false),
    marketShelf=>$shelf,expectedPrice=>$Q{pr}+0,
    requestedCount=>2,purchasedCount=>$num+0,
    money=>$DT->{money}+0,paytoday=>$DT->{paytoday}+0,
    stock=>$DT->{item}[38]+0,time=>$DT->{time}+0,
    marketStock=>0+($DTwholestore[38]//0),
    wholesaleCsv=>join(',',@DTwholestore),
    sparseWrittenSlots=>\@defined,
    stages=>[@R2B_TRACE],commits=>$commits+0,writes=>$writes+0,
  };
}
print JSON::PP->new->canonical->encode({
  source=>'fixed original Perl buy-s.cgi / GetWholeStore + ITEM #39 source PRICE/LIMIT',
  itemId=>39,cases=>\@cases,
});
