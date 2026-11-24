use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use File::Spec;
use Storable qw(dclone);
binmode STDOUT, ':raw';

# Execute the unchanged, SHA-pinned original inc-period.cgi inside its
# unmodified per-store ledger section. File system, events, awards, guild,
# territory and top-level inc-period code are never invoked.
my $source=File::Spec->catfile($FindBin::Bin,'period.cgi');
open(my $fh,'<:encoding(UTF-8)',$source) or die $!;
local $/;
my $text=<$fh>;
close $fh;
my $from=index($text,"\t\t#前期の情報を保存\n");
my $to=index($text,"\n\t\t#爵位ポイント自然減少",$from);
die 'Pinned Core per-shop accounting block moved' unless
  $from>=0 && $to>$from;
my $body=substr($text,$from,$to-$from);
die 'Expected original profit/cost/hist/exp markers missing' unless
  index($body,'$DT->{profitstock}=int(($DT->{profitstock}*$PROFIT_DAY_COUNT')>=0 &&
  index($body,'$cost+=$SHOWCASE_COST[$DT->{showcasecount}-1]')>=0 &&
  index($body,'$DT->{itemyesterday}=$DT->{itemtoday};')>=0 &&
  index($body,'$DT->{exp}{$key}-=$EXP_DOWN_POINT;')>=0;

our ($PROFIT_DAY_COUNT,$EXP_DOWN_RATE,$EXP_DOWN_POINT,$MAX_ITEM,
  @SHOWCASE_COST,@ITEM);
$PROFIT_DAY_COUNT=3;$EXP_DOWN_RATE=60;$EXP_DOWN_POINT=5;$MAX_ITEM=79;
@SHOWCASE_COST=(0,2000,4000,8000);
@ITEM=(undef,map {{limit=>9999}} 1..79);
$ITEM[10]->{limit}=20;
$ITEM[79]->{limit}=10;
my $compiled=eval 'no strict; no warnings; sub run_pinned_period_ledger {'.
  'my ($DT)=@_; my $dtcount=1; my $taxin=0;'.
  "\n$body\n".'return $DT; } 1;';
die "Original frozen Perl ledger failed: $@" unless $compiled;

my @limits=map {$_->{limit}} @ITEM[1..79];
sub shop {
  my (%o)=@_;
  my @stock=(0)x79;
  $stock[9]=$o{book}//0;
  $stock[62]=1;
  $stock[78]=$o{gift}//5;
  return {
    id=>1,status=>1,showcasecount=>1,showcase=>[10],
    item=>\@stock, exp=>$o{exp}//{},itemtoday=>$o{itemtoday}//{},
    itemyesterday=>$o{itemyesterday}//{},
    money=>$o{money}//100000,profitstock=>$o{profitstock}//0,
    saletoday=>$o{saletoday}//0,paytoday=>$o{paytoday}//0,
    taxtoday=>$o{taxtoday}//0,costtoday=>$o{costtoday}//0,
    rankingyesterday=>0,saleyesterday=>0,payyesterday=>0,
    taxyesterday=>0,costyesterday=>0,
    guild=>'',dragon=>0,dignity=>0,
  };
}
my @cases=(
  ['two-sales',shop(
    money=>100000,book=>0,gift=>5,
    saletoday=>10000,paytoday=>10000,costtoday=>15.75,
    itemtoday=>{10=>2},exp=>{10=>100,79=>6},
  )],
  ['caps-and-loss',shop(
    money=>350,book=>23,gift=>11,
    saletoday=>0,paytoday=>5000,costtoday=>300.125,
    itemtoday=>{10=>1},itemyesterday=>{10=>99},
    exp=>{10=>5,79=>1000},
  )],
  ['fractional-and-negative',shop(
    money=>5,book=>1,gift=>5,profitstock=>3000,
    saletoday=>2000,paytoday=>14000,taxtoday=>9,
    costtoday=>999.875,itemtoday=>{},
    exp=>{10=>1,79=>10},
  )],
);
my @rows=();
for my $case (@cases) {
  my($name,$input)=@$case;
  my $before=dclone($input);
  my $after=run_pinned_period_ledger($input);
  push @rows,{name=>$name,input=>$before,output=>$after};
}
print JSON::PP->new->utf8->canonical->encode({
  sourceFragmentStart=>$from,sourceFragmentEnd=>$to,
  limits=>\@limits,cases=>\@rows,
  scope=>'unchanged frozen Core per-store ledger only; no prize, callbacks, events, world settlement or file IO',
});
