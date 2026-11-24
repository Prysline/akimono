use strict;
use warnings;
use Test::More;
use FindBin;
use JSON::PP;
open my $p,'-|',$^X,"$FindBin::Bin/original-r4-rebel-army-disk-probe.pl" or die $!;
binmode $p,':raw';local $/;my $s=<$p>;close $p or die 'army disk probe failed';
my $o=JSON::PP->new->utf8->decode($s);
is(scalar @{$o->{cases}},8,'eight original period/NOW cases');
for my $r(@{$o->{cases}}){
  if($r->{output}{writeArmyCalls}){
    ok(defined($r->{stagedArmy}),$r->{name}.' actual stage exists');
    is($r->{liveArmy},$r->{stagedArmy},$r->{name}.' real commit');
  }else{
    ok(!defined($r->{stagedArmy}),$r->{name}.' no army stage');
    is($r->{liveArmy},$r->{initialArmy},$r->{name}.' live unchanged');
  }
}
done_testing();
