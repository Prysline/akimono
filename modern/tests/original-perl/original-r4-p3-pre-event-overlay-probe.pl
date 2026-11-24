use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use lib $FindBin::Bin;
use OriginalR4PreEventHarness;
binmode STDIN,':raw';
binmode STDOUT,':raw';
local $/;
my $input=JSON::PP->new->utf8->decode(<STDIN>);
my @order=@{OriginalR4PreEventHarness::prepare($input,0)};
@main::B35_DRAWS=@{$input->{draws}};
$main::B35_USED=0;@main::B39_DEBUG_LOG=();
main::ActualPreEvent($input->{span},exists($input->{settlement})?1:0);
my @whole=map {0+($_//0)} @main::DTwholestore[0..78];
my @defined=grep {defined($main::DTwholestore[$_])}0..$#main::DTwholestore;
no warnings 'uninitialized';
print JSON::PP->new->utf8->canonical->encode({
  shop=>$main::DT[0],wholesale=>\@whole,defined=>\@defined,
  (exists $input->{settlement}?(town=>$main::STATE,dtPeople=>0+$main::DTpeople):()),
  csv=>join(',',@main::DTwholestore),activeOrder=>\@order,
  consumed=>[ @{$input->{draws}}[0..$main::B35_USED-1] ],
  used=>$main::B35_USED,
  plus=>[map{0+($main::ITEM[$_]{plus}//0)}1..79],
  scope=>'true original compiled prior EVENT overlays, natural sale, FUNCTURN/FUNCSALE, SortDT, all 59 PLUS and CheckWholeStore only',
});
