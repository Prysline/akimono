use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use lib $FindBin::Bin;
use OriginalSparseAllPlusHarness;
use OriginalNaturalSalePlusHarness;

# Frozen inc-turn natural sale (2..8 original shelves) + source 59 PLUS.
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
  {name=>'three-shelves-shared-stock',
   shown=>[40,40,40],prices=>[1200,1501,1801],stocks=>{40=>10}},
  {name=>'four-shelves-mixed-duplicate',
   shown=>[10,40,40,41],prices=>[5000,1200,1801,2251],
   stocks=>{10=>10,40=>10,41=>10}},
  {name=>'four-shelves-empty-middle',
   shown=>[40,0,41,0],prices=>[1200,0,2251,0],
   stocks=>{40=>10,41=>10}},
  {name=>'five-shelves-shared-one-stock',
   shown=>[40,40,40,40,40],prices=>[1200,1501,1801,2000,2251],
   stocks=>{40=>1}},
  {name=>'six-shelves-sword-mix',
   shown=>[40,41,40,41,40,41],
   prices=>[1200,1500,1801,2251,2000,3000],
   stocks=>{40=>10,41=>10}},
  {name=>'seven-shelves-with-gaps',
   shown=>[0,40,41,0,40,0,41],
   prices=>[0,1200,1500,0,1801,0,2251],
   stocks=>{40=>10,41=>10}},
  {name=>'eight-shelves-shared-stock',
   shown=>[10,40,41,40,0,41,40,0],
   prices=>[5000,1200,1500,1801,0,2251,2000,0],
   stocks=>{10=>10,40=>10,41=>10}},
  {name=>'eight-shelves-all-empty',
   shown=>[(0)x8],prices=>[(0)x8],stocks=>{}},
);
# Additional deliberately discriminating source cases, separate from the
# historical 16-case acceptance set. The second unlike type stops the
# original demand-denominator scan, but does not stop sales.
if(@ARGV==1 && $ARGV[0] eq '--garbage-audit'){
  @cases=map {
    my $garbage=$_;
    ({name=>"garbage-$garbage-empty-shelves",shown=>[0,0],prices=>[0,0],stocks=>{},trush=>$garbage},
     {name=>"garbage-$garbage-active-sales",shown=>[40,41],prices=>[1200,1500],stocks=>{40=>10,41=>10},trush=>$garbage})
  } (0,300000,5000000,5000001,10000000);
} elsif(@ARGV){
  die 'expected --mixed-type-audit or --garbage-audit' unless @ARGV==1 && $ARGV[0] eq '--mixed-type-audit';
  @cases=(
    {name=>'mixed-type-break-positive-draw',shown=>[10,40],
     prices=>[5000,1200],stocks=>{10=>10,40=>10},
     draws=>[0,500000,0]},
    {name=>'mixed-type-break-even-when-unlike-shelf-empty',shown=>[10,41,40],
     prices=>[5000,1500,1200],stocks=>{10=>10,40=>10},
     draws=>[0,500000,0]},
    {name=>'mixed-type-break-does-not-resume-on-original-type',shown=>[40,10,40],
     prices=>[1200,5000,1200],stocks=>{10=>10,40=>10},
     draws=>[500000,0,0,500000,0]},
    {name=>'mixed-type-eight-shelves-after-break',shown=>[10,40,0,41,40,0,41,40],
     prices=>[5000,1200,0,1500,1200,0,1500,1200],stocks=>{10=>10,40=>10,41=>10},
     draws=>[0,500000,0,500000,0,500000,0]},
  );
}
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
  $item[62]=0;$item[78]=5; # source #63 tool consumed by 2..8-shelf resize
  @main::DT=({
    id=>1,status=>1,rank=>5010,
    money=>100000-10000*scalar(@{$case->{shown}}),
    paytoday=>10000*scalar(@{$case->{shown}}),
    item=>\@item,showcasecount=>scalar(@{$case->{shown}}),
    showcase=>[@{$case->{shown}}],price=>[@{$case->{prices}}],
    trush=>($case->{trush}//0),saletoday=>0,taxtoday=>0,costtoday=>0,
    itemtoday=>{},itemyesterday=>{},taxmode=>0,
  });
  @main::DTwholestore=();
  my $span=1800;
  my @prefix=exists $case->{draws}?@{$case->{draws}}:(500000,0,750000,0);
  my @draws=(@prefix,(0)x(121-@prefix));
  @main::B35_DRAWS=@draws;$main::B35_USED=0;
  main::B38SourceNaturalPlus($span);
  my ($shop,$used)=($main::DT[0],$main::B35_USED);
  push @rows,{
    name=>$case->{name},shown=>$case->{shown},prices=>$case->{prices},
    startingStocks=>$case->{stocks},startingGarbage=>($case->{trush}//0),
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
  scope=>'frozen source 2..8 shelf natural sale plus all 59 PLUS; synthetic source audit fixture, no player authorization or EVENT/period',
  cases=>\@rows,
}),"\n";
