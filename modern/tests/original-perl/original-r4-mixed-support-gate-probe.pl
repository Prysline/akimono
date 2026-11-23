use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use File::Spec;
use lib $FindBin::Bin;
use OriginalGiftMapUseHarness;
use File::Temp qw(tempdir);
use File::Path qw(make_path);

BEGIN {
  no warnings 'redefine';
  *CORE::GLOBAL::rand=sub (;$) {
    die 'R4 multi-event original RNG exhausted' unless @main::R4_MULTI_DRAWS;
    my $sample=shift @main::R4_MULTI_DRAWS;
    die 'unsafe original RNG fixture' unless
      defined($sample)&&$sample=~/^\d+$/&&$sample<1000000;
    my $range=0+($_[0]//1);
    push @main::R4_MULTI_RANGES,$range;
    return $sample*$range/1000000;
  };
}
binmode STDOUT,':raw';
our (@ITEM,@out_item,@rows,%EVENT,%DTevent,$temptimenow,$timespan,
     @DT,@LOG,@R4_MULTI_DRAWS,@R4_MULTI_RANGES,$ITEM_DIR,$MAX_MONEY,$TIMESPAN,
     %GUILD,%GUILD_DATA,$DOMINION,$READ_GUILD,$READ_GUILD_DATA,$SET_TOWN);
my $callbackRoot=tempdir('akimono-r4-mixed-XXXXXX',TMPDIR=>1,CLEANUP=>1);
make_path("$callbackRoot/event-s","$callbackRoot/event-n",
  "$callbackRoot/event-e");
$ITEM_DIR=$callbackRoot;$MAX_MONEY=999999999;
sub PushLog {push @LOG,[@_];1;}
sub WriteLog {push @LOG,[@_];1;}
sub event::WriteLog {return main::WriteLog(@_);}
sub RequireFile {die 'unexpected original file' unless $_[0] eq 'inc-event.cgi';1;}
sub GetPath {
  my($dir,$kind,$code)=@_;
  die 'unsupported callback path' unless
    $dir eq $ITEM_DIR&&(
      ($kind eq 'event-s'&&
        ($code eq 'getmoney'||$code eq 'getpop'||
         $code eq 'manbiki'||$code eq 'goutou'||$code eq 'loto'))||
      ($kind eq 'event-n'&&exists($EVENT{$code}))||
      ($kind eq 'event-e'&&$code eq 'guildbattle')
    );
  return "$callbackRoot/$kind/$code.pl";
}
sub ReadGuild {$READ_GUILD++;1;}
sub ReadGuildData {$READ_GUILD_DATA++;1;}
sub SetTownData {
  die 'original guildbattle unexpected town mutation' unless $_[0] eq 'dominion';
  $DOMINION=$_[1];$SET_TOWN++;1;
}
sub GetMoneyString {return $_[0];}
# The frozen callback runs as package event; the real game formatter is
# outside this isolated oracle. Stub its package-level display dependency.
sub event::GetMoneyString {return main::GetMoneyString(@_);}
OriginalGiftMapUseHarness::compile();
my $dsl=OriginalGiftMapUseHarness::original_dsl();
my $compiler=OriginalGiftMapUseHarness::source('inc-makeitem.cgi');
my $turn=OriginalGiftMapUseHarness::source('inc-turn.cgi');
my $read=OriginalGiftMapUseHarness::source('inc-func.cgi');
die 'original DataRead active hash loader changed' unless
  index($read,'foreach(keys(%DTevent)){require(GetPath($ITEM_DIR,"event",$_));}')>=0;
for my $marker('foreach my $key (keys(%DTevent))',
               'foreach my $key (keys(%EVENT))'){
  die "original source hash traversal missing $marker"
    unless index($turn,$marker)>=0;
}

# Source-execute compiler-produced hash initializer exactly as in original
# r4-event-hash-order Oracle, preserving the genuine 17-key Perl hash.
my $catalogProbe=File::Spec->catfile($FindBin::Bin,
  'original-b53-event-catalog-probe.pl');
open my $pipe,'-|',$^X,$catalogProbe or die 'source catalog child failed';
local $/;
my $catJson=<$pipe>;
close $pipe or die 'source catalog child nonzero';
my $catalog=JSON::PP->new->utf8->decode($catJson);
my @compiled=grep{$_->{compiled}}@{$catalog->{declared}};
die '17 original EVENT keys required' unless @compiled==17;

my @targets=qw(boom-posyon tate-sale yoroi-sale tue-sale
  plusdown-yakusou plusup-misuriru plusup-oriharukon);
my %wanted=map{($_=>1)}@targets;
my %support=map{($_=>1)}qw(getmoney getpop);
my %instant=map{($_=>1)}qw(manbiki goutou);
my %loto=map{($_=>1)}qw(loto);
my %happy=map{($_=>1)}qw(happy);
my %specialGuild=map{($_=>1)}qw(guildbattle);
my @durableExtra=qw(plusup-tetu ken-sale);
my %durableExtra=map{($_=>1)}@durableExtra;
my @blocks=split(/^\s*\@\@EVENT[^\r\n]*\r?\n/mi,$dsl);
shift @blocks;
for(@blocks){s/^\s*\@\@(ITEM|USE|EVENT|DEFINE|END|FUNC[A-Z]+)\b[\s\S]*$//mi;}
my(%messages,%generated);
my $cstart=index($compiler,'foreach my $param (@{$event->{param}})');
my $cend=index($compiler,'print EOUTSUB "1;\n";',$cstart);
die 'actual compiler ITEM PARAM generator moved' unless $cstart>=0&&$cend>$cstart;
my $paramSource=substr($compiler,$cstart,$cend-$cstart);
my $ok=eval 'package main; use utf8; no strict; no warnings; '.
  "sub R4MultiParamCompiler{my \$event=shift;\n".$paramSource."\n}\n1;";
die "original PARAM compiler executable failed: $@" unless $ok;
for my $code(@targets,@durableExtra){
  my @matches=grep(/^\s*code\s+\Q$code\E(?:\s|$)/m,@blocks);
  die "original declarative EVENT $code changed" unless @matches==1;
  my(%fields,@params);
  for my $line(split(/\r?\n/,$matches[0])){
    $line=~s/\s+#.*$//;$line=~s/\s+$//;
    if($line=~/^\s*(startmsg|endmsg)\s+(.+?)$/){
      push @{$fields{$1}},$2;
    }
    push @params,"$1\t$2" if $line=~/^\s*param\s+(\S+)\s+(\S+)/;
  }
  die "$code source messages or parameters drift" unless
    @{$fields{startmsg}//[]}==1&&@{$fields{endmsg}//[]}==1&&@params;
  $messages{$code}={start=>$fields{startmsg}[0],end=>$fields{endmsg}[0]};
  my $generated='';
  open my $writer,'>',\$generated or die $!;
  {no strict 'refs';local *EOUTSUB=$writer;
    R4MultiParamCompiler({param=>\@params});}
  close $writer;
  die "$code generated compiler ITEM source empty" unless $generated=~/\$ITEM\[/;
  $generated{$code}=$generated;
}

# Compile actual unmodified getmoney/getpop body into temporary generated
# files. Original inc-turn does real require, calls event::_local_start,
# logs returned message, undefines function and drops %INC path.
my %argsFor=(getmoney=>100000,getpop=>1000);
for my $code(qw(getmoney getpop)){
  my @hits=grep(/^\s*code\s+\Q$code\E(?:\s|$)/m,@blocks);
  die "source callback $code missing" unless @hits==1;
  my($head,$body)=$hits[0]=~/
    ^\s*startfunc\s+(\S+)[^\n]*\r?\n
    ([\s\S]*?)
    ^[ \t]*_local_[ \t]*$
  /mx;
  die "frozen source callback $code drift" unless
    defined($body)&&$head eq "_local_($argsFor{$code})" &&
    $body=~/rand\(1000\)/&&$body!~/\@\@/;
  open my $writer,'>:encoding(UTF-8)',"$callbackRoot/event-s/$code.pl"
    or die $!;
  print $writer "use utf8;\npackage event;\nsub _local_start {\n".
    $body."\n}\n1;\n";
  close $writer or die $!;
}

# Compile the two frozen robbery/theft STARTFUNC bodies exactly as emitted
# by source compiler GetLocalFunction/GetFuncItemNo. The only macro is item
# no 64 ("看門機器人"); validate both compiler source and original DSL.
die 'original ITEMNO compiler changed' unless
  index($compiler,'GetFuncItemNo($event->{localfuncstart}')>=0&&
  index($compiler,'$val=~s/$g_define->{cmdhead}ITEMNO')>=0&&
  $dsl=~/^\@\@ITEM[^\r\n]*\r?\n\s*no\s+64(?:\s|#)[\s\S]*?^\s*name\s+看門機器人(?:\s|$)/m;
my %instantArgs=(manbiki=>'400,200',goutou=>'700');
for my $code(qw(manbiki goutou)){
  my @hits=grep(/^\s*code\s+\Q$code\E(?:\s|$)/m,@blocks);
  die "original instant source EVENT $code changed" unless @hits==1;
  my($head,$body)=$hits[0]=~/
    ^\s*startfunc\s+(\S+)[^\n]*\r?\n
    ([\s\S]*?)
    ^[ \t]*_local_[ \t]*$
  /mx;
  die "$code source STARTFUNC body or args changed" unless
    defined($body)&&$head eq "_local_($instantArgs{$code})";
  my $macros=()=$body=~/\@\@ITEMNO"看門機器人"/g;
  die "$code original robot macro absent" unless $macros>=2;
  $body=~s/\@\@ITEMNO"看門機器人"/64/g;
  die "unreviewed original callback macro in $code" if $body=~/\@\@/;
  open my $w,'>:encoding(UTF-8)',"$callbackRoot/event-s/$code.pl"
    or die $!;
  print $w "use utf8;\npackage event;\nsub _local_start {\n".
    $body."\n}\n1;\n";
  close $w or die $!;
}
# Compile the actual unchanged loto _local_ body into the same event
# package as the other callbacks; only file dispatch and log IO are stubbed.
{
  my @hits=grep(/^\s*code\s+loto(?:\s|$)/m,@blocks);
  die 'original loto EVENT source changed' unless @hits==1;
  my($head,$body)=$hits[0]=~/
    ^\s*startfunc\s+(\S+)[^\n]*\r?\n
    ([\s\S]*?)
    ^[ \t]*_local_[ \t]*$
  /mx;
  die 'original loto STARTFUNC body drift' unless
    defined($body)&&$head eq '_local_'&&
    index($body,'my $rnd=rand(6096454);')>=0&&
    index($body,'$DT->{item}[11-1]=0;')>=0&&
    index($body,'WriteLog(2,0,"抽獎卷的開獎開始了");')>=0&&
    index($body,'return 0;')>=0&&
    $body!~/\@\@/;
  open my $w,'>:encoding(UTF-8)',"$callbackRoot/event-s/loto.pl" or die $!;
  print $w "use utf8;\npackage event;\nsub _local_start {\n".
    $body."\n}\n1;\n";
  close $w or die $!;
}
# The genuine guildbattle END callback comes from the frozen REBEL DSL.
# It is dynamically required by the original inc-turn END branch, and its
# ReadGuild/ReadGuildData/SetTownData interfaces are explicit IO stubs.
{
  my $rebelPath=File::Spec->catfile($FindBin::Bin,
    '../../../custom/inc-rebel-data.cgi');
  open my $reader,'<:encoding(UTF-8)',$rebelPath or die $!;
  local $/;
  my $rebelDsl=<$reader>;
  close $reader;
  my @blocks=split(/^\s*\@\@event[^\r\n]*\r?\n/mi,$rebelDsl);
  shift @blocks;
  for(@blocks){s/^\s*\@\@(event|END|ITEM|FUNC\w+)\b[\s\S]*$//mi;}
  my @hits=grep(/^\s*code\s+guildbattle(?:\s|$)/m,@blocks);
  die 'frozen guildbattle source missing' unless @hits==1;
  my($body)=$hits[0]=~/
    ^\s*endfunc\s+_local_\s*\r?\n
    ([\s\S]*?)
    ^[ \t]*_local_[ \t]*$
  /mx;
  die 'frozen guildbattle END callback changed' unless
    defined($body)&&
    index($body,'main::ReadGuild();')>=0&&
    index($body,'main::ReadGuildData();')>=0&&
    index($body,"main::SetTownData('dominion',")>=0&&
    index($body,'return 1,')>=0;
  my $out="$callbackRoot/event-e/guildbattle.pl";
  open my $writer,'>:encoding(UTF-8)',$out or die $!;
  print $writer "use utf8;\npackage event;\nsub _local_end {\n".
    $body."\n}\n1;\n";
  close $writer or die $!;
  $event::GUILDIDX_name=0;
}
# True happy NOWFUNC: exact frozen DSL body compiled into the existing
# event-n file, then required by the original inc-turn NOWFUNC loop.
{
  my @hits=grep(/^\s*code\s+happy(?:\s|$)/m,@blocks);
  die 'original happy EVENT source changed' unless @hits==1;
  my($body)=$hits[0]=~/
    ^\s*func\s+_local_[ \t]*\r?\n
    ([\s\S]*?)
    ^[ \t]*_local_[ \t]*$
  /mx;
  die 'original happy NOWFUNC source changed' unless
    defined($body)&&
    index($body,'my $time=$main::TIMESPAN;')>=0&&
    index($body,'$time=int($time/36);')>=0&&
    index($body,'$_->{rank}+=int(rand($time));')>=0&&
    index($body,'return 0;')>=0&&
    $body!~/\@\@/;
  # START/END messages must be compiled from the same frozen happy DSL.
  # Without this the original END/START region would execute a test-only
  # blank message instead of the source EVENT log.
  my($startmsg)=$hits[0]=~/^[ \t]*startmsg[ \t]+([^\r\n]+)$/m;
  my($endmsg)=$hits[0]=~/^[ \t]*endmsg[ \t]+([^\r\n]+)$/m;
  for($startmsg,$endmsg){s/^[ \t]+|[ \t]+$//g if defined $_;}
  die 'original happy START/END messages missing or changed' unless
    defined($startmsg)&&defined($endmsg)&&
    $startmsg eq '街上開始舉辦感謝祭了。'&&
    $endmsg eq '感謝祭已經結束了。';
  $messages{happy}={start=>$startmsg,end=>$endmsg};
  open my $w,'>:encoding(UTF-8)',"$callbackRoot/event-n/happy.pl" or die $!;
  print $w "use utf8;\npackage event;\nsub _local_now {\n".
    $body."\n}\n1;\n";
  close $w or die $!;
}
@rows=map{
  my $e=$_;
  my $m=$messages{$e->{code}}//{start=>'',end=>''};
  my $start=$e->{callbacks}{start}//'';
  my $params='';
  if($start=~/^_local_(?:\((.*)\))?$/){
    $params=defined($1)?$1:'';
    $start='_local_start';
  }
  my $end=$e->{callbacks}{end}//'';
  $end='_local_end' if $end=~/^_local_/;
  my $now=$e->{callbacks}{now}//'';
  $now='_local_now' if $now=~/^_local_/;
  join("\t",$e->{code},$e->{group},$e->{startProba},
    $start,$params,$end,'',
    $e->{baseTimeSeconds},$e->{plusTimeSeconds},
    $m->{start},$m->{end},$now,'')
}@compiled;
my($initializer)=$compiler=~/
  print\ EOUT\ <<'CODE';\r?\n
  (\)\r?\n\{\r?\n[\s\S]*?^\}\r?\n)
  CODE
/mx;
die 'actual emitted original EVENT hash initializer moved' unless $initializer;
for my $needle('my $hash={};','$EVENT{$hash->{code}}=$hash;',
               ')=split(/\t/);'){
  die "original EVENT initializer drift $needle"
    unless index($initializer,$needle)>=0;
}
$ok=eval "package main;no strict;no warnings;foreach(\@rows\n".
  $initializer."\n1;";
die "source original EVENT initializer could not eval: $@" unless $ok;
die 'source generated EVENT hash does not have 17 keys' unless keys(%EVENT)==17;
my @runtimeHashKeys=keys(%EVENT);
my $from=index($turn,"\t\t#イベント終了処理\n");
my $to=index($turn,"\n\t\t\$temptimenow+=\$timespan;",$from);
die 'source END/START original fragment changed' unless $from>=0&&$to>$from;
my $region=substr($turn,$from,$to-$from);
$ok=eval "package main;use utf8;no strict;no warnings;\n".
  "sub R4MultiOriginalEventSlice {\n".$region.
  "\nreturn {state=>{%DTevent},groups=>{%group}};}\n1;";
die "original full END/START fragment failed: $@" unless $ok;

my @baseItems=map {{
  itemId=>$_,price=>1000+5*$_,pricebase=>2000+7*$_,
  pricehalf=>3000+11*$_,popular=>5000+20*$_,
  plus=>60+$_,point=>100+$_
}}1..79;
sub step {
  my(%o)=@_;
  my ($begin,$span)=($o{begin},3600);
  $temptimenow=$begin;$timespan=$span;$TIMESPAN=$span;
  @ITEM=(undef,map{{%{$_}}}@baseItems);
  my @activeOrder=keys(%DTevent);
  for my $key(@activeOrder){
    if($key eq 'happy'||$specialGuild{$key}){next;}
    die "unreviewed active code $key" unless
      $wanted{$key}||$durableExtra{$key};
    my $executed=eval 'package main;use utf8;no strict;no warnings;'.
       $generated{$key}.'1;';
    die "actual generated ITEM load failed: $@" unless $executed;
  }
  my @current=map{{%{$_}}}@ITEM[1..79];
  # The original compiled ITEM catalog also holds names (B-55 source uses
  # $ITEM[64]{name} for the robot message); keep numeric DataRead snapshots
  # separate from the source callback display metadata.
  $ITEM[64]{name}='看門機器人';
  my $initial=$o{shop} or die 'single real callback shop needed';
  my $shop={%$initial,item=>[@{$initial->{item}}],
    showcase=>[@{$initial->{showcase}}],price=>[@{$initial->{price}}]};
  my $guildInput=$o{guildContext};
  %GUILD=();%GUILD_DATA=();$DOMINION='';
  $READ_GUILD=0;$READ_GUILD_DATA=0;$SET_TOWN=0;
  if($guildInput){
    die 'explicit mixed guild context required' unless
      ref($guildInput)eq 'HASH'&&
      ref($guildInput->{guilds})eq 'ARRAY'&&
      defined($guildInput->{dominion});
    $DOMINION=$guildInput->{dominion};
    for my $g(@{$guildInput->{guilds}}){
      die 'original guild source row invalid' unless
        ref($g)eq'HASH'&&$g->{id}&&defined($g->{name})&&
        defined($g->{money});
      $GUILD{$g->{id}}=[$g->{name}];
      $GUILD_DATA{$g->{id}}={money=>$g->{money}};
      $GUILD_DATA{$g->{id}}{guild}=$g->{guild} if exists $g->{guild};
    }
  }
  # CGI process isolation: original END uses undef &$func but does not
  # delete %INC. Each step is one independent source CGI request.
  delete $INC{"$callbackRoot/event-e/guildbattle.pl"};
  my @startOrder=keys(%EVENT);
  die 'source original 17-key order unexpectedly unstable' unless
    join("\0",@startOrder)eq join("\0",@runtimeHashKeys);
  # Only construct controlled source RNG stimuli. END/START and the
  # consumed draw ranges are executed by the unmodified original fragment.
  my %groups=();
  for my $code(@activeOrder){
    $groups{$EVENT{$code}{group}}=1 if $DTevent{$code}>=$begin+$span;
  }
  my @samples;
  my $happyStillActive=exists($DTevent{happy}) &&
    $DTevent{happy}>=$begin+$span;
  my $happyStarted=0;
  my $robot=$shop->{item}[63];
  for my $code(@startOrder){
    my $e=$EVENT{$code};
    next if $groups{$e->{group}};
    my $start=($wanted{$code}&&$o{wantedStarts}{$code})||
      ($support{$code}&&$o{supportStarts}{$code})||
      ($instant{$code}&&($o{instantStarts}//{})->{$code})||
      ($loto{$code}&&($o{lotoStarts}//{})->{$code})||
      ($happy{$code}&&($o{happyStarts}//{})->{$code})||
      ($durableExtra{$code}&&($o{durableStarts}//{})->{$code});
    push @samples,$start?0:999999;
    if($start&&$wanted{$code}){
      push @samples,250000,500000;
      $groups{$e->{group}}=1;
    }elsif($start&&$durableExtra{$code}){
      my($base,$plus)= $code eq 'plusup-tetu'?(43200,43200):(21600,86400);
      die 'compiled original iron/sword duration or callbacks drift' unless
        !$e->{startfunc}&&!$e->{endfunc}&&!$e->{func}&&
        $e->{basetime}==$base&&$e->{plustime}==$plus&&
        $e->{startproba}==100;
      my $durations=($o{durableDurations}//{})->{$code}//[250000,500000];
      die 'two source durable duration draws required' unless
        ref($durations)eq'ARRAY'&&@$durations==2;
      push @samples,@$durations;
      $groups{$e->{group}}=1;
    }elsif($start&&$happy{$code}){
      die 'compiled original happy START/NOW contract drift' unless
        !$e->{startfunc}&&!$e->{endfunc}&&
        $e->{func} eq '_local_now'&&
        $e->{basetime}==18000&&$e->{plustime}==18000&&
        $e->{startproba}==100;
      my $durations=($o{happyDurations}//{})->{$code}//[250000,500000];
      die 'two happy duration draws needed' unless
        ref($durations)eq'ARRAY'&&@$durations==2;
      push @samples,@$durations;
      $groups{$e->{group}}=1;
      $happyStarted=1;
    }elsif($start&&$support{$code}){
      die 'compiled support callback contract drift' unless
        $e->{startfunc} eq '_local_start'&&
        $e->{startfuncparam}==$argsFor{$code}&&
        !$e->{basetime}&&!$e->{plustime};
      push @samples,$o{supportDraws}{$code}//0;
    }elsif($start&&$instant{$code}){
      die 'actual source instant STARTFUNC compiled arguments drift' unless
        $e->{startfunc} eq '_local_start' &&
        $e->{startfuncparam} eq $instantArgs{$code} &&
        !$e->{basetime}&&!$e->{plustime};
      my $draws=($o{instantDraws}//{})->{$code}//[0];
      die 'unreviewed source instant draw fixture' unless
        ref($draws)eq'ARRAY'&&@$draws>=1&&@$draws<=2;
      my $first=$draws->[0];push @samples,$first;
      if($code eq 'manbiki'&&$first<=400000&&$robot>0){
        die 'robot protection consumes second rand(1000)' unless
          defined($draws->[1]);
        push @samples,$draws->[1];
        $robot=0 if $draws->[1]<=200000;
      }elsif($code eq 'goutou'&&$first<=700000&&$robot>0){
        $robot=0;
      }
      # Original instant callback always returns ret=0, no group lock.
    }elsif($start&&$loto{$code}){
      die 'compiled source loto contract changed' unless
        $e->{startfunc} eq '_local_start' &&
        $e->{startfuncparam} eq '' &&
        !$e->{basetime}&&!$e->{plustime}&&
        $e->{startproba}==500;
      my $draws=($o{lotoDraws}//{})->{$code}//[];
      my $tickets=$shop->{item}[10];
      die 'source loto requires exactly one draw per owned ticket' unless
        ref($draws)eq'ARRAY'&&$tickets>=0&&$tickets<=50&&
        @$draws==$tickets;
      push @samples,@$draws;
      # Original returns zero, not a durable event or group reservation.
    }elsif($e->{startproba}==0){
      die 'original zero-start callback/duration changed' if
        $e->{startfunc}||$e->{basetime}||$e->{plustime};
      $groups{$e->{group}}=1;
    }
  }
  # Source NOWFUNC executes after all START callbacks for existing or
  # freshly begun happy; the one original range is int(TIMESPAN/36).
  push @samples,($o{happyNowDraw}//900000)
    if $happyStillActive||$happyStarted;
  @R4_MULTI_DRAWS=@samples;
  @R4_MULTI_RANGES=();@LOG=();
  @DT=($shop);
  my $result=R4MultiOriginalEventSlice();
  die 'original multi-event RNG unused samples' if @R4_MULTI_DRAWS;
  my %state=%{$result->{state}};
  for my $code(keys %state){die 'unsupported source EVENT persisted' unless
    $wanted{$code}||$happy{$code}||$durableExtra{$code};}
  my @nowHashOrder=keys(%DTevent);
  return {
    name=>$o{name},
    input=>{
      items=>\@baseItems,startSeconds=>$begin,spanSeconds=>$span,
      activeUntilSeconds=>$o{prior},
      activeHashOrderFixture=>\@activeOrder,
      eventHashOrderFixture=>\@startOrder,
      nowHashOrderFixture=>\@nowHashOrder,
      randomDraws=>\@samples,shop=>$initial,
      ($guildInput?(guildContext=>$guildInput):()),
    },
    output=>{
      activeUntilSeconds=>\%state,
      logs=>[map {[@$_]}@LOG],
      randomDrawRanges=>[@R4_MULTI_RANGES],
      drawsUsed=>scalar(@R4_MULTI_RANGES),
      dataReadItems=>\@current,shop=>$shop,
      ($guildInput?(
        guildContext=>{
          dominion=>$DOMINION,
          guilds=>[map{my $g=$_;my $data=$GUILD_DATA{$g->{id}};
            +{id=>$g->{id},name=>$g->{name},money=>$data->{money},
              (exists($data->{guild})?(guild=>$data->{guild}):())}
          }@{$guildInput->{guilds}}],
        },
        guildEndCallbacks=>$SET_TOWN?['guildbattle']:[],
      ):()),
    },
  };
}
my @cases;
# Seven sustained EVENTs and both support callbacks start in the same
# original 17-key gate. Only support STARTFUNC returns zero.
my @stock=(0)x79;$stock[62]=1;$stock[78]=5;
my $initialShop={
  id=>1,status=>1,shopname=>'原版商店',money=>100000,rank=>5000,
  item=>\@stock,showcasecount=>1,showcase=>[0],price=>[0],
};
my $first=step(name=>'seven-and-support-hit',begin=>1000000,
  wantedStarts=>{map{($_=>1)}@targets},
  supportStarts=>{getmoney=>1,getpop=>1},
  supportDraws=>{getmoney=>0,getpop=>0},
  prior=>{},shop=>$initialShop);
push @cases,$first;
my %after=%{$first->{output}{activeUntilSeconds}};
%DTevent=%after;
my $second=step(name=>'seven-DataRead-and-support-miss',begin=>1003600,
  wantedStarts=>{},supportStarts=>{getmoney=>1,getpop=>1},
  supportDraws=>{getmoney=>999999,getpop=>999999},
  prior=>{ %DTevent },shop=>$first->{output}{shop});
push @cases,$second;
%DTevent=%{$second->{output}{activeUntilSeconds}};
# This is explicitly an isolated source stage after a clock jump,
# NOT an untested 11h continuous game world or a 36h period settlement.
my $upperShop={%{$second->{output}{shop}},money=>999999950,rank=>9950};
my $third=step(name=>'expiry-and-support-cap-after-source-clock-jump',
  begin=>1040000,wantedStarts=>{
    'tate-sale'=>1,'yoroi-sale'=>1,'tue-sale'=>1,
  },supportStarts=>{getmoney=>1,getpop=>1},
  supportDraws=>{getmoney=>300000,getpop=>0},
  prior=>{ %DTevent },shop=>$upperShop);
push @cases,$third;
%DTevent=%{$third->{output}{activeUntilSeconds}};
my $fourth=step(name=>'retriggered-overlays-next-DataRead',
  begin=>1043600,wantedStarts=>{},prior=>{ %DTevent },
  shop=>$third->{output}{shop});
push @cases,$fourth;
# Four additional source slices with the same true 17-key gate and
# getmoney/getpop + manbiki/goutou STARTFUNCs. No other positive EVENTs
# start; separate isolated scenario resets are not full gameplay time.
my @theftCases;
%DTevent=();
my @stockWithShowcase=(0)x79;
$stockWithShowcase[9]=12;$stockWithShowcase[62]=1;$stockWithShowcase[78]=5;
my $shopWithShowcase={
  id=>1,status=>1,shopname=>'原版商店',money=>100000,rank=>5000,
  item=>\@stockWithShowcase,showcasecount=>1,showcase=>[10],price=>[5000],
};
my $both=step(name=>'both-instant-no-robot-with-seven-and-support',
  begin=>1000000,wantedStarts=>{map{($_=>1)}@targets},
  instantStarts=>{manbiki=>1,goutou=>1},
  instantDraws=>{manbiki=>[0],goutou=>[0]},
  supportStarts=>{getmoney=>1,getpop=>1},
  supportDraws=>{getmoney=>0,getpop=>0},
  prior=>{},shop=>$shopWithShowcase);
push @theftCases,$both;
%DTevent=%{$both->{output}{activeUntilSeconds}};
my @freshRobot=@{$both->{output}{shop}{item}};
$freshRobot[9]=12;$freshRobot[63]=1;
my $robotShop={%{$both->{output}{shop}},item=>\@freshRobot};
my $protected=step(name=>'robot-protect-or-break-and-support-miss',
  begin=>1003600,wantedStarts=>{},
  instantStarts=>{manbiki=>1,goutou=>1},
  instantDraws=>{manbiki=>[0,900000],goutou=>[0]},
  supportStarts=>{getmoney=>1,getpop=>1},
  supportDraws=>{getmoney=>999999,getpop=>999999},
  prior=>{ %DTevent },shop=>$robotShop);
push @theftCases,$protected;
%DTevent=%{$protected->{output}{activeUntilSeconds}};
my @breakRobot=@{$protected->{output}{shop}{item}};
$breakRobot[9]=12;$breakRobot[63]=1;
my $breakShop={%{$protected->{output}{shop}},item=>\@breakRobot};
my $break=step(name=>'robot-destroyed-or-robbery-first',
  begin=>1007200,wantedStarts=>{},
  instantStarts=>{manbiki=>1,goutou=>1},
  instantDraws=>{manbiki=>[0,0],goutou=>[0]},
  prior=>{ %DTevent },shop=>$breakShop);
push @theftCases,$break;
%DTevent=%{$break->{output}{activeUntilSeconds}};
my $miss=step(name=>'instant-gates-miss-later-DataRead',
  begin=>1010800,wantedStarts=>{},prior=>{ %DTevent },
  shop=>$break->{output}{shop});
push @theftCases,$miss;
%DTevent=%{$miss->{output}{activeUntilSeconds}};
# Source order cannot hide the robot-protection rand(1000): only manbiki
# is gate-hit; the original Perl callback must consume exactly two draws.
my @guardStock=@{$miss->{output}{shop}{item}};
$guardStock[9]=12;$guardStock[63]=1;
my $guardShop={%{$miss->{output}{shop}},item=>\@guardStock};
my $guard=step(name=>'manbiki-only-robot-protects',
  begin=>1014400,wantedStarts=>{},
  instantStarts=>{manbiki=>1},
  instantDraws=>{manbiki=>[0,900000]},
  prior=>{ %DTevent },shop=>$guardShop);
push @theftCases,$guard;
%DTevent=%{$guard->{output}{activeUntilSeconds}};
my @destroyStock=@{$guard->{output}{shop}{item}};
$destroyStock[63]=1;
my $destroyShop={%{$guard->{output}{shop}},item=>\@destroyStock};
my $destroy=step(name=>'manbiki-only-robot-destroyed',
  begin=>1018000,wantedStarts=>{},
  instantStarts=>{manbiki=>1},
  instantDraws=>{manbiki=>[0,100000]},
  prior=>{ %DTevent },shop=>$destroyShop);
push @theftCases,$destroy;

# 17-key source regression with loto interleaved in original hash order.
my @lotoCases;
%DTevent=();
my @lotoStock=(0)x79;
$lotoStock[9]=12;$lotoStock[10]=5;$lotoStock[62]=1;$lotoStock[78]=5;
my $lotoShop={
  id=>1,status=>1,shopname=>'原版商店',money=>100000,rank=>5000,
  item=>\@lotoStock,showcasecount=>1,showcase=>[10],price=>[5000],
};
my $lotteryFirst=step(name=>'loto-five-tickets-with-seven-support-and-instant',
  begin=>1000000,wantedStarts=>{map{($_=>1)}@targets},
  supportStarts=>{getmoney=>1,getpop=>1},
  supportDraws=>{getmoney=>0,getpop=>0},
  instantStarts=>{manbiki=>1,goutou=>1},
  instantDraws=>{manbiki=>[0],goutou=>[0]},
  lotoStarts=>{loto=>1},
  lotoDraws=>{loto=>[0,1,100,10000,100000]},
  prior=>{},shop=>$lotoShop);
push @lotoCases,$lotteryFirst;
%DTevent=%{$lotteryFirst->{output}{activeUntilSeconds}};
my @lotoRobotStock=@{$lotteryFirst->{output}{shop}{item}};
$lotoRobotStock[63]=1;
my $lotoRobotShop={%{$lotteryFirst->{output}{shop}},
  item=>\@lotoRobotStock};
my $lotteryZero=step(name=>'loto-zero-tickets-robot-and-next-DataRead',
  begin=>1003600,wantedStarts=>{},
  instantStarts=>{manbiki=>1,goutou=>1},
  instantDraws=>{manbiki=>[0,900000],goutou=>[0]},
  supportStarts=>{getmoney=>1,getpop=>1},
  supportDraws=>{getmoney=>999999,getpop=>999999},
  lotoStarts=>{loto=>1},lotoDraws=>{loto=>[]},
  prior=>{%DTevent},shop=>$lotoRobotShop);
push @lotoCases,$lotteryZero;
%DTevent=();
my @lotoThreeStock=@lotoStock;$lotoThreeStock[10]=3;
my $lotoThreeShop={%$lotoShop,item=>\@lotoThreeStock};
my $lotteryThree=step(name=>'loto-three-tickets-ordinary-payout',
  begin=>2000000,wantedStarts=>{},
  lotoStarts=>{loto=>1},
  lotoDraws=>{loto=>[100,10000,100000]},
  prior=>{},shop=>$lotoThreeShop);
push @lotoCases,$lotteryThree;
%DTevent=();
my @lotoFiftyStock=@lotoStock;$lotoFiftyStock[10]=50;
my $lotoFiftyShop={%$lotoShop,item=>\@lotoFiftyStock};
my $lotteryFifty=step(name=>'loto-50-tickets-all-miss',
  begin=>3000000,wantedStarts=>{},
  lotoStarts=>{loto=>1},
  lotoDraws=>{loto=>[(999999)x50]},
  prior=>{},shop=>$lotoFiftyShop);
push @lotoCases,$lotteryFifty;


# Full original END/START/NOWFUNC with happy in the same 17-key hash,
# including seven durable overlays and instant, support and loto callbacks.
my @happyCases;
%DTevent=();
my @festivalStock=@lotoStock;$festivalStock[10]=3;
my $festivalShop={%$lotoShop,item=>\@festivalStock,money=>100000,
  rank=>5000};
my $festivalStart=step(name=>'happy-start-now-with-seven-support-instant-loto',
  begin=>1000000,wantedStarts=>{map{($_=>1)}@targets},
  supportStarts=>{getmoney=>1,getpop=>1},
  supportDraws=>{getmoney=>0,getpop=>0},
  instantStarts=>{manbiki=>1,goutou=>1},
  instantDraws=>{manbiki=>[0],goutou=>[0]},
  lotoStarts=>{loto=>1},lotoDraws=>{loto=>[100,10000,100000]},
  happyStarts=>{happy=>1},
  happyDurations=>{happy=>[250000,500000]},
  happyNowDraw=>900000,
  prior=>{},shop=>$festivalShop);
push @happyCases,$festivalStart;
%DTevent=%{$festivalStart->{output}{activeUntilSeconds}};
my $festivalActive=step(name=>'happy-active-next-slice-now-again',
  begin=>1003600,
  happyNowDraw=>500000,
  prior=>{%DTevent},shop=>$festivalStart->{output}{shop});
push @happyCases,$festivalActive;
%DTevent=%{$festivalActive->{output}{activeUntilSeconds}};
my $festivalExpired=step(name=>'happy-expired-no-now-after-clock-jump',
  begin=>1040000,
  prior=>{%DTevent},shop=>$festivalActive->{output}{shop});
push @happyCases,$festivalExpired;
%DTevent=%{$festivalActive->{output}{activeUntilSeconds}};
my $festivalReentry=step(name=>'happy-expired-and-restarts-now-same-slice',
  begin=>1040000,
  happyStarts=>{happy=>1},
  happyDurations=>{happy=>[0,0]},
  happyNowDraw=>999999,
  prior=>{%DTevent},shop=>$festivalActive->{output}{shop});
push @happyCases,$festivalReentry;


# Real source ITEM DataRead includes both additional durable ITEM PARAM:
# #5 iron PLUS becomes 720, and swords #40-44 halve popular seconds.
my @durableCases;
%DTevent=();
my @mixedStock=@lotoStock;$mixedStock[10]=3;
my $mixedShop={%$lotoShop,item=>\@mixedStock,money=>100000,rank=>5000};
my $allStart=step(name=>'ten-durable-plus-all-reviewed-instant',
  begin=>1000000,wantedStarts=>{map{($_=>1)}@targets},
  durableStarts=>{'plusup-tetu'=>1,'ken-sale'=>1},
  happyStarts=>{happy=>1},happyNowDraw=>900000,
  supportStarts=>{getmoney=>1,getpop=>1},
  supportDraws=>{getmoney=>0,getpop=>0},
  instantStarts=>{manbiki=>1,goutou=>1},
  instantDraws=>{manbiki=>[0],goutou=>[0]},
  lotoStarts=>{loto=>1},lotoDraws=>{loto=>[100,10000,100000]},
  prior=>{},shop=>$mixedShop);
push @durableCases,$allStart;
%DTevent=%{$allStart->{output}{activeUntilSeconds}};
my $allActive=step(name=>'ten-durable-overlays-next-DataRead',
  begin=>1003600,happyNowDraw=>500000,
  prior=>{%DTevent},shop=>$allStart->{output}{shop});
push @durableCases,$allActive;
%DTevent=%{$allActive->{output}{activeUntilSeconds}};
my $someExpired=step(name=>'ten-durable-expire-after-clock-jump',
  begin=>1150000,prior=>{%DTevent},shop=>$allActive->{output}{shop});
push @durableCases,$someExpired;
%DTevent=%{$allActive->{output}{activeUntilSeconds}};
my $restarted=step(name=>'iron-and-sword-expire-retrigger',
  begin=>1150000,durableStarts=>{'plusup-tetu'=>1,'ken-sale'=>1},
  durableDurations=>{
    'plusup-tetu'=>[0,0],'ken-sale'=>[250000,999999]},
  prior=>{%DTevent},shop=>$allActive->{output}{shop});
push @durableCases,$restarted;


# Mixed authentic 17-key hash: guildbattle END must coexist with ten
# other durable events, full START gates and happy NOWFUNC. Guild cash/
# dominion are explicit IO snapshots; no real filesystem or WorldState.
my @guildCases;
my @guildMembers=(
  {id=>'alpha',name=>'金砂會',money=>1000000},
  {id=>'beta',name=>'赤月會',money=>1500000},
  {id=>'gamma',name=>'灰石會',money=>20000},
);
my $guildInput={dominion=>'alpha',guilds=>\@guildMembers};
%DTevent=(%{$allStart->{output}{activeUntilSeconds}},
  guildbattle=>1003600);
my $guildExpire=step(
  name=>'guildbattle-expiry-ten-durable-happy-now',
  begin=>1003600,prior=>{%DTevent},
  happyNowDraw=>500000,
  guildContext=>$guildInput,shop=>$allStart->{output}{shop});
push @guildCases,$guildExpire;
%DTevent=(%{$allStart->{output}{activeUntilSeconds}},
  guildbattle=>1007200);
my $guildEquality=step(
  name=>'guildbattle-equality-blocks-END-and-START',
  begin=>1003600,prior=>{%DTevent},
  happyNowDraw=>250000,
  guildContext=>$guildInput,shop=>$allStart->{output}{shop});
push @guildCases,$guildEquality;
%DTevent=(guildbattle=>999999);
my $guildOnly=step(name=>'guildbattle-expiry-with-other-start-gates',
  begin=>1000000,prior=>{%DTevent},
  guildContext=>$guildInput,shop=>$initialShop);
push @guildCases,$guildOnly;
%DTevent=();
my $neverActive=step(name=>'guildbattle-zero-start-not-durable',
  begin=>1000000,prior=>{},
  guildContext=>$guildInput,shop=>$initialShop);
push @guildCases,$neverActive;

print JSON::PP->new->canonical->utf8->encode({
  source=>'frozen Perl 17 EVENT hash and actual inc-turn END/START/NOWFUNC, original happy event-n body, support/instant/loto STARTFUNC and seven ITEM PARAM files',
  compiledCount=>scalar(@compiled),runtimeHashOrder=>\@runtimeHashKeys,
  cases=>\@cases,theftCases=>\@theftCases,lotoCases=>\@lotoCases,
  happyCases=>\@happyCases,durableCases=>\@durableCases,
  guildCases=>\@guildCases,
  scope=>'17 original EVENT gates, seven durable events and genuine getmoney/getpop/manbiki/goutou callbacks in shared RNG; single shop, controlled draws, time jump in support cases, not all callbacks or saved world',
});
