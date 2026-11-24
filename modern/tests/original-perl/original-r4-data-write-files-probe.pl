use strict;
use warnings;
use utf8;
use FindBin;
use File::Temp qw(tempdir);
use File::Spec;
use File::Path qw(make_path);
use JSON::PP;
binmode STDOUT, ':raw';

# Executes pinned ORIGINAL write.cgi DataWrite + DataCommitOrAbort,
# original inc-func.cgi AutoVar::Get, DataRead, GetDTPoint, GetPath and
# original core-detail.cgi SortDT. Physical files never leave File::Temp.
our ($DATA_DIR,$TEMP_DIR,$BACKUP_DIR,$FILE_EXT,$DATA_FILE,$COMMIT_FILE,
  $LASTTIME_FILE,$NOW_TIME,$BACKUP_TIME,$DTlasttime,$DTpeople,$DTnextid,
  $DTblockip,$DTTaxrate,$DTState,$DTtown,$MAX_ITEM,$MAX_MONEY,$LOCKED,
  $DTusercount,$STATE,@STATEnamelist,@DTindexnamelist,
  @DTwholestore,%DTevent,@DT,%id2idx,%name2idx,%name2pass);
my $root=tempdir('akimono-r4-dw-perl-XXXX',TMPDIR=>1,CLEANUP=>1);
$DATA_DIR=$root;
$TEMP_DIR=File::Spec->catdir($root,'temp');
$BACKUP_DIR=File::Spec->catdir($root,'backup');
make_path($TEMP_DIR,$BACKUP_DIR);
$FILE_EXT='.cgi';
$DATA_FILE='play';
$COMMIT_FILE='commit';
$LASTTIME_FILE='lasttime';
$BACKUP_TIME=3600;
$NOW_TIME=1000000;
$MAX_ITEM=79;
$MAX_MONEY=1000000000;
$DTlasttime=1000;
$DTpeople=500000;
$DTnextid=3;
$DTblockip='';
$DTTaxrate=0;
$LOCKED=File::Spec->catfile($root,'owned-lock');
$DTtown={};
$DTusercount=2;

sub readSource {
  my ($name)=@_;
  open my $fh,'<:encoding(UTF-8)',File::Spec->catfile($FindBin::Bin,$name)
    or die "source read $name: $!";
  local $/;
  my $data=<$fh>;
  close $fh;
  return $data;
}
sub originalBlock {
  my ($source,$start,$end)=@_;
  my $i=index($source,$start);
  my $j=index($source,$end,$i+length($start));
  die "pinned original source block missing: $start" if $i<0||$j<0;
  return substr($source,$i,$j-$i);
}
my $func=readSource('inc-func.cgi');
my $detail=readSource('core-detail.cgi');
my ($names)=$func=~/\@DTindexnamelist=\s*qw\s*\(([^)]*)\)/s;
my ($stateNames)=$func=~/\@STATEnamelist=\s*qw\s*\(([^)]*)\)/s;
die 'original 32/11 schema missing' unless defined $names && defined $stateNames;
@DTindexnamelist=split(/\s+/,$names=~s/^\s+|\s+$//gr);
@STATEnamelist=split(/\s+/,$stateNames=~s/^\s+|\s+$//gr);
die 'schema drift' unless @DTindexnamelist==32 && @STATEnamelist==11;

for my $block (
  originalBlock($func,"sub GetPath\n{", "#携帯端末系"),
  originalBlock($func,"sub DataRead\n{","sub GetDTPoint"),
  originalBlock($func,"sub GetDTPoint\n{","sub CheckUserPass"),
  originalBlock($detail,"sub SortDT\n{","sub GetRankMessage"),
  substr($func,index($func,'package AutoVar;')),
) {
  my $ok=eval "package main; no strict; no warnings; use utf8;\n".
    $block."\n1;";
  die "pinned Perl original block did not compile: $@" unless $ok;
}
require File::Spec->catfile($FindBin::Bin,'write.cgi');
require File::Spec->catfile($FindBin::Bin,'lock.cgi');

sub putFile {
  my($file,$content)=@_;
  open my $fh,'>:raw',$file or die "write $file: $!";
  print {$fh} $content;
  close $fh or die "close $file: $!";
}
sub readFile {
  my($file)=@_;
  open my $fh,'<:raw',$file or die "read $file: $!";
  local $/;my $s=<$fh>;close $fh;
  return Encode::decode('UTF-8',$s,Encode::FB_CROAK());
}
sub copyData {
  my($value)=@_;
  return JSON::PP->new->utf8->decode(
    JSON::PP->new->canonical->utf8->encode($value)
  );
}
putFile($LOCKED,'held');
my $lasttimeFile=File::Spec->catfile($root,'lasttime.cgi');
putFile($lasttimeFile,'old mtime');
my $backupFile=File::Spec->catfile($BACKUP_DIR,'play.cgi');
putFile($backupFile,'fresh backup');
utime($NOW_TIME-100,$NOW_TIME-100,$backupFile) or die "backup utime $!";
my %initial=map{$_=>0}@DTindexnamelist;
$initial{id}=1;
$initial{status}=1;
$initial{name}='alice';
$initial{shopname}='source shop';
$initial{money}=17200;
$initial{foundation}=100;
$initial{rank}=1;
$initial{rankingcount}=1;
$initial{showcasecount}=1;
$initial{showcase}=[0];
$initial{price}=[100];
$initial{item}=[(0)x79];
$initial{itemyesterday}={};
$initial{itemtoday}={};
$initial{exp}={};
$initial{user}={};
$initial{guild}='';
my %closed=%initial;
$closed{id}=2;
$closed{name}='closed';
$closed{status}=0;
$closed{money}=0;
@DT=(\%initial,\%closed);
%id2idx=(1=>0,2=>1);
%name2idx=(alice=>0,closed=>1);
@DTwholestore=(0)x79;
%DTevent=();
$STATE={map{($_,0)}@STATEnamelist};
my @cases;
for my $round(1..2) {
  if($round==2) {
    # Truly load the first committed play.cgi with pinned original DataRead;
    # continue the SAME shop/state rather than reset or use a second fixture.
    @DT=();%id2idx=();%name2idx=();%name2pass=();
    DataRead();
    die 'source reload did not retain one active shop'
      unless @DT==1 && $DT[0]{id}==1;
    $DT[0]{money}=16900;
    $DT[0]{saletoday}=100;
    $DTlasttime=2000;
  }
  my $input=copyData({
    lasttime=>0+$DTlasttime,people=>0+$DTpeople,
    nextid=>0+$DTnextid,blockip=>"$DTblockip",
    taxRate=>0+$DTTaxrate,state=>$STATE,
    wholesale=>\@DTwholestore,events=>\%DTevent,town=>$DTtown,
    shops=>\@DT,
  });
  DataWrite();
  my $staged=readFile(File::Spec->catfile($TEMP_DIR,'play.cgi'));
  DataCommitOrAbort(0);
  my $live=readFile(File::Spec->catfile($root,'play.cgi'));
  die 'actual frozen Perl staging differs from committed bytes'
    unless $live eq $staged;
  push @cases,{
    input=>$input,staged=>$staged,live=>$live,
    commitMarkerGone=>(!-e File::Spec->catfile($root,'commit.cgi'))
      ? JSON::PP::true : JSON::PP::false,
    stagedMoved=>(!-e File::Spec->catfile($TEMP_DIR,'play.cgi'))
      ? JSON::PP::true : JSON::PP::false,
  };
}
print JSON::PP->new->canonical->utf8->encode({
  source=>'pinned write.cgi::DataWrite/DataCommitOrAbort with pinned inc-func DataRead, GetPath, AutoVar and original SortDT',
  scope=>'two real isolated play.cgi staged/renamed filesystem writes and original DataRead restart; no guild/army/archive IO or production atomic CAS',
  cases=>\@cases,
});
