use strict;
use warnings;
use utf8;
use Test::More;
use JSON::PP qw(decode_json);
use FindBin;
use File::Spec;
my $file=File::Spec->catfile($FindBin::Bin,
  'original-r4-declarative-event-cycle-probe.pl');
my $raw=qx{perl "$file"};
is($?,0,'seven original Perl source declarative EVENT cycles execute');
my $o=eval{decode_json($raw)};
ok(!$@&&ref($o)eq'HASH','original declarative source oracle JSON');
if(ref($o)eq'HASH'){
  is($o->{eventCount},7,'exactly seven original compiled declarative events');
  for my $e (@{$o->{cases}}){
    is(scalar(@{$e->{cases}}),4,$e->{eventCode}.' four expiry cases');
    is(scalar(@{$e->{cases}[0]{output}{dataReadItems}}),79,
       $e->{eventCode}.' original complete 79 ITEM DataRead snapshot');
    ok(scalar(@{$e->{timeline}})>7,
       $e->{eventCode}.' continuous hours through expiry');
    ok(!$e->{cases}[0]{output}{activeAtDataRead},
       $e->{eventCode}.' new start cannot change current DataRead');
    ok($e->{cases}[2]{output}{expired},
       $e->{eventCode}.' strict expiry before interval end');
  }
}
done_testing();
