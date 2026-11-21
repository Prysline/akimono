use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use lib $FindBin::Bin;
use OriginalSparseMultiPlusHarness;
binmode STDOUT,':encoding(UTF-8)';

my $first=OriginalSparseMultiPlusHarness::run(
  timespanSeconds=>60,randomDraws=>[0,0,0,0],
);
my $second=OriginalSparseMultiPlusHarness::run(
  wholesale=>$first->{wholesale},timespanSeconds=>60,
  randomDraws=>[0,900000,0,999999],
);
my $third=OriginalSparseMultiPlusHarness::run(
  wholesale=>$second->{wholesale},timespanSeconds=>600,
  randomDraws=>[0,0,0],
);
# Artificial starting quantities, NOT the real initial sparse world:
my @artificial=(undef)x79;$artificial[0]=20;$artificial[39]=10;
my $seeded=OriginalSparseMultiPlusHarness::run(
  wholesale=>\@artificial,timespanSeconds=>60,randomDraws=>[0,0,0,0],
);
print JSON::PP->new->canonical->encode({
  first=>$first,second=>$second,third=>$third,seeded=>$seeded,
});
