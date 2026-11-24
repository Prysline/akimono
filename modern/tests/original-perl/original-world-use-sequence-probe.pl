use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use lib $FindBin::Bin;
use OriginalFullUseLostbookHarness;
binmode STDOUT, ':encoding(UTF-8)';

# B-32: Source-execute the reviewed original Perl function sequence twice.
# All A/B/C products are synthetic (NOT Standard Street item IDs).
# Only original functions from B-30 are used; no CGI/IO/world writes.
my @sequences=(
  ['trigger-twice',[
    {requestedCount=>1,param1=>1000,seed=>12},
    {requestedCount=>1,param1=>1000,seed=>14},
  ]],
  ['skip-then-trigger',[
    {requestedCount=>1,param1=>0,seed=>12},
    {requestedCount=>1,param1=>1000,seed=>14},
  ]],
  ['no-callback-twice',[
    {requestedCount=>1,param1=>1000,callback=>'',seed=>12},
    {requestedCount=>1,param1=>1000,callback=>'',seed=>14},
  ]],
);
my @rows;
for my $sequence(@sequences){
  my($label,$commands)=@$sequence;
  my %before=(
    stocks=>[8,4,3],otherShopStock=>[3,4,2],wholesale=>[4,0,-5],
    money=>70,paytoday=>5,storedTimeSeconds=>950,nowSeconds=>1000,
    exp=>200,status=>1,
  );
  my @steps;
  for my $action(@$commands){
    my %input=(%before,%$action);
    my $observed=OriginalFullUseLostbookHarness::run(%input);
    push @steps,{
      input=>\%input,
      observed=>$observed,
    };
    %before=(
      stocks=>$observed->{stock},
      otherShopStock=>$observed->{otherShopStock},
      wholesale=>$observed->{wholesale},
      money=>$observed->{money},paytoday=>$observed->{paytoday},
      storedTimeSeconds=>$observed->{time},nowSeconds=>1000,
      exp=>$observed->{exp},status=>1,
    );
  }
  push @rows,{case=>$label,steps=>\@steps,final=>\%before};
}
print JSON::PP->new->canonical->encode(\@rows),"\n";
