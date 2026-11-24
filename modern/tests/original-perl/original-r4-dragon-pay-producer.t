use strict;
use warnings;
use FindBin;
use File::Temp qw(tempdir);
use Digest::SHA qw(sha1_hex);
use Test::More;
our ($COMMON_DIR,$COTEMP_DIR,$FILE_EXT,$COMMIT_FILE,$MYDIR,@DT,%id2idx);
my $root=tempdir(CLEANUP=>1);
$COMMON_DIR="$root/common";$COTEMP_DIR="$root/stage";
mkdir $COMMON_DIR or die $!;mkdir $COTEMP_DIR or die $!;
$FILE_EXT='.cgi';$COMMIT_FILE='commit';
# Sandboxed path/IO adapters: actual files, no production lock, no player data.
sub GetPath { return "$_[0]/$_[1]$FILE_EXT" }
sub OpenAndCheck { open(OUT,'>:encoding(UTF-8)',$_[0]) or die $! }
sub RenameAndCheck { rename($_[0],$_[1]) or die $! }
sub read_bytes {
    open my $f,'<:raw',$_[0] or die $!;
    my $s=do{local $/;<$f>};close $f or die $!;return $s;
}
sub write_bytes {
    open my $f,'>:raw',$_[0] or die $!;print {$f} $_[1];close $f or die $!;
}
sub pinned {
    my($name,$sha)=@_;
    my $s=read_bytes("$FindBin::Bin/$name");
    is(sha1_hex("blob ".length($s)."\0".$s),$sha,"exact $name");
    return $s;
}
pinned('pinned-drlog.cgi','e60cda027c87de25585ee59bf64a4cb24b9d1476');
pinned('pinned-colock.cgi','99ff12db08135879e1a570cef1424f6dd5bec151');
require "$FindBin::Bin/pinned-drlog.cgi";
require "$FindBin::Bin/pinned-colock.cgi";
my $period=pinned('period.cgi','6183e88e9dd69a16606a1064c8084e9a1411dbd5');
my $i=index($period,"sub DragonBalance\n");
die 'DragonBalance not found' if $i<0;
my $ok=eval 'package main; no strict; no warnings; '.substr($period,$i)."\n1;";
die $@ unless $ok;

my $a=GetPath($COMMON_DIR,'drapay-alpha');
my $b=GetPath($COMMON_DIR,'drapay-beta');
my $staged=GetPath($COTEMP_DIR,'dra-dr');
my $live=GetPath($COMMON_DIR,'dra-dr');
my $marker=GetPath($COMMON_DIR,$COMMIT_FILE);
write_bytes($live,"old dragon state\n");
# Original producer writes live payout BEFORE common stage is published.
WritePayLog('alpha',1,500);
WritePayLog('beta',1,-300);
is(read_bytes($a),"1\t500\n",'alpha actual live payout bytes');
is(read_bytes($b),"1\t-300\n",'beta separate street, same shop ID');
ok(!-e GetPath($COTEMP_DIR,'drapay-alpha'),'producer does not stage payment');
write_bytes($staged,"new dragon state\n");
CoDataCA(1); # no marker: original abort removes common stage
ok(!-e $staged,'source abort removes staged dragon state');
is(read_bytes($live),"old dragon state\n",'old dragon state remains after abort');
is(read_bytes($a),"1\t500\n",'live payout survives common abort');
ok(!-e $marker,'no common commit marker after abort');

# Producer retry fixture: same bytes can legitimately occur again; not a real race replay.
WritePayLog('alpha',1,500);
is(read_bytes($a),"1\t500\n1\t500\n",'identical amount appends a second payment row');
write_bytes($staged,"new dragon state\n");
CoDataCA();
is(read_bytes($live),"new dragon state\n",'actual common stage rename publishes dragon state');
ok(!-e $staged && !-e $marker,'source common commit clears stage and marker');
is(read_bytes($a),"1\t500\n1\t500\n",'common commit does not deduplicate live payouts');

$MYDIR='alpha';@DT=({id=>1,dragon=>0});%id2idx=(1=>0);
DragonBalance();
is($DT[0]{dragon},1000,'actual consumer accumulates both identical rows');
ok(!-e $a,'consumer unlinks only alpha payout');
is(read_bytes($b),"1\t-300\n",'beta payout survives alpha consumption');
$MYDIR='beta';@DT=({id=>1,dragon=>0});%id2idx=(1=>0);
DragonBalance();
is($DT[0]{dragon},-300,'beta receives its own negative payout');
ok(!-e $b,'beta consumption removes its own payout');

# Existing marker means original abort call recovers instead of discarding stage.
WritePayLog('alpha',1,200);
write_bytes($staged,"third dragon state\n");
write_bytes($marker,'');
CoDataCA(1);
is(read_bytes($live),"third dragon state\n",'existing common marker drives recovery');
ok(!-e $marker && !-e $staged,'recovery clears marker and stage');
is(read_bytes($a),"1\t200\n",'recovery does not alter separately appended payout');
{
    local $COMMON_DIR="$root/missing";
    my $r=WritePayLog('alpha',1,100);
    ok(!defined($r),'source producer open failure returns without a receipt');
    ok(!-e GetPath($COMMON_DIR,'drapay-alpha'),'failed producer did not create a file');
}
done_testing();
