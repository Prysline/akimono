use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use lib $FindBin::Bin;
use OriginalSparseAllPlusHarness;
binmode STDOUT,':raw';
my @draws=(0)x118;
my @cases;
for my $dtPeople (250000,500000,750000) {
  my $case=OriginalSparseAllPlusHarness::run(
    dtPeople=>$dtPeople,timespanSeconds=>1800,randomDraws=>\@draws);
  push @cases,{
    dtPeople=>$dtPeople,
    wholesale=>$case->{numericWholesale},
    definedIndices=>$case->{definedIndices},
    wireCsv=>$case->{wireCsv},
    consumedSamples=>$case->{consumedSamples},
    drawsUsed=>$case->{drawsUsed},
  };
}
print JSON::PP->new->utf8->canonical->encode({
  oracle=>'frozen inc-turn PLUS and real CheckWholeStore with dynamic DTpeople',
  cases=>\@cases,
  limitation=>'isolated pure original PLUS, not a verified settled WorldState',
});
