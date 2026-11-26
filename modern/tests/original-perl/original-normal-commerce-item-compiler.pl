use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use lib $FindBin::Bin;
use OriginalGiftMapUseHarness;
use OriginalNaturalSalePlusHarness;

# Read-only execution of frozen GetBuffer ITEM numeric fields, not full CGI.
# No shop, assets, RNG, world, or save is created.
OriginalGiftMapUseHarness::compile();
my @rows;
for my $id (1..79) {
  my $r=OriginalNaturalSalePlusHarness::compiled_item($id);
  push @rows,{id=>$id,map {$_=>0+($r->{$_}//0)} qw(price popular point cost)};
}
binmode STDOUT, ':raw';
print JSON::PP->new->utf8->canonical->encode(\@rows);
