use strict;
use warnings;
use utf8;
use FindBin;
use JSON::PP;
use lib $FindBin::Bin;
use OriginalGiftMapUseHarness;
use OriginalFullUseLostbookHarness;
binmode STDOUT,':raw';

# Isolated frozen original #77 GetBuffer + UseItem, and actual @@FUNCITEM
# popup Perl function. All WriteLog calls are recorded only in RAM.
our @LOGS;
sub item::WriteLog { push @main::LOGS,[@_];return 1; }
my $in=JSON::PP->new->decode($ARGV[0]//'{}');
die 'R2 original party only ITEM #77/0' unless
  ($in->{itemId}//0)==77&&($in->{useId}//-1)==0;
OriginalGiftMapUseHarness::compile();
OriginalFullUseLostbookHarness::bootstrap();
my $compiler=OriginalGiftMapUseHarness::source('inc-makeitem.cgi');
my $getLocal=OriginalFullUseLostbookHarness::section(
  $compiler,'GetLocalFunction');
my $localOk=eval "package main;use utf8;no strict;no warnings;\n".
  $getLocal."\n1;";
die "R2 frozen GetLocalFunction compile failure: $@" unless $localOk;
sub main::GetLine { return "_local_\n"; }
my $dsl=OriginalGiftMapUseHarness::original_dsl();
my $sourceFunc=OriginalFullUseLostbookHarness::section($dsl,'popup');
for my $token(
  'my $up=int($USE->{param1}*(2-$DT->{rank}/5000));',
  '$DT->{rank}+=$up;',
  '$DT->{rank}=10000 if $DT->{rank}>10000;',
  'WriteLog(0,$DT->{id},$ret);',
  'WriteLog(3,0,$DT->{shopname}." ".$USE->{param2});',
  'return $ret;',
){
  die 'R2 frozen party callback changed' unless
    index($sourceFunc,$token)>=0;
}
my $compiled=eval "package item;use utf8;no strict;no warnings;\n".
  $sourceFunc."\n1;";
die "R2 frozen party popup compile failed: $@" unless $compiled;
my @parts=split(/(?=^\@\@ITEM\b)/m,$dsl);
my @matched=grep{ /^\@\@ITEM\b/m&&/^\s*no\s+77(?:\s|$)/m }@parts;
die 'R2 original celebration ITEM drift' unless @matched==1;
my @uses=split(/^\s*\@\@USE[^\n]*(?:\n|$)/mi,$matched[0]);
die 'R2 original celebration USE drift' unless @uses==2;
$main::g_item={code=>'party',no=>77,scale=>'組'};
$main::g_use={no=>-1,exptime=>0};
main::ClearBuffer('use');
for my $raw(split(/\r?\n/,$uses[1])){
  my $line=OriginalGiftMapUseHarness::line_for_compiler($raw);
  next unless defined $line;
  next unless $raw=~/^\s*(?:time|action|price|name|info|func|param|arg|use)\s/i;
  main::GetBuffer('use',$line);
}
my $u=$main::g_use;
die 'R2 original popup signature changed' unless
  $u->{itemno}==77&&$u->{no}==0&&
  $u->{time}==7200&&
  ($u->{func}//'')eq'popup'&&
  ($u->{param1}//0)==1000&&
  ($u->{param2}//'')eq'開了派對';
my @materials=map{
  my @p=split(/\t/,$_,-1);
  {no=>main::GetItemNumber($p[1]),count=>0+$p[0],
   proba=>0+$p[2],message=>length($p[3]//'')?$p[3]:undef}
} @{$u->{use}};
die 'R2 original party material changed' unless
  @materials==1&&$materials[0]{no}==77&&
  $materials[0]{count}==1&&$materials[0]{proba}==1000;
my($stock,$wholesale)=@{$in}{qw(stock wholesale)};
die 'R2 original party needs 79-slot source arrays' unless
  ref($stock)eq'ARRAY'&&@$stock==79&&
  ref($wholesale)eq'ARRAY'&&@$wholesale==79;
for my $row(@main::out_item){$main::ITEM[$row->{no}]={%$row};}
my $exp=$in->{exp}||{};
$main::NOW_TIME=$in->{nowSeconds}//1000000;
$main::MAX_STOCK_TIME=259200;
$main::LIMIT_EXP=3600;
$main::MAX_ITEM=79;
$main::USER='r2-party-oracle';
$main::DT={
  id=>1,status=>1,job=>'',point=>0,rank=>$in->{rank}//5010,
  money=>$in->{money}//100000,paytoday=>0,
  time=>$in->{time}//956800,exp=>{%$exp},
  item=>[@$stock],shopname=>'慶祝來源驗證店',
};
@main::DT=($main::DT);
@main::DTwholestore=@$wholesale;
@LOGS=();
my $runtime={
  itemno=>77,no=>0,time=>0+$u->{time},
  exptime=>0+($u->{exptime}//0),
  money=>0,exp=>0,needexp=>0,needjob=>'',needpoint=>0,
  needpop=>0,needevent=>'',param1=>0+$u->{param1},
  param2=>$u->{param2},use=>\@materials,
  result=>{create=>[],function=>'popup'},
  arg=>{targetidx=>0},
};
main::UseItem($runtime,1);
my $result=$runtime->{result};
print JSON::PP->new->canonical->utf8->encode({
  compiled=>{time=>0+$u->{time},exptime=>0+($u->{exptime}//0),
    param1=>0+$u->{param1},param2=>$u->{param2},
    use=>\@materials},
  result=>{
    count=>0+($result->{count}//0),
    stock=>[@{$main::DT->{item}}],rank=>0+$main::DT->{rank},
    wholesale=>[map {0+($_//0)} @main::DTwholestore],
    exp=>{%{$main::DT->{exp}}},money=>0+$main::DT->{money},
    paytoday=>0+$main::DT->{paytoday},
    time=>0+$main::DT->{time},
    useitem=>$result->{useitem}||[],
    usemsg=>$result->{usemsg}||[],
    additem=>$result->{additem}||[],
    addmsg=>$result->{addmsg}||[],
    functionReturn=>$result->{function_return},logs=>\@LOGS,
  },
});
