use strict;
use warnings;
use utf8;
use Test::More;
use FindBin;
use lib $FindBin::Bin;
use OriginalGiftMapUseHarness;
binmode STDOUT, ':encoding(UTF-8)';

# B-33: directly execute reviewed subroutines from pinned inc-makeitem.cgi
# and the full original Core plug/use.cgi::UseItem on REAL Standard Street
# gift #79 first USE, with EXPLICIT 79-slot artificial market seed.
# Never run the original compiler top-level, CGI, world saves or disk writes.
sub map_stock {
  my($o)=@_;
  return [map {$o->{stock}[$_-1]} (12,9,14)];
}
my $c=OriginalGiftMapUseHarness::compile();
ok(defined $c,'B-33 exact original compiler GetBuffer/ClearBuffer subroutines executed');
is($c->{itemno},79,'B-33 real original gift owner ITEM #79');
is($c->{code},'gift','B-33 real source item code gift');
is($c->{no},0,'B-33 source compiler assigns first USE no 0');
is($c->{name},'交換地圖集','B-33 original USE name');
is($c->{time},1800,'B-33 source compiler itemusetimerate 0.5 yields 1800 seconds');
is($c->{exptime},1800,'B-33 original compiler exptime defaults to first TIME');
is($c->{money},0,'B-33 no use price means original money zero');
is($c->{exp},0,'B-33 no USE exp award declared');
is_deeply([map {[$_->{no},$_->{count},$_->{proba}]} @{$c->{use}}],
  [[79,2,1000]],'B-33 source GetBuffer/real GetItemNumber resolve gift cost');
is_deeply([map {[$_->{no},$_->{count},$_->{proba}]} @{$c->{result}{create}}],
  [[12,1,1000],[9,1,1000],[14,1,1000]],
  'B-33 compiler resolves real maps and default 1000 probability');
is($c->{result}{message}{resultok},'感謝您的使用',
  'B-33 original compiled resultok message retained');

my $one=OriginalGiftMapUseHarness::run(requestedCount=>1);
is($one->{result}{count},1,'B-33 original full Core performs one real gift USE');
is_deeply($one->{trace},['use-time','wholesale','require-common'],
  'B-33 full source order Time->Wholesale->Common, no custom callback');
is($one->{stock}[78],3,'B-33 one source exchange consumes two gift vouchers');
is_deeply(map_stock($one),[1,1,1],
  'B-33 one source exchange grants one each real map #12/#9/#14');
is($one->{stock}[62],1,
  'B-33 actual original initial showcase tool ITEM #63 survives gift exchange');
is($one->{money},100000,'B-33 real source gift exchange charges no money');
is($one->{paytoday},0,'B-33 zero transaction price leaves daily payment unchanged');
is($one->{time},958600,'B-33 source exchange spends compiler-scaled 1800 seconds');
is_deeply($one->{result}{useitem},[[79,2]],
  'B-33 source consumed record contains correct original ITEM number');
is_deeply($one->{result}{additem},[[12,1],[9,1],[14,1]],
  'B-33 original source added result rows preserve order');
ok(!defined $one->{result}{function_return},
  'B-33 no callback produces no original function_return');
ok(!defined $one->{result}{usemsg},
  'B-33 no source material message must not invent one');
ok(!defined $one->{result}{addmsg},
  'B-33 no source output message must not invent one');
is($one->{itemLimits}[78][0],10,'B-33 compiler original gift warehouse cap ten');
is($one->{itemLimits}[78][1],0,'B-33 original gift wholesale cap zero');
for my $id(9,12,14){
 is_deeply($one->{itemLimits}[$id-1],[3,3],
   "B-33 source original map #$id warehouse and wholesale cap are both three");
}
is_deeply([@{$one->{wholesale}}[8,11,13]],[0,0,0],
  'B-33 full Core wholesale check retained zero synthetic map wholesale');

my $second=OriginalGiftMapUseHarness::run(
  requestedCount=>1,stock=>$one->{stock},wholesale=>$one->{wholesale},
  money=>$one->{money},paytoday=>$one->{paytoday},time=>$one->{time},
);
is($second->{result}{count},1,'B-33 second source use consumes retained state');
is($second->{stock}[78],1,'B-33 two source uses leave one voucher');
is_deeply(map_stock($second),[2,2,2],
  'B-33 second real source use increments same map slots');
is($second->{time},960400,'B-33 source time is accumulated, not reset');
is($second->{money},100000,'B-33 second original source use still costs zero');
is_deeply($second->{trace},['use-time','wholesale','require-common'],
  'B-33 source wholesale is checked again only for second transaction');

my $third=OriginalGiftMapUseHarness::run(
  requestedCount=>1,stock=>$second->{stock},
  wholesale=>$second->{wholesale},money=>$second->{money},
  paytoday=>$second->{paytoday},time=>$second->{time},
);
is($third->{result}{count},0,
  'B-33 third real use has only one voucher and returns zero count');
is_deeply($third->{trace},[],
  'B-33 source zero-count branch does not spend time or invoke market');
is_deeply($third->{stock},$second->{stock},
  'B-33 insufficient material does not change original item stock');
is($third->{money},$second->{money},
  'B-33 insufficient material does not charge money');
is($third->{time},$second->{time},
  'B-33 insufficient material does not spend time');

my $requested3=OriginalGiftMapUseHarness::run(requestedCount=>3);
is($requested3->{result}{count},2,
  'B-33 source material count 5/2 gates requested three to two');
is($requested3->{stock}[78],1,
  'B-33 requested three source output retains one voucher');
is_deeply(map_stock($requested3),[2,2,2],
  'B-33 source two successful operations create each map twice');
is($requested3->{time},960400,
  'B-33 source time for two successful operations is 3600 seconds');

my $cappedStock=[(0)x78,5];
$cappedStock->[62]=1;
$cappedStock->[11]=3;$cappedStock->[8]=3;$cappedStock->[13]=3;
my $capped=OriginalGiftMapUseHarness::run(
  requestedCount=>1,stock=>$cappedStock,
);
is($capped->{result}{count},1,'B-33 full-map warehouse still uses one voucher');
is($capped->{stock}[78],3,'B-33 full-map creation still consumes two gift');
is_deeply(map_stock($capped),[3,3,3],
  'B-33 original full-map capacity retains existing three maps');
is_deeply($capped->{result}{additem},[[12,0],[9,0],[14,0]],
  'B-33 source records zero retained item after original trash overflow');
is_deeply([@{$capped->{wholesale}}[8,11,13]],[0,0,0],
  'B-33 source CheckWholeStore recaps synthetic map wholesale to zero');
is($capped->{time},958600,'B-33 full storage still costs original time');
ok($capped->{scope}=~/no full compiler/,
  'B-33 source harness is explicit about no original top-level compiler execution');
done_testing();
