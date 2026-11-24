use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use Test::More;
use JSON::PP qw(decode_json);
my $p=File::Spec->catfile($FindBin::Bin,
  'original-r4-period-high-exp-tech-probe.pl');
my $json=qx{perl "$p"};
is($?,0,'frozen two original periods execute high-EXP UpdateResetAfter true technology callback');
my $oracle=eval{decode_json($json)};
ok(!$@&&ref($oracle)eq'HASH','two-period source oracle JSON');
if(ref($oracle)eq'HASH'){
  is(scalar(@{$oracle->{cases}}),2,'two source periods with persistent technique stock');
  my($a,$b)=@{$oracle->{cases}};
  is_deeply($a->{output}{techLostItemIds},[18,24],
    'first source period loses 18 and 24 in frozen technique order');
  is_deeply($b->{output}{techLostItemIds},[19],
    'second source period only draws remaining held techniques');
  is(scalar(@{$a->{output}{techLogs}}),4,
    'two original WriteLog entries per first-period tech loss');
  is(scalar(@{$b->{output}{techLogs}}),2,
    'one original WriteLog pair in second period');
  is($a->{output}{drawsUsed},8,
    'first period uses four original rand(14000) plus award/dignity/town');
  is($b->{output}{drawsUsed},6,
    'second period only uses two original rand(14000) after tech attrition');
  is($a->{output}{shop}{exp}{10},4695,
    'first original experience decay happens BEFORE technical forgetting');
  is($b->{output}{shop}{exp}{10},4409,
    'second original experience decay uses first-period result');
  is($a->{output}{shop}{item}[17],0,'smith skill lost in source first period');
  is($a->{output}{shop}{item}[23],0,'discerning skill lost in source first period');
  is($b->{output}{shop}{item}[18],0,'magic knowledge lost in second period');
  is($b->{output}{shop}{item}[37],1,'dismantling soul retained');
  is($b->{output}{shop}{dragon},-500,
    'original DragonBalance source still operates with technique callback');
  is($b->{output}{guildContext}{atk},921,
    'original guild attack attrition still follows two periods');
  is($b->{output}{shop}{dignity},23,
    'original dignity decay remains in shared RNG sequence');
  ok($a->{output}{dragonPayoutFileConsumed}&&
     $b->{output}{dragonPayoutFileConsumed},
    'both true original dragon payout files consumed');
}
done_testing();
