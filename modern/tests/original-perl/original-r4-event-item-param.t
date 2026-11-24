use strict;
use warnings;
use utf8;
use Test::More;
use JSON::PP qw(decode_json);
use FindBin;
use File::Spec;
my $name=File::Spec->catfile($FindBin::Bin,'original-r4-event-item-param-probe.pl');
my $output=qx{perl "$name"};
is($?,0,'unmodified original Perl EVENT ITEM PARAM compiler executed');
my $json=eval{decode_json($output)};
ok(!$@&&ref($json)eq'HASH','source PARAM oracle JSON decoded');
if(ref($json)eq'HASH'){
 is($json->{compiledCount},17,'all 17 source EVENTs compiled');
 is($json->{overlayCount},9,'nine ITEM PARAM source events');
 for my $row (@{$json->{cases}}){
   is(scalar @{$row->{items}},79,'79 original ITEMs for '.$row->{eventCode});
   ok($row->{sourceParamCount}>0,'source EVENT PARAM rows '.$row->{eventCode});
   like($row->{generatedSource},qr/\$ITEM\[/,
     'actual Perl generated ITEM expressions '.$row->{eventCode});
 }
}
done_testing();
