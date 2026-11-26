use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use lib $FindBin::Bin;
use OriginalNormalCommerceItemHarness;

# Original numeric and flag/type compiler only. No world or player effects.
my $rows=OriginalNormalCommerceItemHarness::compiled_items();
binmode STDOUT, ':raw';
print JSON::PP->new->utf8->canonical->encode($rows);
