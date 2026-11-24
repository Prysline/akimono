use strict;
use warnings;
use utf8;
use Test::More;
use File::Temp qw(tempdir);
use File::Spec;

binmode STDOUT, ':encoding(UTF-8)';

# Isolated original Core plug/write.cgi::CheckLockStatus,
# DataFilesBackup and DataWrite. Tests only touch a throwaway File::Temp tree.
# Original backup copies bypass OpenAndCheck and do not check open/print/close.
# This suite deliberately records that unsafe legacy behavior; it is NOT
# a backup engine or a successful full-world write/restore certification.
our ($DATA_DIR,$TEMP_DIR,$BACKUP_DIR,$DATA_FILE,$LASTTIME_FILE,$BACKUP_TIME,
     $NOW_TIME,$DTlasttime,$DTpeople,$DTnextid,$DTblockip,$DTTaxrate,$DTState,
     $DTtown,$STATE,$LOCKED,$LOG_ERROR_FILE);
our (@BACKUP_FILES,@STATEnamelist,@DTwholestore,@DT,%DTevent);

my $root = tempdir(CLEANUP => 1);
$DATA_DIR  = File::Spec->catdir($root,'data');
$TEMP_DIR  = File::Spec->catdir($root,'stage');
$BACKUP_DIR= File::Spec->catdir($root,'backups');
for my $p ($DATA_DIR,$TEMP_DIR,$BACKUP_DIR) { mkdir $p or die $!; }
$DATA_FILE='play';
$LASTTIME_FILE='lasttime';
$BACKUP_TIME=3600;
$NOW_TIME=1_700_000_000;
$DTlasttime=$NOW_TIME-1;
$DTpeople=100000;$DTnextid=2;$DTblockip=0;$DTTaxrate=10;
$DTtown='town';$LOCKED='';
$LOG_ERROR_FILE='error';
@BACKUP_FILES=('log0','log1','log2','guildbal','play');
@STATEnamelist=('leader');
$STATE={leader=>7};
@DTwholestore=(0)x79;
@DT=();
%DTevent=();
my @errors;
my @outErrors;
my @openCalls;

sub GetPath {
  return File::Spec->catfile($DATA_DIR,$_[0].'.cgi') if @_ == 1;
  return File::Spec->catfile(@_[0..$#_-1],$_[-1].'.cgi');
}
sub WriteErrorLog { push @errors, $_[0]; }
sub OutError {
  push @outErrors, $_[0];
  die "original OutError: $_[0]";
}
sub l { return $_[0]; }
sub SortDT {}
sub OpenAndCheck {
  my ($path)=@_;
  die 'not isolated staged output' unless
    $path eq GetPath($TEMP_DIR,$DATA_FILE);
  push @openCalls,$path;
  open(OUT,'>:encoding(UTF-8)',$path) or die "staged open failed: $!";
}
{ package AutoVar;
  sub Get { my ($ref)=@_; return $$ref // ''; }
}

sub put_file {
  my ($path,$body)=@_;
  open(my $fh,'>:encoding(UTF-8)',$path) or die "fixture write $path: $!";
  print {$fh} $body;
  close($fh);
}
sub read_file {
  my ($path)=@_;
  return undef unless -e $path;
  open(my $fh,'<:encoding(UTF-8)',$path) or die "fixture read $path: $!";
  local $/;
  my $body=<$fh>;
  close($fh);
  return $body;
}
sub reset_files {
  for my $dir ($DATA_DIR,$TEMP_DIR,$BACKUP_DIR) {
    next unless -d $dir;
    opendir(my $dh,$dir) or die $!;
    my @names=grep { $_ ne '.' && $_ ne '..' } readdir($dh);
    closedir($dh);
    for my $name (@names) {
      die 'unsafe fixture basename' unless $name=~/\A[a-zA-Z0-9_.-]+\z/;
      unlink(File::Spec->catfile($dir,$name)) or die $!;
    }
  }
  $LOCKED='';
  @errors=();@outErrors=();@openCalls=();
}

require './write.cgi';

# B-15 01..05: the original CheckLockStatus is NOT proof of ownership.
reset_files();
ok(eval { CheckLockStatus();1 },'B-15-A: empty LOCKED bypasses lock verification');
is(scalar(@outErrors),0,'B-15-B: empty LOCKED did not call OutError');

$LOCKED=File::Spec->catfile($DATA_DIR,'lockfile1000_pid');
put_file($LOCKED,'owner');
ok(eval { CheckLockStatus();1 },'B-15-C: an existing owned path passes source check');
unlink($LOCKED) or die $!;
my $missing=eval { CheckLockStatus();1 };
ok(!$missing && $@=~/original OutError/,
  'B-15-D: missing owned lock path fails CheckLockStatus');
like(join('|',@errors),qr/write lock check error/,
  'B-15-E: lost lock was logged');

# B-15 06..12: all five configured types are literal source->backup copies
# made by the unmodified original DataFilesBackup.
reset_files();
my @types=@BACKUP_FILES;
for my $i (0..$#types) {
  put_file(GetPath($types[$i]),"source-$i\n");
  put_file(GetPath($BACKUP_DIR,$types[$i]),"old-$i\n");
}
my @warnings;
{
  local $SIG{__WARN__}=sub { push @warnings, shift };
  DataFilesBackup();
}
is_deeply([map { read_file(GetPath($BACKUP_DIR,$_)) } @types],
  [map {"source-$_\n"} 0..4],
  'B-15-F: original copied all five configured source files');
is(scalar(@warnings),0,'B-15-G: existing source/destination copies had no warnings');
is(read_file(GetPath('play')),"source-4\n",
  'B-15-H: original backup leaves live file unchanged');
is(read_file(GetPath($BACKUP_DIR,'guildbal')),"source-3\n",
  'B-15-I: guild balance is included by configured backup list');

# Missing source: original 'open(IN)' is unchecked, yet output 'open(OUT)'
# succeeds in truncate mode and removes a previously valid backup.
unlink(GetPath('log1')) or die $!;
put_file(GetPath($BACKUP_DIR,'log1'),"valid-previous-backup\n");
my $missingSourceReturned = eval {
  local $SIG{__WARN__}=sub { push @warnings, shift };
  DataFilesBackup(); 1
};
ok($missingSourceReturned,'B-15-J: source backup copy does not abort on missing input');
is(read_file(GetPath($BACKUP_DIR,'log1')),'',
  'B-15-K: missing source silently truncates an existing backup');
is(read_file(GetPath($BACKUP_DIR,'play')),"source-4\n",
  'B-15-L: loop keeps processing later files despite one missing source');

# Missing destination directory: backup open fails. The original function
# returns without throwing; no verified backup is available.
reset_files();
put_file(GetPath('play'),"still-live\n");
rmdir($BACKUP_DIR) or die $!;
my $missingDestReturned=eval {
  local $SIG{__WARN__}=sub { push @warnings, shift };
  local @BACKUP_FILES=('play');
  DataFilesBackup(); 1
};
ok($missingDestReturned,'B-15-M: backup destination open failure does not abort');
ok(!-e GetPath($BACKUP_DIR,'play'),
  'B-15-N: failed destination produces no backup artifact');
is(read_file(GetPath('play')),"still-live\n",
  'B-15-O: live source remains even when backup silently fails');
mkdir($BACKUP_DIR) or die $!;

# B-15 16..22: DataWrite checks LOCKED before the backup and staged open,
# but LOCKED=='' is permitted and a missing/stale backup triggers the copy.
reset_files();
for my $i (0..$#types) {
  put_file(GetPath($types[$i]),"live-$i\n");
}
put_file(GetPath($LASTTIME_FILE),'mtime');
$LOCKED=File::Spec->catfile($DATA_DIR,'no-such-owned-lock');
my $blocked=eval { DataWrite(); 1 };
ok(!$blocked && $@=~/original OutError/,
  'B-15-P: lost lock prevents DataWrite before touching staged world');
ok(!-e GetPath($TEMP_DIR,$DATA_FILE),
  'B-15-Q: blocked DataWrite creates no staged file');
ok(!-e GetPath($BACKUP_DIR,'play'),
  'B-15-R: blocked DataWrite creates no backup');

$LOCKED='';
my $unlocked=eval {
  local $SIG{__WARN__}=sub { push @warnings, shift };
  DataWrite(); 1
};
ok($unlocked,'B-15-S: original DataWrite accepts empty LOCKED and writes');
ok(-e GetPath($TEMP_DIR,$DATA_FILE),
  'B-15-T: unlocked DataWrite produced a staged world file');
is(read_file(GetPath($BACKUP_DIR,'play')),"live-4\n",
  'B-15-U: missing backup mtime triggered original backup copy');
is((split(/\n/,read_file(GetPath($TEMP_DIR,'play'))))[0],
  "$DTlasttime",'B-15-V: original staged world begins with lasttime');

# Existing fresh backup skips the backup loop; this is source mtime behavior
# rather than proof that previous backup content remains valid.
reset_files();
put_file(GetPath('play'),'live-edited');
put_file(GetPath($BACKUP_DIR,'play'),'existing-backup');
utime($NOW_TIME,$NOW_TIME,GetPath($BACKUP_DIR,'play')) or die $!;
$LOCKED='';
my $fresh=eval { DataWrite();1 };
ok($fresh,'B-15-W: fresh backup mtime permits DataWrite');
is(read_file(GetPath($BACKUP_DIR,'play')),'existing-backup',
  'B-15-X: current backup mtime skips backup even if other sources changed');

done_testing();
