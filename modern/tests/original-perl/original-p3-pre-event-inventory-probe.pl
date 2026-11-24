use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use lib $FindBin::Bin;
use OriginalNayutaFuncturnHarness;
# Source differential ONLY: caller supplies a snapshot for arithmetic tests.
# This program is never a player acquisition or save/load path.
local $/;
my $input=decode_json(<STDIN>);
OriginalNayutaFuncturnHarness::bootstrap();
OriginalNayutaFuncturnHarness::prepare_items();
my $shop=$input->{shop};
my $shelf=$shop->{showcase}[0];
for my $id (1..79){
  next unless $shop->{item}[$id-1] || $id==$shelf;
  next if $id==63; # original zero-price tool, already set to cost zero by B39
  my $row=OriginalNaturalSalePlusHarness::compiled_item($id);
  for my $key (qw(price popular point cost)){
    $main::ITEM[$id]{$key}=$row->{$key};
  }
  # One shelf only: a nonzero item type is sufficient for the original
  # specialist-type count; no multi-type sale comparison is claimed.
  $main::ITEM[$id]{type}=10;
}
$main::ITEM[70]{functurn}='_local_';
$main::ITEM[70]{no}=70;
@main::DT=($shop);
@main::DTwholestore=map {length($_)?0+$_:undef} split(/,/, $input->{csv}, -1);
@main::B35_DRAWS=@{$input->{draws}};
$main::B35_USED=0;
@main::B39_DEBUG_LOG=();
main::B39SourceNaturalTurnPlus($input->{span});
my @whole=map {0+($_//0)} @main::DTwholestore[0..78];
my @defined=grep {defined($main::DTwholestore[$_])} 0..$#main::DTwholestore;
no warnings 'uninitialized';
print encode_json({
  shop=>$main::DT[0],wholesale=>\@whole,defined=>\@defined,
  csv=>join(',',@main::DTwholestore),used=>$main::B35_USED,
  consumed=>[ @main::B35_DRAWS[0..$main::B35_USED-1] ],
});
