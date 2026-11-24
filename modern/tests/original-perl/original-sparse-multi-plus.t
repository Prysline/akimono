use strict;
use warnings;
use utf8;
use Test::More;
use FindBin;
use lib $FindBin::Bin;
use OriginalSparseMultiPlusHarness;
binmode STDOUT,':encoding(UTF-8)';

my $fragment=OriginalSparseWholesalePlusHarness::source_fragment();
like($fragment,qr/foreach my \$cnt \(1\.\.\$MAX_ITEM\)/,
  'B-36 actual source walks item IDs 1..79');
like($fragment,qr/\$ITEM->\{plus\}>0 \? \$add : -\$add/,
  'B-36 original sign drives the negative and positive PLUS');
like($fragment,qr/rand\(1\/\$add\)/,
  'B-36 fractional add condition consumes second rand');
my $first=OriginalSparseMultiPlusHarness::run(
  timespanSeconds=>60,randomDraws=>[0,0,0,0]);
is_deeply($first->{stocks},[0,1,0,0],'B-36 sparse source first three item update');
is($first->{randomDrawsUsed},4,'B-36 draws 1,1,2 for #1,#10,#40');
is_deeply($first->{definedIndices},[0,9,39,78],
  'B-36 three PLUS assignments and gift cap define only four cells');
is(scalar(@{$first->{wholesale}}),79,'B-36 original sparse array expanded');
my @csv=split(/,/,$first->{wireCsv},-1);
is(scalar(@csv),79,'B-36 original DataWrite join creates 79 CSV positions');
is($csv[0],'0','B-36 original negative stock 1 clamps zero');
is($csv[9],'1','B-36 original positive stock10 replenished');
is($csv[39],'0','B-36 original negative stock40 clamps zero');
is($csv[78],'0','B-36 original no-wholesale gift capped zero');
is($csv[1],'','B-36 undefined unrelated stock remains empty CSV cell');
my $second=OriginalSparseMultiPlusHarness::run(
  wholesale=>$first->{wholesale},timespanSeconds=>60,
  randomDraws=>[0,900000,0,999999]);
is_deeply($second->{stocks},[0,3,0,0],
  'B-36 second mixed samples add two #10 and skip fraction of #40');
is($second->{randomDrawsUsed},4,'B-36 second still consumes fractional draw');
is_deeply($second->{definedIndices},[0,9,39,78],
  'B-36 consecutive sparse definedness retained');
my $third=OriginalSparseMultiPlusHarness::run(
  wholesale=>$second->{wholesale},timespanSeconds=>600,
  randomDraws=>[0,0,0]);
is_deeply($third->{stocks},[0,10,0,0],
  'B-36 true source caps #10 at its one-shop wholesale limit 10');
is($third->{randomDrawsUsed},3,'B-36 third one random draw per active item');
is_deeply($third->{definedIndices},[0,9,39,78],
  'B-36 third cap does not populate every sparse zero');
my @synthetic=(undef)x79;$synthetic[0]=20;$synthetic[39]=10;
my $seeded=OriginalSparseMultiPlusHarness::run(
  wholesale=>\@synthetic,timespanSeconds=>60,randomDraws=>[0,0,0,0]);
is_deeply($seeded->{stocks},[19,1,9,0],
  'B-36 separately labeled artificial positive stock tests real minus PLUS');
is($seeded->{randomDrawsUsed},4,'B-36 pre-stock does not change RNG ordering');
done_testing();
