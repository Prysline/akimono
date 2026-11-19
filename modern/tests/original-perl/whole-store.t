use strict;
use warnings;
use utf8;
use Test::More;
binmode STDOUT, ':encoding(UTF-8)';
our (@DTwholestore,@ITEM,@DT,$MAX_ITEM);
sub l { return $_[0]; }
require './whole.cgi';
$MAX_ITEM=79;
@ITEM=map { {} } 0..$MAX_ITEM;
$ITEM[5]={code=>'plain',sort=>2,price=>30,pricehalf=>0,pricebase=>0,wslimit=>100};
$ITEM[10]={code=>'dynamic',sort=>1,price=>100,pricebase=>10,pricehalf=>10,wslimit=>20};
$ITEM[11]={code=>'small',sort=>3,price=>100,pricebase=>0,pricehalf=>1,wslimit=>-10};
@DTwholestore=(0)x$MAX_ITEM;
$DTwholestore[4]=5;
$DTwholestore[9]=20;
$DTwholestore[10]=1000;

my $market=GetWholeStore();
is($market->{shopname},'市場','B-04-A: 原始市場商店名稱');
is($market->{showcasecount},3,'B-04-B: 只展出有庫存的三項商品');
is_deeply($market->{showcase},[10,5,11],'B-04-C: 按商品 sort 欄位排序，不按 ID');
is_deeply($market->{price},[50,30,1],'B-04-D: 浮動價、固定價與最低價格為 1');
is($market->{item}[9],20,'B-04-E: 商品 ID 10 對應庫存陣列索引 9');
is($market->{item}[4],5,'B-04-F: 商品 ID 5 對應庫存陣列索引 4');
is($market->{item}[10],1000,'B-04-G: 商品 ID 11 對應庫存陣列索引 10');

@DT=({item=>[(0)x$MAX_ITEM]}, {item=>[(0)x$MAX_ITEM]});
$DT[0]{item}[9]=10;
$DT[1]{item}[9]=10;
$DTwholestore[9]=30;
$DTwholestore[4]=-7;
CheckWholeStore();
is($DTwholestore[9],20,'B-04-H: 每店上限20 × 2店減自有庫存20＝市場上限20');
is($DTwholestore[4],0,'B-04-I: 市場負庫存裁為零');
is($DTwholestore[10],10,'B-04-J: 負數 wslimit=-10 表示固定絕對上限10');

my @incoming=(0)x$MAX_ITEM;
$incoming[9]=7;
$incoming[4]=3;
SetWholeStore({item=>\@incoming});
is($DTwholestore[9],7,'B-04-K: SetWholeStore 回存 ID10 索引9');
is($DTwholestore[4],3,'B-04-L: SetWholeStore 回存 ID5 索引4');
is($DTwholestore[10],0,'B-04-M: SetWholeStore 清除其他商品存量');

done_testing();
