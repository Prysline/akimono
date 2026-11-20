use strict;
use warnings;
use utf8;
use Test::More;

binmode STDOUT, ':encoding(UTF-8)';

# B-22 direct ORIGINAL Perl fragments from CI SHA-pinned Core use.cgi:
#   sequential material loop + sequential create loop, one CheckWholeStore
#   from unmodified whole.cgi at the END, not after each production.
# All stores, items, and random inputs are synthetic. No CGI, money, time,
# job/effect callbacks, game files, or real player actions.
our ($DT,$MAX_ITEM,@ITEM,@DT,@DTwholestore);
sub l {return join(' ',@_);}
sub read_pinned {
  my ($path)=@_;
  open(my $fh,'<:encoding(UTF-8)',$path) or die "$path: $!";
  local $/;my $s=<$fh>;close($fh);return $s;
}
my $src=read_pinned('use.cgi');
my ($make)=$src=~/(^sub MakeAmount\n\{[\s\S]*?^\}\n)(?=\nsub AddItem)/m;
my $start=index($src,"\t#アイテム消費\n");
my $end=index($src,"\n\t#アイテム別関数存在チェック\n",$start);
ok(defined($make),'B-22-P01 pinned original MakeAmount located');
ok($start>=0 && $end>$start,'B-22-P02 pinned all-materials/all-outputs block located');
die 'frozen UseItem fragment changed' unless defined($make)&&$start>=0&&$end>$start;
my $source_block=substr($src,$start,$end-$start);
like($source_block,qr/foreach my \$item \(\@\{\$USE->\{use\}\}\)/,
  'B-22-P03 all material uses before item creation');
like($source_block,qr/foreach my \$item \(\@\{\$USE->\{result\}->\{create\}\}\)/,
  'B-22-P04 all create actions follow all material uses');
my $checks=()=$source_block=~/CheckWholeStore\(\);/g;
is($checks,1,'B-22-P05 exactly one global market check in selected source fragment');

my $compiled=eval "no strict; no warnings;\n".
  $make."\n".
  "sub run_pinned_multi_item {\n".
  "my (\$USE,\$count)=\@_;\n".
  $source_block."\nreturn 1;\n}\n1;\n";
die "could not compile frozen UseItem blocks: $@" unless $compiled;
require './whole.cgi';
ok(defined(&run_pinned_multi_item),'B-22-P06 original combined fragment compiled');
ok(defined(&CheckWholeStore),'B-22-P07 original wholesale function loaded');

sub fixture {
  my(%o)=@_;
  $MAX_ITEM=3;
  @ITEM=(undef,
    {code=>'A',limit=>10,wslimit=>8,name=>'A',scale=>'one'},
    {code=>'B',limit=>6,wslimit=>-10,name=>'B',scale=>'one'},
    {code=>'',limit=>5,wslimit=>1,name=>'C',scale=>'one'},
  );
  $DT={item=>[8,4,3]};
  @DT=($DT,{item=>[3,4,2]});
  @DTwholestore=(4,0,-5);
  my $use={
    use=>[
      {no=>1,count=>2,proba=>1000,message=>'consume A'},
      {no=>2,count=>1,proba=>0,message=>'consume B (zero probability)'},
    ],
    result=>{
      create=>[
        {no=>1,count=>5,proba=>1000,message=>'produce A first'},
        {no=>2,count=>4,proba=>1000,message=>'produce B'},
        {no=>1,count=>2,proba=>1000,message=>'produce A again'},
        {no=>3,count=>2,proba=>1000,message=>'produce uncoded C'},
      ],
      useitem=>[],usemsg=>[],additem=>[],addmsg=>[],trashmsg=>[],
    },
  };
  return $use;
}
my $u=fixture();
run_pinned_multi_item($u,2);
is_deeply($DT->{item},[10,6,5],
  'B-22-P08 after consuming materials, all outputs capped in original order');
is_deeply($u->{result}{useitem},[[1,4]],
  'B-22-P09 zero-probability material does not get consumed');
is_deeply($u->{result}{additem},[[1,6],[2,2],[1,0],[3,2]],
  'B-22-P10 duplicate output item remains in sequential additem log including zero');
is_deeply($u->{result}{usemsg},['consume A'],
  'B-22-P11 consumption messages only for nonzero source draws');
is(scalar(@{$u->{result}{trashmsg}}),4,
  'B-22-P12 every overflowing production adds a source trash message');
is_deeply(\@DTwholestore,[3,0,-3],
  'B-22-P13 ONE global coded wholesale cap after all four outputs');
is_deeply($DT[1]{item},[3,4,2],
  'B-22-P14 other shop stock stays unchanged by use block');
is_deeply($u->{result}{addmsg},
  ['produce A first','produce B','produce A again','produce uncoded C'],
  'B-22-P15 output messages preserve the original duplicate-item order');

# The same source check, if skipped in favor of per-output market checks,
# can lead to different transitions with repeated IDs. Record its location.
my $created_pos=index($source_block,'#アイテム取得');
my $checked_pos=index($source_block,'CheckWholeStore();');
ok($created_pos>=0 && $checked_pos>$created_pos,
  'B-22-P16 source wholesale check comes after creation loop');

$u=fixture();
$u->{use}=[];
$u->{result}{create}=[];
@DTwholestore=(99,99,-5);
run_pinned_multi_item($u,1);
is_deeply(\@DTwholestore,[5,2,-5],
  'B-22-P17 even zero create actions still trigger full market correction');
is_deeply($u->{result}{additem},[],
  'B-22-P18 empty create list logs no additions');

$u=fixture();
$u->{use}=[{no=>1,count=>3,proba=>500,message=>'stochastic use A'}];
$u->{result}{create}=[{no=>2,count=>20,proba=>500,message=>'stochastic B create'}];
srand(123);
my $expected_use=MakeAmount(3,500);
my $expected_create=MakeAmount(20,500);
my $expected_next=rand();
srand(123);
run_pinned_multi_item($u,1);
is_deeply($u->{result}{useitem},
  $expected_use?[[1,$expected_use]]:[],
  'B-22-P19 source material stochastic result happens before creation');
my $expected_retained=$expected_create>0
  ? $expected_create>2 ? 2 : $expected_create : 0;
is_deeply($u->{result}{additem},
  $expected_create?[[2,$expected_retained]]:[],
  'B-22-P20 source creation draws AFTER consumption, with correct cap');
is(rand(),$expected_next,
  'B-22-P21 combined fragment consumes random draws in source order');
is($DT->{item}[0],8-$expected_use,
  'B-22-P22 stochastic material reduces the corresponding stock');
is($DT->{item}[1],4+$expected_retained,
  'B-22-P23 stochastic production respects current shop inventory');

$u=fixture();
$u->{use}=[{no=>1,count=>20,proba=>1000,message=>'consume20'}];
$u->{result}{create}=[];
run_pinned_multi_item($u,1);
is($DT->{item}[0],-12,
  'B-22-P24 original extracted use loop permits negative final stock without recheck');
is($DTwholestore[0],4,
  'B-22-P25 wholesale corrects after resulting negative shop stock, without inventory repair');

done_testing();
