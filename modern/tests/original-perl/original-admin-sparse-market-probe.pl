use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use lib $FindBin::Bin;
use OriginalAdminBootstrapHarness;
use OriginalGiftMapUseHarness;
binmode STDOUT,':encoding(UTF-8)';

# True fixed original admin-init print statement into scalar filehandle,
# followed by exact frozen Core gift UseItem against a genuinely sparse
# zero-length wholesale array (NOT 79 prewritten zero cells).
my $bootstrap=OriginalAdminBootstrapHarness::run();
my $first=OriginalGiftMapUseHarness::run(sourceBlankWholesale=>1);
my $second=OriginalGiftMapUseHarness::run(
  stock=>$first->{stock},wholesale=>$first->{wholesale},
  money=>$first->{money},paytoday=>$first->{paytoday},
  time=>$first->{time},
);
my $third=OriginalGiftMapUseHarness::run(
  stock=>$second->{stock},wholesale=>$second->{wholesale},
  money=>$second->{money},paytoday=>$second->{paytoday},
  time=>$second->{time},
);
my $fullStock=[(0)x78,5];
$fullStock->[62]=1;
$fullStock->[8]=3;$fullStock->[11]=3;$fullStock->[13]=3;
my $full=OriginalGiftMapUseHarness::run(
  stock=>$fullStock,sourceBlankWholesale=>1,
);
print JSON::PP->new->canonical->encode({
  bootstrap=>$bootstrap,
  first=>$first,second=>$second,third=>$third,
  cappedInitialStock=>$fullStock,capped=>$full,
}),"\n";
