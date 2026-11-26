use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use Storable qw(dclone);
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
  $BAL_JOB,$BAL_NAME,$DTTaxrate,$MYDIR,
  @B50_SAMPLES,$B50_USED,$B50_EXPECTED,@B50_RANGES,@B50_LOGS);
BEGIN{
  no warnings 'redefine';
  *CORE::GLOBAL::rand=sub{
    my($range)=@_;
    die "Unexpected B-50 original period RNG bound $range"
      unless defined($range)&&($range==9||$range==200||$range==100||$range==2500||$range==5000000);
    die 'Missing original period RNG sample' unless @main::B50_SAMPLES;
    $main::B50_USED++;push @main::B50_RANGES,0+$range;
    return shift(@main::B50_SAMPLES)*$range/1000000;
  };
}
sub source {
  my($filename)=@_;
  my $path=File::Spec->catfile($FindBin::Bin,$filename);
  open(my $file,'<:encoding(UTF-8)',$path) or die $!;
  local $/;my $source=<$file>;close($file);return $source;
}
sub l{my($s,@args)=@_;$s=~s/%([12])/defined($args[$1-1])?$args[$1-1]:""/ge;return $s}
sub WriteLog{return 1}
sub PushLog{push @B50_LOGS,[@_];return 1}
sub CloseShop {die 'B-50 forbids original expired-shop close path'}
sub DragonBalance {
  die 'B-50 would not review pending dragon race payments'
    if grep {($_->{dragon}//0)!=0} @DT;
  return 1;
}
sub EditGuildMoney {die 'B-50 forbids any guild financial updates'}
sub GetPath {die 'B-50 never reads or writes unspecified original disk paths'}
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
  $originalUpdate."\n".
  "sub b50_source_original_period {\n".$periodBody."\nreturn 1;\n}\n1;";
die "B-50 original frozen complete in-place prefix failed to compile: $@"
  unless $ok;

$EXPIRE_TIME=3600*24*7;
$PROFIT_DAY_COUNT=3; $EXP_DOWN_RATE=60;$EXP_DOWN_POINT=5;
$MAX_ITEM=79;@SHOWCASE_COST=(0,2000,4000,8000);
$DEFINE_FUNCUPDATE=0; $ITEM_DIR='unreadable-for-B50';
$DTTaxrate=0;$BAL_JOB='';$BAL_NAME='';
@ITEM=(undef,map {{name=>'',limit=>0,scale=>''}} 1..79);
for my $i(1..79){$ITEM[$i]->{limit}=$limits{$i};$ITEM[$i]->{scale}=$scale{$i};}
for my $name (keys %nameToNumber){$ITEM[$nameToNumber{$name}]->{name}=$name;}
my @stateKeys=qw(leader money in out develop devem safety safem army robina robinb);
my @initial=(0,0,0,0,5001,0,5001,0,0,2000,0);
my $initialTown={map {$stateKeys[$_]=>$initial[$_]} 0..$#stateKeys};
my @stock=(0)x79;
$stock[62]=1;$stock[78]=5;
my $originalShop={
  id=>1,status=>1,name=>'來源店主',shopname=>'同一商店',
  foundation=>1000000,lastlogin=>1000000,
  time=>956800,rank=>5000,money=>100000,rankingcount=>0,
  profitstock=>0,point=>0,
  item=>\@stock,showcasecount=>1,showcase=>[10],price=>[5000],
  guild=>'',dragon=>0,drmoney=>0,dignity=>0,
  saletoday=>10000,paytoday=>10000,taxtoday=>0,costtoday=>17.875,
  saleyesterday=>0,payyesterday=>0,taxyesterday=>0,costyesterday=>0,
  itemtoday=>{10=>2},itemyesterday=>{},
  rankingyesterday=>'',exp=>{10=>100},
};
$STATE=dclone($initialTown);
$DTpeople=500000;$DTusercount=1;
@DT=(dclone($originalShop));%DTevent=();%GUILD=();%GUILD_DATA=();
my @rounds=(
  {time=>1000000,award=>0,town=>[250000,750000]},
  {time=>1129600,award=>600000,town=>[500000,500000]},
);
my @results;
for my $r (@rounds){
  $NOW_TIME=$r->{time};
  my $inputShop=dclone($DT[0]);
  my $inputTown=dclone($STATE);
  my $inputPeople=0+$DTpeople;
  # Original inc-turn explicitly invokes SortDT immediately before period.
  SortDT();
  my $pointsBefore=$DT[0]->{point};
  @B50_SAMPLES=($r->{award},@{$r->{town}});
  $B50_USED=0;
  b50_source_original_period();
  die 'Original in-place period unexpectedly changed active shop list'
    unless @DT==1&&$DT[0]->{id}==1;
  die 'Original in-place prefix consumed wrong RNG sequence'
    unless $B50_USED==3&&!@B50_SAMPLES;
  push @results,{
    input=>{
      shop=>$inputShop,town=>$inputTown,dtPeople=>$inputPeople,
      awardDrawMillionths=>$r->{award},
      territoryDrawMillionths=>$r->{town},
    },
    output=>{
      shop=>dclone($DT[0]),town=>dclone($STATE),
      dtPeople=>0+$DTpeople,
      pointsBefore=>$pointsBefore,
      pointsAfter=>0+$DT[0]->{point},
      drawsUsed=>$B50_USED,
    },
  };
}
# Isolated full prefix with nonzero tax and earned-dignity decay inputs.
# Keep the historical two-case result unchanged for the existing .t.
my @conflictResults;
if(@ARGV&&$ARGV[0] eq '--conflict'){
  my @conflictRounds=(
    {name=>'calm-led-tax',town=>{%$initialTown,leader=>1,money=>5000000,army=>10000,robina=>2000},draws=>[0,0,0,0]},
    {name=>'start-led-invasion',town=>{%$initialTown,leader=>1,money=>5000000,develop=>9000,safety=>9000,army=>10000,robina=>2000},draws=>[0,0,0,0,299999]},
    {name=>'extend-expired-event',town=>{%$initialTown,leader=>1,money=>0,army=>3000,robina=>2000},active=>900000,draws=>[0,0]},
  );
  for my $r(@conflictRounds){
    $NOW_TIME=1000000;$DTpeople=500000;$DTusercount=1;
    $STATE=dclone($r->{town});@DT=(dclone($originalShop));
    $DT[0]{dignity}=13;$DT[0]{taxtoday}=1234;
    %DTevent=defined($r->{active})?(rebel=>$r->{active}):();
    $BAL_JOB='外敵';$BAL_NAME='首領';%GUILD=();%GUILD_DATA=();
    my $input={shop=>dclone($DT[0]),town=>dclone($STATE),dtPeople=>$DTpeople,
      awardDrawMillionths=>0,dignityDrawMillionths=>249999,
      territoryDrawMillionths=>$r->{draws},nowSeconds=>$NOW_TIME,
      conflictContext=>{activeUntilSeconds=>$r->{active},balJob=>$BAL_JOB,balName=>$BAL_NAME}};
    SortDT();my $before=$DT[0]{point};
    @B50_SAMPLES=(0,249999,@{$r->{draws}});@B50_RANGES=();@B50_LOGS=();$B50_USED=0;
    b50_source_original_period();
    die 'conflict full-prefix source RNG unused' if @B50_SAMPLES;
    push @conflictResults,{name=>$r->{name},input=>$input,output=>{
      shop=>dclone($DT[0]),town=>dclone($STATE),dtPeople=>0+$DTpeople,
      pointsBefore=>$before,pointsAfter=>0+$DT[0]{point},
      activeUntilSeconds=>$DTevent{rebel},eventState=>{%DTevent},
      ranges=>[@B50_RANGES],logs=>[grep{$_->[0]==2&&($_->[2]=~/護衛軍|外敵首領/)}@B50_LOGS]}};
  }
}
print JSON::PP->new->canonical->utf8->encode({
  source=>'full fixed inc-period.cgi pre-backup prefix + true original SortDT/FUNCUPDATE/Use::AddItem',
  scope=>'single active Standard Street shop; no DragonBalance file, stale closure, guilds, real events, original backup/session; not player period commit',
  itemLimits=>[map {0+$limits{$_}} 1..79],
  cases=>\@results,(@ARGV&&$ARGV[0] eq '--conflict'?(conflictCases=>\@conflictResults):()),
});
