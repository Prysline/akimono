use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use Test::More;
use JSON::PP qw(decode_json);
my $f=File::Spec->catfile($FindBin::Bin,
  'original-r4-period-backup-tail-probe.pl');
my $raw=qx{perl "$f"};
is($?,0,'actual frozen period.cgi backup and expired-session tail executes on real isolated disk');
my $data=eval{decode_json($raw)};
ok(!$@&&ref($data)eq'HASH','original two-round backup file state JSON');
if(ref($data)eq'HASH'){
  is(scalar(@{$data->{cases}}),2,'two periods execute the original entire backup/session tail');
  my($a,$b)=@{$data->{cases}};
  is($a->{output}{backupGenerations}[0]{play},
    "原版新期甲/play\n",
    'first real source backup1 receives original play file');
  is($a->{output}{backupGenerations}[1]{play},
    "起始世代1/play\n",
    'first actual rename moves original backup1 into backup2');
  is($a->{output}{backupGenerations}[2]{play},
    "起始世代2/play\n",
    'first actual rename moves original backup2 into backup3');
  is($b->{output}{backupGenerations}[0]{play},
    "原版新期乙/play\n",
    'second actual source backup1 receives next play');
  is($b->{output}{backupGenerations}[1]{play},
    $a->{output}{backupGenerations}[0]{play},
    'second period rolls actual prior backup1 into backup2');
  is($b->{output}{backupGenerations}[2]{play},
    $a->{output}{backupGenerations}[1]{play},
    'second period rolls actual prior backup2 into backup3');
  is_deeply($a->{output}{deletedSessions},['expired.cgi'],
    'strict session mtime < cutoff deletes only old .cgi in first period');
  is_deeply($b->{output}{deletedSessions},['edge.cgi'],
    'exact threshold mtime survives first period and expires next');
  is($a->{output}{makeGuildFileCalls},1,
    'frozen period calls external MakeGuildFile after session cleanup');
  is($b->{output}{makeGuildFileCalls},1,
    'second frozen period calls external MakeGuildFile once');
  my @left=map{$_->{name}}@{$b->{output}{remainingSessions}};
  ok(grep($_ eq '.cgi',@left),
    'unmodified original regexp does not match name .cgi');
  ok(grep($_ eq 'CAPS.CGI',@left),
    'unmodified original regexp is case-sensitive');
  ok(grep($_ eq 'note.txt',@left),
    'unmodified source leaves non-session text alone');
}
done_testing();
