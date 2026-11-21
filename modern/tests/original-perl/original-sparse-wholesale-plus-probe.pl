use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use lib $FindBin::Bin;
use OriginalSparseWholesalePlusHarness;
binmode STDOUT,':encoding(UTF-8)';

my $first=OriginalSparseWholesalePlusHarness::run(
  timespanSeconds=>60,randomDraws=>[0],
);
my $second=OriginalSparseWholesalePlusHarness::run(
  wholesale=>$first->{wholesale},timespanSeconds=>60,randomDraws=>[0],
);
my $capped=OriginalSparseWholesalePlusHarness::run(
  wholesale=>$second->{wholesale},timespanSeconds=>600,randomDraws=>[0],
);
print JSON::PP->new->canonical->encode({
  first=>$first,second=>$second,capped=>$capped,
});
