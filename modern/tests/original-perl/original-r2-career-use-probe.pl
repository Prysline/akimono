use strict;
use warnings;
use utf8;
use FindBin;
use JSON::PP;
use lib $FindBin::Bin;
use OriginalGiftMapUseHarness;
use OriginalFullUseLostbookHarness;
binmode STDOUT,':raw';

# In-memory true frozen source GetBuffer, original UseItem and exact #78
# inline callback. No disk/CGI/game world is read or changed.
our @LOGS;
sub item::WriteLog { push @main::LOGS,[@_]; return 1; }

my $in=JSON::PP->new->decode($ARGV[0]//'{}');
my $useId=$in->{useId};
die 'R2 career oracle accepts only #78/0..13' unless
  defined($in->{itemId})&&$in->{itemId}==78&&
  defined($useId)&&$useId=~/^\d+$/&&$useId<14;
OriginalGiftMapUseHarness::compile();
OriginalFullUseLostbookHarness::bootstrap();
my $compiler=OriginalGiftMapUseHarness::source('inc-makeitem.cgi');
my $getLocal=OriginalFullUseLostbookHarness::section(
  $compiler,'GetLocalFunction');
my $getLocalOk=eval "package main;use utf8;no strict;no warnings;\n".
  $getLocal."\n1;";
die "R2 career GetLocalFunction failed: $@" unless $getLocalOk;
sub main::GetLine { return "_local_\n"; }

my $dsl=OriginalGiftMapUseHarness::original_dsl();
my @chunks=split(/(?=^\@\@ITEM\b)/m,$dsl);
my @matched=grep{
  /^\@\@ITEM\b/m&&/^\s*no\s+78(?:\s|$)/m
} @chunks;
die 'R2 career source ITEM count drift' unless @matched==1;
my @parts=split(/^\s*\@\@USE[^\n]*(?:\n|$)/mi,$matched[0]);
die 'R2 career source USE count drift' unless @parts==15;
die 'R2 career ITEM code drift' unless
  $parts[0]=~/^\s*code\s+port-exp(?:\s|$)/m;
my($body)=$parts[1]=~
  /^\s*func\s+_local_\s*\n([\s\S]*?)^\s*_local_\s*$/m;
die 'R2 career missing source inline body' unless defined $body;
for my $required(
  'my $exp1=$DT->{exp}{$USE->{param1}};',
  'next if !$exp || $exps==$exp1;',
  'delete($DT->{exp}{$exps});',
  '$exp2=int($exp2*$USE->{param3});',
  '$DT->{exp}{$USE->{param1}}=$exp1;',
  '$DT->{job}=$USE->{param4}',
  "return \$ret;"
){
  die 'R2 career original inline body drift' unless
    index($body,$required)>=0;
}
my $wrapper="package item;use utf8;no strict;no warnings;\n".
  "sub r2_original_career {eval(<<'_eval_code_');\n".
  $body."\n_eval_code_\n}\n1;";
my $inlineOk=eval $wrapper;
die "R2 career original Perl callback compilation failed: $@"
  unless $inlineOk;
$main::g_item={code=>'port-exp',no=>78,scale=>'組'};
$main::g_use={no=>-1,exptime=>0};
for my $i(0..$useId){
  main::ClearBuffer('use');
  for my $raw(split(/\r?\n/,$parts[$i+1])){
    my $line=OriginalGiftMapUseHarness::line_for_compiler($raw);
    next unless defined $line;
    next unless $raw=~/^\s*(?:time|action|arg|name|info|okmsg|param|use|func)\s/i;
    main::GetBuffer('use',$line);
  }
}
my $u=$main::g_use;
die 'R2 career compiled owner/clock drift' unless
  $u->{itemno}==78&&$u->{no}==$useId&&
  $u->{time}==10800&&$u->{exp}==0&&
  ($u->{func}//'')eq '_local_1';
my @ingredients=map {
  my @p=split(/\t/,$_,-1);
  {no=>main::GetItemNumber($p[1]),
   count=>0+$p[0],proba=>0+$p[2]}
} @{$u->{use}};
die 'R2 career original material drift' unless
  @ingredients==1&&$ingredients[0]{no}==78&&
  $ingredients[0]{count}==1&&
  $ingredients[0]{proba}==1000;
die 'R2 career unexpected static get' if @{$u->{get}};
my ($stock,$whole)=@{$in}{qw(stock wholesale)};
die 'R2 career requires true 79-slot fixture' unless
  ref($stock)eq'ARRAY'&&@$stock==79&&
  ref($whole)eq'ARRAY'&&@$whole==79;
my $exp=$in->{exp}||{};
die 'R2 career EXP must be map' unless ref($exp)eq'HASH';
for my $source(@main::out_item){
  $main::ITEM[$source->{no}]={%$source};
}
%main::JOBTYPE=();
for my $raw(split(/\r?\n/,$dsl)){
  last if $raw=~/^\s*\@\@ITEM\b/;
  if($raw=~/^\s*job\s+([a-z]+)\s+(\S+)/){
    $main::JOBTYPE{$1}=$2;
  }
}
die 'R2 career original job catalog incomplete'
  unless scalar(keys %main::JOBTYPE)==8;
$main::NOW_TIME=$in->{nowSeconds}//1000000;
$main::MAX_STOCK_TIME=259200;
$main::LIMIT_EXP=3600;
$main::MAX_ITEM=79;
$main::USER='r2-career-oracle';
$main::DT={
  id=>1,status=>1,job=>$in->{job}//'',point=>0,rank=>5010,
  money=>$in->{money}//100000,
  paytoday=>$in->{paytoday}//0,time=>$in->{time}//956800,
  exp=>{%$exp},item=>[@$stock],
  shopname=>'轉職來源驗證店',
};
@main::DT=($main::DT);
@main::DTwholestore=@$whole;
@LOGS=();
my $runtime={
  itemno=>78,no=>$useId,time=>0+$u->{time},
  exptime=>0+($u->{exptime}//0),money=>0,exp=>0,
  needexp=>0,needjob=>'',needpoint=>0,needpop=>0,needevent=>'',
  param1=>0+($u->{param1}//0),
  param2=>$u->{param2}//'',param3=>0+($u->{param3}//0),
  param4=>$u->{param4}//'',
  use=>\@ingredients,
  result=>{create=>[],function=>'r2_original_career'},
  arg=>{targetidx=>0},
};
main::UseItem($runtime,$in->{requestedCount}//1);
my $result=$runtime->{result};
print JSON::PP->new->canonical->utf8->encode({
  compiled=>{time=>0+$u->{time},
    exptime=>0+($u->{exptime}//0),
    param1=>0+($u->{param1}//0),param2=>$u->{param2}//'',
    param3=>0+($u->{param3}//0),param4=>$u->{param4}//'',
    use=>\@ingredients},
  result=>{
    count=>0+($result->{count}//0),stock=>[@{$main::DT->{item}}],
    wholesale=>[map{0+($_//0)}@main::DTwholestore],
    exp=>{%{$main::DT->{exp}}},job=>$main::DT->{job},
    money=>0+$main::DT->{money},
    paytoday=>0+$main::DT->{paytoday},
    time=>0+$main::DT->{time},
    useitem=>$result->{useitem}||[],
    usemsg=>$result->{usemsg}||[],
    additem=>$result->{additem}||[],
    addmsg=>$result->{addmsg}||[],
    functionReturn=>$result->{function_return},logs=>\@LOGS,
  },
});
