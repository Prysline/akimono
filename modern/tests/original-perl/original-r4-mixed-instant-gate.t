use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use Test::More;
use JSON::PP qw(decode_json);
my $f=File::Spec->catfile($FindBin::Bin,'original-r4-mixed-support-gate-probe.pl');
my $raw=qx{perl "$f"};
is($?,0,'original Perl 17-key source executes theft/robbery and support STARTFUNC with seven active EVENTs');
my $o=eval{decode_json($raw)};
ok(!$@&&ref($o)eq'HASH','frozen mixed EVENT oracle JSON');
if(ref($o)eq'HASH'){
  is($o->{compiledCount},17,'exact 17 original runtime EVENT keys');
  is(scalar(@{$o->{theftCases}}),6,'six original source theft/robbery scenarios');
  is(scalar(@{$o->{lotoCases}}),4,'four original 17-key loto cases');
  is(scalar(@{$o->{happyCases}}),4,'four original 17-key happy START/END/NOWFUNC cases');
  is(scalar(@{$o->{durableCases}}),4,'four original 17-key iron/sword lifetime and ITEM overlay cases');
  my $durable=$o->{durableCases}[0]{output};
  is(scalar(keys %{$durable->{activeUntilSeconds}}),10,
    'ten real durable source EVENT coexist after START with instant callbacks');
  is($o->{durableCases}[1]{output}{dataReadItems}[4]{plus},720,
    'actual compiler iron PLUS #5 overlay on next DataRead');
  is($o->{durableCases}[1]{output}{dataReadItems}[39]{popular},
    int($o->{durableCases}[1]{input}{items}[39]{popular}/2),
    'actual compiler ken-sale halves this source fixture ITEM #40 popular on next DataRead');
  ok(!exists($o->{durableCases}[2]{output}{activeUntilSeconds}{'plusup-tetu'}),
    'expired iron EVENT removed at END');
  ok(!exists($o->{durableCases}[2]{output}{activeUntilSeconds}{'ken-sale'}),
    'expired sword EVENT removed at END');
  ok(exists($o->{durableCases}[3]{output}{activeUntilSeconds}{'plusup-tetu'}),
    'source iron EVENT restarts after expiring');
  ok(exists($o->{durableCases}[3]{output}{activeUntilSeconds}{'ken-sale'}),
    'source sword EVENT restarts after expiring');
  is(scalar(@{$o->{rebelCases}}),5,
    'five real 17-key original rebel NOW interleaving scenarios');
  is(scalar(@{$o->{rebelCases}[0]{output}{randomDrawRanges}}),
    $o->{rebelCases}[0]{output}{drawsUsed},
    'original all-event RNG ranges count each real NOWFUNC draw');
  ok(exists($o->{rebelCases}[0]{output}{activeUntilSeconds}{rebel}),
    'mixed source rebel persists after armed NOW execution');
  ok(!exists($o->{rebelCases}[1]{output}{activeUntilSeconds}{rebel}),
    'source rebel NOW deletes its EVENT while original hash traversal runs');
  ok(scalar(grep{$_ eq 'rebel'}@{$o->{rebelCases}[1]{input}{nowHashOrderFixture}}),
    'source actual pre-NOW Perl key list contains rebel before self-delete');
  is($o->{rebelCases}[2]{output}{rebelContext}{armyById}{1},1800,
    'source one-hour rioter military reduction inside 17-key EVENT');
  is($o->{rebelCases}[3]{output}{guildContext}{dominion},'beta',
    'source guildbattle END and rebel NOW coexist in same 17-key event turn');
  is(scalar(@{$o->{rebelCases}[4]{output}{rebelNowCallbacks}}),0,
    'expired rebel never dispatches NOW callback');
  is(scalar(@{$o->{guildCases}}),4,
    'four original full 17-key guildbattle END and ongoing cases');
  my $guild=$o->{guildCases}[0]{output};
  is($guild->{guildContext}{dominion},'beta',
    'real frozen guildbattle END SetTownData selects unique richest guild');
  is($guild->{guildEndCallbacks}[0],'guildbattle',
    'actual original ENDFUNC invoked inside ten-durable mixed order');
  ok(!exists($guild->{activeUntilSeconds}{guildbattle}),
    'expired guildbattle removed while ten other durable events survive');
  is(scalar(keys(%{$guild->{activeUntilSeconds}})),10,
    'ten durable source events persist after guildbattle END');
  is(scalar(grep{$_->[2]=~/赤月會/}@{$guild->{logs}}),1,
    'real original guildbattle message interleaved in source event logs');
  is($o->{guildCases}[1]{output}{guildContext}{dominion},'alpha',
    'source strict equality prevents guildbattle callback on boundary');
  is($o->{guildCases}[3]{output}{guildContext}{dominion},'alpha',
    'zero START guildbattle never sets city dominion');
  my $fresh=$o->{happyCases}[0]{output};
  is(scalar(grep{$_->[2] eq '街上開始舉辦感謝祭了。'} @{$fresh->{logs}}),1,
    'original compiled happy START emits its literal source message');
  is(scalar(grep{$_->[2] eq '感謝祭已經結束了。'}
      @{$o->{happyCases}[2]{output}{logs}}),1,
    'original compiled happy END emits its literal source message');
  ok(exists($fresh->{activeUntilSeconds}{happy}),
    'happy persisted from original START while others stay active');
  is(scalar(grep{$_==100}@{$fresh->{randomDrawRanges}}),1,
    'newly started happy immediately draws original NOWFUNC rand(100)');
  ok($fresh->{shop}{rank}>=0&&$fresh->{shop}{rank}<=10000,
    'source mixed callback rank remains valid; theft may outweigh happy NOW gain');
  is(scalar(grep{$_==100}@{$o->{happyCases}[1]{output}{randomDrawRanges}}),1,
    'existing happy runs one NOWFUNC on next time slice');
  ok(!exists($o->{happyCases}[2]{output}{activeUntilSeconds}{happy}),
    'expired happy removed by source END before NOW');
  is(scalar(grep{$_==100}@{$o->{happyCases}[2]{output}{randomDrawRanges}}),0,
    'expired happy does not consume NOWFUNC RNG without reentry');
  is(scalar(grep{$_==100}@{$o->{happyCases}[3]{output}{randomDrawRanges}}),1,
    'expired-and-restarted happy immediately runs NOWFUNC');
  my $loto=$o->{lotoCases}[0]{output};
  is($loto->{shop}{item}[10],0,'original callback consumes five tickets');
  is($loto->{shop}{money},999999999,'original first prize caps cash');
  is(scalar(grep{$_==6096454}@{$loto->{randomDrawRanges}}),5,
    'five real rand(6096454) from same shared RNG');
  is(scalar(grep{$_==6096454}@{$o->{lotoCases}[1]{output}{randomDrawRanges}}),0,
    'zero tickets produce original opening log without extra draw');
  is($o->{lotoCases}[2]{output}{shop}{money},210000,
    'ordinary source fourth/fifth prizes');
  is(scalar(grep{$_==6096454}@{$o->{lotoCases}[3]{output}{randomDrawRanges}}),50,
    '50 tickets consume 50 original lotto draws');
  my $one=$o->{theftCases}[0]{output};
  is(scalar(keys %{$one->{activeUntilSeconds}}),7,
    'seven original declarative EVENTs coexist with both instant callbacks');
  is($one->{shop}{money},200000,'real support grant with original theft callbacks');
  ok($one->{shop}{item}[9]<12,'source robbery/theft consumes showcased stock');
  is(scalar(@{$one->{randomDrawRanges}}),$one->{drawsUsed},
    'one real mixed RNG range log includes every event and callback sample');
  my $two=$o->{theftCases}[1]{output};
  is($two->{shop}{item}[63],0,'source robot protection or robbery consumes robot');
  my $three=$o->{theftCases}[2]{output};
  is($three->{shop}{item}[63],0,'source robot destroy path consumes robot');
  is(scalar(@{$o->{theftCases}[3]{input}{activeHashOrderFixture}}),7,
    'source next DataRead sees seven prior durable events');
  my $guard=$o->{theftCases}[4]{output};
  is($guard->{shop}{item}[63],1,'source manbiki robot protection preserves robot');
  is(scalar(grep{$_==1000}@{$guard->{randomDrawRanges}}),2,
    'manbiki guard protection consumes exactly two rand(1000)');
  my $destroy=$o->{theftCases}[5]{output};
  is($destroy->{shop}{item}[63],0,'source manbiki robot destroyed');
  is(scalar(grep{$_==1000}@{$destroy->{randomDrawRanges}}),2,
    'manbiki guard destruction consumes exactly two rand(1000)');
}
done_testing();
