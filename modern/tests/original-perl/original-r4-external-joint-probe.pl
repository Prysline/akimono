use strict;
use warnings;
use utf8;
use FindBin;
use File::Temp qw(tempdir);
use File::Spec;
use File::Path qw(make_path);
use JSON::PP;
binmode STDOUT, ':raw';
our @DRAWS;our @RANGES;
BEGIN{no warnings 'redefine';*CORE::GLOBAL::rand=sub(;$){die 'unexpected source RNG' unless @main::DRAWS;my $range=0+($_[0]//1);push @main::RANGES,$range;return shift(@main::DRAWS)*$range/1000000;};}

# Executes pinned ORIGINAL write.cgi DataWrite + DataCommitOrAbort,
# original inc-func.cgi AutoVar::Get, DataRead, GetDTPoint, GetPath and
# original core-detail.cgi SortDT. Physical files never leave File::Temp.
our ($DATA_DIR,$TEMP_DIR,$BACKUP_DIR,$FILE_EXT,$DATA_FILE,$COMMIT_FILE,
  $LASTTIME_FILE,$NOW_TIME,$BACKUP_TIME,$DTlasttime,$DTpeople,$DTnextid,
  $DTblockip,$DTTaxrate,$DTState,$DTtown,$MAX_ITEM,$MAX_MONEY,$LOCKED,
  $DTusercount,$STATE,@STATEnamelist,@DTindexnamelist,
  @DTwholestore,%DTevent,@DT,%id2idx,%name2idx,%name2pass,
  %GUILD,%GUILD_DETAIL,%GUILD_DATA,$GUILD_FILE,$GUILDBAL_FILE,$COMMON_DIR,$GUILDIDX_name,$GUILDIDX_dealrate,$GUILDIDX_feerate,
  %ARMY,%RIOT,%EVENT,@ITEM,@LOG,$TIMESPAN,$temptimenow,$timespan,$ITEM_DIR,$BAL_JOB,$BAL_NAME);
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

require File::Spec->catfile($FindBin::Bin,'pinned-custom.cgi');
require File::Spec->catfile($FindBin::Bin,'pinned-army.cgi');
require File::Spec->catfile($FindBin::Bin,'pinned-guild.cgi');
require File::Spec->catfile($FindBin::Bin,'pinned-guildsub.cgi');
my $conf=readSource('pinned-config.cgi');
my($readConfig)=$conf=~/(^sub ReadConfig\n\{[\s\S]*?^\}\n)/m;
die 'ReadConfig source moved' unless $readConfig;
eval "no strict;no warnings;$readConfig\n1;" or die $@;
my $dsl=readSource('../../../custom/inc-rebel-data.cgi');
my $eventStart=index($dsl,"code\t\tguildbattle");
my $eventBodyStart=index($dsl,"endfunc\t_local_",$eventStart);
my $eventBodyEnd=index($dsl,"\n\t\t\t_local_",$eventBodyStart);
die 'guildbattle source moved' unless $eventBodyStart>=0&&$eventBodyEnd>$eventBodyStart;
my $body=substr($dsl,$eventBodyStart+length("endfunc\t_local_"),$eventBodyEnd-$eventBodyStart-length("endfunc\t_local_"));
my $rebelStart=index($dsl,"code\t\trebel");
my $nowStart=index($dsl,"func\t\t_local_",$rebelStart);
my $nowEnd=index($dsl,"\n\t_local_",$nowStart);
die 'rebel body moved' unless $nowStart>=0&&$nowEnd>$nowStart;
my $nowBody=substr($dsl,$nowStart+length("func\t\t_local_"),$nowEnd-$nowStart-length("func\t\t_local_"));
$ITEM_DIR="$root/item";make_path("$ITEM_DIR/event-e","$ITEM_DIR/event-n");
sub PushLog {push @LOG,[@_];1}
sub RequireFile {die 'unexpected source require' unless $_[0] eq 'inc-event.cgi';1}
sub GetMoneyString {return $_[0]}
my $turn=readSource('inc-turn.cgi');
my $turnStart=index($turn,"#イベント終了処理");
my $turnEnd=index($turn,'$temptimenow+=$timespan;',$turnStart);
die 'turn source moved' unless $turnStart>=0&&$turnEnd>$turnStart;
my $eventBody=substr($turn,$turnStart,$turnEnd-$turnStart);
eval "no strict;no warnings;sub JointEventSlice{\n$eventBody\n}1;" or die $@;
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
putFile(GetPath($ITEM_DIR,"event-e","guildbattle"),Encode::encode('UTF-8',"use utf8;\npackage event;\nsub _local_end{\n$body\n}\n1;"));
putFile(GetPath($ITEM_DIR,"event-n","rebel"),Encode::encode('UTF-8',"use utf8;\npackage event;\nsub _local_now{\n$nowBody\n}\n1;"));
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
$GUILD_FILE='guild';$GUILDBAL_FILE='guildbal';$COMMON_DIR="$root/common";make_path($COMMON_DIR);
my %configs=(alpha=>"shortname=金砂會\ndealrate=10\nfeerate=50\n",beta=>"shortname=赤月會\ndealrate=20\nfeerate=60\n");
my $guildDef="use utf8;\n".'$GUILDIDX_name=0;$GUILDIDX_dealrate=1;$GUILDIDX_feerate=2;%GUILD=('."'alpha'=>['金砂會',10,50,],'beta'=>['赤月會',20,60,],);1;";
my $guildBal="alpha\tmoney\t1000\tin\t0\tout\t0\tatk\t2\tdef\t3\nbeta\tmoney\t2000\tin\t0\tout\t0\tatk\t4\tdef\t5\n";
putFile(GetPath($GUILD_FILE),Encode::encode('UTF-8',$guildDef));
putFile(GetPath($GUILDBAL_FILE),$guildBal);
for my $id(keys %configs){putFile("$COMMON_DIR/$id.pl",Encode::encode('UTF-8',$configs{$id}))}
eval $guildDef or die $@;
$event::GUILDIDX_name=0;
my $armyInitial="1,1000,2,450,9,20\n1,2,9\n";
putFile(GetPath("army"),$armyInitial);
$STATE->{leader}=1;$STATE->{army}=5000;$STATE->{robina}=2000;$STATE->{develop}=5001;$STATE->{safety}=5001;
$BAL_JOB='外敵';$BAL_NAME='首領';
%EVENT=(
  rebel=>{group=>'rebel-group',startproba=>0,basetime=>0,plustime=>0,func=>'_local_now',funcparam=>'',endfunc=>'',startfunc=>'',startmsg=>'',endmsg=>''},
  guildbattle=>{group=>'guild-group',startproba=>0,basetime=>0,plustime=>0,func=>'',endfunc=>'_local_end',endfuncparam=>'',startfunc=>'',startmsg=>'',endmsg=>''}
);
my @cases;
my @changes=(
  [['dominion','alpha'],['notice',"城鎮,100%\n下一行\t"],['zero','0'],['escaped,key','有值'],['delete','old']],
  [['delete',''],['notice','更新:保留冒號'],['new','值']],
);
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
  SortDT();
  ReadGuildData();
  $temptimenow=1000000+3600*($round-1);$timespan=3600;$TIMESPAN=3600;
  %DTevent=(rebel=>2000000,guildbattle=>1003599) if $round==1;
  my $armyLiveBefore=readFile(GetPath("army"));
  my $guildLiveBefore=readFile(GetPath($GUILDBAL_FILE));
  my $before=copyData($DTtown);
  my @returned=map {SetTownData(@$_)} @{$changes[$round-1]};
  my $beforeCallback=copyData($DTtown);
  my $eventInput={startSeconds=>$temptimenow,spanSeconds=>3600,activeUntilSeconds=>$DTevent{rebel},
    guildActiveUntilSeconds=>$DTevent{guildbattle},town=>{map {$_=>0+$STATE->{$_}} keys %$STATE},
    shops=>[map {{id=>0+$_->{id},name=>$_->{name},shopname=>$_->{shopname},money=>0+$_->{money},army=>0+($_->{army}//0)}} @DT]};
  @DRAWS=$round==1?(0):(0,0);@RANGES=();@LOG=();
  JointEventSlice();
  die 'unused event RNG' if @DRAWS;
  die 'joint event fixture should leave no active event' if %DTevent;
  my $eventOutput={town=>{map {$_=>0+$STATE->{$_}} keys %$STATE},
    shops=>[map {{id=>0+$_->{id},name=>$_->{name},shopname=>$_->{shopname},money=>0+$_->{money},army=>0+($_->{army}//0)}} @DT],
    logs=>[@LOG],ranges=>[@RANGES],events=>{%DTevent}};
  my $armyStage=-e GetPath($TEMP_DIR,"army")?readFile(GetPath($TEMP_DIR,"army")):undef;
  WriteGuildData();
  my $guildStage=readFile(GetPath($TEMP_DIR,$GUILDBAL_FILE));
  die 'live army/guild changed before commit' unless readFile(GetPath("army")) eq $armyLiveBefore&&readFile(GetPath($GUILDBAL_FILE)) eq $guildLiveBefore;
  my @lookups=map {GetTownData($_)} ('dominion','notice','zero','escaped,key','escaped%252ckey','delete','new');
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
    before=>$before,changes=>$changes[$round-1],returned=>\@returned,beforeCallback=>$beforeCallback,lookups=>\@lookups,
    eventInput=>$eventInput,eventOutput=>$eventOutput,armyLiveBefore=>$armyLiveBefore,guildLiveBefore=>$guildLiveBefore,
    armyStage=>$armyStage,guildStage=>$guildStage,armyLive=>readFile(GetPath('army')),guildLive=>readFile(GetPath($GUILDBAL_FILE)),
    input=>$input,staged=>$staged,live=>$live,
    commitMarkerGone=>(!-e File::Spec->catfile($root,'commit.cgi'))
      ? JSON::PP::true : JSON::PP::false,
    stagedMoved=>(!-e File::Spec->catfile($TEMP_DIR,'play.cgi'))
      ? JSON::PP::true : JSON::PP::false,
  };
}
print JSON::PP->new->canonical->utf8->encode({
  source=>'pinned write.cgi::DataWrite/DataCommitOrAbort with pinned inc-func DataRead, GetPath, AutoVar and original SortDT',
  scope=>'true two-event END/START/NOW, actual army/guildbal/play files, two source turns with DataRead; no full period, other events or production CAS',
  guildDef=>$guildDef,guildBal=>$guildBal,configs=>\%configs,armyInitial=>$armyInitial,
  lookupKeys=>['dominion','notice','zero','escaped,key','escaped%252ckey','delete','new'],
  cases=>\@cases,
});
