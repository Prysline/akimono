use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use File::Spec;
use lib $FindBin::Bin;
use OriginalGiftMapUseHarness;
binmode STDOUT,':encoding(UTF-8)';
our (@ITEM,@DTwholestore,$MAX_ITEM,$TIME_SEND_ITEM);
# Use the fixed, previously reviewed original compiler subroutines only:
# ClearBuffer/GetBuffer/GetNumber; DO NOT execute top-level Perl compiler,
# ITEM callbacks or any CGI I/O.
OriginalGiftMapUseHarness::bootstrap();
require './whole.cgi';
require './item.cgi';
$MAX_ITEM=79;$TIME_SEND_ITEM=600;
$main::g_define={scale=>'個',localfuncmark=>'_local_',function=>{}};
my $path=File::Spec->catfile($FindBin::Bin,'../../../custom/inc-item-data.cgi');
open my $fh,'<:encoding(UTF-8)',$path or die $!;
local $/;my $dsl=<$fh>;close $fh;
my @blocks=split /(?=^\@\@ITEM\b)/m,$dsl;
my @rows;
for my $id (1,14){
  my @match=grep {
    /^\@\@ITEM\b/m && /^\s*no\s+$id\b/m
  } @blocks;
  die "source ITEM $id ambiguous" unless @match==1;
  my $block=$match[0];
  my ($price)=$block=~/^\s*price\s+(\d+)\b/m;
  my ($base)=$block=~/^\s*base\s+(\d+\/\d+)\b/m;
  die "source BASE missing ITEM $id" unless $price>0&&$base;
  main::ClearBuffer('item');
  main::GetBuffer('item'," PRICE $price ");
  main::GetBuffer('item'," BASE $base ");
  my $compiled=$main::g_item;
  my ($baseAmount,$halfAmount)=split /\//,$base;
  die "frozen original compiler BASE drift" unless
    $compiled->{price}==$price &&
    $compiled->{pricebase}==$baseAmount &&
    $compiled->{pricehalf}==$halfAmount;
  @ITEM=();@DTwholestore=();
  $ITEM[$id]={%$compiled,sort=>0,no=>$id};
  my @quotes;
  for my $stock (1,2,3){
    $DTwholestore[$id-1]=$stock;
    my $market=GetWholeStore();
    die "original whole.cgi did not quote $id" unless
      $market->{showcasecount}==1 && $market->{showcase}[0]==$id;
    my $actualPrice=$market->{price}[0];
    my $actualTime=GetTimeDeal($actualPrice,$id,1);
    die "original BASE did not change dynamic price" if $actualPrice==$price;
    push @quotes,{stock=>$stock,price=>0+$actualPrice,
      timeSeconds=>0+$actualTime};
  }
  my $actualPrice=$quotes[0]{price};
  my $actualTime=$quotes[0]{timeSeconds};
  push @rows,{
    itemId=>$id,sourceBaseRaw=>$base,basePrice=>0+$price,
    compiledPricebase=>0+$compiled->{pricebase},
    compiledPricehalf=>0+$compiled->{pricehalf},
    stocked=>1,sourcePrice=>0+$actualPrice,
    sourceTimeSeconds=>0+$actualTime,quotes=>\@quotes,
  };
}
print JSON::PP->new->canonical->encode({
  source=>'fixed inc-makeitem.cgi GetBuffer(BASE) + whole.cgi GetWholeStore + item.cgi GetTimeDeal, original DSL',
  cases=>\@rows,
});
