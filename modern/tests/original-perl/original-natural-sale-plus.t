use strict;
use warnings;
use utf8;
use Test::More;
use FindBin;
use lib $FindBin::Bin;
use OriginalNaturalSalePlusHarness;
binmode STDOUT,':encoding(UTF-8)';

my $source=OriginalNaturalSalePlusHarness::natural_source();
like($source,qr/GetMarketStatus\(\)/,'B-38 actual natural sales calls original market status');
like($source,qr/if\(\$buypeople>0\)/,'B-38 actual natural region uses buyer randomness');
like($source,qr/GetSaleTax\(/,'B-38 sales use real GetSaleTax with source user tax rate');
like($source,qr/\$DT->\{itemtoday\}\{\$itemno\}\+=\$sale/,
  'B-38 original itemtoday accounting is retained');
unlike($source,qr/SortDT\(\)/,'B-38 region excludes unexecuted SortDT');
my @zeros=(0)x118;
my $sale=OriginalNaturalSalePlusHarness::run(
  display=>1,randomDraws=>[500000,0,0,@zeros]);
is($sale->{display},1,'B-38 artificial #10 showcased in original source');
is($sale->{saleCount},1,'B-38 actual original source sells one #10');
is($sale->{item10},0,'B-38 source holds no #10 after sale');
is($sale->{money},105000,'B-38 source sale revenue added to cash');
is($sale->{saletoday},5000,'B-38 original daily sale accounting');
is($sale->{taxtoday},0,'B-38 original zero user tax and base-price sale');
is($sale->{trush},5001,'B-38 original sale waste + source daily holding cost');
is($sale->{costtoday},1,'B-38 original daily upkeep accrues one');
is($sale->{temprank},6010,'B-38 real one-category showcase gets specialist bonus');
is($sale->{saleCountRecord},1,'B-38 source records item sale callback count');
is($sale->{salePriceRecord},5000,'B-38 source records callback sale gross');
is($sale->{numericWholesale}[9],10,'B-38 original all PLUS caps #10 at10');
is(scalar(@{$sale->{definedIndices}}),60,
  'B-38 all real original 59 PLUS plus capped gift creates 60 sparse slots');
is(scalar(@{$sale->{plusSeconds}}),79,'B-38 original all-item compiler preserved');
cmp_ok($sale->{randomDrawsUsed},'>=',62,
  'B-38 actual source natural 3 draws precede at least59 PLUS draws');
is(scalar(@{$sale->{consumedSamples}}),$sale->{randomDrawsUsed},
  'B-38 records exact source consumed sample prefix');
my $idle=OriginalNaturalSalePlusHarness::run(
  display=>0,randomDraws=>\@zeros);
is($idle->{saleCount},0,'B-38 real new shop without showcase has zero sales');
is($idle->{money},100000,'B-38 real new shop no sale money remains');
is($idle->{saletoday},0,'B-38 real initial empty display has no sales');
is($idle->{trush},1,'B-38 original shop gift holding cost still accrues');
is($idle->{costtoday},1,'B-38 original gift upkeep accrues one');
is($idle->{temprank},5010,'B-38 no specialist boost when showcase empty');
is_deeply($idle->{definedIndices},$sale->{definedIndices},
  'B-38 natural region does not alter original PLUS definedness in this fixture');
done_testing();
