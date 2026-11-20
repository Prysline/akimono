use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use lib $FindBin::Bin;
use OriginalGiftMapUseHarness;
binmode STDOUT,':encoding(UTF-8)';

# Strict source-executed first gift USE (no callback) and real 79 ITEM limits.
# Explicit 79-slot market zero is an ARTIFICIAL fixture, not a default world.
my $initial=[(0)x78,5];
my @rows;
for my $case(
  ['one',1],
  ['two-at-once',2],
  ['three-requested',3],
  ['zero',0],
){
  my($name,$requested)=@$case;
  my $observed=OriginalGiftMapUseHarness::run(requestedCount=>$requested);
  push @rows,{case=>$name,requestedCount=>$requested,observed=>$observed};
}
my $first=OriginalGiftMapUseHarness::run(requestedCount=>1);
my $second=OriginalGiftMapUseHarness::run(
  requestedCount=>1,stock=>$first->{stock},
  wholesale=>$first->{wholesale},
  money=>$first->{money},paytoday=>$first->{paytoday},
  time=>$first->{time},
);
my $third=OriginalGiftMapUseHarness::run(
  requestedCount=>1,stock=>$second->{stock},
  wholesale=>$second->{wholesale},
  money=>$second->{money},paytoday=>$second->{paytoday},
  time=>$second->{time},
);
push @rows,{case=>'three-sequential',steps=>[$first,$second,$third]};
my $capped=[(0)x78,5];
$capped->[11]=3;$capped->[8]=3;$capped->[13]=3;
push @rows,{
  case=>'map-storage-full',
  requestedCount=>1,
  observed=>OriginalGiftMapUseHarness::run(
    requestedCount=>1,stock=>$capped,
  ),
  initialStock=>$capped,
};
print JSON::PP->new->canonical->encode(\@rows),"\n";
