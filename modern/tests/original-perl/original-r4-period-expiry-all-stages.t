use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use Test::More;
use JSON::PP qw(decode_json);
my $f=File::Spec->catfile($FindBin::Bin,
  'original-r4-period-expiry-all-stages-probe.pl');
my $raw=qx{perl "$f"};
is($?,0,'actual frozen full two-period prefixes execute recorded CloseShop and remaining finance/tech stages');
my $o=eval{decode_json($raw)};
ok(!$@&&ref($o)eq'HASH','two original full source period outputs');
if(ref($o)eq'HASH'){
  is(scalar(@{$o->{cases}}),2,'two original same-world periods');
  my($first,$second)=@{$o->{cases}};
  is($first->{input}{shop}{lastlogin},0,
    'original full period stale-login scenario source input');
  ok(!$first->{output}{expiredOwner},
    'first source period new shop has not crossed 12h age');
  is_deeply($first->{output}{closeCalls},[],
    'first period does not invoke CloseShop');
  ok($second->{output}{expiredOwner},
    'second original source period invokes stale owner CloseShop');
  is_deeply($second->{output}{closeCalls},[
    {shopId=>1,reason=>'経営者不在'},
  ],'real frozen CloseShop call recorded without deleting data');
  is_deeply($second->{output}{closeLogs},[
    [1,0,'同一商店が経営者不在のため閉店しました。'],
  ],'true frozen original PushLog is localized once');
  is($second->{output}{shop}{id},1,
    'close-call recorder deliberately does not pretend to close data files');
  is($first->{output}{shop}{dragon},500,
    'real payout file source still posts first period');
  is($second->{output}{shop}{dragon},-500,
    'real payout file source still posts second period');
  is($second->{output}{guildContext}{atk},921,
    'source guild attrition still executed after close-call recorder');
  is($second->{output}{shop}{dignity},23,
    'source second period dignity still preserved');
  is_deeply($second->{output}{techLostItemIds},[19],
    'second period technology forgetting still original');
  is($second->{output}{drawsUsed},6,
    'close-call block draws no original random numbers');
  ok($first->{output}{dragonPayoutFileConsumed}&&
     $second->{output}{dragonPayoutFileConsumed},
    'true source DragonBalance temporary files consumed');
}
done_testing();
