use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use lib $FindBin::Bin;
use OriginalItemHelperHarness;
binmode STDOUT, ':encoding(UTF-8)';

# B-29: only the five reviewed exact source subroutine texts are executed,
# with synthetic in-memory @ITEM and DT/USE. No real game filesystem,
# callback compilation, random-stream equivalence or outer transaction.
OriginalItemHelperHarness::bootstrap();
my @rows=(
 ['use-sub-normal','helper',{
   method=>'UseItemSub',itemNo=>1,stock=>7,count=>3,limit=>10,message=>'正常',
   result=>{count=>7}}],
 ['use-sub-shortage','helper',{
   method=>'UseItemSub',itemNo=>2,stock=>2,count=>8,limit=>10,message=>'不足',
   result=>{count=>7}}],
 ['use-sub-empty','helper',{
   method=>'UseItemSub',itemNo=>1,stock=>0,count=>1,limit=>10,message=>'零',
   result=>{count=>7}}],
 ['use-sub-negative-request','helper',{
   method=>'UseItemSub',itemNo=>1,stock=>2,count=>-3,limit=>10,message=>'負數',
   result=>{count=>7}}],
 ['use-sub-negative-stock','helper',{
   method=>'UseItemSub',itemNo=>1,stock=>-5,count=>1,limit=>10,message=>'負庫存',
   result=>{count=>7}}],
 ['add-sub-normal','helper',{
   method=>'AddItemSub',itemNo=>1,stock=>3,count=>2,limit=>10,message=>'正常',
   result=>{count=>7}}],
 ['add-sub-cap','helper',{
   method=>'AddItemSub',itemNo=>2,stock=>8,count=>5,limit=>10,message=>'上限',
   result=>{count=>7}}],
 ['add-sub-full','helper',{
   method=>'AddItemSub',itemNo=>1,stock=>10,count=>1,limit=>10,message=>'已滿',
   result=>{count=>7}}],
 ['add-sub-overlimit','helper',{
   method=>'AddItemSub',itemNo=>1,stock=>15,count=>1,limit=>10,message=>'超限',
   result=>{count=>7}}],
 ['add-sub-overlimit-zero','helper',{
   method=>'AddItemSub',itemNo=>1,stock=>15,count=>0,limit=>10,message=>'零請求',
   result=>{count=>7}}],
 ['add-sub-negative','helper',{
   method=>'AddItemSub',itemNo=>1,stock=>3,count=>-5,limit=>10,message=>'負取得',
   result=>{count=>7}}],
 ['use-normal','helper',{
   method=>'UseItem',itemNo=>2,stock=>4,count=>2,limit=>10,message=>'試用消耗',
   result=>{count=>7}}],
 ['use-shortage-stale','helper',{
   method=>'UseItem',itemNo=>1,stock=>1,count=>10,limit=>10,message=>'需求過量',
   result=>{
     count=>9,useitem=>[[2,6]],usemsg=>['原訊息'],additem=>[[1,2]],
     addmsg=>['保留新增'],other=>'欄位保留',
   }}],
 ['use-zero-record','helper',{
   method=>'UseItem',itemNo=>1,stock=>0,count=>1,limit=>10,message=>'空庫存',
   result=>{count=>3}}],
 ['use-negative-record','helper',{
   method=>'UseItem',itemNo=>1,stock=>-5,count=>1,limit=>10,message=>'負庫存',
   result=>{count=>3}}],
 ['use-negative-request','helper',{
   method=>'UseItem',itemNo=>2,stock=>5,count=>-3,limit=>10,message=>'負請求',
   result=>{count=>3}}],
 ['add-normal','helper',{
   method=>'AddItem',itemNo=>1,stock=>3,count=>2,limit=>10,message=>'取得兩件',
   result=>{count=>3}}],
 ['add-cap','helper',{
   method=>'AddItem',itemNo=>1,stock=>8,count=>5,limit=>10,message=>'取得五件',
   result=>{count=>3}}],
 ['add-zero-record','helper',{
   method=>'AddItem',itemNo=>1,stock=>10,count=>1,limit=>10,message=>'已滿',
   result=>{count=>3}}],
 ['add-negative-record','helper',{
   method=>'AddItem',itemNo=>1,stock=>15,count=>1,limit=>10,message=>'超限',
   result=>{count=>9,additem=>[[2,1]],addmsg=>['先前取得'],usemsg=>['先前消耗']}}],
 ['add-negative-request','helper',{
   method=>'AddItem',itemNo=>2,stock=>3,count=>-5,limit=>10,message=>'負取得',
   result=>{count=>3}}],
 ['lostbook-trigger','lostbook',{
   itemNo=>1,itemName=>'書本甲',stock=>5,param1=>1000,seed=>9,
   result=>{count=>7,additem=>[[2,4]]}}],
 ['lostbook-skip','lostbook',{
   itemNo=>2,itemName=>'書本乙',stock=>5,param1=>0,seed=>12,
   result=>{count=>3}}],
 ['lostbook-no-stock','lostbook',{
   itemNo=>2,itemName=>'書本乙',stock=>0,param1=>1000,seed=>9,
   result=>{count=>3}}],
 ['lostbook-negative-stock','lostbook',{
   itemNo=>1,itemName=>'書本甲',stock=>-3,param1=>1000,seed=>9,
   result=>{count=>3}}],
 ['lostbook-strict-seed-46','lostbook',{
   itemNo=>1,itemName=>'書本甲',stock=>9,param1=>500,seed=>46,
   result=>{count=>8}}],
 ['lostbook-strict-seed-73','lostbook',{
   itemNo=>2,itemName=>'書本乙',stock=>9,param1=>500,seed=>73,
   result=>{count=>8}}],
);
my $coder=JSON::PP->new->canonical->utf8(0);
my @out;
for my $row(@rows){
  my($label,$kind,$given)=@$row;
  my $o=$coder->decode($coder->encode($given));
  my $before=$coder->decode($coder->encode($given));
  my $observed;
  if($kind eq 'helper'){
    my $raw=OriginalItemHelperHarness::subcall(%$o);
    $observed={
      returned=>$raw->{returned},stockAfter=>$raw->{stockAfter},
      result=>$raw->{result},
    };
  }else{
    my $raw=OriginalItemHelperHarness::lostbook(%$o);
    $before->{randomDraw}=$raw->{randomDraw};
    delete $before->{seed};
    $observed={
      returned=>$raw->{returned},stockAfter=>$raw->{stockAfter},
      result=>$raw->{result},
      moneyAfter=>$raw->{moneyAfter},
      timeAfter=>$raw->{timeAfter},
      expAfter=>$raw->{expAfter},
    };
  }
  push @out,{case=>$label,kind=>$kind,input=>$before,observed=>$observed};
}
print $coder->encode(\@out),"\n";
