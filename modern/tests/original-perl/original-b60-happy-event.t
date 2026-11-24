use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use Test::More;
use JSON::PP qw(decode_json);
my $fn=File::Spec->catfile($FindBin::Bin,'original-b60-happy-event-probe.pl');
my $raw=qx{perl "$fn"};
is($?,0,'B-60 executes frozen original Perl expiry/start + NOWFUNC from generated event-n file');
my $r=eval {decode_json($raw)};
ok(!$@&&ref($r)eq 'HASH','Perl happy source-probe JSON decoded');
if(ref($r)eq'HASH'){
  is($r->{declaredNowFunc},'_local_','source DSL local now callback');
  is($r->{runtimeCompiledNowFunc},'_local_now','source compiler renames NOWFUNC');
  is($r->{compiledStartProba},100,'festival source 10 percent compiled probability');
  is($r->{durationBaseSeconds},18000,'festival duration 5h base');
  is($r->{durationPlusSeconds},18000,'festival duration extra 5h');
  is(scalar(@{$r->{cases}}),9,'nine real Perl event NOWFUNC and expiry cases');
  my %c=map {$_->{name}=>$_->{output}} @{$r->{cases}};
  is($c{'fresh-start-nowfunc-same-turn'}{activeState}{happy},
    1023400,'source time+rand(span)+5h+rand(5h)');
  is($c{'fresh-start-nowfunc-same-turn'}{rankGain},45,
    'original NOWFUNC executes in the SAME source turn that starts festival');
  is_deeply($c{'fresh-start-nowfunc-same-turn'}{drawRanges},
    [100000,1800,18000,50],
    'gate, two duration samples and then NOWFUNC rand(int(span/36))');
  is_deeply($c{'fresh-start-nowfunc-same-turn'}{logs},
    [[2,0,'街上開始舉辦感謝祭了。']],
    'source startmsg emitted only once');
  is($c{'festival-already-active'}{rankGain},40,
    'active festival also executes NOWFUNC per subsequent segment');
  is_deeply($c{'festival-already-active'}{drawRanges},[50],
    'occupied festival suppresses start gate but still consumes NOWFUNC random');
  is($c{'equal-to-boundary-not-expired'}{rankGain},39,
    'strict equal expiry is active through segment endpoint and runs NOWFUNC');
  is($c{'equal-to-boundary-not-expired'}{activeState}{happy},
    1001800,'source equal expiry not erased');
  is($c{'expire-and-miss'}{rankGain},0,
    'expired source EVENT does not run NOWFUNC if restart gate fails');
  is(scalar(keys %{$c{'expire-and-miss'}{activeState}}),0,
    'expired festival removed');
  is_deeply($c{'expire-and-miss'}{logs},
    [[2,0,'感謝祭已經結束了。']],
    'source expiry endmsg after sale, before start gate');
  is($c{'expire-restart-nowfunc'}{activeState}{happy},1018000,
    'source can restart expired festival during same segment');
  is($c{'expire-restart-nowfunc'}{rankGain},45,
    'restarted festival has NOWFUNC immediately');
  is_deeply($c{'expire-restart-nowfunc'}{logs},[
    [2,0,'感謝祭已經結束了。'],
    [2,0,'街上開始舉辦感謝祭了。'],
  ],'source endmsg precedes renewed startmsg');
  is($c{'new-festival-gate-misses'}{drawsUsed},1,
    'unstarted festival consumes only source 100000 gate draw');
  is($c{'one-minute-festival-nowfunc'}{rankGain},0,
    '1min original floor(60/36)=1 gives zero rank');
  is_deeply($c{'one-minute-festival-nowfunc'}{drawRanges},[1],
    'source NOWFUNC uses computed rand(1)');
  is($c{'hour-festival-nowfunc'}{rankGain},99,
    'one-hour timespan uses original floor(3600/36)=100');
  is_deeply($c{'hour-festival-nowfunc'}{drawRanges},[100],
    'source NOWFUNC range 100 for one hour');
  is($c{'rank-cap-10000'}{rank},10000,
    'source shop rank clamps at 10000');
  for my $row(@{$r->{cases}}){
    is($row->{output}{drawsUsed},scalar(@{$row->{input}{randomDraws}}),
      $row->{name}.' used each exact supplied source random draw');
  }
}
done_testing();
