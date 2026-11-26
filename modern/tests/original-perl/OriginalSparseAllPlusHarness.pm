package OriginalSparseAllPlusHarness;
use strict;
use warnings;
use utf8;
use FindBin;
use lib $FindBin::Bin;
use OriginalSparseWholesalePlusHarness;
use OriginalGiftMapUseHarness;

# B-37: extract all source ITEM PLUS directives and compile with the actual
# original GetTime function. Execute the unchanged inc-turn original PLUS
# fragment and the entire frozen whole.cgi::CheckWholeStore ONCE, no CGI.
sub reviewed_seconds {
  my ($items)=OriginalGiftMapUseHarness::parse_dsl();
  OriginalGiftMapUseHarness::compile();
  die 'B-37 original DSL needs 79 items' unless @$items==79;
  my @seconds=(0)x79;
  my %seen;
  my $active=0;
  for my $block (@$items){
    my ($id,@plus);
    for my $line (@{$block->{lines}}){
      $id=$1 if $line=~/^\s*no\s+(\d+)\b/i;
      push @plus,$1 if $line=~/^\s*plus\s+(\S+)/i;
    }
    die 'B-37 item id/PLUS duplicate or missing' if
      !defined($id)||$id<1||$id>79||$seen{$id}++||@plus>1;
    next unless @plus;
    die 'B-37 PLUS is not a simple original time literal'
      unless $plus[0]=~/^-?[1-9]\d*(?:m|h|d|k)$/;
    my $seconds=main::GetTime($plus[0]);
    die 'B-37 original GetTime noninteger or zero'
      unless $seconds&&$seconds==int($seconds);
    $seconds[$id-1]=0+$seconds;
    $active++;
  }
  die 'B-37 item id set not 1..79' unless keys(%seen)==79;
  die 'B-37 pinned 59 actual PLUS directives drift' unless $active==59;
  die 'B-37 actual #1/#10/#40 PLUS changed'
    unless $seconds[0]==-1200&&$seconds[9]==1200&&$seconds[39]==-3600;
  return \@seconds;
}
sub run {
  my (%o)=@_;
  OriginalSparseWholesalePlusHarness::bootstrap();
  my $seconds=reviewed_seconds();
  for my $id (1..79){$main::ITEM[$id]{plus}=$seconds->[$id-1];}
  $main::MAX_ITEM=79;$main::MAX_USER=50;
  $main::DTpeople=exists($o{dtPeople})?$o{dtPeople}:500000;
  die 'R4 original population must be positive source integer'
    unless $main::DTpeople=~/^\d+$/ && $main::DTpeople>=1
      && $main::DTpeople<=1000000000;
  if($o{emptyStreet}){
    @main::DT=();
  }else{
    @main::DT=({item=>[(0)x79]});
    $main::DT[0]{item}[62]=exists($o{starterToolOwned})?$o{starterToolOwned}:1; $main::DT[0]{item}[78]=5;
  }
  @main::DTwholestore=exists($o{wholesale})?@{$o{wholesale}}:();
  my $span=exists($o{timespanSeconds})?$o{timespanSeconds}:60;
  die 'B-37 bounded synthetic post-sale timespan'
    unless $span>=1&&$span<=3600;
  my @input=exists($o{randomDraws})?@{$o{randomDraws}}:((0)x114);
  die 'B-37 too many random samples' if @input>118;
  for(@input){die 'B-37 invalid millionth draw' unless /^\d+$/&&$_<1000000;}
  @main::B35_DRAWS=@input;
  $main::B35_USED=0;
  main::B35SourceStep($span);
  my $used=$main::B35_USED;
  my @whole=@main::DTwholestore;
  my @numbers=map {0+($_//0)} @whole;
  my @defined=grep {defined($main::DTwholestore[$_])} 0..$#main::DTwholestore;
  no warnings 'uninitialized';
  my $csv=join(',',@main::DTwholestore);
  return {
    plusSeconds=>$seconds,activeCount=>59,absentCount=>20,
    wholesale=>\@whole,numericWholesale=>\@numbers,
    definedIndices=>\@defined,wireCsv=>$csv,
    drawsUsed=>$used,consumedSamples=>[ @input[0..$used-1] ],
    sourceScope=>'59 actual DSL PLUS compiled by source GetTime; original inc-turn PLUS and original full CheckWholeStore; no full CGI, clock, sales, callbacks, persistence',
  };
}
1;
