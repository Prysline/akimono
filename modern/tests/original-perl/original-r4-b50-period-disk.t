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
  is($o->{lasttimeMtime},$o->{cases}[-1]{input}{nowSeconds},'true lasttime utime');
  if($first){ok(!defined($o->{archive}),'no archive first period')}
  else {like($o->{archive},qr/\Q$o->{cases}[1]{output}{closeArchived}\E/,'real original archive');is($o->{cases}[1]{generations}[1]{play},$o->{initialPlay},'second period backup still previous live')}
}
done_testing();
