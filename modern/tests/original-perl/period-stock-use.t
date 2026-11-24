use strict;
use warnings;
use utf8;
use Test::More;

binmode STDOUT, ':encoding(UTF-8)';

# B-20: run EXACT code fragments extracted from existing CI-pinned Core
# inc-period.cgi and plug/use.cgi, never their top-level/live game hooks.
# All shop/item/use data are synthetic Perl arrays. No filesystem I/O after
# opening the fixed test snapshots. No random event/job/item callbacks.
our ($MAX_ITEM,@ITEM,$DT,$NOW_TIME,%DTevent);
$MAX_ITEM=3;
@ITEM=(undef,{limit=>10},{limit=>20},{limit=>2});
$NOW_TIME=1000;
%DTevent=(permit=>1);

sub GetItemUseTime { return $_[0]{syntheticUseTime}; }
sub load_source {
  my $name=shift;
  open(my $fh,'<:encoding(UTF-8)',$name) or die "Pinned $name: $!";
  local $/;
  my $source=<$fh>;
  close($fh);
  return $source;
}
my $period=load_source('period.cgi');
my $use=load_source('use.cgi');
my $stockStart=index($period,"\t\t#所持数オーバーチェック＆不正値修正\n");
my $stockEnd=index($period,"\n\t\t#維持費徴収処理",$stockStart);
ok($stockStart>=0 && $stockEnd>$stockStart,
  'B-20-A: located unmodified Core period inventory correction block');
die 'missing period fragment' unless $stockStart>=0 && $stockEnd>$stockStart;
my $stockBody=substr($period,$stockStart,$stockEnd-$stockStart);
like($stockBody,qr/\$DT->\{item\}\[\$cnt-1\]>\$ITEM\[\$cnt\]->\{limit\}/,
  'B-20-B: source only caps stock when it exceeds item limit');
like($stockBody,qr/int\(\$DT->\{item\}\[\$cnt-1\]\)/,
  'B-20-C: source truncates stock using Perl int');

my $gateStart=index($use,"\t#熟練度不足で作業不可能かどうかを判定");
my $gateEnd=index($use,"\n\t#結果用変数初期化",$gateStart);
ok($gateStart>=0 && $gateEnd>$gateStart,
  'B-20-D: located frozen UseItem gate through count assignment');
die 'missing count gate' unless $gateStart>=0 && $gateEnd>$gateStart;
my $gate=substr($use,$gateStart,$gateEnd-$gateStart);
like($gate,qr/\$item->\{proba\}==0 \? 1 : \$count/,
  'B-20-E: source material precheck uses one requirement if probability 0');
like($gate,qr/\$USE->\{result\}->\{count\}=\$count/,
  'B-20-F: source records effective use count before resource mutation');
like($gate,qr/\$DT->\{money\}\/\$USE->\{money\}/,
  'B-20-G: source floors count from available money');
like($gate,qr/\(\$NOW_TIME-\$DT->\{time\}\)\/\$usetime/,
  'B-20-H: source floors count from available time');
my $checkStart=index($use,"\tforeach my \$item (\@{\$USE->{use}})\n");
my $checkEnd=index($use,"\n\treturn 1;",$checkStart);
ok($checkStart>=0 && $checkEnd>$checkStart,
  'B-20-I: located original CheckUseItem material-only loop');
die 'missing material check' unless $checkStart>=0 && $checkEnd>$checkStart;
my $check=substr($use,$checkStart,$checkEnd-$checkStart);
my ($make)=$use=~/(^sub MakeAmount\n\{[\s\S]*?^\}\n)(?=\nsub AddItem)/m;
ok(defined($make),'B-20-J: located entire unmodified MakeAmount subroutine');
die 'missing original MakeAmount' unless defined $make;
like($make,qr/\$cnt < 20/,'B-20-K: source has small-count branch under 20');
like($make,qr/return 0 if \(\$p <= 0\)/,
  'B-20-L: source returns zero if probability <= 0');

# Only source text from fixed SHA-pinned files is compiled, with synthetic
# function parameter/environment stubs. This is not arbitrary user eval.
my $compiled=eval "no strict; no warnings;\n".
  "sub isolated_period_stock { my (\$DT)=\@_;\n$stockBody\n return 1; }\n".
  "sub isolated_use_gate { my (\$USE,\$count)=\@_;".
    "my \$usetime=GetItemUseTime(\$USE);\n$gate\n return \$count; }\n".
  "sub isolated_check_material { my (\$USE)=\@_;\n$check\nreturn 1; }\n".
  $make."\n1;\n";
die "Failed compiling pinned fragments: $@" unless $compiled;
ok(defined(&isolated_period_stock),'B-20-M: original stock fragment compiled');
ok(defined(&isolated_use_gate),'B-20-N: original UseItem gate compiled');
ok(defined(&MakeAmount),'B-20-O: original complete MakeAmount compiled');

my $inventory={item=>[10.9,7.8,2.9]};
isolated_period_stock($inventory);
is_deeply($inventory->{item},[10,7,2],
  'B-20-P: original caps oversized stock and truncates fractional values');

my $negative={item=>[-1.9,0,0]};
isolated_period_stock($negative);
is($negative->{item}[0],-1,
  'B-20-Q: original DOES NOT clamp negative stock (unsafe source behavior)');

sub dt {
  return {
    exp=>{1=>10},job=>'farmer',point=>20,rank=>5,
    money=>120,time=>900,item=>[4,6,7],
  };
}
sub action {
  return {
    itemno=>1,needexp=>5,needjob=>'farmer',
    needpoint=>10,needpop=>2,needevent=>'permit',
    money=>20,syntheticUseTime=>20,
    use=>[
      {no=>1,count=>2,proba=>1000},
      {no=>2,count=>1,proba=>0},
    ],result=>{},
  };
}
$DT=dt();
my $u=action();
is(isolated_use_gate($u,4),2,
  'B-20-R: material #1 shortage floors the requested use count from 4 to 2');
is($u->{result}{count},2,
  'B-20-S: effective count stored on original use result');

$DT=dt();$u=action();$u->{needexp}=11;
isolated_use_gate($u,3);
is($u->{result}{count},0,'B-20-T: insufficient experience prevents use');
$DT=dt();$u=action();$u->{needjob}='other';
isolated_use_gate($u,3);
is($u->{result}{count},0,'B-20-U: mismatched job prevents use');
$DT=dt();$u=action();$u->{needpoint}=21;
isolated_use_gate($u,3);
is($u->{result}{count},0,'B-20-V: insufficient points prevents use');
$DT=dt();$u=action();$u->{needpop}=6;
isolated_use_gate($u,3);
is($u->{result}{count},0,'B-20-W: insufficient popularity prevents use');
$DT=dt();$u=action();delete $DTevent{permit};
isolated_use_gate($u,3);
is($u->{result}{count},0,'B-20-X: missing required event prevents use');
$DTevent{permit}=1;

$DT=dt();$DT->{item}=[30,6,7];$DT->{money}=50;$u=action();
isolated_use_gate($u,5);
is($u->{result}{count},2,
  'B-20-Y: money shortage floors use count 5 to 2');
$DT=dt();$DT->{item}=[30,6,7];$u=action();$NOW_TIME=950;
isolated_use_gate($u,5);
is($u->{result}{count},2,
  'B-20-Z: time shortage floors use count 5 to 2');
$NOW_TIME=1000;

$DT=dt();$u=action();
is(isolated_check_material($u),1,
  'B-20-AA: original CheckUseItem material loop succeeds for current stock');
$DT->{item}[0]=1;
is(isolated_check_material($u),0,
  'B-20-AB: original CheckUseItem material loop rejects shortage');

is(MakeAmount(10,0),0,'B-20-AC: original MakeAmount probability 0 uses none');
is(MakeAmount(10,-10),0,'B-20-AD: negative probability uses none');
is(MakeAmount(10,1000),10,'B-20-AE: original probability 1000 uses full count');
is(MakeAmount(10,1100),10,'B-20-AF: >=1000 uses full amount');
srand(44);my $first=MakeAmount(12,500);
srand(44);my $again=MakeAmount(12,500);
is($first,$again,'B-20-AG: original small-count random branch reproducible with seed');
ok($first>=0 && $first<=12,
  'B-20-AH: original small-count Bernoulli amount within possible range');
srand(44);my $large1=MakeAmount(20,500);
srand(44);my $large2=MakeAmount(20,500);
is($large1,$large2,
  'B-20-AI: original count >=20 uses reproducible different random branch');
is(MakeAmount(0,500),0,'B-20-AJ: zero count uses no units');

done_testing();
