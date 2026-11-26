use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use lib $FindBin::Bin;
use OriginalNaturalSalePlusHarness;
use OriginalNormalCommerceItemHarness;
use Storable qw(dclone);

# Isolated frozen inc-turn NATURAL region, all source-listable items.
# No USE, FUNCTURN, EVENT, CAS, disk, or player acquisition claim.
OriginalNaturalSalePlusHarness::bootstrap();
my $rows=OriginalNormalCommerceItemHarness::compiled_items();
my $natural=OriginalNaturalSalePlusHarness::natural_source();
eval "package main; use utf8; no strict; no warnings; sub NormalCommerceNatural {my(\$timespan)=\@_;\n$natural\n1;}\n1;" or die $@;
my @cases=map { {name=>'item-'.$_->{id},shown=>[$_->{id}],prices=>[$_->{price}]} }
  grep {$_->{flag}!~/s/&&$_->{price}>0} @$rows;
push @cases,
  {name=>'zero-pop-and-sword',shown=>[65,40],prices=>[50000,1200]},
  {name=>'eight-mixed',shown=>[1,2,65,40,77,79,62,71],prices=>[50,100,50000,1200,200000,10000,100000,3000]};
my @results;
for my $case(@cases){
  @main::ITEM=(undef,map {+{%$_,no=>$_->{id}}} @$rows);
  $main::MAX_ITEM=79;$main::DTpeople=500000;$main::MAX_USER=50;
  $main::SALE_SPEED=12;$main::POP_DOWN_RATE=5;$main::DTTaxrate=0;
  %main::DTevent=();
  my @stock=(0)x79;
  for my $id(@{$case->{shown}}){$stock[$id-1]=1;}
  $stock[62]=1 if @{$case->{shown}}==1;
  my $shop={id=>1,status=>1,rank=>5010,money=>100000,
    item=>\@stock,showcasecount=>scalar(@{$case->{shown}}),
    showcase=>$case->{shown},price=>$case->{prices},trush=>0,saletoday=>0,
    taxtoday=>0,costtoday=>0,itemtoday=>{},itemyesterday=>{},taxmode=>0};
  my $before=dclone($shop);
  @main::DT=($shop);
  my @draws=(500000)x121;
  @main::B35_DRAWS=@draws;$main::B35_USED=0;
  main::NormalCommerceNatural(3600);
  my $used=$main::B35_USED;
  push @results,{name=>$case->{name},input=>$before,
    output=>$shop,draws=>[ @draws[0..$used-1] ],used=>$used};
}
binmode STDOUT,':raw';
print JSON::PP->new->utf8->canonical->encode(\@results);
