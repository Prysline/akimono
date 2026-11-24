use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use JSON::PP;
binmode STDOUT,':raw';
our($NOW_TIME,$STATE,$BAL_JOB,$BAL_NAME,@LOG,
    @REBEL_PERIOD_DRAWS,@REBEL_PERIOD_RANGES,
    %DTevent,%id2idx);
BEGIN{
  no warnings 'redefine';
  *CORE::GLOBAL::rand=sub (;$){
    die 'R4 real original period RebelRobin rand exhausted'
      unless @main::REBEL_PERIOD_DRAWS;
    my $v=shift @main::REBEL_PERIOD_DRAWS;
    my $r=0+($_[0]//1);
    die 'R4 real source period invalid random fixture'
      unless defined($v)&&$v=~/^\d+$/&&$v<1000000;
    push @main::REBEL_PERIOD_RANGES,$r;
    return $v*$r/1000000;
  };
}
sub source{
  my($path)=@_;
  open my $fh,'<:encoding(UTF-8)',File::Spec->catfile($FindBin::Bin,$path)
    or die $!;
  local $/;my $text=<$fh>;close $fh;return $text;
}
sub PushLog{push @LOG,[@_];return 1;}
sub l{
  my($txt,@arg)=@_;
  $txt=~s/%([12])/$arg[$1-1]/ge;
  return $txt;
}
my $period=source('period.cgi');
my $start=index($period,'sub RebelRobin'."\n");
my $stop=index($period,'sub DragonBalance',$start);
die 'source original RebelRobin sub boundary missing'
  unless $start>=0&&$stop>$start;
my $body=substr($period,$start,$stop-$start);
for my $literal(
  'return if !defined($id2idx{$STATE->{leader}});',
  'rand(2500)', 'rand(5000000)', 'rand(100) < 30',
  '$STATE->{robinb}=10000;',
){
  die "actual original RebelRobin body drift $literal"
    unless index($body,$literal)>=0;
}
my $ok=eval 'package main;use utf8;no strict;no warnings;'."\n".
  $body."\n1;";
die "actual original source RebelRobin failed to compile: $@" unless $ok;
my $wstart=index($period,'if ($DTevent{rebel})');
my $wend=index($period,'$STATE->{army}+=$STATE->{robina};',$wstart);
die 'original period rebel extension branch missing' unless
  $wstart>=0&&$wend>$wstart;
my $wrapper=substr($period,$wstart,$wend-$wstart);
$ok=eval 'package main;use utf8;no strict;no warnings;'."\n".
  'sub R4TrueOriginalRebelPeriod{'."\n".$wrapper."\nreturn 1;}\n1;";
die "actual original period branch compilation failed: $@" unless $ok;
my %baseTown=(
 leader=>1,money=>10000,in=>0,out=>0,develop=>5001,
 devem=>0,safety=>5001,safem=>0,army=>500,robina=>2000,robinb=>0,
);
sub run{
  my(%o)=@_;
  $NOW_TIME=1000000;
  $STATE={%{$o{town}}};
  %id2idx=$o{hasLeader}?(1=>0):();
  %DTevent=();
  $DTevent{rebel}=$o{active} if defined $o{active};
  $BAL_JOB='外敵';$BAL_NAME='首領';
  @LOG=();@REBEL_PERIOD_RANGES=();
  @REBEL_PERIOD_DRAWS=@{$o{draws}};
  R4TrueOriginalRebelPeriod();
  die "R4 original period unused samples $o{name}" if @REBEL_PERIOD_DRAWS;
  return {
    name=>$o{name},
    input=>{
      nowSeconds=>1000000,town=>$o{town},
      leaderShopExists=>$o{hasLeader}?JSON::PP::true:JSON::PP::false,
      activeUntilSeconds=>$o{active},
      randomDraws=>$o{draws},balJob=>'外敵',balName=>'首領',
    },
    output=>{
      town=>{%$STATE},
      eventState=>{%DTevent},
      activeUntilSeconds=>$DTevent{rebel},
      logs=>[map{[@$_]}@LOG],
      randomDrawRanges=>[@REBEL_PERIOD_RANGES],
      drawsUsed=>scalar(@REBEL_PERIOD_RANGES),
    },
  };
}
my %developed=(%baseTown,develop=>9000,safety=>9000,money=>45000000);
my @cases=(
  run(name=>'no-recognized-leader-return-before-RNG',
    hasLeader=>0,town=>{%baseTown,leader=>0},draws=>[]),
  run(name=>'already-active-extends-three-days-no-RNG',
    hasLeader=>1,town=>{%baseTown},active=>1000500,draws=>[]),
  run(name=>'source-calm-no-unrest-two-rands',
    hasLeader=>1,town=>{%baseTown,money=>0},draws=>[0,0]),
  run(name=>'source-city-uneasy-two-rands-and-early-return',
    hasLeader=>1,town=>{%baseTown,develop=>7000,safety=>7000,
      money=>45000000},draws=>[0,0]),
  run(name=>'source-invasion-rand-just-below-30',
    hasLeader=>1,town=>{%developed},draws=>[0,0,299999]),
  run(name=>'source-invasion-rand-equals-30-deferred',
    hasLeader=>1,town=>{%developed},draws=>[0,0,300000]),
  run(name=>'existing-past-expiry-still-extended-before-turn-expiry',
    hasLeader=>1,town=>{%developed},active=>900000,draws=>[]),
);
print JSON::PP->new->canonical->utf8->encode({
  source=>'unmodified frozen period.cgi RebelRobin complete sub and actual period existence/extension snippet, with isolated PushLog/l and rand only',
  cases=>\@cases,scope=>'exact one original period rebel trigger/extension; NOT full inc-period settlement/SortDT/WorldState/HTTP',
});
