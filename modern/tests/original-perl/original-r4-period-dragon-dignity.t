use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use Test::More;
use JSON::PP qw(decode_json);
my $f=File::Spec->catfile($FindBin::Bin,'original-r4-period-dragon-dignity-probe.pl');
my $raw=qx{perl "$f"};
is($?,0,'frozen period.cgi two prefixes run true drapay IO and dignity rand(100)');
my $x=eval{decode_json($raw)};
ok(!$@&&ref($x)eq'HASH','same original shop/city original dragon/dignity JSON');
if(ref($x)eq'HASH'){
  is(scalar(@{$x->{cases}}),2,'two real full pre-backup source periods');
  my($first,$second)=@{$x->{cases}};
  is($first->{input}{shop}{dignity},26,'initial source dignity 26');
  is($first->{output}{shop}{dignity},23,
    'first period rand(100) hit reduces dignity 3');
  is($second->{input}{shop}{dignity},23,
    'second period inherits source first dignity');
  is($second->{output}{shop}{dignity},23,
    'second rand(100) fails source less-than-25 threshold');
  is($first->{output}{drawsUsed},4,'first period uses rank rand(9), dignity rand(100), and two city rand(200)');
  is($second->{output}{drawsUsed},4,'second period preserves source RNG count');
  is($first->{output}{shop}{dragon},500,
    'first source dragon+500 coexists with dignity');
  is($second->{output}{shop}{dragon},-500,
    'second source dragon-500 after prior accumulator');
  is($second->{output}{shop}{drmoney},0,
    'source dragon cumulative money returns to zero');
  is($second->{output}{shop}{payyesterday},517,
    'second original dragon expense 500 and maintenance 17');
  ok($first->{output}{dragonPayoutFileConsumed},
    'first actual DragonBalance unlinks payout file');
  ok($second->{output}{dragonPayoutFileConsumed},
    'second actual DragonBalance unlinks payout file');
  is($second->{output}{shop}{rankingcount},2,
    'two original period rank winners counted sequentially');
}
done_testing();
