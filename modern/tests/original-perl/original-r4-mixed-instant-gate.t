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
  is(scalar(@{$o->{theftCases}}),4,'four source theft/robbery scenarios');
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
    'source final next DataRead sees seven prior durable events');
}
done_testing();
