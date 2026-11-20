use strict;
use warnings;
use utf8;
use Test::More;
binmode STDOUT, ':encoding(UTF-8)';

# B-26: only the TWO exact, frozen @@FUNCITEM sub bodies are compiled from
# Standard Street DSL. UseItem and WriteLog are SYNTHETIC RECORDING STUBS.
# Never compile the whole DSL, require the game, or write world/log files.
our (@CALLS,@LOGS);
{
  package item;
  our ($USE,$DT,@ITEM,$count);
  sub UseItem {push @main::CALLS,[@_];return 123;}
  sub WriteLog {push @main::LOGS,[@_];return 456;}
}
sub source {
  open(my $fh,'<:encoding(UTF-8)','../../../custom/inc-item-data.cgi')
    or die "cannot read frozen Standard Street source: $!";
  local $/;my $s=<$fh>;close $fh;return $s;
}
my $source=source();
my ($funcitem)=$source=~/(^\@\@FUNCITEM\b[\s\S]*?)(?=^\@\@FUNCUPDATE\b)/m;
ok(defined $funcitem,'B-26-P01 pinned shared FUNCITEM section located');
my ($lostbook)=defined($funcitem)
  ?$funcitem=~/(^sub lostbook\s*\n\{[\s\S]*?^\}\n)/m:();
my ($popup)=defined($funcitem)
  ?$funcitem=~/(^sub popup\s*\n\{[\s\S]*?^\}\n)/m:();
ok(defined($lostbook),'B-26-P02 exact source lostbook body located');
ok(defined($popup),'B-26-P03 exact source popup body located');
die 'Frozen Standard Street callback source changed' unless
 defined($lostbook)&&defined($popup);
like($lostbook,qr/if\(rand\(1000\)<\$USE->\{param1\}\)/,
  'B-26-P04 lostbook uses original rand(1000) and strict less-than');
like($lostbook,qr/UseItem\(\$itemno,1,\$ITEM\[\$itemno\]->\{name\}/,
  'B-26-P05 lostbook invokes OTHER function with count=1, not use count');
like($lostbook,qr/return "";/,
  'B-26-P06 lostbook returns empty string regardless of external call');
like($popup,qr/my \$up=int\(\$USE->\{param1\}\*\(2-\$DT->\{rank\}\/5000\)\)/,
  'B-26-P07 popup original rank increase expression pinned');
like($popup,qr/\$DT->\{rank\}=10000 if \$DT->\{rank\}>10000/,
  'B-26-P08 popup caps rank ONLY from above');
like($popup,qr/WriteLog\(0,\$DT->\{id\},\$ret\)/,
  'B-26-P09 popup first log includes current shop ID and result');
like($popup,qr/WriteLog\(3,0,\$DT->\{shopname\}/,
  'B-26-P10 popup second log uses public shop name');
my $compiled=eval "package item; no strict; no warnings;\n".
  $lostbook."\n".$popup."\n1;\n";
die "Cannot compile original frozen shared callbacks: $@" unless $compiled;
ok(defined(&item::lostbook),'B-26-P11 original lostbook compiled');
ok(defined(&item::popup),'B-26-P12 original popup compiled');

sub fixture {
  my (%o)=@_;
  @CALLS=();@LOGS=();
  $item::USE={itemno=>$o{itemno}//1,param1=>$o{param1}//0,
    param2=>$o{param2}//'開了派對',
    result=>{count=>$o{count}//7}};
  $item::DT={id=>$o{id}//42,shopname=>$o{shopname}//'原版店',
    rank=>$o{rank}//5000,money=>70,time=>250,exp=>{1=>120},
    item=>[10,4]};
  @item::ITEM=(undef,{name=>'書本甲'},{name=>'書本乙'});
}
fixture(itemno=>1,param1=>1000,count=>9);
srand(12);
my $ret=item::lostbook();
is($ret,'','B-26-P13 successful lostbook always returns empty string');
is_deeply(\@CALLS,[[1,1,'書本甲已經破爛到看不懂，就扔掉了。']],
  'B-26-P14 requested external call preserves original 1 unit and Japanese text');
is($item::USE->{result}{count},9,'B-26-P15 ignores surrounding successful count');
is_deeply(\@LOGS,[],'B-26-P16 lostbook does not directly WriteLog');
is_deeply($item::DT->{item},[10,4],
  'B-26-P17 recording-only UseItem stub does not mutate store');

fixture(itemno=>2,param1=>0,count=>4);
srand(12);
is(item::lostbook(),'','B-26-P18 0 probability still returns empty');
is_deeply(\@CALLS,[],'B-26-P19 param1=0 never invokes external item call');

fixture(itemno=>2,param1=>1000,count=>4);
srand(73);
is(item::lostbook(),'','B-26-P20 alternate item returns empty');
is_deeply(\@CALLS,[[2,1,'書本乙已經破爛到看不懂，就扔掉了。']],
  'B-26-P21 original indexed name comes from ITEM[itemno]');

fixture(itemno=>1,param1=>500,count=>8);
srand(46);
my $draw=rand(1000);
srand(46);
item::lostbook();
is(scalar(@CALLS),$draw<500?1:0,
  'B-26-P22 actual seeded Perl draw controls branch; no JS random seed claim');

fixture(itemno=>1,param1=>-2);
srand(2);item::lostbook();
is(scalar(@CALLS),0,'B-26-P23 negative threshold never triggers call');

fixture(rank=>5000,param1=>1000);
$ret=item::popup();
is($item::DT->{rank},6000,'B-26-P24 rank5000 +1000 produces 6000');
is($ret,'開了派對：人氣提升了10%',
  'B-26-P25 log/result includes original int(up/100) percent');
is_deeply(\@LOGS,[
  [0,42,'開了派對：人氣提升了10%'],
  [3,0,'原版店 開了派對'],
],'B-26-P26 popup WriteLog order and argument tuples exact');
is_deeply($item::DT->{item},[10,4],
  'B-26-P27 popup does not directly mutate store item array');
is($item::DT->{money},70,'B-26-P28 popup does not directly change money');
is($item::DT->{time},250,'B-26-P29 popup does not directly change time');
is_deeply($item::DT->{exp},{1=>120},
  'B-26-P30 popup does not directly change experience');

fixture(rank=>9999,param1=>300000,param2=>'高額派對');
$ret=item::popup();
is($item::DT->{rank},10000,
  'B-26-P31 original popup rank cap cuts 10059 down to10000');
is($ret,'高額派對：人氣提升了0%',
  'B-26-P32 result displays original int(up/100)=0% despite the cap');

fixture(rank=>12000,param1=>1000);
$ret=item::popup();
is($item::DT->{rank},10000,
  'B-26-P33 source can decrease above-cap prior rank to10000');
is($ret,'開了派對：人氣提升了-3%',
  'B-26-P34 source float truncation displays negative 3% while saying increased');

fixture(rank=>3000,param1=>-1000);
$ret=item::popup();
is($item::DT->{rank},1600,
  'B-26-P35 negative coefficient creates negative original rank change');
is($ret,'開了派對：人氣提升了-14%',
  'B-26-P36 original negative percentage formatting preserved');

fixture(rank=>10000,param1=>1000);
is(item::popup(),'開了派對：人氣提升了0%',
  'B-26-P37 max rank with positive param yields up0');

done_testing();
