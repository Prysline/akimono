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
    $field=~/^(?:time|exp|exptime|price|name|action|func|param|funcb|get|job)$/i;
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

# R2 repeat-use oracle: source-compiled ITEM #14 USE/funcb and frozen real
# calc.cgi::GetItemUseTime / plug/use.cgi::UseItem, MakeAmount, EXP/LIMIT_EXP,
# item::lostbook, CheckWholeStore. Inputs control only the Perl world and RNG.
my $input=JSON::PP->new->decode($ARGV[0]//'{}');
die 'R2 source oracle needs steps' unless ref($input->{steps}) eq 'ARRAY';
my $initial=$input->{initial}||{};
$main::DT->{money}=$initial->{money} if exists $initial->{money};
$main::DT->{time}=$initial->{time} if exists $initial->{time};
$main::DT->{paytoday}=$initial->{paytoday} if exists $initial->{paytoday};
$main::DT->{exp}=$initial->{exp} if exists $initial->{exp};
$main::DT->{item}[13]=$initial->{maps} if exists $initial->{maps};
for my $itemno(40..44){
  $main::DT->{item}[$itemno-1]=$initial->{swords}{$itemno}
    if exists $initial->{swords} && exists $initial->{swords}{$itemno};
}
for my $itemno(keys %{ $initial->{wholesale}||{} }){
  $main::DTwholestore[$itemno-1]=$initial->{wholesale}{$itemno};
}
$main::NOW_TIME=$initial->{nowSeconds} if exists $initial->{nowSeconds};
$main::DT->{job}=$initial->{job} if exists $initial->{job};
my ($originalJobRate)=$dsl=~/^\s*set\s+job_peddle_time_rate\s+([0-9.]+)/m;
die 'source Peddle job rate declaration missing' unless defined $originalJobRate;
$main::g_define->{job_peddle_time_rate}=$originalJobRate;
die 'frozen GetBuffer job compiler did not preserve source job declaration'
  unless @{$u->{job}}==1 &&
    $u->{job}[0] eq "行腳商人\ttimes/job_peddle_time_rate";
my @results;
for my $step (@{$input->{steps}}){
  my $requested=$step->{requestedCount}//1;
  my @draws=@{$step->{randomDraws}||[]};
  @main::B62_DRAWS=@draws;
  @main::B62_RANGES=();
  $main::B62_USED=0;
  # The original compiled USE/result is request-local in CGI. Recreate its
  # request-local result each time, but preserve the actual player DT EXP.
  my $this={
    %$runtime,
    result=>{create=>[map {{%$_}} @create],function=>'lostbook'},
    arg=>{targetidx=>0},
  };
  # Original compiler's declared job times/rate: use actual frozen
  # GetNumber plus Perl integer truncation before the real UseItem.
  # This isolates the _job_use hook until full generated item CGI is wired.
  if(($main::DT->{job}//'') eq 'peddle'){
    my $rate=main::GetNumber('job_peddle_time_rate');
    die 'compiled source peddle rate wrong' unless $rate==1.5;
    $this->{time}=int($this->{time}/$rate);
    $this->{exptime}=int($this->{exptime}/$rate);
  }
  my $oldexp=0+($main::DT->{exp}{14}//0);
  my $sourceTime=main::GetItemUseTime($this);
  my $before={
    money=>0+$main::DT->{money},time=>0+$main::DT->{time},
    paytoday=>0+$main::DT->{paytoday},maps=>0+$main::DT->{item}[13],
    swords=>[map {0+$main::DT->{item}[$_-1]} (40..44)],
    exp=>{%{$main::DT->{exp}}},
  };
  my $callback=item::_local_b1($this);
  die 'original #14 funcb callback returned unexpectedly' if $callback!=0;
  main::UseItem($this,$requested);
  my $used=$main::B62_USED;
  push @results,{
    before=>$before,sourceUseTimeSeconds=>$sourceTime,
    requestedCount=>0+$requested,effectiveCount=>0+($this->{result}{count}//0),
    money=>0+$main::DT->{money},paytoday=>0+$main::DT->{paytoday},
    time=>0+$main::DT->{time},maps=>0+$main::DT->{item}[13],
    swords=>[map {0+$main::DT->{item}[$_-1]} (40..44)],
    exp=>{%{$main::DT->{exp}}},
    wholesale=>[map {0+($main::DTwholestore[$_-1]//0)} (40..44)],
    originalUseItem=>$this->{result}{useitem}||[],
    originalUseMsg=>$this->{result}{usemsg}||[],
    originalAddItem=>$this->{result}{additem}||[],
    originalAddMsg=>$this->{result}{addmsg}||[],
    originalFunctionReturn=>$this->{result}{function_return},
    originalResultOk=>$this->{result}{message}{resultok},
    originalTrashMsg=>$this->{result}{trashmsg}||[],
    originalSamples=>[@draws[0..$used-1]],
    consumedDraws=>$used,randRanges=>[@main::B62_RANGES],
    expOld=>$oldexp,
  };
}
print JSON::PP->new->canonical->utf8->encode({
  source=>'frozen original GetBuffer + funcb + GetItemUseTime + UseItem + MakeAmount + lostbook + CheckWholeStore + LIMIT_EXP',
  limitExp=>$main::LIMIT_EXP,results=>\@results,
});
