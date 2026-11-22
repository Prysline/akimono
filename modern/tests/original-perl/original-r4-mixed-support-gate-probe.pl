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
     @DT,@LOG,@R4_MULTI_DRAWS,@R4_MULTI_RANGES,$ITEM_DIR,$MAX_MONEY);
my $callbackRoot=tempdir('akimono-r4-mixed-XXXXXX',TMPDIR=>1,CLEANUP=>1);
make_path("$callbackRoot/event-s");
$ITEM_DIR=$callbackRoot;$MAX_MONEY=999999999;
sub PushLog {push @LOG,[@_];1;}
sub RequireFile {die 'unexpected original file' unless $_[0] eq 'inc-event.cgi';1;}
sub GetPath {
  my($dir,$kind,$code)=@_;
  die 'unsupported callback path' unless
    $dir eq $ITEM_DIR&&$kind eq 'event-s'&&
    ($code eq 'getmoney'||$code eq 'getpop'||
     $code eq 'manbiki'||$code eq 'goutou');
  return "$callbackRoot/event-s/$code.pl";
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
for my $code(@targets){
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
  $dsl=~/^@@ITEM[^\r\n]*\r?\n\s*no\s+64(?:\s|#)[\s\S]*?^\s*name\s+看門機器人(?:\s|$)/m;
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
my $to=index($turn,"\n\t\tforeach my \$key (keys(%DTevent))",
  index($turn,"\t\t#イベント開始処理\n",$from));
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
  $temptimenow=$begin;$timespan=$span;
  @ITEM=(undef,map{{%{$_}}}@baseItems);
  my @activeOrder=keys(%DTevent);
  for my $key(@activeOrder){
    die "unreviewed active code $key" unless $wanted{$key};
    my $executed=eval 'package main;use utf8;no strict;no warnings;'.
       $generated{$key}.'1;';
    die "actual generated ITEM load failed: $@" unless $executed;
  }
  my @current=map{{%{$_}}}@ITEM[1..79];
  my $initial=$o{shop} or die 'single real callback shop needed';
  my $shop={%$initial,item=>[@{$initial->{item}}],
    showcase=>[@{$initial->{showcase}}],price=>[@{$initial->{price}}]};
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
  my $robot=$shop->{item}[63];
  for my $code(@startOrder){
    my $e=$EVENT{$code};
    next if $groups{$e->{group}};
    my $start=($wanted{$code}&&$o{wantedStarts}{$code})||
      ($support{$code}&&$o{supportStarts}{$code})||
      ($instant{$code}&&($o{instantStarts}//{})->{$code});
    push @samples,$start?0:999999;
    if($start&&$wanted{$code}){
      push @samples,250000,500000;
      $groups{$e->{group}}=1;
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
    }elsif($e->{startproba}==0){
      die 'original zero-start callback/duration changed' if
        $e->{startfunc}||$e->{basetime}||$e->{plustime};
      $groups{$e->{group}}=1;
    }
  }
  @R4_MULTI_DRAWS=@samples;
  @R4_MULTI_RANGES=();@LOG=();
  @DT=($shop);
  my $result=R4MultiOriginalEventSlice();
  die 'original multi-event RNG unused samples' if @R4_MULTI_DRAWS;
  my %state=%{$result->{state}};
  for my $code(keys %state){die 'unsupported source EVENT persisted' unless $wanted{$code};}
  return {
    name=>$o{name},
    input=>{
      items=>\@baseItems,startSeconds=>$begin,spanSeconds=>$span,
      activeUntilSeconds=>$o{prior},
      activeHashOrderFixture=>\@activeOrder,
      eventHashOrderFixture=>\@startOrder,
      randomDraws=>\@samples,shop=>$initial,
    },
    output=>{
      activeUntilSeconds=>\%state,
      logs=>[map {[@$_]}@LOG],
      randomDrawRanges=>[@R4_MULTI_RANGES],
      drawsUsed=>scalar(@R4_MULTI_RANGES),
      dataReadItems=>\@current,shop=>$shop,
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

print JSON::PP->new->canonical->utf8->encode({
  source=>'frozen Perl 17 EVENT hash and original inc-turn END/START, actual generated getmoney/getpop STARTFUNC, seven ITEM PARAM files',
  compiledCount=>scalar(@compiled),runtimeHashOrder=>\@runtimeHashKeys,
  cases=>\@cases,theftCases=>\@theftCases,
  scope=>'17 original EVENT gates, seven durable events and genuine getmoney/getpop/manbiki/goutou callbacks in shared RNG; single shop, controlled draws, time jump in support cases, not all callbacks or saved world',
});
