package OriginalNaturalSalePlusHarness;
use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use lib $FindBin::Bin;
use OriginalSparseAllPlusHarness;
use OriginalSparseWholesalePlusHarness;
use OriginalGiftMapUseHarness;

# B-38: ONLY the original inc-turn natural sales region (before callback,
# SortDT and period settlement), then the original complete PLUS fragment.
# For one shop selling one artificially acquired real #10 item, no ITEM
# callback executed. All random() calls are intercepted in source order by
# the frozen B-35 harness and the same global explicit draw queue.
our $READY;
sub natural_source {
  my $turn=OriginalGiftMapUseHarness::source('inc-turn.cgi');
  my $start=index($turn,"\t\t#店舗・商品別来客数計算処理");
  my $end=index($turn,"\t\t#@@item 処理準備",$start);
  die 'B-38 exact original sale region not found' unless $start>=0&&$end>$start;
  my $part=substr($turn,$start,$end-$start);
  for my $marker (
    'GetMarketStatus();',
    'if($buypeople>0)',
    '$sale=$buypeople/2*0+rand($buypeople * ($rank>1?1:$rank));',
    'my($taxrate,$tax)=GetSaleTax($itemno,$sale,$saleprice,GetUserTaxRate($DT,$DTTaxrate));',
    '$DT->{item}[$itemno-1]-=$sale;',
    '$DT->{costtoday}+=$costsum*$timespan/86400;',
  ){die 'B-38 pinned original natural sale drift' if index($part,$marker)<0;}
  return $part;
}
sub bootstrap {
  return if $READY;
  OriginalSparseWholesalePlusHarness::bootstrap();
  for my $filename ('market.cgi','item.cgi','core-detail.cgi'){
    my $path=File::Spec->catfile($FindBin::Bin,$filename);
    require $path; # pinned original subroutines; no top-level CGI.
  }
  my $part=natural_source();
  my $program="package main; no strict; no warnings; use utf8;\n".
    "sub B38SourceNaturalPlus { my (\$timespan)=\@_; \$TIMESPAN=\$timespan;\n".
    $part."\nB35SourceStep(\$timespan);\nreturn 1; }\n1;\n";
  my $ok=eval $program;
  die "B-38 original sales + PLUS did not compile: $@" unless $ok;
  $READY=1;
}
sub compiled_item {
  my($want)=@_;
  my($blocks)=OriginalGiftMapUseHarness::parse_dsl();
  for my $block (@$blocks){
    my($id)=map { /^\s*no\s+(\d+)/i ? $1 : () } @{$block->{lines}};
    next unless defined($id)&&$id==$want;
    main::ClearBuffer('item');
    for my $raw (@{$block->{lines}}){
      next unless $raw=~/^\s*(?:price|pop|cost|point)\s+/i;
      my $literal=OriginalGiftMapUseHarness::line_for_compiler($raw);
      main::GetBuffer('item',$literal);
    }
    return $main::g_item;
  }
  die 'B-38 source ITEM not found';
}
sub run {
  my (%o)=@_;
  bootstrap();
  my $plus=OriginalSparseAllPlusHarness::reviewed_seconds();
  for my $id(1..79){$main::ITEM[$id]{plus}=$plus->[$id-1];}
  my $book=compiled_item(10);
  my $gift=compiled_item(79);
  die 'B-38 source #10 price/pop/point/cost mismatch'
    unless $book->{price}==5000&&$book->{popular}==1728000&&
      $book->{point}==200000&&$book->{cost}==100;
  die 'B-38 source #79 upkeep mismatch' unless $gift->{cost}==10;
  @{$main::ITEM[10]}{qw(popular point cost type)}=(
    $book->{popular},$book->{point},$book->{cost},10);
  $main::ITEM[79]{cost}=$gift->{cost};
  $main::ITEM[63]{cost}=0;
  $main::MAX_ITEM=79;$main::DTpeople=500000;$main::MAX_USER=50;
  $main::SALE_SPEED=12;$main::POP_DOWN_RATE=5;$main::DTTaxrate=0;
  %main::DTevent=();
  my $display=exists($o{display})?$o{display}:1;
  die 'B-38 display must be boolean' unless $display==0||$display==1;
  my @inventory=(0)x79;
  $inventory[62]=1;$inventory[78]=5;$inventory[9]=$display?1:0;
  @main::DT=({
    id=>42,status=>1,showcasecount=>1,
    showcase=>[$display?10:0],price=>[$display?5000:0],
    item=>\@inventory,money=>100000,rank=>5010, trush=>0,
    saletoday=>0,taxtoday=>0,costtoday=>0,
    itemtoday=>{},itemyesterday=>{},taxmode=>0,
  });
  @main::DTwholestore=();
  my $timespan=1728; # 50 upkeep per day => integer 1 for source initial shop.
  my @samples=@{$o{randomDraws}//[(500000,0,0),((0)x118)]};
  die 'B-38 invalid random count' if @samples>121;
  for(@samples){die 'B-38 invalid sample millionth' unless /^\d+$/&&$_<1000000;}
  @main::B35_DRAWS=@samples;$main::B35_USED=0;
  main::B38SourceNaturalPlus($timespan);
  my $used=$main::B35_USED;
  my $shop=$main::DT[0];
  my @numbers=map {0+($_//0)} @main::DTwholestore;
  my @defined=grep {defined($main::DTwholestore[$_])} 0..$#main::DTwholestore;
  no warnings 'uninitialized';
  my $csv=join(',',@main::DTwholestore);
  my $sales=$shop->{itemtoday}{10}//0;
  return {
    display=>$display,saleCount=>0+$sales,
    money=>0+$shop->{money},trush=>0+$shop->{trush},
    saletoday=>0+$shop->{saletoday},taxtoday=>0+$shop->{taxtoday},
    costtoday=>0+$shop->{costtoday},rank=>0+$shop->{rank},
    item10=>0+$shop->{item}[9],temprank=>0+$shop->{temprank},
    saleCountRecord=>$shop->{_sale_count_}{10}{count}//0,
    salePriceRecord=>$shop->{_sale_count_}{10}{price}//0,
    plusSeconds=>$plus,numericWholesale=>\@numbers,
    definedIndices=>\@defined,originalWholesaleCsv=>$csv,
    randomDrawsUsed=>$used,consumedSamples=>[@samples[0..$used-1]],
    sourceScope=>'one source original natural sales region BEFORE unexecuted callbacks/SortDT/period, immediately followed by source original 59 PLUS+whole cap. Artificial item #10 in shop, explicit full random stream; no complete CGI',
  };
}
1;
