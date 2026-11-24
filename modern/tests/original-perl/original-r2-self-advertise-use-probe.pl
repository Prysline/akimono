use strict;
use warnings;
use utf8;
use FindBin;
use JSON::PP;
use lib $FindBin::Bin;
use OriginalGiftMapUseHarness;
use OriginalFullUseLostbookHarness;
binmode STDOUT,':raw';

# Frozen Perl GetBuffer, Core UseItem/CheckWholeStore and exact source #62/0
# inline callback. Isolated in memory, no live game files or external CGI.
our (@R2_ADV_DRAWS,@R2_ADV_RANGES,@LOGS,$R2_ADV_USED);
BEGIN {
  no warnings 'redefine';
  *CORE::GLOBAL::rand=sub (;$){
    die 'R2 source advertising missing random sample'
      unless @main::R2_ADV_DRAWS;
    my $sample=shift @main::R2_ADV_DRAWS;
    die 'R2 source advertising invalid random sample'
      unless $sample>=0&&$sample<1000000;
    my $range=$_[0]//1;
    push @main::R2_ADV_RANGES,$range;
    $main::R2_ADV_USED++;
    return $range*$sample/1000000;
  };
}
sub item::WriteLog { push @main::LOGS,[@_];return 1; }
my $in=JSON::PP->new->decode($ARGV[0]//'{}');
die 'R2 original advertising only #62/0' unless
  ($in->{itemId}//0)==62&&defined($in->{useId})&&
  $in->{useId}==0;
OriginalGiftMapUseHarness::compile();
OriginalFullUseLostbookHarness::bootstrap();
my $compiler=OriginalGiftMapUseHarness::source('inc-makeitem.cgi');
my $getLocal=OriginalFullUseLostbookHarness::section(
  $compiler,'GetLocalFunction');
my $getLocalOk=eval "package main;use utf8;no strict;no warnings;\n".
  $getLocal."\n1;";
die "R2 advertising GetLocalFunction compilation failed: $@"
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
my($body)=$uses[1]=~
  /^\s*func\s+_local_\s*\n([\s\S]*?)^\s*_local_\s*$/m;
die 'R2 original advertising inline absent' unless defined $body;
for my $token(
  'my $up=int(500*(2-$DT->{rank}/5000));',
  'if ( rand(1000)<250 ) {',
  '$DT->{rank}=1000 if $DT->{rank}<1000;',
  '$DT->{rank}=10000 if $DT->{rank}>10000;',
  'WriteLog(0,$DT->{id},$ret);',
  'return $ret;',
){
  die 'R2 original advertising inline drift' unless
    index($body,$token)>=0;
}
my $wrapped="package item;use utf8;no strict;no warnings;\n".
  "sub r2_original_self_advertising {eval(<<'_eval_code_');\n".
  $body."\n_eval_code_\n}\n1;";
my $inline=eval $wrapped;
die "R2 advertising Perl body compilation failed: $@" unless $inline;
$main::g_item={code=>'cm',no=>62,scale=>'包'};
$main::g_use={no=>-1,exptime=>0};
main::ClearBuffer('use');
for my $raw(split(/\r?\n/,$uses[1])){
  my $line=OriginalGiftMapUseHarness::line_for_compiler($raw);
  next unless defined $line;
  next unless $raw=~/^\s*(?:time|exp|exptime|job|scale|action|name|info|arg|use|func)\s/i;
  main::GetBuffer('use',$line);
}
my $u=$main::g_use;
die 'R2 advertising original compiled fields drift' unless
  $u->{itemno}==62&&$u->{no}==0&&
  $u->{time}==18000&&$u->{exp}==100&&
  ($u->{func}//'')eq'_local_1';
my @materials=map{
  my @p=split(/\t/,$_,-1);
  {no=>main::GetItemNumber($p[1]),count=>0+$p[0],
   proba=>0+$p[2],
   message=>length($p[3]//'')?$p[3]:undef}
} @{$u->{use}};
die 'R2 advertising material source drift' unless
  @materials==1&&$materials[0]{no}==62&&
  $materials[0]{count}==1&&$materials[0]{proba}==1000;
my($stock,$wholesale)=@{$in}{qw(stock wholesale)};
die 'R2 source advertising needs 79-slot world' unless
  ref($stock)eq'ARRAY'&&@$stock==79&&
  ref($wholesale)eq'ARRAY'&&@$wholesale==79;
for my $src(@main::out_item){$main::ITEM[$src->{no}]={%$src};}
$main::NOW_TIME=$in->{nowSeconds}//1000000;
$main::MAX_STOCK_TIME=259200;
$main::LIMIT_EXP=3600;
$main::MAX_ITEM=79;
$main::USER='r2-self-advertising-oracle';
my $exp=$in->{exp}||{};
$main::DT={
  id=>1,status=>1,job=>$in->{job}//'',point=>0,
  rank=>$in->{rank}//5010,money=>$in->{money}//100000,
  paytoday=>$in->{paytoday}//0,time=>$in->{time}//956800,
  exp=>{%$exp},item=>[@$stock],
  shopname=>'自家廣告來源店',
};
@main::DT=($main::DT);
@main::DTwholestore=@$wholesale;
@LOGS=();
my $runtime={
  itemno=>62,no=>0,time=>0+$u->{time},
  exptime=>0+($u->{exptime}//0),money=>0,exp=>0+$u->{exp},
  needexp=>0,needjob=>'',needpoint=>0,needpop=>0,needevent=>'',
  use=>\@materials,
  result=>{create=>[],function=>'r2_original_self_advertising'},
  arg=>{targetidx=>0},
};
if(($main::DT->{job}//'')eq'peddle'){
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
die 'R2 advertising unused random samples' if @R2_ADV_DRAWS;
my $result=$runtime->{result};
print JSON::PP->new->canonical->utf8->encode({
  compiled=>{time=>0+$u->{time},
    exptime=>0+($u->{exptime}//0),exp=>0+$u->{exp},
    use=>\@materials},
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
    functionReturn=>$result->{function_return},
    logs=>\@LOGS,drawsUsed=>$R2_ADV_USED,
    randomRanges=>\@R2_ADV_RANGES,
  },
});
