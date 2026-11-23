use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use Test::More;
use JSON::PP qw(decode_json);
my $file=File::Spec->catfile($FindBin::Bin,
  'original-r4-period-all-finance-source-probe.pl');
my $raw=qx{perl "$file"};
is($?,0,'frozen two original period prefixes execute dragon+dignity+guild fee with explicit external IO call recorder');
my $x=eval{decode_json($raw)};
ok(!$@&&ref($x)eq'HASH','same original guild and city period JSON');
if(ref($x)eq'HASH'){
  is(scalar(@{$x->{cases}}),2,'two original chained period states');
  my($a,$b)=@{$x->{cases}};
  is($a->{output}{guildMoneyEdits}[0]{amount},525,
    'original 10500 saleyesterday times 50 permille');
  is($b->{output}{guildMoneyEdits}[0]{amount},0,
    'original second period sale zero therefore EditGuildMoney called with 0');
  is($a->{output}{guildContext}{atk},960,
    'first period attack natural attrition 1000 to 960');
  is($a->{output}{guildContext}{def},450,
    'first period defense natural attrition 500 to 450');
  is($b->{input}{guildContext}{atk},960,
    'second period input uses first source guild attack');
  is($b->{output}{guildContext}{atk},921,
    'second period original attack attrition floor(960*24/25)');
  is($b->{output}{guildContext}{def},405,
    'second period defense attrition floor(450*9/10)');
  is($a->{output}{shop}{dignity},23,
    'source first dignity decrease persists with guild fee');
  is($b->{output}{shop}{dignity},23,
    'source second dignity remains after rand miss');
  is($b->{output}{shop}{dragon},-500,
    'source net dragon accumulator persists');
  is($b->{output}{shop}{payyesterday},517,
    'source original negative dragon plus upkeep payment');
  ok($a->{output}{dragonPayoutFileConsumed},
    'first real DragonBalance file consumed');
  ok($b->{output}{dragonPayoutFileConsumed},
    'second real DragonBalance file consumed');
  is($b->{output}{shop}{rankingcount},2,
    'original two top ranks continue with guild fee and dignity');
}
done_testing();
