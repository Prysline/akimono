use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use File::Temp qw(tempdir);
use File::Path qw(make_path);
use Storable qw(dclone);
use Encode qw(decode FB_CROAK);
use JSON::PP;
binmode STDOUT,':raw';

# True pinned unmodified CloseShop + SetUserData (a no-op) + WriteErrorLog.
# Only GetPath / GetTrueIP are injected external context, never IO recorders.
our (@DT,@DTindexnamelist,%id2idx,$SUBDATA_DIR,$LOG_DIR,
     $LOG_DELETESHOP_FILE,$LOG_SIZE_MAX,$NOW_TIME,$USER);
require File::Spec->catfile($FindBin::Bin,'pinned-user.cgi');
require File::Spec->catfile($FindBin::Bin,'pinned-error.cgi');
require File::Spec->catfile($FindBin::Bin,'write.cgi');
sub GetPath {
  die "unexpected original GetPath usage" unless @_==2;
  return File::Spec->catfile($_[0],$_[1].'.cgi');
}
sub GetTrueIP {return '198.51.100.17';}
my $config;
{
  open my $fh,'<:encoding(UTF-8)',
    File::Spec->catfile($FindBin::Bin,'../../../_config.cgi') or die $!;
  local $/;$config=<$fh>;close $fh;
}
die 'original archive name drift' unless
  $config=~/\$LOG_DELETESHOP_FILE\s*=\s*'delete';/;
die 'original LOG_SIZE_MAX drift' unless
  $config=~/\$LOG_SIZE_MAX\s*=\s*30000;/;
$LOG_DELETESHOP_FILE='delete';
$LOG_SIZE_MAX=30000;
$NOW_TIME=900001;
$USER='source-user';
$ENV{SCRIPT_NAME}='/town/inc-turn.cgi';
$ENV{REMOTE_ADDR}='203.0.113.15';
$ENV{REMOTE_HOST}='source-host.invalid';

my $func;
{
  open my $fh,'<:encoding(UTF-8)',File::Spec->catfile($FindBin::Bin,'inc-func.cgi') or die $!;
  local $/;$func=<$fh>;close $fh;
}
my($fields)=$func=~/\@DTindexnamelist=\s*qw\s*\(([^)]*)\)/s;
die 'original index source missing' unless defined $fields;
@DTindexnamelist=grep{length $_}split(/\s+/,$fields);
die 'source 32 index fields changed' unless @DTindexnamelist==32;

sub putFile {
  my($path,$text)=@_;
  open my $fd,'>:encoding(UTF-8)',$path or die "put $path: $!";
  print {$fd} $text;
  close $fd or die $!;
}
sub getFile {
  my($path)=@_;
  return undef unless -f $path;
  open my $fd,'<:encoding(UTF-8)',$path or die $!;
  local $/;my $text=<$fd>;close $fd;
  return $text;
}
sub runCase {
  my($kind)=@_;
  my $base=tempdir('akimono-r4-archive-perl-XXXX',TMPDIR=>1,CLEANUP=>1);
  $LOG_DIR=File::Spec->catdir($base,$kind eq 'missing'?'absent':'log');
  $SUBDATA_DIR=File::Spec->catdir($base,'subdata');
  make_path($SUBDATA_DIR);
  make_path($LOG_DIR) unless $kind eq 'missing';
  my $prior= $kind eq 'append' ? "既有封存\n" :
             $kind eq 'rotate' ? ('X' x 30001) : undef;
  my $oldpath=File::Spec->catfile($LOG_DIR,'delete-old.cgi');
  my $logpath=File::Spec->catfile($LOG_DIR,'delete.cgi');
  putFile($logpath,$prior) if defined $prior;
  for my $name ('1-alpha.cgi','2-keep.cgi') {
    putFile(File::Spec->catfile($SUBDATA_DIR,$name),'real source session');
  }
  my %shop=map{$_=>0}@DTindexnamelist;
  @shop{qw(id name shopname money rank status foundation)}=
    (1,'source-owner','來源原版關店',12345,20,1,555);
  $shop{showcase}=[10];
  $shop{price}=[100];
  $shop{item}=[(0)x79];
  $shop{itemtoday}={10=>2};
  $shop{itemyesterday}={};
  $shop{exp}={10=>999};
  $shop{user}={};
  $shop{guild}='';
  $shop{blocklogin}='';
  my $input=dclone(\%shop);
  @DT=(\%shop);
  %id2idx=(1=>0);
  CloseShop(1,'経営者不在');
  my $after=dclone($DT[0]);
  opendir my $dir,$SUBDATA_DIR or die $!;
  my @left=sort grep{$_ ne '.'&&$_ ne '..'}readdir($dir);
  closedir $dir;
  return {
    kind=>$kind,
    input=>{shop=>$input,reason=>'経営者不在',logPrior=>$prior},
    output=>{
      shop=>$after,liveLog=>getFile($logpath),
      oldLog=>getFile($oldpath),remainingSessions=>\@left,
      setUserDataCreatedFile=>JSON::PP::false,
    },
    context=>{
      nowSeconds=>$NOW_TIME,
      scriptName=>$ENV{SCRIPT_NAME},
      remoteAddress=>$ENV{REMOTE_ADDR},
      remoteHost=>$ENV{REMOTE_HOST},
      trueIp=>GetTrueIP(),user=>$USER,
    }
  };
}
my @cases=map{runCase($_)}qw(empty append rotate missing);
print JSON::PP->new->canonical->utf8->encode({
 source=>'unchanged pinned write.cgi CloseShop, plug/user.cgi SetUserData and plug/error.cgi WriteErrorLog on real isolated log and session files',
 scope=>'one CloseShop actual archive append/rotation plus actual session unlink and missing log directory partial failure; no cross-file atomic or formal WorldState commit',
 cases=>\@cases
});
