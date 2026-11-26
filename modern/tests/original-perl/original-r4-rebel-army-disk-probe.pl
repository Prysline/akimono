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
our ($DATA_DIR,$TEMP_DIR,$FILE_EXT,$COMMIT_FILE);
sub OpenAndCheck{open(OUT,'>:encoding(UTF-8)',$_[0]) or die $!}
sub RenameAndCheck{rename($_[0],$_[1]) or die $!}
sub ReadArmy{$READ_ARMY++;OriginalReadArmy()}
sub WriteArmy{$WRITE_ARMY++;OriginalWriteArmy()}
sub putFile{my($p,$s)=@_;open my $f,'>:encoding(UTF-8)',$p or die $!;print $f $s;close $f or die $!}
sub getFile{my($p)=@_;open my $f,'<:encoding(UTF-8)',$p or die $!;local $/;my $s=<$f>;close $f;return $s}
sub GetMoneyString{return $_[0];}
sub RequireFile{die 'unreviewed real original source path';}
sub GetPath{
  my($dir,$kind,$code)=@_;
  return "$DATA_DIR/$dir.cgi" if @_==1&&($dir eq 'army'||$dir eq 'commit');
  return "$TEMP_DIR/army.cgi" if @_==2&&$dir eq $TEMP_DIR&&$kind eq 'army';
  die 'unreviewed event path' unless
    $dir eq $ITEM_DIR&&$kind eq 'event-n'&&$code eq 'rebel';
  return "$ITEM_DIR/event-n/rebel.pl";
}
my $army=source('pinned-army.cgi');
$army=~s/sub ReadArmy\b/sub OriginalReadArmy/ or die 'source read moved';
$army=~s/sub WriteArmy\b/sub OriginalWriteArmy/ or die 'source write moved';
eval "no strict;no warnings;".$army or die $@;
my $write=source('write.cgi');my($commit)=$write=~/(^sub DataCommitOrAbort\n\{[\s\S]*?^\}\n)/m;
die 'commit source missing' unless $commit;
eval "no strict;no warnings;$commit\n1;" or die $@;
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
make_path("$tmp/event-n","$tmp/live","$tmp/stage");$ITEM_DIR=$tmp;
$DATA_DIR="$tmp/live";$TEMP_DIR="$tmp/stage";$FILE_EXT=".cgi";$COMMIT_FILE="commit";
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
  my $initialArmy=join(',',%ARMY)."\n".join(',',keys %RIOT)."\n";
  putFile(GetPath("army"),$initialArmy);
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
    town=>{%$STATE},shops=>[map{{%$_,army=>0+$_->{army}}}@DT],
    riotIds=>[sort{$a<=>$b}map {0+$_} keys(%RIOT)],armyById=>{map {$_=>0+$ARMY{$_}} keys %ARMY},
    activeUntilSeconds=>$until,
    eventState=>{%{$state->{state}}},
    eventPersisted=>defined($until)?JSON::PP::true:JSON::PP::false,
    logs=>[map{[@$_]}@LOG],randomDrawRanges=>[@COMBINED_RANGES],
    drawsUsed=>scalar(@COMBINED_RANGES),
    taxRate=>$DTTaxrate,readArmyCalls=>$READ_ARMY,
    writeArmyCalls=>$WRITE_ARMY,
  };
  my $stagedArmy=-e GetPath($TEMP_DIR,"army")?getFile(GetPath($TEMP_DIR,"army")):undef;
  die 'live file changed before commit' unless getFile(GetPath("army")) eq $initialArmy;
  DataCommitOrAbort(0);
  my $liveArmy=getFile(GetPath("army"));
  OriginalReadArmy();
  my $reloaded={armyById=>{map {$_=>0+$ARMY{$_}} keys %ARMY},riotIds=>[sort {$a<=>$b} map {0+$_} keys %RIOT]};
  return {
    initialArmy=>$initialArmy,stagedArmy=>$stagedArmy,liveArmy=>$liveArmy,reloaded=>$reloaded,
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

# A real single-turn two NOW sequence: the second ReadArmy must read LIVE,
# not the first stage. Third slice is after the isolated commit.
sub multiSlice {
  $NOW_TIME=1000000;$temptimenow=$NOW_TIME;$timespan=3600;$TIMESPAN=3600;
  $STATE={%baseTown,army=>6000,robina=>4000};@DT=map{{%$_}}@baseShops;
  @ITEM=();@LOG=();%EVENT=(rebel=>{code=>'rebel',group=>'rebel-group',startproba=>0,
    basetime=>0,plustime=>0,startfunc=>'',endfunc=>'',func=>'_local_now',funcparam=>'',startmsg=>'',endmsg=>''});
  %DTevent=(rebel=>1000005);
  %id2idx=map{($DT[$_]{id}=>$_)}0..$#DT;
  $BAL_JOB='外敵';$BAL_NAME='首領';$DTTaxrate=0;
  my $initial="2,4000\n2\n";putFile(GetPath("army"),$initial);
  my @steps;
  for my $i(0..2){
    my $liveBefore=getFile(GetPath("army"));
    my $input={startSeconds=>$temptimenow,nowSeconds=>$NOW_TIME,spanSeconds=>3600,
      town=>{%$STATE},shops=>[map{{%$_,army=>0+$_->{army}}}@DT],
      activeUntilSeconds=>0+$DTevent{rebel},randomDraws=>[0],periodDrawCount=>0,
      nowDrawCount=>1,leaderShopExists=>JSON::PP::true,taxRate=>$DTTaxrate,
      balJob=>$BAL_JOB,balName=>$BAL_NAME};
    @LOG=();@COMBINED_DRAWS=(0);@COMBINED_RANGES=();$READ_ARMY=0;$WRITE_ARMY=0;
    originalPeriodRebelFragment() if $i==0;
    originalRebelEventFragment();
    die 'multi slice unused RNG' if @COMBINED_DRAWS;
    my $stage=getFile(GetPath($TEMP_DIR,"army"));
    die 'multi slice prematurely changed live' unless getFile(GetPath("army")) eq $liveBefore;
    my $output={town=>{%$STATE},shops=>[map{{%$_,army=>0+$_->{army}}}@DT],
      activeUntilSeconds=>0+$DTevent{rebel},armyById=>{map {$_=>0+$ARMY{$_}}keys %ARMY},
      riotIds=>[sort {$a<=>$b}map {0+$_}keys %RIOT],taxRate=>$DTTaxrate,
      logs=>[map{[@$_]}@LOG],drawsUsed=>scalar @COMBINED_RANGES,
      randomDrawRanges=>[@COMBINED_RANGES],readArmyCalls=>$READ_ARMY,writeArmyCalls=>$WRITE_ARMY};
    push @steps,{input=>$input,output=>$output,liveBefore=>$liveBefore,stage=>$stage};
    DataCommitOrAbort(0) if $i>=1;
    $temptimenow+=3600;
  }
  return {steps=>\@steps,initial=>$initial,final=>getFile(GetPath("army"))};
}

my $multi=multiSlice();
sub edgeCases {
  my @rows;
  for my $pair (['missing',undef],['no-final-LF',"2,3000\n2"],['odd-pairs',"2,3000,9\n2\n"],['duplicate',"2,3000,2,123\n2\n"]){
    my($name,$bytes)=@$pair;unlink GetPath("army") if -e GetPath("army");
    putFile(GetPath("army"),$bytes) if defined $bytes;
    OriginalReadArmy();
    push @rows,{name=>$name,bytes=>$bytes,armyById=>{map{$_=>(defined($ARMY{$_})?0+$ARMY{$_}:undef)}keys %ARMY},
      riotIds=>[sort {$a<=>$b}map{0+$_}keys %RIOT]};
  }
  return \@rows;
}
my $edges=edgeCases();

# Actual army-s commands and their real source file commit, followed by
# original NOWFUNC on the very same state. Only the outer account/renderer
# and play.cgi write are adapters. Do not count this as player acquisition.
our ($DT,$MAX_STOCK_TIME,$USER,$num,$ret,$disp,$TBT,$TRT,$TD,$TRE,$TBE,$NOMENU,%Q);
sub Lock{1}sub DataRead{1}sub CheckUserPass{1}
sub RenewLog{1}sub DataWrite{1}sub UnLock{1}sub OutSkin{1}
sub GetTagImgJob{''}sub GetMenuTag{''}sub GetTime2HMS{$_[0]}
sub OutError{die "source command refused: $_[0]"}
require "$FindBin::Bin/calc.cgi";
sub slimShops{ return [map{{id=>$_->{id},name=>$_->{name},shopname=>$_->{shopname},
 money=>0+$_->{money},army=>0+$_->{army}}}@DT] }
sub conflictChain{
  $NOW_TIME=1000000;$MAX_STOCK_TIME=259200;$USER='fixture';
  $temptimenow=$NOW_TIME;$timespan=$TIMESPAN=3600;
  $STATE={%baseTown,leader=>1,army=>10000,robina=>0,safety=>6000,develop=>6000};
  @DT=map{{id=>$_,name=>"owner$_",shopname=>"shop$_",army=>$_*10,
    money=>800000,status=>1,dignity=>5,time=>$NOW_TIME-10000}}1..4;
  %id2idx=map{($DT[$_]{id}=>$_)}0..$#DT;
  %DTevent=();@ITEM=();@LOG=();$BAL_JOB='外敵';$BAL_NAME='首領';$DTTaxrate=0;
  %EVENT=(rebel=>{code=>'rebel',group=>'rebel-group',startproba=>0,
    basetime=>0,plustime=>0,startfunc=>'',endfunc=>'',func=>'_local_now',
    funcparam=>'',startmsg=>'',endmsg=>''});
  my $initial="1,300,2,4000,3,4000,4,800\n\n";
  putFile(GetPath("army"),$initial);
  my @commands;my $revision=5;
  for my $row([2,'rebelon'],[3,'rside'],[4,'lside'],[1,'lside']){
    my($id,$mode)=@$row;
    $DT=$DT[$id2idx{$id}];%Q=(mode=>$mode,cmd=>'rebel');
    $disp=$ret=$TBT=$TRT=$TD=$TRE=$TBE='';@LOG=();
    my $input={world=>{schema=>'akimono.memory-world.v2',revision=>$revision,nowSeconds=>$NOW_TIME,
      events=>undef,shops=>[map{{%$_}}@DT],period=>{town=>{%$STATE},eventState=>{%DTevent}}},
      armyBytes=>getFile(GetPath("army"))};
    my $ok=do "$FindBin::Bin/pinned-army-s.cgi";die "conflict command $mode: $@ $!" unless $ok;
    die 'source command did not commit army' if -e GetPath($TEMP_DIR,"army")||-e GetPath("commit");
    push @commands,{input=>$input,mode=>$mode,id=>$id,output=>{
      shops=>[map{{%$_}}@DT],town=>{%$STATE},eventState=>{%DTevent},logs=>[map{[@$_]}@LOG],
      armyBytes=>getFile(GetPath("army"))}};
    $revision++;
  }
  my @now;
  # Two source slices within a transaction, then a third after commit.
  for my $i(0..2){
    my $live=getFile(GetPath("army"));
    my $input={startSeconds=>$temptimenow,spanSeconds=>3600,activeUntilSeconds=>0+$DTevent{rebel},
      town=>{%$STATE},shops=>slimShops(),randomDraws=>[0],taxRate=>$DTTaxrate,
      balJob=>$BAL_JOB,balName=>$BAL_NAME};
    @LOG=();@COMBINED_DRAWS=(0);@COMBINED_RANGES=();$READ_ARMY=$WRITE_ARMY=0;
    originalRebelEventFragment();die 'conflict NOW unused RNG' if @COMBINED_DRAWS;
    die 'conflict NOW changed live prematurely' unless getFile(GetPath("army")) eq $live;
    my $stage=getFile(GetPath($TEMP_DIR,"army"));
    push @now,{input=>$input,liveBefore=>$live,stage=>$stage,output=>{
      town=>{%$STATE},shops=>slimShops(),activeUntilSeconds=>0+$DTevent{rebel},
      riotIds=>[sort{$a<=>$b}map{0+$_}keys %RIOT],armyById=>{map{$_=>0+$ARMY{$_}}keys %ARMY},
      taxRate=>$DTTaxrate,logs=>[map{[@$_]}@LOG],randomDrawRanges=>[@COMBINED_RANGES],
      drawsUsed=>scalar @COMBINED_RANGES,readArmyCalls=>$READ_ARMY,writeArmyCalls=>$WRITE_ARMY}};
    DataCommitOrAbort(0) if $i>=1;$temptimenow+=3600;
  }
  return {initial=>$initial,commands=>\@commands,now=>\@now,final=>getFile(GetPath("army"))};
}
my $conflict=conflictChain();

# Real WriteArmy removes zero soldiers but leaves RIOT. After the commit,
# another ReadArmy reads the RIOT with no army key; NOW sets DT.army to undef.
sub zeroRiotChain{
  $NOW_TIME=1000000;$temptimenow=$NOW_TIME;$timespan=$TIMESPAN=3600;
  $STATE={%baseTown,leader=>1,army=>10000,robina=>0,robinb=>0};
  @DT=map{{%$_}}@baseShops;
  %id2idx=map{($DT[$_]{id}=>$_)}0..$#DT;
  @ITEM=();@LOG=();$BAL_JOB='外敵';$BAL_NAME='首領';$DTTaxrate=0;
  %EVENT=(rebel=>{code=>'rebel',group=>'rebel-group',startproba=>0,
    basetime=>0,plustime=>0,startfunc=>'',endfunc=>'',func=>'_local_now',
    funcparam=>'',startmsg=>'',endmsg=>''});
  %DTevent=(rebel=>$NOW_TIME+259200);
  my $initial="1,4000,2,500\n1,2\n";putFile(GetPath("army"),$initial);
  my @steps;
  for my $i(0..3){
    my $live=getFile(GetPath("army"));
    my $input={startSeconds=>$temptimenow,spanSeconds=>3600,activeUntilSeconds=>0+$DTevent{rebel},
      town=>{%$STATE},shops=>[map{{%$_,army=>defined($_->{army})?0+$_->{army}:undef}}@DT],randomDraws=>$i==3?[]:[0],
      taxRate=>$DTTaxrate,balJob=>$BAL_JOB,balName=>$BAL_NAME};
    @LOG=();@COMBINED_DRAWS=@{$input->{randomDraws}};@COMBINED_RANGES=();$READ_ARMY=$WRITE_ARMY=0;
    originalRebelEventFragment();die 'zero RIOT unused RNG' if @COMBINED_DRAWS;
    die 'zero RIOT changed live prematurely' unless getFile(GetPath("army")) eq $live;
    my $stage=getFile(GetPath($TEMP_DIR,"army"));
    my $output={town=>{%$STATE},shops=>[map{{%$_,army=>defined($_->{army})?0+$_->{army}:undef}}@DT],
      activeUntilSeconds=>$DTevent{rebel},riotIds=>[sort{$a<=>$b}map{0+$_}keys %RIOT],
      armyById=>{map{$_=>0+$ARMY{$_}}keys %ARMY},taxRate=>$DTTaxrate,
      logs=>[map{[@$_]}@LOG],randomDrawRanges=>[@COMBINED_RANGES],
      drawsUsed=>scalar @COMBINED_RANGES,readArmyCalls=>$READ_ARMY,writeArmyCalls=>$WRITE_ARMY};
    DataCommitOrAbort(0);
    push @steps,{input=>$input,liveBefore=>$live,stage=>$stage,output=>$output,liveAfter=>getFile(GetPath("army"))};
    $temptimenow+=3600;
  }
  return {initial=>$initial,steps=>\@steps,final=>getFile(GetPath("army"))};
}
my $zeroRiot=zeroRiotChain();
print JSON::PP->new->canonical->utf8->encode({
  multi=>$multi,edges=>$edges,conflict=>$conflict,zeroRiot=>$zeroRiot,
  source=>'complete frozen period.cgi RebelRobin + period rebel branch executed BEFORE actual inc-turn EVENT END/START/NOW and original rebel NOWFUNC body, one event',
  cases=>\@cases,
  scope=>'isolated single CITY/REBEL slice, original source execution + controlled rand only; real isolated army staging and commit/reload; no other 16 EVENTs or full period/WorldState',
});
