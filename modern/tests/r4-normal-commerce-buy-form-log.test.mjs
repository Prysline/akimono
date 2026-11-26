/** Original buy.cgi form and buy-s.cgi receipt log: isolated frozen source tests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {loadNormalCommerceAuditSources} from '../scripts/audit-normal-commerce.mjs';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {reviewOriginalBuyForm,describeOriginalBuyForm} from '../src/original-r4-buy-form.mjs';
import {reviewOriginalWholesaleBuyLog,projectOriginalWholesaleBuyLog} from '../src/original-r4-buy-log.mjs';
const extract=(s,name)=>{
 const start=s.indexOf('sub '+name+'\n'),end=s.indexOf('\n}',start);
 assert.ok(start>=0&&end>start);return s.slice(start,end+2);
};
const run=(p,input)=>JSON.parse(execFileSync('perl',['-e',p],{encoding:'utf8',input:JSON.stringify(input)}));
test('original buy.cgi uses count choices, early duplicate break, cash and capped stock-time form gates',async()=>{
 const input=await loadNormalCommerceAuditSources();
 const reviewed=reviewOriginalBuyForm({formSource:input.originalBuyFormSource,submitSource:input.originalBuySource,calcSource:input.originalBuyCalcSource,itemSource:input.originalBuyItemSource,configSource:input.originalConfigSource});
 const perl=[
  'use utf8;use JSON::PP;no strict;no warnings;local $/;my $in=decode_json(<STDIN>);',
  'sub DataRead{} sub CheckUserPass{} sub RequireFile{} sub OutSkin{} sub GetTagImgGuild{} sub GetTagImgItemType{} sub GetTime2HMS{}',
  'sub OutError {die $_[0]} sub CheckShowCaseNumber {$_[1]} sub CheckShowCaseItem {return(40,$in->{offer}{price},$in->{offer}{marketStock})}',
  'sub GetWholeStore {return {shopname=>"市場",showcase=>[40]}} sub CheckGuild {return(0,0,0)} sub GetTimeDeal {$in->{offer}{timeSeconds}}',
  'sub GetMoneyString {$_[0]} sub l {my $s=$_[0];return $s eq "倉庫最大"?"倉庫最多":$s eq "資金最大"?"資金最多":$s}',
  extract(input.originalBuyCalcSource,'GetStockTime'),
  '$MAX_MONEY=999999999;$MAX_STOCK_TIME=259200;$NOW_TIME=$in->{nowSeconds};$DT=$in->{shop};$DT->{item}[39]=$in->{offer}{owned};$ITEM[40]={limit=>$in->{offer}{limit},price=>1200,flag=>"",name=>"木刀",scale=>"把",popular=>10800};$Q{buy}="0!0!40";',
  'eval $in->{source};die $@ if $@;my @opts;while($disp=~/<OPTION VALUE="(\\d+)">([^<]+)/g){my($n,$l)=($1,$2);$l=~s/\\(/（/;$l=~s/\\)/）/;push @opts,{count=>0+$n,label=>$l};}print encode_json({available=>$disp=~/<SELECT NAME=num1/?1:0,options=>\\@opts});',
 ].join('\n');
 for(const params of [
  {},{marketStock:1},{marketStock:10},{marketStock:100,limit:100},{marketStock:350,limit:600,money:175000},{marketStock:90,limit:20,owned:17},{price:0,money:-1},{price:0,money:0,marketStock:3},{money:999},{remaining:599},{remaining:600},{remaining:-1},{remaining:300000,timeSeconds:259201},{owned:1000,limit:1000},
 ]){
  const {money=1000000,remaining=3600,...over}=params;
  const offer={canBuy:true,price:1200,marketStock:300,owned:0,limit:1000,timeSeconds:600,...over};
  const nowSeconds=1000000,shop={status:1,money,time:nowSeconds-remaining,item:Array(79).fill(0)};
  const result=describeOriginalBuyForm({reviewed,offer,shop,nowSeconds});
  const expected=run(perl,{offer,shop,nowSeconds,source:input.originalBuyFormSource});
  assert.deepEqual({available:Number(result.available),options:result.options},expected,JSON.stringify(params));
 }
});
test('source wholesale log message matches original buy-s code before callbacks for zero price and clipped count',async()=>{
 const input=await loadNormalCommerceAuditSources(),street=createStandardStreetModule(input);
 const reviewed=reviewOriginalWholesaleBuyLog({buySubmitSource:input.originalBuySource,wholeSource:input.originalWholeSource,readSource:input.originalDataReadSource,logSource:input.originalLogSource,configSource:input.originalConfigSource,itemDsl:input.itemDsl,catalog:street.catalog});
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
