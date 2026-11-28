import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {reviewOriginalBuyForm} from '../src/original-r4-buy-form.mjs';
import {sourcePage,sourcePageNumbers} from '../src/shared-source-news-query.mjs';
test('source GetPage and GetPageControl preserve original count, clamp, range and market shelf identity',async()=>{
 const files={formSource:'./original-perl/core-buy-view.cgi',submitSource:'./original-perl/buy-s.cgi',calcSource:'./original-perl/calc.cgi',itemSource:'./original-perl/item.cgi',configSource:'../../_config.cgi',marketListSource:'./original-perl/core-shop-m.cgi',pageSource:'./original-perl/core-page.cgi'};
 const sources=Object.fromEntries(await Promise.all(Object.entries(files).map(async ([k,p])=>[k,(await readFile(new URL(p,import.meta.url),'utf8')).replace(/\r\n/g,'\n')])));
 assert.equal(reviewOriginalBuyForm(sources).pageRows,25);
 assert.throws(()=>reviewOriginalBuyForm({...sources,marketListSource:sources.marketListSource+'\n'}),/source drift marketListSource/);
 assert.throws(()=>reviewOriginalBuyForm({...sources,pageSource:null}),/incomplete market list paging sources/);
 const cases=[];
 for(const count of [0,1,24,25,26,50,51,79,180,1000])for(const size of [5,25])for(const page of [-1,0,1,2,3,6,19,200])cases.push({count,size,page});
 const perl=['use utf8;use JSON::PP;no strict;no warnings;local $/;my $in=decode_json(<STDIN>);','eval $in->{source};die $@ if $@;','sub GetTagA {return $_[0]." "}','my @out;for my $c (@{$in->{cases}}){my($p,$s,$e,$n,$v,$m)=GetPage($c->{page},$c->{size},$c->{count});my $ctrl=GetPageControl($v,$n,"","",$m,$p);my @nums=map {0+$_-1} ($ctrl=~/\\[?(\\d+)\\]? /g);push @out,{page=>$p,pageMax=>$m,start=>$s,end=>$e,pagePrev=>$v,pageNext=>$n,nums=>\\@nums}}print encode_json(\\@out);'].join('\n');
 const expected=JSON.parse(execFileSync('perl',['-e',perl],{encoding:'utf8',input:JSON.stringify({source:sources.pageSource,cases})}));
 for(const [i,c] of cases.entries()){
  const p=sourcePage(c.count,c.size,c.page);
  assert.deepEqual({...p,nums:p.pageMax?sourcePageNumbers(p.page,p.pageMax):[]},expected[i]);
 }
 const offers=Array.from({length:79},(_,shelf)=>({shelf,itemId:79-shelf}));
 const p=sourcePage(offers.length,25,2);
 assert.deepEqual(offers.slice(p.start,p.end+1).map(x=>x.shelf),Array.from({length:25},(_,i)=>50+i));
});
