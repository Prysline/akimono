use strict;
use warnings;
use utf8;
use Test::More;
binmode STDOUT, ':encoding(UTF-8)';
our (%Q,@ITEM,@DT,%marketitemlist,$DT,$DTpeople,$SALE_SPEED,$MAX_ITEM,$MAX_MONEY,
     $NOW_TIME,$MAX_STOCK_TIME,$TIME_EDIT_SHOWCASE,$USER,$NOMENU,$disp,$ret,
     $TBT,$TRT,$TD,$TRE,$TBE,$commits,$writes,$logs,$last_error,$rendered);
sub l { return $_[0]; }
sub OutError { $last_error=$_[0]; die "GAME_ERROR:".$_[0]."\n"; }
sub Lock { return 1; }
sub UnLock { return 1; }
sub DataRead { return 1; }
sub DataWrite { ++$writes; return 1; }
sub DataCommitOrAbort { ++$commits; return 1; }
sub CheckUserPass { return 1; }
sub PushLog { ++$logs; return 1; }
sub RenewLog { return 1; }
sub GetMoneyString { return $_[0]; }
sub GetTagImgJob { return ''; }
sub GetMenuTag { return ''; }
sub OutSkin { ++$rendered; die "__OUT_SKIN_CAPTURED__\n"; }
require './calc.cgi';
require './market.cgi';

$MAX_ITEM=79; $MAX_MONEY=999_999_999;
$NOW_TIME=1_000_000; $MAX_STOCK_TIME=259_200;
$TIME_EDIT_SHOWCASE=600; $USER='tester';
$DTpeople=100; $SALE_SPEED=12;
$TBT=$TRT=$TD=$TRE=$TBE='';

@ITEM=map { {} } 0..$MAX_ITEM;
$ITEM[10]={price=>100,name=>'固定測試商品',flag=>'',popular=>80};

sub shop {
    my ($stock,$price,$today,$yesterday)=@_;
    my @inventory=(0)x$MAX_ITEM;
    $inventory[9]=$stock;
    return {showcasecount=>1,showcase=>[10],price=>[$price],item=>\@inventory,
            itemtoday=>{10=>$today},itemyesterday=>{10=>$yesterday}};
}
@DT=(shop(5,100,2,1),shop(15,300,3,4));
GetMarketStatus();
is($ITEM[10]{todaystock},20,'B-05-A: 兩店陳列商品庫存 5+15=20');
is($ITEM[10]{todayprice},5000,'B-05-B: 售價加權總值 5*100+15*300=5000');
is($ITEM[10]{marketprice},250,'B-05-C: 單件加權平均售價 250');
is($ITEM[10]{marketpricelow},100,'B-05-D: 最低陳列價格 100');
is($ITEM[10]{marketpricehigh},300,'B-05-E: 最高陳列價格 300');
is($ITEM[10]{todaysale},5,'B-05-F: 本期商品銷量 2+3=5');
is($ITEM[10]{yesterdaysale},5,'B-05-G: 前期商品銷量 1+4=5');
is($ITEM[10]{uppoint},200,'B-05-H: 供需點數 int(20 / 8 * 80)=200');
ok(exists $marketitemlist{10},'B-05-I: 商品列入市場列表');
$ITEM[10]{popular}=1;
GetMarketStatus();
is($ITEM[10]{uppoint},10,'B-05-J: 供需點數下限 10');
$ITEM[10]{popular}=10000;
GetMarketStatus();
is($ITEM[10]{uppoint},1000,'B-05-K: 供需點數上限 1000');

sub reset_showcase {
    my ($stock,$itemno,$price)=@_;
    $DT={status=>1,id=>7,time=>$NOW_TIME-3600,
        showcasecount=>1,showcase=>[0],price=>[0],item=>[(0)x$MAX_ITEM],
        job=>'',icon=>1};
    $DT->{item}[9]=$stock;
    %Q=(no=>0,item=>$itemno,per=>100,prc=>$price,bk=>'sc');
    $commits=$writes=$logs=0;
}
sub execute_original_showcase {
    $last_error=''; $rendered=0;
    eval { do './sc-s.cgi' };
    return $last_error ? "GAME_ERROR:$last_error" :
           $rendered ? '__OUT_SKIN_CAPTURED__' : 'UNEXPECTED_EXIT';
}
reset_showcase(2,10,0);
like(execute_original_showcase(),qr/__OUT_SKIN_CAPTURED__/,
     'B-03-A: 真正執行原版 sc-s.cgi，直到輸出畫面');
is($DT->{showcase}[0],10,'B-03-B: 商品 ID 10 寫入第 0 格陳列棚');
is($DT->{price}[0],100,'B-03-C: per=100 對應標準定價 100');
is($NOW_TIME-$DT->{time},3000,'B-03-D: 陳列動作消耗 600 秒');
is($commits,1,'B-03-E: 成功陳列已呼叫 commit 替身');

reset_showcase(2,10,175);
like(execute_original_showcase(),qr/__OUT_SKIN_CAPTURED__/,
     'B-03-F: 指定售價能完成操作');
is($DT->{price}[0],175,'B-03-G: prc=175 覆蓋百分比定價');

reset_showcase(0,10,0);
like(execute_original_showcase(),qr/GAME_ERROR:.*在庫無し/,
     'B-03-H: 沒有庫存商品時拒絕陳列');
is($commits,0,'B-03-I: 缺貨操作不會 commit');

$ITEM[10]{flag}='s';
reset_showcase(2,10,0);
like(execute_original_showcase(),qr/GAME_ERROR:.*不正な要求/,
     'B-03-J: 商品帶有 s（禁止陳列）旗標時拒絕');
is($commits,0,'B-03-K: 禁止陳列不會 commit');
$ITEM[10]{flag}='';

reset_showcase(2,10,0);
$Q{no}=1;
like(execute_original_showcase(),qr/GAME_ERROR:.*不正な要求/,
     'B-03-L: 超出陳列架索引範圍時拒絕');

reset_showcase(2,0,0);
like(execute_original_showcase(),qr/__OUT_SKIN_CAPTURED__/,
     'B-03-M: 不陳列任何商品允許清空貨架');
is($DT->{showcase}[0],0,'B-03-N: 清空後陳列商品為 0');
is($DT->{price}[0],0,'B-03-O: 清空後陳列價格為 0');

done_testing();
