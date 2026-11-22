use strict;
use warnings;
use utf8;
use JSON::PP qw(decode_json);
use Test::More;
use FindBin;
use File::Spec;
my $p=File::Spec->catfile($FindBin::Bin,'original-b62-sword-map-use-probe.pl');
my $raw=qx{perl "$p"};
is($?,0,'B-62 true original Perl source map USE/MakeAmount/UseTime/EXP and callbacks executed');
my $o=eval{decode_json($raw)};
ok(!$@&&ref($o)eq'HASH','original use source result decoded');
if(ref($o)eq'HASH'){
  my $c=$o->{compiled},$r=$o->{result};
  is($c->{itemId},14,'original sword map ITEM14 owner');
  is($c->{seconds},7200,'original GetBuffer compiles 4h to 2h');
  is($c->{expTimeSeconds},3600,'original SOURCE 2h exptime halved');
  is($c->{money},12000,'original map expedition cash price 12000');
  is($c->{exp},20,'original source exp 2% compiles to 20');
  is($c->{callback},'_local_b1','original compiler assigns map function-before');
  is($c->{function},'lostbook','original source post-callback');
  is_deeply([map {$_->{no}} @{$c->{outputs}}],[40,41,42,43,44],
    'original compiler maps all five source sword ITEM numbers');
  is_deeply([map {$_->{proba}} @{$c->{outputs}}],
    [400,350,150,60,30],'original compiler percent probabilities');
  is($r->{woodSwords},10,'original actual source creates ten wood swords');
  is($r->{maps},1,'original non-destructive lostbook returns with same map');
  is($r->{money},78000,'original UseItem spends twelve thousand');
  is($r->{paytoday},22000,'original source paytoday increases 12000');
  is($r->{time},862000,'original source UseTime spends 7200 seconds');
  is($r->{exp14},20,'original source experience earned 20');
  is($r->{count},1,'original source performs a single expedition');
  is_deeply($r->{created},[[40,10]],'actual source creates only ITEM40');
  is($r->{callbackResult},'','original shared lostbook callback returns empty');
  is($r->{wholesaleWood},0,'source original CheckWholeStore did not fake wholesale');
  is($o->{consumedDraws},52,
    'one source prefunction draw, fifty MakeAmount draws, one lostbook draw');
  is(scalar(@{$o->{randRanges}}),52,'all original source ranges observed');
  ok(!grep($_!=1000,@{$o->{randRanges}}),
    'each actual source callback and per-unit MakeAmount draw uses rand(1000)');
}
done_testing();
