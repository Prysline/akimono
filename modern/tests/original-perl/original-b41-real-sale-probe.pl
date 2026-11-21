use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use lib $FindBin::Bin;
use OriginalSparseAllPlusHarness;
use OriginalNaturalSalePlusHarness;
binmode STDOUT,':encoding(UTF-8)';
our (%Q,@ITEM,@DT,@DTwholestore,$DT,$DTS,$NOW_TIME,$MAX_STOCK_TIME,
  $TIME_SEND_ITEM,$TIME_EDIT_SHOWCASE,$MAX_ITEM,$MAX_MONEY,$USER,$NOMENU,
  $id,$itemno,$showcase,$price,$num,$ret,$disp,$TBT,$TRT,$TD,$TRE,$TBE,
  $DTTaxrate,$last_error,$commits,$writes,$rendered);
require './calc.cgi';
# OriginalNaturalSalePlusHarness loads the real original whole/market/item/detail
# helpers, extracts real inc-turn source regions and compiles them in main.
OriginalNaturalSalePlusHarness::bootstrap();
# The original whole.cgi was required in a Perl harness package; buy-s.cgi
# expects the same frozen source GetWholeStore in main.
{ no warnings 'redefine'; require './whole.cgi'; }
sub l {return $_[0];}
sub OutError {$last_error=$_[0];die "GAME_ERROR:".$_[0]."\n";}
sub Lock {1}
sub UnLock {1}
sub DataRead {1}
sub DataWrite {$writes++;1}
sub DataCommitOrAbort {$commits++;1}
sub CheckUserPass {1}
sub CheckGuild {(0,0,0)}
sub CheckShowCaseNumber {
  my($s,$slot)=@_;
  OutError('bad shelf') if $slot<0||$slot>=$s->{showcasecount};
  1;
}
sub GetMoneyString {$_[0]}
sub GetTime2HMS {$_[0].'s'}
sub GetTagImgJob {''}
sub GetMenuTag {''}
sub PushLog {1}
sub RenewLog {1}
sub RequireFile {1}
sub OutSkin {$rendered++;die "__OUT_SKIN_CAPTURED__\n";}
$TBT=$TRT=$TD=$TRE=$TBE='';
$MAX_ITEM=79;$NOW_TIME=1_000_000;$MAX_STOCK_TIME=259200;
$TIME_SEND_ITEM=1200;$TIME_EDIT_SHOWCASE=600;$MAX_MONEY=1000000000;
$USER='b41-perl-original';$DTTaxrate=0;

sub call_source {
  my($path)=@_;
  $last_error='';$rendered=0;
  my $ok=do $path;
  my $error=$@;
  die "B-41 pinned source refused $path: ".($error||$last_error||$!) . "\n"
    unless $rendered && $error=~/__OUT_SKIN_CAPTURED__/ && !$last_error;
}
sub run {
  my($minutes)=@_;
  # Original buy-s.cgi halves the process-global TIME_SEND_ITEM in-place.
  # Each measured run is an independent fresh source world: restore config.
  $TIME_SEND_ITEM=1200;
  # The literal buy-s.cgi halves this global for marketplace purchases.
  # Each independent 30m/60m probe must restore the original configured base.
  $TIME_SEND_ITEM=1200;
  my @zeros=(0)x118;
  my $supply=OriginalSparseAllPlusHarness::run(
    timespanSeconds=>60,randomDraws=>\@zeros);
  my $plus=OriginalSparseAllPlusHarness::reviewed_seconds();
  for my $i(0..$#main::out_item){
    my $entry=$main::out_item[$i];
    $main::ITEM[$entry->{no}]={%$entry,sort=>$i};
  }
  for my $i(1..79){$main::ITEM[$i]{plus}=$plus->[$i-1];}
  # B-33 compiler bootstrap can reset our local harness clocks. Restore the
  # original DSL TimeEditShowcase 10m through real original GetTime.
  die 'B-41 DSL showroom edit time drift' unless
    OriginalGiftMapUseHarness::source('../../../custom/inc-item-data.cgi')=~/TimeEditShowcase\s+10m/;
  $TIME_EDIT_SHOWCASE=main::GetTime('10m');
  die 'B-41 original showroom duration mismatch' unless $TIME_EDIT_SHOWCASE==600;
  my $book=OriginalNaturalSalePlusHarness::compiled_item(10);
  my $gift=OriginalNaturalSalePlusHarness::compiled_item(79);
  die 'B-41 original source #10 compiler drift'
    unless $book->{price}==5000&&$book->{popular}==1728000&&
      $book->{point}==200000&&$book->{cost}==100&&
      $gift->{cost}==10;
  @{$main::ITEM[10]}{qw(price popular point cost type)}=(
    $book->{price},$book->{popular},$book->{point},$book->{cost},10);
  $main::ITEM[79]{cost}=$gift->{cost};
  $main::ITEM[63]{cost}=0;
  $main::DTpeople=500000;$main::MAX_USER=50;
  $main::SALE_SPEED=12;$main::POP_DOWN_RATE=5;
  %main::DTevent=();
  my @stock=(0)x79;
  $stock[62]=1;$stock[78]=5;
  $DT={id=>1,status=>1,name=>'來源店主',shopname=>'來源商店',
    time=>956800,rank=>5010,money=>100000,
    item=>\@stock,showcasecount=>1,showcase=>[0],price=>[0],
    trush=>0, paytoday=>0,saletoday=>0,taxtoday=>0,costtoday=>0,
    itemtoday=>{},itemyesterday=>{},taxmode=>0};
  @DT=($DT);
  @DTwholestore=@{$supply->{wholesale}};
  $commits=$writes=0;
  my $offer=GetWholeStore();
  my($shelf)=grep {$offer->{showcase}[$_]==10}
    0..$offer->{showcasecount}-1;
  die 'B-41 #10 not source stocked' unless defined $shelf;
  %Q=(id=>0,it=>10,sc=>$shelf,pr=>5000,num1=>1,num2=>0);
  call_source('./buy-s.cgi');
  die 'B-41 original purchase not committed'
    unless $DT->{money}==95000&&$DT->{item}[9]==1&&$commits==1;
  %Q=(no=>0,item=>10,per=>100,prc=>5000,bk=>'sc');
  call_source('./sc-s.cgi');
  die 'B-41 original showcase not committed'
    unless $DT->{showcase}[0]==10&&$DT->{price}[0]==5000&&
      $DT->{item}[9]==1&&$commits==2;
  my $afterBuy={
    money=>0+$DT->{money},stock=>0+$DT->{item}[9],
    time=>0+$DT->{time},paytoday=>0+$DT->{paytoday},
    shelf=>0+$DT->{showcase}[0],price=>0+$DT->{price}[0],
    wholesale10=>0+($DTwholestore[9]//0),
  };
  my @draws=(500000,0,0,((0)x118));
  @main::B35_DRAWS=@draws;$main::B35_USED=0;
  main::B38SourceNaturalPlus($minutes*60);
  my $used=$main::B35_USED;
  my @numeric=map {0+($_//0)} @DTwholestore[0..78];
  my @defined=grep {defined($DTwholestore[$_])} 0..$#DTwholestore;
  no warnings 'uninitialized';
  my $csv=join(',',@DTwholestore);
  return {
    minutes=>$minutes,afterBuy=>$afterBuy,
    saleCount=>0+($DT->{itemtoday}{10}//0),
    money=>0+$DT->{money},stock=>0+$DT->{item}[9],
    rank=>0+$DT->{rank},saletoday=>0+$DT->{saletoday},
    taxtoday=>0+$DT->{taxtoday},trush=>0+$DT->{trush},
    costtoday=>0+$DT->{costtoday},
    temprank=>0+$DT->{temprank},time=>0+$DT->{time},
    paytoday=>0+$DT->{paytoday},
    saleRecordCount=>0+($DT->{_sale_count_}{10}{count}//0),
    definedIndices=>\@defined,originalWholesaleCsv=>$csv,
    wholesale=>\@numeric,randomDrawsUsed=>$used,
    consumedSamples=>[@draws[0..$used-1]],
    buyAndShowcaseCommits=>$commits,
  };
}
my $sale30=run(30);
my $sale60=run(60);
print JSON::PP->new->canonical->encode({
  sale30=>$sale30,sale60=>$sale60,
  scope=>'real fixed buy-s.cgi -> sc-s.cgi -> original inc-turn natural region -> original 59 PLUS + CheckWholeStore, same single source state; file/HTTP authentication and full period callbacks excluded',
});
