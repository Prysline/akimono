use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use Test::More;
use JSON::PP qw(decode_json);
my $probe=File::Spec->catfile($FindBin::Bin,
  'original-r4-guildbattle-end-probe.pl');
my $raw=qx{perl "$probe"};
is($?,0,'frozen actual guildbattle ENDFUNC and END/START executed');
my $o=eval{decode_json($raw)};
ok(!$@&&ref($o)eq'HASH','original guildbattle oracle JSON');
if(ref($o)eq'HASH'){
  is(scalar(@{$o->{cases}}),5,'five original guildbattle boundary cases');
  my $first=$o->{cases}[0]{output};
  is($first->{dominion},'beta','guild with highest money takes city');
  is($first->{readGuildCalls},1,'original ReadGuild dependency invoked once');
  is($first->{readGuildDataCalls},1,'original ReadGuildData invoked once');
  is($first->{setTownCalls},1,'original SetTownData invoked once');
  is(scalar(@{$first->{logs}}),1,'source END result log once');
  is(scalar(@{$first->{randomDrawRanges}}),1,
    'expired callback followed by original zero START rand');
  is($o->{cases}[1]{output}{readGuildCalls},0,
    'strict equality boundary preserves event; no END callback');
  is(scalar(@{$o->{cases}[1]{output}{randomDrawRanges}}),0,
    'still active group skips START gate rand');
  ok(!$o->{cases}[3]{output}{eventPersisted},
    'zero START never persists guildbattle without external activation');
}
done_testing();
