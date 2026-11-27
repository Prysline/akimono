use strict;
use warnings;
use utf8;
use Test::More;
use FindBin;
use File::Temp qw(tempdir);
use File::Path qw(make_path);
use Cwd qw(getcwd);
use Encode qw(decode_utf8 encode_utf8 FB_CROAK);
use Digest::SHA qw(sha1_hex);
use JSON::PP;

# Controlled source oracle, not a modern login implementation. All credentials
# are synthetic and all writes use an isolated temporary directory.
our ($DATA_DIR,$TEMP_DIR,$BACKUP_DIR,$FILE_EXT,$DATA_FILE,$COMMIT_FILE,
  $LASTTIME_FILE,$NOW_TIME,$BACKUP_TIME,$DTlasttime,$DTpeople,$DTnextid,
  $DTblockip,$DTTaxrate,$DTState,$DTtown,$MAX_ITEM,$MAX_MONEY,$LOCKED,
  $LOCKED_LEVEL,$LOCK_FILE,$AUTO_UNLOCK_TIME,$DTusercount,$STATE,
  @STATEnamelist,@DTindexnamelist,@DTwholestore,%DTevent,@DT,
  %id2idx,%name2idx,%name2pass,%Q,$DT,$DTid,$DTidx,$USER,$USERSESSION,
  $USERPASSURL,$USERPASSFORM,$GUEST_USER,$MASTER_USER,$COOKIESESSION,
  $SESSION_DIR,$SESSION_TIMEOUT_TIME,$DEFINE_FUNCINIT,$PASSWORD_CRYPT,
  $MASTER_PASSWORD,$NEW_SHOP_ADMIN,$NEW_OTHERTOWN_BLOCK,$NEW_SHOP_BLOCKIP,
  $NEW_SHOP_KEYWORD,$MAX_USER,$DEFINE_FUNCNEW,$DEFINE_FUNCNEW_NOLOG,
  $MYDIR,@OtherDir,@NG_SHOP_NAME,$MOBILE,$CHECK_IP,$TZ_JST,$ITEM_DIR,
  @image,$idx,$disp,$TB,$TR,$TD,$TRE,$TBE,$LOG_ERROR_FILE,$LOG_MARK_FILE,$SUBDATA_DIR,$LOG_DELETESHOP_FILE,$LOG_DIR,$LOG_SIZE_MAX,$ICON_NUMBER,$METHOD,@term,@ITEM,$g_define,$g_item,@errormsg,@dispmsg);
my %pins=(
  'pinned-colock.cgi'=>'99ff12db08135879e1a570cef1424f6dd5bec151',
  'pinned-inc-gd-entry.cgi'=>'f28cdcc1778534cbf1c84195df7ab749519be5a6',
  'pinned-army.cgi'=>'cd29bcbfe52bac84794c4c79426bd559d7616d85',
  'pinned-guild.cgi'=>'6593aa8a3ae4a1695c2418f12a3776f0053454ac',
  'pinned-gd-m.cgi'=>'b18dd3166709e270e5cb2d525ce404bca80551ca',
  'pinned-inc-dragon.cgi'=>'76bb00f247733630cbcc374a82f693638f653b71',
  'pinned-drreada.cgi'=>'01110533ae1a223f687f13b02f0aaeebd30c3155',
  'pinned-drreadb.cgi'=>'1b13a1a855490c80c88b0fa117676c68b6440753',
  'pinned-drreadc.cgi'=>'f363bcdab6022581976b6b99dd5e095b51f5f238',
  'pinned-drwrite.cgi'=>'0abc25f24ea6bd06576d5d1ba31eeb82419a2fee',
  'period.cgi'=>'6183e88e9dd69a16606a1064c8084e9a1411dbd5',
  'inc-func.cgi'=>'e7a8add7b0291901e71fe797783b664dff1568a0',
  'core-detail.cgi'=>'9a83d26fb29edee4032958f1e6de837a250f3384',
  'new.cgi'=>'9f0a590a6f1d4e93d2534056a0dc96c4d5c80ba7',
  'write.cgi'=>'203f33b37511e838800a45b84183af98fcf46e4c',
  'lock.cgi'=>'84382170f1b7f70348c4e2a91bf30b1d1043b964',
  'pinned-login.cgi'=>'1e5963c52a4ca82d75922b5a1ca3b3db14fef436',
  'pinned-ip.cgi'=>'2624e31edd1966c9535b9dd43dbce003d8ffa9a7',
  'pinned-name.cgi'=>'ae3b3a862fc78b8775795ed88d5d1911861b3d80',
  'pinned-time.cgi'=>'e164091d4dc6de084bb4770e0b9b4bf6005d9f3f',
  'pinned-membership-user.cgi'=>'8e817c535d4cd17e68d65f0e2f67846a344b5094',
  'pinned-other.cgi'=>'2463a62fb4cac2364a7c8c7f8f0823d619396157',
  'pinned-error.cgi'=>'16b619dffd91a3b67095177b7da464de264f1aa3',
  '../../../_config.cgi'=>'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0',
  'pinned-user.cgi'=>'46fe3b13e68ee83997aa919125ab210372af2822',
  'inc-makeitem.cgi'=>'1da8cce1e76ad6159325a37faec68efaa82c7f69',
  '../../../custom/inc-item-data.cgi'=>'7a18185e98b32aee82ca1ce30d6f3c395157dbcb',
);
sub raw_file {
  my ($path)=@_;
  open my $fh,'<:raw',$path or die "read $path: $!";
  local $/; my $bytes=<$fh>; close $fh or die "close $path: $!";
  return defined($bytes)?$bytes:'';
}
sub put_file {
  my ($path,$bytes)=@_;
  open my $fh,'>:raw',$path or die "write $path: $!";
  print {$fh} $bytes; close $fh or die "close $path: $!";
}
my %source;
for my $name (sort keys %pins) {
  my $bytes=raw_file("$FindBin::Bin/$name");
  my $got=sha1_hex('blob '.length($bytes)."\0".$bytes);
  is($got,$pins{$name},"exact original blob $name");
  BAIL_OUT("source pin drift: $name") if $got ne $pins{$name};
  $source{$name}=decode_utf8($bytes,FB_CROAK);
}
sub block {
  my($s,$start,$end)=@_;
  my $a=index($s,$start); my $b=index($s,$end,$a+length($start));
  die "missing original block $start" if $a<0 || $b<0;
  return substr($s,$a,$b-$a);
}
my $func=$source{'inc-func.cgi'};
my($names)=$func=~/\@DTindexnamelist=\s*qw\s*\(([^)]*)\)/s;
my($states)=$func=~/\@STATEnamelist=\s*qw\s*\(([^)]*)\)/s;
@DTindexnamelist=split(/\s+/,$names=~s/^\s+|\s+$//gr);
@STATEnamelist=split(/\s+/,$states=~s/^\s+|\s+$//gr);
die 'original schema drift' unless @DTindexnamelist==32 && @STATEnamelist==11;
for my $part (
  block($func,"sub GetPath\n{","#携帯端末系"),
  block($func,"sub GetCookieSession\n{","sub DataRead"),
  block($func,"sub DataRead\n{","sub GetDTPoint"),
  block($func,"sub GetDTPoint\n{","sub CheckUserPass"),
  block($func,"sub CheckUserPass\n{","sub Get02D"),
  block($source{'core-detail.cgi'},"sub SortDT\n{","sub GetRankMessage"),
  substr($func,index($func,'package AutoVar;')),
) {
  my $ok=eval "package main; no strict; no warnings; use utf8;\n".$part."\n1;";
  die "original block compilation: $@" unless $ok;
}
# These are trace adapters for nonessential presentation/log/error boundaries.
# Original Lock/UnLock, DataRead/Write/Commit, name/IP checks and login code run.
my ($rendered,$logs,$renewed)=(0,0,0); my(@logCalls,@archiveCalls,@renewSnapshots);
sub l {my($s,@a)=@_;for my $i(0..$#a){my $n=$i+1;$s=~s/%$n/$a[$i]/g}return $s;}
sub GetTagImgKao { return ''; }
sub PushLog { ++$logs; push @logCalls,[@_];return 1; }
sub RenewLog { ++$renewed; push @renewSnapshots,{time=>$DT->{time},hasTime=>exists $DT->{time},keys=>[sort keys %$DT]};return 1; }
sub OutSkin { ++$rendered; die "__SOURCE_RENDER__\n"; }
sub OutError { die "GAME_ERROR:".$_[0]."\n"; }
sub OutErrorBlockLogin { die "BLOCK_LOGIN:".$_[0]."\n"; }
sub WriteErrorLog {die "unexpected source IO error\n" unless $_[1] eq $LOG_DELETESHOP_FILE;push @archiveCalls,[@_];return 1;}
sub RequireFile {die 'unexpected source include' unless $_[0] eq 'inc-html-ownerinfo.cgi';return 1;}
for my $name (qw(write.cgi lock.cgi pinned-login.cgi pinned-ip.cgi pinned-name.cgi pinned-time.cgi pinned-user.cgi)) {
  require "$FindBin::Bin/$name";
}
# Reuse the already reviewed real source DataWrite/Commit one-shop fixture.
open my $child,'-|',$^X,"$FindBin::Bin/original-r4-data-write-files-probe.pl"
  or die "start original write probe: $!";
binmode $child,':raw';
my $json; { local $/; $json=<$child>; }
close $child or die 'original write probe failed';
my $fixture=JSON::PP->new->utf8->decode($json)->{cases}[0]{live};
my @initial=split(/\n/,$fixture);
my @alice=split(/,/,$initial[6],-1);
die 'fixture identity drift' unless $alice[0]==1 && $alice[2] eq 'alice';
# Controlled password only, not a historical player's data.
my %column=map { $DTindexnamelist[$_]=>$_ } 0..$#DTindexnamelist;
$alice[$column{pass}]='alpha_pw';
# The old write probe initializes unused text fields as numeric zero;
# original CheckLogin treats any nonempty blocklogin other than 'mark' as denial.
$alice[$column{blocklogin}]='';
$alice[$column{nocheckip}]='';
$initial[6]=join(',',@alice);
my $root=tempdir('akimono-r4-identity-XXXX',TMPDIR=>1,CLEANUP=>1);
my $cwd=getcwd();
$MYDIR='street';
$DATA_DIR="$root/$MYDIR/data";
$TEMP_DIR="$DATA_DIR/temp";
$BACKUP_DIR="$DATA_DIR/backup";
$SESSION_DIR="$DATA_DIR/session";
make_path($TEMP_DIR,$BACKUP_DIR,$SESSION_DIR);
chdir "$root/$MYDIR" or die 'enter isolated street';
$FILE_EXT='.cgi'; $DATA_FILE='play'; $COMMIT_FILE='commit'; $LASTTIME_FILE='lasttime';
$LOCK_FILE='street-lock'; $LOCKED=''; $LOCKED_LEVEL=0; $AUTO_UNLOCK_TIME=120;
$NOW_TIME=1_000_000; $BACKUP_TIME=3600; $SESSION_TIMEOUT_TIME=600; $TZ_JST=9*3600;
$MAX_ITEM=79; $MAX_MONEY=1_000_000_000; $MAX_USER=50; $STATE={};
$MASTER_PASSWORD='fixture-admin'; $PASSWORD_CRYPT=0; $DEFINE_FUNCINIT=0;
$NEW_SHOP_ADMIN=0; $NEW_OTHERTOWN_BLOCK=0; $NEW_SHOP_BLOCKIP=0;
$NEW_SHOP_KEYWORD=''; $DEFINE_FUNCNEW=0; $DEFINE_FUNCNEW_NOLOG=0;
$CHECK_IP=0; $MOBILE=0; @NG_SHOP_NAME=(); @OtherDir=();
$TB=$TR=$TD=$TRE=$TBE='';
for my $key (qw(HTTP_VIA HTTP_SP_HOST HTTP_CLIENT_IP HTTP_FROM HTTP_FORWARDED
  HTTP_X_FORWARDED_FOR HTTP_REFERER HTTP_COOKIE)) { $ENV{$key}=''; }
$ENV{REMOTE_ADDR}='192.0.2.5'; $ENV{HTTP_USER_AGENT}='source-fixture';
$ENV{HTTP_ACCEPT}='text/html';
put_file("$DATA_DIR/play.cgi",encode_utf8(join("\n",@initial)."\n"));
put_file("$DATA_DIR/lasttime.cgi",'time');
put_file("$DATA_DIR/user.cgi",'');
put_file("$DATA_DIR/$LOCK_FILE",'held by nobody');
put_file("$BACKUP_DIR/play.cgi",'fresh backup');
utime($NOW_TIME-1,$NOW_TIME-1,"$BACKUP_DIR/play.cgi") or die 'backup timestamp';

sub auth {
  my(%args)=@_;
  local %Q=(nm=>$args{name}//'',pw=>$args{password}//'',ss=>$args{token}//'',key=>'');
  local $ENV{HTTP_COOKIE}=$args{cookie}//'';
  local $ENV{REMOTE_ADDR}=$args{ip}//'192.0.2.5';
  $MASTER_USER=$GUEST_USER=0; $DT=undef; $DTid=$DTidx=-99; $USERSESSION='';
  my ($out,$ok,$error);
  {
    local *STDOUT;
    open STDOUT,'>',\$out or die 'capture cookie output';
    $ok=eval { CheckUserPass($args{guest}//0); 1; };
    $error=$@;
  }
  return {ok=>$ok?1:0,error=>$error,id=>$DTid,index=>$DTidx,token=>$USERSESSION,
    guest=>$GUEST_USER,cookie=>$COOKIESESSION};
}
sub registration {
  my(%args)=@_;
  local %Q=(admin=>'',name=>$args{name},sname=>$args{shop},
    pass1=>'beta_pw',pass2=>'beta_pw',icon=>3,newkey=>'');
  local $ENV{REMOTE_ADDR}=$args{ip};
  do "$FindBin::Bin/new.cgi";
  my $error=$@;
  # The real OutError renderer is not executed in this oracle. If a denial
  # occurred under the real lock, clean it up explicitly in the harness.
  UnLock() if $LOCKED ne '';
  return $error;
}

# Bounded actual compiler functions. No top-level DeleteItemData or game install.
my $compiler=$source{'inc-makeitem.cgi'};
for my $name(qw(GetLine GetTime GetNumber GetString GetDefineString GetItemNumber ClearBuffer GetBuffer GetFuncItemNo GetFuncValue OutFunctionData)){
  my($part)=$compiler=~/(^sub \Q$name\E\n\{[\s\S]*?^\}\n)/m;
  die "compiler source missing $name" unless defined $part;
  eval "package main; no strict; no warnings; use utf8;\n$part\n1;" or die "compiler $name: $@";
}
my $dsl=$source{'../../../custom/inc-item-data.cgi'};
$g_define={cmdhead=>'@@',cmdfoot=>'',function=>{},scale=>'個'};
my($define)=$dsl=~/^\@\@DEFINE\b[^\n]*\n([\s\S]*?)(?=^\@\@ITEM\b)/m;
my($funcnew)=$dsl=~/^\@\@FUNCNEW\b[^\n]*\n([\s\S]*?)(?=^\@\@FUNCSHOPIN\b)/m;
die 'missing source sections' unless defined $define && defined $funcnew;
sub feed {
  my($mode,$text,$filter)=@_;
  my $bytes=encode_utf8($text);open my $fh,'<:encoding(UTF-8)',\$bytes or die $!;
  while(my $line=GetLine($fh)){next if $filter && $line!~$filter;GetBuffer($mode,$line);}
  close $fh;
}
feed('define',$define,qr/\sset\s+NewShop(?:Money|Time|Item)\s/i);
is($g_define->{NewShopMoney},'100000','actual compiler DEFINE money');
is($g_define->{NewShopTime},'12*60*60','actual compiler DEFINE time expression');
@ITEM=();
# The source compiler changes mode at indented, case-insensitive @@use.
# Stop at the first directive, rather than letting USE names overwrite ITEM.
my %seenItemNo;
while($dsl=~/^\@\@ITEM\b[^\n]*\n([\s\S]*?)(?=^[\t ]*\@\@(?:ITEM|USE|EVENT|FUNC\w+|END)\b|\z)/mgi){
  my $itemHeader=$1;
  die 'nested directive leaked into ITEM identity slice' if $itemHeader=~/^[\t ]*\@\@/m;
  ClearBuffer('item');feed('item',$itemHeader,qr/^\s*(?:no|code|name)\s/i);
  die 'missing compiler ITEM identity' unless $g_item->{no} && $g_item->{name};
  die 'duplicate compiler ITEM number' if $seenItemNo{$g_item->{no}}++;
  $ITEM[$g_item->{no}]={map {$_=>$g_item->{$_}} qw(no name code)};
}
is(scalar(grep {defined $_} @ITEM),79,'actual source ITEM identity compiler rows');
is($ITEM[63]{name},'展示架擴建拆卸工具','FUNCNEW source item 63');
is($ITEM[79]{name},'禮物卷','FUNCNEW source item 79');
is($ITEM[63]{code},'edit-showcase','FUNCNEW item 63 source code');
is($ITEM[79]{code},'gift','FUNCNEW item 79 source code');
is($g_define->{NewShopItem},'展示架擴建拆卸工具:1:禮物卷:5','actual compiler DEFINE initial item names');
feed('funcnew',$funcnew,undef);
$ITEM_DIR="$root/$MYDIR/compiled";make_path($ITEM_DIR);
OutFunctionData();
is_deeply(\@errormsg,[],'original compiler emitted FUNCNEW without errors');
ok(-f "$ITEM_DIR/funcnew.cgi",'actual original OutFunctionData output');
$SUBDATA_DIR="$DATA_DIR/subdata";make_path($SUBDATA_DIR);
$LOG_DELETESHOP_FILE='delete';$ICON_NUMBER=25;$METHOD='METHOD=POST';@term=();
my @subNames=qw(1-alpha.cgi 1-beta.cgi 1-.cgi 10-alpha.cgi 2-keep.cgi 1-CAPS.CGI index.html);
sub subNames {
  opendir my $d,$SUBDATA_DIR or die $!;my @f=sort grep {$_ ne '.'&&$_ ne '..'} readdir($d);closedir $d;return \@f;
}
sub reset_case {
  my($age,$compiled,$stableId)=@_;
  my @rows=@initial;my @s=split(/,/,$rows[6],-1);
  if(defined $stableId){
    die 'controlled stable ID required' unless $stableId==100;
    $s[$column{id}]=$stableId;
    my @header=split(/,/,$rows[1],-1);$header[1]=$stableId+1;$rows[1]=join(',',@header);
  }
  $s[$column{foundation}]=$NOW_TIME-$age;$s[$column{remoteaddr}]='192.0.2.5';
  $s[$column{guild}]=7;$rows[6]=join(',',@s);
  put_file("$DATA_DIR/play.cgi",encode_utf8(join("\n",@rows)."\n"));
  unlink "$SUBDATA_DIR/$_" for @{subNames()};
  put_file("$SUBDATA_DIR/$_",'synthetic subdata') for @subNames;
  if(defined $stableId){put_file("$SUBDATA_DIR/$_",'synthetic stable subdata') for ('100-alpha.cgi','1000-keep.cgi');}
  unlink "$SESSION_DIR/alice.cgi" if -e "$SESSION_DIR/alice.cgi";
  $DEFINE_FUNCNEW=$compiled;delete $INC{"$ITEM_DIR/funcnew.cgi"};
  @logCalls=();@archiveCalls=();@renewSnapshots=();
  DataRead();my $auth=auth(name=>'alice',password=>'alpha_pw');
  die 'fixture login denied' unless $auth->{ok};return $auth->{token};
}
sub submit {
  my($file,$token,$mode,$confirm)=@_;
  local %Q=(nm=>'alice',ss=>$token,key=>'user',mode=>$mode,rss=>$confirm,cls=>$confirm);
  $MASTER_USER=$GUEST_USER=0;$disp='';
  my($out,$error);
  {local *STDOUT;open STDOUT,'>',\$out or die $!;
   do "$FindBin::Bin/$file";$error=$@;}
  UnLock() if $LOCKED ne '';
  return ($error,$out,$disp);
}
for my $age(10799,10800,10801){
  my $token=reset_case($age,1);
  my $before=raw_file("$DATA_DIR/play.cgi");
  my($e,$out,$form)=submit('pinned-other.cgi',$token,'','');
  like($e,qr/__SOURCE_RENDER__/,"source form rendered $age");
  is(($form=~/NAME=mode VALUE=restart/)?1:0,$age>10800?1:0,"normal form exact age $age");
  my($err)=submit('pinned-membership-user.cgi',$token,'restart','restart');
  if($age<10800){
    like($err,qr/GAME_ERROR:/,'raw source rejects 10799');
    is(raw_file("$DATA_DIR/play.cgi"),$before,'denied restart no publication');
    is_deeply(subNames(),[sort @subNames],'denied restart no subdata deletion');
    next;
  }
  like($err,qr/__SOURCE_RENDER__/,"actual raw restart handler accepted $age");
  is($renewSnapshots[0]{time},$NOW_TIME-43200,'compiled callback sets time before DataWrite');
  DataRead();my $s=$DT[$id2idx{1}];
  if($age==10801 && $ENV{AKIMONO_D_RESTART_WIRE_ORACLE}){
    # ASCII TAP note, only synthetic test fixture; not a production export.
    note('D_RESTART_WIRE '.JSON::PP->new->ascii->canonical->encode({
      before=>decode_utf8($before),after=>decode_utf8(raw_file("$DATA_DIR/play.cgi")),
      point=>0+$s->{point},now=>0+$NOW_TIME,
    }));
  }
  is($s->{money},100000,'actual source restart money');
  is($s->{rank},5010,'actual source restart rank');
  is($s->{point},5010,'actual reread point');
  is($s->{time},$NOW_TIME-43200,'actual reread time');
  is($s->{foundation},$NOW_TIME,'actual reread foundation');
  is($s->{showcasecount},1,'actual reread shelf count');
  is($s->{item}[62],1,'actual reread item63');is($s->{item}[78],5,'actual reread item79');
  ok(!$s->{guild},'source restart clears shop guild field');
  is($s->{pass},'alpha_pw','synthetic credential preserved');
  is_deeply(subNames(),[sort grep {$_!~/^1-.+\.cgi$/} @subNames],'source deletes only matching subdata');
  ok(-e "$SESSION_DIR/alice.cgi",'source separate session file preserved');
  ok(auth(name=>'alice',token=>$token)->{ok},'original existing session still resolves stable ID after restart');
  is_deeply($logCalls[0],[1,0,$s->{shopname}.'が気持ちを新たに出直しました。'],'source restart log arguments');
}
my $noCallback=reset_case(10801,0);
like((submit('pinned-membership-user.cgi',$noCallback,'restart','restart'))[0],qr/__SOURCE_RENDER__/,'controlled disabled FUNCNEW core wrapper');
ok($renewSnapshots[0]{hasTime}&&!defined $renewSnapshots[0]{time},'six-LHS/five-RHS source time undef before callback (disabled control)');
my $token=reset_case(10801,1);my $before=raw_file("$DATA_DIR/play.cgi");
like((submit('pinned-membership-user.cgi',$token,'cls','wrong'))[0],qr/GAME_ERROR:/,'wrong close confirmation');
is(raw_file("$DATA_DIR/play.cgi"),$before,'wrong close no publication');
my($err,$cookie)=submit('pinned-membership-user.cgi',$token,'cls','closeshop');
like($err,qr/__SOURCE_RENDER__/,'actual voluntary close wrapper completed');
like($cookie,qr/Set-Cookie: SESSION=-check-cookie-!\d+;/,'actual source clear-cookie marker');
is($USERPASSFORM,'','source clears hidden auth form');is($USERPASSURL,'','source clears auth URL');
is(scalar @archiveCalls,1,'actual CloseShop uses existing archive boundary once');
like($archiveCalls[0][0],qr/^自主閉店\n/,'actual archive reason at boundary');
is_deeply(subNames(),[sort grep {$_!~/^1-.+\.cgi$/} @subNames],'actual CloseShop removes same subdata selection');
ok(-e "$SESSION_DIR/alice.cgi",'raw close does not delete separate session file');
DataRead();ok(!exists $id2idx{1},'closed ID absent on actual reload');
is($DTblockip,'192.0.2.5','actual block IP written and reloaded');
ok(!auth(name=>'alice',token=>$token)->{ok},'old session rejected by missing active owner');
ok($LOCKED eq ''&&! -e "$DATA_DIR/commit.cgi",'actual commit and unlock complete');

# LC-B2: two real original active owners, controlled isolated registration,
# source auth directory cleanup, and the post-restart block-IP distinction.
sub two_shop_case {
  put_file("$DATA_DIR/user.cgi",'');
  my $aliceToken=reset_case(10801,1);
  $NEW_SHOP_BLOCKIP=1;delete $INC{"$ITEM_DIR/funcnew.cgi"};
  like(registration(name=>'bob',shop=>'second shop',ip=>'192.0.2.6'),qr/__SOURCE_RENDER__/,'actual second shop registration before lifecycle');
  DataRead();my $bobId=$DTnextid-1;
  ok($bobId!=1 && exists $id2idx{$bobId},'distinct source IDs');
  my $bobLogin=auth(name=>'bob',password=>'beta_pw',ip=>'192.0.2.6');
  ok($bobLogin->{ok},'second owner logs in through actual source');
  return ($aliceToken,$bobId);
}
for my $restartFirst(0,1){
  my($aliceToken,$bobId)=two_shop_case();
  if($restartFirst){
    delete $INC{"$ITEM_DIR/funcnew.cgi"};
    like((submit('pinned-membership-user.cgi',$aliceToken,'restart','restart'))[0],qr/__SOURCE_RENDER__/,'actual normal restart before close');
    DataRead();is($DT[$id2idx{1}]{remoteaddr},'','actual restart removes original stored remote address');
    ok(auth(name=>'alice',token=>$aliceToken)->{ok},'same source session valid after restart');
  }
  like((submit('pinned-membership-user.cgi',$aliceToken,'cls','closeshop'))[0],qr/__SOURCE_RENDER__/,'actual close after two-shop history');
  DataRead();ok(!exists $id2idx{1} && exists $id2idx{$bobId},'only closing owner removed');
  is($DTblockip,$restartFirst?'':'192.0.2.5','source close blockIP follows persisted source remoteaddr');
  my $before=raw_file("$DATA_DIR/play.cgi");
  like(registration(name=>'charlie',shop=>'third shop',ip=>'192.0.2.5'),qr/すでに店舗を持っています/,'stale raw login-directory row denies first registration');
  is(raw_file("$DATA_DIR/play.cgi"),$before,'first denial no publication');
  my $newBob=auth(name=>'bob',password=>'beta_pw',ip=>'192.0.2.6');
  ok($newBob->{ok},'actual active-owner password login prunes inactive names');
  ok(!GetIPList('192.0.2.5'),'actual GetIPList no longer sees closed owner after prune');
  my $next=$DTnextid;
  delete $INC{"$ITEM_DIR/funcnew.cgi"};
  my $error=registration(name=>'charlie',shop=>'third shop',ip=>'192.0.2.5');
  if($restartFirst){
    like($error,qr/__SOURCE_RENDER__/,'source registration allowed after restart-close and active-owner prune');
    DataRead();ok(exists $id2idx{$next} && $next!=1 && $next!=$bobId,'source next ID allocated, old ID not resurrected');
    is($DT[$id2idx{$next}]{name},'charlie','new owner not old closed actor');
  }else{
    like($error,qr/現在登録制限されています/,'direct close source blockIP still denies after prune');
    is(raw_file("$DATA_DIR/play.cgi"),$before,'blockIP denial no publication');
  }
}

# LC-B2 external retention: real lifecycle wrappers followed by separately
# invoked original readers/settlement. No implicit cleanup or modern publication.
our ($COMMON_DIR,$COTEMP_DIR,$GUILDBAL_FILE,%GUILD_DATA,%ARMY,%RIOT,
  @ENTRY,@MYENTRY,@ENTRYnamelist,$Ecount,
  @ST,@JK,@RC,@DR,@PR,@RD,@RDS,$STcount,$JKcount,$RCcount,$DRcount,$PRcount,$RDcount,
  @STnamelist,@JKnamelist,@RCnamelist,@DRnamelist,@PRnamelist,@RDnamelist,
  $MYST,$MYJK,$MYRC,@MYDR,@MYPR,%id2st,%id2jk,%id2rc,%id2dra,%id2pr);
$COMMON_DIR="$root/common";$COTEMP_DIR="$COMMON_DIR/temp";make_path($COTEMP_DIR);
$GUILDBAL_FILE='guildbal';
for my $name(qw(pinned-army.cgi pinned-guild.cgi pinned-drreada.cgi pinned-drreadb.cgi pinned-drreadc.cgi pinned-drwrite.cgi)){
  require "$FindBin::Bin/$name";
}
for my $name(qw(ST JK RC DR PR RD)){
  my $fieldName=$name.'namelist';
  my($fields)=$source{'pinned-inc-dragon.cgi'}=~/\@\Q$fieldName\E\s*=\s*qw\s*\(([^)]*)\)/s;
  die "missing dragon schema $name" unless defined $fields;
  no strict 'refs';
  @{"main::".$fieldName}=split(/\s+/,$fields=~s/^\s+|\s+$//gr);
}
my($entrySchema)=$source{'pinned-gd-m.cgi'}=~/\@ENTRYnamelist\s*=\s*qw\s*\(([^)]*)\)/s;
die 'missing invitation schema' unless defined $entrySchema;
@ENTRYnamelist=split(/\s+/,$entrySchema=~s/^\s+|\s+$//gr);
for my $pair (['pinned-gd-m.cgi','ReadEntry'],['period.cgi','DragonBalance']){
  my($file,$name)=@$pair;
  my($body)=$source{$file}=~/(^sub \Q$name\E\n\{[\s\S]*?^\}\n)/m;
  die "missing original reader $name" unless defined $body;
  eval "package main; no strict; no warnings; use utf8;\n$body\n1;" or die $@;
}
sub external_row {
  my($schema,$values)=@_;
  return join(',',map {exists $values->{$_}?$values->{$_}:0} @$schema)."\n";
}
my @dragonSets=(
  ['dra-st',\@STnamelist,\@ST,\%id2st,\&ReadStable,\&WriteStable,1],
  ['dra-jk',\@JKnamelist,\@JK,\%id2jk,\&ReadJock,\&WriteJock,1],
  ['dra-rc',\@RCnamelist,\@RC,\%id2rc,\&ReadRanch,\&WriteRanch,1],
  ['dra-pr',\@PRnamelist,\@PR,\%id2pr,\&ReadParent,\&WriteParent,1],
  ['dra-dr',\@DRnamelist,\@DR,\%id2dra,\&ReadDragon,\&WriteDragon,0],
);
for my $action(qw(restart cls)){
  my($aliceToken,$bobId)=two_shop_case();
  my %files=(
    "$DATA_DIR/army.cgi"=>"1,11,$bobId,22\n1,$bobId\n",
    "$DATA_DIR/guildbal.cgi"=>"7\tmoney\t12345\tin\t234\tout\t12\n",
    "$COMMON_DIR/7.pl"=>"fixture role file: intentionally opaque to lifecycle wrapper\n",
    "$COMMON_DIR/entry.cgi"=>"1,".($NOW_TIME+60).",$MYDIR,1,7\n2,".($NOW_TIME+60).",other,1,7\n3,".($NOW_TIME-1).",$MYDIR,1,7\n",
    "$COMMON_DIR/drapay-$MYDIR.cgi"=>"1\t90\n$bobId\t30\n",
    "$COMMON_DIR/drapay-other.cgi"=>"1\t700\n",
    "$COMMON_DIR/dra-rd0.cgi"=>"1,2,3\n".external_row(\@RDnamelist,{no=>101,dr=>101,name=>'race-row'}),
  );
  for my $set(@dragonSets){
    my($file,$schema)=@$set;
    $files{"$COMMON_DIR/$file.cgi"}=join('',map {
      external_row($schema,{no=>$_->[0],owner=>$_->[1],town=>$_->[2],
        name=>$_->[3],birth=>$NOW_TIME-100,fm=>1,prize=>10})
    } ([101,1,$MYDIR,'local-alice'],[102,1,'other','other-alice'],[103,$bobId,$MYDIR,'local-bob']));
  }
  put_file($_,$files{$_}) for keys %files;
  delete $INC{"$ITEM_DIR/funcnew.cgi"};
  my $confirmation=$action eq 'restart'?'restart':'closeshop';
  like((submit('pinned-membership-user.cgi',$aliceToken,$action,$confirmation))[0],
    qr/__SOURCE_RENDER__/,"external source fixture actual $action");
  DataRead();
  my $active=$action eq 'restart';
  is(exists($id2idx{1})?1:0,$active?1:0,"$action exact active ID");
  ok(exists $id2idx{$bobId},"$action other owner retained");
  for my $file(sort keys %files){
    is(raw_file($file),$files{$file},"$action leaves raw external ".($file=~s{.*/}{}r)." unchanged");
  }
  # The next operation is explicitly separate from the lifecycle handler.
  $DT=$DT[$id2idx{$bobId}];
  ReadGuildData();
  is($GUILD_DATA{7}{money},12345,"$action guild ledger still read");
  ReadEntry();
  ok(defined($ENTRY[0])&&defined($ENTRY[1]),"$action unexpired invitations remain independent of active ID");
  ok(!defined($ENTRY[2]),"$action expired invite filtered on read only");
  is(raw_file("$COMMON_DIR/entry.cgi"),$files{"$COMMON_DIR/entry.cgi"},"$action invitation read does not write");
  ReadArmy();
  is($ARMY{1},11,"$action army count initially read even for inactive ID");
  is(exists($RIOT{1})?1:0,$active?1:0,"$action riot visibility follows active local ID");
  Lock();WriteArmy();DataCommitOrAbort();UnLock();
  ReadArmy();
  is(exists($ARMY{1})?1:0,$active?1:0,"$action army count filtered at later WriteArmy");
  is($ARMY{$bobId},22,"$action peer army retained");
  for my $set(@dragonSets){
    my($file,$schema,$rows,$index,$read,$write,$filtersInactive)=@$set;
    $read->();
    my $visible=$active||!$filtersInactive;
    is(defined($rows->[0])?1:0,$visible?1:0,"$action $file local row read visibility");
    is($index->{101},0,"$action $file original index exists before filter");
    is($rows->[1]{name},'other-alice',"$action $file cross-street same ID retained");
    is($rows->[2]{name},'local-bob',"$action $file active peer retained");
    $write->();
    my @expectedRows=split(/\n/,$files{"$COMMON_DIR/$file.cgi"});
    shift @expectedRows unless $visible;
    my $expected=join("\n",@expectedRows)."\n";
    is(raw_file("$COTEMP_DIR/$file.cgi"),$expected,"$action $file later writer stages visible rows");
    is(raw_file("$COMMON_DIR/$file.cgi"),$files{"$COMMON_DIR/$file.cgi"},"$action $file writer has not published common file");
    unlink "$COTEMP_DIR/$file.cgi" or die $!;
  }
  ReadRace(0);
  is($RD[0]{dr},101,"$action race entry not removed by owner lifecycle");
  my $bobBefore=$DT[$id2idx{$bobId}]{dragon}+0;
  my $aliceBefore=$active?$DT[$id2idx{1}]{dragon}+0:0;
  DragonBalance();
  ok(!-e "$COMMON_DIR/drapay-$MYDIR.cgi","$action later source settlement consumes local payout file");
  is($DT[$id2idx{$bobId}]{dragon},$bobBefore+30,"$action active peer receives pending payout");
  is($DT[$id2idx{1}]{dragon},$aliceBefore+90,'restart stable ID receives pending payout') if $active;
  ok(!exists $id2idx{1},'closed owner not recreated by payout') unless $active;
  is(raw_file("$COMMON_DIR/drapay-other.cgi"),$files{"$COMMON_DIR/drapay-other.cgi"},"$action other street payout untouched");
}


# LC-B2 actual two street registration and invitation join after lifecycle.
# Only preloaded guild definition is a controlled fixture; registration, auth,
# street/common locks, join, both writers/commits and subsequent reads are real.
our($COLOCKED,$COLOCKED_LEVEL,%GUILD,%GUILD_DETAIL,$GUILDIDX_name);
require "$FindBin::Bin/pinned-colock.cgi";
$COLOCKED='';$COLOCKED_LEVEL=0;
put_file("$COMMON_DIR/$LOCK_FILE",'available common lock');
%GUILD=(7=>['Guild Seven',0,0]);%GUILD_DETAIL=(7=>{member=>'Member'});
$GUILDIDX_name=0;
sub visit_other_street {
  my($fn)=@_;
  my $previous=getcwd();
  local $MYDIR='other';
  local $DATA_DIR="$root/$MYDIR/data";
  local $TEMP_DIR="$DATA_DIR/temp";
  local $BACKUP_DIR="$DATA_DIR/backup";
  local $SESSION_DIR="$DATA_DIR/session";
  local $SUBDATA_DIR="$DATA_DIR/subdata";
  local @OtherDir=('street');
  local $NEW_OTHERTOWN_BLOCK=1;
  chdir "$root/$MYDIR" or die $!;
  my $ok=eval { $fn->();1 };
  my $error=$@;
  chdir $previous or die $!;
  die $error unless $ok;
}
sub join_current_guild {
  my($name,$token)=@_;
  local %Q=(nm=>$name,ss=>$token,key=>'gd-m',edit=>'join',guild=>7);
  $MASTER_USER=$GUEST_USER=0;
  # Same lock order and source handler as gd-m.cgi, without its HTML renderer.
  my($out,$error);
  {local *STDOUT;open STDOUT,'>',\$out or die $!;
    eval { CoLock();Lock();DataRead();CheckUserPass();ReadEntry();
      my $ok=do "$FindBin::Bin/pinned-inc-gd-entry.cgi";
      die($@||$!||'source join returned false') unless $ok;
    };
    $error=$@;
  }
  UnLock() if $LOCKED ne '';
  CoUnLock() if $COLOCKED ne '';
  return $error;
}
my($localToken,$localPeer)=two_shop_case();
my $localData=$DATA_DIR;
my $otherData="$root/other/data";
make_path("$otherData/temp","$otherData/backup","$otherData/session","$otherData/subdata");
my @emptyStreet=@initial[0..5];
my @otherHeader=split(/,/,$emptyStreet[1],-1);
$otherHeader[1]=1;$otherHeader[2]='';$emptyStreet[1]=join(',',@otherHeader);
put_file("$otherData/play.cgi",encode_utf8(join("\n",@emptyStreet)."\n"));
put_file("$otherData/lasttime.cgi",'time');
put_file("$otherData/user.cgi",'');
put_file("$otherData/$LOCK_FILE",'held by nobody');
put_file("$otherData/backup/play.cgi",'fresh backup');
utime($NOW_TIME-1,$NOW_TIME-1,"$otherData/backup/play.cgi") or die $!;
my $otherToken;
visit_other_street(sub {
  my $before=raw_file("$DATA_DIR/play.cgi");
  like(registration(name=>'alice',shop=>'other street shop',ip=>'192.0.2.5'),
    qr/他の街ですでに店舗を持っています/,'actual enabled cross-street IP gate denies active local directory record');
  is(raw_file("$DATA_DIR/play.cgi"),$before,'cross-street gate denial no play publication');
  local $NEW_OTHERTOWN_BLOCK=0;
  delete $INC{"$ITEM_DIR/funcnew.cgi"};
  like(registration(name=>'alice',shop=>'other street shop',ip=>'192.0.2.5'),
    qr/__SOURCE_RENDER__/,'actual disabled cross-street gate permits registration');
  DataRead();
  is($DT[$id2idx{1}]{name},'alice','actual separate street allocated same numeric ID and owner name');
  ok(!auth(name=>'alice',token=>$localToken)->{ok},'local street token does not create other-street session');
  ok(!auth(name=>'alice',password=>'alpha_pw')->{ok},'local password not accepted for other street account');
  my $login=auth(name=>'alice',password=>'beta_pw',ip=>'192.0.2.5');
  ok($login->{ok}&&$login->{id}==1,'other street own password selects its own ID');
  $otherToken=$login->{token};
});
DataRead();
my $otherPlay=raw_file("$otherData/play.cgi");
my $otherDirectory=raw_file("$otherData/user.cgi");
my $otherSession=raw_file("$otherData/session/alice.cgi");
my $entryPath=GetPath($COMMON_DIR,'entry');
my $localEntry="1,".($NOW_TIME+60).",street,1,7\n";
my $otherEntry="2,".($NOW_TIME+60).",other,1,7\n";
put_file($entryPath,$localEntry.$otherEntry);
delete $INC{"$ITEM_DIR/funcnew.cgi"};
like((submit('pinned-membership-user.cgi',$localToken,'restart','restart'))[0],qr/__SOURCE_RENDER__/,'actual local restart before join');
is(raw_file($entryPath),$localEntry.$otherEntry,'both street invitations retained after restart');
DataRead();
ok(!$DT[$id2idx{1}]{guild},'restarted shop has no membership before join');
is(join_current_guild('alice',$localToken),'','actual restarted actor joins through source handler');
DataRead();
is($DT[$id2idx{1}]{guild},7,'source local join persists membership on reload');
is(raw_file($entryPath),$otherEntry,'actual common publication consumes local invitation only');
ok(-e "$COMMON_DIR/$LOCK_FILE"&&! -e GetPath($COMMON_DIR,$COMMIT_FILE),'actual common lock/marker cleared');
like((submit('pinned-membership-user.cgi',$localToken,'cls','closeshop'))[0],qr/__SOURCE_RENDER__/,'actual local voluntary close after join');
DataRead();
ok(!exists $id2idx{1} && exists $id2idx{$localPeer},'local close removes only local actor');
ok(!auth(name=>'alice',token=>$localToken)->{ok},'closed local actor no longer authenticates');
is(raw_file($entryPath),$otherEntry,'local close leaves other street invitation');
is(raw_file("$otherData/play.cgi"),$otherPlay,'local lifecycle and join do not alter other street play');
is(raw_file("$otherData/user.cgi"),$otherDirectory,'local lifecycle does not alter other street directory');
is(raw_file("$otherData/session/alice.cgi"),$otherSession,'local lifecycle does not alter other street session bytes');
visit_other_street(sub {
  DataRead();
  ok(auth(name=>'alice',token=>$otherToken)->{ok},'other street same numeric ID remains authenticated after local close');
  ok(!$DT->{guild},'other street actor has independent guild membership');
  is(join_current_guild('alice',$otherToken),'','actual other street actor joins using retained invitation');
  DataRead();
  is($DT[$id2idx{1}]{guild},7,'other street source membership persists');
  is(raw_file($entryPath),'','other street join consumes its own invitation');
});
DataRead();
ok(!exists $id2idx{1},'other street join does not resurrect closed local ID');


# Raw original session alias hazard: SESSION_DIR is keyed by owner name, not ID.
# The current modern authority must NOT accept this as authorized reuse.
my($retiredToken,$retiredPeer)=two_shop_case();
delete $INC{"$ITEM_DIR/funcnew.cgi"};
like((submit('pinned-membership-user.cgi',$retiredToken,'restart','restart'))[0],qr/__SOURCE_RENDER__/,'source same-name reuse setup restart');
# On this chain only, execute the actual pinned WriteErrorLog body rather
# than the trace adapter. A pre-existing oversized synthetic archive forces
# the original rotation; subsequent registration must not discard either file.
my $archiveBody=block($source{'pinned-error.cgi'},"sub WriteErrorLog\n{","sub OutErrorBlockLogin");
$archiveBody=~s/^sub WriteErrorLog/sub/ or die 'archive body drift';
my $actualArchive=eval "package main; no strict; no warnings; use utf8;\n".$archiveBody;
die "original archive compilation: $@" unless ref($actualArchive) eq 'CODE';
my ($archiveMax)=$source{'../../../_config.cgi'}=~/\$LOG_SIZE_MAX\s*=\s*(\d+);/;
die 'archive config drift' unless $archiveMax==30000;
my $archiveDir="$DATA_DIR/log";
make_path($archiveDir);
my $archiveLive=GetPath($archiveDir,'delete');
my $archiveOld=GetPath($archiveDir,'delete-old');
my $priorArchive='X'x($archiveMax+1);
put_file($archiveLive,$priorArchive);
{
  local $LOG_DIR=$archiveDir;local $LOG_SIZE_MAX=$archiveMax;
  local $ENV{SCRIPT_NAME}='/street/membership/user.cgi';
  local $ENV{REMOTE_HOST}='source-fixture.invalid';
  local *WriteErrorLog=$actualArchive;
  like((submit('pinned-membership-user.cgi',$retiredToken,'cls','closeshop'))[0],qr/__SOURCE_RENDER__/,'source same-name reuse setup close');
}
my $closedArchive=raw_file($archiveLive);
ok(length($closedArchive)>0 && $closedArchive ne $priorArchive,'real voluntary close writes current archive');
my $archiveText=decode_utf8($closedArchive);
ok(index($archiveText,'自主閉店')>=0,'real archive contains original close reason');
is(raw_file($archiveOld),$priorArchive,'actual WriteErrorLog retains rotated archive bytes');
my @archiveTimes=((stat($archiveLive))[9],(stat($archiveOld))[9]);
DataRead();
ok(!exists $id2idx{1},'source original actor inactive before re-registration');
ok(!auth(name=>'alice',token=>$retiredToken)->{ok},'source old token rejected while name inactive');
my $retiredSession=raw_file("$SESSION_DIR/alice.cgi");
ok(auth(name=>'bob',password=>'beta_pw',ip=>'192.0.2.6')->{ok},'source peer prunes inactive owner name');
ok(!GetIPList('192.0.2.5'),'source original IP row pruned');
my $replacementId=$DTnextid;
delete $INC{"$ITEM_DIR/funcnew.cgi"};
like(registration(name=>'alice',shop=>'replacement shop',ip=>'192.0.2.5'),qr/__SOURCE_RENDER__/,'raw original same-name re-registration before password login');
DataRead();
ok($replacementId!=1 && exists $id2idx{$replacementId},'replacement name has distinct source shop ID');
is(raw_file("$SESSION_DIR/alice.cgi"),$retiredSession,'raw new.cgi does not overwrite prior name-keyed session');
my $alias=auth(name=>'alice',token=>$retiredToken);
ok($alias->{ok},'raw original name-keyed old session accepted before new password login (known source hazard)');
is($alias->{id},$replacementId,'raw original old token resolves replacement ID, not old ID');
is(raw_file($archiveLive),$closedArchive,'actual re-registration and DataRead preserve current close archive');
is(raw_file($archiveOld),$priorArchive,'actual re-registration preserves rotated archive');
is_deeply([(stat($archiveLive))[9],(stat($archiveOld))[9]],\@archiveTimes,'re-registration does not touch archive mtimes');
ok(!auth(name=>'alice',password=>'alpha_pw')->{ok},'retired account password not accepted by replacement account');
ok(auth(name=>'alice',password=>'beta_pw')->{ok},'replacement account password accepted');
# Do not assert random regenerated token differs: source token collision is possible.
# No real credentials are emitted, and no change to modern auth or public policy.

# Separate controlled single active source ID100, not a second formal world.
my $stableToken=reset_case(10801,1,100);
my $stableBefore=raw_file("$DATA_DIR/play.cgi");
like((submit('pinned-membership-user.cgi',$stableToken,'restart','restart'))[0],qr/__SOURCE_RENDER__/,'actual source restart stable shop ID100');
DataRead();
ok(@DT==1 && exists $id2idx{100} && !exists $id2idx{1},'actual stable restart retains same ID');
my $stableShop=$DT[$id2idx{100}];
is($DTnextid,101,'actual stable restart preserves canonical allocator');
is($stableShop->{point},5010,'actual stable restart reread point');
is_deeply(subNames(),[sort @subNames,'1000-keep.cgi'],'stable restart removes only ID100 subdata');
ok(auth(name=>'alice',token=>$stableToken)->{ok},'actual stable restart preserves source token');
if($ENV{AKIMONO_D_RESTART_STABLE_ID_ORACLE}){
  note('D_RESTART_STABLE_WIRE '.JSON::PP->new->ascii->canonical->encode({
    before=>decode_utf8($stableBefore),after=>decode_utf8(raw_file("$DATA_DIR/play.cgi")),
    point=>0+$stableShop->{point},now=>0+$NOW_TIME,
  }));
}
chdir $cwd or die 'restore cwd';
done_testing();
