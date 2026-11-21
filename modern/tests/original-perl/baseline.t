use strict;
use warnings;
use utf8;
use Test::More;
binmode STDOUT, ":encoding(UTF-8)";
our ($NOW_TIME, $MAX_STOCK_TIME, $MAX_MONEY, $TIME_SEND_ITEM, $TIME_SEND_MONEY, $TIME_SEND_MONEY_PLUS, $USER, $MAX_ITEM);
our ($DT,@ITEM,$showcase);
sub l { return $_[0]; }
sub OutError { die $_[0]; }
require './calc.cgi';
require './item.cgi';

$NOW_TIME=1_000_000;
$MAX_STOCK_TIME=259_200;
$MAX_MONEY=999_999_999;
$USER='test';
$DT={status=>1,time=>$NOW_TIME-300, exp=>{10=>250}};

is(GetStockTime($NOW_TIME-300), 300, 'TC-01: 可用時間＝NOW_TIME－已用時間戳');
is(GetStockTime($NOW_TIME-300_000),259200,'TC-02: 可用時間上限 72 小時');
UseTime(120);
is($DT->{time},$NOW_TIME-180,'TC-03: 消耗 120 秒使時間戳增加 120 秒');
$DT->{time}=$NOW_TIME-300_000;
UseTime(1200);
is($DT->{time},$NOW_TIME-258_000,'TC-04: 超時存量先裁切再消耗');
$DT->{time}=$NOW_TIME+1;
eval { UseTime(60); };
like($@,qr/時間が足りません/,'TC-05: 當前時間不足時拒絕');
$DT->{time}=$NOW_TIME;
eval { UseTime(-1); };
like($@,qr/bad request/,'TC-06: 負數時間消耗拒絕');
is(GetItemUseTime({time=>7200,exptime=>3600,itemno=>10,result=>{}}),6300,'TC-07: 商品熟練度 250 /1000 折減時間');
is(GetItemUseTime({time=>7200,exptime=>3600,itemno=>10,result=>{expold=>500}}),5400,'TC-08: expold 優先於當前熟練度');

$ITEM[10]={price=>100};
$TIME_SEND_ITEM=1200;
$TIME_SEND_MONEY=1200;
$TIME_SEND_MONEY_PLUS=100000;
is(GetTimeDeal(1000,10,10),1200,'TC-09: 依標準單價交易耗 1200 秒');
is(GetTimeDeal(2000,10,10),600,'TC-10: 高價成交時間係數下限 0.5');
is(GetTimeDeal(0,10,10),2400,'TC-11: 零元交易時間係數上限 2');
is(GetTimeDeal(100_000,0,0),2400,'TC-12: 金錢轉移時間 = 基本 1200+金額比例 1200');
is(GetTimeDeal(0,0,0),0,'TC-13: 零額金錢轉移時間為 0');
is_deeply([GetSaleTax(10,10,1000,10)],[10,100],'TC-14: 標準價格銷售稅 10% 稅額 100');
is_deeply([GetSaleTax(10,10,1200,10)],[11,132],'TC-15: 溢價 20% 時原版稅率為 11%');
is_deeply([GetSaleTax(10,10,800,10)],[8,64],'TC-16: 低價成交使實際稅率降為 8%');
my $money_dt={money=>999_999_990};
EditMoney($money_dt,50);
is($money_dt->{money},999_999_999,'TC-17: 現金受最大值限制');
EditMoney($money_dt,-1_500_000_000);
is($money_dt->{money},0,'TC-18: EditMoney 下限為 0');

# 額外測試：原始純函式與保守邊界，仍非整套 CGI 整合測試
is(CheckCount(3,0,1,10),3,'TC-19: CheckCount 取第一個數量');
is(CheckCount(3,20,1,10),10,'TC-20: 第二個輸入優先且被最大值截斷');
is(CheckCount(-2,0,1,10),1,'TC-21: 數量小於下限時使用下限');
my $tedit={time=>$NOW_TIME-100};
EditTime($tedit,30);
is($tedit->{time},$NOW_TIME-130,'TC-22: EditTime 把時間戳往過去移以恢復 30 秒');
$tedit->{time}=$NOW_TIME-300_000;
EditTime($tedit,1200);
is($tedit->{time},$NOW_TIME-259_200,'TC-23: EditTime 不能超過持有時間上限');
$DT={status=>0,time=>$NOW_TIME+100};
UseTime(500);
is($DT->{time},$NOW_TIME+100,'TC-24: 非有效狀態商店不消耗時間');
is(GetTimeDeal(100,10,0),0,'TC-25: 商品轉移數量為零不耗時');
is_deeply([GetSaleTax(10,1,10000,50)],[99,9900],'TC-26: 溢價稅率上限 99%');
$DT={exp=>{10=>0}};
is(GetItemUseTime({time=>7200,exptime=>3600,itemno=>10,result=>{}}),7200,'TC-27: 零熟練度不折減時間');
my $intdt={money=>1};
EditMoney($intdt,2.9);
is($intdt->{money},3,'TC-28: EditMoney 對增減額先 int');
$MAX_ITEM=20;
$DT={item=>[(0)x20]};
$DT->{item}[9]=2;
is(CheckItemNo(10),10,'TC-29: 有庫存且編號合法的商品驗證通過');
eval { CheckItemNo(21); };
like($@,qr/そんなアイテムはないです/,'TC-30: 商品編號越界會拒絕');
eval { CheckItemNo(11); };
like($@,qr/アイテムの在庫がありません/,'TC-31: 商品沒有庫存時拒絕');

done_testing();
