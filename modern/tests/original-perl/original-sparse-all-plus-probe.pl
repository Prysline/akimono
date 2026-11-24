use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use lib $FindBin::Bin;
use OriginalSparseAllPlusHarness;
binmode STDOUT,':encoding(UTF-8)';

my @zeros=(0)x118;
my @mixed=map {$_%3==1?900000:0} 0..117;
my $first=OriginalSparseAllPlusHarness::run(
  timespanSeconds=>60,randomDraws=>\@zeros);
my $second=OriginalSparseAllPlusHarness::run(
  wholesale=>$first->{wholesale},
  timespanSeconds=>600,randomDraws=>\@mixed);
my $third=OriginalSparseAllPlusHarness::run(
  wholesale=>$second->{wholesale},
  timespanSeconds=>3600,randomDraws=>\@zeros);
print JSON::PP->new->canonical->encode({
  first=>$first,second=>$second,third=>$third,
});
