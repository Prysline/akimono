use strict;
use warnings;
use utf8;
use Test::More;
use JSON::PP qw(decode_json);
use File::Spec;
use FindBin;
my $probe=File::Spec->catfile($FindBin::Bin,'original-b45-top-prize-probe.pl');
my $out=qx{perl "$probe"};
is($?,0,'B-45 actual original Standard Street first-rank prize callback runs');
my $result=eval{decode_json($out)};
ok(!$@ && ref($result) eq 'HASH','source top prize probe JSON');
if(ref($result)eq'HASH'){
  my @cases=@{$result->{cases}};
  is(scalar(@cases),10,'nine top-prize choices plus cap overflow');
  for my $i (0..8){
    my $row=$cases[$i];
    is($row->{choice},$i,'original top prize choice '.$i);
    is($row->{output}{rankingcount},1,'original winner count increases');
    is(scalar(@{$row->{changedItems}}),1,'original AddItem awarded one item type');
  }
  my $overflow=$cases[9];
  is($overflow->{input}{item}[78],9,'gift stock starts at nine');
  is($overflow->{output}{item}[78],10,'original AddItem caps prize gift at ten');
  is($overflow->{output}{rankingcount},1,'overflow still counts rank winner');
}
done_testing();
