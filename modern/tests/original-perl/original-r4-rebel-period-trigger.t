use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use Test::More;
use JSON::PP qw(decode_json);
my $f=File::Spec->catfile($FindBin::Bin,
  'original-r4-rebel-period-trigger-probe.pl');
my $raw=qx{perl "$f"};
is($?,0,'frozen original period RebelRobin sub and extension branch execute');
my $data=eval{decode_json($raw)};
ok(!$@&&ref($data)eq'HASH','source period RebelRobin JSON');
if(ref($data)eq'HASH'){
  is(scalar(@{$data->{cases}}),7,'seven original period trigger and extension scenarios');
  my @r=@{$data->{cases}};
  is($r[0]{output}{drawsUsed},0,'unknown leader stops before any rand');
  is($r[1]{output}{activeUntilSeconds},1259200,
    'existing rebel three-day extension requires no rand');
  is($r[1]{output}{drawsUsed},0,'existing rebel extension draws no rand');
  is($r[2]{output}{drawsUsed},2,'calm city always consumes two rand');
  is(scalar(@{$r[3]{output}{logs}}),1,
    'uncertain city pushes one original restless message');
  is($r[4]{output}{town}{robinb},10000,
    'source rand(100) just less than 30 starts invasion with 10000 bandits');
  is($r[4]{output}{activeUntilSeconds},1259200,
    'successful uprising source expiration is NOW+3 days');
  ok(!exists $r[5]{output}{eventState}{rebel},
    'rand(100) exactly 30 defers uprising');
  is($r[6]{output}{activeUntilSeconds},1259200,
    'old-but-truthy active rebel extended during original period');
}
done_testing();
