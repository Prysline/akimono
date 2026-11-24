use strict;
use warnings;
use JSON::PP;
use Test::More;
use FindBin;
sub run {
  open my $p,'-|',$^X,"$FindBin::Bin/original-r4-b50-guild-ledger-probe.pl",@_ or die $!;
  binmode $p,':raw';local $/;my $s=<$p>;close $p or die 'B50 guild probe failed';
  return JSON::PP->new->utf8->decode($s);
}
my $separate=run();my $single=run('--one-turn');
for my $o($separate,$single){
  is(scalar @{$o->{cases}},2,'two source periods');
  my($a,$b)=@{$o->{cases}};
  is_deeply($a->{ledgerAfter},$b->{ledgerBefore},'same original guild ledger continuity');
  is($a->{ledgerAfter}{money},$a->{ledgerBefore}{money}+$a->{output}{guildMoneyEdits}[0]{amount},'first actual EditGuildMoney treasury');
  is($b->{ledgerAfter}{in},$b->{output}{guildMoneyEdits}[0]{amount},'period reset means second income only');
  is($b->{ledgerAfter}{money},$b->{ledgerBefore}{money}+$b->{output}{guildMoneyEdits}[0]{amount},'second actual EditGuildMoney treasury');
  like($o->{finalDefinition},qr/'guild_a'=>/,'actual MakeGuildFile output');
}
ok(defined $separate->{cases}[0]{ledgerBytes},'separate turn actually writes first ledger');
ok(!defined $single->{cases}[0]{ledgerBytes},'one-turn mode defers first ledger write');
is_deeply($single->{cases}[1]{ledgerAfter},$separate->{cases}[1]{ledgerAfter},'final semantic ledger equivalent');
done_testing();
