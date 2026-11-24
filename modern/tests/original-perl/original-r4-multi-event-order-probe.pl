use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use File::Spec;
use lib $FindBin::Bin;
use OriginalGiftMapUseHarness;

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
     @DT,@LOG,@R4_MULTI_DRAWS,@R4_MULTI_RANGES);
sub PushLog {push @LOG,[@_];1;}
sub RequireFile {die 'unsupported original multi EVENT callback reached';}
sub GetPath {die 'unsupported original multi EVENT callback file reached';}
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
@rows=map{
  my $e=$_;
  my $m=$messages{$e->{code}}//{start=>'',end=>''};
  join("\t",$e->{code},$e->{group},$e->{startProba},
    $e->{callbacks}{start}//'','',$e->{callbacks}{end}//'','',
    $e->{baseTimeSeconds},$e->{plusTimeSeconds},
    $m->{start},$m->{end},$e->{callbacks}{now}//'','')
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
  for my $code(@startOrder){
    my $e=$EVENT{$code};
    next if $groups{$e->{group}};
    my $start=$wanted{$code}&&$o{wantedStarts}{$code};
    push @samples,$start?0:999999;
    if($start){
      push @samples,250000,500000;
      $groups{$e->{group}}=1;
    }elsif($e->{startproba}==0){
      die 'original zero-start callback/duration changed' if
        $e->{startfunc}||$e->{basetime}||$e->{plustime};
      $groups{$e->{group}}=1;
    }
  }
  @R4_MULTI_DRAWS=@samples;
  @R4_MULTI_RANGES=();@LOG=();
  @DT=({id=>1});
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
      randomDraws=>\@samples,
    },
    output=>{
      activeUntilSeconds=>\%state,
      logs=>[map {[@$_]}@LOG],
      randomDrawRanges=>[@R4_MULTI_RANGES],
      drawsUsed=>scalar(@R4_MULTI_RANGES),
      dataReadItems=>\@current,
    },
  };
}
my @cases;
# Source full 17-key hash START (seven chosen, the rest forced to gate-miss).
my $first=step(name=>'seven-start-at-once',begin=>1000000,
  wantedStarts=>{map{($_=>1)}@targets},prior=>{});
push @cases,$first;
my %after=%{$first->{output}{activeUntilSeconds}};
%DTevent=%after;
my $second=step(name=>'all-seven-at-next-DataRead',begin=>1003600,
  wantedStarts=>{},prior=>{ %DTevent });
push @cases,$second;
%DTevent=%{$second->{output}{activeUntilSeconds}};
# This is explicitly an isolated source stage after a clock jump,
# NOT an untested 11h continuous game world or a 36h period settlement.
my $third=step(name=>'mixed-expiry-and-retrigger-after-source-clock-jump',
  begin=>1040000,wantedStarts=>{
    'tate-sale'=>1,'yoroi-sale'=>1,'tue-sale'=>1,
  },prior=>{ %DTevent });
push @cases,$third;
%DTevent=%{$third->{output}{activeUntilSeconds}};
my $fourth=step(name=>'retiggered-overlays-at-next-DataRead',
  begin=>1043600,wantedStarts=>{},prior=>{ %DTevent });
push @cases,$fourth;
print JSON::PP->new->canonical->utf8->encode({
  source=>'real frozen original Perl 17-key EVENT hash initializer, generated seven ITEM PARAM files, actual original inc-turn END/START',
  compiledCount=>scalar(@compiled),runtimeHashOrder=>\@runtimeHashKeys,
  cases=>\@cases,
  scope=>'17 original EVENT gates in Perl hash order with seven source-declarative durable starts only; artificial random samples and skipped clock gap, not full callbacks, period, HTTP or durable world',
});
