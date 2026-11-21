use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use Test::More;
use JSON::PP qw(decode_json);
my $probe=File::Spec->catfile($FindBin::Bin,
  'original-b57-support-event-probe.pl');
my $raw=qx{perl "$probe"};
is($?,0,'B-57 executes actual original getmoney and getpop Perl STARTFUNC');
my $rows=eval{decode_json($raw)};
ok(!$@&&ref($rows)eq'HASH','B-57 Perl callback fixture JSON decoded');
if(ref($rows)eq'HASH'){
  is($rows->{maxMoney},999999999,'fixed DSL MaxMoney compiler cap');
  is(scalar(@{$rows->{cases}}),11,'eleven Perl source branch paths');
  my %cases=map {$_->{name}=>$_} @{$rows->{cases}};
  is($cases{'funding-hit'}{output}{money},200000,'real source funding adds 100000');
  is($cases{'funding-miss'}{output}{money},100000,'funding miss keeps cash');
  is($cases{'funding-threshold-inclusive'}{output}{money},200000,
    'rand(1000)==300 is source hit');
  is($cases{'funding-threshold-above'}{output}{money},100000,
    'rand(1000)>300 skips');
  is($cases{'funding-upper-cap'}{output}{money},999999999,
    'original funding capped by source MAX_MONEY');
  is($cases{'funding-already-capped'}{output}{money},999999999,
    'original funding already at cap stays bounded');
  is($cases{'pop-hit'}{output}{rank},6000,
    'real source popularity adds 1000');
  is($cases{'pop-miss'}{output}{rank},5000,
    'popularity miss preserves rank');
  is($cases{'pop-threshold-inclusive'}{output}{rank},6000,
    'popularity source threshold inclusive');
  is($cases{'pop-upper-cap'}{output}{rank},10000,
    'source popularity capped at 10000');
  is($cases{'pop-already-capped'}{output}{rank},10000,
    'already capped rank stays bounded');
  is($rows->{combined}{money},200000,
    'original Perl executes source funding in combined world');
  is($rows->{combined}{rank},6000,
    'original Perl executes source popularity after funding');
  is($rows->{combined}{randomDrawsUsed},2,
    'combined source callbacks consume precisely two rand(1000)');
  is(scalar(@{$rows->{combined}{messages}}),2,
    'both real source callbacks produce distinct success messages');
  for my $c(@{$rows->{cases}}){
    is($c->{output}{returnCode},0,
      $c->{name}.' source Perl returns 0, never active EVENT');
    is($c->{output}{randomDrawsUsed},1,
      $c->{name}.' consumes exact one original rand(1000)');
    is(scalar(@{$c->{output}{item}}),79,
      $c->{name}.' leaves complete 79-item inventory available');
  }
}
done_testing();
