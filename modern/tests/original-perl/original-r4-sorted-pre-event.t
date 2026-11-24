use strict;
use warnings;
use utf8;
use Test::More;
use JSON::PP qw(encode_json decode_json);
use IPC::Open2;
use FindBin;
use File::Spec;
my $probe=File::Spec->catfile($FindBin::Bin,'original-r4-sorted-pre-event-probe.pl');
my $shop={id=>1,name=>'source-owner',status=>1,rank=>5010,rankingcount=>0,
  profitstock=>0,saletoday=>10000,taxtoday=>0,paytoday=>5000};
my($out,$in);
my $pid=open2($out,$in,$^X,$probe);
print $in encode_json($shop);close $in;
my $payload=do{local $/;<$out>};close $out;waitpid($pid,0);
is($?,0,'frozen Core SortDT source executes');
my $result=eval{decode_json($payload)};
ok(!$@&&ref($result)eq'HASH','real Core result decoded');
if(ref($result)eq'HASH'){
  is($result->{shop}{rank},5010,'SortDT does not alter rank');
  is($result->{idIndex},0,'one shop original id index');
  is($result->{nameIndex},0,'one shop original name index');
  ok($result->{shop}{point}>0,'original source point computed');
}
done_testing();
