/** Original buy.cgi form and buy-s.cgi receipt log: isolated frozen source tests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {loadNormalCommerceAuditSources} from './support/r4-source-inputs.mjs';
import {reviewOriginalCommerceLocale} from '../src/original-r4-commerce-locale.mjs';
import {reviewOriginalShowcaseLog,projectOriginalShowcaseLog} from '../src/original-r4-showcase-log.mjs';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {reviewOriginalWholesaleBuyLog,projectOriginalWholesaleBuyLog} from '../src/original-r4-buy-log.mjs';
const extract=(s,name)=>{
 const start=s.indexOf('sub '+name+'\n'),end=s.indexOf('\n}',start);
 assert.ok(start>=0&&end>start);return s.slice(start,end+2);
};
const run=(p,input)=>JSON.parse(execFileSync('perl',['-e',p],{encoding:'utf8',input:JSON.stringify(input)}));
test('source wholesale log message matches original buy-s code before callbacks for zero price and clipped count',async()=>{
 const input=await loadNormalCommerceAuditSources(),street=createStandardStreetModule(input);
 const reviewed=reviewOriginalWholesaleBuyLog({reviewedLocale:reviewOriginalCommerceLocale(input),buySubmitSource:input.originalBuySource,wholeSource:input.originalWholeSource,readSource:input.originalDataReadSource,logSource:input.originalLogSource,configSource:input.originalConfigSource,itemDsl:input.itemDsl,catalog:street.catalog});
 const start=input.originalBuySource.indexOf('$ret=l("%1より'),end=input.originalBuySource.indexOf('PushLog(0,$DT->{id},$ret);',start);
 assert.ok(start>=0&&end>start);
 const block=input.originalBuySource.slice(start,end+'PushLog(0,$DT->{id},$ret);'.length);
 const perl=[
  'use utf8;use JSON::PP;no strict;no warnings;local $/;my $in=decode_json(<STDIN>);',
  'sub Get02D {sprintf("%02d",$_[0])}',
  'sub l {my($s,@a)=@_;my %t=("%1より%2を%3@%4(計%5)"=>"購買%1的%2%3@%4(合計%5)","にて仕入れました"=>"購買於","にて雇いました"=>"雇用於","%1消費"=>"消費時間%1","時間"=>"小時");$s=$t{$s} if exists $t{$s};$s=~s/%([1-5])/$a[$1-1]/ge;return $s}',
  extract(input.originalDataReadSource,'GetMoneyString'),extract(input.originalDataReadSource,'GetTime2HMS'),extract(input.originalLogSource,'PushLog'),
  '$NOW_TIME=$in->{nowSeconds};$DT={id=>1};$DTS={shopname=>"市場"};($itemno,$num,$price,$usetime)=@{$in->{receipt}}{qw(itemId purchasedCount unitPrice timeConsumedSeconds)};$ITEM[$itemno]=$in->{item};@term=(chr(92),"");',
  block,'print encode_json(\\@LOG);',
 ].join('\n');
 for(const c of [{id:13,count:1,price:0,time:600},{id:40,count:3,price:12345,time:225},{id:64,count:1,price:500000,time:600},{id:40,count:2,price:12,time:59}]){
  const i=street.catalog.items.find(x=>x.id===c.id);
  const before={id:1,status:1,item:Array(79).fill(0),guild:''},nowSeconds=1000000;
  const command={kind:'market-buy',shopId:1,itemId:c.id,requestedCount:c.count+1,marketShelf:0,expectedPrice:c.price};
  const receipt={action:'market-buy',shopId:1,itemId:c.id,purchasedCount:c.count,unitPrice:c.price,totalPaid:c.count*c.price,timeConsumedSeconds:c.time,marketShelf:0,stockBefore:0,stockAfter:c.count};
  const row=projectOriginalWholesaleBuyLog({reviewed,before,command,receipt,nowSeconds});
  assert.deepEqual([row],run(perl,{receipt,nowSeconds,item:{name:i.name,scale:i.scaleRaw,flag:''}}));
  assert.throws(()=>projectOriginalWholesaleBuyLog({reviewed,before,command,receipt:{...receipt,totalPaid:receipt.totalPaid+1},nowSeconds}),/source buy receipt/);
 }
});
test('frozen sc-s.cgi writes exactly one listing or removal source log row',async()=>{
 const input=await loadNormalCommerceAuditSources(),street=createStandardStreetModule(input);
 const reviewed=reviewOriginalShowcaseLog({reviewedLocale:reviewOriginalCommerceLocale(input),showcaseSource:input.originalShowcaseSource,logSource:input.originalLogSource,configSource:input.originalConfigSource,readSource:input.originalDataReadSource,itemDsl:input.itemDsl,catalog:street.catalog});
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

test('D17 exact layered locale pins refuse changed source or fabricated review',async()=>{
 const input=await loadNormalCommerceAuditSources(),street=createStandardStreetModule(input);
 const reviewedLocale=reviewOriginalCommerceLocale(input);
 for(const key of ['coreLocaleSource','localLocaleSource','localeLoaderSource'])
   assert.throws(()=>reviewOriginalCommerceLocale({...input,[key]:input[key]+'\n'}),/source drift/);
 assert.throws(()=>reviewOriginalShowcaseLog({reviewedLocale:{...reviewedLocale},catalog:street.catalog}),/locale review required/);
});
