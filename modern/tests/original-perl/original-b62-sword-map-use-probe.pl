use strict;
use warnings;
use utf8;
use FindBin;
use JSON::PP;
use lib $FindBin::Bin;
use OriginalGiftMapUseHarness;
use OriginalFullUseLostbookHarness;
binmode STDOUT,':raw';
our(@B62_DRAWS,@B62_RANGES,$B62_USED);
BEGIN {
  no warnings 'redefine';
  *CORE::GLOBAL::rand=sub (;$) {
    die 'B-62 source unexpected Perl rand()' unless @main::B62_DRAWS;
    my $million=shift @main::B62_DRAWS;
    die 'B-62 invalid deterministic random sample'
      if $million<0||$million>=1000000;
    my $range=$_[0]//1;
    push @main::B62_RANGES,$range;
    $main::B62_USED++;
    return $range*$million/1000000;
  };
}
OriginalGiftMapUseHarness::compile();
OriginalFullUseLostbookHarness::bootstrap();
my $dsl=OriginalGiftMapUseHarness::original_dsl();
my $make=OriginalGiftMapUseHarness::source('inc-makeitem.cgi');
my $core=OriginalGiftMapUseHarness::source('use.cgi');
for my $sourceMark(
  [\$make,'($g_use->{funcbefore},$g_use->{localfuncbefore})=GetLocalFunction($name,"b".($g_use->{no}+1));'],
  [\$core,'sub UseItem'],
  [\$core,'sub MakeAmount'],
  [\$core,'$itemcount=MakeAmount($item->{count}*$count,$item->{proba});'],
  [\$core,'$DT->{exp}->{$USE->{itemno}}+=$expplus;'],
){
  my($text,$needle)=@$sourceMark;
  die "B-62 fixed Perl original changed $needle" unless index($$text,$needle)>=0;
}
my($part)=$dsl=~/(^\@\@ITEM[^\n]*\n[ \t]*no[ \t]+14\b[\s\S]*?)(?=^\@\@ITEM|^\@\@EVENT|^\@\@END|\z)/mi;
die 'B-62 original DSL map ITEM14 absent' unless defined($part);
my @pieces=split(/^[ \t]*\@\@use[^\n]*\n/mi,$part);
die 'B-62 map requires exactly one source USE' unless @pieces==2;
my($itemHeader,$useBody)=@pieces;
for my $fragment ('code'."\t".'shiire-ken','price'."\t".'10000','plus'."\t".'1h'){
 die "B-62 source map ITEM drift $fragment"
   unless index($itemHeader,$fragment)>=0;
}
my($callbackBody)=$useBody=~/^[ \t]*funcb[ \t]+_local_[^\n]*\n([\s\S]*?)^[ \t]*_local_[ \t]*$/m;
die 'B-62 source funcb source body missing' unless defined($callbackBody);
for my $needle (
 'return 0 if rand(1000)>100;',
 '$_->{count}*=2;',
 q{$USE->{result}->{message}->{resultok}='這次我們收穫的比平時多。';},
){
 die "B-62 original pre-callback changed: $needle"
   unless index($callbackBody,$needle)>=0;
}
my $ok=eval "package item;use utf8;no strict;no warnings;\n".
  "sub _local_b1 {\n$callbackBody\n}\n1;";
die "B-62 original Perl pre-callback couldn't compile: $@" unless $ok;
# The previously bundled B-33 compiler harness does not install
# GetLocalFunction. Compile that ORIGINAL frozen subroutine as well. The
# in-memory source fixture has already isolated the _local_ body; GetLine
# serves only the original compiler's local-function terminator.
my $originalGetLocal=OriginalFullUseLostbookHarness::section(
  $make,'GetLocalFunction');
my $compiledFunc=eval "package main;use utf8;no strict;no warnings;\n".
  $originalGetLocal."\n1;";
die "B-62 exact original compiler GetLocalFunction failed: $@"
  unless $compiledFunc;
sub main::GetLine { return "_local_\n"; }
$main::g_item={code=>'shiire-ken',no=>14,scale=>'份'};
$main::g_use={no=>-1,exptime=>0};
main::ClearBuffer('use');
for my $raw(split(/\r?\n/,$useBody)){
  my($field)=$raw=~/^[ \t]*([a-z]+)\s+/i;
  next unless $field&&
    $field=~/^(?:time|exp|exptime|price|name|action|func|param|funcb|get)$/i;
  my $normalized=OriginalGiftMapUseHarness::line_for_compiler($raw);
  main::GetBuffer('use',$normalized);
}
my $u=$main::g_use;
die 'B-62 original compiler wrong owner, costs or EXP' unless
  $u->{itemno}==14&&$u->{no}==0&&
  $u->{time}==7200&&$u->{exptime}==3600&&
  $u->{money}==12000&&$u->{exp}==20&&
  $u->{func} eq 'lostbook'&&$u->{param1}==100&&
  $u->{funcbefore} eq '_local_b1'&&@{$u->{get}}==5;
my @create;
for my $i(0..4){
  my @parts=split(/\t/,$u->{get}[$i]);
  my $id=main::GetItemNumber($parts[1]);
  die 'B-62 original GetItemNumber or GET chance mismatch' unless
    $id==40+$i&&$parts[0]==10&&
    $parts[2]==(400,350,150,60,30)[$i];
  push @create,{no=>$id,count=>0+$parts[0],
    proba=>0+$parts[2],message=>$parts[3]//''};
}
$main::NOW_TIME=897400;
$main::MAX_STOCK_TIME=259200;
$main::MAX_ITEM=79;
$main::USER='b62-original-perl';
$main::LIMIT_EXP=3600;
for my $original (@main::out_item){
  my $id=$original->{no};
  $main::ITEM[$id]={%$original};
}
$main::DT={
  id=>1,status=>1,rank=>5010,point=>0,job=>'',
  money=>90000,paytoday=>10000,time=>854800,
  item=>[(0)x79],exp=>{},shopname=>'原版劍市探針',
};
$main::DT->{item}[13]=1;
$main::DT->{item}[62]=1;
$main::DT->{item}[78]=5;
@main::DT=($main::DT);
@main::DTwholestore=(0)x79;
my $runtime={
  itemno=>14,no=>0,funcbefore=>$u->{funcbefore},
  param1=>$u->{param1},money=>$u->{money},
  time=>$u->{time},exptime=>$u->{exptime},exp=>$u->{exp},
  needexp=>0,needjob=>'',needpoint=>0,needpop=>0,needevent=>'',
  use=>[],result=>{create=>[map {{%$_}}@create],
    function=>'lostbook'},arg=>{targetidx=>0},
};
@main::B62_DRAWS=(999999,(0)x10,(999999)x40,999999);
@main::B62_RANGES=();
$main::B62_USED=0;
my $callback=item::_local_b1($runtime);
die 'B-62 no-double original funcb branch failed' unless $callback==0;
main::UseItem($runtime,1);
die 'B-62 unused source draws' if @main::B62_DRAWS;
die 'B-62 wrong original rand count' unless $main::B62_USED==52;
print JSON::PP->new->canonical->utf8->encode({
  source=>'literal original #14 USE DSL compiled by real GetBuffer; original funcb body plus fixed UseItem MakeAmount GetItemUseTime UseTime CheckWholeStore item::lostbook and EXP',
  compiled=>{
    itemId=>14,seconds=>$u->{time},expTimeSeconds=>$u->{exptime},
    money=>$u->{money},exp=>$u->{exp},callback=>$u->{funcbefore},
    function=>$u->{func},outputs=>\@create,
  },
  result=>{
    woodSwords=>0+$main::DT->{item}[39],
    maps=>0+$main::DT->{item}[13],
    money=>0+$main::DT->{money},
    paytoday=>0+$main::DT->{paytoday},
    time=>0+$main::DT->{time},
    exp14=>0+$main::DT->{exp}{14},
    count=>0+$runtime->{result}{count},
    created=>$runtime->{result}{additem},
    callbackResult=>$runtime->{result}{function_return},
    wholesaleWood=>0+($main::DTwholestore[39]//0),
  },
  consumedDraws=>$main::B62_USED,
  randRanges=>\@main::B62_RANGES,
  scope=>'only deterministic no-double/no-lostbook branch, 10 real wooden swords; not all original source USE branches or CGI',
});
