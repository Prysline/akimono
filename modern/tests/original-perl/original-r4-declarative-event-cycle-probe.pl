use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use JSON::PP;
use lib $FindBin::Bin;
use OriginalGiftMapUseHarness;
BEGIN {
  no warnings 'redefine';
  *CORE::GLOBAL::rand=sub (;$) {
    die 'R4 declarative source rand exhausted' unless @main::R4_DRAWS;
    my $n=shift @main::R4_DRAWS;
    die 'R4 declarative source rand sample invalid'
      unless defined($n)&&$n=~/^\d+$/&&$n<1000000;
    $main::R4_USED++;
    return $n*($_[0]//1)/1000000;
  };
}
binmode STDOUT,':raw';
our (@ITEM,@out_item,%EVENT,%DTevent,$temptimenow,$timespan,
     @DT,@LOG,@R4_DRAWS,$R4_USED);
sub PushLog {push @LOG,[@_];1;}
sub RequireFile {die 'original source declarative EVENT unexpectedly invoked callback';}
sub GetPath {die 'original source declarative EVENT unexpectedly requested callback';}
OriginalGiftMapUseHarness::compile();
my $dsl=OriginalGiftMapUseHarness::original_dsl();
my $compiler=OriginalGiftMapUseHarness::source('inc-makeitem.cgi');
my $turn=OriginalGiftMapUseHarness::source('inc-turn.cgi');
my $read=OriginalGiftMapUseHarness::source('inc-func.cgi');
die 'original DataRead EVENT file load changed' unless
 index($read,'foreach(keys(%DTevent)){require(GetPath($ITEM_DIR,"event",$_));}')>=0;
my $cstart=index($compiler,'foreach my $param (@{$event->{param}})');
my $cend=index($compiler,'print EOUTSUB "1;\n";',$cstart);
die 'frozen original ITEM PARAM generator moved' unless $cstart>=0&&$cend>$cstart;
my $generator=substr($compiler,$cstart,$cend-$cstart);
my $ok=eval "package main;use utf8;no strict;no warnings;\n".
  "sub R4OriginalParamGenerator {my \$event=shift;\n".$generator."\n}\n1;";
die "frozen source PARAM compiler failed: $@" unless $ok;
my $from=index($turn,"\t\t#イベント終了処理\n");
my $to=index($turn,"\n\t\tforeach my \$key (keys(%DTevent))",
  index($turn,"\t\t#イベント開始処理\n",$from));
die 'original END/START fragment missing' unless $from>=0&&$to>$from;
my $original=substr($turn,$from,$to-$from);
$ok=eval "package main;use utf8;no strict;no warnings;\n".
  "sub R4OriginalEventCycle {\n".$original.
  "\nreturn {state=>{%DTevent},groups=>{%group}};}\n1;";
die "frozen original event lifecycle failed: $@" unless $ok;

my @target=qw(boom-posyon tate-sale yoroi-sale tue-sale
  plusdown-yakusou plusup-misuriru plusup-oriharukon);
my @blocks=split(/^\s*\@\@EVENT[^\r\n]*\r?\n/mi,$dsl);
shift @blocks;
for(@blocks){s/^\s*\@\@(ITEM|USE|EVENT|DEFINE|END|FUNC[A-Z]+)\b[\s\S]*$//mi;}
my @baseline=map {{
  itemId=>$_,price=>1000+5*$_,pricebase=>2000+7*$_,
  pricehalf=>3000+11*$_,popular=>5000+20*$_,
  plus=>60+$_,point=>100+$_
}}1..79;
sub original_case{
  my($e,$sourceFile,%o)=@_;
  my $code=$e->{code};
  @ITEM=(undef,map{{%{$_}}}@baseline);
  my $loaded=defined $o{expires};
  my $ran=1;
  if($loaded){
    $ran=eval "package main;use utf8;no strict;no warnings;\n".$sourceFile."\n1;";
    die "source generated ITEM DataRead failed: $@" unless $ran;
  }
  my @snapshot=map{{%{$_}}}@ITEM[1..79];
  %EVENT=($code=>{
    code=>$code,group=>$code,startproba=>$e->{startProba},
    basetime=>$e->{baseTimeSeconds},plustime=>$e->{plusTimeSeconds},
    startfunc=>'',endfunc=>'',startmsg=>$e->{startMessage},
    endmsg=>$e->{endMessage},
  });
  %DTevent=();
  $DTevent{$code}=$o{expires} if $loaded;
  $temptimenow=$o{begin};
  $timespan=$o{span};
  @DT=({id=>1});@LOG=();
  @R4_DRAWS=@{$o{draws}};$R4_USED=0;
  my $result=R4OriginalEventCycle();
  die "source RNG leftovers $code $o{name}" if @R4_DRAWS;
  my $next=$result->{state}{$code};
  return {
    name=>$o{name},input=>{
      startSeconds=>$o{begin},spanSeconds=>$o{span},
      activeUntilSeconds=>$o{expires},randomDraws=>$o{draws},
    },
    output=>{
      activeAtDataRead=>$loaded?JSON::PP::true:JSON::PP::false,
      expired=>($loaded&&$o{expires}<$o{begin}+$o{span})?
        JSON::PP::true:JSON::PP::false,
      started=>(!$loaded||$o{expires}<$o{begin}+$o{span})&&
        defined($next)&&(!defined($o{expires})||$next!=$o{expires})?
          JSON::PP::true:JSON::PP::false,
      activeUntilSeconds=>$next,drawsUsed=>$R4_USED,
      logs=>[map {[@$_]}@LOG],
      dataReadItems=>\@snapshot,
    },
  };
}
my @cases;
for my $code(@target){
 my @matches=grep(/^\s*code\s+\Q$code\E(?:\s|$)/m,@blocks);
 die "source EVENT $code missing/duplicate" unless @matches==1;
 my(%f,@params);
 for my $line(split(/\r?\n/,$matches[0])){
   $line=~s/\s+#.*$//;$line=~s/\s+$//;
   if($line=~/^\s*(?:code|start|basetime|plustime|startmsg|endmsg)\s+/i){
     my($key,$v)=$line=~/^\s*(\S+)\s+(.+)$/;
     push @{$f{lc($key)}},$v;
   }
   push @params,"$1\t$2" if $line=~/^\s*param\s+(\S+)\s+(\S+)/i;
 }
 for my $k(qw(code start basetime plustime startmsg endmsg)){
   die "$code source $k invalid" unless @{$f{$k}//[]}==1;
 }
 die 'declarative EVENT has no ITEM edits' unless @params;
 my $e={
   code=>$code,startProba=>main::GetNumber($f{start}[0]),
   baseTimeSeconds=>main::GetTime($f{basetime}[0]),
   plusTimeSeconds=>main::GetTime($f{plustime}[0]),
   startMessage=>$f{startmsg}[0],endMessage=>$f{endmsg}[0],
   paramCount=>scalar(@params),
 };
 die "$code original source event duration/chance unsupported"
   unless $e->{startProba}>0&&$e->{baseTimeSeconds}>0&&
          $e->{plusTimeSeconds}>0;
 my $generated='';
 open my $writer,'>',\$generated or die $!;
 {no strict 'refs';local *EOUTSUB=$writer;
  R4OriginalParamGenerator({param=>\@params});}
 close $writer;
 die "$code empty original generated ITEM source" unless $generated=~/\$ITEM\[/;
 my $start=1000000;my $span=3600;
 my @isolated=(
   original_case($e,$generated,name=>'start',begin=>$start,
     span=>$span,draws=>[0,500000,250000]),
   original_case($e,$generated,name=>'equality',begin=>$start,
     span=>$span,expires=>$start+$span,draws=>[]),
   original_case($e,$generated,name=>'expired-miss',begin=>$start,
     span=>$span,expires=>$start+$span-1,draws=>[999999]),
   original_case($e,$generated,name=>'expired-retrigger',begin=>$start,
     span=>$span,expires=>$start+$span-1,draws=>[0,0,0]),
 );
 my @timeline;
 my $until;
 my $count=int($e->{baseTimeSeconds}/$span)+3;
 die 'unbounded source timeline' if $count>80;
 for my $i(0..$count-1){
   my $begin=$start+$i*$span;
   my $draws=(!defined $until&&$i==0)?[0,0,0]:
     (!defined $until||$until<$begin+$span)?[999999]:[];
   my $row=original_case($e,$generated,name=>"timeline-$i",
     begin=>$begin,span=>$span,expires=>$until,draws=>$draws);
   $until=$row->{output}{activeUntilSeconds};
   my $snap=$row->{output}{dataReadItems};
   push @timeline,{
     input=>$row->{input},
     output=>{
       activeAtDataRead=>$row->{output}{activeAtDataRead},
       expired=>$row->{output}{expired},started=>$row->{output}{started},
       activeUntilSeconds=>$until,drawsUsed=>$row->{output}{drawsUsed},
       logs=>$row->{output}{logs},
       changedItems=>[map {[$_->{itemId},$_->{price},$_->{pricebase},
         $_->{pricehalf},$_->{popular},$_->{plus},$_->{point}]} @$snap],
     },
   };
 }
 push @cases,{eventCode=>$code,metadata=>$e,
   generatedSource=>$generated,cases=>\@isolated,timeline=>\@timeline};
}
print JSON::PP->new->canonical->utf8->encode({
 source=>'actual frozen compiler generated ITEM overlays and unmodified inc-turn EVENT END/START fragment, one EVENT key per isolated source scenario',
 eventCount=>scalar(@cases),cases=>\@cases,
 scope=>'pure isolated original Perl event lifetime/DataRead overlay differential; no 17-key hash order, full market/CAS/period/save',
});
