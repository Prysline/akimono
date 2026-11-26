import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {reviewGuildPeerPurchase,projectGuildPeerPurchase} from '../src/original-r4-guild-peer-purchase.mjs';
import {parseGuildLedgers} from '../src/original-r4-guild-files.mjs';
const load=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sources={
  buy:load('./original-perl/buy-s.cgi'),calc:load('./original-perl/calc.cgi'),
  item:load('./original-perl/item.cgi'),detail:load('./original-perl/core-detail.cgi'),
  guild:load('./original-perl/pinned-guild.cgi'),
  itemDsl:load('../../custom/inc-item-data.cgi'),rebelDsl:load('../../custom/inc-rebel-data.cgi'),
};
const reviewed=reviewGuildPeerPurchase(sources);
const probe=fileURLToPath(new URL('./original-perl/original-r4-guild-peer-buy-probe.pl',import.meta.url));
const {cases}=JSON.parse(execFileSync('perl',[probe],{encoding:'utf8'}));
assert.equal(cases.length,19);
const input=({spec:s,before})=>({reviewed,before,definitions:{alpha:{dealrate:150},beta:{dealrate:250}},
  command:{itemId:79,shelf:0,offeredPrice:s.offer,requestedCount:s.want},
  nowSeconds:1000000,townTaxRate:10,sendItemTime:1200,rankDraws:s.draws??[]});
for(const c of cases){
  const {spec:s,before:b,after:a,receipt:r}=c;
  test('R4 guild peer source differential: '+s.name,()=>{
    const untouched=structuredClone(b);
    const result=projectGuildPeerPurchase(input(c));
    assert.deepEqual(b,untouched,'pure source candidate');
    assert.equal(result.committable,false);
    assert.equal(result.ok,!s.reject);
    assert.deepEqual(result.receipt,r);
    assert.deepEqual(result.after,a);
    assert.deepEqual(result.rankRanges,c.rankRanges);
    assert.deepEqual(result.stages,c.trace);
    if(!result.ok){assert.deepEqual(a,b);assert.equal(c.ledgerBytes,null);return;}
    assert.equal(result.ledgerWriteRequired,r.type>0);
    if(result.ledgerWriteRequired)assert.deepEqual(parseGuildLedgers(c.ledgerBytes),a.ledgers);
    else assert.equal(c.ledgerBytes,null);
    assert.equal(a.buyer.item[78]+a.seller.item[78],b.buyer.item[78]+b.seller.item[78]);
    const total=x=>x.buyer.money+x.seller.money+Object.values(x.ledgers).reduce((sum,g)=>sum+g.money,0);
    assert.equal(total(a)+r.tax,total(b));
  });
}
test('R4 guild peer candidate refuses source drift, forged review, unmatched ledger and missing/unused RNG',()=>{
  for(const k of Object.keys(sources))assert.throws(()=>reviewGuildPeerPurchase({...sources,[k]:sources[k]+'\n'}),/source drift/);
  const neutral=input(cases.find(x=>x.spec.name==='neutral-soldout'));
  assert.throws(()=>projectGuildPeerPurchase({...neutral,reviewed:{...reviewed}}),/explicit reviewed/);
  assert.throws(()=>projectGuildPeerPurchase({...neutral,definitions:{alpha:{dealrate:150}}}),/explicit reviewed/);
  assert.throws(()=>projectGuildPeerPurchase({...neutral,rankDraws:[0]}),/unused rank draw/);
  const fractional=input(cases.find(x=>x.spec.name==='fractional-hit'));
  assert.throws(()=>projectGuildPeerPurchase({...fractional,rankDraws:[]}),/missing fractional rank draw/);
});
