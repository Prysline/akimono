use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use Test::More;
use JSON::PP qw(decode_json);
my $probe=File::Spec->catfile($FindBin::Bin,'original-b58-loto-event-probe.pl');
my $raw=qx{perl "$probe"};
is($?,0,'B-58 executes the actual unmodified original Perl loto STARTFUNC');
my $v=eval{decode_json($raw)};
ok(!$@&&ref($v)eq'HASH','real lotto source callback probe JSON decoded');
if(ref($v)eq'HASH'){
  is($v->{originalRange},6096454,'source rand(6096454) range');
  is($v->{maxMoney},999999999,'source MaxMoney cap from compiler');
  is(scalar(@{$v->{cases}}),15,'source cases cover no tickets, five prizes, thresholds, multi-ticket');
  my %rows=map {$_->{name}=>$_} @{$v->{cases}};
  is($rows{'zero-tickets-opening-only'}{output}{randomDrawsUsed},0,
    'no tickets require no raffle draws');
  is(scalar(@{$rows{'zero-tickets-opening-only'}{output}{logs}}),1,
    'source writes lottery opening log even with no tickets');
  is($rows{'miss'}{output}{money},100000,'losing ticket produces no prize');
  is($rows{'miss'}{output}{item}[10],0,'losing tickets still consumed');
  is($rows{'fifth'}{output}{money},110000,'source fifth prize is 10000');
  is($rows{'fifth-boundary'}{output}{money},100000,
    'source fifth rank strict rnd<152411');
  is($rows{'fourth'}{output}{money},200000,'source fourth prize 100000');
  is($rows{'fourth-boundary'}{output}{money},110000,
    'at rnd=10000 source falls to fifth prize');
  is($rows{'third'}{output}{money},5100000,'source third prize 5000000');
  is($rows{'third-boundary'}{output}{money},200000,
    'at rnd=216 source falls to fourth prize');
  is($rows{'second'}{output}{money},150100000,
    'source second prize 150000000');
  is($rows{'second-boundary'}{output}{money},5100000,
    'at rnd=6 source falls to third prize');
  is($rows{'first'}{output}{money},999999999,
    'source 1000000000 first prize capped to source 999999999');
  is($rows{'first-boundary'}{output}{money},150100000,
    'at rnd=1 source falls to second prize');
  is($rows{'mixed-three'}{output}{money},210000,
    'source three tickets: one miss, fifth plus fourth');
  is($rows{'all-five-prizes'}{output}{money},999999999,
    'source multiple tier wins still limited by total maximum');
  is(scalar(@{$rows{'all-five-prizes'}{output}{logs}}),7,
    'opening event plus one WriteLog for each of six wins');
  is($rows{'money-cap'}{output}{money},999999999,
    'source small prize caps when money already near maximum');
  for my $r(@{$v->{cases}}){
    is($r->{output}{returnCode},0,$r->{name}.' never persists active event');
    is($r->{output}{randomDrawsUsed},scalar(@{$r->{input}{randomDraws}}),
      $r->{name}.' exactly one original rand(6096454) per owned ticket');
    is($r->{output}{item}[10],0,
      $r->{name}.' source callback burns full ticket stack');
    is($r->{output}{logs}[0]{level},2,
      $r->{name}.' global draw opening log source category 2');
  }
}
done_testing();
