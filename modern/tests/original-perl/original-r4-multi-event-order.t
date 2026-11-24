use strict;
use warnings;
use utf8;
use Test::More;
use JSON::PP qw(decode_json);
use FindBin;
use File::Spec;
my $f=File::Spec->catfile($FindBin::Bin,
  'original-r4-multi-event-order-probe.pl');
my $raw=qx{perl "$f"};
is($?,0,'frozen original Perl 17-key EVENT hash, seven multistarts and END/START source run');
my $json=eval{decode_json($raw)};
ok(!$@&&ref($json)eq'HASH','original multi EVENT source oracle decoded');
if(ref($json)eq'HASH'){
  is($json->{compiledCount},17,'all seventeen original compiler keys present');
  is(scalar(@{$json->{cases}}),4,'four source EVENT stages');
  my $first=$json->{cases}[0];
  is(scalar(keys %{$first->{output}{activeUntilSeconds}}),7,
     'seven declarative source EVENTs simultaneously persisted');
  is(scalar(@{$first->{input}{eventHashOrderFixture}}),17,
     'actual Perl 17-key traversal recorded');
  is(scalar(@{$first->{input}{randomDraws}}),
     scalar(@{$first->{output}{randomDrawRanges}}),
     'original fragment consumes exactly supplied interleaved sample sequence');
  my $second=$json->{cases}[1];
  is(scalar(@{$second->{input}{activeHashOrderFixture}}),7,
     'seven EVENT ITEM overlays loaded at next DataRead');
  is_deeply($second->{output}{dataReadItems}[0]{itemId},1,
    'original generated EVENT PARAM retains source ITEM numbering');
}
done_testing();
