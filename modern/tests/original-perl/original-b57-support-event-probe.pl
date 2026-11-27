use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use JSON::PP;
binmode STDOUT,':raw';

our(@DT,@B57_DRAW,$B57_USED,$MAX_MONEY);
BEGIN {
  no warnings 'redefine';
  *CORE::GLOBAL::rand=sub {
    my($max)=@_;
    die "B-57 expected original rand(1000), got $max" unless $max==1000;
    die 'B-57 missing source callback RNG sample' unless @main::B57_DRAW;
    $main::B57_USED++;
    return shift(@main::B57_DRAW)*$max/1000000;
  };
}
sub source {
  my($relative)=@_;
  my $path=File::Spec->catfile($FindBin::Bin,$relative);
  open(my $fh,'<:encoding(UTF-8)',$path) or die $!;
  local $/;my $text=<$fh>;close $fh;return $text;
}
# Formatting stub deliberately avoids invoking the original GUI money formatter.
sub GetMoneyString { return $_[0]; }

my $itemDsl=source('../../../custom/inc-item-data.cgi');
my $turn=source('inc-turn.cgi');
my $compiler=source('inc-makeitem.cgi');
die 'B-57 source STARTFUNC call drift' unless
  index($turn,'($ret,$msg)=&$func(split(/[:,]/,$E->{startfuncparam}));')>=0;
die 'B-57 original money source declaration or compiler drift' unless
  $itemDsl=~/^[ \t]*MaxMoney[ \t]+999999999(?:[ \t]|$)/m &&
  index($compiler,'$g_define->{maxmoney}=GetNumber($1);')>=0 &&
  index($compiler,'$MAX_MONEY=$g_define->{maxmoney};')>=0;
$MAX_MONEY=999999999;

my @parts=split(/^\@\@EVENT[^\r\n]*\r?\n/mi,$itemDsl);
shift @parts;
my %functions;
for my $spec (
  ['getmoney','_local_(100000)'],
  ['getpop','_local_(1000)'],
){
  my($code,$args)=@$spec;
  my @matches=grep(/^\s*code\s+\Q$code\E(?:\s|$)/m,@parts);
  die "B-57 EVENT $code missing or duplicated" unless @matches==1;
  my($head,$body)=$matches[0]=~/
    ^\s*startfunc\s+(\S+)[^\n]*\r?\n
    ([\s\S]*?)
    ^[ \t]*_local_[ \t]*$
  /mx;
  die "B-57 original $code STARTFUNC moved" unless
    defined($head)&&defined($body)&&$head eq $args;
  die 'B-57 callback includes an unexpanded macro' if $body=~/\@\@/;
  my $fn="original_b57_$code";
  my $ok=eval "no strict; no warnings; sub $fn {\n".$body."\n}\n1;";
  die "B-57 source callback Perl compilation failed: $@" unless $ok;
  $functions{$code}=$fn;
}
sub fresh_shop {
  my($case)=@_;
  my @item=(0)x79;
  my $n=$case->{shelves}//1;
  $item[62]=$n==1?1:0; $item[78]=5;
  return {
    id=>1,status=>1,shopname=>'原版商店',
    item=>\@item,showcasecount=>$n,showcase=>[(0)x$n],price=>[(0)x$n],
    money=>$case->{money},rank=>$case->{rank},
  };
}
my @rows=(
  {name=>'funding-hit',code=>'getmoney',money=>100000,rank=>5000,draw=>0},
  {name=>'funding-miss',code=>'getmoney',money=>100000,rank=>5000,draw=>999999},
  {name=>'funding-threshold-inclusive',code=>'getmoney',money=>100000,rank=>5000,draw=>300000},
  {name=>'funding-threshold-above',code=>'getmoney',money=>100000,rank=>5000,draw=>300001},
  {name=>'funding-upper-cap',code=>'getmoney',money=>999999950,rank=>5000,draw=>0},
  {name=>'funding-already-capped',code=>'getmoney',money=>999999999,rank=>5000,draw=>0},
  {name=>'pop-hit',code=>'getpop',money=>100000,rank=>5000,draw=>0},
  {name=>'pop-miss',code=>'getpop',money=>100000,rank=>5000,draw=>999999},
  {name=>'pop-threshold-inclusive',code=>'getpop',money=>100000,rank=>5000,draw=>300000},
  {name=>'pop-upper-cap',code=>'getpop',money=>100000,rank=>9950,draw=>0},
  {name=>'pop-already-capped',code=>'getpop',money=>100000,rank=>10000,draw=>0},
);
if(@ARGV){
  die 'expected --multi-shelf' unless @ARGV==1 && $ARGV[0] eq '--multi-shelf';
  @rows=();
  for my $n(1..8){
    push @rows,
      {name=>"funding-shelves-$n",code=>'getmoney',money=>100000,rank=>5000,draw=>0,shelves=>$n},
      {name=>"pop-shelves-$n",code=>'getpop',money=>100000,rank=>5000,draw=>0,shelves=>$n};
  }
}
my @results;
for my $case(@rows){
  my $shop=fresh_shop($case);
  @DT=($shop);
  @B57_DRAW=($case->{draw});$B57_USED=0;
  my $fn=$functions{$case->{code}};
  my @args=$case->{code}eq'getmoney'?(100000):(1000);
  no strict 'refs';
  my($ret,$msg)=&{$fn}(@args);
  use strict 'refs';
  die "B-57 unused source callback RNG in $case->{name}" if @B57_DRAW;
  die "B-57 $case->{name} accidentally returned active event" if $ret!=0;
  my $inputShop=fresh_shop($case);
  push @results,{
    name=>$case->{name},
    input=>{shop=>$inputShop,eventCode=>$case->{code},randomDraws=>[$case->{draw}]},
    output=>{money=>$shop->{money},rank=>$shop->{rank},
      item=>[@{$shop->{item}}],returnCode=>0,
      message=>$msg,randomDrawsUsed=>$B57_USED},
  };
}
# Execute both source callbacks back-to-back on one real Perl shop, consuming
# one shared rand(1000) stream. They must not create an activity record.
my $combined=fresh_shop({money=>100000,rank=>5000});
@DT=($combined);
@B57_DRAW=(0,0);$B57_USED=0;
my @combinedMessages;
for my $step(
  ['getmoney',100000],
  ['getpop',1000],
){
  my($code,$param)=@$step;
  my $fn=$functions{$code};
  no strict 'refs';
  my($ret,$message)=&{$fn}($param);
  use strict 'refs';
  die "B-57 combined callback $code returned active event" if $ret!=0;
  push @combinedMessages,$message;
}
die 'B-57 combined Perl source RNG mismatch' if @B57_DRAW||$B57_USED!=2;
print JSON::PP->new->canonical->utf8->encode({
  source=>'actual frozen Standard Street EVENT getmoney/getpop Perl STARTFUNC bodies',
  maxMoney=>$MAX_MONEY,
  formatterStub=>'GetMoneyString returns literal integer, not full GUI formatting',
  cases=>\@results,
  combined=>{money=>$combined->{money},rank=>$combined->{rank},
    randomDrawsUsed=>$B57_USED,messages=>\@combinedMessages},
  scope=>'source callbacks only; original EVENT selection and Perl hash order are external',
});
