use strict;
use warnings;
use utf8;
use Test::More;
use FindBin;
use lib $FindBin::Bin;
use OriginalInlineCallbackHarness;
binmode STDOUT, ':encoding(UTF-8)';

# B-27: source EXACT inline code in memory. Core GetMoneyString is also
# original text. WriteLog is a recording stub, not a real game logger.
# Real inc-makeitem.cgi, world data, CGI and persistent logs NEVER execute.
my $ok=eval{OriginalInlineCallbackHarness::bootstrap();1};
ok($ok,'B-27-P01 exact original Standard Street callback bodies and compiler contract located') or die $@;
ok($OriginalInlineCallbackHarness::COMPILED_CORE,
  'B-27-P02 original Core GetMoneyString source compiled in isolated namespace');
is($OriginalInlineCallbackHarness::DETAILS{work}{id},13,
  'B-27-P03 item13 original work owner located');
is($OriginalInlineCallbackHarness::DETAILS{work}{useCount},2,
  'B-27-P04 item13 has two USE actions');
is($OriginalInlineCallbackHarness::DETAILS{work}{aliasCount},1,
  'B-27-P05 work second USE shares local_1 alias');
is($OriginalInlineCallbackHarness::DETAILS{showcase}{id},63,
  'B-27-P06 item63 original showcase owner located');
is($OriginalInlineCallbackHarness::DETAILS{showcase}{useCount},8,
  'B-27-P07 item63 has eight USE actions');
is($OriginalInlineCallbackHarness::DETAILS{showcase}{aliasCount},7,
  'B-27-P08 showcase actions 2..8 share local_1 alias');
like($OriginalInlineCallbackHarness::BODIES{work},
  qr/\$DT->\{money\}\+=\$USE->\{param1\}\*\$count;/,
  'B-27-P09 work original earned money expression intact');
like($OriginalInlineCallbackHarness::BODIES{work},
  qr/GetMoneyString\(\$USE->\{param1\}\*\$count\)/,
  'B-27-P10 work invokes original Core currency formatter');
like($OriginalInlineCallbackHarness::BODIES{showcase},
  qr/splice\(\@\{\$DT->\{showcase\}\},\$newcnt\)/,
  'B-27-P11 original showcase shrink via splice');
like($OriginalInlineCallbackHarness::BODIES{showcase},
  qr/\$DT->\{price\}\[\$_\]=0/,
  'B-27-P12 original showcase expansion writes price=0');
my $wrapper=OriginalInlineCallbackHarness::select_callback('work');
like($wrapper,qr/sub _local_1 \{eval\(<<'_eval_code_'\);/,
  'B-27-P13 exact compiler-style inline eval wrapper used only for reviewed work');
my $shop=OriginalInlineCallbackHarness::fixture(
  money=>700,param1=>3000,count=>2,shopId=>42,shopName=>'原版店');
my $ret=OriginalInlineCallbackHarness::run();
is($shop->{money},6700,'B-27-P14 work earns param1*actualCount');
is($ret,'¥6,000稼ぎました',
  'B-27-P15 source return uses pinned GetMoneyString with synthetic ¥ term');
is_deeply(\@OriginalInlineCallbackHarness::LOGS,[
  [0,42,'バイトし、¥6,000稼ぎました'],
  [3,0,'原版店がバイトしたようです'],
],'B-27-P16 work original two WriteLog calls and precise text/order');
is_deeply($shop->{showcase},[10,20],
  'B-27-P17 work original body does not resize showroom');
is_deeply($shop->{item},[7,8,9],
  'B-27-P18 work body does not directly consume items');
is($shop->{time},250,'B-27-P19 work callback itself does not mutate time');
is_deeply($shop->{exp},{13=>100},
  'B-27-P20 work body itself does not mutate experience');

$shop=OriginalInlineCallbackHarness::fixture(
  money=>900,param1=>10000,count=>1);
$ret=OriginalInlineCallbackHarness::run();
is($shop->{money},10900,
  'B-27-P21 second real USE param 10000 goes through same original _local_1 body');
is($ret,'¥10,000稼ぎました','B-27-P22 source work alias return exact');

$shop=OriginalInlineCallbackHarness::fixture(money=>900,param1=>3000,count=>0);
$ret=OriginalInlineCallbackHarness::run();
is($shop->{money},900,'B-27-P23 zero synthetic count earns zero but callback still runs');
is($ret,'¥0稼ぎました','B-27-P24 zero earnings return still produced');
is(scalar(@OriginalInlineCallbackHarness::LOGS),2,
  'B-27-P25 even zero earnings callback requests two logs');

$shop=OriginalInlineCallbackHarness::fixture(money=>200,param1=>3000,count=>-1);
$ret=OriginalInlineCallbackHarness::run();
is($shop->{money},-2800,
  'B-27-P26 negative synthetic count can produce negative balance; no invented clamp');
is($ret,'¥-3,000稼ぎました',
  'B-27-P27 pinned formatter puts currency before negative sign');

$shop=OriginalInlineCallbackHarness::fixture(
  money=>-400,param1=>-1500,count=>2);
$ret=OriginalInlineCallbackHarness::run();
is($shop->{money},-3400,'B-27-P28 negative synthetic param can reduce money');
is($ret,'¥-3,000稼ぎました','B-27-P29 negative amount formatting preserved');

$shop=OriginalInlineCallbackHarness::fixture(
  money=>0,param1=>1000000,count=>3);
is(OriginalInlineCallbackHarness::run(),'¥3,000,000稼ぎました',
  'B-27-P30 original Core grouping handles millions');
is($shop->{money},3000000,'B-27-P31 large synthetic earning preserved');

$wrapper=OriginalInlineCallbackHarness::select_callback('showcase');
like($wrapper,qr/sub _local_1 \{eval\(<<'_eval_code_'\);/,
  'B-27-P32 same function symbol reloaded from reviewed showcase source');
$shop=OriginalInlineCallbackHarness::fixture(
  showcaseCount=>2,showcase=>[10,20],prices=>[100,200],
  param1=>4,shopId=>88,shopName=>'展覽店');
$ret=OriginalInlineCallbackHarness::run();
is($shop->{showcasecount},4,'B-27-P33 original expansion sets count first');
is_deeply($shop->{showcase},[10,20,0,0],
  'B-27-P34 original expansion preserves old showcases and appends zeros');
is_deeply($shop->{price},[100,200,0,0],
  'B-27-P35 original expansion sets new slot prices to zero');
is($ret,'展示架已經改成4個了',
  'B-27-P36 original showcase return text exact');
is_deeply(\@OriginalInlineCallbackHarness::LOGS,[
  [0,88,'展示架已經改成4個了'],
  [3,0,'展覽店的展示架已經變成4個了'],
],'B-27-P37 showcase requests exactly the two original log calls');
is($shop->{money},1000,'B-27-P38 showcase body itself does not change money');
is_deeply($shop->{item},[7,8,9],
  'B-27-P39 showcase body does not directly consume inventory');
is($shop->{time},250,'B-27-P40 showcase callback itself does not change time');

$shop=OriginalInlineCallbackHarness::fixture(
  showcaseCount=>6,showcase=>[1,2,3,4,5,6],
  prices=>[10,20,30,40,50,60],param1=>2);
$ret=OriginalInlineCallbackHarness::run();
is($shop->{showcasecount},2,'B-27-P41 shrink updates count');
is_deeply($shop->{showcase},[1,2],
  'B-27-P42 shrink splices showcase to newCount');
is_deeply($shop->{price},[10,20],
  'B-27-P43 shrink splices price arrays to newCount');
is($ret,'展示架已經改成2個了','B-27-P44 shrink return exact');

$shop=OriginalInlineCallbackHarness::fixture(
  showcaseCount=>2,showcase=>[1,2,3],prices=>[10,20,30],param1=>2);
OriginalInlineCallbackHarness::run();
is_deeply($shop->{showcase},[1,2,3],
  'B-27-P45 equal count DOES NOT normalize extra showroom entries');
is_deeply($shop->{price},[10,20,30],
  'B-27-P46 equal count DOES NOT normalize extra price entries');

$shop=OriginalInlineCallbackHarness::fixture(
  showcaseCount=>2,showcase=>[7],prices=>[11],param1=>4);
OriginalInlineCallbackHarness::run();
is_deeply($shop->{showcase},[7,undef,0,0],
  'B-27-P47 expansion from underfilled array keeps Perl undef hole');
is_deeply($shop->{price},[11,undef,0,0],
  'B-27-P48 expansion from underfilled price array keeps Perl undef hole');

$shop=OriginalInlineCallbackHarness::fixture(
  showcaseCount=>1,showcase=>[2,4,6,8,10],
  prices=>[20,40,60,80,100],param1=>3);
OriginalInlineCallbackHarness::run();
is_deeply($shop->{showcase},[2,0,0,8,10],
  'B-27-P49 expansion overwrites only oldCount..newCount-1, preserves tail');
is_deeply($shop->{price},[20,0,0,80,100],
  'B-27-P50 preexisting tail prices preserved beyond new count');

$shop=OriginalInlineCallbackHarness::fixture(
  showcaseCount=>0,showcase=>[],prices=>[],param1=>1);
OriginalInlineCallbackHarness::run();
is_deeply($shop->{showcase},[0],
  'B-27-P51 synthetic empty array starts at slot 0');
is_deeply($shop->{price},[0],
  'B-27-P52 synthetic empty prices start at slot 0');

done_testing();
