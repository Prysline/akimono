use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use lib $FindBin::Bin;
use OriginalSparseAllPlusHarness;
use OriginalNaturalSalePlusHarness;
# Source executable oracle: original inc-turn natural-sale region + 59 PLUS.
# The isolated stock fixture only validates arithmetic, not acquisition.
binmode STDOUT,':encoding(UTF-8)';
OriginalNaturalSalePlusHarness::bootstrap();
my @cases;
for my $id (10,40,41,42,43,44){
 for my $per (50,100,150,200){
  OriginalSparseAllPlusHarness::run(timespanSeconds=>60,
    randomDraws=>[(0)x118]);
  my $pluses=OriginalSparseAllPlusHarness::reviewed_seconds();
  for my $i (0..$#main::out_item){
    my $e=$main::out_item[$i];
    $main::ITEM[$e->{no}]={%$e,sort=>$i};
  }
  for my $i (1..79){$main::ITEM[$i]{plus}=$pluses->[$i-1];}
  my $rule=OriginalNaturalSalePlusHarness::compiled_item($id);
  my $gift=OriginalNaturalSalePlusHarness::compiled_item(79);
  die 'R3 source ITEM price/pop/point not compilable'
    unless $rule->{price}>0&&$rule->{popular}>0&&$rule->{point}>0;
  @{$main::ITEM[$id]}{qw(price popular point cost type)}=(
    $rule->{price},$rule->{popular},$rule->{point},$rule->{cost},
    $id==10?10:4);
  $main::ITEM[79]{cost}=$gift->{cost};
  $main::ITEM[63]{cost}=0;
  $main::MAX_ITEM=79;$main::DTpeople=500000;$main::MAX_USER=50;
  $main::SALE_SPEED=12;$main::POP_DOWN_RATE=5;$main::DTTaxrate=0;
  %main::DTevent=();
  my $listed=int($rule->{price}*$per/100);
  my @item=(0)x79;
  $item[$id-1]=10;$item[62]=1;$item[78]=5;
  @main::DT=({
    id=>1,status=>1,rank=>5010,money=>100000,
    item=>\@item,showcasecount=>1,showcase=>[$id],
    price=>[$listed],trush=>0,saletoday=>0,
    taxtoday=>0,costtoday=>0,itemtoday=>{},itemyesterday=>{},taxmode=>0,
  });
  @main::DTwholestore=();
  my $span=1800;
  my @draws=(500000,0,(0)x119);
  @main::B35_DRAWS=@draws;$main::B35_USED=0;
  main::B38SourceNaturalPlus($span);
  my ($s,$used)=($main::DT[0],$main::B35_USED);
  push @cases,{
    itemId=>$id,percent=>$per,standardPrice=>0+$rule->{price},
    listedPrice=>$listed,initialStock=>10,
    sold=>0+($s->{itemtoday}{$id}//0),
    stockAfter=>0+$s->{item}[$id-1],
    money=>0+$s->{money},rank=>0+$s->{rank},
    trush=>0+$s->{trush},saletoday=>0+$s->{saletoday},
    taxtoday=>0+$s->{taxtoday},costtoday=>0+$s->{costtoday},
    temprank=>0+$s->{temprank},
    salePriceRecord=>0+($s->{_sale_count_}{$id}{price}//0),
    randomDrawsUsed=>$used,
    consumedSamples=>[@draws[0..$used-1]],
  };
 }
}
print JSON::PP->new->canonical->encode({
 scope=>'6 source ITEMs times 4 sourced percentages true original natural+PLUS',
 cases=>\@cases,
}),"\n";
