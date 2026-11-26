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
  @R2B_DYNAMIC_TRACE);
require './calc.cgi';
require './item.cgi';
require './whole.cgi';
sub l {my ($s,@args)=@_;$s=~s/%([1-9])/defined($args[$1-1])?$args[$1-1]:""/ge;return $s;}
sub OutError {$last_error=$_[0];die "GAME_ERROR:".$_[0]."\n";}
sub Lock {1}
sub UnLock {1}
sub DataRead {1}
sub DataWrite {$writes++;1}
sub DataCommitOrAbort {$commits++;1}
our $P5_INIT;
sub CheckUserPass {$P5_INIT->();1}
sub CheckGuild {(0,0,0)}
sub GetUserTaxRate {0}
sub CheckShowCaseNumber {
  my($s,$slot)=@_;
  OutError('invalid original market shelf')
    if $slot<0||$slot>=$s->{showcasecount};
  1;
}
sub GetMoneyString {$_[0]}
sub GetTime2HMS {$_[0].'s'}
sub GetTagImgJob {''}
sub GetMenuTag {''}
our @P5_LOGS;
sub PushLog {push @P5_LOGS, [@_];1}
sub RenewLog {1}
sub RequireFile {push @R2B_DYNAMIC_TRACE,'item-init';1}
sub OutSkin {$rendered++;die "__ORIGINAL_BUY_RENDERED__\n";}
$TBT=$TRT=$TD=$TRE=$TBE='';
$MAX_ITEM=79;$NOW_TIME=897400;$MAX_STOCK_TIME=259200;
$TIME_SEND_ITEM=1200;$USER='r2b-original-dynamic';$DTTaxrate=0;

# Existing original harness uses frozen compiler/GetTime and real
# inc-turn PLUS + CheckWholeStore, yielding the same real wholesale as R2-A.
my $supply=OriginalSparseAllPlusHarness::run(
  timespanSeconds=>60,randomDraws=>[(0)x118]);
for my $i (0..$#main::out_item){
  my $item=$main::out_item[$i];
  $ITEM[$item->{no}]={%$item,sort=>$i};
}
# R2-A's old bounded compiler fixture intentionally omitted BASE.
# Compile the actual untouched ITEM BASE directives with the already
# extracted original GetBuffer subroutine, NEVER the whole compiler or
# any supplied Perl callbacks, to fix that test-source blind spot.
my $dsl=File::Spec->catfile($FindBin::Bin,'../../../custom/inc-item-data.cgi');
open my $in,'<:encoding(UTF-8)',$dsl or die $!;
local $/;my $source=<$in>;close $in;
my @parts=split(/(?=^\@\@ITEM\b)/m,$source);
my %baseById;
for my $part (@parts){
  next unless $part=~/^\@\@ITEM\b/m;
  my ($itemId)=$part=~/^\s*no\s+(\d+)\b/m;
  next unless $itemId;
  my ($raw)=$part=~/^\s*base\s+(\S+)/m;
  next unless defined $raw;
  die "unsafe source BASE item $itemId" unless $raw=~/^\d+\/[1-9]\d*$/;
  my ($a,$b)=split('/',$raw);
  main::ClearBuffer('item');
  main::GetBuffer('item'," BASE $raw ");
  die "fixed compiler BASE $itemId drift"
    unless $main::g_item->{pricebase}==$a&&
           $main::g_item->{pricehalf}==$b;
  $ITEM[$itemId]{pricebase}=0+$main::g_item->{pricebase};
  $ITEM[$itemId]{pricehalf}=0+$main::g_item->{pricehalf};
  $baseById{$itemId}=$raw;
}
die 'missing real dynamic market source #12/#14'
  unless $baseById{12} eq '50/150'&&$baseById{14} eq '50/150' &&
    $supply->{numericWholesale}[11]>0&&$supply->{numericWholesale}[13]>0 &&
    !$ITEM[12]{funcbuy}&&!$ITEM[14]{funcbuy};

# Real standard-street global FUNCBUY is present and can award #79;
# run this exact pinned callback under isolated temporary I/O.
my ($global)=$source=~/^\@\@FUNCBUY\s*\n(.*?)(?=^\@\@END)/ms;
die 'missing actual global voucher callback' unless
  $global&&$global=~/my \$count=int \$price\/500000;/;
$global=~s/\@\@ITEMNO"禮物卷"/79/g;
die 'unreviewed macro in global callback' if $global=~/\@\@ITEMNO/;
my $dir=tempdir(CLEANUP=>1);$ITEM_DIR=$dir;
open my $f,'>:encoding(UTF-8)',File::Spec->catfile($dir,'funcbuy.cgi') or die $!;
print $f "package item;\nour \$BUY;\n";
print $f 'push @main::R2B_DYNAMIC_TRACE,"global-after-account";'."\n";
print $f $global."\n1;\n";close $f;
$DEFINE_FUNCBUY=1;
my $setWhole=\&SetWholeStore;
{no warnings 'redefine';*SetWholeStore=sub {
  push @R2B_DYNAMIC_TRACE,'source-market-write';
  return $setWhole->(@_);
};}


# P5 controlled original transaction differential, NOT player acquisition.
# No frozen source is modified; only the original transaction's IO is stubbed.
die 'P5 source book compilation drift' unless
  $ITEM[13]{code} eq 'book-work' && $ITEM[13]{price}==0 &&
  $ITEM[13]{limit}==1 && $ITEM[13]{wslimit}==1 &&
  !$ITEM[13]{pricehalf} && !$ITEM[13]{funcbuy} &&
  $supply->{plusSeconds}[12]==36000 && $supply->{numericWholesale}[12]==1;
my ($init)=$source=~/^\@\@FUNCINIT\s*\n(.*?)(?=^\@\@FUNCITEM)/ms;
die 'missing original FUNCINIT' unless defined $init;
$init=~s/\@\@ITEMNO"行家的精隨"/24/g;
die 'unexpected FUNCINIT macros' if $init=~/\@\@/;
$P5_INIT=eval 'sub {'.$init.'}';
die "cannot compile original FUNCINIT: $@" unless ref($P5_INIT) eq 'CODE';
my @cases;
for my $case ('success','zero-money','count-clamp','held','sold-out',
              'negative-price','stale-price','stale-shelf','wrong-item',
              'zero-count','negative-count','future-clock','time-cap',
              'peddle','appraiser','peddle-appraiser'){
  $DT={id=>1,status=>1,money=>100000,paytoday=>123,saletoday=>0,
    taxtoday=>0,time=>854200,rank=>5010,item=>[(0)x79],
    showcasecount=>1,showcase=>[0],price=>[0],shopname=>'P5 source'};
  $DT->{item}[62]=1;$DT->{item}[78]=5;
  $DT->{job}=$case=~/peddle/?'peddle':'';
  $DT->{item}[23]=1 if $case=~/appraiser/;
  $DT->{money}=0 if $case eq 'zero-money';
  $DT->{time}=$NOW_TIME+1 if $case eq 'future-clock';
  $DT->{time}=$NOW_TIME-$MAX_STOCK_TIME-1 if $case eq 'time-cap';
  @DT=($DT);@DTwholestore=@{$supply->{wholesale}};
  my $offer=GetWholeStore();
  my ($shelf)=grep {$offer->{showcase}[$_]==13} 0..$offer->{showcasecount}-1;
  die 'P5 source book quote missing' unless defined($shelf)&&$offer->{price}[$shelf]==0;
  $DT->{item}[12]=1 if $case eq 'held';
  $DTwholestore[12]=0 if $case eq 'sold-out';
  CheckWholeStore();
  my $stockBefore=0+($DTwholestore[12]//0);
  die 'P5 whole cap drift' unless $stockBefore==(($case eq 'held'||$case eq 'sold-out')?0:1);
  my $moneyBefore=$DT->{money};my $timeBefore=$DT->{time};
  my $ownedBefore=$DT->{item}[12];
  my $quotedPrice=$case eq 'negative-price'?-1:$case eq 'stale-price'?1:0;
  my $quotedShelf=$shelf+($case eq 'stale-shelf'?1:0);
  my $requested=$case eq 'count-clamp'?99:$case eq 'zero-count'?0:$case eq 'negative-count'?-1:1;
  my $requestedItem=$case eq 'wrong-item'?10:13;
  $TIME_SEND_ITEM=1200;
  $P5_INIT->();
  $TIME_SEND_ITEM=int($TIME_SEND_ITEM/2);
  my $expectedTime=GetTimeDeal(0,13,1);
  my ($taxrate,$tax)=GetSaleTax(13,1,0,0);
  $TIME_SEND_ITEM=1200;$last_error='';
  $commits=$writes=$rendered=0;@R2B_DYNAMIC_TRACE=();@P5_LOGS=();
  %Q=(id=>0,it=>$requestedItem,sc=>$quotedShelf,pr=>$quotedPrice,num1=>$requested,num2=>0);
  delete $INC{File::Spec->catfile($dir,'funcbuy.cgi')};
  my $ok=do './buy-s.cgi';
  my $error=$@||($last_error?"GAME_ERROR:$last_error":'');
  die "P5 source buy did not finish [$case]: $error" if !$rendered&&!$last_error;
  my @slots=grep {defined($DTwholestore[$_])} 0..$#DTwholestore;
  no warnings 'uninitialized';
  push @cases,{
    case=>$case,itemId=>$requestedItem,requestedCount=>$requested,
    job=>$DT->{job},appraiser=>0+$DT->{item}[23],
    marketShelf=>$quotedShelf,sourceShelf=>$shelf,expectedPrice=>$quotedPrice,
    trueMarketPrice=>0,trueMarketTimeSeconds=>0+$expectedTime,
    taxRate=>0+$taxrate,tax=>0+$tax,actualTax=>$rendered?0+$item::BUY->{tax}:undef,
    accepted=>$rendered?JSON::PP::true:JSON::PP::false,
    purchasedCount=>0+$num,moneyBefore=>$moneyBefore,money=>0+$DT->{money},
    paytoday=>0+$DT->{paytoday},ownedBefore=>$ownedBefore,stock=>0+$DT->{item}[12],
    timeBefore=>$timeBefore,time=>0+$DT->{time},
    marketBefore=>$stockBefore,marketStock=>0+($DTwholestore[12]//0),
    giftStock=>0+$DT->{item}[78],wholesaleCsv=>join(',',@DTwholestore),
    sparseWrittenSlots=>\@slots,stages=>[@R2B_DYNAMIC_TRACE],
    logs=>[@P5_LOGS],commits=>0+$commits,writes=>0+$writes,
  };
}
print JSON::PP->new->canonical->encode({
  source=>'P5 frozen compiler, PLUS/CheckWholeStore, GetWholeStore, buy-s.cgi, GetTimeDeal/GetSaleTax, global FUNCBUY',
  cases=>\@cases,
});
