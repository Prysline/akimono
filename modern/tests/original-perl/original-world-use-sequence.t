use strict;
use warnings;
use utf8;
use Test::More;
use FindBin;
use lib $FindBin::Bin;
use OriginalFullUseLostbookHarness;
binmode STDOUT, ':encoding(UTF-8)';

# B-32: execute *actual pinned original Perl* UseItem + MakeAmount +
# time/wholesale + original nested lostbook twice, carrying all synthetic
# money/time/stock/wholesale/exp state. Item A/B/C remain artificially
# named B-30 harness slots, NOT the original 79 Standard Street products.
sub transition {
  my($previous,$options)=@_;
  my %snapshot=(
    stocks=>$previous->{stock},
    otherShopStock=>$previous->{otherShopStock},
    wholesale=>$previous->{wholesale},
    money=>$previous->{money},
    paytoday=>$previous->{paytoday},
    storedTimeSeconds=>$previous->{time},
    exp=>$previous->{exp},
    status=>1,nowSeconds=>1000,
  );
  return OriginalFullUseLostbookHarness::run(%snapshot,%$options);
}
my $first=OriginalFullUseLostbookHarness::run(
  requestedCount=>1,param1=>1000,seed=>12,
);
ok(defined $first,'B-32 original Perl first source transaction executes');
is($first->{result}{count},1,
  'B-32 original first use performs one operation');
is_deeply($first->{trace},['use-time','wholesale','require-common','lostbook'],
  'B-32 original first callback is after wholesale');
is_deeply($first->{stock},[9,6,5],
  'B-32 original first call stores material, production and nested use stock');
is($first->{money},50,'B-32 original first call retains money 70 minus 20');
is($first->{paytoday},25,'B-32 original first call retains original paytoday');
is($first->{time},968,'B-32 original first UseTime increments 18');
is($first->{exp},230,'B-32 original first experience award 30');
is($first->{expAtCallback},200,
  'B-32 original callback still sees PRE-award experience');
is($first->{stockAtCallback},10,
  'B-32 original callback sees post-market stock of ten');
is_deeply($first->{result}{useitem},[[1,2],[1,1]],
  'B-32 original first use appends nested one after material two');
is_deeply($first->{result}{usemsg},
  ['consume A','A已經破爛到看不懂，就扔掉了。'],
  'B-32 original consumed messages remain in original order');

my $second=transition($first,{requestedCount=>1,param1=>1000,seed=>14});
ok(defined $second,'B-32 original second source transaction executes');
is($second->{result}{count},1,
  'B-32 original second use STILL permits one operation in remaining time');
is_deeply($second->{trace},['use-time','wholesale','require-common','lostbook'],
  'B-32 original second callback order remains unmodified');
is_deeply($second->{stock},[9,6,5],
  'B-32 source second use carries stock, not reset to initial eight');
is_deeply($second->{otherShopStock},[3,4,2],
  'B-32 source second use keeps other synthetic shop unchanged');
is($second->{money},30,
  'B-32 source second use charges from first remaining money');
is($second->{paytoday},45,
  'B-32 source second use accumulates paytoday without reset');
is($second->{time},986,
  'B-32 source second UseTime consumes another 18 from first timestamp');
is($second->{exp},260,
  'B-32 source second experience uses first accumulated 230');
is($second->{expAtCallback},230,
  'B-32 source second callback observes previously committed 230');
is($second->{stockAtCallback},10,
  'B-32 source second callback sees stock before nested helper deduction');
is_deeply($second->{result}{useitem},[[1,2],[1,1]],
  'B-32 second source result is for second transaction (not stale results)');
is_deeply($second->{wholesaleAtCallback},$second->{wholesale},
  'B-32 original callback sees wholesale after second market pass');
is_deeply($second->{wholesale},[3,0,-3],
  'B-32 original wholesale C remains -3 after second source MakeAmount is capped at current item limit');
ok($second->{originalPerlDraw}>=0 && $second->{originalPerlDraw}<1000,
  'B-32 second random value came from Perl rand, not JS equivalent');

my $skip=OriginalFullUseLostbookHarness::run(
  requestedCount=>1,param1=>0,seed=>12,
);
is_deeply($skip->{stock},[10,6,5],
  'B-32 source first skipped callback does not consume nested item');
is_deeply($skip->{result}{useitem},[[1,2]],
  'B-32 source skipped callback does not add another consumed row');
my $then=transition($skip,{requestedCount=>1,param1=>1000,seed=>14});
is($then->{result}{count},1,
  'B-32 source second transaction after skipped callback performs once');
is($then->{money},30,'B-32 skipped callback still pays both operations');
is($then->{time},986,'B-32 skipped callback still uses time twice');
is($then->{exp},260,'B-32 skipped callback still awards exp twice');
is_deeply($then->{result}{useitem},[[1,2],[1,1]],
  'B-32 source callback on second operation appends item deduction');

my $blocked=OriginalFullUseLostbookHarness::run(
  requestedCount=>0,param1=>1000,seed=>12,
);
is($blocked->{result}{count},0,
  'B-32 original zero-count return is zero and not success');
is_deeply($blocked->{trace},[],
  'B-32 original zero-count does not run time/market/callback');
is_deeply($blocked->{stock},[8,4,3],
  'B-32 original zero-count leaves inventory as it was');
is($blocked->{money},70,
  'B-32 original zero-count does not charge cash');
is($blocked->{time},950,
  'B-32 original zero-count does not consume time');
is($blocked->{exp},200,
  'B-32 original zero-count does not award experience');

done_testing();
