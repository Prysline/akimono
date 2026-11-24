use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use JSON::PP;
binmode STDOUT,':raw';
our(@DT,@B58_DRAW,@B58_LOG,$B58_USED,$MAX_MONEY);
BEGIN{
  no warnings 'redefine';
  *CORE::GLOBAL::rand=sub{
    my($max)=@_;
    die "B-58 unexpected original RNG range $max" unless $max==6096454;
    die 'B-58 missing per-ticket source draw' unless @main::B58_DRAW;
    $main::B58_USED++;
    return shift @main::B58_DRAW;
  };
}
sub source{
  my($path)=@_;
  my $file=File::Spec->catfile($FindBin::Bin,$path);
  open(my $fh,'<:encoding(UTF-8)',$file) or die $!;
  local $/;my $value=<$fh>;close $fh;return $value;
}
# Deliberately stub only presentation logging, never ticket or cash logic.
sub GetMoneyString {return $_[0];}
sub WriteLog {
  my($level,$shopId,$message)=@_;
  push @B58_LOG,{level=>$level,shopId=>$shopId,message=>$message};
}
my $dsl=source('../../../custom/inc-item-data.cgi');
my $turn=source('inc-turn.cgi');
my $compiler=source('inc-makeitem.cgi');
die 'B-58 original source EVENT STARTFUNC runtime drift' unless
  index($turn,'($ret,$msg)=&$func(split(/[:,]/,$E->{startfuncparam}));')>=0;
die 'B-58 original source MaxMoney compiler drift' unless
  $dsl=~/^[ \t]*MaxMoney[ \t]+999999999(?:[ \t]|$)/m &&
  index($compiler,'$g_define->{maxmoney}=GetNumber($1);')>=0 &&
  index($compiler,'$MAX_MONEY=$g_define->{maxmoney};')>=0;
$MAX_MONEY=999999999;

my @sections=split(/^\@\@EVENT[^\r\n]*\r?\n/mi,$dsl);
shift @sections;
for(@sections){s/^\@\@(ITEM|DEFINE|END|FUNC[A-Z]+)\b[\s\S]*$//mi;}
my @matches=grep(/^[ \t]*code[ \t]+loto(?:[ \t]|$)/m,@sections);
die 'B-58 original loto EVENT not uniquely declared' unless @matches==1;
my($head,$body)=$matches[0]=~/
  ^[ \t]*startfunc[ \t]+(\S+)[^\r\n]*\r?\n
  ([\s\S]*?)
  ^[ \t]*_local_[ \t]*$
/mx;
die 'B-58 source STARTFUNC no longer _local_' unless
  defined($head)&&defined($body)&&$head eq '_local_';
die 'B-58 unexpected source macro' if $body=~/\@\@/;
my $ok=eval "no strict; no warnings; sub original_b58_loto {\n".$body."\n}\n1;";
die "B-58 source Perl callback compilation failed: $@" unless $ok;

sub shop{
  my($r)=@_;
  my @item=(0)x79;
  $item[62]=1;$item[78]=5;$item[10]=$r->{tickets};
  return {id=>1,status=>1,shopname=>'原版抽獎商店',money=>$r->{money},
    rank=>5000,item=>\@item,showcasecount=>1,
    showcase=>[0],price=>[0]};
}
my @rows=(
  {name=>'zero-tickets-opening-only',tickets=>0,money=>100000,draws=>[]},
  {name=>'miss',tickets=>1,money=>100000,draws=>[6096453]},
  {name=>'fifth',tickets=>1,money=>100000,draws=>[152410]},
  {name=>'fifth-boundary',tickets=>1,money=>100000,draws=>[152411]},
  {name=>'fourth',tickets=>1,money=>100000,draws=>[9999]},
  {name=>'fourth-boundary',tickets=>1,money=>100000,draws=>[10000]},
  {name=>'third',tickets=>1,money=>100000,draws=>[215]},
  {name=>'third-boundary',tickets=>1,money=>100000,draws=>[216]},
  {name=>'second',tickets=>1,money=>100000,draws=>[5]},
  {name=>'second-boundary',tickets=>1,money=>100000,draws=>[6]},
  {name=>'first',tickets=>1,money=>100000,draws=>[0]},
  {name=>'first-boundary',tickets=>1,money=>100000,draws=>[1]},
  {name=>'mixed-three',tickets=>3,money=>100000,
    draws=>[6096453,152410,9999]},
  {name=>'all-five-prizes',tickets=>6,money=>100000,
    draws=>[0,1,5,215,9999,152410]},
  {name=>'money-cap',tickets=>1,money=>999999950,draws=>[152410]},
);
my @results;
for my $r(@rows){
  my $original=shop($r);
  @DT=($original);@B58_DRAW=@{$r->{draws}};
  @B58_LOG=();$B58_USED=0;
  my($ret,$message)=original_b58_loto();
  die "B-58 $r->{name} didn't consume exact callback RNG" if @B58_DRAW;
  die "B-58 $r->{name} unexpectedly starts an active event" if $ret!=0;
  push @results,{
    name=>$r->{name},
    input=>{shop=>shop($r),randomDraws=>$r->{draws}},
    output=>{money=>$original->{money},rank=>$original->{rank},
      item=>[@{$original->{item}}],returnCode=>0,message=>$message,
      randomDrawsUsed=>$B58_USED,logs=>[map {{%$_}} @B58_LOG]},
  };
}
print JSON::PP->new->canonical->utf8->encode({
  source=>'actual frozen original Standard Street EVENT loto STARTFUNC body',
  originalRange=>6096454,maxMoney=>$MAX_MONEY,
  formatterStub=>'only GetMoneyString number display + WriteLog output collection are stubbed',
  cases=>\@results,
  scope=>'one real original source callback per case; EVENT gate/hash and persistent log not run',
});
