use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use Test::More;
use JSON::PP qw(decode_json);
my $probe=File::Spec->catfile($FindBin::Bin,
  'original-b55-instant-event-callback-probe.pl');
my $raw=qx{perl "$probe"};
is($?,0,'B-55 invokes original Standard Street theft and robbery STARTFUNC bodies');
my $proof=eval{decode_json($raw)};
ok(!$@&&ref($proof)eq'HASH','source callback fixture JSON decoded');
if(ref($proof)eq'HASH'){
  my @cases=@{$proof->{cases}};
  is(scalar(@cases),10,'ten fixed source paths through real Perl callbacks');
  my %cases=map {$_->{name}=>$_} @cases;
  is($cases{'theft-untargeted'}{output}{item}[9],12,'untargeted theft keeps stock');
  is($cases{'theft-12-stock'}{output}{item}[9],11,
    'original theft removes int(12/10) displayed merchandise');
  is($cases{'theft-9-stock'}{output}{item}[9],9,
    'original theft floors nine items to zero loss');
  is($cases{'theft-robot-protects'}{output}{item}[63],1,
    'robot prevents theft and survives when defense draw >200');
  is($cases{'theft-robot-destroyed'}{output}{item}[63],0,
    'robot destroyed when defense draw <=200');
  is($cases{'robbery-12-stock'}{output}{item}[9],9,
    'original robbery removes int(12/4) stock');
  is($cases{'robbery-12-stock'}{output}{rank},4000,
    'robbery subtracts int(5000/5) popularity');
  is($cases{'robbery-1-stock'}{output}{rank},4000,
    'original robbery popularity loss even with one unsellable item');
  is($cases{'robbery-robot'}{output}{item}[63],0,
    'robot destroyed by robbery');
  is($cases{'robbery-robot'}{output}{rank},5000,
    'source robbery robot absorbs rank loss');
  is($cases{'robbery-empty-shelf'}{output}{rank},4000,
    'empty shelf still loses popularity');
  for my $c(@cases){
    is($c->{output}{returnCode},0,
      $c->{name}.' callback returns false; no active event record');
    is($c->{output}{randomDrawsUsed},scalar(@{$c->{input}{randomDraws}}),
      $c->{name}.' consumes exact source sample count');
  }
}
done_testing();
