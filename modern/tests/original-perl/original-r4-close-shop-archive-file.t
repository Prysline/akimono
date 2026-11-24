use strict;
use warnings;
use utf8;
use Test::More;
use JSON::PP;
use FindBin;
use File::Spec;

my $probe=File::Spec->catfile($FindBin::Bin,
  'original-r4-close-shop-archive-file-probe.pl');
my $json=qx{$^X "$probe"};
is($?,0,'unmodified original CloseShop and WriteErrorLog real disk oracle exits cleanly');
my $data=eval{JSON::PP->new->utf8->decode($json)};
ok($data && ref $data->{cases} eq 'ARRAY',
  'original full CloseShop archive stdout is decoded');
if($data && ref $data->{cases} eq 'ARRAY'){
  is(scalar @{$data->{cases}},4,
    'original filesystem has empty, append, rotation and missing directory cases');
  for my $row(@{$data->{cases}}){
    is($row->{output}{shop}{status},0,'actual source closes store');
    is($row->{output}{shop}{money},0,'actual source clears money');
    is($row->{output}{shop}{rank},0,'actual source clears rank');
    is_deeply($row->{output}{remainingSessions},['2-keep.cgi'],
      'actual session unlink leaves nonmatching source');
  }
  my($empty,$append,$rotate,$missing)=@{$data->{cases}};
  like($empty->{output}{liveLog},qr/12345/,
    'real UTF-8 archive writes original money before zeroing');
  like($empty->{output}{liveLog},qr/來源原版關店/,
    'real archived log has original UTF-8 shop name');
  like($append->{output}{liveLog},qr/^既有封存\n/,
    'original appends after existing actual log bytes');
  is($rotate->{output}{oldLog},$rotate->{input}{logPrior},
    'original rotates actual file strictly larger than 30000 bytes');
  unlike($rotate->{output}{liveLog},qr/^X{100}/,
    'rotated live archive contains only new entry');
  ok(!defined($missing->{output}{liveLog}),
    'original failed append leaves missing log absent');
  is($missing->{output}{shop}{status},0,
    'original CloseShop still mutates shop after WriteErrorLog failure');
}
done_testing();
