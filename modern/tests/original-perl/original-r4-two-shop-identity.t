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
  @image,$idx,$disp,$TB,$TR,$TD,$TRE,$TBE,$LOG_ERROR_FILE,$LOG_MARK_FILE);
my %pins=(
  'inc-func.cgi'=>'e7a8add7b0291901e71fe797783b664dff1568a0',
  'core-detail.cgi'=>'9a83d26fb29edee4032958f1e6de837a250f3384',
  'new.cgi'=>'9f0a590a6f1d4e93d2534056a0dc96c4d5c80ba7',
  'write.cgi'=>'203f33b37511e838800a45b84183af98fcf46e4c',
  'lock.cgi'=>'84382170f1b7f70348c4e2a91bf30b1d1043b964',
  'pinned-login.cgi'=>'1e5963c52a4ca82d75922b5a1ca3b3db14fef436',
  'pinned-ip.cgi'=>'2624e31edd1966c9535b9dd43dbce003d8ffa9a7',
  'pinned-name.cgi'=>'ae3b3a862fc78b8775795ed88d5d1911861b3d80',
  'pinned-time.cgi'=>'e164091d4dc6de084bb4770e0b9b4bf6005d9f3f',
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
my ($rendered,$logs,$renewed)=(0,0,0);
sub l { return $_[0]; }
sub GetTagImgKao { return ''; }
sub PushLog { ++$logs; return 1; }
sub RenewLog { ++$renewed; return 1; }
sub OutSkin { ++$rendered; die "__SOURCE_RENDER__\n"; }
sub OutError { die "GAME_ERROR:".$_[0]."\n"; }
sub OutErrorBlockLogin { die "BLOCK_LOGIN:".$_[0]."\n"; }
sub WriteErrorLog { die "unexpected source IO error\n"; }
for my $name (qw(write.cgi lock.cgi pinned-login.cgi pinned-ip.cgi pinned-name.cgi pinned-time.cgi)) {
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

DataRead();
is($DTnextid,3,'initial next ID from original fixture');
is($name2idx{alice},0,'initial owner index');
my $bad_password=auth(name=>'alice',password=>'wrong_fixture_pw');
ok(!$bad_password->{ok},'original incorrect password denied');
like($bad_password->{error},qr/GAME_ERROR:incorrect/,'original password rejection reason');
ok(!-e "$SESSION_DIR/alice.cgi",'password rejection created no session file');
my $alice_login=auth(name=>'alice',password=>'alpha_pw');
ok($alice_login->{ok},'original password login accepted');
is($alice_login->{id},1,'original authentication selects Alice ID');
like($alice_login->{token},qr/^[0-9A-Za-z]{5}$/,'original session file token shape (fixture only)');
my $alice_token=$alice_login->{token};
my $before=raw_file("$DATA_DIR/play.cgi");
$NOW_TIME+=60;
like(registration(name=>'bob',shop=>'second shop',ip=>'192.0.2.6'),
  qr/__SOURCE_RENDER__/,'actual new.cgi completed second registration');
is($rendered,1,'registration reached rendering adapter');
is($logs,1,'registration called log adapter');
is($renewed,1,'registration called renew-log adapter');
ok(-e "$DATA_DIR/$LOCK_FILE" && $LOCKED eq '','real lock returned');
ok(!-e "$DATA_DIR/commit.cgi" && !-e "$TEMP_DIR/play.cgi",'real source commit cleared staging');
my $created=raw_file("$DATA_DIR/play.cgi");
isnt($created,$before,'original published new shop bytes');
my @rows=split(/\n/,$created);
is(scalar(@rows),10,'source play contains two active shops');
my @header=split(/,/,$rows[1],-1);
is($header[1],3,'raw newly written header still contains allocated ID');
is((split(/,/,$rows[6],-1))[0],3,'new higher-ranked Bob sorted first');
is((split(/,/,$rows[8],-1))[0],1,'Alice sorted second');

DataRead();
is($DTnextid,4,'actual DataRead repairs next ID after new-shop publication');
if($ENV{R4_LIFECYCLE_HEADER_EVIDENCE}){
  my @priorRows=split(/\n/,$before);
  my @priorHeader=split(/,/,$priorRows[1],-1);
  note('R4_HEADER_JSON '.JSON::PP->new->canonical->ascii->encode({
    before=>{lasttime=>0+$priorRows[0],nextid=>0+$priorHeader[1],blockip=>$priorHeader[2]},
    after=>{lasttime=>0+$rows[0],nextid=>0+$header[1],blockip=>$header[2]},
    reload=>{lasttime=>0+$DTlasttime,nextid=>0+$DTnextid,blockip=>$DTblockip},
    allocatedId=>0+$DT[$id2idx{3}]{id},nowSeconds=>0+$NOW_TIME
  }));
}
is($id2idx{3},0,'new ID maps to current first row');
is($id2idx{1},1,'existing ID maps to current second row');
is($DT[$id2idx{3}]{money},100000,'new shop core cash');
is($DT[$id2idx{3}]{rank},5010,'new shop core rank');
is($DT[$id2idx{3}]{time},$NOW_TIME-12*3600,'new shop core starting time');
is($DT[$id2idx{3}]{item}[78],0,'custom FUNCNEW disabled in controlled core fixture');
my $alice_after=auth(cookie=>"SESSION=alice!$alice_token");
ok($alice_after->{ok},'old cookie session still accepted after actual reordering');
is($alice_after->{id},1,'session resolves same stable shop ID');
is($alice_after->{index},1,'session resolves new row, not original index');
my $bob_login=auth(name=>'bob',password=>'beta_pw',ip=>'192.0.2.6');
ok($bob_login->{ok},'new owner original password login accepted');
is($bob_login->{id},3,'Bob authentication selects Bob ID');
is($bob_login->{index},0,'Bob current row');
my $bob_token=$bob_login->{token};
my $explicit=auth(name=>'bob',token=>$bob_token,cookie=>"SESSION=alice!$alice_token");
ok($explicit->{ok},'explicit source credentials accepted');
is($explicit->{id},3,'explicit username takes precedence over cookie identity');

my $last=$DT[$id2idx{1}]{lastlogin};
my $wrong=auth(name=>'alice',token=>'not-a-five-character-token');
ok(!$wrong->{ok},'wrong session token denied');
like($wrong->{error},qr/GAME_ERROR:timeout/,'wrong token source denial');
is($DT[$id2idx{1}]{lastlogin},$last,'denial did not update owner lastlogin');
my $unknown=auth(name=>'missing-owner',token=>$alice_token);
ok(!$unknown->{ok},'unknown owner denied');
like($unknown->{error},qr/GAME_ERROR:no user/,'unknown owner source denial');
my $alice_file="$SESSION_DIR/alice.cgi";
utime($NOW_TIME-601,$NOW_TIME-601,$alice_file) or die 'age source session';
my $expired=auth(name=>'alice',token=>$alice_token);
ok(!$expired->{ok},'expired token denied');
like($expired->{error},qr/GAME_ERROR:timeout/,'expiry source denial');
utime($NOW_TIME-600,$NOW_TIME-600,$alice_file) or die 'boundary source session';
ok(auth(name=>'alice',token=>$alice_token)->{ok},'source equality timeout boundary accepted');
is((stat($alice_file))[9],$NOW_TIME,'valid session refreshes real file timestamp');
my $guest=auth(guest=>1);
ok($guest->{ok} && $guest->{guest},'guest source branch accepted');
is($guest->{id},0,'guest has no authenticated shop ID');

my $stable=raw_file("$DATA_DIR/play.cgi");
like(registration(name=>'alice',shop=>'third shop',ip=>'192.0.2.7'),
  qr/既に存在する名前/,'duplicate owner rejected after source reload');
like(registration(name=>'charlie',shop=>'second shop',ip=>'192.0.2.7'),
  qr/既に存在する店名/,'duplicate shop name rejected by real user file lookup');
like(registration(name=>'charlie',shop=>'third shop',ip=>'192.0.2.5'),
  qr/すでに店舗を持っています/,'same source IP registration denied');
is(raw_file("$DATA_DIR/play.cgi"),$stable,'rejected registrations did not publish play changes');
ok(-e "$DATA_DIR/$LOCK_FILE" && $LOCKED eq '','isolated lock available after harness cleanup');
chdir $cwd or die 'restore cwd';
done_testing();
