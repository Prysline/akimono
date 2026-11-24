use strict;
use warnings;
use utf8;
use Test::More;
use FindBin;
use lib $FindBin::Bin;
use OriginalFullUseLostbookHarness;
binmode STDOUT, ':encoding(UTF-8)';

# B-30: selected exact original Perl routines linked in memory; the
# game's real RequireFile, full CGI, compiled DSL, user data, logs and
# filesystem writes are explicitly excluded.
sub source {
  my($file)=@_;
  open(my $fh,'<:encoding(UTF-8)',"$FindBin::Bin/$file") or die $!;
  local $/;my $s=<$fh>;close $fh;return $s;
}
my $core=source('use.cgi');
my $inc=source('core-inc-item.cgi');
my $calc=source('calc.cgi');
my $whole=source('whole.cgi');
ok(OriginalFullUseLostbookHarness::bootstrap(),
  'B-30-P01 reviewed exact original transaction and callback bodies compiled');
for my $part(
  ['Core UseItem','sub UseItem',$core],
  ['Core MakeAmount','sub MakeAmount',$core],
  ['time calculation','sub GetItemUseTime',$calc],
  ['time spending','sub UseTime',$calc],
  ['wholesale correction','sub CheckWholeStore',$whole],
  ['nested Core item use','sub UseItem',$inc],
  ['nested Core item use sub','sub UseItemSub',$inc],
){
  ok(index($part->[2],$part->[1])>=0,
    "B-30 original $part->[0] source located");
}
my @markers=(
 '$USE->{result}->{count}=$count',
 'return if !$count;',
 'UseTime($usetime*$count);',
 '#アイテム消費',
 '#アイテム取得',
 'CheckWholeStore();',
 "RequireFile('inc-item.cgi');",
 '$USE->{result}->{function_return}=&$itemfunc();',
 '#熟練度処理',
);
my $prior=-1;
for my $i(0..$#markers){
  my $pos=index($core,$markers[$i],$prior+1);
  ok($pos>$prior,"B-30 original transaction action order $i: $markers[$i]");
  $prior=$pos;
}
my $b=OriginalFullUseLostbookHarness::run();
is_deeply($b->{trace},['use-time','wholesale','require-common','lostbook'],
  'B-30 full original source interaction order');
is($b->{result}{count},2,'B-30 preflight reduces requested 4 to successful 2');
is($b->{money},30,'B-30 original account charges 40 before callback');
is($b->{paytoday},45,'B-30 original daily payment increases by 40');
is($b->{time},986,'B-30 original time counts 36 seconds before callback');
is_deeply($b->{wholesale},[3,0,-3],
  'B-30 wholesale correction executed before nested callback');
is_deeply($b->{wholesaleAtCallback},[3,0,-3],
  'B-30 callback observes AFTER-wholesale market snapshot');
is($b->{stockAtCallback},10,
  'B-30 callback sees generated stock capped at ten');
is_deeply($b->{stock},[9,6,5],
  'B-30 nested original item::UseItem consumes one AFTER wholesale');
is_deeply($b->{otherShopStock},[3,4,2],
  'B-30 source callback does not mutate another shop');
is_deeply($b->{result}{useitem},[[1,4],[1,1]],
  'B-30 material use is recorded before callback nested consumption');
is_deeply($b->{result}{usemsg},
  ['consume A','A已經破爛到看不懂，就扔掉了。'],
  'B-30 nested original use message is appended after material message');
is_deeply($b->{result}{additem},[
  [1,6],[2,2],[1,0],[3,2],
],'B-30 original creation result arrays retain duplicate zeros before callback');
is_deeply($b->{result}{addmsg},[
  'create A','create B','create A again','create C',
],'B-30 original creation messages preserve source order');
is($b->{result}{function_return},'',
  'B-30 original transaction stores empty-string lostbook callback return');
is($b->{expAtCallback},200,
  'B-30 original callback runs before experience award');
is($b->{result}{expold},200,
  'B-30 original tail captures prior experience after callback');
is($b->{exp},260,
  'B-30 source experience tail awards 30 per successful two uses');

my $skip=OriginalFullUseLostbookHarness::run(param1=>0,seed=>17);
is_deeply($skip->{trace},['use-time','wholesale','require-common','lostbook'],
  'B-30 lostbook function still executes when random branch skips item use');
is_deeply($skip->{stock},[10,6,5],
  'B-30 no triggered helper leaves stock from original normal production');
is_deeply($skip->{result}{useitem},[[1,4]],
  'B-30 skip branch does not append nested item record');
is_deeply($skip->{result}{usemsg},['consume A'],
  'B-30 skip branch does not append nested message');
is($skip->{result}{function_return},'',
  'B-30 skipped lostbook still returns empty string');

my $absent=OriginalFullUseLostbookHarness::run(callback=>'');
is_deeply($absent->{trace},['use-time','wholesale','require-common'],
  'B-30 missing callback still loads common helpers but skips invocation');
ok(!defined $absent->{result}{function_return},
  'B-30 no callback function leaves return unset');
is($absent->{exp},260,
  'B-30 experience tail still runs without callback');

for my $zero(
  ['money zero',{money=>10}],
  ['experience gate',{needExp=>201}],
){
  my($name,$input)=@$zero;
  my $r=OriginalFullUseLostbookHarness::run(%$input);
  is($r->{result}{count},0,"B-30 $name count is zero");
  is_deeply($r->{trace},[],"B-30 $name skips UseTime/wholesale/common/callback");
  ok(!defined($r->{result}{function_return}),
    "B-30 $name does not invoke callback");
  is($r->{exp},200,"B-30 $name does not award experience");
  is_deeply($r->{stock},[8,4,3],"B-30 $name does not change inventory");
}

my $noexp=OriginalFullUseLostbookHarness::run(expPerUse=>0);
is($noexp->{exp},200,'B-30 no skill award leaves original value');
is($noexp->{result}{expold},'',
  'B-30 no skill award does not replace previous expold');
is_deeply($noexp->{stock},[9,6,5],
  'B-30 no exp still executes nested callback');

my $cap=OriginalFullUseLostbookHarness::run(exp=>990);
is($cap->{result}{count},3,
  'B-30 high prior experience changes time and allows count three');
is($cap->{expAtCallback},990,
  'B-30 callback sees prior 990 exp before original tail');
is($cap->{exp},1000,'B-30 original exp cap applies after callback');
is($cap->{result}{expold},990,'B-30 expold is original 990');

my $old=OriginalFullUseLostbookHarness::run(experienceOld=>1000);
is($old->{result}{count},3,
  'B-30 stale result.expold modifies preflight GetItemUseTime');
is($old->{result}{expold},200,
  'B-30 experience tail overwrites stale expold only after callback');

my $empty=OriginalFullUseLostbookHarness::run(
  emptyActions=>1,initialStock=>0,requestedCount=>1);
is_deeply($empty->{trace},['use-time','wholesale','require-common','lostbook'],
  'B-30 source runs full order on empty material lists');
is_deeply($empty->{stock},[0,4,3],
  'B-30 original helper cannot consume positive item from empty stock');
is_deeply($empty->{result}{useitem},[[1,0]],
  'B-30 zero-stock callback records original zero effective used quantity');
is_deeply($empty->{result}{usemsg},
  ['A已經破爛到看不懂，就扔掉了。'],
  'B-30 even zero actual consumption records nested original message');
is_deeply($empty->{result}{additem},[],
  'B-30 original full transaction initializes additem even when no creation');

my $inactive=OriginalFullUseLostbookHarness::run(status=>0);
is($inactive->{time},950,
  'B-30 original inactive UseTime does not advance stored time');
is($inactive->{money},30,
  'B-30 inactive shop still charged source money');
is($inactive->{exp},260,
  'B-30 inactive shop still awards source exp');

my $dup=OriginalFullUseLostbookHarness::run(
  duplicateMaterials=>1,requestedCount=>1);
is($dup->{stockAtCallback},-4,
  'B-30 duplicated material counts make stock negative BEFORE callback');
is_deeply($dup->{result}{useitem},[[1,6],[1,6],[1,-4]],
  'B-30 source nested UseItem records NEGATIVE actual count after double consume');
is($dup->{stock}[0],0,
  'B-30 source negative effective nested use brings synthetic stock to zero');
is($dup->{exp},230,'B-30 one use awards one experience increment');
is_deeply($dup->{trace},['use-time','wholesale','require-common','lostbook'],
  'B-30 original duplicate material keeps original callback order');

done_testing();
