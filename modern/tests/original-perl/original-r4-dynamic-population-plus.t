use strict;
use warnings;
use utf8;
use Test::More;
use JSON::PP qw(decode_json);
use FindBin;
use File::Spec;
my $probe=File::Spec->catfile($FindBin::Bin,
  'original-r4-dynamic-population-plus-probe.pl');
my $out=qx{perl "$probe"};
is($?,0,'R4 real frozen PLUS source executes for three populations');
my $value=eval {decode_json($out)};
ok(!$@&&ref($value)eq'HASH','real Perl result decoded');
if(ref($value)eq'HASH'){
  is(scalar @{$value->{cases}},3,'three original city populations');
  is_deeply([map {$_->{dtPeople}} @{$value->{cases}}],
    [250000,500000,750000],'true original populations');
  for my $row (@{$value->{cases}}){
    is(scalar @{$row->{wholesale}},79,'original 79-item wholesale');
    is($row->{drawsUsed},scalar @{$row->{consumedSamples}},
      'source RNG consumed exactly');
  }
  isnt($value->{cases}[0]{wholesale}[9],
    $value->{cases}[2]{wholesale}[9],
    'original book-tool PLUS responds to population');
}
done_testing();
