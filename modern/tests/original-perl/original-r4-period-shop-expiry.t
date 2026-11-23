use strict;
use warnings;
use utf8;
use Test::More;
use FindBin;
use File::Spec;
use JSON::PP qw(decode_json);
my $f=File::Spec->catfile($FindBin::Bin,
  'original-r4-period-shop-expiry-probe.pl');
my $raw=qx{perl "$f"};
is($?,0,'true frozen Perl period.cgi absent-owner block actually runs');
my $data=eval{decode_json($raw)};
ok(!$@&&ref($data)eq'HASH','source CloseShop/PushLog calls return JSON');
if(ref($data)eq'HASH'){
  is(scalar(@{$data->{cases}}),9,'nine actual Perl shop expiry branches');
  my @r=@{$data->{cases}};
  ok(!$r[0]{output}{expiredOwner},'shop exact 12h age not expired');
  ok($r[1]{output}{expiredOwner},'shop age 12h plus one second expired');
  is($r[1]{output}{closeCalls}[0]{reason},
    '経営者不在','original CloseShop is called with localized reason');
  is($r[1]{output}{logs}[0][0],1,'original PushLog channel');
  is($r[1]{output}{logs}[0][2],
    '原版無人店が経営者不在のため閉店しました。',
    'original period close log text');
  ok(!$r[2]{output}{expiredOwner},'blocklogin stop protects old shop');
  ok(!$r[3]{output}{expiredOwner},'exact seven days since login not expired');
  ok($r[4]{output}{expiredOwner},'seven days plus second triggers CloseShop');
  ok(!$r[5]{output}{expiredOwner},'young shop never closed');
  ok(!$r[6]{output}{expiredOwner},'recently logged in shop never closed');
  ok($r[7]{output}{expiredOwner},'other blocklogin values do not protect');
  ok(!$r[8]{output}{expiredOwner},'new world zero timestamp no close');
}
done_testing();
