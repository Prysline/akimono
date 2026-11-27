/** Source tax and successful sc-s PushLog isolated original CGI oracle.
 * Stub only external context/time/write/HTML for log test. Not full player proof. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {loadNormalCommerceAuditSources} from '../scripts/audit-normal-commerce.mjs';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {calculateSourceSaleTax} from '../src/shared-source-sale-tax.mjs';
import {reviewOriginalShowcaseLog,projectOriginalShowcaseLog} from '../src/original-r4-showcase-log.mjs';
const extract=(s,name)=>{
 const start=s.indexOf('sub '+name+'\n'),end=s.indexOf('\n}',start);
 assert.ok(start>=0&&end>start,'frozen sub '+name);return s.slice(start,end+2);
};
const run=(program,input)=>JSON.parse(execFileSync('perl',['-e',program],{encoding:'utf8',input:JSON.stringify(input)}));
test('source GetSaleTax parity for total price, count, plus tax and cap',async()=>{
 const input=await loadNormalCommerceAuditSources();
 const cases=[];
 for(const basePrice of [1,50,1200,10000,50000])for(const count of [1,2,13])for(const listed of [1,Math.ceil(basePrice/2),basePrice,Math.ceil(basePrice*1.1),basePrice*2,999999999])for(const plusTaxRate of [0,7,20])cases.push({basePrice,count,totalPrice:listed*count,plusTaxRate});
 const perl='use JSON::PP;no strict;no warnings;local $/;my $in=decode_json(<STDIN>);'+extract(input.originalBuyItemSource,'GetSaleTax')+'\nmy @out;for my $x (@$in){$ITEM[1]{price}=$x->{basePrice};my($taxRate,$tax)=GetSaleTax(1,$x->{count},$x->{totalPrice},$x->{plusTaxRate});push @out,{taxRate=>$taxRate,tax=>$tax}}print encode_json(\\@out);';
 assert.deepEqual(cases.map(calculateSourceSaleTax),run(perl,cases));
});
test('frozen sc-s.cgi writes exactly one listing or removal source log row',async()=>{
 const input=await loadNormalCommerceAuditSources(),street=createStandardStreetModule(input);
 const reviewed=reviewOriginalShowcaseLog({showcaseSource:input.originalShowcaseSource,logSource:input.originalLogSource,configSource:input.originalConfigSource,readSource:input.originalDataReadSource,itemDsl:input.itemDsl,catalog:street.catalog});
 const perl=[
 'use utf8;use JSON::PP;no strict;no warnings;local $/;my $in=decode_json(<STDIN>);',
 'sub Lock{} sub UnLock{} sub DataRead{} sub DataWrite{} sub DataCommitOrAbort{} sub CheckUserPass{} sub OutSkin{} sub RenewLog{} sub GetTagImgJob{} sub GetMenuTag{}',
 'sub OutError {die $_[0]} sub UseTime {$DT->{time}+=$_[0]} sub CheckCount {my($v,$d,$min,$max)=@_;$v=int($v||0);return $v<$min?$min:$v>$max?$max:$v}',
 'sub l {my($s,@a)=@_;$s=$s eq "棚%1に%2を%3で陳列しました。"?"將%2%3陳列在展示架%1上了。":$s eq "棚%1への陳列をやめました。"?"從展示架%1下架了。":$s;$s=~s/%([123])/$a[$1-1]/ge;return $s}',
 extract(input.originalLogSource,'PushLog'),extract(input.originalDataReadSource,'GetMoneyString'),
 '$NOW_TIME=1000000;$MAX_ITEM=79;$MAX_MONEY=999999999;$TIME_EDIT_SHOWCASE=600;@term=(chr(92),"");',
 '$DT=$in->{before};$ITEM[40]={price=>1200,name=>"木刀",flag=>""};%Q=%{$in->{q}};',
 'eval $in->{source};die $@ if $@;print encode_json({logs=>\\@LOG,shop=>$DT});',
 ].join('\n');
 for(const {id,per,override} of [{id:40,per:100,override:0},{id:40,per:50,override:1234567},{id:0,per:100,override:0}]){
  const before={id:1,status:1,showcasecount:1,showcase:[40],price:[1200],item:Array(79).fill(0),time:999000};before.item[39]=1;
  const command={kind:'edit-showcase',shopId:1,shelf:0,itemId:id,per,priceOverride:override};
  const result=run(perl,{before,q:{no:0,item:id,per,prc:override},source:input.originalShowcaseSource});
  const after={...result.shop};const receipt={action:'edit-showcase',shopId:1,shelf:0,displayedItemId:after.showcase[0],unitPrice:after.price[0],timeAfterSeconds:after.time};
  const row=projectOriginalShowcaseLog({reviewed,before,after,command,receipt,nowSeconds:1000000});
  assert.deepEqual([row],result.logs);
  assert.throws(()=>projectOriginalShowcaseLog({reviewed,before,after,command,receipt:{...receipt,unitPrice:receipt.unitPrice+1},nowSeconds:1000000}),/source shelf successor/);
 }
});
