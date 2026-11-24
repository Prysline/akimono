use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use JSON::PP;
use lib $FindBin::Bin;
use OriginalSparseAllPlusHarness;
use OriginalSparseWholesalePlusHarness;
use OriginalGiftMapUseHarness;
binmode STDOUT,':raw';
our (%EVENT,%DTevent,$temptimenow,$timespan,@DT,@ITEM,@B35_DRAWS,
     $B35_USED,@LOG,$DTpeople,$MAX_USER,$MAX_ITEM,@DTwholestore);
sub PushLog {push @LOG,[@_];return 1;}
sub RequireFile {die 'B-59 callback unexpectedly invoked';}
sub GetPath {die 'B-59 callback file unexpectedly requested';}

my $itemDsl=OriginalGiftMapUseHarness::original_dsl();
my $compiler=OriginalGiftMapUseHarness::source('inc-makeitem.cgi');
my $read=OriginalGiftMapUseHarness::source('inc-func.cgi');
my $turn=OriginalGiftMapUseHarness::source('inc-turn.cgi');
for my $text (
  'my $keyitem="\$ITEM[".GetItemNumber($val[0])."]->{$key}";',
  'print EOUTSUB "$keyitem$ope$val;\n";',
  '$key=~s/^pop$/popular/i;',
){
  die "B-59 original compiler EVENT modifier drift $text"
    unless index($compiler,$text)>=0;
}
die 'B-59 original event file DataRead not executed' unless
  index($read,'foreach(keys(%DTevent)){require(GetPath($ITEM_DIR,"event",$_));}')>=0;
die 'B-59 expiry/start compiler drift' unless
  index($turn,'$DTevent{$key}<$temptimenow+$timespan')>=0 &&
  index($turn,'$DTevent{$key}=$temptimenow+int(rand($timespan))+$E->{basetime}+int(rand($E->{plustime})) if ($E->{basetime}+$E->{plustime});')>=0;

my @blocks=split(/^\@\@EVENT[^\r\n]*\r?\n/mi,$itemDsl);
shift @blocks;
for(@blocks){s/^\@\@(ITEM|DEFINE|END|FUNC[A-Z]+)\b[\s\S]*$//mi;}
my @hits=grep(/^\s*code\s+plusup-tetu(?:\s|$)/m,@blocks);
die 'B-59 source iron-vein event missing/duplicate' unless @hits==1;
my $eventBlock=$hits[0];
my %fields;
for my $line(split(/\r?\n/,$eventBlock)){
  if($line=~/^\s*(code|start|basetime|plustime|startmsg|endmsg|param)\s+(.+?)\s*$/i){
    my($key,$val)=(lc($1),$2);
    $val=~s/\s+#.*$//;$val=~s/\s+$//;
    push @{$fields{$key}},$val;
  }
}
for my $required(qw(start basetime plustime startmsg endmsg param)){
  die "B-59 original event $required not unique" unless @{$fields{$required}//[]}==1;
}
die 'B-59 original event source drift' unless
  $fields{start}[0] eq '10%' &&
  $fields{basetime}[0] eq '12h' &&
  $fields{plustime}[0] eq '12h' &&
  $fields{startmsg}[0] eq '發現新的鐵礦脈' &&
  $fields{endmsg}[0] eq '新的鐵礦脈已經關閉了';
my($itemName,$expression)=split(/\s+/,$fields{param}[0]);
die 'B-59 compiler EVENT source assignment changed' unless
  $itemName eq '鐵塊' && $expression eq 'plus=720';
OriginalSparseAllPlusHarness::reviewed_seconds();
OriginalGiftMapUseHarness::compile();
my $itemno=main::GetItemNumber($itemName);
my $base=main::GetTime('-20m');
my $active=main::GetTime('720');
my $prob=main::GetNumber($fields{start}[0]);
my $basetime=main::GetTime($fields{basetime}[0]);
my $plustime=main::GetTime($fields{plustime}[0]);
die 'B-59 original compiled numbers differ' unless
  $itemno==5&&$base==-1200&&$active==720&&
  $prob==100&&$basetime==43200&&$plustime==43200;
my $assignment='$ITEM['.$itemno.']->{plus}='.$active.';';
die 'B-59 actual EVENT generated code different' unless
  $assignment eq '$ITEM[5]->{plus}=720;';

# Compile the ACTUAL fixed combined original expiry/start region, no rewriting.
my $from=index($turn,"\t\t#イベント終了処理\n");
my $to=index($turn,"\n\t\tforeach my \$key (keys(%DTevent))",
  index($turn,"\t\t#イベント開始処理\n",$from));
die 'B-59 source region missing or moved' unless $from>=0&&$to>$from;
my $body=substr($turn,$from,$to-$from);
my $ok=eval "no strict;no warnings;sub run_b59_original{ \n".
  $body."\nreturn {active=>{%DTevent},groups=>{%group}}; }\n1;";
die "B-59 real Perl lifecycle compilation failed: $@" unless $ok;
sub lifecycle{
  my(%o)=@_;
  %EVENT=( 'plusup-tetu'=>{
    code=>'plusup-tetu',group=>'original-iron-event',
    startproba=>$prob,basetime=>$basetime,plustime=>$plustime,
    startfunc=>'',endfunc=>'',nowfunc=>'',
    startmsg=>$fields{startmsg}[0],endmsg=>$fields{endmsg}[0],
  });
  %DTevent=();
  $DTevent{'plusup-tetu'}=$o{active} if defined $o{active};
  $temptimenow=$o{begin}//1000000;
  $timespan=$o{span}//120;
  @DT=({id=>1});@ITEM=();@LOG=();
  @B35_DRAWS=@{$o{draws}};
  $B35_USED=0;
  my $out=run_b59_original();
  die "B-59 RNG leftover for $o{name}" if @B35_DRAWS;
  return {
    name=>$o{name},
    input=>{startSeconds=>$temptimenow,spanSeconds=>$timespan,
      activeUntilSeconds=>$o{active},randomDraws=>$o{draws}},
    output=>{activeState=>$out->{active},drawsUsed=>$B35_USED,
      logs=>[map {[@$_]} @LOG],
      groupOccupied=>$out->{groups}{'original-iron-event'}?JSON::PP::true:JSON::PP::false},
  };
}
my @cases=(
  lifecycle(name=>'start-12h-and-random-plus',
    draws=>[0,500000,250000]),
  lifecycle(name=>'active-blocks-gate',
    active=>1054060,draws=>[]),
  lifecycle(name=>'strict-end-equality-occupied',
    active=>1000120,draws=>[]),
  lifecycle(name=>'expired-then-gate-miss',
    active=>1000119,draws=>[999999]),
  lifecycle(name=>'expired-and-retrigger',
    active=>1000119,draws=>[0,0,0]),
);

# Source-execute the ORIGINAL fixed 59-item PLUS loop and CheckWholeStore,
# applying the exact original compiled per-event modifier only in active case.
sub wholesale{
  my($enabled)=@_;
  OriginalSparseWholesalePlusHarness::bootstrap();
  my $seconds=OriginalSparseAllPlusHarness::reviewed_seconds();
  for my $i(1..79){$ITEM[$i]{plus}=$seconds->[$i-1];}
  die 'B-59 source ITEM5 baseline drift' unless $ITEM[5]{plus}==$base;
  if($enabled){
    my $value=eval "no strict;no warnings;$assignment 1;";
    die "B-59 original generated EVENT assignment failed: $@" unless $value;
  }
  die 'B-59 source loaded ITEM5 PLUS wrong' unless
    $ITEM[5]{plus}==($enabled?$active:$base);
  $MAX_ITEM=79;$MAX_USER=50;$DTpeople=500000;
  @DT=({item=>[(0)x79]});
  $DT[0]{item}[62]=1;$DT[0]{item}[78]=5;
  @DTwholestore=();
  my $span=60;
  @B35_DRAWS=(0)x118;
  $B35_USED=0;
  main::B35SourceStep($span);
  my @whole=@DTwholestore;
  my @defined=grep {defined($DTwholestore[$_])} 0..$#DTwholestore;
  no warnings 'uninitialized';
  return {
    plusItem5=>$ITEM[5]{plus},wholesale5=>0+($DTwholestore[4]//0),
    consumedSamples=>[(0)x$B35_USED],drawsUsed=>$B35_USED,
    wholesale79=>[map {0+($_//0)}@whole[0..78]],
    definedIndices=>\@defined,wireCsv=>join(',',@whole),
  };
}
my $baseline=wholesale(0);
my $withIron=wholesale(1);
print JSON::PP->new->canonical->utf8->encode({
  source=>'real original inc-turn EVENT expiry/start fragment and 59-item wholesale/CheckWholeStore plus source-generated ITEM5 EVENT assignment',
  originalCompiler=>{itemId=>$itemno,assignment=>$assignment,basePlus=>$base,
    ironPlus=>$active,startProba=>$prob,baseTimeSeconds=>$basetime,
    plusTimeSeconds=>$plustime,startMessage=>$fields{startmsg}[0],
    endMessage=>$fields{endmsg}[0]},
  cases=>\@cases,wholesale=>{baseline=>$baseline,withIron=>$withIron},
  scope=>'verified original compiler event param operation and frozen Perl source fragments only; no full CGI UI/36h rollover/process hash order',
});
