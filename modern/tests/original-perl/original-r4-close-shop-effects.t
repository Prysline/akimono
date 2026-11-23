use strict;
use warnings;
use utf8;
use Test::More;
use FindBin;
use File::Spec;
use JSON::PP qw(decode_json);
my $p=File::Spec->catfile($FindBin::Bin,
  'original-r4-close-shop-effects-probe.pl');
my $raw=qx{perl "$p"};
is($?,0,'original full write.cgi::CloseShop compiles and runs actual File::Temp unlink');
my $x=eval{decode_json($raw)};
ok(!$@&&ref($x)eq'HASH','source CloseShop JSON archive and session effects');
if(ref($x)eq'HASH'){
  is(scalar(@{$x->{cases}}),3,'three original CloseShop branches');
  my($close,$missing,$already)=@{$x->{cases}};
  is($close->{input}{shop}{money},123456,'source money before original CloseShop');
  is($close->{input}{shop}{rank},88,'source ranking before original CloseShop');
  is($close->{output}{shop}{money},0,'actual source money reset');
  is($close->{output}{shop}{rank},0,'actual source rank reset');
  is($close->{output}{shop}{status},0,'actual source status inactive');
  is_deeply($close->{output}{deletedSessions},[
    '1-alpha.cgi','1-beta.cgi',
  ],'actual frozen original unlink removed only shop session files');
  is(scalar(@{$close->{output}{setUserDataCalls}}),1,
    'original source SetUserData call is explicitly recorded');
  is($close->{output}{writeErrorLogCalls}[0]{file},'delete',
    'original source sends archive to original delete log filename');
  is($close->{output}{writeErrorLogCalls}[0]{content},
    $close->{output}{archived},'original archive payload recorded exactly');
  like($close->{output}{archived},qr/123456/,
    'original archives full pre-zeroing shop details');
  ok(!$missing->{output}{closed},'no id2idx mapping returns without effect');
  is(scalar(@{$missing->{output}{writeErrorLogCalls}}),0,
    'unregistered ID does not archive an invalid store');
  ok($already->{output}{closed},
    'original source CloseShop has no additional status precondition');
  is($already->{output}{shop}{money},0,
    'already inactive shop remains zero');
}
done_testing();
