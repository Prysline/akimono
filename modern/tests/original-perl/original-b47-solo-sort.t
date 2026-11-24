use strict;
use warnings;
use utf8;
use Test::More;
use JSON::PP qw(decode_json);
use FindBin;
use File::Spec;
my $probe=File::Spec->catfile($FindBin::Bin,'original-b47-solo-sort-probe.pl');
my $out=qx{perl "$probe"};
is($?,0,'B-47 executes untouched original Core SortDT and GetDTPoint');
my $r=eval{decode_json($out)};
ok(!$@&&ref($r)eq'HASH','original ranking probe decoded');
if(ref($r)eq'HASH'){
  is(scalar @{$r->{cases}},4,'four original one-shop rank fixtures');
  is($r->{cases}[0]{output}{point},5010,'original initial point matches rank');
  for my $case (@{$r->{cases}}) {
    is($case->{idIndex},0,'source id2idx maps only shop to zero');
    is($case->{nameIndex},0,'source name2idx maps only shop to zero');
    ok($case->{output}{point}>=0,'source score nonnegative');
    is($case->{output}{rank},$case->{input}{rank},
      'source sort does not alter the popularity score');
  }
  ok($r->{cases}[2]{output}{point}>$r->{cases}[2]{input}{rank},
    'large positive source rolling profit increases ranking score');
  ok($r->{cases}[3]{output}{point}<$r->{cases}[3]{input}{rank},
    'original source loss decreases ranking score');
}
done_testing();
