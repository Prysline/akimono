import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {quoteUnguildedPurchase} from '../src/economy-model.mjs';
import {loadStandardStreetModel} from '../src/standard-street-model.mjs';

const model=loadStandardStreetModel(
  readFileSync(new URL('../../custom/inc-item-data.cgi',import.meta.url),'utf8'),
  readFileSync(new URL('../../custom/inc-rebel-data.cgi',import.meta.url),'utf8'));
const probe=fileURLToPath(new URL('./original-perl/original-r4-guild-peer-buy-probe.pl',import.meta.url));
const {cases}=JSON.parse(execFileSync('perl',[probe],{encoding:'utf8'}));
assert.equal(cases.length,11);
for(const {spec:s,before:b,after:a,receipt:r} of cases){
  test('R4 guild peer source differential: '+s.name,()=>{
    if(s.reject){assert.equal(r,null);assert.deepEqual(a,b);return;}
    // Test-only expected guild adjustment; not a second runtime or a player command.
    const same=!!s.bg&&s.bg===s.sg;
    const deal=s.sg==='alpha'?150:250;
    let type=s.bg&&s.sg?(same?1:2):0;
    let margin=type?Math.trunc(b.seller.price[0]*deal/1000):0;
    const rate=1000+(type===1?-deal:type===2?deal:0);
    if(type===1&&margin&&b.ledgers[s.bg].money<10000){type=-1;margin=0;}
    const unit=b.seller.price[0]+(type===1?-margin:margin);
    const count=Math.min(s.want,10-b.buyer.item[78],b.seller.item[78],
      unit?Math.floor(b.buyer.money/unit):Number.MAX_SAFE_INTEGER);
    assert.deepEqual([r.type,r.rate,r.margin,r.saleprice,r.count],[type,rate,margin,unit,count]);
    // Existing neutral model evaluates seller-base tax/time using explicit count.
    // Synthetic quote money removes base-price affordability, already checked above.
    const baseTaxRate=b.seller.taxmode===1?0:b.seller.taxmode===2?20:10;
    const q=quoteUnguildedPurchase(model,{...b.buyer,guild:'',money:r.baseprice*count},
      {...b.seller,guild:''},{shelf:0,itemId:79,offeredPrice:r.baseprice,
        requestedCount:count,itemLimit:10,baseTaxRate,sendItemTime:1200});
    assert.deepEqual([r.tax,r.taxrate,r.usetime],[q.tax,q.taxRate,q.timeSeconds]);
    const expected=structuredClone(b);
    expected.buyer.item[78]+=count;expected.seller.item[78]-=count;
    expected.buyer.money-=unit*count;expected.buyer.paytoday+=unit*count;
    expected.buyer.time+=q.timeSeconds;
    expected.seller.money+=q.sellerProceeds;expected.seller.saletoday+=r.baseprice*count;
    expected.seller.taxtoday+=q.tax;expected.seller.trush+=q.sellerTrashIncrease;
    expected.seller.itemtoday[79]=count;
    if(expected.seller.item[78]===0&&type!==1&&type!==-1)expected.seller.rank--;
    if(type===1){expected.ledgers[s.bg].money-=margin*count;expected.ledgers[s.bg].out+=margin*count;}
    if(type===2){expected.ledgers[s.sg].money+=margin*count;expected.ledgers[s.sg].in+=margin*count;}
    assert.deepEqual(a,expected);
  });
}
