use strict;
use warnings;
use utf8;
use Test::More;
use FindBin;
use lib $FindBin::Bin;
use OriginalAdminBootstrapHarness;
use OriginalGiftMapUseHarness;
binmode STDOUT,':encoding(UTF-8)';

# B-34 source-executed ORIGINAL inc-admin-func.cgi::init print statement
# goes ONLY to Perl scalar filehandle. Never executes init top-level,
# mkdir, unlink, real world I/O, CGI, locking or real user data.
my $bootstrap=OriginalAdminBootstrapHarness::run();
ok(defined $bootstrap,'B-34 original source init print statement executed in memory');
like($bootstrap->{initTime},qr/^\d+$/,
  'B-34 actual original time() at init is numeric');
is($bootstrap->{initialMetadata},
  '500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0',
  'B-34 original init world metadata literal preserved');
is($bootstrap->{wholesaleCsv},'','B-34 original init third WHOLE line is blank');
is($bootstrap->{eventCsv},'','B-34 original init event line is blank');
is($bootstrap->{shopDelimiter},'//','B-34 original init last shop delimiter');
is($bootstrap->{trailingLine},'','B-34 original init ends in final newline');
is($bootstrap->{wholeSlots},0,
  'B-34 Perl split on original blank wholesale leaves genuinely zero slots');
my @lines=split(/\n/,$bootstrap->{originalWorldText},-1);
is(scalar(@lines),6,'B-34 original init exact six LF-split lines');
is($lines[2],'','B-34 real source byte third line empty not a CSV of 79 zeros');
is($lines[3],'','B-34 original event fourth line blank');
is($lines[4],'//','B-34 original fifth line is slash slash');
is($lines[5],'','B-34 original init string ends after newline');
ok($bootstrap->{originalWorldText}=~/^\d+\n500000,100,,0,/,
  'B-34 genuine source print DATA preserved time and meta order');

my $one=OriginalGiftMapUseHarness::run(sourceBlankWholesale=>1);
is($one->{result}{count},1,'B-34 true gift #79 USE from original sparse whole stock executes');
is($one->{stock}[78],3,'B-34 gift inventory is 5 to 3');
is_deeply([@{$one->{stock}}[8,11,13]],[1,1,1],
  'B-34 original map stock increments one each');
is($one->{wholesaleSlots},79,
  'B-34 original CheckWholeStore assignment to slot79 extends initially empty array');
is_deeply($one->{wholesaleDefinedSlots},[78],
  'B-34 only slot #79 is assigned; 78 prior positions remain undef');
is($one->{wholesaleCsv},','x78.'0',
  'B-34 actual original writer join semantics 78 commas then one zero');
is(scalar(split(/,/,$one->{wholesaleCsv},-1)),79,
  'B-34 sparse after source transaction writes 79 delimitable columns');
is_deeply([@{$one->{wholesaleNumeric79}}[8,11,13,78]],[0,0,0,0],
  'B-34 numeric projection of undefined Perl slots is zero, not wire value');
is_deeply($one->{trace},['use-time','wholesale','require-common'],
  'B-34 original full UseItem source time/whole/require order unchanged');
is($one->{money},100000,'B-34 original gift exchange has zero money cost');
is($one->{time},958600,'B-34 original compiler time 1800 spent once');

my $two=OriginalGiftMapUseHarness::run(
  stock=>$one->{stock},wholesale=>$one->{wholesale},
  money=>$one->{money},paytoday=>$one->{paytoday},time=>$one->{time},
);
is($two->{result}{count},1,'B-34 second true Perl transaction with sparse prior whole array');
is($two->{stock}[78],1,'B-34 second original trade retains one gift');
is_deeply([@{$two->{stock}}[8,11,13]],[2,2,2],
  'B-34 second original trade produces second set of maps');
is($two->{wholesaleCsv},$one->{wholesaleCsv},
  'B-34 sparse source join CSV preserved when no new wholesale assignments');
is_deeply($two->{wholesaleDefinedSlots},[78],
  'B-34 second transaction leaves only source slot #79 defined');
is($two->{time},960400,'B-34 source time accumulated 1800 per trade');

my $third=OriginalGiftMapUseHarness::run(
  stock=>$two->{stock},wholesale=>$two->{wholesale},
  money=>$two->{money},paytoday=>$two->{paytoday},time=>$two->{time},
);
is($third->{result}{count},0,
  'B-34 third original use fails because only one gift voucher remains');
is_deeply($third->{trace},[],
  'B-34 source no-count branch never invokes wholesale');
is_deeply($third->{stock},$two->{stock},
  'B-34 source insufficient gift makes no stock changes');
is($third->{wholesaleCsv},$two->{wholesaleCsv},
  'B-34 source insufficient gift preserves original sparse wholesale CSV');
is($third->{time},$two->{time},
  'B-34 source no-count does not charge time');

my $fullStock=[(0)x78,5];$fullStock->[62]=1;
$fullStock->[8]=3;$fullStock->[11]=3;$fullStock->[13]=3;
my $full=OriginalGiftMapUseHarness::run(
  stock=>$fullStock,sourceBlankWholesale=>1,
);
is($full->{result}{count},1,'B-34 true source uses vouchers even if all maps at limit');
is_deeply($full->{result}{additem},[[12,0],[9,0],[14,0]],
  'B-34 source overflow records zero retained map output rows');
is_deeply($full->{wholesaleDefinedSlots},[8,11,13,78],
  'B-34 actual source assigns overflow map slots plus zero-limit gift slot');
is_deeply([@{$full->{wholesaleNumeric79}}[8,11,13,78]],[0,0,0,0],
  'B-34 original CheckWholeStore recaps all overflow/zero-limit stocks');
is($full->{wholesaleCsv},$one->{wholesaleCsv},
  'B-34 after whole-store numeric values zero produce same CSV while definedness differs');
ok(index($full->{scope},'no full compiler')>=0,
  'B-34 original source execution remains bounded and does not run full compiler');
done_testing();
