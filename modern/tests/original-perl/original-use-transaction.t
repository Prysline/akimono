use strict;
use warnings;
use utf8;
use Test::More;

binmode STDOUT, ':encoding(UTF-8)';

# B-23: directly execute the frozen original UseItem block from the
# eligibility gates through one CheckWholeStore, with original
# GetItemUseTime/UseTime and MakeAmount. Stop BEFORE RequireFile callbacks.
# Synthetic memory-only shops and clocks; no CGI, item DSL, persistence,
# dynamic job/functionbefore checks or exp redistribution.
our ($DT,$NOW_TIME,$MAX_STOCK_TIME,$USER,$MAX_ITEM,@ITEM,@DT,@DTwholestore,%DTevent);
$NOW_TIME=1000;
$MAX_STOCK_TIME=259200;
$USER='fixture';
$MAX_ITEM=3;
sub l {return join(' ',@_);}
sub OutError {die "Original OutError: ".join(' ',@_);}
sub pinned {
  my ($name)=@_;
  open(my $fh,'<:encoding(UTF-8)',$name) or die "$name: $!";
  local $/; my $src=<$fh>; close $fh; return $src;
}
my $source=pinned('use.cgi');
my ($make)=$source=~/(^sub MakeAmount\n\{[\s\S]*?^\}\n)(?=\nsub AddItem)/m;
my $start=index($source,"\t#熟練度不足で作業不可能かどうかを判定");
my $end=index($source,"\n\t#アイテム別関数存在チェック\n",$start);
ok(defined $make,'B-23-P01 frozen MakeAmount located');
ok($start>=0&&$end>$start,'B-23-P02 frozen UseItem gate+accounting+items located');
die 'pinned source drift' unless defined($make)&&$start>=0&&$end>$start;
my $block=substr($source,$start,$end-$start);
like($block,qr/\$USE->\{result\}->\{count\}=\$count/,
  'B-23-P03 original effective count stored BEFORE spending');
like($block,qr/UseTime\(\$usetime\*\$count\)/,
  'B-23-P04 original UseTime after zero-count early return');
like($block,qr/\$DT->\{paytoday\}\+=\$USE->\{money\}\*\$count/,
  'B-23-P05 original account book updated after UseTime');
my $check_count=()=$block=~/CheckWholeStore\(\)/g;
is($check_count,1,'B-23-P06 one wholesale check AFTER all output rows');
my $compiled=eval "no strict; no warnings;\n".
  $make."\nsub isolated_transaction {\n".
  "my (\$USE,\$count)=\@_;\n".
  "my \$usetime=GetItemUseTime(\$USE);\n".
  $block."\nreturn 1;\n}\n1;\n";
die "pinned Perl compilation failed: $@" unless $compiled;
require './calc.cgi';
require './whole.cgi';
ok(defined(&GetItemUseTime)&&defined(&UseTime),
  'B-23-P07 original calc.cgi time functions loaded unchanged');
ok(defined(&isolated_transaction),'B-23-P08 exact transaction block compiled');

sub fixture {
  $NOW_TIME=1000;
  $MAX_STOCK_TIME=259200;
  $MAX_ITEM=3;
  %DTevent=(permit=>1);
  @ITEM=(undef,
    {code=>'A',limit=>10,wslimit=>8,name=>'A',scale=>'piece'},
    {code=>'B',limit=>6,wslimit=>-10,name=>'B',scale=>'piece'},
    {code=>'',limit=>5,wslimit=>1,name=>'C',scale=>'piece'},
  );
  $DT={
    item=>[8,4,3],exp=>{1=>200},job=>'worker',point=>10,
    rank=>20,money=>70,paytoday=>5,time=>950,status=>1,
  };
  @DT=($DT,{item=>[3,4,2]});
  @DTwholestore=(4,0,-5);
  return {
    itemno=>1,needexp=>100,needjob=>'worker',needpoint=>10,
    needpop=>10,needevent=>'permit',money=>20,
    time=>20,exptime=>10,
    use=>[
      {no=>1,count=>2,proba=>1000,message=>'consume A'},
      {no=>2,count=>1,proba=>0,message=>'zero-proba B'},
    ],
    result=>{
      expold=>'',create=>[
        {no=>1,count=>5,proba=>1000,message=>'produce A'},
        {no=>2,count=>4,proba=>1000,message=>'produce B'},
        {no=>1,count=>2,proba=>1000,message=>'produce A twice'},
        {no=>3,count=>2,proba=>1000,message=>'produce C'},
      ],
    },
  };
}
my $u=fixture();
is(GetItemUseTime($u),18,'B-23-P09 original experience-derived use time 18s');
isolated_transaction($u,4);
is($u->{result}{count},2,'B-23-P10 effective 4 -> money3 -> time2');
is($DT->{money},30,'B-23-P11 money charged after count settled');
is($DT->{paytoday},45,'B-23-P12 today payment accumulated');
is($DT->{time},986,'B-23-P13 UseTime adds 36s to stored time');
is_deeply($DT->{item},[10,6,5],
  'B-23-P14 all material/output changes in original order');
is_deeply($u->{result}{useitem},[[1,4]],
  'B-23-P15 zero probability material consumes nothing');
is_deeply($u->{result}{additem},[[1,6],[2,2],[1,0],[3,2]],
  'B-23-P16 duplicate output including zero addition survives');
is_deeply(\@DTwholestore,[3,0,-3],
  'B-23-P17 whole store checked once after all creations');
is_deeply($DT[1]{item},[3,4,2],
  'B-23-P18 other shop unchanged');

$u=fixture();$DT->{money}=10;@DTwholestore=(99,99,-5);
isolated_transaction($u,4);
is($u->{result}{count},0,'B-23-P19 insufficient money returns zero');
is($DT->{money},10,'B-23-P20 zero count does not charge');
is($DT->{time},950,'B-23-P21 zero count does not advance time');
is_deeply(\@DTwholestore,[99,99,-5],
  'B-23-P22 zero count does NOT call CheckWholeStore');
ok(!exists($u->{result}{additem}),
  'B-23-P23 early return does not initialize additem');

$u=fixture();$u->{needexp}=201;
isolated_transaction($u,4);
is($u->{result}{count},0,'B-23-P24 experience gate prevents mutation');
$u=fixture();$u->{needjob}='other';
isolated_transaction($u,4);
is($u->{result}{count},0,'B-23-P25 job gate prevents mutation');
$u=fixture();$u->{needpoint}=11;
isolated_transaction($u,4);
is($u->{result}{count},0,'B-23-P26 point gate prevents mutation');
$u=fixture();$u->{needpop}=21;
isolated_transaction($u,4);
is($u->{result}{count},0,'B-23-P27 popularity gate prevents mutation');
$u=fixture();delete $DTevent{permit};
isolated_transaction($u,4);
is($u->{result}{count},0,'B-23-P28 event gate prevents mutation');
$u=fixture();$DT->{item}[1]=0;
isolated_transaction($u,4);
is($u->{result}{count},0,
  'B-23-P29 zero-probability material still requires one on preflight');

$u=fixture();
$u->{use}=[
  {no=>1,count=>6,proba=>1000,message=>'first six'},
  {no=>1,count=>6,proba=>1000,message=>'second six'},
];
$u->{result}{create}=[];
isolated_transaction($u,1);
is($u->{result}{count},1,
  'B-23-P30 duplicate material entries each check ORIGINAL stock separately');
is($DT->{item}[0],-4,
  'B-23-P31 duplicate material entries can drive stock negative, unchanged');
is_deeply($u->{result}{useitem},[[1,6],[1,6]],
  'B-23-P32 duplicate material consumption retains both log rows');

$u=fixture();$NOW_TIME=1000000;$DT->{time}=700000;
isolated_transaction($u,1);
is($DT->{time},740818,
  'B-23-P33 original UseTime caps stale stored time only AFTER gate');
is($u->{result}{count},1,
  'B-23-P34 original gate still uses uncapped stale time');

$u=fixture();$DT->{status}=0;
isolated_transaction($u,1);
is($DT->{time},950,
  'B-23-P35 original inactive shop UseTime does not advance time');
is($DT->{money},50,
  'B-23-P36 original inactive shop still deducts money');

$u=fixture();$u->{result}{expold}=1000;$DT->{money}=100;
is(GetItemUseTime($u),10,
  'B-23-P37 original expold override used in GetItemUseTime');
isolated_transaction($u,4);
is($u->{result}{count},4,
  'B-23-P38 expold can allow more actions before later item checks');

$u=fixture();
$u->{use}=[{no=>1,count=>3,proba=>500,message=>'stochastic A'}];
$u->{result}{create}=[{no=>2,count=>20,proba=>500,message=>'stochastic B'}];
srand(123);
my $expected_use=MakeAmount(3,500);
my $expected_create=MakeAmount(20,500);
my $expected_next=rand();
srand(123);
isolated_transaction($u,1);
is_deeply($u->{result}{useitem},
  $expected_use?[[1,$expected_use]]:[],
  'B-23-P39 shared source RNG is consumed after eligibility and accounting');
my $retained=$expected_create>0
  ? $expected_create>2?2:$expected_create:0;
is_deeply($u->{result}{additem},
  $expected_create?[[2,$retained]]:[],
  'B-23-P40 source RNG for creation follows material draws');
is(rand(),$expected_next,
  'B-23-P41 full transaction consumes original RNG count exactly');

done_testing();
