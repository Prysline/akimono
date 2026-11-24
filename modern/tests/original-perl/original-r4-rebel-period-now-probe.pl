use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use File::Temp qw(tempdir);
use File::Path qw(make_path);
use JSON::PP;
binmode STDOUT,':raw';
our ($NOW_TIME,$STATE,$BAL_JOB,$BAL_NAME,$TIMESPAN,$DTTaxrate,
     $ITEM_DIR,$temptimenow,$timespan,$READ_ARMY,$WRITE_ARMY,
     @DT,@ITEM,@LOG,@COMBINED_DRAWS,@COMBINED_RANGES,
     %EVENT,%DTevent,%id2idx,%RIOT,%ARMY);
BEGIN{
  no warnings 'redefine';
  *CORE::GLOBAL::rand=sub (;$){
    die 'combined true original source RNG exhausted'
      unless @main::COMBINED_DRAWS;
    my $v=shift @main::COMBINED_DRAWS;
    my $range=0+($_[0]//1);
    die 'bad original RNG' unless defined($v)&&$v=~/^\d+$/&&$v<1000000;
    push @main::COMBINED_RANGES,$range;
    return $v*$range/1000000;
  };
}
sub source{
  my($p)=@_;
  open my $fh,'<:encoding(UTF-8)',File::Spec->catfile($FindBin::Bin,$p)
    or die $!;
  local $/;my $s=<$fh>;close $fh;return $s;
}
sub PushLog{push @LOG,[@_];return 1;}
sub l{
  my($text,@args)=@_;
  $text=~s/%([12])/$args[$1-1]/ge;
  return $text;
}
sub ReadArmy{$READ_ARMY++;return 1;}
sub WriteArmy{$WRITE_ARMY++;return 1;}
sub GetMoneyString{return $_[0];}
sub RequireFile{die 'unreviewed real original source path';}
sub GetPath{
  my($dir,$kind,$code)=@_;
  die 'unreviewed event path' unless
    $dir eq $ITEM_DIR&&$kind eq 'event-n'&&$code eq 'rebel';
  return "$ITEM_DIR/event-n/rebel.pl";
}
my $period=source('period.cgi');
my $turn=source('inc-turn.cgi');
my $dsl=source('../../../custom/inc-rebel-data.cgi');
my $pstart=index($period,'sub RebelRobin'."\n");
my $pend=index($period,'sub DragonBalance',$pstart);
die 'original RebelRobin source moved' unless $pstart>=0&&$pend>$pstart;
my $body=substr($period,$pstart,$pend-$pstart);
my $ok=eval "package main;no strict;no warnings;use utf8;\n".$body."\n1;";
die "actual original RebelRobin compile error $@" unless $ok;
my $wstart=index($period,'if ($DTevent{rebel})');
my $wend=index($period,'$STATE->{army}+=$STATE->{robina};',$wstart);
die 'original period extend/trigger source moved' unless $wstart>=0&&$wend>$wstart;
my $wrapper=substr($period,$wstart,$wend-$wstart);
$ok=eval "package main;no strict;no warnings;use utf8;\n".
  "sub originalPeriodRebelFragment{\n".$wrapper."\nreturn 1;}\n1;";
die "true original period callback compilation error $@" unless $ok;

my @blocks=split(/^\s*\@\@event[^\r\n]*\r?\n/mi,$dsl);
shift @blocks;
for(@blocks){s/^\s*\@\@(event|END|ITEM|FUNC\w+)\b[\s\S]*$//mi;}
my @matches=grep(/^\s*code\s+rebel(?:\s|$)/m,@blocks);
die 'original rebel event body source missing' unless @matches==1;
my($nowBody)=$matches[0]=~/
  ^\s*func\s+_local_\s*\r?\n
  ([\s\S]*?)
  ^[ \t]*_local_[ \t]*$
/mx;
die 'frozen original rebel NOW body missing' unless
  defined($nowBody)&&
  index($nowBody,'main::ReadArmy();')>=0&&
  index($nowBody,'main::WriteArmy();')>=0&&
  index($nowBody,'rand(100) > 75')>=0;
my $tmp=tempdir('akimono-r4-period-now-XXXX',TMPDIR=>1,CLEANUP=>1);
make_path("$tmp/event-n");$ITEM_DIR=$tmp;
open my $fh,'>:encoding(UTF-8)',"$tmp/event-n/rebel.pl" or die $!;
print $fh "use utf8;\npackage event;\nsub _local_now{\n".
  $nowBody."\n}\n1;\n";
close $fh or die $!;

my $first=index($turn,"\t\t#イベント終了処理\n");
my $last=index($turn,"\n\t\t\$temptimenow+=\$timespan;",$first);
die 'original turn END START NOW source moved' unless $first>=0&&$last>$first;
my $eventBody=substr($turn,$first,$last-$first);
for my $marker(
  '@event::DT=@DT;','foreach my $key (keys(%EVENT))',
  'foreach my $key (keys(%DTevent))',
  'my $extfile=GetPath($ITEM_DIR,"event-n",$key);',
  'delete $INC{$extfile};'
){die "frozen turn source marker changed $marker"
   unless index($eventBody,$marker)>=0;}
$ok=eval "package main;no strict;no warnings;use utf8;\n".
  "sub originalRebelEventFragment{\n".$eventBody.
  "\nreturn {state=>{%DTevent}};}\n1;";
die "true original inc-turn EVENT compilation error $@" unless $ok;
my %baseTown=(leader=>1,money=>10000,in=>0,out=>0,
  develop=>5001,devem=>0,safety=>5001,safem=>0,
  army=>500,robina=>2000,robinb=>0);
my @baseShops=(
  {id=>1,name=>'伊洛',shopname=>'一號店',army=>100,money=>1000},
  {id=>2,name=>'菲羅',shopname=>'二號店',army=>2500,money=>2000},
);
sub run{
  my(%in)=@_;
  $NOW_TIME=1000000;$temptimenow=1000000;
  $timespan=3600;$TIMESPAN=3600;
  $STATE={%{$in{town}}};@DT=map{{%$_}}@baseShops;
  @ITEM=();@LOG=();%EVENT=(rebel=>{
    code=>'rebel',group=>'rebel-group',startproba=>0,
    basetime=>0,plustime=>0,startfunc=>'',endfunc=>'',
    func=>'_local_now',funcparam=>'',startmsg=>'',endmsg=>'',
  });
  %DTevent=();
  $DTevent{rebel}=$in{active} if defined($in{active});
  %id2idx=map{($DT[$_]{id}=>$_)}0..$#DT;
  %RIOT=map{($_=>1)}@{$in{riotIds}//[]};
  %ARMY=%{$in{armyById}//{}};
  $READ_ARMY=0;$WRITE_ARMY=0;
  $BAL_JOB='外敵';$BAL_NAME='首領';
  $DTTaxrate=0;
  @COMBINED_DRAWS=@{$in{draws}};
  @COMBINED_RANGES=();
  originalPeriodRebelFragment();
  my $state=originalRebelEventFragment();
  die "combined source RNG leftover $in{name}" if @COMBINED_DRAWS;
  my $until=$state->{state}{rebel};
  my $output={
    town=>{%$STATE},shops=>[map{{%$_}}@DT],
    riotIds=>[sort{$a<=>$b}keys(%RIOT)],armyById=>{%ARMY},
    activeUntilSeconds=>$until,
    eventState=>{%{$state->{state}}},
    eventPersisted=>defined($until)?JSON::PP::true:JSON::PP::false,
    logs=>[map{[@$_]}@LOG],randomDrawRanges=>[@COMBINED_RANGES],
    drawsUsed=>scalar(@COMBINED_RANGES),
    taxRate=>$DTTaxrate,readArmyCalls=>$READ_ARMY,
    writeArmyCalls=>$WRITE_ARMY,
  };
  return {
    name=>$in{name},
    input=>{
      startSeconds=>1000000,nowSeconds=>1000000,spanSeconds=>3600,
      town=>$in{town},shops=>\@baseShops,
      riotIds=>$in{riotIds}//[],armyById=>$in{armyById}//{},
      leaderShopExists=>$in{town}{leader}>0?
        JSON::PP::true:JSON::PP::false,
      activeUntilSeconds=>$in{active},
      randomDraws=>$in{draws},
      periodDrawCount=>$in{periodDrawCount},
      nowDrawCount=>$in{nowDrawCount},
      taxRate=>0,balJob=>'外敵',balName=>'首領',
    },
    output=>$output,
  };
}
my %developed=(%baseTown,develop=>9000,safety=>9000,money=>45000000);
my @cases=(
  run(name=>'period-no-leader-then-zero-start-gate',
    town=>{%baseTown,leader=>0},draws=>[999999],
    periodDrawCount=>0,nowDrawCount=>0),
  run(name=>'period-calm-then-zero-start-gate',
    town=>{%baseTown,money=>0},draws=>[0,0,999999],
    periodDrawCount=>2,nowDrawCount=>0),
  run(name=>'period-restless-then-zero-start-gate',
    town=>{%baseTown,develop=>7000,safety=>7000,money=>45000000},
    draws=>[0,0,999999],periodDrawCount=>2,nowDrawCount=>0),
  run(name=>'period-start-rebel-same-time-now',
    town=>{%developed},draws=>[0,0,299999,0,0],
    periodDrawCount=>3,nowDrawCount=>2),
  run(name=>'period-start-rebel-reinforce-on-first-now',
    town=>{%developed},draws=>[0,0,299999,900000,500000],
    periodDrawCount=>3,nowDrawCount=>2),
  run(name=>'period-invasion-deferred-then-zero-gate',
    town=>{%developed},draws=>[0,0,300000,999999],
    periodDrawCount=>3,nowDrawCount=>0),
  run(name=>'period-extends-rebel-then-now-suppresses',
    town=>{%baseTown},active=>900000,draws=>[],
    periodDrawCount=>0,nowDrawCount=>0),
  run(name=>'period-extends-rebel-with-riot-same-now',
    town=>{%baseTown},active=>1000005,
    riotIds=>[2],armyById=>{2=>3000},draws=>[500000],
    periodDrawCount=>0,nowDrawCount=>1),
);
print JSON::PP->new->canonical->utf8->encode({
  source=>'complete frozen period.cgi RebelRobin + period rebel branch executed BEFORE actual inc-turn EVENT END/START/NOW and original rebel NOWFUNC body, one event',
  cases=>\@cases,
  scope=>'isolated single CITY/REBEL slice, original source execution + controlled rand only; no other 16 EVENTs or full period/commit',
});
