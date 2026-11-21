use strict;
use warnings;
use utf8;
use Test::More;
use JSON::PP qw(decode_json);
use FindBin;
use File::Spec;
binmode STDOUT,':encoding(UTF-8)';
my $path=File::Spec->catfile($FindBin::Bin,'original-b41-real-sale-probe.pl');
my $json=qx{perl "$path"};
is($?,0,'B-41 Perl real purchase -> original showcase -> natural source completes');
my $x=eval{decode_json($json)};
ok(!$@&&ref($x)eq'HASH','B-41 original Perl JSON probe parses');
if(ref($x)eq'HASH'){
  for my $key(qw(sale30 sale60)){
    my $row=$x->{$key};
    is($row->{afterBuy}{money},95000,'original buy debits cash');
    is($row->{afterBuy}{stock},1,'original source bought #10');
    is($row->{afterBuy}{shelf},10,'original sc-s showcased #10');
    is($row->{afterBuy}{price},5000,'original sc-s price');
    is($row->{afterBuy}{time},958000,'original buy + showcase consumed 1200s');
    is($row->{buyAndShowcaseCommits},2,'two original transactions committed');
    is($row->{saleCount},1,'actual original natural code sells one item');
    is($row->{stock},0,'actual original sold #10 inventory');
    is($row->{money},100000,'original cash recovers at sale at 5000');
    is($row->{saletoday},5000,'actual original sales ledger');
    is($row->{paytoday},5000,'original purchase ledger remains');
    is($row->{taxtoday},0,'original price tax 0');
    is($row->{saleRecordCount},1,'sale callback bookkeeping recorded');
    is(scalar(@{$row->{wholesale}}),79,'original 79 wholesale values');
    is(scalar(split(/,/,$row->{originalWholesaleCsv},-1)),79,'original 79 wire slots preserved');
    is(scalar(@{$row->{consumedSamples}}),$row->{randomDrawsUsed},
      'natural and PLUS use one original random stream');
  }
  cmp_ok($x->{sale60}{costtoday},'>',$x->{sale30}{costtoday},
    'fractional upkeep genuinely accumulates with elapsed source minutes');
}
done_testing();
