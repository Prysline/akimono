use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use lib $FindBin::Bin;
use OriginalSparseAllPlusHarness;
use OriginalNaturalSalePlusHarness;

# R3 bounded ORIGINAL Perl execution oracle, not a manufactured live-game
# acquisition. Original ITEM compiler, the actual inc-turn natural region,
# original market.cgi, and all original 59 PLUS + CheckWholeStore execute.
# Natural sample stream is explicitly fixed so Node can compare the same run.
binmode STDOUT, ':encoding(UTF-8)';
OriginalNaturalSalePlusHarness::bootstrap();

my @rows;
my @ids=(10,40,41,42,43,44);
my @cases=(
  {stock=>10,shown=>1,first=>500000,second=>0},
  {stock=>1,shown=>1,first=>999999,second=>0},
  {stock=>10,shown=>1,first=>0,second=>999999},
  {stock=>0,shown=>0,first=>500000,second=>0},
);

for my $id (@ids){
  for my $case (@cases){
    # Reset the full source wholesale environment for each independent
    # original sample, without using artificial in-world purchase receipts.
    my @supplyDraws=(0)x118;
    OriginalSparseAllPlusHarness::run(
      timespanSeconds=>60,randomDraws=>\@supplyDraws);
    my $pluses=OriginalSparseAllPlusHarness::reviewed_seconds();
    for my $i(0..$#main::out_item){
      my $e=$main::out_item[$i];
      $main::ITEM[$e->{no}]={%$e,sort=>$i};
    }
    for my $i(1..79){$main::ITEM[$i]{plus}=$pluses->[$i-1];}
    my $s=OriginalNaturalSalePlusHarness::compiled_item($id);
    my $gift=OriginalNaturalSalePlusHarness::compiled_item(79);
    die "R3 invalid source compiled ITEM #$id"
      unless $s->{price}>0&&$s->{popular}>0&&$s->{point}>0;
    @{$main::ITEM[$id]}{qw(price popular point cost type)}=(
      $s->{price},$s->{popular},$s->{point},$s->{cost},
      $id==10?10:4);
    $main::ITEM[79]{cost}=$gift->{cost};
    $main::ITEM[63]{cost}=0;
    $main::MAX_ITEM=79;$main::DTpeople=500000;$main::MAX_USER=50;
    $main::SALE_SPEED=12;$main::POP_DOWN_RATE=5;$main::DTTaxrate=0;
    %main::DTevent=();
    my @stock=(0)x79;
    $stock[$id-1]=$case->{stock};
    $stock[62]=1;$stock[78]=5;
    my $shown=$case->{shown};
    @main::DT=({
      id=>1,status=>1,rank=>5010,money=>100000,
      item=>\@stock,showcasecount=>1,
      showcase=>[$shown?$id:0],price=>[$shown?$s->{price}:0],
      trush=>0,saletoday=>0,taxtoday=>0,costtoday=>0,
      itemtoday=>{},itemyesterday=>{},taxmode=>0,
    });
    @main::DTwholestore=();
    my $span=1800;
    my @draws=(
      $case->{first},$case->{second},(0)x119,
    );
    @main::B35_DRAWS=@draws;$main::B35_USED=0;
    main::B38SourceNaturalPlus($span);
    my ($shop,$used)=($main::DT[0],$main::B35_USED);
    push @rows,{
      itemId=>$id,originalPrice=>0+$s->{price},
      originalPopular=>0+$s->{popular},
      originalPoint=>0+$s->{point},
      originalCost=>0+$s->{cost},
      originalStock=>$case->{stock},
      displayed=>$shown?JSON::PP::true:JSON::PP::false,
      saleCount=>0+($shop->{itemtoday}{$id}//0),
      stockAfter=>0+$shop->{item}[$id-1],
      money=>0+$shop->{money},rank=>0+$shop->{rank},
      trush=>0+$shop->{trush},saletoday=>0+$shop->{saletoday},
      costtoday=>0+$shop->{costtoday},
      taxtoday=>0+($shop->{taxtoday}//0),
      temprank=>0+$shop->{temprank},
      saleRecordCount=>0+($shop->{_sale_count_}{$id}{count}//0),
      randomDrawsUsed=>$used,
      consumedSamples=>[@draws[0..$used-1]],
    };
  }
}
print JSON::PP->new->canonical->utf8(0)->encode({
  scope=>'R3 24 original Perl natural region + 59 PLUS samples; synthetic inventory only for arithmetic differential, NOT game acquisition',
  cases=>\@rows,
}),"\n";
