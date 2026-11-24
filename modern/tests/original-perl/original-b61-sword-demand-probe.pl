use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use JSON::PP;
use lib $FindBin::Bin;
use OriginalGiftMapUseHarness;

# Original fixed Perl fragments are eval-compiled AFTER the explicit rand
# override. This is not the complete CGI, original hash order, nor a game
# world with swords purchased. The market showcase below is a bounded
# SOURCE ECONOMICS ORACLE, not a claim that current Node game can sell swords.
BEGIN {
  no warnings 'redefine';
  *CORE::GLOBAL::rand=sub (;$) {
    die 'B-61 missing source EVENT rand sample' unless @main::B61_DRAWS;
    my $million=shift @main::B61_DRAWS;
    die 'B-61 bad source EVENT rand sample'
      unless $million =~ /^\d+$/&&$million<1000000;
    $main::B61_USED++;
    return $million*$_[0]/1000000;
  };
}
binmode STDOUT,':raw';

my $dsl=OriginalGiftMapUseHarness::original_dsl();
my $compiler=OriginalGiftMapUseHarness::source('inc-makeitem.cgi');
my $turn=OriginalGiftMapUseHarness::source('inc-turn.cgi');
my $read=OriginalGiftMapUseHarness::source('inc-func.cgi');
OriginalGiftMapUseHarness::compile();
for my $literal(
  '$key=~s/^pop$/popular/i;',
  'my $keyitem="\$ITEM[".GetItemNumber($val[0])."]->{$key}";',
  'print EOUTSUB "$keyitem=int($keyitem/$val);\n";',
){
  die "B-61 actual compiler event PARAM drift $literal"
    unless index($compiler,$literal)>=0;
}
die 'B-61 true DataRead event parameter load missing' unless
  index($read,'foreach(keys(%DTevent)){require(GetPath($ITEM_DIR,"event",$_));}')>=0;

my @blocks=split(/^\@\@EVENT[^\r\n]*\r?\n/mi,$dsl);
shift @blocks;
for(@blocks){s/^\@\@(ITEM|DEFINE|END|FUNC[A-Z]+)\b[\s\S]*$//mi;}
my @events=grep(/^\s*code\s+ken-sale(?:\s|$)/m,@blocks);
die 'B-61 source event ken-sale missing/duplicate' unless @events==1;
my $event=$events[0];
my %fields;
my @params;
for my $line(split(/\r?\n/,$event)){
  if($line=~/^\s*(code|start|basetime|plustime|startmsg|endmsg)\s+(.+?)\s*$/){
    my($key,$val)=($1,$2);$val=~s/\s+#.*$//;$val=~s/\s+$//;
    push @{$fields{$key}},$val;
  }
  if($line=~/^\s*param\s+(\S+)\s+(\S+)/){
    push @params,[$1,$2];
  }
}
for(qw(code start basetime plustime startmsg endmsg)){
  die "B-61 source EVENT $_ changed"
    unless @{$fields{$_}//[]}==1;
}
die 'B-61 unexpected source event parameters' unless
  $fields{code}[0] eq 'ken-sale'&&$fields{start}[0] eq '10%'&&
  $fields{basetime}[0] eq '6h'&&$fields{plustime}[0] eq '24h'&&
  $fields{startmsg}[0] eq '對劍的需求似乎在增加'&&
  $fields{endmsg}[0] eq '劍的需求已恢復正常水平'&&
  @params==5;
my @nos=(40..44);
my @names=('木刀','鐵劍','鋼鐵劍','秘銀劍','奧利哈鋼劍');
my @pops=('3h','3h','5h','10h','16h');
my @sourceItems;
for my $i(0..4){
  die 'B-61 original EVENT item PARAM changed' unless
    $params[$i][0] eq $names[$i]&&$params[$i][1] eq 'pop/2';
  die 'B-61 real compiler name->item number changed'
    unless main::GetItemNumber($names[$i])==$nos[$i];
  my($itemBlock)=grep(/^\s*no\s+$nos[$i]\b/m,
    split(/^\@\@ITEM[^\r\n]*\r?\n/mi,$dsl));
  die 'B-61 item SOURCE POP missing' unless defined($itemBlock)&&
    $itemBlock=~/^\s*pop\s+(\S+)/m &&$1 eq $pops[$i];
  my $popular=main::GetTime($pops[$i]);
  die 'B-61 compiled original POP not positive integer' unless
    $popular>0&&$popular==int($popular);
  push @sourceItems,{
    itemId=>$nos[$i],name=>$names[$i],
    originalPopularSeconds=>$popular,
    eventPopularSeconds=>int($popular/2),
  };
}
my $startProba=main::GetNumber($fields{start}[0]);
my $baseTime=main::GetTime($fields{basetime}[0]);
my $plusTime=main::GetTime($fields{plustime}[0]);
die 'B-61 fixed original event GetNumber/GetTime drift' unless
  $startProba==100&&$baseTime==21600&&$plusTime==86400;

# Compile ORIGINAL unmodified inc-makeitem :: OutEventData parameter loop,
# writing to a temporary in-memory Perl filehandle (not repo files).
my $cstart=index($compiler,'foreach my $param (@{$event->{param}})');
my $cend=index($compiler,'print EOUTSUB "1;\n";',$cstart);
die 'B-61 original EVENT PARAM compiler loop missing' unless
  $cstart>=0&&$cend>$cstart;
my $compileSource=substr($compiler,$cstart,$cend-$cstart);
my $compiled=eval "package main;use utf8;no strict;no warnings;\n".
  "sub B61CompileSourceParam { my (\$event)=\@_;\n".
  $compileSource."\nreturn 1; }\n1;";
die "B-61 actual original compiler loop eval failed: $@" unless $compiled;
my $generated='';
open(EOUTSUB,'>',\$generated) or die $!;
main::B61CompileSourceParam({param=>[
  map {$_->[0]."\t".$_->[1]}@params
]});
close EOUTSUB;
my @generatedLines=grep(length,split(/\r?\n/,$generated));
die 'B-61 compiler did not output exactly five source ITEM edits'
  unless @generatedLines==5;
for my $i(0..4){
  my $no=$nos[$i];
  my $literal='$ITEM['.$no.']->{popular}=int($ITEM['.
    $no.']->{popular}/2);';
  die "B-61 original compiler generated mismatch ITEM $no"
    unless $generatedLines[$i] eq $literal;
}
my $market=File::Spec->catfile($FindBin::Bin,'market.cgi');
require $market;

# This is the ORIGINAL inc-turn buyer-popular initialization section,
# including the ORIGINAL market CGI::GetMarketStatus call. Not a rewritten
# price/demand equation.
my $salesStart=index($turn,"\t\tmy \$itemranksum=0;");
my $salesEnd=index($turn,"\t\t#店舗別売上処理ループ",$salesStart);
die 'B-61 original source buyer market region missing' unless
  $salesStart>=0&&$salesEnd>$salesStart;
my $buyerBody=substr($turn,$salesStart,$salesEnd-$salesStart);
for my $sourceExpr(
 '$ITEM->{buypeople}=$DTpeople*$SALE_SPEED/$ITEM->{popular}*$timespan/86400;',
 'GetMarketStatus();',
){
  die 'B-61 original buyer formula missing' unless
    index($buyerBody,$sourceExpr)>=0;
}
my $prepared=eval "package main;use utf8;no strict;no warnings;\n".
  "sub B61OriginalBuyerPreparation {my(\$timespan)=\@_;\n".
  $buyerBody."\nreturn 1;}\n1;";
die "B-61 source-executed real buyer market prep failed: $@"
  unless $prepared;

sub prepare_original_source_market{
  my($active)=@_;
  $main::MAX_ITEM=79;
  $main::DTpeople=500000;$main::SALE_SPEED=12;
  for my $no(0..79){
    $main::ITEM[$no]//={};
    $main::ITEM[$no]{popular}=0;
    $main::ITEM[$no]{price}=0;
    $main::ITEM[$no]{type}=0;
    $main::ITEM[$no]{buypeoplebase}=0;
    $main::ITEM[$no]{buypeople}=0;
  }
  for my $i(0..4){
    $main::ITEM[$nos[$i]]{popular}=
      $sourceItems[$i]{originalPopularSeconds};
  }
  # Original source #40 at nominal price 1200, 200 synthetic exhibited
  # swords. This fixture probes demand and market UPPOINT only; no actual
  # player sword acquisition is falsely claimed.
  $main::ITEM[40]{price}=1200;
  @main::DT=({
    id=>1,status=>1,rank=>5010,showcasecount=>1,
    showcase=>[40],price=>[1200],item=>[(0)x79],
    itemtoday=>{},itemyesterday=>{},
  });
  $main::DT[0]{item}[39]=200;
  if($active){
    my $ok=eval "package main;use utf8;no strict;no warnings;\n".
      $generated."\n1;";
    die "B-61 original generated event file failed: $@" unless $ok;
  }
  main::B61OriginalBuyerPreparation(60);
  my @sword=map {{
    itemId=>$_,popularSeconds=>0+$main::ITEM[$_]{popular},
    potentialBuyers=>0+$main::ITEM[$_]{buypeople},
  }}@nos;
  return {
    sourceEventLoaded=>$active?JSON::PP::true:JSON::PP::false,
    swordItems=>\@sword,
    displayedSword=>{
      itemId=>40,stock=>200,nominalPrice=>1200,
      averageMarketPrice=>0+$main::ITEM[40]{marketprice},
      sourceUppoint=>0+$main::ITEM[40]{uppoint},
      sourceBuypeopleBase=>0+$main::ITEM[40]{buypeoplebase},
    },
  };
}
my $normal=prepare_original_source_market(0);
my $active=prepare_original_source_market(1);

# END + START source execution: true fixed Perl fragment, not hand-written
# lifecycle. A one-entry %EVENT isolates deterministic hash traversal.
my $from=index($turn,"\t\t#イベント終了処理\n");
my $to=index($turn,"\n\t\tforeach my \$key (keys(%DTevent))",
  index($turn,"\t\t#イベント開始処理\n",$from));
die 'B-61 actual END/START original source moved' unless
  $from>=0&&$to>$from;
my $body=substr($turn,$from,$to-$from);
my $ok=eval "package main;no strict;no warnings;use utf8;\n".
  "sub B61OriginalEventSlice {\n".$body.
  "\nreturn {active=>{%DTevent},groups=>{%group}};}\n1;";
die "B-61 original EVENT lifecycle code compilation failed: $@" unless $ok;
sub PushLog {push @main::B61_LOG,[@_];1;}
sub RequireFile {die 'B-61 unexpected event callback';}
sub event_case{
  my(%o)=@_;
  %main::EVENT=(
    'ken-sale'=>{
      code=>'ken-sale',group=>'source-sword-sale-group',
      startproba=>$startProba,basetime=>$baseTime,
      plustime=>$plusTime,startfunc=>'',endfunc=>'',
      startmsg=>$fields{startmsg}[0],endmsg=>$fields{endmsg}[0],
    },
  );
  %main::DTevent=();
  $main::DTevent{'ken-sale'}=$o{expires} if defined $o{expires};
  $main::temptimenow=1000000;
  $main::timespan=1800;
  @main::DT=({id=>1});
  @main::B61_DRAWS=@{$o{draws}};
  $main::B61_USED=0;@main::B61_LOG=();
  my $res=main::B61OriginalEventSlice();
  die 'B-61 original EVENT unused rand values' if @main::B61_DRAWS;
  return {
    name=>$o{name},
    input=>{startSeconds=>$main::temptimenow,
      spanSeconds=>$main::timespan,
      expiresAtSeconds=>$o{expires},randomDraws=>$o{draws}},
    output=>{
      eventState=>$res->{active},randomDrawsUsed=>$main::B61_USED,
      groupOccupied=>$res->{groups}{'source-sword-sale-group'}?
        JSON::PP::true:JSON::PP::false,
      logs=>[map {[@$_]}@main::B61_LOG],
    },
  };
}
my @cases=(
  event_case(name=>'first-start',draws=>[0,500000,250000]),
  event_case(name=>'active-group',expires=>1044100,draws=>[]),
  event_case(name=>'expiry-equal',expires=>1001800,draws=>[]),
  event_case(name=>'expired-no-restart',expires=>1001799,
    draws=>[999999]),
  event_case(name=>'expired-restart',expires=>1001799,
    draws=>[0,0,0]),
);
print JSON::PP->new->canonical->utf8->encode({
  source=>'unmodified frozen inc-makeitem EVENT param compiler loop, original inc-turn buyer preparation/GetMarketStatus, original END/START, real original GetTime/GetNumber/GetItemNumber',
  generatedEventFile=>$generated,compiler=>{
    startProba=>$startProba,baseTimeSeconds=>$baseTime,
    plusTimeSeconds=>$plusTime,params=>\@sourceItems,
  },
  market=>{baseline=>$normal,active=>$active},
  cases=>\@cases,
  scope=>'one source ken-sale and synthetic 200-sword showcase ONLY for source demand oracle; playable Node shop still only sells actual #10 and #11 tickets',
});
