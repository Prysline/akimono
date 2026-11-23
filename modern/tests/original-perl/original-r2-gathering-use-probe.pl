use strict;
use warnings;
use utf8;
use FindBin;
use JSON::PP;
use lib $FindBin::Bin;
use OriginalGiftMapUseHarness;
use OriginalFullUseLostbookHarness;
binmode STDOUT,':raw';
our (@R2_MAP_DRAWS,@R2_MAP_RANGES,$R2_MAP_USED);
BEGIN {
  no warnings 'redefine';
  *CORE::GLOBAL::rand=sub (;$) {
    die 'R2 gathering oracle missing source draw' unless @main::R2_MAP_DRAWS;
    my $sample=shift @main::R2_MAP_DRAWS;
    die 'R2 gathering oracle invalid source draw' if $sample<0||$sample>=1000000;
    my $range=$_[0]//1;
    push @main::R2_MAP_RANGES,$range;
    $main::R2_MAP_USED++;
    return $range*$sample/1000000;
  };
}
my $input=JSON::PP->new->decode($ARGV[0]//'{}');
my ($itemId,$useId)=@{$input}{qw(itemId useId)};
die 'R2 gathering only source maps #9/#12' unless
  defined($itemId)&&($itemId==9||$itemId==12)&&
  defined($useId)&&$useId=~/^\d+$/;
OriginalGiftMapUseHarness::compile();
OriginalFullUseLostbookHarness::bootstrap();
my $make=OriginalGiftMapUseHarness::source('inc-makeitem.cgi');
my $getLocal=OriginalFullUseLostbookHarness::section(
  $make,'GetLocalFunction');
my $ok=eval "package main;use utf8;no strict;no warnings;\n".
  $getLocal."\n1;";
die "R2 original source GetLocalFunction failed: $@" unless $ok;
sub main::GetLine { return "_local_\n"; }
my $dsl=OriginalGiftMapUseHarness::original_dsl();
my @chunks=split(/(?=^\@\@ITEM\b)/m,$dsl);
my @matching=grep {
  /^\@\@ITEM\b/m && /^\s*no\s+\Q$itemId\E(?:\s|$)/m
} @chunks;
die 'R2 gathering source map owner absent' unless @matching==1;
my @parts=split(/^\s*\@\@USE[^\n]*(?:\n|$)/mi,$matching[0]);
my $expected=$itemId==12?4:3;
die 'R2 gathering source USE count drift' unless @parts==$expected+1;
die 'R2 gathering source use out of range' unless $useId<$expected;
my($code)=$parts[0]=~/^\s*code\s+(\S+)/m;
my($owner)=$parts[0]=~/^\s*no\s+(\d+)/m;
die 'R2 gathering source ITEM drift' unless $owner==$itemId&&
  $code eq ($itemId==12?'book-mtsearch':'book-metalsearch');
$main::g_item={code=>$code,no=>$itemId,scale=>'份'};
$main::g_use={no=>-1,exptime=>0};
for my $i(0..$useId){
  main::ClearBuffer('use');
  for my $raw(split(/\r?\n/,$parts[$i+1])){
    my $line=OriginalGiftMapUseHarness::line_for_compiler($raw);
    next unless defined $line;
    die "R2 gathering unexpected source field $raw" unless
      $raw=~/^\s*(?:time|exptime|exp|job|scale|action|name|info|ngmsg|func|param|get)\s/i;
    main::GetBuffer('use',$line);
  }
}
my $u=$main::g_use;
die 'R2 gathering compiler drift' unless
  $u->{itemno}==$itemId&&$u->{no}==$useId&&
  $u->{time}==3600&&$u->{exptime}==900&&
  $u->{exp}==20&&$u->{param1}==10&&$u->{func} eq 'lostbook';
for my $src (@main::out_item){
  $main::ITEM[$src->{no}]={%$src};
}
my @created=map {
  my @row=split(/\t/,$_,-1);
  {no=>main::GetItemNumber($row[1]),count=>0+$row[0],
   proba=>0+$row[2],message=>length($row[3]//'')?$row[3]:''}
} @{$u->{get}};
my @materials=map {
  my @row=split(/\t/,$_,-1);
  {no=>main::GetItemNumber($row[1]),count=>0+$row[0],
   proba=>0+$row[2],message=>$row[3]//''}
} @{$u->{use}};
die 'R2 gathering should need no consumable material' if @materials;
my $stock=$input->{stock};
my $market=$input->{wholesale};
die 'R2 gathering oracle needs complete source world arrays' unless
  ref($stock)eq'ARRAY'&&@$stock==79&&ref($market)eq'ARRAY'&&@$market==79;
my $exp=$input->{exp}||{};
die 'R2 gathering EXP record malformed' unless ref($exp)eq'HASH';
$main::NOW_TIME=$input->{nowSeconds};
$main::MAX_STOCK_TIME=259200;
$main::LIMIT_EXP=3600;
$main::MAX_ITEM=79;
$main::USER='r2-gather-source';
$main::DT={
  id=>1,status=>1,rank=>5010,point=>0,
  job=>$input->{job}//'',money=>$input->{money},paytoday=>$input->{paytoday},
  time=>$input->{time},exp=>{%$exp},
  item=>[@$stock],shopname=>'原版採集測試',
};
@main::DT=($main::DT);
@main::DTwholestore=@$market;
my $runtime={
  itemno=>$itemId,no=>$useId,
  time=>$u->{time},exptime=>$u->{exptime},money=>0,exp=>$u->{exp},
  param1=>$u->{param1},
  needexp=>0,needjob=>'',needpoint=>0,needpop=>0,needevent=>'',
  use=>\@materials,result=>{create=>\@created,function=>'lostbook'},
  arg=>{targetidx=>0},
};
if(($main::DT->{job}//'')eq'material'&&@{$u->{job}||[]}){
  my($sourceJob,$modifier)=split(/\t/,$u->{job}[0]);
  die 'R2 gathering job drift' unless
    $sourceJob eq '山師'&&$modifier eq 'times/job_material_time_rate';
  $runtime->{time}=int($runtime->{time}/1.5);
  $runtime->{exptime}=int($runtime->{exptime}/1.5);
}
@main::R2_MAP_DRAWS=@{$input->{randomDraws}||[]};
@main::R2_MAP_RANGES=();
$main::R2_MAP_USED=0;
main::UseItem($runtime,1);
die 'R2 gathering oracle unused draws' if @main::R2_MAP_DRAWS;
print JSON::PP->new->canonical->utf8->encode({
  compiled=>{itemId=>$itemId,useId=>$useId,
    time=>0+$u->{time},exptime=>0+$u->{exptime},exp=>0+$u->{exp},
    param=>0+$u->{param1},creates=>\@created},
  result=>{
    stock=>[@{$main::DT->{item}}],
    wholesale=>[map {0+($_//0)} @main::DTwholestore],
    exp=>{%{$main::DT->{exp}}},
    money=>0+$main::DT->{money},paytoday=>0+$main::DT->{paytoday},
    time=>0+$main::DT->{time},
    useitem=>$runtime->{result}{useitem}||[],
    usemsg=>$runtime->{result}{usemsg}||[],
    additem=>$runtime->{result}{additem}||[],
    addmsg=>$runtime->{result}{addmsg}||[],
    functionReturn=>$runtime->{result}{function_return},
    drawsUsed=>$main::R2_MAP_USED,
    randRanges=>\@main::R2_MAP_RANGES,
  },
});
