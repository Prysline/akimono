use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use lib $FindBin::Bin;
use OriginalNayutaFuncturnHarness;
binmode STDIN,':raw';
binmode STDOUT,':raw';
local $/;
my $input=JSON::PP->new->utf8->decode(<STDIN>);
OriginalNayutaFuncturnHarness::bootstrap();
OriginalNayutaFuncturnHarness::prepare_items();
# Reuse P3's exact source-compiled holding cost setup; all 79 items are
# initialized before the actual generated EVENT overlays execute.
for my $id(1..79){
  my $row=OriginalNaturalSalePlusHarness::compiled_item($id);
  for my $key(qw(price popular point cost)){
    $main::ITEM[$id]{$key}=$row->{$key} if defined $row->{$key};
  }
  $main::ITEM[$id]{type}=10;
}
$main::ITEM[63]{cost}=0;
$main::ITEM[70]{functurn}='_local_';$main::ITEM[70]{no}=70;
my $turn=OriginalGiftMapUseHarness::source('inc-turn.cgi');
my $read=OriginalGiftMapUseHarness::source('inc-func.cgi');
my($get)=$read=~/(^sub GetDTPoint\n\{[\s\S]*?^\}\n)(?=\nsub CheckUserPass)/m;
die 'original GetDTPoint source moved' unless $get;
eval "no strict;no warnings;$get\n1;" or die $@;
my $a=index($turn,"\t\t#\@\@item funcs 処理");
my $b=index($turn,"\t\t#決算処理",$a);
die 'actual FUNCSALE/SortDT source missing' unless $a>=0&&$b>$a;
my $functail=substr($turn,$a,$b-$a);
my $natural=OriginalNaturalSalePlusHarness::natural_source();
my $funct=OriginalNayutaFuncturnHarness::original_turn_loop();
my $ok=eval "package main;no strict;no warnings;use utf8;sub ActualPreEvent {my(\$timespan)=\@_; \$TIMESPAN=\$timespan;\$item::TIMESPAN=\$timespan;\n$natural\n$funct\n$functail\nB35SourceStep(\$timespan);1;}\n1;";
die "original pre-EVENT source compile failed $@" unless $ok;
open my $p,'-|',$^X,"$FindBin::Bin/original-r4-event-item-param-probe.pl" or die $!;
my $raw=<$p>;close $p or die 'original overlay compiler failed';
my $compiled=JSON::PP->new->utf8->decode($raw);
my %generated=map {$_->{eventCode}=>$_->{generatedSource}} @{$compiled->{cases}};
%main::DTevent=%{$input->{events}};
my @order=keys %main::DTevent;
for my $code(@order){
  next if $code eq 'happy';
  die 'unknown source overlay' unless exists $generated{$code};
  eval "no strict;no warnings;".$generated{$code}."\n1;" or die $@;
}
@main::DT=($input->{shop});
@main::DTwholestore=length($input->{csv})?map{length($_)?0+$_:undef}split(/,/,$input->{csv},-1):();
@main::B35_DRAWS=@{$input->{draws}};
$main::B35_USED=0;@main::B39_DEBUG_LOG=();
main::ActualPreEvent($input->{span});
my @whole=map {0+($_//0)} @main::DTwholestore[0..78];
my @defined=grep {defined($main::DTwholestore[$_])}0..$#main::DTwholestore;
no warnings 'uninitialized';
print JSON::PP->new->utf8->canonical->encode({
  shop=>$main::DT[0],wholesale=>\@whole,defined=>\@defined,
  csv=>join(',',@main::DTwholestore),activeOrder=>\@order,
  consumed=>[ @{$input->{draws}}[0..$main::B35_USED-1] ],
  used=>$main::B35_USED,
  plus=>[map{0+($main::ITEM[$_]{plus}//0)}1..79],
  scope=>'true original compiled prior EVENT overlays, natural sale, FUNCTURN/FUNCSALE, SortDT, all 59 PLUS and CheckWholeStore only',
});
