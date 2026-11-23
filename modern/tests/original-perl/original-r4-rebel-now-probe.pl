use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use File::Temp qw(tempdir);
use File::Path qw(make_path);
use JSON::PP;
binmode STDOUT,':raw';
our (%EVENT,%DTevent,%RIOT,%ARMY,%id2idx,$STATE,@DT,@ITEM,@LOG,
  $temptimenow,$timespan,$TIMESPAN,$ITEM_DIR,
  $DTTaxrate,$BAL_JOB,$BAL_NAME,$READ_ARMY,$WRITE_ARMY,
  @REBEL_DRAWS,@REBEL_RANGES);
BEGIN{
  no warnings 'redefine';
  *CORE::GLOBAL::rand=sub (;$){
    die 'original rebel RNG exhausted' unless @main::REBEL_DRAWS;
    my $sample=shift @main::REBEL_DRAWS;
    my $range=0+($_[0]//1);
    die 'original rebel RNG sample invalid' unless
      defined($sample)&&$sample=~/^\d+$/&&$sample<1000000;
    push @main::REBEL_RANGES,$range;
    return $sample*$range/1000000;
  };
}
sub source{
  my($p)=@_;
  open my $fh,'<:encoding(UTF-8)',File::Spec->catfile($FindBin::Bin,$p)
    or die $!;
  local $/;my $text=<$fh>;close $fh;return $text;
}
my $dsl=source('../../../custom/inc-rebel-data.cgi');
my $turn=source('inc-turn.cgi');
my $period=source('period.cgi');
die 'original RebelRobin source period state changed' unless
  index($period,'if ($DTevent{rebel})')>=0&&
  index($period,'$DTevent{rebel}=$NOW_TIME+86400*3;')>=0&&
  index($period,'RebelRobin();')>=0;
my @blocks=split(/^\s*\@\@event[^\r\n]*\r?\n/mi,$dsl);
shift @blocks;
for(@blocks){s/^\s*\@\@(event|END|ITEM|FUNC\w+)\b[\s\S]*$//mi;}
my @hits=grep(/^\s*code\s+rebel(?:\s|$)/m,@blocks);
die 'actual source rebel DSL not unique' unless @hits==1;
my($body)=$hits[0]=~/
  ^\s*func\s+_local_\s*\r?\n
  ([\s\S]*?)
  ^[ \t]*_local_[ \t]*$
/mx;
die 'actual rebel NOWFUNC callback absent' unless
  defined($body)&&
  index($body,'main::ReadArmy();')>=0&&
  index($body,'main::WriteArmy();')>=0&&
  index($body,'$main::STATE->{robinb}')>=0&&
  index($body,'rand(100) > 75')>=0&&
  index($body,'rand(5)')>=0&&
  index($body,'return 0;')>=0;
my $dir=tempdir('akimono-r4-rebel-XXXX',TMPDIR=>1,CLEANUP=>1);
make_path("$dir/event-n");
$ITEM_DIR=$dir;
open my $fh,'>:encoding(UTF-8)',"$dir/event-n/rebel.pl" or die $!;
print $fh "use utf8;\npackage event;\nsub _local_now{\n".
  $body."\n}\n1;\n";
close $fh or die $!;
sub PushLog{push @LOG,[@_];1;}
sub RequireFile{die 'unexpected original callback IO';}
sub GetPath{
  my($base,$kind,$key)=@_;
  die 'unsupported original rebel file' unless
    $base eq $ITEM_DIR&&$kind eq 'event-n'&&$key eq 'rebel';
  return "$dir/event-n/rebel.pl";
}
sub ReadArmy{$READ_ARMY++;1;}
sub WriteArmy{$WRITE_ARMY++;1;}
sub GetMoneyString{return $_[0];}
my $from=index($turn,"\t\t#イベント終了処理\n");
my $to=index($turn,"\n\t\t\$temptimenow+=\$timespan;",$from);
die 'original END/START/NOW fragment moved' unless $from>=0&&$to>$from;
my $frag=substr($turn,$from,$to-$from);
for my $marker(
  '@event::DT=@DT;',
  'foreach my $key (keys(%EVENT))',
  'foreach my $key (keys(%DTevent))',
  'my $extfile=GetPath($ITEM_DIR,"event-n",$key);',
  'my($msg)=&$func(split(/[:,]/,$E->{funcparam}));',
  'delete $INC{$extfile};',
){die "original source drift $marker" unless index($frag,$marker)>=0;}
my $ok=eval "package main;no strict;no warnings;use utf8;\n".
  "sub originalRebelTurn{\n".$frag.
  "\nreturn {state=>{%DTevent}};}\n1;";
die "actual source event turn compilation failed: $@" unless $ok;
my %defaultTown=(
  leader=>1,money=>10000,in=>0,out=>0,develop=>5001,
  devem=>0,safety=>5001,safem=>0,army=>10000,robina=>0,robinb=>0,
);
my @defaultShops=(
  {id=>1,name=>'伊洛',shopname=>'一號店',army=>100,money=>1000},
  {id=>2,name=>'菲羅',shopname=>'二號店',army=>2500,money=>2000},
);
sub run{
  my(%in)=@_;
  my $span=$in{span}//3600;
  $temptimenow=1000000;$timespan=$span;$TIMESPAN=$span;
  %EVENT=(rebel=>{
    group=>'source-rebel-group',startproba=>0,basetime=>0,
    plustime=>0,startfunc=>'',endfunc=>'',func=>'_local_now',
    funcparam=>'',startmsg=>'',endmsg=>'',code=>'rebel',
  });
  %DTevent=(rebel=>2000000);
  $STATE={%{$in{town}}};
  @DT=map{{%$_}}@{$in{shops}};
  @ITEM=();@LOG=();
  %id2idx=map{($DT[$_]{id}=>$_)}0..$#DT;
  %RIOT=map{($_=>1)}@{$in{riotIds}};
  %ARMY=%{$in{armyById}};
  $READ_ARMY=0;$WRITE_ARMY=0;
  @REBEL_DRAWS=@{$in{draws}};@REBEL_RANGES=();
  $DTTaxrate=$in{taxRate}//0;
  $BAL_JOB='外敵';$BAL_NAME='首領';
  my $res=originalRebelTurn();
  die "source rebel leftover RNG $in{name}" if @REBEL_DRAWS;
  return {
    name=>$in{name},
    input=>{
      startSeconds=>1000000,spanSeconds=>$span,
      activeUntilSeconds=>2000000,town=>$in{town},
      shops=>$in{shops},riotIds=>$in{riotIds},
      armyById=>$in{armyById},randomDraws=>$in{draws},
      taxRate=>$in{taxRate}//0,balJob=>'外敵',balName=>'首領',
    },
    output=>{
      activeUntilSeconds=>$res->{state}{rebel},
      eventPersisted=>exists($res->{state}{rebel})?
        JSON::PP::true:JSON::PP::false,
      # Each oracle case is a distinct CGI invocation. Global @DT is
      # replaced in later cases; snapshot the actual shop hashes NOW.
      town=>{%$STATE},shops=>[map{{%$_}}@DT],
      riotIds=>[sort{$a<=>$b} keys(%RIOT)],
      armyById=>{%ARMY},taxRate=>$DTTaxrate,
      logs=>[map{[@$_]}@LOG],
      readArmyCalls=>$READ_ARMY,writeArmyCalls=>$WRITE_ARMY,
      randomDrawRanges=>[@REBEL_RANGES],
      drawsUsed=>scalar(@REBEL_RANGES),returnCode=>0,
    },
  };
}
my @cases=(
  run(name=>'rebel-suppressed-with-no-armed-rioters',
    town=>{%defaultTown},shops=>\@defaultShops,
    riotIds=>[],armyById=>{},draws=>[]),
  run(name=>'rebel-bandits-reinforced-city-guards-absorb-loss',
    town=>{%defaultTown,army=>12000,robina=>2000,robinb=>2500},
    shops=>\@defaultShops,riotIds=>[],armyById=>{},
    draws=>[900000,500000]),
  run(name=>'rebel-shop-rioters-army-decreases-but-event-continues',
    town=>{%defaultTown,army=>10000},
    shops=>\@defaultShops,riotIds=>[2],armyById=>{2=>3000},
    draws=>[0]),
  run(name=>'rebel-shop-captures-leadership-after-army-defeat',
    town=>{%defaultTown,army=>100,robinb=>3000},
    shops=>\@defaultShops,riotIds=>[],armyById=>{},
    draws=>[0,500000]),
  run(name=>'rebel-bandit-captures-city-and-shares-city-money',
    town=>{%defaultTown,army=>100,robinb=>5000},
    shops=>\@defaultShops,riotIds=>[],armyById=>{},
    draws=>[0,500000],taxRate=>123),
  run(name=>'bandit-reinforce-boundary-exact-75-not-greater',
    town=>{%defaultTown,army=>12000,robina=>2000,robinb=>2500},
    shops=>\@defaultShops,riotIds=>[],armyById=>{},
    draws=>[750000,500000]),
  run(name=>'bandit-reinforce-boundary-above-75',
    town=>{%defaultTown,army=>12000,robina=>2000,robinb=>2500},
    shops=>\@defaultShops,riotIds=>[],armyById=>{},
    draws=>[750001,500000]),
  run(name=>'rebel-guard-army-over-15000-doubles-time',
    town=>{%defaultTown,army=>20000,robinb=>3000},
    shops=>\@defaultShops,riotIds=>[],armyById=>{},
    draws=>[900000,500000]),
);
print JSON::PP->new->canonical->utf8->encode({
  source=>'frozen original Standard Street rebel DSL NOWFUNC executed under real original inc-turn END/START/NOW text; ReadArmy/WriteArmy/GetMoneyString IO stubs only',
  cases=>\@cases,
  scope=>'single already active rebel, explicit town/shops/RIOT/ARMY; source hash stable for independent rioters; not full external IO/period/CAS',
});
