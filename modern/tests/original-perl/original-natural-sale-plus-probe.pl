use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use lib $FindBin::Bin;
use OriginalNaturalSalePlusHarness;
binmode STDOUT,':encoding(UTF-8)';
my @plus=(0)x118;
my $sale=OriginalNaturalSalePlusHarness::run(
  display=>1,randomDraws=>[500000,0,0,@plus]);
my $idle=OriginalNaturalSalePlusHarness::run(
  display=>0,randomDraws=>\@plus);
print JSON::PP->new->canonical->encode({
  sourceSale=>$sale,sourceIdle=>$idle,
});
