use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use Test::More;
use JSON::PP qw(decode_json);
my $f=File::Spec->catfile($FindBin::Bin,'original-r4-mixed-support-gate-probe.pl');
my $raw=qx{perl "$f"};
is($?,0,'original Perl 17-key source executes theft/robbery and support STARTFUNC with seven active EVENTs');
my $o=eval{decode_json($raw)};
ok(!$@&&ref($o)eq'HASH','frozen mixed EVENT oracle JSON');
if(ref($o)eq'HASH'){
  is($o->{compiledCount},17,'exact 17 original runtime EVENT keys');
  is(scalar(@{$o->{theftCases}}),6,'six original source theft/robbery scenarios');
  is(scalar(@{$o->{lotoCases}}),4,'four original 17-key loto cases');
  is(scalar(@{$o->{happyCases}}),4,'four original 17-key happy START/END/NOWFUNC cases');
  my $fresh=$o->{happyCases}[0]{output};
  is(scalar(grep{$_->[2] eq '街上開始舉辦感謝祭了。'} @{$fresh->{logs}}),1,
    'original compiled happy START emits its literal source message');
  is(scalar(grep{$_->[2] eq '感謝祭已經結束了。'}
      @{$o->{happyCases}[2]{output}{logs}}),1,
    'original compiled happy END emits its literal source message');
  ok(exists($fresh->{activeUntilSeconds}{happy}),
    'happy persisted from original START while others stay active');
  is(scalar(grep{$_==100}@{$fresh->{randomDrawRanges}}),1,
    'newly started happy immediately draws original NOWFUNC rand(100)');
  ok($fresh->{shop}{rank}>5000,'original happy raises rank in same mixed slice');
  is(scalar(grep{$_==100}@{$o->{happyCases}[1]{output}{randomDrawRanges}}),1,
    'existing happy runs one NOWFUNC on next time slice');
  ok(!exists($o->{happyCases}[2]{output}{activeUntilSeconds}{happy}),
    'expired happy removed by source END before NOW');
  is(scalar(grep{$_==100}@{$o->{happyCases}[2]{output}{randomDrawRanges}}),0,
    'expired happy does not consume NOWFUNC RNG without reentry');
  is(scalar(grep{$_==100}@{$o->{happyCases}[3]{output}{randomDrawRanges}}),1,
    'expired-and-restarted happy immediately runs NOWFUNC');
  my $loto=$o->{lotoCases}[0]{output};
  is($loto->{shop}{item}[10],0,'original callback consumes five tickets');
  is($loto->{shop}{money},999999999,'original first prize caps cash');
  is(scalar(grep{$_==6096454}@{$loto->{randomDrawRanges}}),5,
    'five real rand(6096454) from same shared RNG');
  is(scalar(grep{$_==6096454}@{$o->{lotoCases}[1]{output}{randomDrawRanges}}),0,
    'zero tickets produce original opening log without extra draw');
  is($o->{lotoCases}[2]{output}{shop}{money},210000,
    'ordinary source fourth/fifth prizes');
  is(scalar(grep{$_==6096454}@{$o->{lotoCases}[3]{output}{randomDrawRanges}}),50,
    '50 tickets consume 50 original lotto draws');
  my $one=$o->{theftCases}[0]{output};
  is(scalar(keys %{$one->{activeUntilSeconds}}),7,
    'seven original declarative EVENTs coexist with both instant callbacks');
  is($one->{shop}{money},200000,'real support grant with original theft callbacks');
  ok($one->{shop}{item}[9]<12,'source robbery/theft consumes showcased stock');
  is(scalar(@{$one->{randomDrawRanges}}),$one->{drawsUsed},
    'one real mixed RNG range log includes every event and callback sample');
  my $two=$o->{theftCases}[1]{output};
  is($two->{shop}{item}[63],0,'source robot protection or robbery consumes robot');
  my $three=$o->{theftCases}[2]{output};
  is($three->{shop}{item}[63],0,'source robot destroy path consumes robot');
  is(scalar(@{$o->{theftCases}[3]{input}{activeHashOrderFixture}}),7,
    'source next DataRead sees seven prior durable events');
  my $guard=$o->{theftCases}[4]{output};
  is($guard->{shop}{item}[63],1,'source manbiki robot protection preserves robot');
  is(scalar(grep{$_==1000}@{$guard->{randomDrawRanges}}),2,
    'manbiki guard protection consumes exactly two rand(1000)');
  my $destroy=$o->{theftCases}[5]{output};
  is($destroy->{shop}{item}[63],0,'source manbiki robot destroyed');
  is(scalar(grep{$_==1000}@{$destroy->{randomDrawRanges}}),2,
    'manbiki guard destruction consumes exactly two rand(1000)');
}
done_testing();
