use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use Storable qw(dclone);
use File::Temp qw(tempdir);
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
  $GUILDIDX_feerate,@GUILD_IO_CALLS,@TECH_LOGS);
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
sub l{return $_[0]}
sub WriteLog{push @TECH_LOGS,[@_];return 1}
sub PushLog{return 1}
sub CloseShop {die 'B-50 forbids original expired-shop close path'}
sub EditGuildMoney {
  push @GUILD_IO_CALLS,[@_];
  # The external EditGuildMoney implementation is NOT present in the
  # frozen corpus; record this actual source call, do not fake a write.
  return 1;
}
my $payoutFolder=tempdir('akimono-r4-period-dragon-XXXX',TMPDIR=>1,CLEANUP=>1);
$COMMON_DIR=$payoutFolder;
sub GetPath {
  die 'R4 dragon-period only permits the original drapay file path'
    unless @_==2&&$_[0] eq $COMMON_DIR&&
      $_[1] eq 'drapay-'.$MYDIR;
  return "$COMMON_DIR/drapay-$MYDIR";
}
sub GetMoneyString {return $_[0]}

my $period=source('period.cgi');
my $detail=source('core-detail.cgi');
my $read=source('inc-func.cgi');
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
my $periodBody=substr($period,$start,$stop-$start);
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
  foundation=>1000000,lastlogin=>1000000,
  time=>956800,rank=>5000,money=>100000,rankingcount=>0,
  profitstock=>0,point=>0,
  item=>\@stock,showcasecount=>1,showcase=>[10],price=>[5000],
  guild=>'guild-a',dragon=>0,drmoney=>0,dignity=>26,
  saletoday=>10000,paytoday=>10000,taxtoday=>0,costtoday=>17.875,
  saleyesterday=>0,payyesterday=>0,taxyesterday=>0,costyesterday=>0,
  itemtoday=>{10=>2},itemyesterday=>{},
  rankingyesterday=>'',exp=>{10=>5000,14=>5000},
};
$STATE=dclone($initialTown);
$DTpeople=500000;$DTusercount=1;
@DT=(dclone($originalShop));%DTevent=();
%GUILD=('guild-a'=>[50]);$GUILDIDX_feerate=0;
%GUILD_DATA=('guild-a'=>{
  money=>1000000,atk=>1000,def=>500,in=>0,out=>0,
});
my @rounds=(
  {time=>1000000,award=>0,dignityDraw=>0,
    town=>[250000,750000],payout=>"1\t500\n",
    tech=>[0,500000,999999,250000]},
  {time=>1129600,award=>600000,dignityDraw=>999999,
    town=>[500000,500000],payout=>"1\t-1000\n",
    tech=>[0,999999]},
);
my @results;
for my $r (@rounds){
  $NOW_TIME=$r->{time};
  my $inputShop=dclone($DT[0]);
  my $inputTown=dclone($STATE);
  my $inputPeople=0+$DTpeople;
  my $guildInput={
    id=>'guild-a',feeRate=>50,
    atk=>0+$GUILD_DATA{'guild-a'}{atk},
    def=>0+$GUILD_DATA{'guild-a'}{def},
  };
  @GUILD_IO_CALLS=();@TECH_LOGS=();
  # Original inc-turn explicitly invokes SortDT immediately before period.
  SortDT();
  my $pointsBefore=$DT[0]->{point};
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
  die 'Original in-place period unexpectedly changed active shop list'
    unless @DT==1&&$DT[0]->{id}==1;
  die 'Original in-place prefix consumed wrong RNG sequence'
    unless $B50_USED==4+@{$r->{tech}}&&!@B50_SAMPLES;
  push @results,{
    input=>{
      shop=>$inputShop,town=>$inputTown,dtPeople=>$inputPeople,
      awardDrawMillionths=>$r->{award},
      territoryDrawMillionths=>$r->{town},
      payoutText=>$r->{payout},
      dignityDrawMillionths=>$r->{dignityDraw},
      guildContext=>$guildInput,
      postTechDraws=>$r->{tech},
    },
    output=>{
      shop=>dclone($DT[0]),town=>dclone($STATE),
      dtPeople=>0+$DTpeople,
      pointsBefore=>$pointsBefore,
      pointsAfter=>0+$DT[0]->{point},
      drawsUsed=>$B50_USED,
      dragonPayoutFileConsumed=>JSON::PP::true,
      guildContext=>{
        id=>'guild-a',feeRate=>50,
        atk=>0+$GUILD_DATA{'guild-a'}{atk},
        def=>0+$GUILD_DATA{'guild-a'}{def},
      },
      guildMoneyEdits=>[map{{
        guildId=>$_->[0],amount=>0+$_->[1],
      }}@GUILD_IO_CALLS],
      techLogs=>[map{[@$_]}grep {
        $_->[3]//'' =~ /失去了|遺忘了初心/
      }@TECH_LOGS],
      techLostItemIds=>[grep {
        $inputShop->{item}[$_-1]>$DT[0]{item}[$_-1]
      }(18,19,38,24)],
    },
  };
}
print JSON::PP->new->canonical->utf8->encode({
  source=>'full original two period prefixes plus UpdateResetAfter high-EXP 4-item rand(14000) technique forgetting, DragonBalance IO, dignity and guild fee call recorder',
  scope=>'two full original pre-backup periods and UpdateResetAfter technical forgetting; genuine dragon payout file, dignity, guild dues recorded IO, no true guild files, shop close, EVENT or WorldState commit',
  itemLimits=>[map {0+$limits{$_}} 1..79],
  cases=>\@results,
});
