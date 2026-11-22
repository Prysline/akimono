use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use File::Temp qw(tempfile);
use JSON::PP;
binmode STDOUT,':raw';
our(%EVENT,%DTevent,@DT,@ITEM,@LOG,$temptimenow,$timespan,
    $TIMESPAN,@B60_DRAWS,@B60_CALLS,$B60_NOW_PATH,$B60_USED);
BEGIN{
  no warnings 'redefine';
  *CORE::GLOBAL::rand=sub (;$) {
    my($range)=@_;
    die 'B-60 unexpected missing original Perl rand()' unless @main::B60_DRAWS;
    my $draw=shift @main::B60_DRAWS;
    die 'B-60 invalid one-millionth original rand()' unless
      $draw>=0&&$draw<1000000;
    push @main::B60_CALLS,$range;
    $main::B60_USED++;
    return $draw*$range/1000000;
  };
}
sub source{
  my($path)=@_;
  open my $fh,'<:encoding(UTF-8)',File::Spec->catfile($FindBin::Bin,$path)
    or die $!;
  local $/;my $text=<$fh>;close $fh;return $text;
}
sub PushLog {push @LOG,[@_];return 1;}
sub RequireFile {die 'B-60 unexpected original event external callback';}
sub GetPath {
  my($dir,$part,$key)=@_;
  die "B-60 source unexpected event file $part/$key" unless
    $part eq 'event-n'&&$key eq 'happy';
  return $B60_NOW_PATH;
}
my $dsl=source('../../../custom/inc-item-data.cgi');
my $turn=source('inc-turn.cgi');
my $compiler=source('inc-makeitem.cgi');
my $read=source('inc-func.cgi');
die 'B-60 original Perl compiler local NOWFUNC drift' unless
  index($compiler,'($g_event->{nowfunc},$g_event->{localfuncnow})=GetLocalFunction($name,\'now\');')>=0 &&
  index($compiler,'print EOUTSUB GetFuncItemNo($event->{localfuncnow},"EVENT func $event->{code}");')>=0 &&
  index($read,'foreach(keys(%DTevent)){require(GetPath($ITEM_DIR,"event",$_));}')>=0;
my @blocks=split(/^\@\@EVENT[^\r\n]*\r?\n/mi,$dsl);
shift @blocks;
for(@blocks){s/^\@\@(ITEM|DEFINE|END|FUNC[A-Z]+)\b[\s\S]*$//mi;}
my @matched=grep(/^\s*code\s+happy(?:\s|$)/m,@blocks);
die 'B-60 original happy source EVENT is not unique' unless @matched==1;
my $block=$matched[0];
my %fields;
for my $line(split(/\r?\n/,$block)){
  if($line=~/^\s*(code|start|basetime|plustime|startmsg|endmsg|func)\s+(.+?)\s*$/){
    my($key,$value)=($1,$2);$value=~s/\s+#.*$//;
    $value=~s/\s+$//;
    push @{$fields{$key}},$value;
  }
}
for(qw(code start basetime plustime startmsg endmsg func)){
  die "B-60 source EVENT $_ not unique" unless @{$fields{$_}//[]}==1;
}
die 'B-60 original happy EVENT DSL changed' unless
  $fields{code}[0] eq 'happy'&&$fields{start}[0] eq '10%'&&
  $fields{basetime}[0] eq '5h'&&$fields{plustime}[0] eq '5h'&&
  $fields{startmsg}[0] eq '街上開始舉辦感謝祭了。'&&
  $fields{endmsg}[0] eq '感謝祭已經結束了。'&&
  $fields{func}[0] eq '_local_';
my($body)=$block=~/
  ^[ \t]*func[ \t]+_local_[ \t]*\r?\n
  ([\s\S]*?)
  ^[ \t]*_local_[ \t]*$
/mx;
die 'B-60 original NOWFUNC source body not found' unless defined $body;
my $compiledBody=$body;
$compiledBody=~s/^\s+//mg;
$compiledBody=~s/\s+$//mg;
my($fh,$file)=tempfile('b60-event-now-XXXX',
  DIR=>File::Spec->tmpdir(),SUFFIX=>'.pl',UNLINK=>1);
$B60_NOW_PATH=$file;
binmode $fh,':encoding(UTF-8)';
print {$fh} "use utf8;\npackage event;\nsub _local_now {\n".
  $compiledBody."\n}\n1;\n";
close $fh or die $!;

# ORIGINAL source expiry -> start -> NOWFUNC, including actual -e check,
# real generated event-n file require, undefined callback and BEGIN-rand.
my $from=index($turn,"\t\t#イベント終了処理\n");
my $to=index($turn,"\n\t\t\$temptimenow+=\$timespan;",$from);
die 'B-60 original combined EVENT region moved' unless $from>=0&&$to>$from;
my $literal=substr($turn,$from,$to-$from);
for my $marker (
  'if($DTevent{$key}<$temptimenow+$timespan)',
  'if(rand(100000)<$timespan*$E->{startproba}/864 || $E->{startproba}==0)',
  'foreach my $key (keys(%DTevent))',
  'my $extfile=GetPath($ITEM_DIR,"event-n",$key);',
  'my($msg)=&$func(split(/[:,]/,$E->{funcparam}));',
  'undef &$func;',
){
  die "B-60 original lifecycle marker missing $marker" unless
    index($literal,$marker)>=0;
}
my $ok=eval "no strict;no warnings;use utf8;\n".
  "sub b60_real_original_turn { \n".$literal.
  "\nreturn {active=>{%DTevent},group=>{%group}};\n}\n1;";
die "B-60 original combined Perl EVENT compilation failed: $@" unless $ok;

sub run{
  my(%o)=@_;
  $temptimenow=$o{now}//1000000;
  $timespan=$o{span}//1800;
  $TIMESPAN=$timespan;
  %EVENT=(happy=>{
    code=>'happy',group=>'original-happy-group',
    startproba=>100,basetime=>18000,plustime=>18000,
    startfunc=>'',endfunc=>'',func=>'_local_now',funcparam=>'',
    startmsg=>$fields{startmsg}[0],endmsg=>$fields{endmsg}[0],
  });
  %DTevent=();
  $DTevent{happy}=$o{active} if defined $o{active};
  @DT=({id=>1,status=>1,rank=>$o{rank}//5000,shopname=>'實際感謝祭商店'});
  @ITEM=();@LOG=();$B60_USED=0;@B60_CALLS=();
  @B60_DRAWS=@{$o{draws}};
  my $oldRank=$DT[0]{rank};
  my $original=b60_real_original_turn();
  die "B-60 $o{name} unused source rand results" if @B60_DRAWS;
  return {
    name=>$o{name},
    input=>{nowSeconds=>$temptimenow,timespanSeconds=>$timespan,
      activeUntilSeconds=>$o{active},rank=>$oldRank,
      randomDraws=>$o{draws}},
    output=>{
      activeState=>$original->{active},
      groupOccupied=>$original->{group}{'original-happy-group'}?
        JSON::PP::true:JSON::PP::false,
      rank=>$DT[0]{rank},rankGain=>$DT[0]{rank}-$oldRank,
      drawsUsed=>$B60_USED,drawRanges=>[@B60_CALLS],
      logs=>[map {[@$_]} @LOG],
    },
  };
}
my @cases=(
  run(name=>'fresh-start-nowfunc-same-turn',rank=>5000,
    draws=>[0,500000,250000,900000]),
  run(name=>'festival-already-active',active=>1027000,
    rank=>5000,draws=>[800000]),
  run(name=>'equal-to-boundary-not-expired',
    active=>1001800,rank=>5000,draws=>[780000]),
  run(name=>'expire-and-miss',active=>1001799,
    rank=>5000,draws=>[999999]),
  run(name=>'expire-restart-nowfunc',active=>1001799,
    rank=>5000,draws=>[0,0,0,900000]),
  run(name=>'new-festival-gate-misses',rank=>5000,
    draws=>[999999]),
  run(name=>'one-minute-festival-nowfunc',rank=>5000,
    span=>60,active=>1030000,draws=>[999999]),
  run(name=>'hour-festival-nowfunc',rank=>5000,
    span=>3600,active=>1030000,draws=>[999999]),
  run(name=>'rank-cap-10000',rank=>9999,
    active=>1030000,draws=>[999999]),
);
print JSON::PP->new->utf8->canonical->encode({
  source=>'unmodified original Perl inc-turn expiry+start+NOWFUNC and literal custom DSL happy body via generated event-n file',
  declaredNowFunc=>'_local_',runtimeCompiledNowFunc=>'_local_now',
  maxRank=>10000,compiledStartProba=>100,
  durationBaseSeconds=>18000,durationPlusSeconds=>18000,
  cases=>\@cases,
  scope=>'one source happy event, one shop, explicit rand samples; original combined EVENT region really runs, not original hash ordering/whole CGI/36h rollover',
});
