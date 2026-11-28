use strict;
use warnings;
use utf8;
use FindBin;
use File::Temp qw(tempdir);
use Digest::SHA qw(sha1_hex);
use Test::More;
our($COMMON_DIR,$COTEMP_DIR,$NOW_TIME,$LOG_EXPIRE_TIME,@DLOG,@trace,$fail_second);
open my $src,'<:raw',"$FindBin::Bin/pinned-drlog.cgi" or die $!;
my $bytes=do {local $/;<$src>};close $src or die $!;
is(sha1_hex('blob '.length($bytes)."\0".$bytes),'e60cda027c87de25585ee59bf64a4cb24b9d1476','exact frozen drlog source');
sub GetPath {"$_[0]/$_[1].cgi"}
sub RenameAndCheck {
  my($from,$to)=@_;push @trace,'rename';
  # Insert obstruction after first successful real rename, not a fake success.
  mkdir $to or die $! if $fail_second && @trace==2;
  rename($from,$to) or die "SOURCE_RENAME_FAILED\n";
}
sub OpenAndCheck {
  push @trace,'open-stage';
  open(OUT,'>:encoding(UTF-8)',$_[0]) or die "SOURCE_STAGE_FAILED\n";
}
require "$FindBin::Bin/pinned-drlog.cgi";
sub put {my($p,$s)=@_;open my $h,'>:raw',$p or die $!;print {$h} $s;close $h or die $!}
sub get {my($p)=@_;open my $h,'<:raw',$p or die $!;my $s=do{local $/;<$h>};close $h or die $!;return $s}
sub setup {
  my $root=tempdir(CLEANUP=>1);$COMMON_DIR="$root/common";$COTEMP_DIR="$root/temp";
  mkdir $_ or die $! for($COMMON_DIR,$COTEMP_DIR);
  $NOW_TIME=1000000;$LOG_EXPIRE_TIME=100;@DLOG=("new\n");@trace=();$fail_second=0;
  for my $i(0..2){my $p=GetPath($COMMON_DIR,"dra-log$i");put($p,"old$i\n");utime(999000,999000,$p) or die $!}
}
setup();
$fail_second=1;
eval{RenewDraLog()};like($@,qr/SOURCE_RENAME_FAILED/,'second actual rename denied by destination directory');
is_deeply(\@trace,['rename','rename'],'no stage after second rename fails');
is(get(GetPath($COMMON_DIR,'dra-log2')),"old1\n",'first live move already replaced old generation');
is(get(GetPath($COMMON_DIR,'dra-log0')),"old0\n",'failed second move retains original live log0');
ok(!-e GetPath($COTEMP_DIR,'dra-log0'),'no stage produced');
setup();
mkdir GetPath($COTEMP_DIR,'dra-log0') or die $!;
eval{RenewDraLog()};like($@,qr/SOURCE_STAGE_FAILED/,'stage open denied by directory');
is_deeply(\@trace,['rename','rename','open-stage'],'both live moves precede failing stage open');
ok(!-e GetPath($COMMON_DIR,'dra-log0'),'live log0 already moved before stage failure');
is(get(GetPath($COMMON_DIR,'dra-log1')),"old0\n",'old log0 survives in rotated generation1');
is(get(GetPath($COMMON_DIR,'dra-log2')),"old1\n",'old log1 survives in rotated generation2');
is_deeply(\@DLOG,["new\n"],'new log only in memory at failure boundary');
# No claim of source lock/retry/commit or modern crash recovery: this is only
# actual RenewDraLog plus real failing syscalls through trace adapters.
done_testing();
