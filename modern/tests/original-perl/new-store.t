use strict;
use warnings;
use utf8;
use Test::More;
binmode STDOUT, ':encoding(UTF-8)';
our (%Q,%name2pass,@image,@DT,$DT,$DTusercount,$DTnextid,$DTlasttime,$NOW_TIME,
     $MAX_ITEM,$MASTER_PASSWORD,$PASSWORD_CRYPT,$DEFINE_FUNCNEW,$DEFINE_FUNCNEW_NOLOG,
     $NEW_SHOP_ADMIN,$NEW_SHOP_BLOCKIP,$NEW_OTHERTOWN_BLOCK,$NEW_SHOP_KEYWORD,
     $MAX_USER,$DTblockip,$ITEM_DIR,$DTusercount,$idx,$disp,$TB,$TR,$TD,$TRE,$TBE);
our ($writes,$commits,$logs,$unlocks);
sub l { return $_[0]; }
sub OutError { die "GAME_ERROR:".$_[0]."\n"; }
sub GetTagImgKao { return ''; }
sub CheckNGName { return 0; }
sub GetDoubleName { return 0; }
sub GetTrueIP { return '192.0.2.5'; }
sub Lock { return 1; }
sub UnLock { ++$unlocks; return 1; }
sub DataRead { return 1; }
sub DataWrite { ++$writes; return 1; }
sub DataCommitOrAbort { ++$commits; return 1; }
sub PushLog { ++$logs; return 1; }
sub RenewLog { return 1; }
sub OutSkin { die "__OUT_SKIN_CAPTURED__\n"; }

$NOW_TIME=1_000_000;
$MAX_ITEM=79;
$MAX_USER=50;
$MASTER_PASSWORD='test-admin';
$PASSWORD_CRYPT=0;
$DEFINE_FUNCNEW=0;
$NEW_SHOP_ADMIN=0;
$NEW_SHOP_BLOCKIP=0;
$NEW_OTHERTOWN_BLOCK=0;
$NEW_SHOP_KEYWORD='';
$DTusercount=0;
$DTnextid=42;
$TB=$TR=$TD=$TRE=$TBE='';
%Q=(admin=>$MASTER_PASSWORD,sname=>'測試標準街',name=>'測試店主',
    pass1=>'abc12345',pass2=>'abc12345',icon=>'3');

my $result=eval { do './new.cgi' };
like($@, qr/__OUT_SKIN_CAPTURED__/, 'B-01-A: 原版 new.cgi 真正執行至畫面輸出節點');
is($DT->{id},42, 'B-01-B: 開店配置下個商店 ID');
is($DT->{status},1, 'B-01-C: 新店營運狀態 1');
is($DT->{money},100_000, 'B-01-D: Core 預設初始資金 100000');
is($DT->{time},$NOW_TIME-12*3600,'B-01-E: Core 預設 12 小時');
is($DT->{showcasecount},1,'B-01-F: 初始陳列棚 1 個');
is($DT->{showcase}[0],0,'B-01-G: 初始展示空白');
is($DT->{price}[0],0,'B-01-H: 初始展示價格零');
is($DT->{rank},5010,'B-01-I: 初始人氣值 5010');
is($DT->{item}[62],0,'B-01-J: 未編譯 FUNCNEW 時商品 63 尚未注入');
is($DT->{item}[78],0,'B-01-K: 未編譯 FUNCNEW 時商品 79 尚未注入');
is(scalar @{$DT->{item}},79,'B-01-L: 商品庫存初始化 79 個槽');
is($DT->{lastlogin},$NOW_TIME,'B-01-M: 登入時間同步');
is($DT->{foundation},$NOW_TIME,'B-01-N: 建立時間同步');
is($DT->{remoteaddr},'192.0.2.5','B-01-O: 新店 remoteaddr');
is($writes,1,'B-01-P: 呼叫 DataWrite（隔離替身）');
is($commits,1,'B-01-Q: 呼叫 DataCommitOrAbort（隔離替身）');
is($unlocks,1,'B-01-R: 呼叫 UnLock（隔離替身）');
done_testing();
