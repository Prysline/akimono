use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use Test::More;
use JSON::PP qw(decode_json);
my $probe=File::Spec->catfile($FindBin::Bin,'original-b52-event-wire-probe.pl');
my $raw=qx{perl "$probe"};
is($?,0,'B-52 executes exact frozen original admin + DataRead + DataWrite event wire');
my $proof=eval{decode_json($raw)};
ok(!$@&&ref($proof)eq'HASH','original event wire proof returns JSON');
if(ref($proof)eq'HASH'){
  is($proof->{initialActiveCount},0,'original new world active EVENT map is truly empty');
  is($proof->{eventWireEmpty},"\n",'original writer emits empty event line');
  is($proof->{oneActiveWire},"rebel,123456\n",'original writer stores one active EVENT + end timestamp');
  is($proof->{oneActiveEvents}{rebel},123456,'original reader recovers one active EVENT expiry');
  is(scalar(keys %{$proof->{oneActiveEvents}}),1,'no extra event fields fabricated');
}
done_testing();
