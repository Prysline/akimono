use strict;
use warnings;
use utf8;
use Test::More;
use FindBin;
use lib $FindBin::Bin;
use OriginalItemHelperHarness;
binmode STDOUT, ':encoding(UTF-8)';

# B-29: exact source-extracted Core item::UseItem / UseItemSub / AddItem /
# AddItemSub plus exact Standard Street lostbook. No actual inc-item.cgi
# require, CGI, real world state, logger, wallet, or outer transaction.
ok(OriginalItemHelperHarness::bootstrap(),
  'B-29-P01 all original four Core helper and Standard Street lostbook bodies compile');
for my $name(qw(UseItem UseItemSub AddItem AddItemSub lostbook)){
  ok(defined $OriginalItemHelperHarness::BODY{$name},
    "B-29 original SHA-pinned body $name found");
}
like($OriginalItemHelperHarness::BODY{UseItemSub},
  qr/\$count=\$DT->\{item\}\[\$itemno-1\] if \$DT->\{item\}\[\$itemno-1\]<\$count;/,
  'B-29 original UseItemSub clamps only when stock is below requested count');
like($OriginalItemHelperHarness::BODY{UseItemSub},
  qr/\$DT->\{item\}\[\$itemno-1\]-=\$count;/,
  'B-29 original UseItemSub subtracts adjusted count unchanged');
like($OriginalItemHelperHarness::BODY{AddItemSub},
  qr/\$count=\$main::ITEM\[\$itemno\]->\{limit\}-\$DT->\{item\}\[\$itemno-1\]/,
  'B-29 original AddItemSub adjusts count by limit minus current stock');
like($OriginalItemHelperHarness::BODY{AddItemSub},
  qr/\$DT->\{item\}\[\$itemno-1\]\+=\$count;/,
  'B-29 original AddItemSub adds adjusted count');
like($OriginalItemHelperHarness::BODY{UseItem},
  qr/push\(\@\{\$USE->\{result\}->\{useitem\}\},\[\$itemno,\$count\]\);/,
  'B-29 original UseItem appends adjusted used-item count');
like($OriginalItemHelperHarness::BODY{UseItem},
  qr/push\(\@\{\$USE->\{result\}->\{usemsg\}\},\$msg\);/,
  'B-29 original UseItem appends original message independently');
like($OriginalItemHelperHarness::BODY{AddItem},
  qr/push\(\@\{\$USE->\{result\}->\{additem\}\},\[\$itemno,\$count\]\);/,
  'B-29 original AddItem appends adjusted received-item count');
like($OriginalItemHelperHarness::BODY{AddItem},
  qr/push\(\@\{\$USE->\{result\}->\{addmsg\}\},\$msg\);/,
  'B-29 original AddItem appends original message independently');
like($OriginalItemHelperHarness::BODY{lostbook},
  qr/UseItem\(\$itemno,1,\$ITEM\[\$itemno\]->\{name\}/,
  'B-29 original lostbook calls real item::UseItem with requested count ONE');

my $r=OriginalItemHelperHarness::subcall(
  method=>'UseItemSub',itemNo=>1,stock=>7,count=>3,limit=>10);
is($r->{returned},3,'B-29 UseItemSub returns actual 3');
is($r->{stockAfter},4,'B-29 UseItemSub stock 7-3=4');
is_deeply($r->{result},{count=>7},
  'B-29 UseItemSub leaves result flags and arrays untouched');

$r=OriginalItemHelperHarness::subcall(
  method=>'UseItemSub',itemNo=>1,stock=>2,count=>8);
is($r->{returned},2,'B-29 UseItemSub clamps attempt 8 to stock 2');
is($r->{stockAfter},0,'B-29 UseItemSub leaves zero stock');

$r=OriginalItemHelperHarness::subcall(
  method=>'UseItemSub',itemNo=>1,stock=>0,count=>1);
is($r->{returned},0,'B-29 empty stock adjustment returns zero');
is($r->{stockAfter},0,'B-29 empty stock remains zero');

$r=OriginalItemHelperHarness::subcall(
  method=>'UseItemSub',itemNo=>1,stock=>2,count=>-3);
is($r->{returned},-3,'B-29 negative count is not rejected inside original helper');
is($r->{stockAfter},5,'B-29 subtract negative count increases stock');

$r=OriginalItemHelperHarness::subcall(
  method=>'UseItemSub',itemNo=>1,stock=>-5,count=>1);
is($r->{returned},-5,'B-29 already-negative stock becomes negative effective count');
is($r->{stockAfter},0,'B-29 source subtracting negative adjusted count can zero negative stock');

$r=OriginalItemHelperHarness::subcall(
  method=>'AddItemSub',itemNo=>1,stock=>3,count=>2,limit=>10);
is($r->{returned},2,'B-29 AddItemSub ordinary addition actual count');
is($r->{stockAfter},5,'B-29 AddItemSub stock 3+2=5');

$r=OriginalItemHelperHarness::subcall(
  method=>'AddItemSub',itemNo=>1,stock=>8,count=>5,limit=>10);
is($r->{returned},2,'B-29 AddItemSub caps actual count by remaining 2');
is($r->{stockAfter},10,'B-29 AddItemSub reaches limit exactly');

$r=OriginalItemHelperHarness::subcall(
  method=>'AddItemSub',itemNo=>1,stock=>10,count=>1,limit=>10);
is($r->{returned},0,'B-29 AddItemSub at limit returns zero');
is($r->{stockAfter},10,'B-29 AddItemSub at limit unchanged');

$r=OriginalItemHelperHarness::subcall(
  method=>'AddItemSub',itemNo=>1,stock=>15,count=>1,limit=>10);
is($r->{returned},-5,'B-29 overlimit existing stock creates negative actual ADD');
is($r->{stockAfter},10,'B-29 negative adjusted add lowers stock back to limit');

$r=OriginalItemHelperHarness::subcall(
  method=>'AddItemSub',itemNo=>1,stock=>15,count=>0,limit=>10);
is($r->{returned},-5,
  'B-29 even requested zero, overlimit stock causes negative adjusted add');
is($r->{stockAfter},10,
  'B-29 requested zero is NOT automatically a no-op for overlimit stock');

$r=OriginalItemHelperHarness::subcall(
  method=>'AddItemSub',itemNo=>1,stock=>3,count=>-5,limit=>10);
is($r->{returned},-5,'B-29 negative add count stays negative');
is($r->{stockAfter},-2,'B-29 negative add count decreases stock below zero');

$r=OriginalItemHelperHarness::subcall(
  method=>'UseItem',itemNo=>2,stock=>4,count=>2,
  message=>'試用消耗');
is($r->{returned},0,'B-29 original UseItem wrapper returns literal 0');
is($r->{stockAfter},2,'B-29 original UseItem wrapper consumes 2');
is_deeply($r->{result},{
  count=>7,useitem=>[[2,2]],usemsg=>['試用消耗'],
},'B-29 original UseItem wrapper creates both result arrays');

$r=OriginalItemHelperHarness::subcall(
  method=>'UseItem',itemNo=>1,stock=>1,count=>10,
  message=>'需求過量',result=>{
    count=>9,useitem=>[[2,6]],usemsg=>['原訊息'],
    additem=>[[1,2]],addmsg=>['保留新增'],other=>'欄位保留',
  });
is($r->{returned},0,'B-29 shortage UseItem wrapper still returns zero');
is($r->{stockAfter},0,'B-29 shortage UseItem wrapper removes available one');
is_deeply($r->{result}{useitem},[[2,6],[1,1]],
  'B-29 original UseItem appends actual one without clearing earlier entries');
is_deeply($r->{result}{usemsg},['原訊息','需求過量'],
  'B-29 original use message array is appended, not replaced');
is_deeply($r->{result}{additem},[[1,2]],
  'B-29 original UseItem does not clear existing additem');
is($r->{result}{other},'欄位保留',
  'B-29 original UseItem does not mutate arbitrary result fields');

$r=OriginalItemHelperHarness::subcall(
  method=>'UseItem',itemNo=>1,stock=>0,count=>1,message=>'空庫存',
  result=>{count=>3});
is_deeply($r->{result}{useitem},[[1,0]],
  'B-29 zero actual consumption is still recorded as [item,0]');
is_deeply($r->{result}{usemsg},['空庫存'],
  'B-29 zero actual consumption still appends message');
is($r->{stockAfter},0,'B-29 zero actual use leaves stock zero');

$r=OriginalItemHelperHarness::subcall(
  method=>'UseItem',itemNo=>1,stock=>-5,count=>1,message=>'負庫存');
is_deeply($r->{result}{useitem},[[1,-5]],
  'B-29 negative effective use count is recorded as negative');
is($r->{stockAfter},0,'B-29 negative stock becomes zero via source clamp');

$r=OriginalItemHelperHarness::subcall(
  method=>'AddItem',itemNo=>1,stock=>8,count=>5,limit=>10,
  message=>'取得五個');
is($r->{returned},0,'B-29 original AddItem wrapper returns zero');
is($r->{stockAfter},10,'B-29 capped AddItem still stops at limit');
is_deeply($r->{result}{additem},[[1,2]],
  'B-29 AddItem wrapper records actual two, not requested five');
is_deeply($r->{result}{addmsg},['取得五個'],
  'B-29 AddItem wrapper preserves requested message text');

$r=OriginalItemHelperHarness::subcall(
  method=>'AddItem',itemNo=>1,stock=>15,count=>1,limit=>10,
  message=>'超額',result=>{
    count=>9,additem=>[[2,1]],addmsg=>['先前取得'],usemsg=>['先前消耗'],
  });
is($r->{returned},0,'B-29 overlimit AddItem wrapper still returns zero');
is($r->{stockAfter},10,'B-29 overlimit AddItem reduces stock to limit');
is_deeply($r->{result}{additem},[[2,1],[1,-5]],
  'B-29 overlimit AddItem records NEGATIVE granted count');
is_deeply($r->{result}{addmsg},['先前取得','超額'],
  'B-29 overlimit AddItem appends the original requested message');
is_deeply($r->{result}{usemsg},['先前消耗'],
  'B-29 AddItem does not remove stale previous use messages');

$r=OriginalItemHelperHarness::subcall(
  method=>'AddItem',itemNo=>1,stock=>10,count=>1,limit=>10,
  message=>'滿庫存');
is_deeply($r->{result}{additem},[[1,0]],
  'B-29 full limit AddItem still appends zero actual amount');
is_deeply($r->{result}{addmsg},['滿庫存'],
  'B-29 full limit AddItem still appends message');

my $book=OriginalItemHelperHarness::lostbook(
  itemNo=>1,stock=>5,param1=>1000,seed=>9,
  result=>{count=>7,additem=>[[2,4]]});
is($book->{returned},'','B-29 original lostbook returns empty string');
is($book->{stockAfter},4,
  'B-29 source lostbook genuinely dispatches original item::UseItem to decrement stock');
is_deeply($book->{result}{useitem},[[1,1]],
  'B-29 lostbook nested real source helper records one used item');
is_deeply($book->{result}{usemsg},
  ['書本甲已經破爛到看不懂，就扔掉了。'],
  'B-29 lostbook original item name and message in result usemsg');
is($book->{result}{count},7,
  'B-29 nested helper preserves outer transaction success count');
is_deeply($book->{result}{additem},[[2,4]],
  'B-29 nested consumption preserves other result arrays');
is($book->{moneyAfter},700,
  'B-29 nested helper does not directly modify synthetic money');
is($book->{timeAfter},250,
  'B-29 nested helper does not directly modify synthetic time');
is_deeply($book->{expAfter},{1=>120},
  'B-29 nested helper does not directly modify synthetic experience');

$book=OriginalItemHelperHarness::lostbook(
  itemNo=>2,stock=>5,param1=>0,seed=>12,
  result=>{count=>3});
is($book->{returned},'','B-29 zero chance lostbook still returns empty string');
is($book->{stockAfter},5,'B-29 zero chance means no helper invocation');
is_deeply($book->{result},{count=>3},
  'B-29 skipped branch creates NO useitem/usemsg arrays');

$book=OriginalItemHelperHarness::lostbook(
  itemNo=>2,stock=>0,param1=>1000,seed=>9,
  result=>{count=>3});
is($book->{stockAfter},0,
  'B-29 no stock cannot consume positive one');
is_deeply($book->{result}{useitem},[[2,0]],
  'B-29 lostbook records zero actual use EVEN WHEN branch triggered');
is_deeply($book->{result}{usemsg},
  ['書本乙已經破爛到看不懂，就扔掉了。'],
  'B-29 triggered lostbook stores message even on zero consumption');

$book=OriginalItemHelperHarness::lostbook(
  itemNo=>1,stock=>-3,param1=>1000,seed=>9,
  result=>{count=>3});
is($book->{stockAfter},0,
  'B-29 negative synthetic stock normalized only via source helper arithmetic');
is_deeply($book->{result}{useitem},[[1,-3]],
  'B-29 triggered lostbook records negative effective used count from source');

$book=OriginalItemHelperHarness::lostbook(
  itemNo=>1,stock=>9,param1=>500,seed=>46,
  result=>{count=>8});
srand(46);my $expected=rand(1000);
is($book->{stockAfter},$expected<500?8:9,
  'B-29 lostbook uses actual observed Perl rand draw, no JS RNG claim');
cmp_ok(abs($book->{randomDraw}-$expected),'<',0.00000001,
  'B-29 Perl randomDraw recorded before source-seeded callback');

done_testing();
