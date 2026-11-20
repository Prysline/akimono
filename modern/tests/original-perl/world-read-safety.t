use strict;
use warnings;
use utf8;
use Test::More;
use File::Temp qw(tempdir);
use File::Spec;

binmode STDOUT, ':encoding(UTF-8)';

# Run the verbatim DataRead() SUBROUTINE extracted from the unmodified pinned
# inc-func.cgi. The original file's TOP-LEVEL code cannot be required safely
# because it loads the game configuration, world, items, session and CGI skin.
# Extracting exactly between "sub DataRead" and "sub GetDTPoint" leaves the
# original function BODY unchanged. No network, CGI or actual world is used.
# Missing // can cause the original while-loop never to terminate: each such
# run is protected by alarm(1), without modifying the Core source.
our ($DATA_DIR,$DATA_FILE,$FILE_EXT,$MAX_ITEM,$DTlasttime,$DTpeople,
  $DTnextid,$DTblockip,$DTTaxrate,$DTState,$STATE,$DTtown,$DTusercount,
  $ITEM_DIR,$NOITEM);
our (@DTwholestore,@DT,@STATEnamelist,@DTindexnamelist,%DTevent,
  %id2idx,%name2idx,%name2pass);
my $root=tempdir(CLEANUP=>1);
$DATA_DIR=$root;$DATA_FILE='play';$FILE_EXT='.cgi';$MAX_ITEM=79;
$ITEM_DIR='not-used';
@STATEnamelist=('leader');
@DTindexnamelist=('id','name');
$STATE={};
my @errors;
sub GetPath {
  return $DATA_DIR.'/'.$_[0].$FILE_EXT if @_==1;
  return join('/',@_).$FILE_EXT;
}
sub OutError { push @errors, $_[0]; die "original DataRead OutError: $_[0]"; }
sub GetDTPoint {return 0}
sub put_world {
  my $text=shift;
  open(my $fh,'>:raw',GetPath($DATA_FILE)) or die $!;
  print {$fh} $text;
  close $fh;
}
sub reset_state {
  @errors=();@DTwholestore=();@DT=();%DTevent=();
  $DTlasttime=undef;$DTpeople=undef;$DTnextid=undef;
  $DTblockip=undef;$DTTaxrate=undef;$DTState=undef;$DTusercount=undef;
  $STATE={};
}
# Source is pinned by CI git hash-object and inspected here before evaluating
# ONLY the exact sub body; no arbitrary user-provided Perl is evaluated.
my $original_path='inc-func.cgi';
open(my $sourcefh,'<:encoding(UTF-8)',$original_path) or die $!;
local $/;
my $source=<$sourcefh>;
close($sourcefh);
my ($exact_sub)=$source=~/(^sub DataRead\n\{.*?^\}\n)(?=\nsub GetDTPoint)/ms;
ok(defined($exact_sub),'B-16-A: located exact pinned Core DataRead subroutine');
die 'source subroutine not found' unless defined $exact_sub;
my $loaded=eval "no strict; no warnings;\n$exact_sub\n1;";
die "Cannot compile original DataRead sub: $@" unless $loaded;
ok(defined(&DataRead),'B-16-B: exact unmodified function body is executable');

sub invoke {
  my ($text,$timeout)=@_;
  reset_state();
  if (defined $text) {put_world($text)}
  else {unlink(GetPath($DATA_FILE))}
  my $result;
  my @warn;
  {
    local $SIG{__WARN__}=sub{push @warn,$_[0] if @warn<8};
    local $SIG{ALRM}=sub{die "guarded missing delimiter timeout\n"};
    alarm($timeout // 2);
    $result=eval { DataRead(); 1 };
    my $err=$@;
    alarm(0);
    return ($result,$err,[@warn]);
  }
}

my ($missing,$missingError,$missingWarnings)=invoke(undef);
ok(!$missing,'B-16-C: missing world input is not a successful read');
like($missingError,qr/original DataRead OutError: no data/,
  'B-16-D: missing input reaches original no data error');
ok(!-e GetPath($DATA_FILE),
  'B-16-E: missing source has not been fabricated by original reader');

my ($empty,$emptyError)=invoke('');
ok(!$empty,'B-16-F: empty world input is refused');
like($emptyError,qr/original DataRead OutError: no data/,
  'B-16-G: empty file triggers original no data error');

my $healthy="1700000000\n100000,2,0,10,7\n4,0,3\n\n//\n";
my ($valid,$validError)=invoke($healthy);
ok($valid,'B-16-H: minimal source world with // is accepted by original DataRead');
is($DTlasttime,'1700000000','B-16-I: line one becomes lasttime');
is($DTpeople,'100000','B-16-J: line two population assigned');
is($DTnextid,'2','B-16-K: line two nextid assigned');
is_deeply([@DTwholestore],[4,0,3],
  'B-16-L: sparse line three supplies original wholesale stock');
is($DTusercount,0,'B-16-M: no shop records means zero shops');
is($STATE->{leader},'7','B-16-N: metadata state field is read');

my ($badStock,$badStockError)=invoke(
  "1700000000\n100000,2,0,10,7\n4,garbage,3\n\n//\n");
ok($badStock,'B-16-O: original reader does not check wholesale numeric cells');
is($DTwholestore[1],'garbage',
  'B-16-P: invalid inventory text silently survives raw split');

my ($badMeta,$badMetaError)=invoke(
  "1700000000\nNOT_A_NUMBER,2,0,10,7\n4,0,3\n\n//\n");
ok($badMeta,'B-16-Q: original DataRead does not check numeric metadata');
is($DTpeople,'NOT_A_NUMBER',
  'B-16-R: invalid population text is preserved as Perl string');

# Crucial: lastline missing delimiter would spin in
#   while($DATA[$idx++] ne '//'){}
# because exhausted array slots are undef != '//'. Stop the original
# unmodified function after one second; it must NOT be reused unguarded.
my ($truncated,$truncatedError)=invoke(
  "1700000000\n100000,2,0,10,7\n4,0,3\n\n",1);
ok(!$truncated,'B-16-S: truncated world with no // does not complete');
diag("B-16-S actual error: ".($truncatedError // "<undef>"));
like($truncatedError,qr/guarded missing delimiter timeout/,
  'B-16-T: original unbounded separator search requires external guard');

my ($crlf,$crlfError)=invoke(
  "1700000000\r\n100000,2,0,10,7\r\n4,0,3\r\n\r\n//\r\n",1);
ok(!$crlf,'B-16-U: original LF-only split does not accept CRLF sentinel as //');
diag("B-16-U actual error: ".($crlfError // "<undef>"));
like($crlfError,qr/guarded missing delimiter timeout/,
  'B-16-V: CRLF sentinel is not exact // and can hang source loop');

my ($noShop,$noShopError)=invoke("1700000000\n100000,2,0,10,7\n\n\n//\n");
ok($noShop,'B-16-W: blank wholesale line can be accepted in original');
is(scalar(@DTwholestore),0,
  'B-16-X: original blank stock remains zero-length sparse array');

done_testing();
