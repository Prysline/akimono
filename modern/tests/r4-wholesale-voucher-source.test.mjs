/** Source-only differential for actual pinned global FUNCBUY and AddItemSub.
 * The separate HTTP career is genuine; no fixture here is player evidence.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {reviewOriginalWholesaleVoucher,runReviewedWholesaleVoucher,projectReviewedWholesaleVoucherLogRows} from '../src/original-r4-wholesale-voucher.mjs';
const root=new URL('../../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const itemDsl=read('custom/inc-item-data.cgi');
const buySource=read('modern/tests/original-perl/buy-s.cgi');
const helperSource=read('modern/tests/original-perl/core-inc-item.cgi');
const review=reviewOriginalWholesaleVoucher({itemDsl,buySource,helperSource});
const body=itemDsl.match(/^@@FUNCBUY\s*\n([\s\S]*?)^@@END/m)[1].replace('@@ITEMNO"禮物卷"','79');
const perl=String.raw`use utf8; use JSON::PP;
our @calls; sub PushLog { push @calls, [@_]; }
require "./core-inc-item.cgi";
$main::ITEM[79]={limit=>10};
my($owned,$num,$price)=@ARGV;
my $dt={id=>1,item=>[(0)x79]}; $dt->{item}[78]=0+$owned;
$item::BUY={whole=>1,dt=>$dt,num=>0+$num,price=>0+$price};
package item;
`+body+String.raw`
package main;
print JSON::PP->new->utf8->encode({stock=>0+$dt->{item}[78],calls=>\@calls});
`;
function oracle(owned,num,price){
  return JSON.parse(execFileSync('perl',['-e',perl,String(owned),String(num),String(price)],
    {cwd:new URL('modern/tests/original-perl/',root),encoding:'utf8'}));
}
function scenario(owned,num,price){
  const before={id:1,item:Array(79).fill(0)};before.item[78]=owned;
  const shop={...before,item:[...before.item]};shop.item[63]=num;
  const wholesale=Array(79).fill(0);
  const receipt={action:'market-buy',shopId:1,itemId:64,requestedCount:num+10,
    purchasedCount:num,unitPrice:price,totalPaid:num*price};
  const command={kind:'market-buy',shopId:1,itemId:64};
  const applied=receipt.totalPaid>=review.minTotal?
    runReviewedWholesaleVoucher({review,key:review.key,phase:'global',shop,wholesale,receipt}):{shop,wholesale};
  const rows=projectReviewedWholesaleVoucherLogRows({review,before,after:applied.shop,command,receipt,nowSeconds:123});
  return {before,shop,wholesale,receipt,command,applied,rows};
}
test('R4 source-only FUNCBUY differential executes pinned Perl threshold, clipped payment, capacity and zero-log behavior',()=>{
  for(const [owned,num,price] of [[0,1,499999],[0,1,500000],[0,2,500000],[9,3,500000],[10,1,500000],[3,1,1000]]){
    const original=oracle(owned,num,price),s=scenario(owned,num,price);
    assert.equal(s.applied.shop.item[78],original.stock);
    assert.deepEqual(s.rows,original.calls.map(c=>[123,...c].join('\t')+'\n').reverse());
    assert.equal(s.before.item[78],owned);assert.equal(s.shop.item[78],owned);
    assert.equal(s.applied.wholesale,s.wholesale);
    if(num*price>=500000){
      assert.equal(s.receipt.voucherReward.grantedCount,original.stock-owned);
      assert.equal(s.receipt.voucherReward.requestedCount,Math.trunc(num*price/500000));
    }else assert.equal(Object.hasOwn(s.receipt,'voucherReward'),false);
  }
  assert.throws(()=>reviewOriginalWholesaleVoucher({itemDsl,buySource,helperSource:helperSource+'\n'}),/source drift/);
});
test('R4 source-only FUNCBUY rejects malformed successor or duplicate receipt without modifying input',()=>{
  const s=scenario(9,1,500000);
  const snapshot=JSON.stringify(s.shop);
  assert.throws(()=>runReviewedWholesaleVoucher({review,key:review.key,phase:'global',shop:s.shop,wholesale:s.wholesale,receipt:s.receipt}),/callback contract/);
  assert.equal(JSON.stringify(s.shop),snapshot);
  assert.throws(()=>projectReviewedWholesaleVoucherLogRows({review,before:s.before,after:s.shop,command:s.command,receipt:s.receipt,nowSeconds:123}),/successor mismatch/);
  assert.throws(()=>projectReviewedWholesaleVoucherLogRows({review,before:s.before,after:s.applied.shop,command:s.command,receipt:{...s.receipt,originalBuyLogCalls:[]},nowSeconds:123}),/receipt\/log mismatch/);
});
