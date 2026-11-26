/** D19: original buy.cgi read-form oracle, isolated from authoritative buy-s CAS. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {reviewOriginalBuyForm,describeOriginalBuyForm} from '../src/original-r4-buy-form.mjs';
const loadNormalCommerceAuditSources=async()=>{
 const entries={originalBuyFormSource:'./original-perl/core-buy-view.cgi',originalBuySource:'./original-perl/buy-s.cgi',originalBuyCalcSource:'./original-perl/calc.cgi',originalBuyItemSource:'./original-perl/item.cgi',originalConfigSource:'../../_config.cgi'};
 return Object.fromEntries(await Promise.all(Object.entries(entries).map(async ([key,rel])=>[key,(await readFile(new URL(rel,import.meta.url),'utf8')).replace(/\r\n/g,'\n')])));
};
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
test('D19 read form requires authentic review and rejects altered frozen sources',async()=>{
 const input=await loadNormalCommerceAuditSources();
 const sources={formSource:input.originalBuyFormSource,submitSource:input.originalBuySource,calcSource:input.originalBuyCalcSource,itemSource:input.originalBuyItemSource,configSource:input.originalConfigSource};
 assert.throws(()=>reviewOriginalBuyForm({...sources,formSource:sources.formSource+'\n'}),/source drift formSource/);
 assert.throws(()=>describeOriginalBuyForm({reviewed:{source:'r4-frozen-buy-form.v1'},offer:{},shop:null,nowSeconds:1}),/source review required/);
});
