use strict;
use warnings;
use FindBin;
use File::Temp qw(tempdir);
use Digest::SHA qw(sha1_hex);
use Test::More;
use Errno qw(EACCES);
our (@DT,%id2idx,$COMMON_DIR,$MYDIR,$fail_unlink,$unlink_attempts);
# Fault injection only for the original compiled sub; normal path calls real unlink.
BEGIN {
    *CORE::GLOBAL::unlink=sub {
        if($main::fail_unlink){$main::unlink_attempts++;$!=EACCES;return 0}
        return CORE::unlink(@_);
    };
}
$COMMON_DIR=tempdir(CLEANUP=>1);$MYDIR='street';
my $payout="$COMMON_DIR/drapay-street";
sub GetPath {die 'unexpected path' unless $_[0] eq $COMMON_DIR && $_[1] eq 'drapay-street';return "$_[0]/$_[1]"}
open my $src,'<:raw',"$FindBin::Bin/period.cgi" or die $!;
my $bytes=do {local $/; <$src>};close $src or die $!;
is(sha1_hex("blob ".length($bytes)."\0".$bytes),'6183e88e9dd69a16606a1064c8084e9a1411dbd5','exact frozen period blob');
my $i=index($bytes,"sub DragonBalance\n");
die 'source missing' if $i<0;
my $fn=substr($bytes,$i);
my $ok=eval 'package main; no strict; no warnings; '.$fn."\n1;";
die $@ unless $ok;
sub write_payout {
    open my $f,'>:raw',$payout or die $!;print {$f} "1\t500\n";close $f or die $!;
}
sub reset_memory {@DT=({id=>1,dragon=>0});%id2idx=(1=>0)}
sub read_payout {open my $f,'<:raw',$payout or die $!;my $s=do{local $/;<$f>};close $f;return $s}
reset_memory();write_payout();$fail_unlink=0;
DragonBalance();
is($DT[0]{dragon},500,'actual source accumulates payout before main publication');
ok(!-e $payout,'actual successful unlink consumes file');
# Explicit crash fixture: discard uncommitted memory, reopen from same initial state.
reset_memory();DragonBalance();
is($DT[0]{dragon},0,'restarting from unpublished prior state cannot recover removed payout');
reset_memory();write_payout();$fail_unlink=1;$unlink_attempts=0;
DragonBalance();
is($DT[0]{dragon},500,'injected unlink failure still leaves payout applied in memory');
is($unlink_attempts,1,'source attempts unlink once');
is(read_payout(),"1\t500\n",'injected syscall failure preserves exact payout bytes');
# Simulate another source period after prior memory state was saved, not real DataRead.
DragonBalance();
is($DT[0]{dragon},1000,'same retained payout accumulates again on another source invocation');
is($unlink_attempts,2,'second invocation attempts unlink again');
$fail_unlink=0;reset_memory();DragonBalance();
is($DT[0]{dragon},500,'retry from uncommitted state can still consume retained payout');
ok(!-e $payout,'successful retry physically removes file');
done_testing();
