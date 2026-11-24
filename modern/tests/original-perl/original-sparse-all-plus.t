use strict;
use warnings;
use utf8;
use Test::More;
use FindBin;
use lib $FindBin::Bin;
use OriginalSparseAllPlusHarness;
binmode STDOUT,':encoding(UTF-8)';

my $fragment=OriginalSparseWholesalePlusHarness::source_fragment();
like($fragment,qr/foreach my \$cnt \(1\.\.\$MAX_ITEM\)/,
  'B-37 exact original inc-turn loop scans all source ITEM IDs');
like($fragment,qr/\$DTwholestore\[\$cnt-1\]\+=/,
  'B-37 unchanged original PLUS writes sparse positions with +=');
my @zeros=(0)x114;
my @mixed=map {$_%3==1?900000:0} 0..117;
my $a=OriginalSparseAllPlusHarness::run(
  timespanSeconds=>60,randomDraws=>\@zeros);
is($a->{activeCount},59,'B-37 exactly 59 actual DSL PLUS declarations');
is($a->{absentCount},20,'B-37 20 original items lack PLUS and default to zero');
is(scalar(@{$a->{plusSeconds}}),79,'B-37 one original compiled PLUS per item');
is($a->{plusSeconds}[0],-1200,'B-37 original GetTime(-20m) negative #1');
is($a->{plusSeconds}[9],1200,'B-37 original GetTime(20m) positive #10');
is($a->{plusSeconds}[39],-3600,'B-37 original GetTime(-1h) #40');
is($a->{plusSeconds}[78],0,'B-37 no PLUS defined for #79 gift');
is($a->{numericWholesale}[0],0,'B-37 #1 negative source PLUS capped to zero');
is($a->{numericWholesale}[9],1,'B-37 first 60sec #10 PLUS supplies one');
is($a->{numericWholesale}[39],0,'B-37 #40 negative source PLUS capped zero');
is($a->{numericWholesale}[78],0,'B-37 existing gift with zero wholesale cap');
is(scalar(@{$a->{definedIndices}}),60,
  'B-37 every source PLUS assignment defines a slot, plus capped gift #79');
my %defined=map {$_=>1}@{$a->{definedIndices}};
ok($defined{0}&&$defined{9}&&$defined{39}&&$defined{78},
  'B-37 negative, positive and gift cap slots written');
ok(!$defined{17}&&!$defined{69},
  'B-37 items without PLUS and cap assignments stay undefined');
my @field=split(/,/,$a->{wireCsv},-1);
is(scalar(@field),79,'B-37 original Perl join writes 79 comma-separated cells');
is($field[17],'','B-37 absent PLUS position16 remains empty CSV');
is($field[9],'1','B-37 #10 has source stock in sparse CSV');
ok($a->{drawsUsed}>=59&&$a->{drawsUsed}<=118,
  'B-37 original random source consumes one or two per active item');
is(scalar(@{$a->{consumedSamples}}),$a->{drawsUsed},
  'B-37 source returns only actually consumed random samples');
my $b=OriginalSparseAllPlusHarness::run(
  wholesale=>$a->{wholesale},timespanSeconds=>600,
  randomDraws=>\@mixed);
is($b->{numericWholesale}[9],10,
  'B-37 second multi-item original PLUS respects #10 wholesale cap10');
is_deeply($b->{definedIndices},$a->{definedIndices},
  'B-37 consecutive full market maintains exactly same defined slots');
my $c=OriginalSparseAllPlusHarness::run(
  wholesale=>$b->{wholesale},timespanSeconds=>3600,
  randomDraws=>\@zeros);
is($c->{numericWholesale}[9],10,'B-37 third full loop also capped at ten');
is_deeply($c->{definedIndices},$a->{definedIndices},
  'B-37 three consecutive full loops preserve sparse source columns');
is($c->{plusSeconds}[8],3600,'B-37 map #9 PLUS 1h');
is($c->{plusSeconds}[61],432000,'B-37 item #62 PLUS 5d');
done_testing();
