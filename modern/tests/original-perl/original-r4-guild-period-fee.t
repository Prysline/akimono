use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use Test::More;
use JSON::PP qw(decode_json);
my $file=File::Spec->catfile($FindBin::Bin,
  'original-r4-guild-period-fee-probe.pl');
my $raw=qx{perl "$file"};
is($?,0,'actual frozen original guild dues/atk/def per-shop Perl snippet executes');
my $a=eval{decode_json($raw)};
ok(!$@&&ref($a)eq'HASH','original guild financial source JSON');
if(ref($a)eq'HASH'){
  is(scalar(@{$a->{cases}}),7,'seven source guild fee branches');
  my @r=@{$a->{cases}};
  is(scalar(@{$r[0]{output}{editGuildMoneyCalls}}),0,
    'shop outside guild invokes no EditGuildMoney');
  is($r[1]{output}{editGuildMoneyCalls}[0]{amount},0,
    'source fee zero still invokes EditGuildMoney');
  is($r[1]{output}{guild}{atk},960,
    'source first attack decay floor(1000*24/25)');
  is($r[1]{output}{guild}{def},450,
    'source first defense attrition floor(500*9/10)');
  is($r[2]{output}{editGuildMoneyCalls}[0]{amount},40000,
    'source exact 50 per mille of 800k sales');
  is($r[2]{output}{guild}{def},482,
    'source defense after decay and fee/800 growth');
  is($r[3]{output}{editGuildMoneyCalls}[0]{amount},456,
    'source int(12345*37/1000) rounds toward zero');
  is($r[4]{output}{guild}{def},1000,
    'original defense upper cap');
  is($r[5]{output}{guild}{atk},0,
    'original 1 attack attrition rounds to zero');
  is($r[6]{output}{shop}{money},-39990,
    'source original guild dues may create negative shop money');
}
done_testing();
