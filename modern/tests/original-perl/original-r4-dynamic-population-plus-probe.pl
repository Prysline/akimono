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
    dtPeople=>$dtPeople,timespanSeconds=>120,randomDraws=>\@draws);
  push @cases,{
    dtPeople=>$dtPeople,
    wholesale=>$case->{numericWholesale},
    definedIndices=>$case->{definedIndices},
    wireCsv=>$case->{wireCsv},
    consumedSamples=>$case->{consumedSamples},
    drawsUsed=>$case->{drawsUsed},
  };
}
# Pure source differential for the post-close empty street. Explicit 79
# cells exercise caps including the starter tool and a non-PLUS item.
my @emptyCases;
for my $dtPeople (250000,500000,750000){
  my @wholesale=(0)x79;
  $wholesale[62]=7;$wholesale[78]=999999;
  my @samples=map {($_*7919)%1000000} 1..118;
  my $case=OriginalSparseAllPlusHarness::run(
    emptyStreet=>1,dtPeople=>$dtPeople,timespanSeconds=>60,
    wholesale=>\@wholesale,randomDraws=>\@samples);
  push @emptyCases,{
    dtPeople=>$dtPeople,inputWholesale=>\@wholesale,
    wholesale=>$case->{numericWholesale},definedIndices=>$case->{definedIndices},
    wireCsv=>$case->{wireCsv},consumedSamples=>$case->{consumedSamples},
    drawsUsed=>$case->{drawsUsed},
  };
}
print JSON::PP->new->utf8->canonical->encode({
  oracle=>'frozen inc-turn PLUS and real CheckWholeStore with dynamic DTpeople',
  cases=>\@cases,emptyCases=>\@emptyCases,
  limitation=>'isolated pure original PLUS, not a verified settled WorldState',
});
