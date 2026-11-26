use strict;
use warnings;
use utf8;
use FindBin;
use JSON::PP;
use Storable qw(dclone);
use Digest::SHA qw(sha1_hex);
use File::Temp qw(tempdir);
use File::Spec;
our (@rank_draws,@rank_ranges,@trace,$ITEM_DIR,$DEFINE_FUNCBUY,$GUILDBAL_FILE,$TEMP_DIR,$ret,$ITEM,$FILE_EXT);
BEGIN { *CORE::GLOBAL::rand=sub {my ($range)=@_; die 'unexpected source rank RNG' unless @rank_draws; push @rank_ranges,$range; return $range*shift(@rank_draws)/1000000;}; }
sub GetMoneyString {$_[0]}
sub GetTime2HMS {$_[0]}
sub PushLog {push @trace,'buy-log'}
sub RequireFile {push @trace,'item-init'}
sub RenewLog {push @trace,'renew-log'}
sub DataWrite {push @trace,'data-write'}
sub DataCommitOrAbort {push @trace,'commit-request'}
sub UnLock {push @trace,'unlock'}
sub GetPath {File::Spec->catfile(@_)}
sub OpenAndCheck {push @trace,'guild-ledger-stage'; open(OUT,'>:encoding(UTF-8)',$_[0]) or die $!;}
sub SetWholeStore {die 'peer purchase must not write wholesale'}
sub item::AddItemSub {die 'peer purchase must not award market voucher'}
sub item::WriteLog {die 'peer purchase must not emit market voucher log'}
binmode STDOUT, ':raw';
our (%GUILD,%GUILD_DATA,%DTevent,@ITEM,@DT,$DT,$DTS,$id,$itemno,$showcase,$price,$num,
     $TIME_SEND_ITEM,$NOW_TIME,$MAX_STOCK_TIME,$MAX_ITEM,$USER,$DTTaxrate,
     $GUILDIDX_dealrate);
sub l { $_[0] }
sub OutError { die "SOURCE_REFUSAL:$_[0]\n" }
sub frozen {
    my ($name,$sha)=@_;
    open my $f,'<:raw',"$FindBin::Bin/$name" or die $!;
    my $bytes=do {local $/; <$f>};
    close $f or die $!;
    die "source drift $name" unless sha1_hex("blob ".length($bytes)."\0".$bytes) eq $sha;
    return $bytes;
}
frozen('calc.cgi','586354a9a300e26d0e12a4efa512fa25760e3197');
frozen('item.cgi','b39400d7dc0ab80062c392ae2bbc923e24ecacf8');
frozen('core-detail.cgi','9a83d26fb29edee4032958f1e6de837a250f3384');
frozen('pinned-guild.cgi','6593aa8a3ae4a1695c2418f12a3776f0053454ac');
require "$FindBin::Bin/calc.cgi";
require "$FindBin::Bin/item.cgi";
require "$FindBin::Bin/core-detail.cgi";
require "$FindBin::Bin/pinned-guild.cgi";
my $source=frozen('buy-s.cgi','6ba8df9a733ed16c490389414cd94934fe1185ca');
my $from=index($source,'OutError(l(' ,index($source,'$DTS=$DT[$id2idx{$id}];'));
my $to=index($source,'UnLock();',$from)+length('UnLock();');
die 'buy section missing' unless $from>=0 && $to>$from;
my $body=substr($source,$from,$to-$from);
# Byte-pinned original body through UnLock, including real FUNCBUY require
# and WriteGuildData. Auth and publication calls are trace-only adapters.
utf8::decode($body) or die 'source UTF8';
my $fn=eval 'package main; no strict; no warnings; sub {'."\n".$body.
    'return {type=>$guild,rate=>$guildrate,margin=>$guildmargin,baseprice=>$baseprice,count=>$num,saleprice=>$saleprice,tax=>$tax,taxrate=>$taxrate,usetime=>$usetime}; }';
die "source compilation: $@" unless $fn;
my $dsl=frozen('../../../custom/inc-item-data.cgi','7a18185e98b32aee82ca1ce30d6f3c395157dbcb');
utf8::decode($dsl) or die 'DSL UTF8';
my ($global)=$dsl=~/^\@\@FUNCBUY\s*\n(.*?)(?=^\@\@END)/ms;
die 'missing actual global callback' unless $global;
$global=~s/\@\@ITEMNO"禮物卷"/79/g;
die 'unreviewed FUNCBUY macro' if $global=~/\@\@ITEMNO/;
$ITEM_DIR=tempdir(CLEANUP=>1);$TEMP_DIR=$ITEM_DIR;$GUILDBAL_FILE='guildbal.cgi';$DEFINE_FUNCBUY=1;
my $callback=File::Spec->catfile($ITEM_DIR,'funcbuy.cgi');
open my $cb,'>:encoding(UTF-8)',$callback or die $!;
print $cb "package item;\nour \$BUY;\n";
print $cb 'push @main::trace,"global-funcbuy";'."\n";
print $cb $global."\n1;\n";close $cb or die $!;
$NOW_TIME=1000000;$MAX_STOCK_TIME=259200;$MAX_ITEM=79;$USER='isolated';
$GUILDIDX_dealrate=1;$DTTaxrate=10;
%GUILD=(alpha=>['Alpha',150,60],beta=>['Beta',250,80]);
# #79 reviewed price/limit fixture, not a player acquisition claim.
$ITEM[79]={price=>10000,limit=>10,name=>'禮物卷',scale=>'枚',flag=>'',funcbuy=>0};
my @spec=(
 {name=>'neutral-soldout',bg=>'',sg=>'',stock=>2,want=>2,offer=>10000},
 {name=>'same-low-treasury',bg=>'alpha',sg=>'alpha',cash=>9999,stock=>2,want=>2,offer=>10000},
 {name=>'same-bulk-negative',bg=>'alpha',sg=>'alpha',cash=>10000,stock=>8,want=>8,offer=>8500},
 {name=>'other-cash-cap',bg=>'alpha',sg=>'beta',stock=>4,want=>4,money=>26000,offer=>12500},
 {name=>'same-discount-cash-cap',bg=>'alpha',sg=>'alpha',cash=>10000,stock=>4,want=>4,money=>17000,offer=>8500},
 {name=>'zero-margin',bg=>'alpha',sg=>'alpha',cash=>9999,stock=>1,want=>1,base=>1,offer=>1},
 {name=>'stale-price',bg=>'alpha',sg=>'alpha',cash=>10000,stock=>2,want=>2,offer=>10000,reject=>1},
 {name=>'no-money',bg=>'alpha',sg=>'beta',stock=>2,want=>2,money=>0,offer=>12500,reject=>1},
 {name=>'inventory-cap',bg=>'beta',sg=>'alpha',stock=>4,want=>4,held=>9,offer=>11500},
 {name=>'other-taxmode-double',bg=>'alpha',sg=>'beta',stock=>1,want=>1,base=>15000,offer=>18750,taxmode=>2},
 {name=>'other-taxmode-free',bg=>'alpha',sg=>'beta',stock=>1,want=>1,offer=>12500,taxmode=>1},
 {name=>'fractional-hit',bg=>'',sg=>'',stock=>1,want=>1,offer=>10000,rank=>500,draws=>[100000]},
 {name=>'fractional-miss',bg=>'alpha',sg=>'beta',stock=>1,want=>1,offer=>12500,rank=>500,draws=>[200000]},
 {name=>'same-fractional-no-draw',bg=>'alpha',sg=>'alpha',stock=>1,want=>1,offer=>8500,rank=>500},
 {name=>'low-treasury-fractional-no-draw',bg=>'alpha',sg=>'alpha',cash=>9999,stock=>1,want=>1,offer=>10000,rank=>500},
 {name=>'zero-rank-no-draw',bg=>'',sg=>'',stock=>1,want=>1,offer=>10000,rank=>0},
 {name=>'integer-rank-one-sided-guild',bg=>'',sg=>'beta',stock=>1,want=>1,offer=>10000,rank=>1500},
 {name=>'time-cap-existing-sales',bg=>'alpha',sg=>'beta',stock=>2,want=>1,offer=>12500,time=>700000,sold=>4},
 {name=>'time-debt',bg=>'alpha',sg=>'beta',stock=>1,want=>1,offer=>12500,time=>1000001,reject=>1},
);
my @cases;
for my $s(@spec){
    %DTevent=();@trace=();@rank_draws=@{$s->{draws}//[]};@rank_ranges=();
    delete $INC{$callback};
    my $ledgerpath=File::Spec->catfile($TEMP_DIR,$GUILDBAL_FILE);
    unlink $ledgerpath if -e $ledgerpath;
    %GUILD_DATA=(alpha=>{money=>$s->{cash}//20000,in=>0,out=>0,atk=>100,def=>100},
                 beta=>{money=>20000,in=>0,out=>0,atk=>100,def=>100});
    $DT={id=>1,status=>1,guild=>$s->{bg},money=>$s->{money}//100000,time=>$s->{time}//956800,
         paytoday=>0,item=>[(0)x79]};
    $DT->{item}[78]=$s->{held}//0;
    $DTS={id=>2,status=>1,guild=>$s->{sg},money=>100000,time=>956800,
          rank=>$s->{rank}//1000,taxmode=>$s->{taxmode}//0,trush=>0,saletoday=>0,taxtoday=>0,
          itemtoday=>($s->{sold}?{79=>$s->{sold}}:{}),item=>[(0)x79],showcasecount=>1,showcase=>[79],price=>[$s->{base}//10000]};
    $DTS->{item}[78]=$s->{stock};
    @DT=($DT,$DTS);
    $id=2;$itemno=79;$showcase=0;$price=$s->{offer};$TIME_SEND_ITEM=1200;
    $num=CheckCount($s->{want},0,0,$ITEM[79]{limit}-$DT->{item}[78]);
    my $before=dclone({buyer=>$DT,seller=>$DTS,ledgers=>\%GUILD_DATA});
    my $receipt=eval {$fn->()};my $error=$@;
    die "unexpected source failure: $error" if !$receipt && $error!~/^SOURCE_REFUSAL:/;
    die 'unused source rank draw' if @rank_draws;
    my $ledgerbytes;
    if(-e $ledgerpath){open my $lf,'<:encoding(UTF-8)',$ledgerpath or die $!;local $/;$ledgerbytes=<$lf>;close $lf or die $!;}
    push @cases,{spec=>$s,before=>$before,receipt=>$receipt,error=>$error,trace=>[@trace],rankRanges=>[@rank_ranges],ledgerBytes=>$ledgerbytes,
       after=>dclone({buyer=>$DT,seller=>$DTS,ledgers=>\%GUILD_DATA})};
}
print JSON::PP->new->canonical->utf8->encode({cases=>\@cases,scope=>'frozen buy-s numeric and tail, real tax/time/guild and global FUNCBUY, actual staged ledger bytes; auth, logs and publication are adapters, no legal player acquisition'});
