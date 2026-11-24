use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use File::Spec;
binmode STDOUT,':raw';
our $g_define={};
sub source{
  my($name)=@_;
  my $file=File::Spec->catfile($FindBin::Bin,$name);
  open(my $fh,'<:encoding(UTF-8)',$file) or die $!;
  local $/;my $content=<$fh>;close $fh;return $content;
}
my $compiler=source('inc-makeitem.cgi');
my($getTime)=$compiler=~/(^sub GetTime\n\{[\s\S]*?^\}\n)(?=\nsub GetNumber)/m;
my($getNumber)=$compiler=~/(^sub GetNumber\n\{[\s\S]*?^\}\n)(?=\nsub GetTypeNumber)/m;
die 'Frozen original compiler GetTime/GetNumber source missing'
  unless defined($getTime)&&defined($getNumber);
my $ok=eval 'no strict; no warnings; '.$getTime."\n".$getNumber."\n1;";
die "Original compiler source function compile failed: $@" unless $ok;
die 'Original compiler percentage or zero/start-disable semantics drift'
  unless GetNumber('10%')==100 && GetNumber('7%')==70 &&
  GetNumber('100%')==1000 && GetNumber('50%')==500 &&
  GetNumber('-1')==-1 && GetNumber('0')==0 &&
  GetTime('5h')==18000 && GetTime('48h')==172800;

my @items;
for my $file('../../../custom/inc-item-data.cgi','../../../custom/inc-rebel-data.cgi'){
  my $dsl=source($file);
  my @blocks=split(/^\@\@EVENT[^\r\n]*\r?\n/mi,$dsl);
  shift @blocks;
  for my $block (@blocks){
    $block=~s/^\@\@(ITEM|DEFINE|FUNC[A-Z]+|END)\b[\s\S]*$//mi;
    my($code)=$block=~/^\s*code\s+([^\s#]+)/mi;
    die 'Missing declared EVENT code in original DSL' unless $code;
    my @starts=$block=~/^\s*start\s+([^\s#]+)/gmi;
    die "Missing event start $code" unless @starts;
    my($group)=$block=~/^\s*group\s+([^\s#]+)/mi;
    my($base)=$block=~/^\s*basetime\s+([^\s#]+)/mi;
    my($plus)=$block=~/^\s*plustime\s+([^\s#]+)/mi;
    my($startFunc)=$block=~/^\s*startfunc\s+([^\s#]+)/mi;
    my($endFunc)=$block=~/^\s*endfunc\s+([^\s#]+)/mi;
    my($nowFunc)=$block=~/^\s*func\s+([^\s#]+)/mi;
    my $count=scalar(@items)+1;
    my $chance=GetNumber($starts[-1]);
    my $runtime=$chance!=-1?1:0;
    push @items,{
      code=>$code,ordinal=>$count,group=>defined($group)?$group:"$count",
      startProba=>0+$chance,startRaw=>[@starts],
      baseTimeSeconds=>defined($base)?0+GetTime($base):0,
      plusTimeSeconds=>defined($plus)?0+GetTime($plus):0,
      callbacks=>{
        start=>$startFunc//undef,end=>$endFunc//undef,now=>$nowFunc//undef,
      },
      compiled=>$runtime?JSON::PP::true:JSON::PP::false,
    };
  }
}
my @active=grep($_->{compiled},@items);
die 'Original source EVENT compilation distribution changed'
  unless @items==25&&@active==17&&
    (scalar grep{$_->{startProba}==0}@active)==2&&
    (scalar grep{$_->{startProba}>0}@active)==15;
my($rebel)=grep{$_->{code}eq'rebel'}@items;
my($guild)=grep{$_->{code}eq'guildbattle'}@items;
my($price)=grep{$_->{code}eq'priceup-yakusou'}@items;
die 'Original zero-start/callback/disabled semantics unexpected'
  unless $rebel->{startProba}==0 && $rebel->{callbacks}{now}eq'_local_' &&
    $guild->{startProba}==0 && $guild->{callbacks}{end}eq'_local_' &&
    $price->{startProba}==-1 && join(',',@{$price->{startRaw}})eq'50%,-1';
print JSON::PP->new->canonical->utf8->encode({
  source=>'frozen original inc-makeitem.cgi GetNumber/GetTime + both source EVENT DSL headers',
  declared=>\@items,declaredCount=>scalar(@items),
  compiledCount=>scalar(@active),disabledCount=>@items-@active,
  zeroStartCount=>2,positiveStartCount=>15,
  scope=>'EVENT metadata only; no original EVENT callbacks or hash iteration order, no game world write',
});
