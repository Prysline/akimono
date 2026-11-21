use strict;
use warnings;
use utf8;
use Test::More;
use JSON::PP qw(decode_json);
use FindBin;
use File::Spec;

my $probe=File::Spec->catfile($FindBin::Bin,'original-b41-real-sale-probe.pl');
my $json=qx{perl "$probe"};
is($?,0,'B-42 actual original Perl purchase/sale twice with a later empty shelf slice');
my $source=eval{decode_json($json)};
ok(!$@ && ref($source)eq'HASH','original two-round JSON parses');
if(ref($source)eq'HASH'){
  my $two=$source->{two30};
  ok(ref($two)eq'HASH','two-round evidence is present');
  if(ref($two)eq'HASH'){
    is($two->{first}{stock},0,'first natural sale exhausted genuinely bought #10');
    is($two->{first}{money},100000,'first sale credited 5000 G');
    is($two->{secondPurchase}{stock},1,'source market repurchase stocked one real #10');
    is($two->{secondPurchase}{money},95000,'source market repurchase debited cash');
    is($two->{secondPurchase}{paytoday},10000,'both purchases share today ledger');
    is($two->{secondPurchase}{commits},3,'second source purchase committed');
    is($two->{second}{stock},0,'second source natural sale consumes repurchase');
    is($two->{second}{money},100000,'second natural sale credited cash');
    is($two->{second}{saletoday},10000,'source sale ledger accumulates two rounds');
    is($two->{second}{paytoday},10000,'source purchase ledger accumulates two rounds');
    is($two->{second}{itemtoday10},2,'source item sales ledger accumulates');
    is($two->{second}{saleRecordCount},1,'temporary source sale count resets each turn');
    cmp_ok($two->{second}{costtoday},'>',$two->{first}{costtoday},
      'fractional upkeep accumulates rather than restarting');
    is($two->{empty}{stock},0,'empty displayed source shelf stays out of stock');
    is($two->{empty}{money},100000,'empty shelf time does not invent revenue');
    is($two->{empty}{saletoday},10000,'sale ledger remains after empty slice');
    is($two->{empty}{itemtoday10},2,'daily item counter remains after no sale');
    is($two->{empty}{temprank},$two->{second}{rank}+1000,
      'original first shelf specialty bonus persists without stock');
    is($two->{empty}{saleRecordCount},0,'source resets temporary counts on empty slice');
    cmp_ok($two->{empty}{costtoday},'>',$two->{second}{costtoday},
      'third elapsed slice continues accumulating upkeep');
    for my $row($two->{first},$two->{second},$two->{empty}){
      is(scalar(@{$row->{wholesale}}),79,'source 79 wholesale positions retained');
      is(scalar(split(/,/,$row->{originalWholesaleCsv},-1)),79,
        'original source CSV maintains 79 cells including undefined');
      is(scalar(@{$row->{consumedSamples}}),$row->{randomDrawsUsed},
        'source consumes exact supplied rand prefix');
    }
  }
}
done_testing();
