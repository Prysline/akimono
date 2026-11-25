use strict;
use warnings;
use utf8;
use FindBin;
use File::Temp qw(tempdir);
use File::Spec;
use Test::More;
our (%GUILD, %GUILD_DATA, $GUILDIDX_dealrate, $GUILDBAL_FILE);
my $dir = tempdir(CLEANUP => 1);
$GUILDBAL_FILE = File::Spec->catfile($dir, 'guildbal.cgi');
sub GetPath { return $_[0]; }
require "$FindBin::Bin/pinned-guild.cgi";

$GUILDIDX_dealrate = 1;
%GUILD = (alpha => ['Alpha', 150, 60], beta => ['Beta', 250, 80]);
my $a = {guild => 'alpha'};
my $b = {guild => 'beta'};
my $none = {guild => ''};
sub reset_ledger {
    my ($cash) = @_;
    %GUILD_DATA = (
        alpha => {money => $cash, in => 0, out => 0, atk => 100, def => 100},
        beta => {money => 20000, in => 0, out => 0, atk => 100, def => 100},
    );
}
reset_ledger(9999);
is_deeply([CheckGuild($none,$a,10000)], [0,1000,0], 'one unassociated shop: neutral');
is_deeply([CheckGuild($a,$none,10000)], [0,1000,0], 'seller unassociated: neutral');
is_deeply([CheckGuild($none,$none,10000)], [0,1000,0], 'both unassociated: neutral');
is_deeply([CheckGuild($a,$a,10000)], [-1,850,0], '9999 treasury loses subsidy but retains adjusted rate');
is_deeply([CheckGuild($a,$a,1)], [1,850,0], 'zero rounded margin skips insufficient subsidy gate');
is_deeply([CheckGuild($a,$b,101)], [2,1250,25], 'different guild uses seller rate, truncates margin');
is_deeply([CheckGuild($b,$a,101)], [2,1150,15], 'reverse direction uses other seller rate');
reset_ledger(10000);
my ($type,$rate,$margin) = CheckGuild($a,$a,10000);
is_deeply([$type,$rate,$margin], [1,850,1500], '10000 exact threshold enables subsidy');
# Apply the actual EditGuildMoney function with the bulk amount from buy-s.cgi.
EditGuildMoney('alpha', -$margin * 8);
is($GUILD_DATA{alpha}{money}, -2000, 'bulk source-style debit can cross below zero');
is($GUILD_DATA{alpha}{out}, 12000, 'bulk subsidy records positive outgo');
is($GUILD_DATA{alpha}{in}, 0, 'debit does not increase income');
my ($other_type,$other_rate,$other_margin) = CheckGuild($a,$b,10000);
is($other_type, 2, 'other guild surcharge does not use buyer subsidy gate');
EditGuildMoney('beta', $other_margin * 3);
is($GUILD_DATA{beta}{money}, 27500, 'seller guild receives surcharge');
is($GUILD_DATA{beta}{in}, 7500, 'surcharge records income');
is($GUILD_DATA{beta}{out}, 0, 'income does not increase outgo');
open my $f, '>:encoding(UTF-8)', $GUILDBAL_FILE or die $!;
print {$f} "alpha\tmoney\t9999\tin\t0\tout\t0\tatk\t100\tdef\t100\n";
close $f or die $!;
%GUILD_DATA = ();
is_deeply([CheckGuild($a,$a,1)], [1,850,0], 'zero margin still invokes lazy real ReadGuildData');
is($GUILD_DATA{alpha}{money}, 9999, 'real ledger was read from disk');
is_deeply([CheckGuild($a,$a,10000)], [-1,850,0], 'reloaded treasury enforces threshold');
done_testing();
