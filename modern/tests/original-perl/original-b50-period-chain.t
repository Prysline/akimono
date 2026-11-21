use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use Test::More;
use JSON::PP qw(decode_json);
my $probe=File::Spec->catfile($FindBin::Bin,'original-b50-period-chain-probe.pl');
my $raw=qx{perl "$probe"};
is($?,0,'B-50 executes original Core in-place period prefix across two source periods');
my $proof=eval{decode_json($raw)};
ok(!$@&&ref($proof)eq'HASH','two-period frozen Perl state evidence decoded');
if(ref($proof)eq'HASH'){
  is(scalar @{$proof->{itemLimits}},79,'all 79 original item cap source entries');
  my @rows=@{$proof->{cases}};
  is(scalar @rows,2,'periods are executed consecutively on the SAME shop and town');
  my($one,$two)=map {$_->{output}} @rows;
  is($one->{shop}{rankingcount},1,'original winner counted first period');
  is($two->{shop}{rankingcount},2,'original winner counted twice');
  is($one->{shop}{item}[78],10,'original first prize granted five gift vouchers');
  is($two->{shop}{item}[78],10,'second period retains the same actual inventory');
  is($two->{shop}{item}[63],1,'original second award grants one security robot');
  is($one->{shop}{saleyesterday},10000,'original sales carry into previous period');
  is($one->{shop}{payyesterday},10000,'original purchases carry into previous period');
  is($one->{shop}{itemyesterday}{10},2,'original item sales migrate to yesterday');
  is($one->{shop}{saletoday},0,'sales reset after first settlement');
  is($one->{shop}{paytoday},17,'original maintenance books new period purchase');
  is($one->{shop}{money},99983,'source deducts int(17.875) from money');
  is($one->{shop}{exp}{10},89,'original EXP 100 -> 89 first period');
  is($two->{shop}{exp}{10},79,'original EXP 89 -> 79 next period');
  is($two->{shop}{payyesterday},17,'next period rolls prior maintenance');
  is($two->{shop}{paytoday},0,'next period no outstanding maintenance');
  is($one->{dtPeople},374050,'original town first-period population');
  is($two->{town}{people},$one->{dtPeople},
     'second period uses first new city population');
  is($one->{drawsUsed},3,'first period exactly prize and two town source draws');
  is($two->{drawsUsed},3,'second period source dice do not restart hidden state');
  is($rows[1]->{input}{shop}{item}[78],$one->{shop}{item}[78],
     'source second round sees first-round real awarded stock');
  is($rows[1]->{input}{shop}{paytoday},$one->{shop}{paytoday},
     'source second round sees first-round maintenance as current purchase');
  is($rows[1]->{input}{town}{develop},$one->{town}{develop},
     'source second round sees first-round city development');
}
done_testing();
