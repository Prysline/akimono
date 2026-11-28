package OriginalR4CrossPeriodDiskHarness;
use strict;
use warnings;
use utf8;
use FindBin;
use File::Temp qw(tempdir);
use File::Path qw(make_path);
use JSON::PP;
use OriginalGiftMapUseHarness;
our ($root,$callbackRoot,@rows,@files);
sub source {OriginalGiftMapUseHarness::source($_[0])}
sub get {
  open my $f,'<:encoding(UTF-8)',$_[0] or die "$_[0]: $!";
  local $/;my $v=<$f>;close $f or die $!;return $v//'';
}
sub put {
  my($p,$v)=@_;open my $f,'>:encoding(UTF-8)',$p or die "$p: $!";
  print $f $v;close $f or die $!;
}
sub compileFn {
  my($s,$name,$new)=@_;
  my($fn)=$s=~/(^sub \Q$name\E\n\{[\s\S]*?^\}\n)/m;
  die "source disk helper missing $name" unless $fn;
  $fn=~s/^sub \Q$name\E\b/sub $new/ if $new;
  eval "package main;no strict;no warnings;use utf8;\n$fn\n1;" or die "$name: $@";
}
sub snapshot {
  my($dir)=@_;return {map {$_=>get("$dir/$_")} @files};
}
sub prepare {
  my($in,$generated)=@_;
  die 'explicit independent source disk fixture' unless $in->{disk}{initialPlay}&&$in->{settlement};
  $root=tempdir('akimono-r4-cross-source-XXXXXX',TMPDIR=>1,CLEANUP=>1);
  $callbackRoot=$main::ITEM_DIR; # prepare_items installs disabled path; caller restores actual callback directory.
  @files=qw(log0.cgi log1.cgi log2.cgi guildbal.cgi play.cgi);
  @rows=();
  $main::DATA_DIR=$root;$main::TEMP_DIR="$root/stage";$main::BACKUP_DIR="$root/backup";
  $main::COMMON_DIR="$root/common";$main::SESSION_DIR="$root/session";
  $main::DATA_FILE='play';$main::GUILDBAL_FILE='guildbal';$main::GUILD_FILE='guild';
  $main::LASTTIME_FILE='lasttime';$main::COMMIT_FILE='commit';$main::FILE_EXT='.cgi';
  $main::MYDIR='street';$main::BACKUP=3;$main::DIR_PERMISSION=0700;
  @main::BACKUP_FILES=qw(log0 log1 log2 guildbal play);
  $main::BACKUP_TIME=3600;$main::LOG_EXPIRE_TIME=129600;$main::LOCKED='';
  $main::MAX_MONEY=1000000000;
  $main::DTlasttime=$in->{startSeconds};$main::DTnextid=$in->{disk}{nextid};
  $main::DTblockip='';$main::DTTaxrate=0;$main::DTtown={};%main::GUILD_DETAIL=();
  %main::id2idx=($main::DT[0]{id}=>0);
  make_path(map{"$root/$_"} qw(stage backup backup1 backup2 backup3 common session events));
  put("$root/play.cgi",$in->{disk}{initialPlay});
  put("$root/guild.cgi","use utf8;\n".'$GUILDIDX_name=0;$GUILDIDX_dealrate=1;$GUILDIDX_feerate=2;%GUILD=();1;');
  put("$root/guildbal.cgi",'');put("$root/lasttime.cgi",'clock');
  for my $i(0..2){put("$root/log$i.cgi","live-$i\n");}
  for my $g('',1,2,3){for my $n(@files){put("$root/backup$g/$n","prior-$g/$n\n");}}
  my $start=$in->{startSeconds};
  utime($start-7200,$start-7200,"$root/backup/play.cgi") or die $!;
  utime($start-129600,$start-129600,"$root/log1.cgi") or die $!;
  for my $n('old.cgi','edge.cgi','keep.txt'){
    put("$root/session/$n",'source session');
    my $t=$in->{settlement}{commandNowSeconds}-604800-($n eq 'old.cgi'?1:0);
    utime($t,$t,"$root/session/$n") or die $!;
  }
  my $read=source('inc-func.cgi');my $write=source('write.cgi');
  my($fields)=$read=~/\@DTindexnamelist=\s*qw\(([^)]*)\)/s;
  my($state)=$read=~/\@STATEnamelist=\s*qw\(([^)]*)\)/s;
  @main::DTindexnamelist=grep{length}split(/\s+/,$fields);
  @main::STATEnamelist=grep{length}split(/\s+/,$state);
  die 'source disk columns' unless @main::DTindexnamelist==32&&@main::STATEnamelist==11;
  for my $k(@main::DTindexnamelist){die "explicit original shop field $k required" unless exists $main::DT[0]{$k};}
  compileFn($read,'GetPath','R4DiskGetPath');compileFn($read,'DataRead');
  for my $n(qw(DataWrite DataFilesBackup DataCommitOrAbort CheckLockStatus)){compileFn($write,$n)}
  eval 'package main;no strict;no warnings;'.substr($read,index($read,'package AutoVar;')) or die $@;
  compileFn(source('period.cgi')."\n",'DragonBalance');
  my $guild=source('pinned-guildsub.cgi');
  compileFn($guild,'GetGuildDirFiles');compileFn($guild,'MakeGuildFile');
  compileFn(source('pinned-guild.cgi'),'WriteGuildData');
  my $log=source('pinned-log.cgi');
  compileFn($log,'PushLog','R4DiskPushLog');compileFn($log,'RenewLog');
  my $priorPath=\&main::GetPath;
  {
    no warnings 'redefine';
    *main::GetPath=sub {
      return $priorPath->(@_) if @_==3&&$_[1]=~/^event-[sne]$/;
      return "$root/events/$_[2].cgi" if @_==3&&$_[1] eq 'event';
      return main::R4DiskGetPath(@_);
    };
    *main::OpenAndCheck=sub {open(main::OUT,'>:encoding(UTF-8)',$_[0]) or die $!};
    *main::RenameAndCheck=sub {rename($_[0],$_[1]) or die $!};
    *main::OutError=sub {die "source disk error $_[0]"};
    *main::l=sub {my($v,@args)=@_;$v=~s/%([1-9]\d*)/defined($args[$1-1])?$args[$1-1]:''/gex;return $v};
    *main::PushLog=sub {
      push @main::LOG,[@_];
      local @main::LOG=@rows;main::R4DiskPushLog(@_);@rows=@main::LOG;1;
    };
    *main::WriteLog=sub {
      push @main::LOG,[@_];
      local @main::LOG=@rows;main::R4DiskPushLog($_[0],$_[1],$_[3]);@rows=@main::LOG;1;
    };
  }
  for my $code(keys %$generated){put("$root/events/$code.cgi","use utf8;\n".$generated->{$code}."\n1;\n")}
  put("$root/events/happy.cgi","1;\n");
  put("$root/events/rebel.cgi","1;\n") if $in->{externalCandidate};
}
sub finish {
  my($now,$external)=@_;
  $main::DTlasttime=$now;
  main::WriteGuildData();main::DataWrite();
  {local @main::LOG=@rows;main::RenewLog();}
  my $stage={map {$_=>get("$root/stage/$_")} qw(guild.cgi guildbal.cgi play.cgi log0.cgi)};
  $stage->{'army.cgi'}=get("$root/stage/army.cgi") if $external&&-e "$root/stage/army.cgi";
  main::DataCommitOrAbort(0);
  die 'commit marker left behind' if -e "$root/commit.cgi";
  my $live={map {$_=>get("$root/$_")} qw(guild.cgi guildbal.cgi play.cgi log0.cgi log1.cgi log2.cgi)};
  $live->{'army.cgi'}=get("$root/army.cgi") if $external;
  my @generations=map{snapshot("$root/backup$_")}1..3;
  my $backup=snapshot("$root/backup");
  my $mtime=0+(stat("$root/lasttime.cgi"))[9];
  opendir my $d,"$root/session" or die $!;my @sessions=sort grep{$_ ne '.'&&$_ ne '..'}readdir $d;closedir $d;
  @main::DT=();%main::DTevent=();@main::DTwholestore=();$main::STATE={};$main::DTtown={};
  main::DataRead(); # actual original DataRead and AutoVar, including active event require
  my $army;
  if($external){main::ReadArmy();$army={army=>{map{$_=>0+$main::ARMY{$_}}keys %main::ARMY},riot=>[sort{$a<=>$b}map{0+$_}keys %main::RIOT]};}
  my $shop=$main::DT[0];my %scalars=map{$_=>"$shop->{$_}"}@main::DTindexnamelist;
  no warnings 'uninitialized';
  return {($external?(reloadedArmy=>$army,transientArmyPersisted=>exists($shop->{army})?1:0):()),stage=>$stage,live=>$live,generations=>\@generations,backup=>$backup,lasttimeMtime=>$mtime,sessions=>\@sessions,
    rows=>\@rows,reloaded=>{lasttime=>0+$main::DTlasttime,people=>0+$main::DTpeople,events=>{map{$_=>0+$main::DTevent{$_}}keys %main::DTevent},
      state=>{map{$_=>0+$main::STATE->{$_}}@main::STATEnamelist},
      csv=>join(',',@main::DTwholestore),shop=>\%scalars,
      item=>[map{0+$_}@{$shop->{item}}],exp=>{map{$_=>0+$shop->{exp}{$_}}keys %{$shop->{exp}}},
      itemtoday=>{map{$_=>0+$shop->{itemtoday}{$_}}keys %{$shop->{itemtoday}}},
      itemyesterday=>{map{$_=>0+$shop->{itemyesterday}{$_}}keys %{$shop->{itemyesterday}}},
      user=>$shop->{user}}};
}
1;
