use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use Test::More;
use JSON::PP qw(decode_json);
my $f=File::Spec->catfile($FindBin::Bin,'original-r4-period-dragon-chain-probe.pl');
my $raw=qx{perl "$f"};
is($?,0,'frozen two full original period prefixes execute actual DragonBalance file and ledger');
my $x=eval{decode_json($raw)};
ok(!$@&&ref($x)eq'HASH','two period original dragon/payout JSON');
if(ref($x)eq'HASH'){
  is(scalar(@{$x->{cases}}),2,'two actual source-backed consecutive periods');
  my($one,$two)=@{$x->{cases}};
  is($one->{output}{shop}{dragon},500,
    'first original period obtains 500 dragon balance from real file');
  is($two->{input}{shop}{dragon},500,
    'second original period begins with prior dragon field');
  is($two->{output}{shop}{dragon},-500,
    'original source subtracts 1000 from persisted dragon on second period');
  is($one->{output}{shop}{drmoney},500,
    'first full period dragon accumulated financial return');
  is($two->{output}{shop}{drmoney},0,
    'second period retains and reverses prior dragon earnings');
  is($two->{output}{shop}{payyesterday},500,
    'second negative dragon payout updates period expense history');
  ok($one->{output}{dragonPayoutFileConsumed},
    'original DragonBalance actually unlinked first temporary payout file');
  ok($two->{output}{dragonPayoutFileConsumed},
    'original DragonBalance actually unlinked second temporary payout file');
  is($one->{output}{drawsUsed},3,
    'original period first award and territory RNG unchanged by dragon file');
  is($two->{output}{drawsUsed},3,
    'original period second award and territory RNG unchanged by dragon file');
  is($two->{input}{shop}{rankingcount},1,
    'second period source shop starts with rank1 prior count');
  is($two->{output}{shop}{rankingcount},2,
    'original full period rank counter advances twice');
}
done_testing();
