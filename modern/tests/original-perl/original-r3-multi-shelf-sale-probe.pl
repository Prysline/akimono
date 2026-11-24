use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use lib $FindBin::Bin;
use OriginalSparseAllPlusHarness;
use OriginalNaturalSalePlusHarness;

# Frozen inc-turn natural sale (two original shelves) + source 59 PLUS.
# Controlled source-only arithmetic oracle: NOT player inventory or CAS.
binmode STDOUT, ':encoding(UTF-8)';
OriginalNaturalSalePlusHarness::bootstrap();

my @cases=(
  {name=>'same-item-different-direct-prices',
   shown=>[40,40],prices=>[1200,1801],stocks=>{40=>10}},
  {name=>'two-swords-different-items',
   shown=>[40,41],prices=>[1200,1500],stocks=>{40=>10,41=>10}},
  {name=>'mixed-book-and-sword',
   shown=>[10,40],prices=>[5000,1200],stocks=>{10=>10,40=>10}},
  {name=>'first-shelf-empty',
   shown=>[0,40],prices=>[0,1200],stocks=>{40=>10}},
  {name=>'second-shelf-empty',
   shown=>[40,0],prices=>[1200,0],stocks=>{40=>10}},
  {name=>'same-item-one-stock',
   shown=>[40,40],prices=>[1200,1801],stocks=>{40=>1}},
  {name=>'two-empty-shelves',
   shown=>[0,0],prices=>[0,0],stocks=>{}},
  {name=>'reverse-shelf-order',
   shown=>[41,40],prices=>[2251,1200],stocks=>{40=>10,41=>10}},
);
my @rows;
for my $case (@cases){
  # Reset the compiled source ITEM/PLUS environment for each independent run.
  my @supply=(0)x118;
  OriginalSparseAllPlusHarness::run(
    timespanSeconds=>60,randomDraws=>\@supply);
  my $pluses=OriginalSparseAllPlusHarness::reviewed_seconds();
  for my $i(0..$#main::out_item){
    my $source=$main::out_item[$i];
    $main::ITEM[$source->{no}]={%$source,sort=>$i};
  }
  for my $id(1..79){$main::ITEM[$id]{plus}=$pluses->[$id-1];}
  for my $id(10,40,41){
    my $rule=OriginalNaturalSalePlusHarness::compiled_item($id);
    die "original source ITEM $id incomplete" unless
      $rule->{price}>0&&$rule->{popular}>0&&$rule->{point}>0;
    @{$main::ITEM[$id]}{qw(price popular point cost type)}=(
      $rule->{price},$rule->{popular},$rule->{point},
      $rule->{cost},$id==10?2:4);
  }
  my $voucher=OriginalNaturalSalePlusHarness::compiled_item(79);
  $main::ITEM[79]{cost}=$voucher->{cost};
  $main::ITEM[63]{cost}=0;
  $main::MAX_ITEM=79;$main::DTpeople=500000;$main::MAX_USER=50;
  $main::SALE_SPEED=12;$main::POP_DOWN_RATE=5;$main::DTTaxrate=0;
  %main::DTevent=();
  my @item=(0)x79;
  for my $id(keys %{$case->{stocks}}){
    $item[$id-1]=$case->{stocks}{$id};
  }
  $item[62]=0;$item[78]=5; # source #63 tool consumed by 2-shelf resize
  @main::DT=({
    id=>1,status=>1,rank=>5010,money=>80000,paytoday=>20000,
    item=>\@item,showcasecount=>2,
    showcase=>[@{$case->{shown}}],price=>[@{$case->{prices}}],
    trush=>0,saletoday=>0,taxtoday=>0,costtoday=>0,
    itemtoday=>{},itemyesterday=>{},taxmode=>0,
  });
  @main::DTwholestore=();
  my $span=1800;
  my @draws=(500000,0,750000,0,(0)x117);
  @main::B35_DRAWS=@draws;$main::B35_USED=0;
  main::B38SourceNaturalPlus($span);
  my ($shop,$used)=($main::DT[0],$main::B35_USED);
  push @rows,{
    name=>$case->{name},shown=>$case->{shown},prices=>$case->{prices},
    startingStocks=>$case->{stocks},
    soldByItem=>{map{$_=>0+($shop->{itemtoday}{$_}//0)}(10,40,41)},
    stockAfter=>{map{$_=>0+$shop->{item}[$_-1]}(10,40,41)},
    saleRecordCounts=>{map{$_=>0+($shop->{_sale_count_}{$_}{count}//0)}(10,40,41)},
    saleRecordGross=>{map{$_=>0+($shop->{_sale_count_}{$_}{price}//0)}(10,40,41)},
    money=>0+$shop->{money},rank=>0+$shop->{rank},
    temprank=>0+$shop->{temprank},trush=>0+$shop->{trush},
    saletoday=>0+$shop->{saletoday},taxtoday=>0+$shop->{taxtoday},
    costtoday=>0+$shop->{costtoday},
    drawsUsed=>$used,naturalDrawsUsed=>0+$main::B38_NATURAL_DRAWS_USED,
    consumedSamples=>[@draws[0..$used-1]],
  };
}
print JSON::PP->new->canonical->encode({
  scope=>'frozen source two-shelf natural sale plus all 59 PLUS; synthetic source audit fixture, no player authorization or EVENT/period',
  cases=>\@rows,
}),"\n";
