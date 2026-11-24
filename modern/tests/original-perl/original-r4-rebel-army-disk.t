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
my $m=$o->{multi};
is(scalar @{$m->{steps}},3,'three sequential real NOW slices');
is($m->{steps}[0]{output}{armyById}{2},2800,'first stage army');
is($m->{steps}[1]{output}{armyById}{2},2800,'second reads original live army');
is($m->{steps}[2]{output}{armyById}{2},1600,'third reads committed army');
done_testing();
