use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use lib $FindBin::Bin;
use OriginalFullUseLostbookHarness;
binmode STDOUT, ':encoding(UTF-8)';

# B-30: each probe consists of source-extracted Core UseItem + MakeAmount,
# time, wholesale, actual inc-item UseItem/UseItemSub and Standard Street
# lostbook. The original RequireFile is NOT executed: recording-only stub.
my @cases=(
  ['baseline-trigger',{}],
  ['baseline-skipped',{param1=>0,seed=>17}],
  ['callback-absent',{callback=>''}],
  ['money-zero',{money=>10}],
  ['experience-gate',{needExp=>201}],
  ['experience-zero',{expPerUse=>0}],
  ['experience-cap',{exp=>990}],
  ['old-exp-override',{experienceOld=>1000}],
  ['zero-stock-callback',{emptyActions=>1,initialStock=>0,requestedCount=>1}],
  ['inactive-shop',{status=>0}],
  ['half-probability-low',{param1=>500,seed=>46}],
  ['half-probability-high',{param1=>500,seed=>73}],
  ['duplicate-materials',{duplicateMaterials=>1,requestedCount=>1}],
);
my @rows;
for my $case(@cases){
  my($label,$input)=@$case;
  my $snapshot=OriginalFullUseLostbookHarness::run(%$input);
  push @rows,{case=>$label,input=>$input,observed=>$snapshot};
}
print JSON::PP->new->canonical->encode(\@rows),"\n";
