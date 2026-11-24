use strict;
use warnings;
use utf8;
use FindBin;
use JSON::PP;
use lib $FindBin::Bin;
use OriginalGiftMapUseHarness;
use OriginalFullUseLostbookHarness;
binmode STDOUT,':raw';

# Run actual frozen source GetBuffer/UseItem/UseTime/CheckWholeStore and
# the actual inline Perl callback body, isolated in RAM. No CGI, disk or
# game files are written, and only #25/0-1 and #26/0 are executable.
our (@R2_DAIRY_DRAWS,@R2_DAIRY_RANGES,$R2_DAIRY_USED,@LOGS);
BEGIN {
  no warnings 'redefine';
  *CORE::GLOBAL::rand=sub (;$) {
    die 'R2 dairy Perl: missing draw' unless @main::R2_DAIRY_DRAWS;
    my $million=shift @main::R2_DAIRY_DRAWS;
    die 'R2 dairy Perl: draw range' if $million<0||$million>=1000000;
    my $range=$_[0]//1;
    push @main::R2_DAIRY_RANGES,$range;
    $main::R2_DAIRY_USED++;
    return $range*$million/1000000;
  };
}
sub item::WriteLog { push @main::LOGS,[@_]; return 1; }
my $in=JSON::PP->new->decode($ARGV[0]//'{}');
my($id,$useId)=@{$in}{qw(itemId useId)};
die 'R2 dairy only #25/0-1 #26/0' unless
  defined($id)&&($id==25||$id==26)&&defined($useId)&&
  $useId=~/^\d+$/&&$useId<($id==25?2:1);
OriginalGiftMapUseHarness::compile();
OriginalFullUseLostbookHarness::bootstrap();
my $compiler=OriginalGiftMapUseHarness::source('inc-makeitem.cgi');
my $getLocal=OriginalFullUseLostbookHarness::section(
  $compiler,'GetLocalFunction');
my $getLocalOk=eval "package main;use utf8;no strict;no warnings;\n".
  $getLocal."\n1;";
die "R2 dairy frozen GetLocalFunction compile error: $@" unless $getLocalOk;
sub main::GetLine { return "_local_\n"; }
my $dsl=OriginalGiftMapUseHarness::original_dsl();
my @chunks=split(/(?=^\@\@ITEM\b)/m,$dsl);
my @matches=grep{
  /^\@\@ITEM\b/m && /^\s*no\s+\Q$id\E(?:\s|$)/m
} @chunks;
die 'R2 dairy source ITEM drift' unless @matches==1;
my @parts=split(/^\s*\@\@USE[^\n]*(?:\n|$)/mi,$matches[0]);
die 'R2 dairy original USE count changed' unless
  @parts==($id==25?3:4);
my($code)=$parts[0]=~/^\s*code\s+(\S+)/m;
die 'R2 dairy ITEM code changed' unless
  $code eq ($id==25?'mino':'mino_milk');
my($body)=$parts[1]=~
  /^\s*func\s+_local_\s*\n([\s\S]*?)^\s*_local_\s*$/m;
die 'R2 dairy missing frozen original callback body' unless defined $body;
my @required=$id==25?(
  'my $val=$USE->{param1}*$count;',
  '$val*=$DT->{item}[25-1];',
  '$val=int(rand($val))+1;',
  "AddItem(26,\$val,'精製了米諾牛奶');",
  '$usecount++ if rand(1000)<$useproba;',
  'UseItem(25,$usecount',
):(
  'my $val=$count;',
  'if($count>=30)',
  '$DT->{rank}-=$count*2;',
  'elsif($count>=10)',
  '$DT->{rank}+=int(rand($count+1))+$count;',
);
for(@required){
  die "R2 dairy original inline expression changed $_"
    unless index($body,$_)>=0;
}
my $wrapper="package item; use utf8; no strict; no warnings;\n".
  "sub r2_dairy_original {eval(<<'_eval_code_');\n".
  $body."\n_eval_code_\n}\n1;";
my $inlineOk=eval $wrapper;
die "R2 dairy original inline compilation failed: $@" unless $inlineOk;
$main::g_item={code=>$code,no=>$id,scale=>'個'};
$main::g_use={no=>-1,exptime=>0};
for my $i(0..$useId){
  main::ClearBuffer('use');
  for my $raw(split(/\r?\n/,$parts[$i+1])){
    my $line=OriginalGiftMapUseHarness::line_for_compiler($raw);
    next unless defined $line;
    next unless $raw=~/^\s*(?:time|exptime|exp|price|name|info|scale|action|okmsg|ngmsg|needexp|job|use|need|get|func|param)\s/i;
    main::GetBuffer('use',$line);
  }
}
my $u=$main::g_use;
die 'R2 dairy compiled USE drift' unless
  $u->{itemno}==$id&&$u->{no}==$useId&&
  $u->{time}==($id==25?3600:90)&&
  $u->{exp}==($id==25?10:0)&&
  ($u->{param1}//0)==($id==25?$useId+1:0);
my @uses=map{
  my @x=split(/\t/,$_,-1);
  {no=>main::GetItemNumber($x[1]),count=>0+$x[0],
   proba=>0+$x[2],message=>length($x[3]//'')?$x[3]:undef}
} @{$u->{use}};
die 'R2 dairy compiled NEED/USE changed' unless
  @uses==1 && $uses[0]{no}==$id&&$uses[0]{count}==1&&
  $uses[0]{proba}==($id==25?0:1000);
die 'R2 dairy dynamic callback has static GET' if @{$u->{get}};
for my $src(@main::out_item){
  $main::ITEM[$src->{no}]={%$src};
}
my ($stock,$whole)=@{$in}{qw(stock wholesale)};
die 'R2 dairy 79-slot input world required' unless
  ref($stock)eq'ARRAY'&&@$stock==79&&
  ref($whole)eq'ARRAY'&&@$whole==79;
my $exp=$in->{exp}||{};
die 'R2 dairy malformed EXP' unless ref($exp)eq'HASH';
$main::NOW_TIME=$in->{nowSeconds}//1000000;
$main::MAX_STOCK_TIME=259200;
$main::LIMIT_EXP=3600;
$main::MAX_ITEM=79;
$main::USER='r2-dairy-oracle';
$main::DT={
  id=>1,status=>1,job=>$in->{job}//'',point=>0,
  rank=>$in->{rank}//5010,money=>$in->{money}//100000,
  paytoday=>$in->{paytoday}//0,time=>$in->{time}//956800,
  exp=>{%$exp},item=>[@$stock],
  shopname=>'乳製品來源店',
};
@main::DT=($main::DT);
@main::DTwholestore=@$whole;
@main::LOGS=();
my $runtime={
  itemno=>$id,no=>$useId,time=>0+$u->{time},
  exptime=>0+($u->{exptime}//0),
  money=>0+($u->{money}//0),exp=>0+($u->{exp}//0),
  param1=>0+($u->{param1}//0),
  needexp=>0,needjob=>'',needpoint=>0,needpop=>0,needevent=>'',
  use=>\@uses,result=>{create=>[],function=>'r2_dairy_original'},
  arg=>{targetidx=>0},
};
if(($main::DT->{job}//'')eq'cow' && @{$u->{job}||[]}){
  my($job,$formula)=split(/\t/,$u->{job}[0]);
  die 'R2 dairy job formula changed'
    unless $job eq '酪農家'&&$formula eq 'times/job_cow_time_rate';
  $runtime->{time}=int($runtime->{time}/1.5);
  $runtime->{exptime}=int($runtime->{exptime}/1.5);
}
@main::R2_DAIRY_DRAWS=@{$in->{randomDraws}||[]};
@main::R2_DAIRY_RANGES=();
$main::R2_DAIRY_USED=0;
main::UseItem($runtime,$in->{requestedCount}//1);
die 'R2 dairy unused random samples' if @main::R2_DAIRY_DRAWS;
my $result=$runtime->{result};
print JSON::PP->new->canonical->utf8->encode({
  compiled=>{time=>0+$u->{time},exptime=>0+($u->{exptime}//0),
    exp=>0+($u->{exp}//0),money=>0+($u->{money}//0),
    param=>0+($u->{param1}//0),uses=>\@uses},
  result=>{
    count=>0+($result->{count}//0),
    stock=>[@{$main::DT->{item}}],
    wholesale=>[map{0+($_//0)}@main::DTwholestore],
    exp=>{%{$main::DT->{exp}}},rank=>0+$main::DT->{rank},
    money=>0+$main::DT->{money},
    paytoday=>0+$main::DT->{paytoday},time=>0+$main::DT->{time},
    useitem=>$result->{useitem}||[],usemsg=>$result->{usemsg}||[],
    additem=>$result->{additem}||[],addmsg=>$result->{addmsg}||[],
    functionReturn=>$result->{function_return},
    logs=>\@main::LOGS,drawsUsed=>$main::R2_DAIRY_USED,
    randomRanges=>\@main::R2_DAIRY_RANGES,
  },
});
