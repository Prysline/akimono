use strict;
use warnings;
use utf8;
use FindBin;
use JSON::PP;
use lib $FindBin::Bin;
use OriginalGiftMapUseHarness;
use OriginalFullUseLostbookHarness;
binmode STDOUT,':raw';

# Literal original gift #79 USE 1..4 from DSL through frozen GetBuffer,
# GetItemNumber and frozen UseItem/UseTime/CheckWholeStore. No fake expected.
OriginalGiftMapUseHarness::bootstrap();
OriginalFullUseLostbookHarness::bootstrap();
my ($items,$parts)=OriginalGiftMapUseHarness::parse_dsl();
die 'R2 gift USE variants require exactly 5 source entries' unless @$parts==6;
my $input=JSON::PP->new->decode($ARGV[0]//'{}');
my $useId=$input->{useId};
die 'R2 original gift variant ID invalid'
  unless defined($useId)&&$useId=~/^[1-4]$/;
# The trusted first original gift compiler fills all 79 actual ITEM codes
# and cap data, preserving the original wholesale cap behavior.
my $first=OriginalGiftMapUseHarness::compile();
$main::g_item={code=>'gift',no=>79,scale=>'枚'};
$main::g_use={no=>$useId-1,exptime=>0};
main::ClearBuffer('use');
for my $raw(split(/\r?\n/,$parts->[$useId+1])){
  my $normalized=OriginalGiftMapUseHarness::line_for_compiler($raw);
  next unless defined $normalized;
  die 'R2 unreviewed gift extra callback or source statement'
    unless $raw=~/^\s*(?:time|action|name|info|okmsg|use|get)\s/i;
  main::GetBuffer('use',$normalized);
}
my $u=$main::g_use;
die 'R2 original GetBuffer variant index/time changed'
  unless $u->{no}==$useId&&$u->{itemno}==79&&
    $u->{time}==1800&&$u->{exptime}==1800&&
    !$u->{exp}&&!$u->{money}&&!$u->{func}&&!$u->{funcbefore};
my @consume=map{
  my @v=split(/\t/,$_,-1);
  {no=>main::GetItemNumber($v[1]),count=>0+$v[0],
    proba=>0+$v[2],message=>$v[3]}
}@{$u->{use}};
my @create=map{
  my @v=split(/\t/,$_,-1);
  {no=>main::GetItemNumber($v[1]),count=>0+$v[0],
    proba=>0+$v[2],message=>$v[3]}
}@{$u->{get}};
my $runtime={
  itemno=>79,no=>$useId,time=>$u->{time},exptime=>$u->{exptime},
  money=>0,exp=>0,needexp=>0,needjob=>'',needpoint=>0,
  needpop=>0,needevent=>'',use=>\@consume,
  result=>{create=>\@create,message=>{resultok=>$u->{okmsg}}},
};
my $gift=$input->{initialGift}//5;
my $stock=[(0)x79];
$stock->[62]=1;
$stock->[78]=$gift;
my $now=1000000;
$main::NOW_TIME=$now;
$main::MAX_STOCK_TIME=259200;
$main::LIMIT_EXP=3600;
$main::MAX_ITEM=79;
$main::USER='r2-source-gift-variants';
$main::DT={id=>1,status=>1,job=>'',rank=>5010,money=>100000,
  paytoday=>0,time=>956800,item=>$stock,exp=>{},shopname=>'原版禮卷'});
@main::DT=($main::DT);
@main::DTwholestore=(0)x79;
my $requested=$input->{requestedCount}//1;
main::UseItem($runtime,$requested);
print JSON::PP->new->canonical->utf8->encode({
  source=>'frozen original gift #79 USE DSL GetBuffer/GetItemNumber + UseItem/CheckWholeStore',
  compiled=>{itemId=>79,useId=>$useId,time=>$u->{time},
    uses=>\@consume,creates=>\@create,resultOk=>$u->{okmsg}},
  result=>{requestedCount=>0+$requested,count=>0+($runtime->{result}{count}//0),
    item=>[@{$main::DT->{item}}],
    wholesale=>[map {0+($_//0)} @main::DTwholestore],
    money=>0+$main::DT->{money,paytoday=>0+$main::DT->{paytoday},
    time=>0+$main::DT->{time},
    useitem=>$runtime->{result}{useitem}||[],
    additem=>$runtime->{result}{additem}||[],
    usemsg=>$runtime->{result}{usemsg}||[],
    addmsg=>$runtime->{result}{addmsg}||[],
  },
});
