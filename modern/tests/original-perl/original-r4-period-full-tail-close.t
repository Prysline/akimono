use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use Test::More;
use JSON::PP qw(decode_json);
my $f=File::Spec->catfile($FindBin::Bin,
  'original-r4-period-full-tail-close-probe.pl');
my $raw=qx{perl "$f"};
is($?,0,'two actual frozen full period source prefixes plus filesystem backup tail execute within one Perl process');
my $o=eval{decode_json($raw)};
ok(!$@&&ref($o)eq'HASH','two full periods with source backup disk oracle JSON');
if(ref($o)eq'HASH'){
  is(scalar(@{$o->{cases}}),2,'two complete original source full-tail rounds');
  my($a,$b)=@{$o->{cases}};
  is($a->{output}{periodBackup}{cutoffSeconds},395200,
    'first original period session expiry cutoff');
  is($b->{output}{periodBackup}{cutoffSeconds},524800,
    'second original period session expiry cutoff');
  is_deeply($a->{output}{periodBackup}{deletedSessions},
    ['old.cgi'],'first source period deletes earlier session');
  is_deeply($b->{output}{periodBackup}{deletedSessions},
    ['edge.cgi'],'second source period deletes threshold survivor');
  is($a->{output}{periodBackup}{makeGuildFileCalls},1,
    'source first round invokes external MakeGuildFile');
  is($b->{output}{periodBackup}{makeGuildFileCalls},1,
    'source second round invokes external MakeGuildFile');
  is($b->{output}{periodBackup}{backupGenerations}[1]{play},
    $a->{output}{periodBackup}{backupGenerations}[0]{play},
    'original second generation one-to-two rename');
  is($b->{output}{periodBackup}{backupGenerations}[2]{play},
    $a->{output}{periodBackup}{backupGenerations}[1]{play},
    'original second generation two-to-three rename');
  ok(!$a->{output}{expiredOwner},'first source period shop remains active');
  ok($b->{output}{expiredOwner},'second source period truly closes shop');
  ok(!defined($b->{output}{shop}),
    'shop pruned after true source CloseShop and before backup');
  is($b->{output}{closedShop}{status},0,
    'true original closed status retained outside active shop list');
  is($b->{output}{drawsUsed},4,
    'after close, original UpdateResetAfter no longer draws tech RNG');
}
done_testing();
