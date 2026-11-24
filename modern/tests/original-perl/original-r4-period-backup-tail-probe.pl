use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use File::Temp qw(tempdir);
use File::Path qw(make_path);
use JSON::PP;
binmode STDOUT,':raw';
our ($BACKUP_DIR,$DIR_PERMISSION,$BACKUP,@BACKUP_FILES,
     $SESSION_DIR,$NOW_TIME,$EXPIRE_TIME,@MAKE_GUILD_CALLS);
my @filetypes=qw(log0 log1 log2 guildbal play);
my $base=tempdir('akimono-r4-backup-XXXX',TMPDIR=>1,CLEANUP=>1);
$BACKUP_DIR=File::Spec->catdir($base,'backup');
$SESSION_DIR=File::Spec->catdir($base,'session');
my $current=File::Spec->catdir($base,'current');
make_path($SESSION_DIR,$current);
$DIR_PERMISSION=0777;
$BACKUP=3;
$EXPIRE_TIME=3600*24*7;
@BACKUP_FILES=@filetypes;
sub readSource{
  my($file)=@_;
  open my $fd,'<:encoding(UTF-8)',
    File::Spec->catfile($FindBin::Bin,$file) or die $!;
  my $txt; {local $/;$txt=<$fd>;} close $fd;
  return $txt;
}
my $source=readSource('period.cgi');
my $config=readSource('../../../_config.cgi');
for my $piece(
  '$BACKUP'."\t\t=3;",
  '$EXPIRE_TIME'."\t=3600*24*7;",
  '@BACKUP_FILES',
  '$GUILDBAL_FILE',
){
  die "original backup configuration source drift $piece"
    unless index($config,$piece)>=0;
}
my $start=index($source,'#データバックアップ');
my $end=index($source,"\n1;",$start);
die 'actual frozen backup/session source absent'
  unless $start>=0&&$end>$start;
my $original=substr($source,$start,$end-$start);
die 'original source did not rotate generation three'
  unless index($original,'rename($BACKUP_DIR.$BACKUP,$BACKUP_DIR."_work");')>=0;
die 'original source did not expire session by actual file mtime'
  unless index($original,'unlink $_ if (stat($_))[9]<$sessiontimeout;')>=0;
sub GetPath{
  if(@_==1){
    die 'original GetPath unexpected current file' unless
      grep{$_ eq $_[0]}@filetypes;
    return File::Spec->catfile($current,$_[0]);
  }
  die 'original GetPath unexpected backup generation path'
    unless @_==2&&$_[0] eq $BACKUP_DIR.'1'&&
      grep{$_ eq $_[1]}@filetypes;
  return File::Spec->catfile($_[0],$_[1]);
}
sub MakeGuildFile{
  push @MAKE_GUILD_CALLS,1;
  return 1;
}
my $ok=eval "package main;use utf8;no strict;no warnings;\n".
  "sub OriginalR4BackupTail{\n".$original."\nreturn 1;}\n1;";
die "frozen backup tail failed to compile $@" unless $ok;
sub writeText{
  my($path,$content)=@_;
  open my $fd,'>:encoding(UTF-8)',$path or die $!;
  print $fd $content;
  close $fd or die $!;
}
sub readText{
  my($path)=@_;
  open my $fd,'<:encoding(UTF-8)',$path or die $!;
  my $s;{local $/;$s=<$fd>;} close $fd;
  return $s;
}
sub getBackups{
  my @s;
  for my $n(1..3){
    my $dir=$BACKUP_DIR.$n;
    if(!-d $dir){push @s,undef;next;}
    my %files;
    for my $type(@filetypes){
      my $path=File::Spec->catfile($dir,$type);
      $files{$type}=readText($path) if -f $path;
    }
    push @s,\%files;
  }
  return \@s;
}
sub getSessions{
  opendir my $dir,$SESSION_DIR or die $!;
  my @names=sort grep{$_ ne '.'&&$_ ne '..'}readdir $dir;
  closedir $dir;
  return [map{{
    name=>$_,
    modifiedSeconds=>0+(stat(File::Spec->catfile($SESSION_DIR,$_)))[9],
  }}@names];
}
for my $generation(1..3){
  make_path($BACKUP_DIR.$generation);
  for my $file(@filetypes){
    writeText(File::Spec->catfile($BACKUP_DIR.$generation,$file),
      "起始世代$generation/$file\n");
  }
}
my @seed=(
  ['expired.cgi',195199],
  ['edge.cgi',195200],
  ['future.cgi',650000],
  ['recent.cgi',799900],
  ['.cgi',0],
  ['CAPS.CGI',0],
  ['note.txt',0],
);
for my $row(@seed){
  my $path=File::Spec->catfile($SESSION_DIR,$row->[0]);
  writeText($path,'real source timestamp');
  utime($row->[1],$row->[1],$path) or die $!;
}
my @results;
for my $round(
  {now=>800000,letter=>'甲'},
  {now=>929600,letter=>'乙'},
){
  for my $file(@filetypes){
    writeText(File::Spec->catfile($current,$file),
      "原版新期$round->{letter}/$file\n");
  }
  my %active=map{$_=>readText(File::Spec->catfile($current,$_))}@filetypes;
  my $inputBackups=getBackups();
  my $inputSessions=getSessions();
  $NOW_TIME=$round->{now};
  @MAKE_GUILD_CALLS=();
  OriginalR4BackupTail();
  my $outBackups=getBackups();
  my $outSessions=getSessions();
  my %kept=map{$_->{name}=>1}@$outSessions;
  my @deleted=sort grep{!$kept{$_->{name}}}@$inputSessions;
  push @results,{
    input=>{
      nowSeconds=>$NOW_TIME,activeFiles=>\%active,
      backupGenerations=>$inputBackups,
      sessionFiles=>$inputSessions,
    },
    output=>{
      backupGenerations=>$outBackups,
      deletedSessions=>[map{$_->{name}}@deleted],
      remainingSessions=>$outSessions,
      makeGuildFileCalls=>scalar(@MAKE_GUILD_CALLS),
      actualGuildFileWritten=>JSON::PP::false,
      cutoffSeconds=>$NOW_TIME-$EXPIRE_TIME,
    },
  };
}
print JSON::PP->new->canonical->utf8->encode({
  source=>'actual frozen period.cgi backup tail: real three directory rotations, UTF-8 file copy and stat-mtime session unlink in File::Temp sandbox',
  scope=>'real isolated backup and expired session disk IO with MakeGuildFile call recorder only; no live world or atomic backup transaction',
  files=>\@filetypes,
  cases=>\@results,
});
