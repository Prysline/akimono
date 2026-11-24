use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use Storable qw(dclone);
use File::Temp qw(tempdir);
use File::Path qw(make_path);
use JSON::PP;
binmode STDOUT,':raw';

# B-50: actual frozen Core SortDT before, full in-place period prefix
# (through UpdateResetAfter), Standard Street before/after FUNCUPDATE, and
# AddItem on the same shop and town for two periods. Only IO/DragonBalance/
# unsupported event and guild branches are held outside this source phase.
our (@DT,@ITEM,%id2idx,%name2idx,$STATE,$DTpeople,$DTusercount,
  %GUILD,%GUILD_DATA,%DTevent,$NOW_TIME,$EXPIRE_TIME,
  $DEFINE_FUNCUPDATE,$ITEM_DIR,$MAX_ITEM,@SHOWCASE_COST,
  $PROFIT_DAY_COUNT,$EXP_DOWN_RATE,$EXP_DOWN_POINT,
  $BAL_JOB,$BAL_NAME,$DTTaxrate,$MYDIR,$COMMON_DIR,
  @B50_SAMPLES,$B50_USED,$B50_EXPECTED,
  $GUILDIDX_feerate,@GUILD_IO_CALLS,@TECH_LOGS,
  @CLOSE_CALLS,@CLOSE_PUSH_LOGS,@CLOSE_ARCHIVES,
  @DTindexnamelist,$LOG_DELETESHOP_FILE,$SUBDATA_DIR);
BEGIN{
  no warnings 'redefine';
  *CORE::GLOBAL::rand=sub{
    my($range)=@_;
    die "Unexpected B-50 original period RNG bound $range"
      unless defined($range)&&($range==9||$range==100||$range==200||$range==14000);
    die 'Missing original period RNG sample' unless @main::B50_SAMPLES;
    $main::B50_USED++;
    return shift(@main::B50_SAMPLES)*$range/1000000;
  };
}
sub source {
  my($filename)=@_;
  my $path=File::Spec->catfile($FindBin::Bin,$filename);
  open(my $file,'<:encoding(UTF-8)',$path) or die $!;
  local $/;my $source=<$file>;close($file);return $source;
}
sub l{
  my($v,@args)=@_;
  $v=~s/%([1-9]\d*)/defined($args[$1-1])?$args[$1-1]:''/gex;
  return $v;
}
sub WriteLog{push @TECH_LOGS,[@_];return OriginalWriteLog(@_)}
sub PushLog{push @CLOSE_PUSH_LOGS,[@_];return OriginalPushLog(@_)}
sub SetUserData{
  push @CLOSE_CALLS,0+$_[0]{id};
  return OriginalSetUserData(@_);
}
sub WriteErrorLog{
  push @CLOSE_ARCHIVES,{file=>$_[1],content=>$_[0]};
  return OriginalWriteErrorLog(@_);
}
our ($GUILDBAL_FILE,$GUILD_FILE,$TEMP_DIR,$DATA_DIR,$COMMIT_FILE,$FILE_EXT,$GUILDIDX_name,$GUILDIDX_dealrate,%GUILD_DETAIL,
 $BACKUP_DIR,$BACKUP,$DIR_PERMISSION,@BACKUP_FILES,$SESSION_DIR,$LOG_DIR,$LOG_SIZE_MAX,$USER,$LOG_EXPIRE_TIME,@LOG,
 $DTlasttime,$DTnextid,$DTblockip,$DTState,$DTtown,@DTwholestore,@STATEnamelist,%name2pass,$DATA_FILE,$LASTTIME_FILE,$BACKUP_TIME,$MAX_MONEY,$LOCKED);
my $firstOnly=(@ARGV&&$ARGV[0] eq '--first-only');
my $failMode=(@ARGV&&$ARGV[0] eq '--fail-rename');
my $failRename=0;my $renameCalls=0;
my $ledgerRoot=tempdir('akimono-r4-period-disk-perl-XXXX',TMPDIR=>1,CLEANUP=>1);
$DATA_DIR=$ledgerRoot;$TEMP_DIR="$ledgerRoot/stage";$COMMON_DIR="$ledgerRoot/common";
$SUBDATA_DIR="$ledgerRoot/subdata";$SESSION_DIR="$ledgerRoot/session";$LOG_DIR="$ledgerRoot/log";$BACKUP_DIR="$ledgerRoot/backup";
make_path($TEMP_DIR,$COMMON_DIR,$SUBDATA_DIR,$SESSION_DIR,$LOG_DIR,$BACKUP_DIR);
$FILE_EXT='.cgi';$GUILDBAL_FILE='guildbal';$GUILD_FILE='guild';$COMMIT_FILE='commit';$DATA_FILE='play';$LASTTIME_FILE='lasttime';
$BACKUP=3;$DIR_PERMISSION=0777;@BACKUP_FILES=qw(log0 log1 log2 guildbal play);
$BACKUP_TIME=3600;$LOG_EXPIRE_TIME=129600;$MAX_MONEY=1000000000;$LOCKED='';$LOG_SIZE_MAX=30000;
$USER='source-user';$ENV{SCRIPT_NAME}='/town/inc-turn.cgi';$ENV{REMOTE_ADDR}='203.0.113.15';$ENV{REMOTE_HOST}='source-host.invalid';
sub GetTrueIP{return '198.51.100.17'}
my @SESSION_NAMES=('1-one.cgi','1-two.cgi','1-.cgi',
  '10-kept.cgi','1-note.txt');
$LOG_DELETESHOP_FILE='delete';
sub sessionNames{
  opendir my $dir,$SUBDATA_DIR or die $!;
  my @names=grep{$_ ne '.'&&$_ ne '..'}readdir($dir);
  closedir $dir;
  return \@names;
}
for my $name(@SESSION_NAMES){
  open my $fd,'>:encoding(UTF-8)',
    File::Spec->catfile($SUBDATA_DIR,$name) or die $!;
  print $fd 'fixture original source session';
  close $fd or die $!;
}
sub RecordedEditGuildMoney {
  push @GUILD_IO_CALLS,[@_];
  return OriginalEditGuildMoney(@_);
}
sub OpenAndCheck {open(OUT,'>:encoding(UTF-8)',$_[0]) or die $!}
sub RenameAndCheck {$renameCalls++;die 'injected final rename failure' if $failRename==$renameCalls;rename($_[0],$_[1]) or die $!}
my $pathSource=source('inc-func.cgi');
my($getPath)=$pathSource=~/(^sub GetPath\n\{[\s\S]*?^\}\n)/m;
die 'GetPath missing' unless $getPath;
eval "no strict;no warnings;$getPath\n1;" or die $@;
sub GetMoneyString {return $_[0]}

my $guildSource=source('pinned-guild.cgi');
$guildSource=~s/sub EditGuildMoney\b/sub OriginalEditGuildMoney/ or die 'guild source moved';
eval "no strict;no warnings;".$guildSource or die $@;
sub EditGuildMoney { RecordedEditGuildMoney(@_) }
eval 'no strict;no warnings;'.source('pinned-guildsub.cgi') or die $@;
for my $pair(['pinned-config.cgi','ReadConfig'],['pinned-sub.cgi','GetString'],['write.cgi','DataCommitOrAbort']){
  my $s=source($pair->[0]);my($fn)=$s=~/(^sub $pair->[1]\n\{[\s\S]*?^\}\n)/m;
  die 'source function missing' unless $fn;
  eval "no strict;no warnings;$fn\n1;" or die $@;
}
sub putGuildFile {my($p,$s)=@_;open my $f,'>:encoding(UTF-8)',$p or die $!;print $f $s;close $f or die $!}
sub getGuildFile {my($p)=@_;open my $f,'<:encoding(UTF-8)',$p or die $!;local $/;my $s=<$f>;close $f;return $s}
sub ledgerSnapshot { return {map {$_=>0+$GUILD_DATA{'guild_a'}{$_}} qw(money in out atk def)} }
sub saveLedger {
  WriteGuildData();
  DataCommitOrAbort(0);
  open my $fd,'<:encoding(UTF-8)',GetPath($GUILDBAL_FILE) or die $!;
  local $/;my $bytes=<$fd>;close $fd;
  ReadGuildData();
  return $bytes;
}
for my $pair(['pinned-user.cgi','SetUserData'],['pinned-error.cgi','WriteErrorLog']){
  my $s=source($pair->[0]);my($fn)=$s=~/(^sub $pair->[1]\n\{[\s\S]*?^\}\n)/m;
  die 'archive source function missing' unless $fn;
  $fn=~s/sub $pair->[1]\b/sub Original$pair->[1]/;
  eval "no strict;no warnings;$fn\n1;" or die $@;
}
eval 'no strict;no warnings;'.source('pinned-custom.cgi') or die $@;
my $logSource=source('pinned-log.cgi');
for my $fnName(qw(PushLog WriteLog RenewLog)){
  my($fn)=$logSource=~/(^sub $fnName\n\{[\s\S]*?^\}\n)/m;
  die 'log source function missing' unless $fn;
  $fn=~s/sub $fnName\b/sub Original$fnName/ unless $fnName eq 'RenewLog';
  eval "no strict;no warnings;$fn\n1;" or die $@;
}
sub OutError{die "original source OutError: $_[0]"}
sub copyJSON{JSON::PP->new->utf8->decode(JSON::PP->new->canonical->utf8->encode($_[0]))}
sub wireWorld{return copyJSON({lasttime=>0+$DTlasttime,people=>0+$DTpeople,nextid=>0+$DTnextid,blockip=>"$DTblockip",taxRate=>0+$DTTaxrate,state=>$STATE,wholesale=>\@DTwholestore,events=>\%DTevent,town=>$DTtown,shops=>\@DT})}
sub backupFiles{my($dir)=@_;return {map{$_=>getGuildFile(GetPath($dir,$_))}@BACKUP_FILES}}
sub generations{return [map{backupFiles($BACKUP_DIR.$_)}1..3]}
sub expiryFiles{
  opendir my $d,$SESSION_DIR or die $!;my @n=sort grep{$_ ne '.'&&$_ ne '..'}readdir $d;closedir $d;
  return [map{{name=>$_,modifiedSeconds=>0+(stat("$SESSION_DIR/$_"))[9]}}@n];
}
my $period=source('period.cgi');
my $detail=source('core-detail.cgi');
my $read=source('inc-func.cgi');
my $write=source('write.cgi');
my($stateNames)=$read=~/\@STATEnamelist=\s*qw\s*\(([^)]*)\)/s;
@STATEnamelist=grep{length $_}split(/\s+/,$stateNames);
die 'state schema drift' unless @STATEnamelist==11;
for my $pair([$write,'DataWrite'],[$write,'DataFilesBackup'],[$write,'CheckLockStatus'],[$read,'DataRead']){
  my($fn)=$pair->[0]=~/(^sub $pair->[1]\n\{[\s\S]*?^\}\n)/m;
  die 'source write/read missing '.$pair->[1] unless $fn;
  eval "no strict;no warnings;$fn\n1;" or die $@;
}
eval 'no strict;no warnings;'.substr($read,index($read,'package AutoVar;')) or die $@;
my($fields)=$read=~/\@DTindexnamelist=\s*qw\(([\s\S]*?)\)\s*;/;
die 'frozen original 32 field archive source missing'
  unless defined $fields;
@DTindexnamelist=grep{length $_}split(/\s+/,$fields);
die 'original shop archive field count drift' unless
  @DTindexnamelist==32;
my $startClose=index($write,"sub CloseShop\n{");
my $endClose=index($write,"\n}\n\n1;",$startClose);
die 'real frozen CloseShop function missing'
  unless $startClose>=0&&$endClose>$startClose;
my $closeBody=substr($write,$startClose,$endClose+2-$startClose);
my $closeOk=eval 'no strict;no warnings;'.$closeBody."\n1;";
die "frozen real CloseShop cannot compile: $@" unless $closeOk;
my $itemDsl=source('../../../custom/inc-item-data.cgi');
my $originalUse=source('use.cgi');
my($getPoint)=$read=~/(^sub GetDTPoint\n\{[\s\S]*?^\}\n)(?=\nsub CheckUserPass)/m;
my($sort)=$detail=~/(^sub SortDT\n\{[\s\S]*?^\}\n)(?=\nsub GetRankMessage)/m;
my($addItem)=$originalUse=~/(^sub AddItem\n\{[\s\S]*?^\}\n)(?=\nsub GetBackUrl)/m;
my($rebelRobin)=$period=~/(^sub RebelRobin\n\{[\s\S]*?^\}\n)(?=\nsub DragonBalance)/m;
my $dragonStart=index($period,"sub DragonBalance\n");
die 'original DragonBalance() function moved' unless $dragonStart>=0;
my $dragonBody=substr($period,$dragonStart);
for my $marker(
  'open(IN,"<:encoding(UTF-8)",$fn) or return;',
  'chop $req[$_];',
  '$DT[$i]->{dragon}+=$buf[1];',
  'unlink $fn;',
){die 'original drapay IO drift' unless index($dragonBody,$marker)>=0;}
die 'B-50 fixed source shared helpers moved' unless
  $getPoint&&$sort&&$addItem&&$rebelRobin;
my $fStart=index($itemDsl,'sub UpdateResetBefore');
my $fEnd=index($itemDsl,"\n\@\@FUNCNEW",$fStart);
die 'Fixed Standard Street complete pre/post period FUNCUPDATE missing'
  unless $fStart>=0&&$fEnd>$fStart;
my $originalUpdate=substr($itemDsl,$fStart,$fEnd-$fStart);
die 'Standard Street post-period after callback missing' unless
  index($originalUpdate,'sub UpdateResetAfter')>=0&&
  index($originalUpdate,'UpdateTodayEraseTech();')>=0;

my %nameToNumber;
my %limits;
my %scale;
for my $block (split /^\@\@ITEM[ \t]*(?:\#.*)?\r?\n/mi,$itemDsl){
  my($id)=$block=~/^\s*no\s+(\d+)\s*(?:#.*)?$/m;
  my($name)=$block=~/^\s*name\s+([^\r\n#]+?)(?:\s*#.*)?$/m;
  my($limit)=$block=~/^\s*limit\s+(\d+)(?:\/[\d.]+)?\s*(?:#.*)?$/m;
  next unless defined($id)&&defined($name);
  $name=~s/\s+$//;
  $nameToNumber{$name}=$id;
  $limits{$id}=$limit if defined($limit);
  my($scale)=$block=~/^\s*scale\s+([^\r\n#]+)/m;
  $scale{$id}=$scale//''; $scale{$id}=~s/\s+$//;
}
die 'B-50 original 79 item limits unavailable' unless
  scalar(keys %limits)==79 && scalar(keys %nameToNumber)==79;
$originalUpdate=~s/\@\@ITEMNO\s*"([^"]+)"/
  exists $nameToNumber{$1}?$nameToNumber{$1}:die("Unrecognized original ITEMNO $1")
/gex;
die 'Other original post-period macro not compiled' if
  $originalUpdate=~/\@\@(ITEMNO|VALUE|FUNC)/;
my $start=index($period,"\tforeach(keys(%GUILD))");
my $stop=index($period,"\t#データバックアップ",$start);
die 'B-50 period entire financial and territory phase moved'
  unless $start>=0&&$stop>$start;
my $tailEnd=index($period,"\n1;",$stop);
die "backup tail missing" unless $tailEnd>$stop;
my $periodBody=substr($period,$start,$tailEnd-$start);
for my $marker (
  '$DT[0]->{rankingcount}++;',
  'UpdateResetBefore() if defined(&UpdateResetBefore);',
  '#前期の情報を保存',
  '#爵位ポイント自然減少',
  'SortDT();',
  '#領土データ調整',
  'UpdateResetAfter() if defined(&UpdateResetAfter);',
){
  die "Original period source marker missing: $marker"
    unless index($periodBody,$marker)>=0;
}
# Preserve the exact order and every statement in the frozen period prefix.
# The only omitted part is the original backup/session/file tail.
my $ok=eval 'no strict; no warnings; '.
  $getPoint."\n".$sort."\n".$addItem."\n".$rebelRobin."\n".
  $dragonBody."\n".$originalUpdate."\n".
  "sub b50_source_original_period {\n".$periodBody."\nreturn 1;\n}\n1;";
die "B-50 original frozen complete in-place prefix failed to compile: $@"
  unless $ok;

$EXPIRE_TIME=3600*24*7;
$PROFIT_DAY_COUNT=3; $EXP_DOWN_RATE=60;$EXP_DOWN_POINT=5;
$MAX_ITEM=79;@SHOWCASE_COST=(0,2000,4000,8000);
$DEFINE_FUNCUPDATE=0; $ITEM_DIR='unreadable-for-B50';
$DTTaxrate=0;$BAL_JOB='';$BAL_NAME='';$MYDIR='street';
@ITEM=(undef,map {{name=>'',limit=>0,scale=>''}} 1..79);
for my $i(1..79){$ITEM[$i]->{limit}=$limits{$i};$ITEM[$i]->{scale}=$scale{$i};}
for my $name (keys %nameToNumber){$ITEM[$nameToNumber{$name}]->{name}=$name;}
my @stateKeys=qw(leader money in out develop devem safety safem army robina robinb);
my @initial=(0,0,0,0,5001,0,5001,0,0,2000,0);
my $initialTown={map {$stateKeys[$_]=>$initial[$_]} 0..$#stateKeys};
my @stock=(0)x79;
$stock[62]=1;$stock[78]=5;
for my $n(18,19,38,24){$stock[$n-1]=1;}
my $originalShop={
  id=>1,status=>1,name=>'來源店主',shopname=>'同一商店',
  foundation=>1000000,lastlogin=>0,blocklogin=>'',
  time=>956800,rank=>5000,money=>100000,rankingcount=>0,
  profitstock=>0,point=>0,
  item=>\@stock,showcasecount=>1,showcase=>[10],price=>[5000],
  guild=>'guild_a',dragon=>0,drmoney=>0,dignity=>26,
  saletoday=>10000,paytoday=>10000,taxtoday=>0,costtoday=>17.875,
  saleyesterday=>0,payyesterday=>0,taxyesterday=>0,costyesterday=>0,
  itemtoday=>{10=>2},itemyesterday=>{},
  rankingyesterday=>'',exp=>{10=>5000},user=>{},
};
# Make all 32 source fields explicit before the first real DataWrite.
for my $k(@DTindexnamelist){$originalShop->{$k}=0 unless exists $originalShop->{$k}}
for my $k(qw(pass comment remoteaddr nocheckip)){$originalShop->{$k}=''}
$STATE=dclone($initialTown);
$DTpeople=500000;$DTusercount=1;
@DT=(dclone($originalShop));%DTevent=();
my $guildConfig="shortname=來源公會\ndealrate=10\nfeerate=50\n";
putGuildFile("$COMMON_DIR/guild_a.pl",$guildConfig);
my $initialDefinition="use utf8;\n".'$GUILDIDX_name=0;$GUILDIDX_dealrate=1;$GUILDIDX_feerate=2;%GUILD=('."'guild_a'=>['來源公會',10,50,],);1;";
putGuildFile(GetPath($GUILD_FILE),$initialDefinition);
eval $initialDefinition or die $@;
ReadGuild('');
%GUILD_DATA=('guild_a'=>{
  money=>1000000,atk=>1000,def=>500,in=>0,out=>0,guild=>'guild_a',
});
$NOW_TIME=870400;$DTlasttime=870400;$DTnextid=2;$DTblockip='';@DTwholestore=(0)x79;$DTtown={};
SetTownData('dominion','guild_a');SetTownData('notice',"原始,100%\n");
putGuildFile(GetPath('lasttime'),'clock');
for my $n(qw(log0 log1 log2)){putGuildFile(GetPath($n),"live-$n\n")}
utime($NOW_TIME,$NOW_TIME,GetPath("log1")) or die $!;
for my $g('',1,2,3){my $dir=$BACKUP_DIR.$g;make_path($dir);for my $n(@BACKUP_FILES){putGuildFile(GetPath($dir,$n),"prior-$g/$n\n")}}
utime($NOW_TIME,$NOW_TIME,GetPath($BACKUP_DIR,'play')) or die $!;
for my $s(['old.cgi',395199],['edge.cgi',395200],['fresh.cgi',900000],['.cgi',0],['note.txt',0]){
  putGuildFile("$SESSION_DIR/$s->[0]",'session');utime($s->[1],$s->[1],"$SESSION_DIR/$s->[0]") or die $!;
}
my $initialWorld=wireWorld();
WriteGuildData();DataWrite();DataCommitOrAbort(0);ReadGuildData();
my $initialLedger=getGuildFile(GetPath($GUILDBAL_FILE));
my $initialPlay=getGuildFile(GetPath('play'));
my $initialBackup=backupFiles($BACKUP_DIR);
my $initialGenerations=generations();
my $initialExpiry=expiryFiles();
my $initialLogs={map{$_=>getGuildFile(GetPath($_))}qw(log0 log1 log2)};
my @rounds=(
  {time=>1000000,award=>0,dignityDraw=>0,
    town=>[250000,750000],payout=>"1\t500\n",
    tech=>[0,500000,999999,250000]},
  {time=>1129600,award=>600000,dignityDraw=>999999,
    town=>[500000,500000],payout=>"1\t1000\n",
    tech=>[]},
);
splice @rounds,1 if $firstOnly;
my @results;
for my $r (@rounds){
  $NOW_TIME=$r->{time};
  my $inputShop=dclone($DT[0]);
  my $inputTown=dclone($STATE);
  my $inputPeople=0+$DTpeople;
  my $guildInput={
    id=>'guild_a',feeRate=>50,
    atk=>0+$GUILD_DATA{'guild_a'}{atk},
    def=>0+$GUILD_DATA{'guild_a'}{def},
  };
  my $ledgerBefore=ledgerSnapshot();
  @GUILD_IO_CALLS=();@TECH_LOGS=();
  @CLOSE_CALLS=();@CLOSE_PUSH_LOGS=();@CLOSE_ARCHIVES=();
  my $sessionInput=sessionNames();
  # Original inc-turn explicitly invokes SortDT immediately before period.
  SortDT();
  my $pointsBefore=$DT[0]->{point};
  my $shopRef=$DT[0];
  my $payout=GetPath($COMMON_DIR,'drapay-'.$MYDIR);
  unlink $payout if -e $payout;
  open my $out,'>:encoding(UTF-8)',$payout or die $!;
  print $out $r->{payout};
  close $out or die $!;
  @B50_SAMPLES=($r->{award},$r->{dignityDraw},
    @{$r->{town}},@{$r->{tech}});
  $B50_USED=0;
  b50_source_original_period();
  die 'frozen DragonBalance() did not remove consumed payout file'
    if -e $payout;
  die 'Actual frozen second-period CloseShop failed to remove the active shop'
    unless @DT==($r->{time}==1000000?1:0);
  die 'Expected source CloseShop stage on second period only'
    unless @CLOSE_CALLS==($r->{time}==1000000?0:1);
  my $sessionAfter=sessionNames();
  my %remain=map{$_=>1}@$sessionAfter;
  die 'Original in-place prefix consumed wrong RNG sequence'
    unless $B50_USED==4+@{$r->{tech}}&&!@B50_SAMPLES;
  die 'early live ledger write' unless getGuildFile(GetPath($GUILDBAL_FILE)) eq $initialLedger;
  die 'early live play write' unless getGuildFile(GetPath('play')) eq $initialPlay;
  my $ledgerBytes=undef;
  die 'period tail did not generate guild stage' unless -f GetPath($TEMP_DIR,$GUILD_FILE);
  push @results,{
    ledgerBefore=>$ledgerBefore,ledgerAfter=>ledgerSnapshot(),ledgerBytes=>$ledgerBytes,
    logRows=>[@LOG],generations=>generations(),expiry=>expiryFiles(),definitionStage=>getGuildFile(GetPath($TEMP_DIR,$GUILD_FILE)),
    input=>{
      shop=>$inputShop,town=>$inputTown,dtPeople=>$inputPeople,
      awardDrawMillionths=>$r->{award},
      territoryDrawMillionths=>$r->{town},
      payoutText=>$r->{payout},
      dignityDrawMillionths=>$r->{dignityDraw},
      guildContext=>$guildInput,
      postTechDraws=>$r->{tech},
      nowSeconds=>$r->{time},
      sessionFileNames=>$sessionInput,
    },
    output=>{
      shop=>@DT?dclone($DT[0]):undef,
      closedShop=>@DT?undef:dclone($shopRef),
      activeShops=>[map{dclone($_)}@DT],
      town=>dclone($STATE),
      dtPeople=>0+$DTpeople,
      pointsBefore=>$pointsBefore,
      pointsAfter=>@DT?0+$DT[0]->{point}:undef,
      drawsUsed=>$B50_USED,
      dragonPayoutFileConsumed=>JSON::PP::true,
      guildContext=>{
        id=>'guild_a',feeRate=>50,
        atk=>0+$GUILD_DATA{'guild_a'}{atk},
        def=>0+$GUILD_DATA{'guild_a'}{def},
      },
      guildMoneyEdits=>[map{{
        guildId=>$_->[0],amount=>0+$_->[1],
      }}@GUILD_IO_CALLS],
      closeCalls=>[map{{
        shopId=>0+$_,
        reason=>(split(/\n/,$CLOSE_ARCHIVES[0]{content}))[0],
      }}@CLOSE_CALLS],
      closeArchived=>@CLOSE_ARCHIVES?$CLOSE_ARCHIVES[0]{content}:undef,
      closeWriteErrorLogCalls=>[map{{file=>$_->{file},content=>$_->{content}}}@CLOSE_ARCHIVES],
      closeSetUserDataCalls=>[map{{shopId=>0+$_}}@CLOSE_CALLS],
      closeDeletedSessions=>[grep{!$remain{$_}}@$sessionInput],
      closeRemainingSessions=>$sessionAfter,
      closeLogs=>[map{[@$_]}grep{
        (@$_>2)&&((($_->[2]//'') =~ /経営者不在のため閉店/))
      }@CLOSE_PUSH_LOGS],
      expiredOwner=>@CLOSE_CALLS?JSON::PP::true:JSON::PP::false,
      techLogs=>[map{[@$_]}grep {
        (($_->[3]//'') =~ /失去了|遺忘了初心/)
      }@TECH_LOGS],
      techLostItemIds=>@DT?[grep {
        $inputShop->{item}[$_-1]>$DT[0]{item}[$_-1]
      }(18,19,38,24)]:[],
    },
  };
}
$DTlasttime=$NOW_TIME;
my $finalWorld=wireWorld();
WriteGuildData();DataWrite();RenewLog();
my $staged={play=>getGuildFile(GetPath($TEMP_DIR,'play')),guildbal=>getGuildFile(GetPath($TEMP_DIR,$GUILDBAL_FILE)),guild=>getGuildFile(GetPath($TEMP_DIR,$GUILD_FILE)),log0=>getGuildFile(GetPath($TEMP_DIR,'log0'))};
my $finalBackup=backupFiles($BACKUP_DIR);
my $lasttimeMtime=0+(stat(GetPath('lasttime')))[9];
my $archive=-f GetPath($LOG_DIR,'delete')?getGuildFile(GetPath($LOG_DIR,'delete')):undef;
my $beforeCommitLogs={map{$_=>(-f GetPath($_)?getGuildFile(GetPath($_)):undef)}qw(log0 log1 log2)};
my $failure;
if($failMode){
  $renameCalls=0;$failRename=3;
  my $ok=eval{DataCommitOrAbort(0);1};
  die 'expected partial original commit' if $ok||!-f GetPath($COMMIT_FILE);
  opendir my $d,$TEMP_DIR or die $!;my @pending=sort grep {/\.cgi$/}readdir $d;closedir $d;
  die 'unexpected partial staged count' unless @pending==2;
  $failure={pending=>\@pending,marker=>JSON::PP::true};
  $failRename=0;DataCommitOrAbort(1);
  die 'marker not cleared' if -e GetPath($COMMIT_FILE);
}else{DataCommitOrAbort(0)}
my $finalLogs={map{$_=>getGuildFile(GetPath($_))}qw(log0 log1 log2)};
my $finalLedger=getGuildFile(GetPath($GUILDBAL_FILE));
my $finalPlay=getGuildFile(GetPath('play'));
# Reset process-owned data before actual source DataRead; no fixture reload.
@DT=();%id2idx=();%name2idx=();%name2pass=();$STATE={};$DTtown={};%DTevent=();@DTwholestore=();%GUILD_DATA=();
DataRead();ReadGuildData();
my $reloaded=wireWorld();
my $reloadedLedger=ledgerSnapshot();
print JSON::PP->new->canonical->utf8->encode({
  initialWorld=>$initialWorld,initialPlay=>$initialPlay,initialBackup=>$initialBackup,initialGenerations=>$initialGenerations,initialExpiry=>$initialExpiry,initialLogs=>$initialLogs,
  beforeCommitLogs=>$beforeCommitLogs,finalLogs=>$finalLogs,failure=>$failure,
  finalWorld=>$finalWorld,finalPlay=>$finalPlay,staged=>$staged,finalBackup=>$finalBackup,lasttimeMtime=>$lasttimeMtime,archive=>$archive,reloaded=>$reloaded,reloadedLedger=>$reloadedLedger,
  logContext=>{scriptName=>$ENV{SCRIPT_NAME},remoteAddress=>$ENV{REMOTE_ADDR},remoteHost=>$ENV{REMOTE_HOST},trueIp=>GetTrueIP(),user=>$USER},
  finalLedger=>$finalLedger,initialDefinition=>$initialDefinition,guildConfig=>$guildConfig,finalDefinition=>getGuildFile(GetPath($GUILD_FILE)),
  source=>'two actual frozen period.cgi prefixes with true original write.cgi CloseShop status/archive/temp-session unlink, subsequent guild/dragon/dignity accounting and genuine SortDT inactive-store removal',
  scope=>'actual B50 period prefix and backup tail, guild files, archive, Session unlink, DataWrite/backup and final real commit/DataRead; controlled source fixture, no full inc-turn or WorldState',
  initialLedger=>$initialLedger,
  itemLimits=>[map {0+$limits{$_}} 1..79],
  cases=>\@results,
});
