use strict;
use warnings;
use utf8;
use Test::More;
use FindBin;
use lib $FindBin::Bin;
use OriginalSparseWholesalePlusHarness;
binmode STDOUT,':encoding(UTF-8)';

my $fragment=OriginalSparseWholesalePlusHarness::source_fragment();
like($fragment,qr/foreach my \$cnt \(1\.\.\$MAX_ITEM\)/,
  'B-35 exact frozen original loop includes all ITEM slots');
like($fragment,qr/\$ITEM->\{plus\}>0 \? \$add : -\$add/,
  'B-35 original plus sign conditional preserved');
my $one=OriginalSparseWholesalePlusHarness::run(
  timespanSeconds=>60,randomDraws=>[0],
);
is($one->{item10Before},0,'B-35 original blank sparse market #10 numeric zero');
is($one->{item10After},1,'B-35 source adds 1 of actual ITEM #10 for 60 seconds');
is($one->{randomDrawsUsed},1,'B-35 original rand intercepted exactly once');
is_deeply($one->{definedIndices},[9,78],
  'B-35 source PLUS defines slot #10; cap defines gift #79 zero');
is($one->{wholesale}[78],0,'B-35 original zero wholesale limit gift cap');
is(scalar(@{$one->{wholesale}}),79,'B-35 source sparse array expands to slot 78');
is(scalar(split(/,/,$one->{wireCsv},-1)),79,
  'B-35 exact Perl join materializes 79 CSV fields');
my @one=split(/,/,$one->{wireCsv},-1);
is($one[9],'1','B-35 original CSV item10 is written at zero-based index9');
is($one[78],'0','B-35 original CSV gift 0 explicitly written');
is($one[0],'','B-35 original untouched slot #1 stays empty');
my $two=OriginalSparseWholesalePlusHarness::run(
  wholesale=>$one->{wholesale},timespanSeconds=>60,randomDraws=>[0],
);
is($two->{item10After},2,'B-35 second source loop preserves prior inventory');
is_deeply($two->{definedIndices},[9,78],
  'B-35 second source loop preserves sparse definedness');
my $cap=OriginalSparseWholesalePlusHarness::run(
  wholesale=>$two->{wholesale},timespanSeconds=>600,randomDraws=>[0],
);
is($cap->{item10After},10,
  'B-35 source CheckWholeStore caps item10 at ten for one shop');
is($cap->{randomDrawsUsed},1,'B-35 large span still consumes one draw');
is_deeply($cap->{definedIndices},[9,78],
  'B-35 cap does not fill earlier undefined slots');
done_testing();
