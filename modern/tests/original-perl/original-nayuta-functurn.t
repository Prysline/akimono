use strict;
use warnings;
use utf8;
use Test::More;
use FindBin;
use lib $FindBin::Bin;
use OriginalNayutaFuncturnHarness;
binmode STDOUT,':encoding(UTF-8)';
my $body=OriginalNayutaFuncturnHarness::original_inline_body();
my $loop=OriginalNayutaFuncturnHarness::original_turn_loop();
like($body,qr/\$TIMESPAN\/86\.4/,'B-39 actual original #70 local FUNCT rate');
like($body,qr/\$DT->\{showcase\}\[0\]/,
  'B-39 actual callback only checks first showcase');
like($body,qr/\$DT->\{price\}\[0\]>\$ITEM->\{price\}/,
  'B-39 original equal standard price DOES qualify');
like($loop,qr/\@item::TURN_DT=grep/,
  'B-39 unchanged original callback selects stocked shops');
like($loop,qr/\&\$func\(\$item,\@item::TURN_DT\)/,
  'B-39 original FUNCTURN dispatcher executes callback');
my @zero=(0)x121;
my $shown=OriginalNayutaFuncturnHarness::run(
  display=>1,randomDraws=>\@zero);
is($shown->{sourceItem70Price},50000,'B-39 original compiler ITEM70 price');
is($shown->{sourceItem70Point},20000,'B-39 original compiler ITEM70 point');
is($shown->{saleCount},0,'B-39 deterministic unsold item #70 stock remains');
is($shown->{item70},1,'B-39 original callback sees item 70 in stock');
is($shown->{money},100000,'B-39 natural sale did not change money');
is($shown->{costtoday},7,'B-39 original stocked showcase daily upkeep7');
is($shown->{trush},7,'B-39 source upkeep trash7');
is($shown->{temprank},6010,'B-39 source one-item specialist boost');
is($shown->{rank},5107,'B-39 original popularity after callback +100');
is(scalar(@{$shown->{callbackLog}}),1,
  'B-39 original callback invoked with one matching displayed shop');
like($shown->{callbackLog}[0],qr/人気 \+1%/,
  'B-39 unmodified original DebugLog message composed');
is($shown->{numericWholesale}[69],0,
  'B-39 original no-PLUS source #70 cap is clamped to zero');
is(scalar(@{$shown->{definedIndices}}),61,
  'B-39 original 59 PLUS, gift cap and #70 inventory cap define 61 slots');
my $empty=OriginalNayutaFuncturnHarness::run(
  display=>0,randomDraws=>\@zero);
is($empty->{saleCount},0,'B-39 true empty showcase no natural sale');
is($empty->{rank},5007,'B-39 empty showcase rank after natural down');
is($empty->{costtoday},5,'B-39 real new shop gift upkeep5 at 8640s');
is($empty->{trush},5,'B-39 empty-showcase source waste5');
is(scalar(@{$empty->{callbackLog}}),0,
  'B-39 original callback sees no #70 stock and cannot change rank');
is(scalar(@{$empty->{definedIndices}}),60,
  'B-39 absent #70 leaves original sparse index69 undefined');
is($shown->{randomDrawsUsed},$empty->{randomDrawsUsed}+1,
  'B-39 displayed #70 natural sale consumes one source rand before PLUS');
is_deeply($shown->{plusSeconds},$empty->{plusSeconds},
  'B-39 original 79 source compilation stays unchanged');
my $yes=OriginalNayutaFuncturnHarness::callback_only(
  timespan=>60,randomDraws=>[0]);
is($yes->{rank},5011,'B-39 original sub-unit callback RNG0 adds one rank');
is($yes->{drawsUsed},1,'B-39 original <1 callback consumes one rand');
my $no=OriginalNayutaFuncturnHarness::callback_only(
  timespan=>60,randomDraws=>[999999]);
is($no->{rank},5010,'B-39 original sub-unit callback RNG999999 gives no rank');
is($no->{drawsUsed},1,'B-39 original negative RNG branch consumes one rand');
my $high=OriginalNayutaFuncturnHarness::callback_only(
  timespan=>8640,price=>50001);
is($high->{rank},5010,'B-39 too-expensive showcase not boosted');
my $cap=OriginalNayutaFuncturnHarness::callback_only(
  timespan=>8640,rank=>9980);
is($cap->{rank},10000,'B-39 actual callback popularity clamps at 10000');
done_testing();
