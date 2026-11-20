use strict;
use warnings;
use utf8;
use Test::More;
use File::Temp qw(tempdir);
use File::Spec;

binmode STDOUT, ':encoding(UTF-8)';

# Directly execute the frozen original plug/lock.cgi. All renames and opens
# are confined to an automatically deleted File::Temp data directory.
# Stub only external error logging/CGI errors and the recovery callback.
# No real game world files, HTTP CGI, backups or cross-process race tests.
our ($LOCKED,$LOCKED_LEVEL,$LOCK_FILE,$DATA_DIR,$NOW_TIME,
     $AUTO_UNLOCK_TIME,$LOG_ERROR_FILE);
my $root=tempdir(CLEANUP=>1);
$DATA_DIR=File::Spec->catdir($root,'isolated-data');
mkdir $DATA_DIR or die $!;
$LOCK_FILE='lock';
$NOW_TIME=1000;
$AUTO_UNLOCK_TIME=60;
$LOG_ERROR_FILE='test.log';
$LOCKED='';
$LOCKED_LEVEL=0;
$ENV{REMOTE_ADDR}='192.0.2.25';
my @errors;
my @recoveries;

sub l { return $_[0]; }
sub WriteErrorLog { push @errors, shift; }
sub OutError { die "Core OutError: $_[0]"; }
sub DataCommitOrAbort { push @recoveries, $_[0]; }
sub file {
  my $name=shift;
  die 'unsafe test fixture filename' unless $name=~/\A[a-zA-Z0-9_.-]+\z/;
  return File::Spec->catfile($DATA_DIR,$name);
}
sub put {
  my ($name,$text)=@_;
  open(my $fh,'>:raw',file($name)) or die $!;
  print {$fh} $text;
  close($fh);
}
sub value {
  my $name=shift;
  return undef unless -e file($name);
  open(my $fh,'<:raw',file($name)) or die $!;
  local $/;
  my $data=<$fh>;
  close($fh);
  return $data;
}
sub clear_dir {
  opendir(my $dh,$DATA_DIR) or die $!;
  my @names=grep { $_ ne '.' && $_ ne '..' } readdir($dh);
  closedir($dh);
  for my $name (@names) {
    unlink(file($name)) or die $!;
  }
  $LOCKED='';
  $LOCKED_LEVEL=0;
  @errors=();
  @recoveries=();
}
require './lock.cgi';

clear_dir();
put('lock','anchor');
Lock();
is($LOCKED_LEVEL,1,'B-14-A: original Lock takes first lock at level one');
like($LOCKED,qr{\Q$DATA_DIR\E/lock1000_\d+_192\.0\.2\.25\z},
  'B-14-B: lock filename includes now, pid, remote address');
ok(-e $LOCKED,'B-14-C: original lock file is renamed to owned path');
ok(!-e file('lock'),'B-14-D: base anchor disappears while lock is held');
is_deeply(\@recoveries,[1],'B-14-E: first lock invokes DataCommitOrAbort(1)');
my $owned=$LOCKED;
Lock();
is($LOCKED_LEVEL,2,'B-14-F: nested Lock increments level');
is($LOCKED,$owned,'B-14-G: nested Lock does not rename a second time');
is_deeply(\@recoveries,[1],'B-14-H: nested Lock does not rerun recovery');
UnLock();
is($LOCKED_LEVEL,1,'B-14-I: first nested UnLock only decrements depth');
ok(-e $owned,'B-14-J: nested unlock keeps owned file');
UnLock();
is($LOCKED,'','B-14-K: outermost UnLock clears held lock path after rename');
ok(-e file('lock'),'B-14-L: outermost UnLock restores base lock anchor');
ok(!-e $owned,'B-14-M: owned lock suffix is no longer present');
UnLock();
ok(-e file('lock'),'B-14-N: unlocking without ownership is a no-op');

clear_dir();
# All 5 base-lock attempts fail (anchor missing), then the original scans
# a stale lock timestamp and attempts to rename it to this process's path.
put('lock800_555_198.51.100.2','stale');
Lock();
ok(-e $LOCKED,'B-14-O: expired named lock can be reclaimed in isolation');
is_deeply(\@recoveries,[1],'B-14-P: reclaiming stale lock runs recovery');
ok(!-e file('lock800_555_198.51.100.2'),
  'B-14-Q: reclaimed stale lock no longer exists at old path');
UnLock();
ok(-e file('lock'),'B-14-R: reclaimed lock releases back to anchor');

clear_dir();
put('lock999_888_198.51.100.2','recent');
my $busy=eval { Lock(); 1 };
ok(!$busy && $@ =~ /Core OutError: busy/,
  'B-14-S: recent foreign lock refuses acquisition');
is($LOCKED,'','B-14-T: failed busy Lock clears tentative lock identity');
is_deeply(\@recoveries,[],'B-14-U: busy path never performs commit recovery');
ok(-e file('lock999_888_198.51.100.2'),
  'B-14-V: busy refuses to steal recent lock');

clear_dir();
put('source.cgi','payload');
RenameAndCheck(file('source.cgi'),file('dest.cgi'));
ok(!-e file('source.cgi'),'B-14-W: real Core RenameAndCheck removes source');
is(value('dest.cgi'),'payload','B-14-X: real Core rename preserves content');
put('source.cgi','replacement');
RenameAndCheck(file('source.cgi'),file('dest.cgi'));
is(value('dest.cgi'),'replacement',
  'B-14-Y: rename over existing test destination is source behavior');

clear_dir();
my $failed_rename=eval {
  RenameAndCheck(file('missing.cgi'),file('destination.cgi')); 1
};
ok(!$failed_rename && $@ =~ /Core OutError:/,
  'B-14-Z: persistent rename failure ends in original OutError');
like(join('|',@errors),qr/rename error/,
  'B-14-AA: rename failure logs an error before OutError');
ok(!-e file('destination.cgi'),
  'B-14-AB: failed rename does not fabricate destination');

clear_dir();
OpenAndCheck(file('writer.cgi'));
print OUT 'isolated-utf8-data';
close OUT;
is(value('writer.cgi'),'isolated-utf8-data',
  'B-14-AC: original OpenAndCheck opens a writable isolated file');
OpenAndCheck(file('writer.cgi'));
print OUT 'new-data';
close OUT;
is(value('writer.cgi'),'new-data',
  'B-14-AD: open in > mode truncates existing file on success');

my $missing=File::Spec->catfile($DATA_DIR,'missing-parent','out.cgi');
my $bad_open=eval { OpenAndCheck($missing); 1 };
ok(!$bad_open && $@ =~ /Core OutError:/,
  'B-14-AE: repeated write-open failure raises original error');
like(join('|',@errors),qr/write mode open error/,
  'B-14-AF: exhausted OpenAndCheck logs write failure');

clear_dir();
put('lock','owned');
Lock();
my $failed_path=$LOCKED;
unlink($failed_path) or die $!;
UnLock();
is($LOCKED,$failed_path,
  'B-14-AG: original failed UnLock leaves previous owned-path string');
is($LOCKED_LEVEL,0,
  'B-14-AH: original failed UnLock has already decremented depth to zero');
like(join('|',@errors),qr/unlock error/,
  'B-14-AI: original UnLock logs error without raising OutError');
ok(!-e file('lock'),
  'B-14-AJ: failed unlock does not recreate missing anchor');

done_testing();
