use strict;
use warnings;
use utf8;
use FindBin;
use File::Temp qw(tempdir);
use File::Path qw(make_path);
use JSON::PP;
binmode STDOUT,':raw';
our ($DATA_DIR,$BACKUP_DIR,$FILE_EXT,@BACKUP_FILES,$NOW_TIME,$BACKUP_TIME,$DATA_FILE,$LASTTIME_FILE,$DTlasttime);
$FILE_EXT='.cgi';@BACKUP_FILES=qw(log0 log1 log2 guildbal play);$DATA_FILE='play';$LASTTIME_FILE='lasttime';$BACKUP_TIME=3600;$NOW_TIME=1000000;$DTlasttime=999999;
sub GetPath{return @_==1?"$DATA_DIR/$_[0].cgi":join('/',@_).'.cgi'}
sub put{my($p,$s)=@_;open my $f,'>:encoding(UTF-8)',$p or die $!;print $f $s;close $f or die $!}
sub get{my($p)=@_;return undef unless -f $p;open my $f,'<:encoding(UTF-8)',$p or die $!;local $/;my $s=<$f>;close $f;return $s}
require "$FindBin::Bin/write.cgi";
my $source=get("$FindBin::Bin/write.cgi");
my($prelude)=$source=~/(DataFilesBackup\(\) if[^\n]*\n\s*utime\([^\n]*\n)/;
die 'source prelude moved' unless $prelude;
eval "no strict;no warnings;sub OriginalPrelude {\n$prelude\n}1;" or die $@;
my @cases;
for my $mode(qw(older equal newer missing-source destination-directory)){
  my $root=tempdir(CLEANUP=>1);$DATA_DIR=$root;$BACKUP_DIR="$root/backup";make_path($BACKUP_DIR);
  my %live=map{$_=>"正式資料/$_\n"}@BACKUP_FILES;
  my %prior=map{$_=>"舊備份/$_\n"}@BACKUP_FILES;
  for my $n(@BACKUP_FILES){put(GetPath($n),$live{$n});put(GetPath($BACKUP_DIR,$n),$prior{$n})}
  put(GetPath('lasttime'),'clock');
  my $mtime=$mode eq 'equal'?996400:$mode eq 'newer'?996401:996399;
  utime($mtime,$mtime,GetPath($BACKUP_DIR,'play')) or die $!;
  if($mode eq 'missing-source'){unlink GetPath('log1') or die $!;delete $live{log1}}
  if($mode eq 'destination-directory'){unlink GetPath($BACKUP_DIR,'log1') or die $!;mkdir GetPath($BACKUP_DIR,'log1') or die $!;delete $prior{log1}}
  my @warnings;{local $SIG{__WARN__}=sub{push @warnings,$_[0]};OriginalPrelude()}
  push @cases,{mode=>$mode,live=>\%live,prior=>\%prior,mtime=>$mtime,now=>$NOW_TIME,lasttime=>$DTlasttime,
    after=>{map{$_=>get(GetPath($BACKUP_DIR,$_))}@BACKUP_FILES},clock=>0+(stat(GetPath('lasttime')))[9],warnings=>\@warnings};
}
print JSON::PP->new->canonical->utf8->encode({cases=>\@cases});
