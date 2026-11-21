package OriginalSparseMultiPlusHarness;
use strict;
use warnings;
use utf8;
use FindBin;
use lib $FindBin::Bin;
use OriginalSparseWholesalePlusHarness;
use OriginalGiftMapUseHarness;
# Execute the EXACT B-35-extracted frozen inc-turn 1..79 PLUS loop and full
# original CheckWholeStore. Only three source-reviewed ITEM plus values active.
sub run {
  my (%o)=@_;
  OriginalSparseWholesalePlusHarness::bootstrap();
  OriginalGiftMapUseHarness::compile();
  my @rules=(
    [1,'yakusou','-20m',-1200,1000],
    [10,'book-make','20m',1200,10],
    [40,'ken-ki','-1h',-3600,600],
  );
  for my $rule (@rules){
    my ($id,$code,$raw,$expected,$cap)=@$rule;
    die 'B-36 pinned original item PLUS drift' unless
      main::GetTime($raw)==$expected &&
      $main::ITEM[$id]{code} eq $code &&
      $main::ITEM[$id]{wslimit}==$cap;
  }
  for my $i (1..79){$main::ITEM[$i]{plus}=0;}
  for my $rule (@rules){$main::ITEM[$rule->[0]]{plus}=$rule->[3];}
  $main::MAX_ITEM=79;$main::MAX_USER=50;$main::DTpeople=500000;
  @main::DT=({item=>[(0)x79]});
  $main::DT[0]{item}[62]=1;$main::DT[0]{item}[78]=5;
  @main::DTwholestore=exists $o{wholesale} ? @{$o{wholesale}} : ();
  my $span=exists $o{timespanSeconds} ? $o{timespanSeconds} : 60;
  die 'B-36 bounded timespan' if $span<1||$span>3600;
  @main::B35_DRAWS=@{$o{randomDraws}//[0,0,0,0]};
  for(@main::B35_DRAWS){
    die 'B-36 invalid millionth RNG draw' unless /^\d+$/&&$_<1000000;
  }
  $main::B35_USED=0;
  main::B35SourceStep($span);
  die 'B-36 unexpected unused draw' if @main::B35_DRAWS;
  my @whole=@main::DTwholestore;
  my @defined=grep {defined $main::DTwholestore[$_]} 0..$#main::DTwholestore;
  no warnings 'uninitialized';
  my $csv=join(',',@main::DTwholestore);
  return {
    stocks=>[map {0+($main::DTwholestore[$_-1]//0)} (1,10,40,79)],
    wholesale=>\@whole,definedIndices=>\@defined,
    wireCsv=>$csv,randomDrawsUsed=>$main::B35_USED,
    scope=>'three source ITEM PLUS only; original frozen loop + original cap, no full turn',
  };
}
1;
