use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use File::Spec;
binmode STDOUT, ':raw';

our (@rows,%EVENT,%DTevent);
sub source {
  my($name)=@_;
  open my $fh,'<:encoding(UTF-8)',File::Spec->catfile($FindBin::Bin,$name)
    or die "Cannot read frozen original $name: $!";
  local $/; my $content=<$fh>;close $fh;return $content;
}
my $compiler=source('inc-makeitem.cgi');
my $turn=source('inc-turn.cgi');
for my $marker (
  'foreach my $key (keys(%EVENT))',
  'foreach my $key (keys(%DTevent))',
) {
  die "Original turn hash traversal drift: $marker"
    unless index($turn,$marker)>=0;
}
# GetNumber/GetTime and the two EVENT DSL files are executed by existing
# original B-53 catalog oracle; there are no hand-picked 17 event codes.
my $catalogProbe=File::Spec->catfile($FindBin::Bin,
  'original-b53-event-catalog-probe.pl');
open my $pipe,'-|',$^X,$catalogProbe or die "Cannot launch catalog oracle: $!";
local $/;
my $catalogJson=<$pipe>;
close $pipe or die 'Frozen original EVENT catalog oracle failed';
my $catalog=JSON::PP->new->utf8->decode($catalogJson);
my @compiled=grep {$_->{compiled}} @{$catalog->{declared}};
die 'Expected 17 original compiled EVENTs' unless @compiled==17;
my @declarationOrder=map {$_->{code}} @compiled;

# Reconstruct the original 13 tab fields, then execute the actual compiled
# Perl EVENT hash initializer verbatim from inc-makeitem.cgi::OutEventData.
@rows=map {
  my $e=$_;
  join("\t",
    $e->{code},$e->{group},$e->{startProba},
    $e->{callbacks}{start}//'', '',
    $e->{callbacks}{end}//'', '',
    $e->{baseTimeSeconds},$e->{plusTimeSeconds},
    '','',$e->{callbacks}{now}//'','')
} @compiled;
my($initializer)=$compiler=~/
  print\ EOUT\ <<'CODE';\r?\n
  (\)\r?\n\{\r?\n[\s\S]*?^\}\r?\n)
  CODE
/mx;
die 'Frozen emitted EVENT hash initializer missing' unless defined($initializer);
for my $marker (
  'my $hash={};',
  '$EVENT{$hash->{code}}=$hash;',
  ')=split(/\t/);',
) {
  die "Original EVENT hash initializer drift: $marker"
    unless index($initializer,$marker)>=0;
}
my $compiledOk=eval "no strict; no warnings; foreach(\@rows\n".
  $initializer."\n1;";
die "Cannot execute frozen EVENT initializer: $@" unless $compiledOk;
die 'Original compiled EVENT count mismatched generated Perl'
  unless keys(%EVENT)==17;
my @originalKeysFirst=keys(%EVENT);
my @originalKeysSecond=keys(%EVENT);
die 'Perl keys changed within unchanged same-process hash'
  unless join("\0",@originalKeysFirst)eq join("\0",@originalKeysSecond);

# This existing-event subset is isolated fixture data, NOT the actual world.
my @activeFixture=@declarationOrder[0,6,12];
%DTevent=map {($_=>1000000)} @activeFixture;
my @activeHashOrder=keys(%DTevent);
die 'Original initializer lost/duplicated EVENT keys'
  unless join("\0",sort @declarationOrder)eq
         join("\0",sort @originalKeysFirst);
die 'Existing EVENT fixture hash lost keys'
  unless join("\0",sort @activeFixture)eq
         join("\0",sort @activeHashOrder);
print JSON::PP->new->canonical->utf8->encode({
  oracle=>'frozen inc-makeitem generated EVENT initializer evaluated in actual Perl process',
  compiler=>'frozen GetNumber/GetTime + original compiled EVENT DSL',
  declaredCount=>scalar(@{$catalog->{declared}}),
  compiledCount=>scalar(@declarationOrder),
  declarationOrder=>\@declarationOrder,
  perlEventHashOrder=>\@originalKeysFirst,
  perlEventHashOrderRepeated=>\@originalKeysSecond,
  activeFixtureInsertionOrder=>\@activeFixture,
  perlActiveFixtureHashOrder=>\@activeHashOrder,
  scope=>'hash order observation only; no full EVENT lifecycle or deterministic replay',
});
