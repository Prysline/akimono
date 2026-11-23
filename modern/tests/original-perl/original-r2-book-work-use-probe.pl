use strict;
use warnings;
use utf8;
use FindBin;
use JSON::PP;
use lib $FindBin::Bin;
use OriginalGiftMapUseHarness;
use OriginalFullUseLostbookHarness;
use OriginalInlineCallbackHarness;
binmode STDOUT,':raw';

# R2 full source: frozen GetBuffer + actual original UseItem accounting and
# the original #13 _local_1 inline body from B-27. All done in memory.
# Core GetMoneyString uses the explicit B-27 synthetic yen term. Nothing
# is loaded from live CGI, disk world or unreviewed callbacks.
my $in=JSON::PP->new->decode($ARGV[0]//'{}');
my $itemId=$in->{itemId};
my $useId=$in->{useId};
die 'R2 work oracle only ITEM #13 USE 0/1' unless
  defined($itemId)&&$itemId==13&&
  defined($useId)&&$useId=~/^[01]$/;
OriginalGiftMapUseHarness::compile();
OriginalFullUseLostbookHarness::bootstrap();
OriginalInlineCallbackHarness::bootstrap();
OriginalInlineCallbackHarness::select_callback('work');
my $sourceMake=OriginalGiftMapUseHarness::source('inc-makeitem.cgi');
my $getLocal=OriginalFullUseLostbookHarness::section(
  $sourceMake,'GetLocalFunction');
my $ok=eval "package main;use utf8;no strict;no warnings;\n".
  $getLocal."\n1;";
die "R2 work GetLocalFunction failed $@" unless $ok;
sub main::GetLine{return "_local_\n";}
my $dsl=OriginalGiftMapUseHarness::original_dsl();
my @chunks=split(/(?=^\@\@ITEM\b)/m,$dsl);
my @matching=grep{
  /^\@\@ITEM\b/m && /^\s*no\s+13(?:\s|$)/m
} @chunks;
die 'R2 work original ITEM count drift' unless @matching==1;
my @parts=split(/^\s*\@\@USE[^\n]*(?:\n|$)/mi,$matching[0]);
die 'R2 work original USE count changed' unless @parts==3;
die 'R2 work original ITEM code drift' unless
  $parts[0]=~/^\s*code\s+book-work(?:\s|$)/m;
$main::g_item={code=>'book-work',no=>13,scale=>'本'};
$main::g_use={no=>-1,exptime=>0};
for my $i(0..$useId){
  main::ClearBuffer('use');
  for my $raw(split(/\r?\n/,$parts[$i+1])){
    my $normalized=OriginalGiftMapUseHarness::line_for_compiler($raw);
    next unless defined $normalized;
    die 'R2 work unknown source field' unless
      $raw=~/^\s*(?:time|job|scale|action|name|info|param|func)\s/i;
    main::GetBuffer('use',$normalized);
  }
}
my $u=$main::g_use;
die 'R2 work compiled owner/clock changed' unless
  $u->{itemno}==13&&$u->{no}==$useId&&
  $u->{time}==($useId==0?7200:14400)&&
  $u->{param1}==($useId==0?3000:10000)&&
  $u->{exp}==0&&$u->{needexp}==0&&
  ($u->{func}//'')eq'_local_1';
my $stock=$in->{stock};
my $market=$in->{wholesale};
die 'R2 work needs 79-slot source arrays' unless
  ref($stock)eq'ARRAY'&&@$stock==79&&
  ref($market)eq'ARRAY'&&@$market==79;
my $exp=$in->{exp}||{};
$main::NOW_TIME=$in->{nowSeconds}//1000000;
$main::MAX_STOCK_TIME=259200;
$main::LIMIT_EXP=3600;
$main::MAX_ITEM=79;
$main::USER='r2-book-work-source';
$main::DT={
  id=>1,status=>1,job=>$in->{job}//'',rank=>$in->{rank}//5010,
  point=>0,money=>$in->{money}//100000,
  paytoday=>$in->{paytoday}//0,time=>$in->{time}//956800,
  exp=>{%$exp},item=>[@$stock],
  shopname=>'來源製作驗證店',
};
@main::DT=($main::DT);
@main::DTwholestore=@$market;
@OriginalInlineCallbackHarness::LOGS=();
@OriginalInlineCallbackHarness::term=('¥','');
for my $source (@main::out_item){
  $main::ITEM[$source->{no}]={%$source};
}
my $runtime={
  itemno=>13,no=>$useId,time=>0+$u->{time},
  exptime=>0+($u->{exptime}//0),money=>0,
  exp=>0,needexp=>0,needjob=>'',needpoint=>0,
  needpop=>0,needevent=>'',param1=>0+$u->{param1},
  use=>[],result=>{create=>[],function=>'_local_1'},
  arg=>{targetidx=>0},
};
if(($main::DT->{job}//'')eq'peddle'){
  my ($sourceJob,$formula)=split(/\t/,$u->{job}[0]);
  die 'R2 work original job drift' unless
    $sourceJob eq '行腳商人'&&
    $formula eq 'times/job_peddle_time_rate';
  $runtime->{time}=int($runtime->{time}/1.5);
  $runtime->{exptime}=int($runtime->{exptime}/1.5);
}
main::UseItem($runtime,$in->{requestedCount}//1);
my $result=$runtime->{result};
print JSON::PP->new->canonical->utf8->encode({
  compiled=>{itemId=>13,useId=>0+$useId,
    time=>0+$u->{time},exptime=>0+$u->{exptime},
    param=>0+$u->{param1},job=>$u->{job}},
  result=>{
    count=>0+($result->{count}//0),
    stock=>[@{$main::DT->{item}}],
    wholesale=>[map{0+($_//0)}@main::DTwholestore],
    exp=>{%{$main::DT->{exp}}},rank=>0+$main::DT->{rank},
    money=>0+$main::DT->{money},
    paytoday=>0+$main::DT->{paytoday},
    time=>0+$main::DT->{time},
    useitem=>$result->{useitem}||[],
    usemsg=>$result->{usemsg}||[],
    additem=>$result->{additem}||[],
    addmsg=>$result->{addmsg}||[],
    returned=>$result->{function_return},
    logs=>\@OriginalInlineCallbackHarness::LOGS,
  },
});
