use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use Test::More;
use JSON::PP qw(decode_json);
my $file=File::Spec->catfile($FindBin::Bin,'original-r4-rebel-period-now-probe.pl');
my $raw=qx{perl "$file"};
is($?,0,'original RebelRobin period, actual EVENT turn and exact NOWFUNC run in one Perl slice');
my $data=eval{decode_json($raw)};
ok(!$@&&ref($data)eq'HASH','combined real source city/army/rng oracle');
if(ref($data)eq'HASH'){
  is(scalar(@{$data->{cases}}),8,'eight period->EVENT NOW source scenarios');
  my @cases=@{$data->{cases}};
  is_deeply($cases[0]{output}{randomDrawRanges},[100000],
    'no recognized leader still consumes zero-start EVENT gate rand');
  is_deeply($cases[1]{output}{randomDrawRanges},
    [2500,5000000,100000],
    'calm town period consumes two RNG then unpersisted EVENT gate');
  is_deeply($cases[3]{output}{randomDrawRanges},
    [2500,5000000,100,100,5],
    'new uprising skips active START gate but NOW consumes two rebel RNG draws');
  is($cases[3]{output}{town}{robinb},8800,
    'same period newly started rebel advances one original time slice');
  is($cases[4]{output}{town}{robinb},9400,
    'reinforcement on first source NOWFUNC rand(100)>75');
  is_deeply($cases[5]{output}{randomDrawRanges},
    [2500,5000000,100,100000],
    'deferred uprising still consumes original zero-prob START gate');
  is($cases[6]{output}{readArmyCalls},1,
    'period extension followed by real NOWFUNC source uses army IO once');
  ok(!$cases[6]{output}{eventPersisted},
    'period extension can be suppressed by same slice NOWFUNC');
  is_deeply($cases[7]{output}{randomDrawRanges},[5],
    'prior active with shop rioter skips START and uses NOWFUNC rand(5)');
}
done_testing();
