use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use lib $FindBin::Bin;
use OriginalInlineCallbackHarness;
binmode STDOUT, ':encoding(UTF-8)';

# Source inline Perl is actually run; real WriteLog is intercepted.
# Original inc-makeitem, require, CGI and persistent world are never run.
OriginalInlineCallbackHarness::bootstrap();
my @fixtures=(
  {label=>'work-1',kind=>'work',sourceUseNo=>1,
    data=>{money=>700,param1=>3000,count=>2,shopId=>42,shopName=>'原版店'}},
  {label=>'work-alias-2',kind=>'work',sourceUseNo=>2,
    data=>{money=>900,param1=>10000,count=>1,shopId=>9,shopName=>'職業店'}},
  {label=>'work-zero',kind=>'work',sourceUseNo=>1,
    data=>{money=>900,param1=>3000,count=>0,shopId=>42,shopName=>'原版店'}},
  {label=>'work-negative-count',kind=>'work',sourceUseNo=>1,
    data=>{money=>200,param1=>3000,count=>-1,shopId=>42,shopName=>'原版店'}},
  {label=>'work-negative-param',kind=>'work',sourceUseNo=>1,
    data=>{money=>-400,param1=>-1500,count=>2,shopId=>42,shopName=>'原版店'}},
  {label=>'work-million',kind=>'work',sourceUseNo=>2,
    data=>{money=>0,param1=>1000000,count=>3,shopId=>42,shopName=>'原版店'}},
  {label=>'showcase-expand-4',kind=>'showcase',sourceUseNo=>4,
    data=>{showcaseCount=>2,showcase=>[10,20],prices=>[100,200],
      newCount=>4,shopId=>88,shopName=>'展覽店'}},
  {label=>'showcase-shrink-2',kind=>'showcase',sourceUseNo=>2,
    data=>{showcaseCount=>6,showcase=>[1,2,3,4,5,6],
      prices=>[10,20,30,40,50,60],newCount=>2,shopId=>42,shopName=>'原版店'}},
  {label=>'showcase-equal-not-normalized',kind=>'showcase',sourceUseNo=>2,
    data=>{showcaseCount=>2,showcase=>[1,2,3],prices=>[10,20,30],
      newCount=>2,shopId=>42,shopName=>'原版店'}},
  {label=>'showcase-underfilled',kind=>'showcase',sourceUseNo=>4,
    data=>{showcaseCount=>2,showcase=>[7],prices=>[11],
      newCount=>4,shopId=>42,shopName=>'原版店'}},
  {label=>'showcase-existing-tail',kind=>'showcase',sourceUseNo=>3,
    data=>{showcaseCount=>1,showcase=>[2,4,6,8,10],
      prices=>[20,40,60,80,100],newCount=>3,shopId=>42,shopName=>'原版店'}},
  {label=>'showcase-from-zero',kind=>'showcase',sourceUseNo=>1,
    data=>{showcaseCount=>0,showcase=>[],prices=>[],
      newCount=>1,shopId=>42,shopName=>'原版店'}},
  {label=>'showcase-shrink-underfilled',kind=>'showcase',sourceUseNo=>1,
    data=>{showcaseCount=>4,showcase=>[5],prices=>[50],
      newCount=>1,shopId=>42,shopName=>'原版店'}},
);
my @out;
my $current='';
for my $row (@fixtures){
  my($label,$kind,$sourceUseNo,$v)=
    @{$row}{qw(label kind sourceUseNo data)};
  if($current ne $kind){
    OriginalInlineCallbackHarness::select_callback($kind);
    $current=$kind;
  }
  OriginalInlineCallbackHarness::fixture(
    money=>exists $v->{money}?$v->{money}:1000,
    param1=>exists $v->{newCount}?$v->{newCount}:$v->{param1},
    count=>exists $v->{count}?$v->{count}:1,
    shopId=>$v->{shopId},shopName=>$v->{shopName},
    showcaseCount=>exists $v->{showcaseCount}?$v->{showcaseCount}:2,
    showcase=>$v->{showcase}//[10,20],
    prices=>$v->{prices}//[100,200],
    moneyPrefix=>'¥',moneySuffix=>'',
  );
  my $returned=OriginalInlineCallbackHarness::run();
  my $dt=$item::DT;
  my $inp=$kind eq 'work'
    ?{money=>$v->{money},param1=>$v->{param1},count=>$v->{count},
      shopId=>$v->{shopId},shopName=>$v->{shopName},
      moneyPrefix=>'¥',moneySuffix=>''}
    :{showcaseCount=>$v->{showcaseCount},
      showcase=>$v->{showcase},prices=>$v->{prices},
      newCount=>$v->{newCount},
      shopId=>$v->{shopId},shopName=>$v->{shopName}};
  push @out,{
    case=>$label,kind=>$kind,sourceUseNo=>$sourceUseNo,
    input=>$inp,observed=>{
      returned=>$returned,moneyAfter=>$dt->{money},
      showcaseCountAfter=>$dt->{showcasecount},
      showcase=>[@{$dt->{showcase}}],prices=>[@{$dt->{price}}],
      logs=>[map{[@$_]}@OriginalInlineCallbackHarness::LOGS],
      item=>[@{$dt->{item}}],time=>$dt->{time},exp=>$dt->{exp},
    },
  };
}
print JSON::PP->new->canonical->encode(\@out),"\n";
