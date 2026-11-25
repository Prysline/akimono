use strict;
use warnings;
use utf8;
use FindBin;
use File::Temp qw(tempdir);
use Digest::SHA qw(sha1_hex);
use Test::More;
our (%Q,%MIMETYPE,%GUILD,%GUILD_DETAIL,%GUILD_DATA,@GLIST,@MAX,@OtherDir,
 @DT,@image,$DT,$MYDIR,$NOW_TIME,$COMMON_DIR,$COTEMP_DIR,$DATA_DIR,$TEMP_DIR,
 $GUILD_FILE,$GUILDBAL_FILE,$FILE_EXT,$COMMIT_FILE,$LOCK_FILE,$COLOCKED,
 $COLOCKED_LEVEL,$AUTO_UNLOCK_TIME,$GUILDIDX_name,$GUILDIDX_dealrate,
 $GUILDIDX_feerate,$disp,$TB,$TR,$TD,$TRE,$TBE,@TRACE,$fail_street);
my $root=tempdir(CLEANUP=>1);
$COMMON_DIR="$root/common";$COTEMP_DIR="$COMMON_DIR/temp";
mkdir $_ or die $! for ($COMMON_DIR,$COTEMP_DIR,"$root/alpha","$root/alpha/temp","$root/beta","$root/beta/temp");
$GUILD_FILE='guild';$GUILDBAL_FILE='guildbal';$FILE_EXT='.cgi';
$COMMIT_FILE='commit';$LOCK_FILE='lockfile';$AUTO_UNLOCK_TIME=3600;
$NOW_TIME=1000000;$COLOCKED='';$COLOCKED_LEVEL=0;
$ENV{REMOTE_ADDR}='fixture';@OtherDir=qw(alpha beta);
$TB=$TR=$TD=$TRE=$TBE='';
sub GetPath {return @_==1?"$DATA_DIR/$_[0]$FILE_EXT":"$_[0]/$_[1]$FILE_EXT"}
sub OpenAndCheck {open(OUT,'>:encoding(UTF-8)',$_[0]) or die $!}
sub RenameAndCheck {rename($_[0],$_[1]) or die $!}
sub WriteErrorLog {die "unexpected source lock error: $_[0]"}
sub l {$_[0]}
sub GetTagImgKao {''}
sub PushLog {push @TRACE,'log';1}
sub OutSkin {push @TRACE,'render';1}
# Only street lock/read/auth/write/publication are adapters.
sub Lock {push @TRACE,(-e "$COMMON_DIR/$LOCK_FILE"?'street-lock-after-common-unlock':'street-lock-while-common-held');1}
sub UnLock {push @TRACE,'street-unlock';1}
sub DataRead {push @TRACE,'read-adapter';1}
sub CheckUserPass {push @TRACE,'auth-adapter';1}
sub DataWrite {push @TRACE,'street-write-adapter';die "INJECTED_STREET_WRITE\n" if $fail_street;1}
sub DataCommitOrAbort {push @TRACE,'street-commit-adapter';1}
sub OutError {CoUnLock() if $COLOCKED ne '';die "SOURCE_REFUSAL:$_[0]\n"}
sub bytes {my($f)=@_;open my $h,'<:raw',$f or die $!;my $s=do{local $/;<$h>};close $h;return $s}
sub put {my($f,$s)=@_;open my $h,'>:raw',$f or die $!;print {$h} $s;close $h or die $!}
my %sha=(
 'pinned-gd-b.cgi'=>'712cacab0ce4accdff2f6fc6ff4b5cb71f1678c5',
 'pinned-guild.cgi'=>'6593aa8a3ae4a1695c2418f12a3776f0053454ac',
 'pinned-guildsub.cgi'=>'4dee1edeeedf3b482b8786111e1e5d626095f8d5',
 'pinned-config.cgi'=>'010e43766c1b78c7572cbc0aded2daf03dc07a1e',
 'pinned-sub.cgi'=>'33c767f434d7d6f0c5e9e0c9a291472b3a0f3b25',
 'pinned-colock.cgi'=>'99ff12db08135879e1a570cef1424f6dd5bec151');
for my $name(sort keys %sha){
 my $s=bytes("$FindBin::Bin/$name");
 is(sha1_hex("blob ".length($s)."\0".$s),$sha{$name},"exact $name");
}
require "$FindBin::Bin/$_" for sort grep {$_ ne 'pinned-gd-b.cgi'} keys %sha;
my $empty=q{use utf8;$GUILDIDX_name=0;$GUILDIDX_dealrate=1;$GUILDIDX_feerate=2;%GUILD=();1;};
for my $town(qw(alpha beta)){
 put("$root/$town/guild.cgi",$empty);put("$root/$town/guildbal.cgi",'');
}
put("$COMMON_DIR/$LOCK_FILE",'');
sub town {
 ($MYDIR)=@_;$DATA_DIR="$root/$MYDIR";$TEMP_DIR="$DATA_DIR/temp";
 my $s=bytes(GetPath($GUILD_FILE));eval $s or die $@;
 ReadGuild('');ReadGuildData();
}
sub publish_fixture { # only stage rename; not full street commit
 my($kind)=@_;rename(GetPath($TEMP_DIR,$kind),GetPath($kind)) or die $!;
}
sub shop {my($id,$g)=@_;return {id=>$id,guild=>$g,dignity=>16,money=>500000,user=>{_so_e=>'title',keep=>1}}}
my $founder=shop(10,'');my $member=shop(11,'red');my $other=shop(10,'red');
my $gif="GIF89a"; # opaque test bytes, not asserted to be a valid image
sub run {
 my(%over)=@_;%Q=(mode=>'make',code=>'red',name=>'Red & Co',shortname=>'Red',
  dealrate=>10,feerate=>500,member=>'member',comment=>'welcome',appeal=>'activity',
  needed=>'apply',url=>'',upfile=>$gif,alpha=>11,beta=>20,%over);
 %MIMETYPE=(upfile=>delete($Q{mime})//'image/gif');@TRACE=();
 my $v=do "$FindBin::Bin/pinned-gd-b.cgi";my $err=$@;
 die "unexpected guild handler: $err $!" if !defined($v) && $err!~/^(SOURCE_REFUSAL:|INJECTED_STREET_WRITE)/;
 return defined $v;
}
town('alpha');$DT=$founder;@DT=($founder,$member);
ok(run(),'actual original establishment body');
is($founder->{guild},'red','founder membership assigned');
is($founder->{money},500000,'no founding cash debit in handler');
is(bytes("$COMMON_DIR/red.gif"),$gif,'literal supplied bytes stored live');
ok(-e "$COMMON_DIR/red.pl",'live definition published');
ok(-e "$COMMON_DIR/$LOCK_FILE" && $COLOCKED eq '','real original common lock released');
ok(grep($_ eq 'street-lock-after-common-unlock',@TRACE),'street lock occurs after common unlock');
ok(grep($_ eq 'street-commit-adapter',@TRACE),'street commit called after definition publication');
ReadGuild('');
is_deeply([@{$GUILD_DETAIL{red}}{qw(name shortname dealrate feerate leadt leader alpha beta)}],
 ['Red &amp; Co','Red',10,500,'alpha',10,11,20],'actual parsed definition and per-street representatives');
ok(!exists $GUILD_DETAIL{red}{url},'empty URL omitted by ReadConfig');
ok(!exists $GUILD{red} && !exists $GUILD_DATA{red},'definition detail exists; loaded street definition and ledger not initialized');
is(bytes(GetPath($GUILDBAL_FILE)),'','founding leaves live ledger untouched');
my $def=bytes("$COMMON_DIR/red.pl");
ok(!run(),'duplicate creation refused');
is(bytes("$COMMON_DIR/red.pl"),$def,'duplicate does not change definition');
ok(!run(code=>'bad',dealrate=>9),'below 10 rate rejected');
ok(!run(code=>'bad',feerate=>501),'above 500 rate rejected');
ok(!run(code=>'bad',mime=>'image/png'),'wrong MIME rejected');
ok(!-e "$COMMON_DIR/bad.pl",'refused creation does not write definition');
ok(!run(code=>'bad',upfile=>''),'missing image rejected');
ok(run(mode=>'edit',upfile=>'',shortname=>'NewRed',dealrate=>500,feerate=>10,alpha=>12,beta=>''),'edit representatives and rates');
ok(!grep($_ eq 'street-commit-adapter',@TRACE),'edit no founder street write');
is(bytes("$COMMON_DIR/red.gif"),$gif,'no upload preserves old image');
ReadGuild('');
is_deeply([@{$GUILD_DETAIL{red}}{qw(shortname dealrate feerate alpha)}],['NewRed',500,10,12],'updated definition');
ok(!exists $GUILD_DETAIL{red}{beta},'blank representative omitted by ReadConfig');

# The same common definition becomes available through ReadGuild in both
# streets, but each loads and publishes its own generated definition and ledger.
MakeGuildFile();WriteGuildData();
ok(!exists $GUILD{red},'MakeGuildFile does not refresh current GUILD hash');
is(bytes(GetPath($TEMP_DIR,$GUILDBAL_FILE)),'','first staged ledger uses old definition keys');
publish_fixture($GUILD_FILE);publish_fixture($GUILDBAL_FILE);
town('alpha');is_deeply($GUILD{red},['NewRed',500,10],'fresh alpha definition');
ok(!exists $GUILD_DATA{red},'new guild initially has no ledger row');
# Original EditGuildMoney copies an undefined entry into a lexical scalar.
# Its autovivification is local; the first money change is not retained.
EditGuildMoney('red',120000);
ok(!exists $GUILD_DATA{red},'missing row contribution does not persist in original hash');
WriteGuildData();
is(bytes(GetPath($TEMP_DIR,$GUILDBAL_FILE)),"red\t\n",'first write creates an empty row');
publish_fixture($GUILDBAL_FILE);
town('alpha');
is_deeply($GUILD_DATA{red},{},'empty row reload creates an actual ledger hash');
EditGuildMoney('red',120000);WriteGuildData();publish_fixture($GUILDBAL_FILE);
town('beta');is($GUILD_DETAIL{red}{shortname},'NewRed','same common detail visible in beta');
ok(!exists $GUILD{red},'beta generated definition still stale');
MakeGuildFile();publish_fixture($GUILD_FILE);
town('beta');is_deeply($GUILD{red},['NewRed',500,10],'beta fresh generated definition');
ok(!exists $GUILD_DATA{red},'alpha contribution not in beta ledger');
EditGuildMoney('red',50000);
ok(!exists $GUILD_DATA{red},'beta independently loses contribution with missing row');
WriteGuildData();publish_fixture($GUILDBAL_FILE);
town('beta');
is_deeply($GUILD_DATA{red},{},'beta empty row reload creates ledger hash');
EditGuildMoney('red',50000);WriteGuildData();publish_fixture($GUILDBAL_FILE);
town('alpha');is($GUILD_DATA{red}{money},120000,'alpha ledger separate');
town('beta');is($GUILD_DATA{red}{money},50000,'beta ledger separate');

# Original definition/image are written before street DataWrite. Failure
# is injected at adapter boundary, not a simulated actual street disk commit.
$DT=shop(21,'');$fail_street=1;
ok(!run(code=>'orphan'),'injected street write failure');
ok(-e "$COMMON_DIR/orphan.pl" && -e "$COMMON_DIR/orphan.gif",'common definition/image remain after later failure');
ok(-e "$COMMON_DIR/$LOCK_FILE",'common lock already released');
ok(!grep($_ eq 'street-commit-adapter',@TRACE),'failed street write never reaches street commit adapter');
$fail_street=0;
# Cross-street cleanup after original common file deletion; source period or
# guild break is the known unlink producer, not re-executed here.
unlink "$COMMON_DIR/red.pl" or die $!;
town('beta');$DT=$other;@DT=($other);
ok(!exists $GUILD_DETAIL{red} && exists $GUILD{red},'deleted common definition vs stale beta generated definition');
MakeGuildFile();WriteGuildData();
is($other->{guild},'','original rebuild clears membership');
ok(!exists $other->{user}{_so_e} && $other->{user}{keep}==1,'clears title only');
ok(-e "$COMMON_DIR/red.gif",'definition removal alone leaves image');
like(bytes(GetPath($TEMP_DIR,$GUILDBAL_FILE)),qr/^red\t/,'same rebuild still serializes old guild ledger key');
publish_fixture($GUILD_FILE);publish_fixture($GUILDBAL_FILE);
town('beta');ok(!exists $GUILD{red},'reload removes red definition');
ok(exists $GUILD_DATA{red},'old ledger row remains until later write');
WriteGuildData();publish_fixture($GUILDBAL_FILE);
town('beta');ok(!exists $GUILD_DATA{red},'next ledger rewrite removes old key');
done_testing();
