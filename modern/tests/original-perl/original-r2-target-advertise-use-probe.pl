use strict;
use warnings;
use utf8;
use FindBin;
use JSON::PP;
use lib $FindBin::Bin;
use OriginalGiftMapUseHarness;
use OriginalFullUseLostbookHarness;
binmode STDOUT,':raw';

# Frozen Perl GetBuffer, Core UseItem/CheckWholeStore and exact source #62/1
# inline callback. Isolated in memory, no live game files or external CGI.
our (@R2_ADV_DRAWS,@R2_ADV_RANGES,@LOGS,$R2_ADV_USED);
BEGIN {
  no warnings 'redefine';
  *CORE::GLOBAL::rand=sub (;$){
    die 'R2 source target advertising missing random sample'
      unless @main::R2_ADV_DRAWS;
    my $sample=shift @main::R2_ADV_DRAWS;
    die 'R2 source target advertising invalid random sample'
      unless $sample>=0&&$sample<1000000;
    my $range=$_[0]//1;
    push @main::R2_ADV_RANGES,$range;
    $main::R2_ADV_USED++;
    return $range*$sample/1000000;
  };
}
sub item::WriteLog { push @main::LOGS,[@_];return 1; }
my $in=JSON::PP->new->decode($ARGV[0]//'{}');
die 'R2 original target advertising only #62/1' unless
  ($in->{itemId}//0)==62&&defined($in->{useId})&&
  $in->{useId}==1;
OriginalGiftMapUseHarness::compile();
OriginalFullUseLostbookHarness::bootstrap();
my $compiler=OriginalGiftMapUseHarness::source('inc-makeitem.cgi');
my $getLocal=OriginalFullUseLostbookHarness::section(
  $compiler,'GetLocalFunction');
my $getLocalOk=eval "package main;use utf8;no strict;no warnings;\n".
  $getLocal."\n1;";
die "R2 target advertising GetLocalFunction compilation failed: $@"
  unless $getLocalOk;
sub main::GetLine { return "_local_\n"; }
my $dsl=OriginalGiftMapUseHarness::original_dsl();
my @parts=split(/(?=^\@\@ITEM\b)/m,$dsl);
my @matched=grep{
  /^\@\@ITEM\b/m&&/^\s*no\s+62(?:\s|$)/m
} @parts;
die 'R2 original #62 source owner drift' unless @matched==1;
my @uses=split(/^\s*\@\@USE[^\n]*(?:\n|$)/mi,$matched[0]);
die 'R2 original #62 USE count drift' unless @uses==4;
die 'R2 original #62 code drift' unless
  $uses[0]=~/^\s*code\s+cm(?:\s|$)/m;
my($body)=$uses[2]=~
  /^\s*func\s+_local_\s*\n([\s\S]*?)^\s*_local_\s*$/m;
die 'R2 original target advertising inline absent' unless defined $body;
for my $token(
  "return '沒辦法指定自己的商店' if (\$DT==\$DTS);",
  'my $up=int(500*(2-$DTS->{rank}/5000));',
  '$DTS->{rank}+=$up;',
  '$DTS->{rank}=10000 if $DTS->{rank}>10000;',
  'WriteLog(0,$DT->{id},$ret);',
  'WriteLog(3,0,$DT->{shopname}."對".$DTS->{shopname}."進行了廣告宣傳。");',
  'return $ret;',
){
  die 'R2 original target advertising inline drift' unless
    index($body,$token)>=0;
}
my $wrapped="package item;use utf8;no strict;no warnings;\n".
  "sub r2_original_target_advertising {eval(<<'_eval_code_');\n".
  $body."\n_eval_code_\n}\n1;";
my $inline=eval $wrapped;
die "R2 target advertising Perl body compilation failed: $@" unless $inline;
$main::g_item={code=>'cm',no=>62,scale=>'包'};
$main::g_use={no=>0,exptime=>0};
main::ClearBuffer('use');
for my $raw(split(/\r?\n/,$uses[2])){
  my $line=OriginalGiftMapUseHarness::line_for_compiler($raw);
  next unless defined $line;
  next unless $raw=~/^\s*(?:time|exp|exptime|job|scale|action|name|info|arg|use|func)\s/i;
  main::GetBuffer('use',$line);
}
my $u=$main::g_use;
die 'R2 target advertising original compiled fields drift' unless
  $u->{itemno}==62&&$u->{no}==1&&
  $u->{time}==18000&&$u->{exp}==0&&
  ($u->{func}//'')eq'_local_2';
my @materials=map{
  my @p=split(/\t/,$_,-1);
  {no=>main::GetItemNumber($p[1]),count=>0+$p[0],
   proba=>0+$p[2],
   message=>length($p[3]//'')?$p[3]:undef}
} @{$u->{use}};
die 'R2 target advertising material source drift' unless
  @materials==1&&$materials[0]{no}==62&&
  $materials[0]{count}==1&&$materials[0]{proba}==1000;
my($stock,$wholesale)=@{$in}{qw(stock wholesale)};
die 'R2 source target advertising needs 79-slot world' unless
  ref($stock)eq'ARRAY'&&@$stock==79&&
  ref($wholesale)eq'ARRAY'&&@$wholesale==79;
for my $src(@main::out_item){$main::ITEM[$src->{no}]={%$src};}
$main::NOW_TIME=$in->{nowSeconds}//1000000;
$main::MAX_STOCK_TIME=259200;
$main::LIMIT_EXP=3600;
$main::MAX_ITEM=79;
$main::USER='r2-target-advertising-oracle';
my $exp=$in->{exp}||{};
$main::DT={
  id=>1,status=>1,job=>$in->{job}//'',point=>0,
  rank=>$in->{rank}//5010,money=>$in->{money}//100000,
  paytoday=>$in->{paytoday}//0,time=>$in->{time}//956800,
  exp=>{%$exp},item=>[@$stock],
  shopname=>'自家廣告來源店',
};
my $target={
  id=>2,status=>1,job=>'',point=>0,
  rank=>defined($in->{targetRank})?$in->{targetRank}:5010,
  money=>100000,paytoday=>0,time=>$in->{time}//956800,
  exp=>{},item=>[@{$in->{targetStock}||$stock}],shopname=>'目標廣告來源店',
};
@main::DT=($main::DT,$target);
@main::DTwholestore=@$wholesale;
@LOGS=();
my $runtime={
  itemno=>62,no=>0,time=>0+$u->{time},
  exptime=>0+($u->{exptime}//0),money=>0,exp=>0+$u->{exp},
  needexp=>0,needjob=>'',needpoint=>0,needpop=>0,needevent=>'',
  use=>\@materials,
  result=>{create=>[],function=>'r2_original_target_advertising'},
  arg=>{targetidx=>1},
};
if(0&&($main::DT->{job}//'')eq'peddle'){
  my($job,$formula)=split(/\t/,$u->{job}[0]);
  die 'R2 source peddler time formula drift' unless
    $job eq'行腳商人'&&$formula eq'times/job_peddle_time_rate';
  $runtime->{time}=int($runtime->{time}/1.5);
  $runtime->{exptime}=int($runtime->{exptime}/1.5);
}
@R2_ADV_DRAWS=@{$in->{randomDraws}||[]};
@R2_ADV_RANGES=();
$R2_ADV_USED=0;
main::UseItem($runtime,$in->{requestedCount}//1);
die 'R2 target advertising unused random samples' if @R2_ADV_DRAWS;
my $result=$runtime->{result};
print JSON::PP->new->canonical->utf8->encode({
  compiled=>{time=>0+$u->{time},
    exptime=>0+($u->{exptime}//0),exp=>0+$u->{exp},
    use=>\@materials},
  result=>{
    count=>0+($result->{count}//0),
    targetRank=>0+$target->{rank},
    targetStock=>[@{$target->{item}}],
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
    functionReturn=>$result->{function_return},
    logs=>\@LOGS,drawsUsed=>$R2_ADV_USED,
    randomRanges=>\@R2_ADV_RANGES,
  },
});
