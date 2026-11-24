use strict;
use warnings;
use Test::More;
use JSON::PP;
use FindBin;
sub run {
  open my $p,'-|',$^X,"$FindBin::Bin/original-r4-b50-period-disk-probe.pl",@_ or die $!;
  binmode $p,':raw';local $/;my $s=<$p>;close $p or die 'B50 period disk probe failed';
  return JSON::PP->new->utf8->decode($s);
}
for my $first(1,0){
  my $o=run($first?'--first-only':());
  is(scalar @{$o->{cases}},$first?1:2,'actual source periods');
  is($o->{staged}{play},$o->{finalPlay},'actual play moved');
  is($o->{staged}{guildbal},$o->{finalLedger},'actual guild ledger moved');
  is($o->{staged}{guild},$o->{finalDefinition},'actual guild definition moved');
  is(scalar @{$o->{reloaded}{shops}},$first?1:0,'true DataRead reload active/empty');
  is($o->{finalBackup}{play},$o->{initialPlay},'DataFilesBackup copies previous live play');
  is($o->{finalBackup}{guildbal},$o->{initialLedger},'DataFilesBackup copies previous live ledger');
  is($o->{cases}[-1]{generations}[0]{play},$o->{initialPlay},'period rotation copies previous live play');
  unlike($o->{finalLedger},qr/\tguild\t/,'transient guild field cleared');
  is($o->{staged}{log0},$o->{finalLogs}{log0},'actual RenewLog stage moved');
  if($first){is($o->{finalLogs}{log1},$o->{initialLogs}{log1},'equal log age does not rotate');like($o->{finalLogs}{log0},qr/\Q$o->{initialLogs}{log0}\E\z/,'append previous log0');}
  else {is($o->{finalLogs}{log1},$o->{initialLogs}{log0},'older log1 rotates log0');is($o->{finalLogs}{log2},$o->{initialLogs}{log1},'older log1 becomes log2');}
  is($o->{lasttimeMtime},$o->{cases}[-1]{input}{nowSeconds},'true lasttime utime');
  if($first){ok(!defined($o->{archive}),'no archive first period')}
  else {like($o->{archive},qr/\Q$o->{cases}[1]{output}{closeArchived}\E/,'real original archive');is($o->{cases}[1]{generations}[1]{play},$o->{initialPlay},'second period backup still previous live')}
}
my $failed=run('--fail-rename');
ok($failed->{failure}{marker},'actual source retained marker after third rename failure');
is(scalar @{$failed->{failure}{pending}},2,'two staged files remained');
is($failed->{finalPlay},$failed->{staged}{play},'real original recovery completed play');
is($failed->{finalLedger},$failed->{staged}{guildbal},'real original recovery completed guildbal');
is($failed->{finalLogs}{log0},$failed->{staged}{log0},'real original recovery completed log0');
done_testing();
