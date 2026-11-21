use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use lib $FindBin::Bin;
use OriginalNayutaFuncturnHarness;
binmode STDOUT,':encoding(UTF-8)';
my @zeros=(0)x121;
my $display=OriginalNayutaFuncturnHarness::run(
  display=>1,randomDraws=>\@zeros);
my $empty=OriginalNayutaFuncturnHarness::run(
  display=>0,randomDraws=>\@zeros);
my $fractionYes=OriginalNayutaFuncturnHarness::callback_only(
  timespan=>60,randomDraws=>[0]);
my $fractionNo=OriginalNayutaFuncturnHarness::callback_only(
  timespan=>60,randomDraws=>[999999]);
my $above=OriginalNayutaFuncturnHarness::callback_only(
  timespan=>8640,price=>50001);
my $capped=OriginalNayutaFuncturnHarness::callback_only(
  timespan=>8640,rank=>9980);
print JSON::PP->new->canonical->encode({
  displayed=>$display,empty=>$empty,fractionYes=>$fractionYes,
  fractionNo=>$fractionNo,abovePrice=>$above,rankCapped=>$capped,
});
