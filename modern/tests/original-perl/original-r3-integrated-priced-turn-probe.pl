use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use lib $FindBin::Bin;
use OriginalNayutaFuncturnHarness;
use OriginalNaturalSalePlusHarness;
use OriginalSparseAllPlusHarness;
# Executes real inc-turn natural-sales, original #70 FUNCTURN / FUNCSALE
# dispatch, then all 59 original PLUS and CheckWholeStore (not EVENT/period).
binmode STDOUT,':encoding(UTF-8)';
OriginalNayutaFuncturnHarness::bootstrap();
my @result;
for my $itemno (10,40,41,42,43,44){
 for my $percent (50,150){
  for my $span (60,1800){
   for my $i(0..$#main::out_item){
    my $item=$main::out_item[$i];
    $main::ITEM[$item->{no}]={%$item,sort=>$i};
   }
   OriginalNayutaFuncturnHarness::prepare_items();
   my $rule=OriginalNaturalSalePlusHarness::compiled_item($itemno);
   @{$main::ITEM[$itemno]}{qw(price popular point cost type)}=(
    $rule->{price},$rule->{popular},$rule->{point},$rule->{cost},
    $itemno==10?10:4);
   my $listed=int($rule->{price}*$percent/100);
   my @item=(0)x79;
   $item[$itemno-1]=10;$item[62]=1;$item[78]=5;
   @main::DT=({
    id=>1,status=>1,rank=>5010,money=>100000,
    item=>\@item,showcasecount=>1,
    showcase=>[$itemno],price=>[$listed],
    trush=>0,saletoday=>0,taxtoday=>0,costtoday=>0,
    itemtoday=>{},itemyesterday=>{},taxmode=>0,
   });
   @main::DTwholestore=();
   @main::B39_DEBUG_LOG=();
   my @draws=(500000,0,(0)x125);
   @main::B35_DRAWS=@draws;$main::B35_USED=0;
   main::B39SourceNaturalTurnPlus($span);
   my $shop=$main::DT[0],$used=$main::B35_USED;
   push @result,{
    itemId=>$itemno,percent=>$percent,span=>$span,
    basePrice=>0+$rule->{price},listedPrice=>$listed,
    sold=>0+($shop->{itemtoday}{$itemno}//0),
    shopStock=>0+$shop->{item}[$itemno-1],
    money=>0+$shop->{money},rank=>0+$shop->{rank},
    trush=>0+$shop->{trush},saletoday=>0+$shop->{saletoday},
    taxtoday=>0+$shop->{taxtoday},costtoday=>0+$shop->{costtoday},
    temprank=>0+$shop->{temprank},
    temporarySaleExists=>exists($shop->{_sale_count_})?
      JSON::PP::true:JSON::PP::false,
    callbackLog=>[@main::B39_DEBUG_LOG],
    wholesale=>[map {0+($_//0)} @main::DTwholestore],
    drawsUsed=>$used,draws=>[@draws[0..$used-1]],
   };
  }
 }
}
print JSON::PP->new->canonical->encode({
 scope=>'source natural + original ITEM #70 turn/sale dispatcher + 59 PLUS; 24 no-event, no-period original arithmetic test fixtures',
 cases=>\@result,
}),"\n";
