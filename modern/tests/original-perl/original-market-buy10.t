use strict;
use warnings;
use utf8;
use Test::More;
use JSON::PP qw(decode_json);
use FindBin;
use File::Spec;
binmode STDOUT,':encoding(UTF-8)';
my $probe=File::Spec->catfile($FindBin::Bin,'original-market-buy10-probe.pl');
my $json=qx{perl "$probe"};
is($?,0,'B-40 Perl frozen original buy-s.cgi executable completes probe');
my $x=eval {decode_json($json)};
ok(!$@ && ref($x) eq 'HASH','B-40 original source probe JSON is valid');
if(ref($x) eq 'HASH'){
  is($x->{price},5000,'B-40 source price 5000');
  ok($x->{supply}{marketBefore}[9]>=1,'B-40 actual source PLUS yields item #10');
  like($x->{initialEmpty}{reason},qr/GAME_ERROR/,
    'B-40 original zero wholesale refuses before commit');
  is($x->{initialEmpty}{commits},0,'B-40 no wholesale does not commit');
  ok($x->{success}{passed},'B-40 original buy-s.cgi reaches normal output');
  is($x->{success}{commits},1,'B-40 original transaction commits exactly once');
  is($x->{success}{money},95000,'B-40 original deducts 5000');
  is($x->{success}{paid},5000,'B-40 original adds current purchases');
  is($x->{success}{stock},1,'B-40 original receives one #10 in warehouse');
  is($x->{success}{time},957400,'B-40 original market purchase spends 600 seconds');
  is($x->{success}{market},$x->{supply}{marketBefore}[9]-1,
    'B-40 original reduces virtual market by 1');
  is(scalar(split(/,/,$x->{afterMarket}{wholesaleCsv},-1)),79,
    'B-40 original SetWholeStore serializes 79 CSV positions including trailing empties');
  is($x->{noMoney}{commits},0,'B-40 original no cash refuses without commit');
  is($x->{invalidCount}{commits},0,'B-40 original count 0 refuses without commit');
}
done_testing();
