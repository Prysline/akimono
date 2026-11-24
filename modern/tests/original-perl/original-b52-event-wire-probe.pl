use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use JSON::PP;
binmode STDOUT,':raw';

sub source{
  my($name)=@_;
  my $file=File::Spec->catfile($FindBin::Bin,$name);
  open(my $fh,'<:encoding(UTF-8)',$file) or die $!;
  local $/;my $content=<$fh>;close $fh;
  return $content;
}
my $admin=source('core-inc-admin-func.cgi');
my $reader=source('inc-func.cgi');
my $writer=source('write.cgi');
my($seed)=$admin=~/print DATA time\(\)\."([^"]+)"/;
die 'Source admin original play CGI initialization moved'
  unless defined($seed)&&
    $seed eq '\n500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0\n\n\n//\n';
# The first source character after time() is a literal \n, not a caret;
# avoid assigning any imagined actual event instance to this new world.
$seed=~s/\\n/\n/g;
our(@DATA,$idx,%DTevent);
@DATA=split(/\n/,"1000000".$seed);
die 'Original admin must have an empty event CSV slot'
  unless defined $DATA[2] && $DATA[2] eq '' &&
    defined $DATA[3] && $DATA[3] eq '' &&
    $DATA[4] eq '//';
my($readRegion)=$reader=~/(^\s*%DTevent=split\(\/,\/,\$DATA\[\$idx\+\+\]\);)/m;
die 'Original DataRead event parser statement missing' unless defined $readRegion;
my($writeRegion)=$writer=~/(^\s*print OUT join\(",",%DTevent\)\."\\n";)/m;
die 'Original DataWrite event persistence statement missing' unless defined $writeRegion;
$idx=3;
%DTevent=(fake=>42);
my $ok=eval 'no strict; no warnings; '.$readRegion."\n1;";
die "Original parser failed: $@" unless $ok;
die 'Original parser invented events for empty initial world' if keys %DTevent;
my $emptyEventCount=scalar(keys %DTevent);
my $emptyWire='';
open(OUT,'>',\$emptyWire) or die $!;
$ok=eval 'no strict; no warnings; '.$writeRegion."\n1;";
die "Original writer failed: $@" unless $ok;
close OUT;
die 'Original writer did not preserve empty CSV event field'
  unless $emptyWire eq "\n";
%DTevent=(rebel=>123456);
my $activeWire='';
open(OUT,'>',\$activeWire) or die $!;
$ok=eval 'no strict; no warnings; '.$writeRegion."\n1;";
die "Original writer active failed: $@" unless $ok;
close OUT;
die 'Original writer single EVENT instance changed'
  unless $activeWire eq "rebel,123456\n";
@DATA=(undef,undef,undef,'rebel,123456');
$idx=3;%DTevent=();
$ok=eval 'no strict; no warnings; '.$readRegion."\n1;";
die "Original active EVENT read failed: $@" unless $ok;
die 'Original active EVENT serialization not round-tripped'
  unless scalar(keys %DTevent)==1 && $DTevent{rebel} eq '123456';
print JSON::PP->new->utf8->canonical->encode({
  source=>'real original admin/init + DataRead + DataWrite event CSV statements',
  eventWireEmpty=>$emptyWire,initialActiveCount=>$emptyEventCount,
  oneActiveWire=>$activeWire,oneActiveEvents=>{%DTevent},
  note=>'only initial active EVENT slot, not 25 source event definitions or any event callback',
});
