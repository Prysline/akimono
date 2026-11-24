use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use Test::More;
use JSON::PP qw(decode_json);
my $f=File::Spec->catfile($FindBin::Bin,'original-r4-mixed-support-gate-probe.pl');
my $raw=qx{perl "$f"};
is($?,0,'original 17-key EVENT hash plus getmoney/getpop original STARTFUNC source executes');
my $o=eval{decode_json($raw)};
ok(!$@&&ref($o)eq'HASH','source mixed Perl EVENT Oracle decoded');
if(ref($o)eq'HASH'){
  is($o->{compiledCount},17,'all 17 original compiled EVENTs present');
  is(scalar(@{$o->{cases}}),4,'mixed source time slices');
  my $one=$o->{cases}[0]{output};
  is(scalar(keys %{$one->{activeUntilSeconds}}),7,'seven simultaneous lasting EVENTs');
  is($one->{shop}{money},200000,'original getmoney callback adds grant');
  is($one->{shop}{rank},6000,'original getpop callback increases rank');
  is(scalar(@{$one->{randomDrawRanges}}),$one->{drawsUsed},
    'source rand gate and callback call counts agree');
  my $two=$o->{cases}[1]{output};
  is($two->{shop}{money},200000,'missed getmoney does not change grant');
  is($two->{shop}{rank},6000,'missed getpop does not change rank');
  my $three=$o->{cases}[2]{output};
  is($three->{shop}{money},999999999,'original source money upper cap');
  is($three->{shop}{rank},10000,'original source popularity cap');
}
done_testing();
