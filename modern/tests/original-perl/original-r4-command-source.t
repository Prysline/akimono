use strict;
use warnings;
use utf8;
use FindBin;
use File::Temp qw(tempdir);
use Digest::SHA qw(sha1_hex);
use Test::More;
our (%Q,%ARMY,%RIOT,%DTevent,%id2idx,%GUILD,%GUILD_DETAIL,%GUILD_DATA,
    @DT,@image,$DT,$STATE,$NOW_TIME,$MAX_STOCK_TIME,$USER,$MYDIR,
    $COMMON_DIR,$TEMP_DIR,$GUILDBAL_FILE,$GUILDIDX_name,$DTTaxrate,
    $count,$num,$ret,$disp,$TBT,$TRT,$TD,$TRE,$TBE,$NOMENU,$draw,@TRACE);
BEGIN { *CORE::GLOBAL::rand=sub {return $main::draw*($_[0]//1)}; }
my $root=tempdir(CLEANUP=>1);
my $live="$root/live";$TEMP_DIR="$root/stage";$COMMON_DIR="$root/common";
mkdir $_ or die $! for ($live,$TEMP_DIR,$COMMON_DIR);
sub GetPath {return @_==1?"$live/$_[0].cgi":"$_[0]/$_[1].cgi"}
sub OpenAndCheck {push @TRACE,"stage:$_[0]";open(OUT,'>:encoding(UTF-8)',$_[0]) or die $!}
sub l {$_[0]}
sub GetTagImgKao {''}
sub GetTagImgJob {''}
sub GetMenuTag {''}
sub GetMoneyString {$_[0]}
sub GetTime2HMS {$_[0]}
sub OutError {die "SOURCE_REFUSAL:$_[0]\n"}
# Outer session, rendering, and publication adapters only. No live game state.
sub Lock {push @TRACE,'lock';1}
sub DataRead {push @TRACE,'read';1}
sub CheckUserPass {push @TRACE,'auth-adapter';1}
sub ReadGuild {push @TRACE,'guild-definition-fixture';1}
sub PushLog {push @TRACE,'log';1}
sub RenewLog {push @TRACE,'renew';1}
sub DataWrite {push @TRACE,'data-stage-adapter';1}
sub DataCommitOrAbort {push @TRACE,'commit-adapter';1}
sub UnLock {push @TRACE,'unlock';1}
sub OutSkin {push @TRACE,'render';1}
sub bytes {my($f)=@_;open my $h,'<:raw',$f or die $!;my $s=do{local $/;<$h>};close $h;return $s}
sub put {my($f,$s)=@_;open my $h,'>:raw',$f or die $!;print {$h} $s;close $h or die $!}
my %sha=(
 'pinned-army-s.cgi'=>'6f457b78f530e37aa0ff4074358a57797f5087e2',
 'pinned-lord-s.cgi'=>'8754dabf130a521aa243fc0568910d5f52523362',
 'pinned-gd-s.cgi'=>'2b743fdab85b897ba6a621f100df656f884ab29b',
 'pinned-army.cgi'=>'cd29bcbfe52bac84794c4c79426bd559d7616d85',
 'pinned-guild.cgi'=>'6593aa8a3ae4a1695c2418f12a3776f0053454ac',
 'calc.cgi'=>'586354a9a300e26d0e12a4efa512fa25760e3197');
for my $name(sort keys %sha){
 my $s=bytes("$FindBin::Bin/$name");
 is(sha1_hex("blob ".length($s)."\0".$s),$sha{$name},"exact $name");
}
require "$FindBin::Bin/calc.cgi";
require "$FindBin::Bin/pinned-army.cgi";
require "$FindBin::Bin/pinned-guild.cgi";
$GUILDBAL_FILE='guildbal';$GUILDIDX_name=0;
sub setup {
 my(%o)=@_;
 $NOW_TIME=1000000;$MAX_STOCK_TIME=259200;$USER='fixture';$MYDIR='street';
 $draw=$o{draw}//0;$DTTaxrate=20;$disp=$ret=$TBT=$TRT=$TD=$TRE=$TBE='';
 %Q=();@TRACE=();%DTevent=$o{rebel}?(rebel=>900001):();
 $DT={id=>1,name=>'Owner',shopname=>'Shop A',guild=>'alpha',dignity=>3,
      status=>1,money=>$o{cash}//1000000,time=>$NOW_TIME-($o{stocktime}//43200),
      paytoday=>0,saletoday=>0,rank=>3000,user=>{_so_e=>1}};
 @DT=($DT,{id=>2,name=>'Other',shopname=>'Shop B',rank=>$o{rank}//2500,taxmode=>0});
 %id2idx=(1=>0,2=>1);
 $STATE={leader=>$o{leader}//1,army=>$o{guard}//1000,robina=>100,robinb=>0,
         money=>$o{towncash}//2000000,safety=>$o{safety}//6000,devem=>5000000,safem=>5000000};
 %GUILD=(alpha=>['Alpha'],beta=>['Beta']);
 %GUILD_DETAIL=(alpha=>{leadt=>'street',leader=>$o{guildleader}//1,street=>2});
 my $am=$o{alpha}//1000000;my $bm=$o{beta}//2000000;
 my $atk=$o{atk}//400;my $def=$o{def}//300;
 put(GetPath('guildbal'),"alpha\tmoney\t$am\tin\t0\tout\t0\tatk\t$atk\tdef\t800\nbeta\tmoney\t$bm\tin\t0\tout\t0\tatk\t200\tdef\t$def\n");
 put("$COMMON_DIR/beta.pl","fixture definition\n");
 put(GetPath('army'),"1,".($o{army}//1000).",2,300\n".($o{riot}?'1':'')."\n");
 unlink GetPath($TEMP_DIR,'army'),GetPath($TEMP_DIR,'guildbal');
}
sub run {
 my($name,$mode,%q)=@_;
 %Q=(mode=>$mode,%q);
 $main::ckeckok=0; # independent CGI request fixture
 my $r=do "$FindBin::Bin/pinned-$name.cgi";
 my $err=$@;
 if(!defined($r) && $err!~/^SOURCE_REFUSAL:/){die "unexpected $name/$mode: $err $!"}
 return defined $r;
}
sub refused {
 my($name,$mode,%q)=@_;
 ok(!run($name,$mode,%q),"$name/$mode refused");
 ok(!grep($_ eq 'commit-adapter',@TRACE),'refusal does not reach publication adapter');
}
setup(cash=>2500,army=>1000);
ok(run('army-s','plus',cnt1=>8,cnt2=>0),'normal hire');
is_deeply([$ARMY{1},$DT->{money},$DT->{time},$DT->{paytoday}],[1002,500,959200,0],'cash clamp, fixed 40 minutes, no paytoday entry');
ok(-e GetPath($TEMP_DIR,'army'),'actual army stage exists');
is_deeply([grep(/^(renew|data-stage-adapter|commit-adapter|unlock)$/, @TRACE)],[qw(renew data-stage-adapter commit-adapter unlock)],'source tail order');
setup(rebel=>1,cash=>5000,army=>2999);
ok(run('army-s','plus',cnt1=>10,cnt2=>0),'rebel hire');
is_deeply([$ARMY{1},$DT->{money}],[3000,3500],'capacity clamp and 1500 unit price');
setup(army=>3000);
refused('army-s','plus',cnt1=>1,cnt2=>0);
is($DT->{time},959200,'hire time changed before capacity refusal in isolated memory');
ok(!-e GetPath($TEMP_DIR,'army'),'refusal does not stage army');
setup(army=>100,stocktime=>1);
ok(run('army-s','fire',cnt1=>500,cnt2=>0),'fire with one second available in handler');
is_deeply([$ARMY{1}//0,$DT->{time},$DT->{money}],[0,1000599,1000000],'fire all, 10min debt, no refund');
setup(army=>2499);
refused('army-s','rebelon',cmd=>'rebel');
setup(army=>2500,leader=>2);
ok(run('army-s','rebelon',cmd=>'rebel'),'rebel threshold');
is_deeply([$DTevent{rebel},$RIOT{1},$STATE->{safety},$DT->{time}],[1259200,1,5400,958600],'72h event, riot ID, safety decline and 30min');
setup(army=>2500,safety=>5000,leader=>2);
ok(run('army-s','rebelon',cmd=>'rebel'),'rebel safety boundary');
is($STATE->{safety},5000,'no safety reduction at equality');
setup(rebel=>1,army=>800,leader=>1);
ok(run('army-s','lside'),'lord sends own troops');
is_deeply([$STATE->{army},$STATE->{robina},exists $ARMY{1}?1:0],[1800,100,0],'regular army transfer');
setup(rebel=>1,army=>800,leader=>2);
ok(run('army-s','lside'),'other shop sends troops');
is_deeply([$STATE->{army},$STATE->{robina},exists $ARMY{1}?1:0],[1000,900,0],'volunteer transfer');
setup(rebel=>1,army=>800,riot=>1);
refused('army-s','lside');
setup(rebel=>1,army=>800);
ok(run('army-s','rside',cmd=>'rebel'),'join revolt');
is_deeply([$RIOT{1},$ARMY{1},$DT->{time}],[1,800,958000],'join leaves owned troops, 20min');

setup();
ok(run('lord-s','inside',taxrate=>40,devem=>10000000,safem=>0),'policy equality caps');
is_deeply([$DTTaxrate,$STATE->{devem},$STATE->{safem},$STATE->{money}],[40,10000000,0,2000000],'policy sets future expense, not immediate debit');
setup();
refused('lord-s','inside',taxrate=>41,devem=>0,safem=>0);
setup(towncash=>2500);
ok(run('lord-s','outside',cnt1=>10,cnt2=>0),'guard hire');
is_deeply([$STATE->{army},$STATE->{money},$DT->{time}],[1002,100,956800],'town cash clamp, no player time');
setup(rebel=>1);
refused('lord-s','outside',cnt1=>1,cnt2=>0);
setup(guard=>100);
ok(run('lord-s','outdel',cnt1=>999,cnt2=>0),'guard discharge');
is_deeply([$STATE->{army},$STATE->{money}],[0,2000000],'guard discharge no refund');
setup();
ok(run('lord-s','taxside',tg=>2,md=>'free'),'tax exemption');
is($DT[1]{taxmode},1,'free taxmode');
ok(run('lord-s','taxside',tg=>2,md=>'double'),'double tax');
is($DT[1]{taxmode},2,'double taxmode');
ok(run('lord-s','treset'),'reset');
ok(!exists($DT[1]{taxmode}),'reset deletes field');
setup(guard=>1000,safety=>9800);
ok(run('lord-s','expose',tg=>2),'expose handler with less than UI 2000 guard threshold (auth adapter)');
is_deeply([$STATE->{money},$DT[1]{rank},$STATE->{safety},$STATE->{army}],[1000000,250,10000,1000],'cost, rank /10, capped safety, no army consumption');
setup(rank=>1999);
refused('lord-s','expose',tg=>2);

setup(cash=>150000);
ok(run('gd-s','fund',cnt1=>50000,cnt2=>0),'donation leaving 100000');
is_deeply([$DT->{money},$DT->{paytoday},$GUILD_DATA{alpha}{money},$GUILD_DATA{alpha}{in}],[100000,50000,1050000,50000],'donation real ledger and shop');
ok(-e GetPath($TEMP_DIR,'guildbal'),'actual guild stage exists');
setup(cash=>150000);
refused('gd-s','fund',cnt1=>50001,cnt2=>0);
setup(alpha=>4000000,atk=>950);
ok(run('gd-s','force'),'guild upgrade');
is_deeply([@{$GUILD_DATA{alpha}}{qw(money atk out)},$DT->{time}],[3000000,990,0,967600],'quarter money directly deducted; no out counter, three hours');
setup(guildleader=>9);
refused('gd-s','force');
setup(atk=>100,def=>300);
ok(run('gd-s','break',tg=>'beta'),'defended guild break');
is_deeply([$GUILD_DATA{alpha}{atk},$GUILD_DATA{beta}{def},$GUILD_DATA{beta}{money},$DT->{money}],[90,240,2000000,1000000],'failed attack still reduces both strengths');
setup(atk=>400,def=>300,draw=>0);
ok(run('gd-s','break',tg=>'beta'),'successful guild break');
is_deeply([$GUILD_DATA{alpha}{money},$GUILD_DATA{beta}{money},$DT->{money},$DT->{saletoday}],[1168750,1812500,1019750,19750],'original split plus 1000 reward');
setup(alpha=>1000,beta=>2000,atk=>1000,def=>0,draw=>0);
ok(run('gd-s','break',tg=>'beta'),'negative treasury attack');
ok($GUILD_DATA{beta}{money}<0,'target can go negative');
ok(!-e "$COMMON_DIR/beta.pl",'original directly deletes live guild definition before commit adapter');
is($GUILD_DATA{alpha}{def},1000,'attacker defence bonus capped');
done_testing();
