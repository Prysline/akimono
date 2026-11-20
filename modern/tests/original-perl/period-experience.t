use strict;
use warnings;
use utf8;
use Test::More;

binmode STDOUT, ':encoding(UTF-8)';

# B-19: source-pinned, ORIGINAL CODE BLOCKS executed in an isolated Perl test.
# inc-period.cgi is TOP-LEVEL game maintenance with guilds, events, files,
# RNG, backup and sessions. plug/use.cgi::UseItem includes item mutation
# callbacks and random outcomes. NEVER execute either entire entrypoint.
# Only the unchanged original history rotation, exp decay and UseItem exp
# tail are compiled as isolated subs, extracted from 2 SHA-pinned snapshots.
our ($EXP_DOWN_RATE,$EXP_DOWN_POINT,$LIMIT_EXP);
$EXP_DOWN_RATE=60;
$EXP_DOWN_POINT=5;
$LIMIT_EXP=3600;

sub snapshot {
  my $name=shift;
  open(my $fh,'<:encoding(UTF-8)',$name) or die "read $name: $!";
  local $/;
  my $source=<$fh>;
  close($fh);
  return $source;
}
my $period=snapshot('period.cgi');
my $use=snapshot('use.cgi');
my ($rotate)=$period=~/(\$DT->\{itemyesterday\}=\$DT->\{itemtoday\};\n\s*\$DT->\{itemtoday\}=\{\};)/;
ok(defined $rotate,'B-19-A: frozen Core period history rotation located');
my $decayStart=index($period,"\t\t#熟練度自然減少\n");
my $decayEnd=index($period,"\n\n\t\t#爵位ポイント自然減少",$decayStart);
ok($decayStart>=0 && $decayEnd>$decayStart,
  'B-19-B: frozen Core isolated experience decay block located');
my $decay=substr($period,$decayStart,$decayEnd-$decayStart);
like($decay,qr/\$EXP_DOWN_RATE\/1000/,
  'B-19-C: original percentage decay rate divided by 1000');
like($decay,qr/delete \$DT->\{exp\}\{\$key\} if \$DT->\{exp\}\{\$key\}<=0;/,
  'B-19-D: zero or negative exp removed by original source');
my $gainStart=index($use,"\t#熟練度処理\n");
my $gainEnd=index($use,"\n}\n\nsub MakeAmount",$gainStart);
ok($gainStart>=0 && $gainEnd>$gainStart,
  'B-19-E: exact frozen UseItem experience tail located');
my $gain=substr($use,$gainStart,$gainEnd-$gainStart);
like($gain,qr/\$LIMIT_EXP>0 && \$expsum>\$LIMIT_EXP/,
  'B-19-F: source only redistributes above total experience cap');
like($gain,qr/next if \$_==\$USE->\{itemno\}/,
  'B-19-G: source skips selected item in excess redistribution');

die 'Frozen source block extraction changed' unless
  defined($rotate) && $decayStart>=0 && $decayEnd>$decayStart &&
  $gainStart>=0 && $gainEnd>$gainStart;
my $compile=qq{
  no strict; no warnings;
  sub run_core_period_subset {
    my (\$DT)=\@_;
    $rotate
    $decay
    return 1;
  }
  sub run_core_exp_gain {
    my (\$DT,\$USE)=\@_;
    $gain
    return 1;
  }
  1;
};
my $compiled=eval $compile;
die "Cannot compile exact Core period/experience blocks: $@" unless $compiled;
ok(defined &run_core_period_subset,'B-19-H: extracted source period executed');
ok(defined &run_core_exp_gain,'B-19-I: extracted source UseItem tail executed');

sub shop {
  my (%opts)=@_;
  return {
    itemyesterday=>$opts{yesterday}//{},
    itemtoday=>$opts{today}//{},
    exp=>$opts{exp}//{},
  };
}
sub do_gain {
  my ($dt,$itemId,$perUse,$count)=@_;
  my $action={itemno=>$itemId,exp=>$perUse,result=>{count=>$count}};
  run_core_exp_gain($dt,$action);
  return $action;
}
my $s=shop(
  yesterday=>{1=>99},today=>{1=>5,3=>7},
  exp=>{1=>100,2=>6,3=>5,4=>1,5=>1000},
);
my $oldToday=$s->{itemtoday};
run_core_period_subset($s);
is_deeply($s->{itemyesterday},{1=>5,3=>7},
  'B-19-J: original moves itemtoday map to itemyesterday');
is_deeply($s->{itemtoday},{},
  'B-19-K: original creates fresh empty today map');
is($s->{itemyesterday},$oldToday,
  'B-19-L: original yesterday points to previous today map reference');
ok($s->{itemtoday} ne $oldToday,
  'B-19-M: new today is not previous today reference');
is($s->{exp}{1},89,
  'B-19-N: exp100 loses int(100*60/1000)+5 =>89');
is($s->{exp}{2},1,
  'B-19-O: exp6 becomes1 after fixed-point decay');
ok(!exists($s->{exp}{3}),
  'B-19-P: exp5 becomes zero and is removed');
ok(!exists($s->{exp}{4}),
  'B-19-Q: exp1 becomes negative and is removed');
is($s->{exp}{5},935,
  'B-19-R: exp1000 loses60+5');

my $empty=shop();
run_core_period_subset($empty);
is_deeply($empty->{exp},{},
  'B-19-S: empty exp remains empty after source decay');
is_deeply($empty->{itemyesterday},{},
  'B-19-T: empty today transfers as empty yesterday');

my $gainShop=shop(exp=>{1=>100});
my $gainAction=do_gain($gainShop,1,80,3);
is($gainShop->{exp}{1},340,
  'B-19-U: source exp80*three uses increases exp100 to340');
is($gainAction->{result}{expold},100,
  'B-19-V: source result records previous exp numeric value');

my $capped=shop(exp=>{1=>990});
my $capAction=do_gain($capped,1,20,2);
is($capped->{exp}{1},1000,
  'B-19-W: single-item exp capped at source 1000');
is($capAction->{result}{expold},990,
  'B-19-X: source previous exp retained before cap');

my $newItem=shop(exp=>{});
my $added=do_gain($newItem,2,10,1);
is($newItem->{exp}{2},10,
  'B-19-Y: source adds a missing exp key starting at zero');
is($added->{result}{expold},0,
  'B-19-Z: missing key numeric previous exp is zero');

my $noExperience=shop(exp=>{1=>200});
do_gain($noExperience,1,0,3);
is($noExperience->{exp}{1},200,
  'B-19-AA: source bypasses gain tail when USE exp is zero');

my $budget=shop(exp=>{1=>900,2=>700,3=>800,4=>850,5=>900});
my $budgetAction=do_gain($budget,1,100,1);
is($budget->{exp}{1},1000,
  'B-19-AB: source protects selected item after gain');
is_deeply($budget->{exp},{
  1=>1000,2=>538,3=>638,4=>688,5=>736,
},'B-19-AC: distinct others receive source excess redistribution');
my $budgetSum=0;
$budgetSum+=$_ foreach values %{$budget->{exp}};
is($budgetSum,3600,
  'B-19-AD: distinct case exp redistribution returns total to3600');
is($budgetAction->{result}{expold},900,
  'B-19-AE: result expold is before use gain and redistribution');

my $noOverflow=shop(exp=>{1=>800,2=>300,3=>200});
do_gain($noOverflow,1,40,1);
is_deeply($noOverflow->{exp},{1=>840,2=>300,3=>200},
  'B-19-AF: under-cap gain leaves other experience intact');

my $zeroDecay=shop(exp=>{1=>100});
local $EXP_DOWN_RATE=0;
run_core_period_subset($zeroDecay);
is($zeroDecay->{exp}{1},95,
  'B-19-AG: when original rate zero, fixed 5 points still removed');
$EXP_DOWN_RATE=60;

done_testing();
