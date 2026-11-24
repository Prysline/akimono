use strict;
use warnings;
use utf8;
use Test::More;
use FindBin;
use File::Spec;
use JSON::PP qw(decode_json);
my $f=File::Spec->catfile($FindBin::Bin,
  'original-r4-period-real-close-chain-probe.pl');
my $raw=qx{perl "$f"};
is($?,0,'actual frozen full two period prefixes execute original write.cgi CloseShop with real session unlink');
my $x=eval{decode_json($raw)};
ok(!$@&&ref($x)eq'HASH','original B50+true CloseShop source JSON');
if(ref($x)eq'HASH'){
  is(scalar(@{$x->{cases}}),2,'two consecutive source periods on same shop and city');
  my($first,$second)=@{$x->{cases}};
  ok(!$first->{output}{expiredOwner},'first source period no CloseShop');
  is($first->{output}{shop}{status},1,'first source shop still active');
  is($first->{output}{shop}{exp}{10},4695,
    'first source shop still runs true UpdateResetAfter');
  ok($second->{output}{expiredOwner},
    'second period original CloseShop changes store');
  ok(!defined($second->{output}{shop}),
    'true frozen SortDT removes status-zero shop');
  is(scalar(@{$second->{output}{activeShops}}),0,
    'second source period has zero active shops after SortDT');
  is($second->{output}{closedShop}{status},0,'true frozen CloseShop status zero');
  is($second->{output}{closedShop}{rank},0,'true frozen CloseShop rank zero');
  is($second->{output}{closedShop}{money},1425,
    'original second period 1500 payout minus 75 dues; no double charging prior upkeep');
  is($second->{output}{closedShop}{dragon},1500,
    'DragonBalance original file settles after real CloseShop');
  is_deeply([sort @{$second->{output}{closeDeletedSessions}}],
    ['1-one.cgi','1-two.cgi'],
    'actual frozen original CloseShop unlinks exactly two session files');
  is($second->{output}{closeWriteErrorLogCalls}[0]{file},'delete',
    'actual CloseShop emits source delete archive log');
  is($second->{output}{guildContext}{atk},921,
    'original guild attrition after closed store still occurs');
  is($second->{output}{drawsUsed},4,
    'after source SortDT removes the only shop there is no technique rand');
  is_deeply($second->{output}{techLostItemIds},[],
    'zero post-SortDT active shop -> no technique item losses');
  ok($second->{output}{dragonPayoutFileConsumed},
    'true dragon payout file still consumed in second period');
}
done_testing();
