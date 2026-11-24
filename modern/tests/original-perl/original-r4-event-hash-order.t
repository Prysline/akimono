use strict;
use warnings;
use utf8;
use Test::More;
use JSON::PP qw(decode_json);
use FindBin;
use File::Spec;
my $probe=File::Spec->catfile($FindBin::Bin,
  'original-r4-event-hash-order-probe.pl');
my $json=qx{perl "$probe"};
is($?,0,'R4 invokes original compiled-event Perl hash initializer');
my $data=eval {decode_json($json)};
ok(!$@&&ref($data)eq'HASH','original Perl hash observation decoded');
if(ref($data)eq'HASH'){
  is($data->{declaredCount},25,'25 original EVENT declarations');
  is($data->{compiledCount},17,'17 compiled EVENT keys');
  is(scalar @{$data->{perlEventHashOrder}},17,
    'real keys(%EVENT) visits 17 keys');
  is_deeply([sort @{$data->{perlEventHashOrder}}],
    [sort @{$data->{declarationOrder}}],
    'original runtime hash visits exactly compiled EVENT set');
  is_deeply($data->{perlEventHashOrder},
    $data->{perlEventHashOrderRepeated},
    'same live Perl hash yields stable traversal while untouched');
  is_deeply([sort @{$data->{perlActiveFixtureHashOrder}}],
    [sort @{$data->{activeFixtureInsertionOrder}}],
    'actual keys(%DTevent) visits isolated active event fixture');
  isnt($data->{scope},'complete EVENT engine',
    'no unsupported original EVENT lifecycle claim');
}
done_testing();
