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
     @R2_TRACE);
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
  my($seller,$slot)=@_;
  OutError('bad original market shelf')
    if $slot<0||$slot>=$seller->{showcasecount};
  1;
}
sub GetMoneyString {$_[0]}
sub GetTime2HMS {$_[0].'s'}
sub GetTagImgJob {''}
sub GetMenuTag {''}
sub PushLog {1}
sub RenewLog {1}
sub RequireFile {push @R2_TRACE,'item-init';1}
sub OutSkin {$rendered++;die "__OUT_SKIN_CAPTURED__\n";}
$TBT=$TRT=$TD=$TRE=$TBE='';
$MAX_ITEM=79;$NOW_TIME=897400;$MAX_STOCK_TIME=259200;
$TIME_SEND_ITEM=1200;$USER='r2a-original-perl-oracle';$DTTaxrate=0;

# All 79 supply slots come from the frozen inc-turn.cgi PLUS code and
# original whole.cgi::CheckWholeStore, with original compiled DSL metadata.
my $supply=OriginalSparseAllPlusHarness::run(
  timespanSeconds=>60,randomDraws=>[(0)x118]);
for my $i (0..$#main::out_item){
  my $item=$main::out_item[$i];
  $ITEM[$item->{no}]={%$item,sort=>$i};
}
for my $id (10,11,14){
  die "missing source wholesale $id"
    unless $supply->{numericWholesale}[$id-1]>0;
  die "unreviewed source item buy callback $id"
    if $ITEM[$id]{funcbuy};
}

# Compile the ACTUAL @@FUNCBUY DSL body into an isolated temporary file,
# replacing only the source @@ITEMNO"禮物卷" macro with verified item #79.
# No original repository CGI/DSL file is edited, and no real I/O is touched.
my $dsl=File::Spec->catfile($FindBin::Bin,'../../../custom/inc-item-data.cgi');
open my $in,'<:encoding(UTF-8)',$dsl or die $!;
local $/;
my $source=<$in>;
close $in;
my ($globalBody)=$source=~/^@@FUNCBUY\s*\n(.*?)(?=^@@END)/ms;
die 'missing original global FUNCBUY source' unless $globalBody;
die 'original global voucher threshold drift'
  unless $globalBody=~/my \$count=int \$price\/500000;/;
$globalBody=~s/\@\@ITEMNO"禮物卷"/79/g;
die 'unexpanded original ITEMNO macro' if $globalBody=~/\@\@ITEMNO/;
my $dir=tempdir(CLEANUP=>1);
$ITEM_DIR=$dir;
open my $callback,'>:encoding(UTF-8)',File::Spec->catfile($dir,'funcbuy.cgi')
  or die $!;
print $callback "package item;\nour \$BUY;\n";
print $callback 'push @main::R2_TRACE,"global-after-account";'."\n";
print $callback $globalBody."\n1;\n";
close $callback;
$DEFINE_FUNCBUY=1;

my $originalSetWholeStore=\&SetWholeStore;
{
  no warnings 'redefine';
  *SetWholeStore=sub {
    push @R2_TRACE,'source-market-write';
    return $originalSetWholeStore->(@_);
  };
}
sub item::R2A_callback {
  push @main::R2_TRACE,'item-after-global';
  return 1;
}

my %limits=(10=>20,11=>50,14=>3);
my @cases;
for my $item (10,11,14){
  for my $entry (
    ['success',1],
    ['amount-clamp',99],
    ['cash-clamp',99],
    ['limit-clamp',99],
    ['limit-reject',1],
    ['zero-money',1],
    ['stale-price',1],
    ['stale-shelf',1],
    ['zero-count',0],
    ['time-cap',1],
    ['future-clock',1],
    ['no-stock',1],
  ){
    my($case,$requested)=@$entry;
    $DT={id=>1,status=>1,name=>'買入來源店主',shopname=>'原版來源店',
      money=>100000,paytoday=>0,saletoday=>0,taxtoday=>0,
      time=>854200,rank=>5010,
      item=>[(0)x79],showcasecount=>1,showcase=>[0],price=>[0]};
    $DT->{item}[62]=1;$DT->{item}[78]=5;
    $DT->{money}=$ITEM[$item]{price}+500 if $case eq 'cash-clamp';
    $DT->{money}=0 if $case eq 'zero-money';
    $DT->{item}[$item-1]=$limits{$item}-1 if $case eq 'limit-clamp';
    $DT->{item}[$item-1]=$limits{$item} if $case eq 'limit-reject';
    $DT->{time}=$NOW_TIME-259201 if $case eq 'time-cap';
    $DT->{time}=$NOW_TIME+1 if $case eq 'future-clock';
    @DT=($DT);
    @DTwholestore=$case eq 'no-stock'?():@{$supply->{wholesale}};
    my $offer=GetWholeStore();
    my($shelf)=grep {$offer->{showcase}[$_]==$item}
      0..($offer->{showcasecount}-1);
    my $quoted=defined($shelf)?$offer->{price}[$shelf]:$ITEM[$item]{price};
    $shelf=0 unless defined $shelf;
    my $requestedShelf=$shelf+($case eq 'stale-shelf'?1:0);
    my $requestedPrice=$quoted+($case eq 'stale-price'?1:0);
    $TIME_SEND_ITEM=1200; $commits=$writes=$rendered=0;
    $last_error='';@R2_TRACE=();
    %Q=(id=>0,it=>$item,sc=>$requestedShelf,pr=>$requestedPrice,
      num1=>$requested,num2=>0);
    delete $INC{File::Spec->catfile($ITEM_DIR,'funcbuy.cgi')};
    my $ok=do './buy-s.cgi';
    my $error=$@||($! ? "PERL_DO_IO:$!" : '');
    $error="GAME_ERROR:$last_error" if $last_error&&!$error;
    die "source not completed [$item/$case]:$error"
      unless $rendered||$last_error;
    my @defined=grep {defined($DTwholestore[$_])}
      0..$#DTwholestore;
    no warnings 'uninitialized';
    push @cases,{
      itemId=>$item,case=>$case,requestedCount=>$requested,
      marketShelf=>$requestedShelf,expectedPrice=>$requestedPrice,
      accepted=>($rendered>0?JSON::PP::true:JSON::PP::false),
      count=>$num+0,price=>$quoted+0,money=>$DT->{money}+0,
      paytoday=>$DT->{paytoday}+0,stock=>$DT->{item}[$item-1]+0,
      time=>$DT->{time}+0,
      marketStock=>0+($DTwholestore[$item-1]//0),
      wholesaleCsv=>join(',',@DTwholestore),
      sparseWrittenSlots=>\@defined,
      commits=>$commits+0,writes=>$writes+0,stages=>[@R2_TRACE],
    };
  }
}
# To probe an item hook, ONLY this separate artificial callback case changes
# an item metadata field. It verifies the ORIGINAL buy-s.cgi relative order,
# not that a genuine Standard Street item has an active item FUNCBUY.
$DT={id=>1,status=>1,money=>100000,paytoday=>0,saletoday=>0,
  taxtoday=>0,time=>854200,rank=>5010,item=>[(0)x79],
  showcasecount=>1,showcase=>[0],price=>[0]};
$DT->{item}[62]=1;$DT->{item}[78]=5;
@DT=($DT);@DTwholestore=@{$supply->{wholesale}};
my $quote=GetWholeStore();
my($slot)=grep {$quote->{showcase}[$_]==10}0..$quote->{showcasecount}-1;
$ITEM[10]{funcbuy}=1;$ITEM[10]{funcsale}='R2A_callback';
$TIME_SEND_ITEM=1200;$commits=$writes=$rendered=0;@R2_TRACE=();
%Q=(id=>0,it=>10,sc=>$slot,pr=>$quote->{price}[$slot],num1=>1,num2=>0);
delete $INC{File::Spec->catfile($ITEM_DIR,'funcbuy.cgi')};
my $syntheticOk=do './buy-s.cgi';
my $syntheticError=$@||'';
die "source callback order exercise failed: $syntheticError"
  unless $rendered && $commits==1;
print JSON::PP->new->canonical->encode({
  source=>'fixed buy-s.cgi / whole.cgi / item.cgi / calc.cgi plus original DSL @@FUNCBUY',
  nowSeconds=>$NOW_TIME,
  supplyDraws=>$supply->{consumedSamples},
  callbackStages=>\@R2_TRACE,
  cases=>\@cases,
});
