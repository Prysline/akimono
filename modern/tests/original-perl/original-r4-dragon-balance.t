use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use Test::More;
use JSON::PP qw(decode_json);
my $f=File::Spec->catfile($FindBin::Bin,'original-r4-dragon-balance-probe.pl');
my $raw=qx{perl "$f"};
is($?,0,'frozen full DragonBalance and shop revenue source executes with real temp file');
my $data=eval{decode_json($raw)};
ok(!$@&&ref($data)eq'HASH','original DragonBalance true source oracle JSON');
if(ref($data)eq'HASH'){
  is(scalar(@{$data->{cases}}),9,'nine original source file and shop scenarios');
  my @a=@{$data->{cases}};
  is($a[0]{output}{shops}[0]{money},1500,'original shop1 positive payout');
  is($a[0]{output}{shops}[1]{money},1700,'original shop2 negative payout');
  is($a[0]{output}{shops}[1]{paytoday},330,
    'negative payout increases period paytoday');
  is($a[1]{output}{shops}[0]{dragon},500,
    'duplicate payout IDs accumulate before the shop ledger');
  ok(!$a[2]{output}{payoutFilePresent},'missing original payout file');
  ok(!$a[2]{output}{payoutFileConsumed},'no file cannot be unlinked');
  is($a[2]{output}{shops}[0]{money},1250,
    'existing dragon amount still settled without payout file');
  ok($a[3]{output}{payoutFileConsumed},'empty payout file actually unlinked');
  is($a[4]{output}{shops}[0]{dragon},50,
    'original chop truncates final digit without newline');
  is($a[5]{output}{shops}[0]{dragon},200,
    'source CRLF file numeric conversion survives final CR');
  is($a[6]{output}{shops}[0]{money},1000,
    'unknown shop payout ID ignored');
  is($a[7]{output}{shops}[1]{dragon},-800,
    'source negative payout accumulates with prior dragon');
  is($a[8]{output}{shops}[0]{dragon},200,
    'positive opening dragon plus negative payout becomes positive net');
}
done_testing();
