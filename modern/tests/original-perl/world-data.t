use strict;
use warnings;
use utf8;
use Test::More;
use File::Temp qw(tempdir);
use File::Spec;

binmode STDOUT, ':encoding(UTF-8)';

# Run the unmodified original Core plug/write.cgi::DataWrite using only
# isolated temporary files and explicit IO/lock/backup stand-ins.
# This does NOT execute the HTTP CGI, authentication, original DataRead,
# DataCommitOrAbort or a real persistent game world.
our ($TEMP_DIR,$DATA_DIR,$DATA_FILE,$BACKUP_DIR,$BACKUP_TIME,
     $NOW_TIME,$LASTTIME_FILE,$DTlasttime,$DTpeople,$DTnextid,$DTblockip,
     $DTTaxrate,$DTState,$DTtown,$STATE,$LOCKED);
our (@STATEnamelist,@DTwholestore,@DT,%DTevent);
my $temporary=tempdir(CLEANUP=>1);
$TEMP_DIR=$temporary;
$DATA_DIR=$temporary;
$DATA_FILE='world.cgi';
$BACKUP_DIR=File::Spec->catdir($temporary,'backup');
mkdir $BACKUP_DIR or die $!;
$LASTTIME_FILE=File::Spec->catfile($temporary,'lasttime');
$NOW_TIME=1_700_000_000;
$BACKUP_TIME=3600;
$DTlasttime=1_699_999_999;
$DTpeople=100000;
$DTnextid=4;
$DTblockip=0;
$DTTaxrate=10;
$DTtown='opaque-town';
$LOCKED='';
@STATEnamelist=('leader');
$STATE={leader=>2};
@DT=();
%DTevent=();
@DTwholestore=(0)x79;
$DTwholestore[0]=20;   # item 1
$DTwholestore[9]=7;    # item 10
$DTwholestore[78]=5;   # item 79

{ package AutoVar;
  sub Get { my $ref=$_[0]; return $$ref // ''; }
}

sub GetPath {
  return File::Spec->catfile(@_);
}
sub SortDT {}
sub DataFilesBackup { die 'unexpected backup path'; }
sub OpenAndCheck {
  my ($p)=@_;
  open(OUT,'>:encoding(UTF-8)',$p) or die "cannot write temporary $p: $!";
}
# Create a current backup fixture so Core DataWrite does not perform backup.
my $backup=File::Spec->catfile($BACKUP_DIR,$DATA_FILE);
open(my $backupfh,'>', $backup) or die $!;
print {$backupfh} "backup\n";
close $backupfh;
utime($NOW_TIME,$NOW_TIME,$backup) or die $!;

require './write.cgi';

sub read_temp {
  my $file=File::Spec->catfile($TEMP_DIR,$DATA_FILE);
  open(my $fh,'<:encoding(UTF-8)',$file) or die "cannot read temp world: $!";
  local $/;
  my $text=<$fh>;
  close $fh;
  return $text;
}

DataWrite();
my $first=read_temp();
my @lines=split(/\n/,$first,-1);
is($lines[0],'1699999999','B-12-IO-A: original DataWrite first line is lasttime');
is($lines[1],'100000,4,0,10,2','B-12-IO-B: second line is population and world metadata');
my @saved=split(/,/,$lines[2],-1);
is(scalar(@saved),79,'B-12-IO-C: third line has 79 whole-store CSV slots');
is_deeply([@saved[0,9,78]],[20,7,5],'B-12-IO-D: original storage follows item ID minus one');
is($lines[3],'','B-12-IO-E: empty event section remains after stock');
is($lines[4],'opaque-town','B-12-IO-F: town data remains after event');
is($lines[5],'//','B-12-IO-G: original shop-section delimiter follows town');
is($lines[6],'','B-12-IO-H: no imaginary shop record inserted');

$DTwholestore[9]=8;
DataWrite();
my $second=read_temp();
my @again=split(/\n/,$second,-1);
is((split(/,/,$again[2],-1))[9],8,'B-12-IO-I: second DataWrite reflects updated wholesale stock');
is($again[1],$lines[1],'B-12-IO-J: other original metadata unchanged');

# No commit: only temporary directory is used; real Core state is untouched.
ok(-e File::Spec->catfile($TEMP_DIR,$DATA_FILE),
  'B-12-IO-K: world output exists only in isolated temporary directory');
done_testing();
