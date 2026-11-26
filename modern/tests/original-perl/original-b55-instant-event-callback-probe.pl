use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use JSON::PP;
use Storable qw(dclone);
binmode STDOUT,':raw';
our(@DT,@ITEM,@B55_DRAW,$B55_USED);
BEGIN{
  no warnings 'redefine';
  *CORE::GLOBAL::rand=sub{
    my($max)=@_;
    die "B-55 expected only original rand(1000), got $max"
      unless $max==1000;
    die 'B-55 missing source callback RNG sample'
      unless @main::B55_DRAW;
    $main::B55_USED++;
    return shift(@main::B55_DRAW)*$max/1000000;
  };
}
sub source{
  my($relative)=@_;
  my $p=File::Spec->catfile($FindBin::Bin,$relative);
  open(my $fh,'<:encoding(UTF-8)',$p) or die $!;
  local $/;my $s=<$fh>;close $fh;return $s;
}
# The original Core formatter adds display units; this is a deliberately
# narrow formatting stub. The actual stock/rank callback code is unmodified.
sub GetMoneyString {return $_[0];}
my $dsl=source('../../../custom/inc-item-data.cgi');
my $turn=source('inc-turn.cgi');
die 'B-55 original event runtime STARTFUNC changed' unless
  index($turn,'($ret,$msg)=&$func(split(/[:,]/,$E->{startfuncparam}));')>=0;
my @parts=split(/^\@\@EVENT[^\r\n]*\r?\n/mi,$dsl);
shift @parts;
my %sourceCallbacks;
for my $case (
  ['manbiki','_local_(400,200)'],
  ['goutou','_local_(700)'],
){
  my($code,$args)=@$case;
  my @matching=grep(/^\s*code\s+\Q$code\E(?:\s|$)/m,@parts);
  die "B-55 source EVENT $code missing/duplicated" unless @matching==1;
  my $part=$matching[0];
  my ($head,$body)=$part=~/
    ^\s*startfunc\s+(\S+)[^\n]*\r?\n
    ([\s\S]*?)
    ^[ \t]*_local_[ \t]*$
  /mx;
  die "B-55 original $code callback source moved"
    unless defined($body)&&defined($head)&&$head eq $args;
  my $m=()=$body=~/\@\@ITEMNO"看門機器人"/g;
  die "B-55 original robot macro drift $code" unless $m>=2;
  $body=~s/\@\@ITEMNO"看門機器人"/64/g;
  die 'B-55 unexpanded original macro' if $body=~/\@\@/;
  my $function="original_b55_$code";
  my $ok=eval "no strict; no warnings; sub $function {\n".
    $body."\n}\n1;";
  die "B-55 source callback compile $code: $@" unless $ok;
  $sourceCallbacks{$code}=$function;
}
my @rows=(
  {name=>'theft-untargeted',code=>'manbiki',stock=>12,draws=>[900000]},
  {name=>'theft-12-stock',code=>'manbiki',stock=>12,draws=>[0]},
  {name=>'theft-9-stock',code=>'manbiki',stock=>9,draws=>[0]},
  {name=>'theft-robot-protects',code=>'manbiki',stock=>12,robot=>1,draws=>[0,900000]},
  {name=>'theft-robot-destroyed',code=>'manbiki',stock=>12,robot=>1,draws=>[0,100000]},
  {name=>'robbery-untargeted',code=>'goutou',stock=>12,draws=>[900000]},
  {name=>'robbery-12-stock',code=>'goutou',stock=>12,draws=>[0]},
  {name=>'robbery-1-stock',code=>'goutou',stock=>1,draws=>[0]},
  {name=>'robbery-robot',code=>'goutou',stock=>12,robot=>1,draws=>[0]},
  {name=>'robbery-empty-shelf',code=>'goutou',stock=>12,showcase=>0,draws=>[0]},
);
if(@ARGV){
  die 'expected --multi-shelf' unless @ARGV==1 && $ARGV[0] eq '--multi-shelf';
  @rows=(
    {name=>'theft-repeated-item-price-order',code=>'manbiki',stock=>0,stocks=>{40=>100},
     shown=>[40,40],prices=>[1200,1800],draws=>[0]},
    {name=>'robbery-repeated-item-price-order',code=>'goutou',stock=>0,stocks=>{40=>100},
     shown=>[40,40],prices=>[1800,1200],draws=>[0]},
    {name=>'theft-eight-mixed-and-gaps',code=>'manbiki',stock=>0,stocks=>{40=>100,1=>250,65=>1},
     shown=>[40,0,1,40,65,1,0,40],prices=>[1200,0,50,2000,50000,75,0,1300],draws=>[0]},
    {name=>'robbery-eight-mixed-and-gaps',code=>'goutou',stock=>0,stocks=>{40=>100,1=>250,65=>1},
     shown=>[40,0,1,40,65,1,0,40],prices=>[1200,0,50,2000,50000,75,0,1300],draws=>[0]},
    {name=>'theft-eight-robot-protects-all',code=>'manbiki',stock=>0,stocks=>{40=>100},
     shown=>[(40)x8],prices=>[(1200)x8],robot=>1,draws=>[0,900000]},
    {name=>'theft-eight-robot-destroyed',code=>'manbiki',stock=>0,stocks=>{40=>100},
     shown=>[(40)x8],prices=>[(1200)x8],robot=>1,draws=>[0,100000]},
    {name=>'robbery-eight-robot',code=>'goutou',stock=>0,stocks=>{40=>100},
     shown=>[(40)x8],prices=>[(1200)x8],robot=>1,draws=>[0]},
    {name=>'robbery-eight-empty',code=>'goutou',stock=>0,stocks=>{},
     shown=>[(0)x8],prices=>[(0)x8],draws=>[0]},
  );
}
@ITEM=();
$ITEM[64]={name=>'看門機器人'};
my @results;
for my $r (@rows){
  my @stock=(0)x79;
  $stock[9]=$r->{stock};
  my $shown=$r->{shown}//[$r->{showcase}//10];
  my $prices=$r->{prices}//[($r->{showcase}//10)?5000:0];
  if($r->{stocks}){for my $id(keys %{$r->{stocks}}){$stock[$id-1]=$r->{stocks}{$id};}}
  $stock[62]=@$shown==1?1:0;$stock[63]=$r->{robot}//0;$stock[78]=5;
  my $shop={
    id=>1,status=>1,shopname=>'來源原版商店',
    item=>\@stock,showcasecount=>scalar(@$shown),
    showcase=>$shown,price=>$prices,
    rank=>5000,money=>100000,
  };
  my $before=dclone($shop);
  @DT=($shop);
  @B55_DRAW=@{$r->{draws}};$B55_USED=0;
  my $fn=$sourceCallbacks{$r->{code}};
  no strict 'refs';
  my @args=$r->{code} eq 'manbiki'?(400,200):(700);
  my($ret,$msg)=&{$fn}(@args);
  use strict 'refs';
  die "B-55 original source callback $r->{name} did not use all RNG"
    if @B55_DRAW;
  die "B-55 source $r->{name} returned an active EVENT when not intended"
    if defined($ret)&&$ret!=0;
  push @results,{
    name=>$r->{name},input=>{
      eventCode=>$r->{code},shop=>$before,
      randomDraws=>$r->{draws},
    },output=>{
      item=>[@{$shop->{item}}],rank=>$shop->{rank},
      money=>$shop->{money},returnCode=>0,
      message=>$msg,randomDrawsUsed=>$B55_USED,
    },
  };
}
print JSON::PP->new->canonical->utf8->encode({
  source=>'fixed Standard Street DSL actual original manbiki/goutou Perl STARTFUNC bodies',
  formatterStub=>'GetMoneyString returns integer string without original display grouping',
  cases=>\@results,
  limit=>'single callback only; EVENT start gate and EVENT hash ordering not executed',
});
