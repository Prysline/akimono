use strict;
use warnings;
use utf8;
use Test::More;
use File::Temp qw(tempdir);
use File::Spec;
use File::Basename qw(basename);

binmode STDOUT, ':encoding(UTF-8)';

# Execute the UNMODIFIED Core write.cgi::DataCommitOrAbort in a throwaway
# temp root only. Stub GetPath/OpenAndCheck/RenameAndCheck so no real game
# data, backups, cross-process lock, or CGI HTTP path can ever be touched.
our ($TEMP_DIR,$DATA_DIR,$FILE_EXT,$COMMIT_FILE);
my $root = tempdir(CLEANUP => 1);
$TEMP_DIR=File::Spec->catdir($root,'stage');
$DATA_DIR=File::Spec->catdir($root,'live');
mkdir $TEMP_DIR or die $!;
mkdir $DATA_DIR or die $!;
$FILE_EXT='.cgi';
$COMMIT_FILE=File::Spec->catfile($root,'commit');
my $rename_calls=0;
my $fail_rename_at=0;

sub GetPath { return File::Spec->catfile(@_); }

sub OpenAndCheck {
  my ($path)=@_;
  die "refuse unsafe marker path: $path" if $path ne $COMMIT_FILE;
  open(OUT,'>:raw',$path) or die "marker create failed: $!";
}

sub RenameAndCheck {
  my ($from,$to)=@_;
  die "unsafe source $from" unless index($from,$TEMP_DIR.'/')==0
       && $from eq File::Spec->catfile($TEMP_DIR,basename($from));
  die "unsafe destination $to" unless index($to,$DATA_DIR.'/')==0
       && $to eq File::Spec->catfile($DATA_DIR,basename($to));
  $rename_calls++;
  die "injected second rename failure" if $fail_rename_at
       && $rename_calls==$fail_rename_at;
  rename($from,$to) or die "rename failed: $!";
}

sub file_at {
  my ($dir,$name)=@_;
  return File::Spec->catfile($dir,$name);
}
sub put_file {
  my ($dir,$name,$value)=@_;
  my $path=file_at($dir,$name);
  open(my $fh,'>:raw',$path) or die $!;
  print {$fh} $value;
  close($fh);
  return $path;
}
sub get_file {
  my ($dir,$name)=@_;
  my $path=file_at($dir,$name);
  return undef unless -e $path;
  open(my $fh,'<:raw',$path) or die $!;
  local $/;
  my $data=<$fh>;
  close($fh);
  return $data;
}
sub reset_fixture {
  for my $dir ($TEMP_DIR,$DATA_DIR) {
    opendir(my $dh,$dir) or die $!;
    my @names=grep {$_ ne '.' && $_ ne '..'} readdir($dh);
    closedir($dh);
    for my $name (@names) {
      die 'unsafe fixture name' if $name =~ m{[/\\]};
      unlink(file_at($dir,$name)) or die $!;
    }
  }
  unlink($COMMIT_FILE) if -e $COMMIT_FILE;
  $rename_calls=0;
  $fail_rename_at=0;
}
sub create_marker { return put_file($root,'commit','old marker'); }
sub staged_count {
  opendir(my $dh,$TEMP_DIR) or die $!;
  my @files=grep {$_ ne '.' && $_ ne '..' && /\.cgi$/} readdir($dh);
  closedir($dh);
  return scalar(@files);
}

require './write.cgi';

reset_fixture();
put_file($DATA_DIR,'world.cgi','old-world');
put_file($TEMP_DIR,'world.cgi','new-world');
put_file($TEMP_DIR,'bags.cgi','new-bags');
put_file($TEMP_DIR,'notes.txt','non-core file');
DataCommitOrAbort(0);
is(get_file($DATA_DIR,'world.cgi'),'new-world',
  'B-13-A: normal commit replaces live world with staged file');
is(get_file($DATA_DIR,'bags.cgi'),'new-bags',
  'B-13-B: normal commit moves another staged .cgi file');
is(staged_count(),0,'B-13-C: no pending .cgi file after normal commit');
is(get_file($TEMP_DIR,'notes.txt'),'non-core file',
  'B-13-D: normal commit ignores nonmatching .txt file');
ok(!-e $COMMIT_FILE,'B-13-E: normal commit removes marker after all renames');
is($rename_calls,2,'B-13-F: Core used RenameAndCheck for each selected file');

reset_fixture();
put_file($DATA_DIR,'world.cgi','existing-world');
put_file($TEMP_DIR,'world.cgi','should-abort');
put_file($TEMP_DIR,'bags.cgi','should-abort-too');
put_file($TEMP_DIR,'notes.txt','retained');
DataCommitOrAbort(1);
is(get_file($DATA_DIR,'world.cgi'),'existing-world',
  'B-13-G: abort with no marker preserves existing live world');
is(staged_count(),0,'B-13-H: abort with no marker deletes staged .cgi files');
is($rename_calls,0,'B-13-I: abort branch never calls RenameAndCheck');
is(get_file($TEMP_DIR,'notes.txt'),'retained',
  'B-13-J: abort preserves unrelated nonmatching file');

reset_fixture();
put_file($DATA_DIR,'world.cgi','old-world');
put_file($TEMP_DIR,'world.cgi','recovered-world');
put_file($TEMP_DIR,'bags.cgi','recovered-bags');
create_marker();
DataCommitOrAbort(1);
is(get_file($DATA_DIR,'world.cgi'),'recovered-world',
  'B-13-K: abort with pre-existing marker resumes commit, not discard');
is(get_file($DATA_DIR,'bags.cgi'),'recovered-bags',
  'B-13-L: recovery moves all pending staged files');
ok(!-e $COMMIT_FILE,'B-13-M: marker removed after successful recovery');
is($rename_calls,2,'B-13-N: recovery calls original rename helper twice');

reset_fixture();
put_file($DATA_DIR,'world.cgi','stable-world');
create_marker();
DataCommitOrAbort(1);
ok(!-e $COMMIT_FILE,'B-13-O: stale marker cleared if no staged files');
is(get_file($DATA_DIR,'world.cgi'),'stable-world',
  'B-13-P: no staged file means live world stays unchanged');

reset_fixture();
put_file($TEMP_DIR,'world.cgi','new-world');
put_file($TEMP_DIR,'bags.cgi','new-bags');
$fail_rename_at=2;
my $result=eval { DataCommitOrAbort(0); 1 };
ok(!$result && $@ =~ /injected second rename failure/,
  'B-13-Q: injected second file rename interrupts Core commit');
ok(-e $COMMIT_FILE,
  'B-13-R: marker remains after mid-commit rename exception');
is($rename_calls,2,
  'B-13-S: second rename failure occurs after first file already committed');
is(staged_count(),1,
  'B-13-T: partial commit leaves one staged file awaiting recovery');
my $live_first=defined(get_file($DATA_DIR,'world.cgi')) ||
               defined(get_file($DATA_DIR,'bags.cgi'));
ok($live_first,'B-13-U: at least one live file was already modified');
$fail_rename_at=0;
DataCommitOrAbort(1);
is(get_file($DATA_DIR,'world.cgi'),'new-world',
  'B-13-V: subsequent recovery completes pending world replacement');
is(get_file($DATA_DIR,'bags.cgi'),'new-bags',
  'B-13-W: subsequent recovery completes second file');
ok(!-e $COMMIT_FILE,
  'B-13-X: recovery clears marker after successful remaining rename');

reset_fixture();
# Core grep(/.$FILE_EXT$/) has TWO regex wildcards with FILE_EXT='.cgi'.
# 'strangexcgi' ends with 'excgi' and accidentally matches the original
# permissive selector, even though it does NOT end with literal '.cgi'.
put_file($TEMP_DIR,'strangexcgi','source-regex-wildcard');
DataCommitOrAbort(0);
is(get_file($DATA_DIR,'strangexcgi'),'source-regex-wildcard',
  'B-13-Y: actual Core selector also matches strange suffix via unescaped dots');
ok(!-e $COMMIT_FILE,
  'B-13-Z: marker still cleared after original permissive filename selection');

reset_fixture();
create_marker();
DataCommitOrAbort(0);
ok(!-e $COMMIT_FILE,
  'B-13-AA: no staged file clears marker even when abort=false');

done_testing();
