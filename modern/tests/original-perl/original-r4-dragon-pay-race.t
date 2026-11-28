use strict;
use warnings;
use FindBin;
use File::Temp qw(tempdir);
use Digest::SHA qw(sha1_hex);
use Test::More;
use IO::Handle;
use POSIX qw(_exit);
our ($DATA_DIR,$COMMON_DIR,$COTEMP_DIR,$FILE_EXT,$COMMIT_FILE,$MYDIR,
     $LOCK_FILE,$LOCKED,$LOCKED_LEVEL,$COLOCKED,$COLOCKED_LEVEL,
     $NOW_TIME,$AUTO_UNLOCK_TIME,$LOG_ERROR_FILE,@DT,%id2idx);
our ($pause_path,$ready_write,$release_read);
# Only synchronize the consumer immediately before its real unlink.
# No replacement file bytes, artificial outcomes, or mocked lock/rename.
BEGIN {
    *CORE::GLOBAL::unlink=sub {
        if(defined($pause_path) && @_==1 && $_[0] eq $pause_path){
            print {$ready_write} "READ_DONE\n" or die $!;
            my $signal=<$release_read>;
            die 'producer did not release consumer' unless defined($signal) && $signal eq "COMMITTED\n";
        }
        return CORE::unlink(@_);
    };
}
sub GetPath { return "$_[0]/$_[1]$FILE_EXT" }
sub OutError { die "source error: @_" }
sub l { $_[0] }
sub WriteErrorLog { die "source lock error: @_" }
# Lock() startup's street commit recovery is outside this isolated race.
# There is no staged street file; assert this adapter is only the abort call.
sub DataCommitOrAbort { die 'unexpected street publication' unless @_==1 && $_[0]==1 }
sub read_bytes {
    open my $f,'<:raw',$_[0] or die $!;
    my $s=do{local $/;<$f>};close $f or die $!;return $s;
}
sub write_bytes {
    open my $f,'>:raw',$_[0] or die $!;print {$f} $_[1] or die $!;close $f or die $!;
}
sub pinned {
    my($name,$sha)=@_;
    my $s=read_bytes("$FindBin::Bin/$name");
    is(sha1_hex("blob ".length($s)."\0".$s),$sha,"exact $name");
    return $s;
}
pinned('lock.cgi','84382170f1b7f70348c4e2a91bf30b1d1043b964');
pinned('pinned-colock.cgi','99ff12db08135879e1a570cef1424f6dd5bec151');
pinned('pinned-drlog.cgi','e60cda027c87de25585ee59bf64a4cb24b9d1476');
require "$FindBin::Bin/lock.cgi";
require "$FindBin::Bin/pinned-colock.cgi";
require "$FindBin::Bin/pinned-drlog.cgi";
my $period=pinned('period.cgi','6183e88e9dd69a16606a1064c8084e9a1411dbd5');
my $i=index($period,"sub DragonBalance\n");
die 'DragonBalance not found' if $i<0;
my $ok=eval 'package main; no strict; no warnings; '.substr($period,$i)."\n1;";
die $@ unless $ok;

my $root=tempdir(CLEANUP=>1);
$DATA_DIR="$root/street";$COMMON_DIR="$root/common";$COTEMP_DIR="$root/stage";
mkdir $_ or die $! for ($DATA_DIR,$COMMON_DIR,$COTEMP_DIR);
$FILE_EXT='.cgi';$COMMIT_FILE='commit';$LOCK_FILE='lock.cgi';
$LOCKED=$COLOCKED='';$LOCKED_LEVEL=$COLOCKED_LEVEL=0;
$NOW_TIME=1795650000;$AUTO_UNLOCK_TIME=600;
$ENV{REMOTE_ADDR}='127.0.0.1';
write_bytes("$DATA_DIR/$LOCK_FILE",'');
write_bytes("$COMMON_DIR/$LOCK_FILE",'');
my $a=GetPath($COMMON_DIR,'drapay-alpha');
my $b=GetPath($COMMON_DIR,'drapay-beta');
my $live=GetPath($COMMON_DIR,'dra-dr');
my $stage=GetPath($COTEMP_DIR,'dra-dr');
my $result="$root/consumer-result";
CoLock();
WritePayLog('alpha',1,500);
WritePayLog('beta',1,-300);
write_bytes($stage,"old dragon state\n");
CoDataCA();CoUnLock();
is(read_bytes($a),"1\t500\n",'first original producer payment');

pipe(my $ready_read,$ready_write) or die $!;
pipe($release_read,my $release_write) or die $!;
$ready_write->autoflush(1);$release_write->autoflush(1);
my $pid=fork();
die $! unless defined $pid;
if(!$pid){
    close $ready_read;close $release_write;
    my $success=eval {
        local $SIG{ALRM}=sub{die 'consumer barrier timeout'};
        alarm 30;
        Lock();
        $MYDIR='alpha';@DT=({id=>1,dragon=>0});%id2idx=(1=>0);
        $pause_path=$a;
        DragonBalance();
        undef $pause_path;
        write_bytes($result,"$DT[0]{dragon}\n");
        UnLock();
        alarm 0;
        1;
    };
    if(!$success){print STDERR "$@";_exit(1)}
    _exit(0);
}
close $ready_write;close $release_read;
my $success=eval {
    local $SIG{ALRM}=sub{die 'producer barrier timeout'};
    alarm 30;
    is(scalar(<$ready_read>),"READ_DONE\n",'consumer has read old rows and reached actual unlink');
    ok(!-e "$DATA_DIR/$LOCK_FILE",'consumer holds real street rename lock');
    ok(-e "$COMMON_DIR/$LOCK_FILE",'common lock remains independently available');
    CoLock();
    ok(!-e "$COMMON_DIR/$LOCK_FILE",'producer holds real common lock while street locked');
    WritePayLog('alpha',1,500); # separate legal producer operation, identical row bytes
    is(read_bytes($a),"1\t500\n1\t500\n",'second producer append occurred before unlink');
    write_bytes($stage,"new dragon state\n");
    CoDataCA();CoUnLock();
    is(read_bytes($live),"new dragon state\n",'producer common stage really committed');
    print {$release_write} "COMMITTED\n" or die $!;
    close $release_write;
    waitpid($pid,0);
    is($?,0,'consumer process completed');
    alarm 0;
    1;
};
if(!$success){my $error=$@;kill 'TERM',$pid;waitpid($pid,0);die $error}
is(read_bytes($result),"500\n",'consumer applied only its original read snapshot');
ok(!-e $a,'actual unlink removed both old row and unseen append');
is(read_bytes($b),"1\t-300\n",'other street payout untouched');
ok(-e "$DATA_DIR/$LOCK_FILE" && -e "$COMMON_DIR/$LOCK_FILE",'both lock files restored');
ok(!-e $stage && !-e GetPath($COMMON_DIR,$COMMIT_FILE),'common stage and marker cleared');
diag('SOURCE RACE: committed second payout lost between read and unlink; not genuine player acceptance');
done_testing();
