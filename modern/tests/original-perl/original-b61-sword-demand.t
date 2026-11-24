use strict;
use warnings;
use utf8;
use Test::More;
use JSON::PP qw(decode_json);
use File::Spec;
use FindBin;
my $cmd=File::Spec->catfile($FindBin::Bin,'original-b61-sword-demand-probe.pl');
my $raw=qx{perl "$cmd"};
is($?,0,'B-61 real original compiler EVENT PARAM, sale-market demand and END/START run');
my $r=eval{decode_json($raw)};
ok(!$@&&ref($r)eq'HASH','B-61 actual Perl source JSON parsed');
if(ref($r)eq'HASH'){
  is($r->{compiler}{startProba},100,'original EVENT start 10% compiled to100');
  is($r->{compiler}{baseTimeSeconds},21600,'source EVENT 6 hour base');
  is($r->{compiler}{plusTimeSeconds},86400,'source EVENT extra 24h');
  is(scalar @{$r->{compiler}{params}},5,
    'actual compiler has five swords, not all ITEMs');
  my $source=$r->{generatedEventFile};
  my @lines=grep(length,split(/\r?\n/,$source));
  is(scalar @lines,5,'original compiler emits five real POP division lines');
  for my $i(0..4){
    my $no=40+$i;
    is($lines[$i],'$ITEM['.$no.']->{popular}=int($ITEM['.
      $no.']->{popular}/2);',"source event $no original compiler int(pop/2)");
  }
  my $a=$r->{market}{active},$b=$r->{market}{baseline};
  is($b->{displayedSword}{averageMarketPrice},1200,
    'original nominal price is unmodified by sword demand event');
  is($a->{displayedSword}{averageMarketPrice},1200,
    'active demand does not magically raise item price');
  is($b->{displayedSword}{sourceUppoint},54,
    'real original market status demand index for 200 swords');
  is($a->{displayedSword}{sourceUppoint},27,
    'source demand event halves popular and actual market UPPOINT');
  is($b->{displayedSword}{sourceBuypeopleBase},1,
    'real original displayed price buys base one');
  is($a->{displayedSword}{sourceBuypeopleBase},1,
    'original demand modifies pop not showcase price');
  for my $i(0..4){
    my $n=40+$i;
    my($base,$event)=($b->{swordItems}[$i],$a->{swordItems}[$i]);
    is($base->{itemId},$n,'original source sword id '.$n);
    is($event->{popularSeconds},int($base->{popularSeconds}/2),
      'original compiler halves POP seconds item '.$n);
    ok(abs($event->{potentialBuyers}-$base->{potentialBuyers}*2)<1e-12,
      'original inc-turn source buyer potential approximately doubles item '.$n);
  }
  is(scalar @{$r->{cases}},5,'original event lifecycle source cases');
  my %c=map{$_->{name}=>$_->{output}} @{$r->{cases}};
  is($c{'first-start'}{eventState}{'ken-sale'},1044100,
    'event duration start+rand(span)+6h+rand(24h)');
  is($c{'first-start'}{randomDrawsUsed},3,
    'gate and two duration random samples used');
  is_deeply($c{'first-start'}{logs},
    [[2,0,'對劍的需求似乎在增加']],
    'original sword demand start log');
  is($c{'active-group'}{randomDrawsUsed},0,
    'source active group skips renewed start gate');
  is($c{'expiry-equal'}{eventState}{'ken-sale'},1001800,
    'event expiry == slice end remains active');
  is(scalar keys %{$c{'expired-no-restart'}{eventState}},0,
    'expired event disappears if gate misses');
  is_deeply($c{'expired-no-restart'}{logs},
    [[2,0,'劍的需求已恢復正常水平']],
    'original source endmsg emitted');
  is($c{'expired-restart'}{eventState}{'ken-sale'},1021600,
    'expired source can retrigger in the same segment');
  is_deeply($c{'expired-restart'}{logs},[
    [2,0,'劍的需求已恢復正常水平'],
    [2,0,'對劍的需求似乎在增加'],
  ],'end message precedes new start message');
}
done_testing();
