use strict;
use warnings;
use utf8;
use Test::More;
use JSON::PP;
use FindBin;
use File::Spec;

my $probe=File::Spec->catfile($FindBin::Bin,'original-r4-data-write-files-probe.pl');
my $json=qx{$^X "$probe"};
is($?,0,'pinned original DataWrite/commit/reload probe exits successfully');
my $r=eval{JSON::PP->new->utf8->decode($json)};
ok($r && ref($r->{cases}) eq 'ARRAY','actual original write oracle returns JSON');
if($r && ref($r->{cases}) eq 'ARRAY'){
  is(scalar @{$r->{cases}},2,'two real filesystem periods and in-between original DataRead');
  my($a,$b)=@{$r->{cases}};
  for my $entry ($a,$b){
    is($entry->{staged},$entry->{live},
      'original staged play.cgi bytes equal real renamed file bytes');
    ok($entry->{commitMarkerGone},'real commit marker removed after commit');
    ok($entry->{stagedMoved},'real staged file removed by rename');
    like($entry->{live},qr/^(\d+)\n\d+,/,'real original play.cgi two-line header');
    like($entry->{live},qr{\n//\n},'original data/shop separator persisted');
  }
  is(scalar @{$a->{input}{shops}},2,
    'first original DataWrite receives active and stopped shop');
  is(scalar @{$b->{input}{shops}},1,
    'second source DataRead reload does not resurrect stopped shop');
  isnt($a->{live},$b->{live},
    'second stage is based on actual previous file, not a fixed result');
  is($a->{input}{shops}[0]{money},17200,'first period input is source shop');
  is($b->{input}{shops}[0]{money},16900,'next period edits reloaded shop');
}
done_testing();
