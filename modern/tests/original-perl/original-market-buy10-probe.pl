use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use lib $FindBin::Bin;
use OriginalSparseAllPlusHarness;
binmode STDOUT,':encoding(UTF-8)';
our (%Q,@ITEM,@DT,@DTwholestore,$DT,$DTS,$NOW_TIME,$MAX_STOCK_TIME,
     $TIME_SEND_ITEM,$MAX_ITEM,$USER,$NOMENU,$id,$itemno,$showcase,$price,
     $num,$ret,$disp,$TBT,$TRT,$TD,$TRE,$TBE,$DTTaxrate,
     $writes,$commits,$last_error,$rendered);
# Use ACTUAL frozen source implementations for transaction math and market.
# Only CGI I/O, auth, guild outside this local-source scope are stubbed.
require './calc.cgi';
require './item.cgi';
require './whole.cgi';
sub l {return $_[0];}
sub OutError {$last_error=$_[0];die "GAME_ERROR:".$_[0]."\n";}
sub Lock {1}
sub UnLock {1}
sub DataRead {1}
sub DataWrite {$writes++;1}
sub DataCommitOrAbort {$commits++;1}
sub CheckUserPass {1}
sub CheckGuild {(0,0,0)} # original market has no participating guild
sub GetUserTaxRate {0} # no seller tax guild in original virtual market
sub CheckShowCaseNumber {
  my($s,$slot)=@_;
  OutError('不正な陳列架') if $slot<0||$slot>=$s->{showcasecount};
  1;
}
sub GetMoneyString {$_[0]}
sub GetTagImgJob {''}
sub GetMenuTag {''}
sub PushLog {1}
sub RenewLog {1}
sub RequireFile {1} # No ITEM #10 funcbuy source callback
sub OutSkin {$rendered++;die "__OUT_SKIN_CAPTURED__\n";}
$TBT=$TRT=$TD=$TRE=$TBE='';
$MAX_ITEM=79;$NOW_TIME=1_000_000;
$MAX_STOCK_TIME=259200;$TIME_SEND_ITEM=1200;$USER='local-probe';
$DTTaxrate=0;

my @draws=(0)x118;
my $supply=OriginalSparseAllPlusHarness::run(
  timespanSeconds=>60,randomDraws=>\@draws);
# B-37 harness uses the ORIGINAL fixed inc-turn PLUS loop.
die 'original source PLUS did not stock ITEM #10'
  unless $supply->{numericWholesale}[9]>0;
# Complete item metadata from real fixed DSL compiler GetBuffer.
for my $i (0..$#main::out_item) {
  my $item=$main::out_item[$i];
  $ITEM[$item->{no}]={%$item,sort=>$i};
}
die 'original #10 price or upper bound drift'
  unless $ITEM[10]{price}==5000&&$ITEM[10]{limit}==20&&
         $ITEM[10]{wslimit}==10&&!$ITEM[10]{funcbuy};

sub start_shop {
  $DT={id=>1,status=>1,name=>'原版驗收店主',shopname=>'原版驗收店',
    money=>100000,paytoday=>0,saletoday=>0,taxtoday=>0,
    time=>956800,rank=>5010,
    item=>[(0)x79],showcasecount=>1,showcase=>[0],price=>[0]};
  $DT->{item}[62]=1;$DT->{item}[78]=5;
  @DT=($DT);
  $commits=$writes=$rendered=0;
}
sub buy {
  my(%o)=@_;
  %Q=(id=>0,it=>10,sc=>$o{shelf}//0,pr=>$o{price}//5000,
      num1=>$o{count}//1,num2=>0);
  $last_error='';
  # Perl do FILE already catches errors. Reading $@ immediately after do
  # preserves both compile/runtime causes instead of clearing them with eval.
  my $ok=do './buy-s.cgi';
  my $message=$@||($! ? "PERL_DO_OS_ERROR:$!" : '');
  # Perl do FILE may return undef while leaving $@ empty. Capture our
  # original OutError hook independently, and fail closed when neither
  # CGI completion nor a recognized source refusal was observed.
  $message="GAME_ERROR:$last_error" if $last_error && !$message;
  $message='PERL_SOURCE_DID_NOT_COMPLETE' if !$message && !$rendered;
  return {
    passed=>$rendered>0,reason=>$message,
    money=>$DT->{money},paid=>$DT->{paytoday},
    stock=>$DT->{item}[9],time=>$DT->{time},
    market=>$DTwholestore[9]//0,
    commits=>$commits,writes=>$writes,
  };
}
sub snapshot_market {
  my @defined=grep {defined($DTwholestore[$_])}0..$#DTwholestore;
  no warnings 'uninitialized';
  return {wholesaleCsv=>join(',',@DTwholestore),
    sparseWrittenSlots=>\@defined,
    wholesaleNumeric79=>[map {0+($_//0)} @DTwholestore[0..78]]};
}
start_shop();
@DTwholestore=(); # B-34 actual source blank wholesale
my $empty=buy(count=>1);
my $empty_market=snapshot_market();
start_shop();
@DTwholestore=@{$supply->{wholesale}};
# Perl B-37 wholesale has sparse definedness, identical to real source.
my @before=map {0+($_//0)} @DTwholestore[0..78];
my $offer=GetWholeStore();
my ($shelf)=grep {$offer->{showcase}[$_]==10}0..$offer->{showcasecount}-1;
die 'original market did not expose ITEM #10' unless defined $shelf;
my $realprice=$offer->{price}[$shelf];
die 'original ITEM #10 market price drift' unless $realprice==5000;
my $success=buy(count=>1,shelf=>$shelf,price=>$realprice);
my $after_market=snapshot_market();
# Buyer cash failure is a separate isolated financial fixture. The normal
# new shop cannot reach it before cap limits, so it is NOT a UI user flow.
start_shop();
@DTwholestore=@{$supply->{wholesale}};
$DT->{money}=0;
my $no_money=buy(count=>1,shelf=>$shelf,price=>$realprice);
start_shop();
@DTwholestore=@{$supply->{wholesale}};
my $invalid=buy(count=>0,shelf=>$shelf,price=>$realprice);
print JSON::PP->new->canonical->encode({
  supply=>{draws=>$supply->{consumedSamples},
    marketBefore=>\@before},
  shelf=>$shelf,price=>$realprice,
  initialEmpty=>$empty,initialEmptyMarket=>$empty_market,
  success=>$success,afterMarket=>$after_market,
  noMoney=>$no_money,invalidCount=>$invalid,
  scope=>'original source PLUS -> original GetWholeStore -> original buy-s.cgi; original GetTimeDeal/UseTime/GetSaleTax/SetWholeStore, only CGI I/O and guild absence mocked',
});
