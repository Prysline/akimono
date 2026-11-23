use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use Test::More;
use JSON::PP qw(decode_json);
my $probe=File::Spec->catfile($FindBin::Bin,'original-r4-rebel-now-probe.pl');
my $raw=qx{perl "$probe"};
is($?,0,'true frozen rebel NOWFUNC and original inc-turn EVENT region execute');
my $data=eval{decode_json($raw)};
ok(!$@&&ref($data)eq'HASH','original source rebel Perl JSON');
if(ref($data)eq'HASH'){
  is(scalar(@{$data->{cases}}),8,'eight source rebel branches including exact rand(100) boundary');
  my $supp=$data->{cases}[0]{output};
  ok(!$supp->{eventPersisted},'source suppression deletes event');
  is($supp->{logs}[0][2],'叛亂被護衛軍鎮壓了。',
    'actual original suppression message');
  is($supp->{drawsUsed},0,'no rebel RNG when no forces remain');
  is($data->{cases}[1]{output}{drawsUsed},2,
    'source reinforcement rand(100), then battle rand(5)');
  is($data->{cases}[2]{output}{armyById}{2},1800,
    'original RIOT army decreased by actual TIMESPAN/3');
  is($data->{cases}[3]{output}{town}{leader},2,
    'actual source shop riot winner becomes leader');
  is($data->{cases}[4]{output}{town}{leader},0,
    'actual source bandit conquest sets leader zero');
  is($data->{cases}[4]{output}{taxRate},0,
    'original bandit victory resets tax rate');
  is($data->{cases}[4]{output}{shops}[0]{money},1210,
    'source city money shared to each real shop reference');
  is($data->{cases}[5]{output}{town}{robinb},1300,
    'source Perl rand(100) exactly 75 does not reinforce bandits');
  is($data->{cases}[6]{output}{town}{robinb},1900,
    'source Perl rand(100) just above 75 reinforces bandits');
  is($data->{cases}[7]{output}{drawsUsed},2,
    'double-time source branch consumes original two draws');
}
done_testing();
