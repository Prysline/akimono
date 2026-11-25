use strict;
use warnings;
use utf8;
use FindBin;
use JSON::PP;
use Storable qw(dclone);
use Digest::SHA qw(sha1_hex);
binmode STDOUT, ':raw';
our (%GUILD,%GUILD_DATA,%DTevent,@ITEM,$DT,$DTS,$id,$itemno,$showcase,$price,$num,
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
my $to=index($source,'$ret=l(',$from);
die 'buy section missing' unless $from>=0 && $to>$from;
my $body=substr($source,$from,$to-$from);
# Byte-pinned original body, only append a capture of its lexical values.
utf8::decode($body) or die 'source UTF8';
my $fn=eval 'package main; no strict; no warnings; sub {'."\n".$body.
    'return {type=>$guild,rate=>$guildrate,margin=>$guildmargin,baseprice=>$baseprice,count=>$num,saleprice=>$saleprice,tax=>$tax,taxrate=>$taxrate,usetime=>$usetime}; }';
die "source compilation: $@" unless $fn;
$NOW_TIME=1000000;$MAX_STOCK_TIME=259200;$MAX_ITEM=79;$USER='isolated';
$GUILDIDX_dealrate=1;$DTTaxrate=10;
%GUILD=(alpha=>['Alpha',150,60],beta=>['Beta',250,80]);
# #79 reviewed price/limit fixture, not a player acquisition claim.
$ITEM[79]={price=>10000,limit=>10};
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
);
my @cases;
for my $s(@spec){
    %DTevent=();
    %GUILD_DATA=(alpha=>{money=>$s->{cash}//20000,in=>0,out=>0,atk=>100,def=>100},
                 beta=>{money=>20000,in=>0,out=>0,atk=>100,def=>100});
    $DT={id=>1,status=>1,guild=>$s->{bg},money=>$s->{money}//100000,time=>956800,
         paytoday=>0,item=>[(0)x79]};
    $DT->{item}[78]=$s->{held}//0;
    $DTS={id=>2,status=>1,guild=>$s->{sg},money=>100000,time=>956800,
          rank=>1000,taxmode=>$s->{taxmode}//0,trush=>0,saletoday=>0,taxtoday=>0,
          itemtoday=>{},item=>[(0)x79],showcasecount=>1,showcase=>[79],price=>[$s->{base}//10000]};
    $DTS->{item}[78]=$s->{stock};
    $id=2;$itemno=79;$showcase=0;$price=$s->{offer};$TIME_SEND_ITEM=1200;
    $num=CheckCount($s->{want},0,0,$ITEM[79]{limit}-$DT->{item}[78]);
    my $before=dclone({buyer=>$DT,seller=>$DTS,ledgers=>\%GUILD_DATA});
    my $receipt=eval {$fn->()};my $error=$@;
    die "unexpected source failure: $error" if !$receipt && $error!~/^SOURCE_REFUSAL:/;
    push @cases,{spec=>$s,before=>$before,receipt=>$receipt,error=>$error,
       after=>dclone({buyer=>$DT,seller=>$DTS,ledgers=>\%GUILD_DATA})};
}
print JSON::PP->new->canonical->utf8->encode({cases=>\@cases,scope=>'frozen numeric buy-s section, real tax/time/guild functions; no auth, callback, disk commit or legal player acquisition'});
