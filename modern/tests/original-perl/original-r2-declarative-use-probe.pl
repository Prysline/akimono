use strict;
use warnings;
use utf8;
use FindBin;
use JSON::PP;
use lib $FindBin::Bin;
use OriginalGiftMapUseHarness;
use OriginalFullUseLostbookHarness;
binmode STDOUT,':raw';

# Execute the frozen GetBuffer/GetItemNumber compiler on the literal source
# USE stanza, then the frozen UseItem/MakeAmount/CheckWholeStore, in RAM only.
# No generated CGI, external require, disk world, or fabricated outcome.
our(@R2_DRAWS,@R2_RANGES,$R2_USED);
BEGIN {
  no warnings 'redefine';
  *CORE::GLOBAL::rand=sub (;$) {
    die 'R2 declarative oracle: missing Perl rand draw' unless @main::R2_DRAWS;
    my $million=shift @main::R2_DRAWS;
    die 'R2 declarative oracle: invalid draw' if $million<0||$million>=1000000;
    my $range=$_[0]//1;
    push @main::R2_RANGES,$range;
    $main::R2_USED++;
    return $range*$million/1000000;
  };
}
my $input=JSON::PP->new->decode($ARGV[0]//'{}');
my $itemId=$input->{itemId};
my $useId=$input->{useId};
die 'R2 oracle unknown ITEM' unless defined($itemId)&&$itemId=~/^(?:10|15|16|17|20|21|22|23|35|36|37|39|66)$/;
die 'R2 oracle invalid USE' unless defined($useId)&&$useId=~/^\d+$/;
my %expected=(10=>8,15=>5,16=>2,17=>4,
  20=>4,21=>4,22=>4,23=>4,35=>1,36=>1,37=>4,39=>19,66=>4);

OriginalGiftMapUseHarness::compile();
OriginalFullUseLostbookHarness::bootstrap();
# #15/2 is callback-free, but its source compiler must first read #15/1.
# That prior USE has a named lostbook callback; install the frozen original
# GetLocalFunction, never execute the previous recipe or source CGI.
my $sourceMake=OriginalGiftMapUseHarness::source('inc-makeitem.cgi');
my $getLocal=OriginalFullUseLostbookHarness::section(
  $sourceMake,'GetLocalFunction');
my $compiledLocal=eval "package main;use utf8;no strict;no warnings;\n".
  $getLocal."\n1;";
die "R2 original GetLocalFunction failed: $@" unless $compiledLocal;
sub main::GetLine { return "_local_\n"; }
my $dsl=OriginalGiftMapUseHarness::original_dsl();
my $compiler=OriginalGiftMapUseHarness::source('inc-makeitem.cgi');
my $core=OriginalGiftMapUseHarness::source('use.cgi');
for my $mark (
 '$g_use->{exp}    =$exp;',
 'if($idx=~/need/i){$idx="use"; $val[2]=0;}',
 '$g_use->{exptime}=$g_use->{time} if $g_use->{exptime}==0',
 'my @jobworklist=sort',
 '$keyuse=int($keyuse/$val);'
){
  die "R2 original compiler changed $mark" unless index($compiler,$mark)>=0;
}
die 'R2 original UseItem source changed' unless
  index($core,'$itemcount=MakeAmount($item->{count}*$count,$item->{proba});')>=0;

my @lines=split(/\r?\n/,$dsl);
my @chunks;
my $chunk;
for my $line(@lines){
  if($line=~/^\s*\@\@(ITEM|EVENT|END)\b/i){
    push @chunks,$chunk if $chunk && $chunk->{kind} eq 'ITEM';
    $chunk={kind=>uc($1),text=>''};
  }
  $chunk->{text}.=$line."\n" if $chunk;
}
push @chunks,$chunk if $chunk && $chunk->{kind} eq 'ITEM';
my @matching=grep {
  $_->{kind} eq 'ITEM'&&$_->{text}=~/^\s*no\s+\Q$itemId\E(?:\s|$)/m
} @chunks;
die 'R2 oracle ITEM owner drift' unless @matching==1;
my @parts=split(/^\s*\@\@USE[^\n]*(?:\n|$)/mi,$matching[0]{text});
die 'R2 oracle USE count drift' unless @parts==$expected{$itemId}+1;
die 'R2 oracle USE index' if $useId >= $expected{$itemId};
my($code)=$parts[0]=~/^\s*code\s+(\S+)/m;
my($owner)=$parts[0]=~/^\s*no\s+(\d+)/m;
die 'R2 oracle item code/number' unless $code && $owner==$itemId;

$main::g_item={code=>$code,no=>$itemId,scale=>'個'};
$main::g_use={no=>-1,exptime=>0};
for my $i(0..$useId){
  main::ClearBuffer('use');
  for my $raw(split(/\r?\n/,$parts[$i+1])){
    my $normalized=OriginalGiftMapUseHarness::line_for_compiler($raw);
    next unless defined $normalized;
    die "R2 oracle unexpected callback/source field $raw"
      unless $raw=~/^\s*(?:time|exptime|exp|price|name|info|scale|action|okmsg|ngmsg|needexp|job|use|need|get|func|param)\s/i;
    if($i==$useId&&$raw=~/^\s*(?:func|param)\s/i){
      die 'R2 source callback outside reviewed potion/equipment set'
        unless ($itemId==15&&($useId==1||$useId==3||$useId==4))||
          ($itemId>=20&&$itemId<=23&&$useId>=2)||
          ($itemId==66&&$useId>=1);
    }
    main::GetBuffer('use',$normalized);
  }
}
my $u=$main::g_use;
my $sourceLostbookCallback=
  ($itemId==15&&($useId==1||$useId==3||$useId==4))||
  ($itemId>=20&&$itemId<=23&&$useId>=2)||
  ($itemId==66&&$useId>=1);
my $expectedCallbackParam=($itemId==66&&$useId==3)?200:
  ($itemId==15&&($useId==1||$useId==3))?25:50;
if($sourceLostbookCallback){
  die 'R2 original lostbook callback source drift' unless
    ($u->{func}//'')eq'lostbook'&&$u->{param1}==$expectedCallbackParam;
}else{
  die 'R2 noncallback recipe grew original callback'
    if defined($u->{func})&&$u->{func}ne'';
}
die 'R2 compiled owner/index changed' unless
  $u->{itemno}==$itemId && $u->{no}==$useId && $u->{time}>0;
if($sourceLostbookCallback){
  # Frozen lostbook references the real ITEM name while the Core callback
  # itself is executed by the original Perl UseItem phase.
  for my $src (@main::out_item){$main::ITEM[$src->{no}]={%$src};}
}
my @materials=map {
  my @parts=split(/\t/,$_,-1);
  {no=>main::GetItemNumber($parts[1]),count=>0+$parts[0],
    proba=>0+$parts[2],message=>length($parts[3]//'')?$parts[3]:undef}
} @{$u->{use}};
my @created=map {
  my @parts=split(/\t/,$_,-1);
  {no=>main::GetItemNumber($parts[1]),count=>0+$parts[0],
    proba=>0+$parts[2],message=>length($parts[3]//'')?$parts[3]:undef}
} @{$u->{get}};
my $stock=$input->{stock};
my $wholesale=$input->{wholesale};
die 'R2 oracle needs explicit original 79-slot inventory and market'
  unless ref($stock)eq'ARRAY'&&@$stock==79&&
    ref($wholesale)eq'ARRAY'&&@$wholesale==79;
my $exp=$input->{exp}||{};
die 'R2 oracle EXP shape' unless ref($exp)eq'HASH';
$main::NOW_TIME=$input->{nowSeconds}//1000000;
$main::MAX_STOCK_TIME=259200;
$main::LIMIT_EXP=3600;
$main::MAX_ITEM=79;
$main::USER='r2-source-declarative';
$main::DT={id=>1,status=>1,job=>$input->{job}//'',
  rank=>5010,point=>0,money=>$input->{money}//100000,
  paytoday=>$input->{paytoday}//0,
  time=>$input->{time}//956800,
  exp=>{%$exp},item=>[@$stock],shopname=>'來源製作驗證店'};
@main::DT=($main::DT);
@main::DTwholestore=@$wholesale;
my $runtime={
  itemno=>$itemId,no=>$useId,time=>0+$u->{time},
  exptime=>0+($u->{exptime}//0),
  money=>0+($u->{money}//0),exp=>0+($u->{exp}//0),
  needexp=>0+($u->{needexp}//0),needjob=>'',needpoint=>0,
  needpop=>0,needevent=>'',param1=>0+($u->{param1}//0),
  use=>\@materials,
  result=>{create=>\@created,message=>{resultok=>$u->{okmsg}},
    ($sourceLostbookCallback?(function=>'lostbook'):())},
  arg=>{targetidx=>0},
};
# Source OutItemData emits this exact expression for each verified
# 'times/job_*_time_rate' declaration. The full generated _job_use
# dispatcher remains out of the live HTTP/R2 scope.
if(($main::DT->{job}//'')ne''&&@{$u->{job}||[]}){
  my ($jobName,$modifier)=split(/\t/,$u->{job}[0]);
  my %mapping=(書屋=>'book',武器屋=>'weapon',防具屋=>'armor',道具屋=>'tool',藥屋=>'drug',酪農家=>'cow');
  my $code=$mapping{$jobName} or die 'R2 unsupported source job';
  die 'R2 unexpected job time modifier'
    unless $modifier eq "times/job_${code}_time_rate";
  my($rate)=$dsl=~/^\s*set\s+job_\Q$code\E_time_rate\s+(\S+)/m;
  die 'R2 source job rate changed' unless defined($rate)&&$rate==1.5;
  if($main::DT->{job}eq$code){
    $runtime->{time}=int($runtime->{time}/$rate);
    $runtime->{exptime}=int($runtime->{exptime}/$rate);
  }
}
@main::R2_DRAWS=@{$input->{randomDraws}||[]};
@main::R2_RANGES=();
$main::R2_USED=0;
my $requested=$input->{requestedCount}//1;
main::UseItem($runtime,$requested);
die 'R2 oracle unused random samples' if @main::R2_DRAWS;
my $result=$runtime->{result};
print JSON::PP->new->canonical->utf8->encode({
  source=>'frozen inc-makeitem.cgi GetBuffer/GetItemNumber + original UseItem MakeAmount CheckWholeStore and EXP',
  compiled=>{itemId=>0+$itemId,useId=>0+$useId,
    time=>0+$u->{time},exptime=>0+($u->{exptime}//0),
    exp=>0+($u->{exp}//0),money=>0+($u->{money}//0),
    needexp=>0+($u->{needexp}//0),
    uses=>\@materials,creates=>\@created,
    job=>$u->{job}||[]},
  result=>{
    requestedCount=>0+$requested,count=>0+($result->{count}//0),
    stock=>[@{$main::DT->{item}}],
    wholesale=>[map {0+($_//0)} @main::DTwholestore],
    exp=>{%{$main::DT->{exp}}},
    money=>0+$main::DT->{money},paytoday=>0+$main::DT->{paytoday},
    time=>0+$main::DT->{time},
    useitem=>$result->{useitem}||[],additem=>$result->{additem}||[],
    usemsg=>$result->{usemsg}||[],addmsg=>$result->{addmsg}||[],
    functionReturn=>$result->{function_return},
    drawsUsed=>$main::R2_USED,randRanges=>\@main::R2_RANGES,
  },
});
