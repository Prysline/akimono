use strict;
use warnings;
use utf8;
use FindBin;
use File::Temp qw(tempdir);
use File::Path qw(make_path);
use JSON::PP;
binmode STDOUT,':raw';
our ($BACKUP_DIR,$DIR_PERMISSION,$BACKUP,@BACKUP_FILES,$SESSION_DIR,$NOW_TIME,$EXPIRE_TIME);
my $root=tempdir(CLEANUP=>1);
$BACKUP_DIR="$root/backup";$SESSION_DIR="$root/session";$DIR_PERMISSION=0777;$BACKUP=3;$NOW_TIME=1000000;$EXPIRE_TIME=604800;
@BACKUP_FILES=qw(log0 log1 log2 guildbal play);
sub GetPath{return @_==1?"$root/$_[0].cgi":join('/',@_).'.cgi'}
sub MakeGuildFile{}
sub put{my($p,$s)=@_;open my $f,'>:encoding(UTF-8)',$p or die $!;print $f $s;close $f or die $!}
sub get{my($p)=@_;open my $f,'<:encoding(UTF-8)',$p or die $!;local $/;my $s=<$f>;close $f;return $s}
for my $n (1,2,3,'_work'){make_path($BACKUP_DIR.$n);for my $f(@BACKUP_FILES){put(GetPath($BACKUP_DIR.$n,$f),"old-$n-$f\n")}}
make_path($SESSION_DIR);
for my $f(@BACKUP_FILES){put(GetPath($f),"live-$f\n")}
my $period=get("$FindBin::Bin/period.cgi");
my $a=index($period,'#データバックアップ');my $b=index($period,"\n1;",$a);
die 'backup source moved' unless $a>=0&&$b>$a;
my $body=substr($period,$a,$b-$a);
eval "no strict;no warnings;sub ActualBackupTail{\n$body\n}1;" or die $@;
ActualBackupTail();
print JSON::PP->new->canonical->utf8->encode({
 work=>get(GetPath($BACKUP_DIR.'_work','play')),
 gen1=>get(GetPath($BACKUP_DIR.'1','play')),
 gen2=>get(GetPath($BACKUP_DIR.'2','play')),
 gen3=>get(GetPath($BACKUP_DIR.'3','play')),
});
