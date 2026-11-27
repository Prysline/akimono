use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use lib $FindBin::Bin;
use OriginalNaturalSalePlusHarness;
use OriginalNormalCommerceItemHarness;
use Storable qw(dclone);

# Two executions of the exact frozen NATURAL loop on the SAME @ITEM array.
# The period/EVENT middle is excluded: this verifies transient demand,
# not the entire original settlement.
OriginalNaturalSalePlusHarness::bootstrap();
my $rows=OriginalNormalCommerceItemHarness::compiled_items();
my $natural=OriginalNaturalSalePlusHarness::natural_source();
eval "package main; use utf8; no strict; no warnings; sub SameCommandNatural {my(\$timespan)=\@_;\n$natural\n1;}\n1;" or die $@;
my @cases=(
  {name=>'one',shown=>[40],prices=>[1200]},
  {name=>'duplicate',shown=>[40,40],prices=>[1200,1200]},
  {name=>'mixed',shown=>[40,10,40],prices=>[1200,5000,1200]},
);
my @results;
for my $case(@cases){
  @main::ITEM=(undef,map {+{%$_,no=>$_->{id}}} @$rows);
  $main::MAX_ITEM=79;$main::DTpeople=500000;$main::MAX_USER=50;
  $main::SALE_SPEED=12;$main::POP_DOWN_RATE=5;$main::DTTaxrate=0;
  %main::DTevent=();
  my @stock=(0)x79;$stock[39]=100;$stock[9]=100;
  my $shop={id=>1,status=>1,rank=>5010,money=>100000,
    item=>\@stock,showcasecount=>scalar(@{$case->{shown}}),
    showcase=>$case->{shown},price=>$case->{prices},trush=>0,saletoday=>0,
    taxtoday=>0,costtoday=>0,itemtoday=>{},itemyesterday=>{},taxmode=>0};
  @main::DT=($shop);
  my @slices;
  for my $i(0..2){
    # Third slice simulates a fresh CGI invocation with fresh @ITEM.
    if($i==2){@main::ITEM=(undef,map {+{%$_,no=>$_->{id}}} @$rows);}
    my $before=dclone($shop);
    my @draws=(500000)x121;
    @main::B35_DRAWS=@draws;$main::B35_USED=0;
    main::SameCommandNatural(1800);
    my $used=$main::B35_USED;
    my %base=map {$_=>0+$main::ITEM[$_]{buypeoplebase}} grep {$main::ITEM[$_]{buypeoplebase}} 1..79;
    push @slices,{input=>$before,output=>dclone($shop),demandBase=>\%base,
      draws=>[ @draws[0..$used-1] ],used=>$used};
  }
  push @results,{name=>$case->{name},slices=>\@slices};
}
binmode STDOUT,':raw';
print JSON::PP->new->utf8->canonical->encode(\@results);
