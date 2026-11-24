use strict;
use warnings;
use utf8;
use Test::More;
use JSON::PP qw(decode_json);
use FindBin;
use File::Spec;
my $probe=File::Spec->catfile($FindBin::Bin,'original-r4-time-slices-probe.pl');
my $json=qx{perl "$probe"};
is($?,0,'frozen inc-turn source segment executes successfully');
my $result=eval {decode_json($json)};
ok(!$@&&ref($result)eq'HASH','frozen original source JSON decoded');
if(ref($result)eq'HASH'){
  is(scalar @{$result->{cases}},9,'all nine source cases');
  my %cases=map {($_->{name},$_)} @{$result->{cases}};
  is_deeply($cases{'exact-boundary'}{rawSlices},
    [[1,60],[0,0]],'exact 36h boundary includes zero tail');
  is_deeply($cases{'two-boundaries'}{rawSlices},
    [[1,60],[1,129600],[0,60]],'original multi-boundary partition order');
  is_deeply($cases{'starts-at-boundary'}{rawSlices},
    [[0,60]],'no repeated settlement when starting at boundary');
  for my $row (@{$result->{cases}}){
    is($row->{lastTimeAfter},$row->{nowSeconds},
      "$row->{name}: original source updates DTlasttime");
    is($row->{nowAfter},$row->{nowSeconds},
      "$row->{name}: original source restores now frame");
  }
}
done_testing();
