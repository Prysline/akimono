import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {calculateSourceShopPoint,projectOriginalSoloSort,reviewOriginalSoloSort} from '../src/original-period-solo-sort.mjs';
import {normalizeLocalSourceText} from '../src/local-source-text.mjs';
const read=p=>normalizeLocalSourceText(readFileSync(new URL(p,import.meta.url),'utf8'));
const readSource=read('./original-perl/inc-func.cgi');
const detailSource=read('./original-perl/core-detail.cgi');
const blob=s=>createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex');
const cases=[];
for(const rank of [0,1,19999,20000,20001,50000])
  for(const rankingcount of [0,1,10,99])
    for(const profitstock of [-2000000,-1,0,1,1499999,1500000,1500001,5000000])
      for(const [saletoday,taxtoday,paytoday] of [[0,0,0],[100000,50000,200000]])
        cases.push({rank,rankingcount,profitstock,saletoday,taxtoday,paytoday,point:999999});
test('R4 palace prerequisite: shared point calculation matches pinned Perl GetDTPoint (384 isolated cases)',()=>{
  assert.equal(blob(readSource),'e7a8add7b0291901e71fe797783b664dff1568a0');
  assert.equal(blob(detailSource),'9a83d26fb29edee4032958f1e6de837a250f3384');
  const fn=readSource.match(/^sub GetDTPoint\n\{[\s\S]*?^\}/m)?.[0];
  assert.ok(fn,'exact pinned GetDTPoint function');
  const program='use strict; use warnings; use JSON::PP;\n'+fn+
    '\nlocal $/; my $rows=decode_json(<STDIN>); print encode_json([map {GetDTPoint($_)} @$rows]);';
  const expected=JSON.parse(execFileSync('perl',['-e',program],{input:JSON.stringify(cases),encoding:'utf8'}));
  assert.equal(cases.length,384);
  assert.deepEqual(cases.map(calculateSourceShopPoint),expected);
  const reviewed=reviewOriginalSoloSort({detailSource,readSource});
  assert.deepEqual(cases.map(fields=>projectOriginalSoloSort({
    shop:{id:1,status:1,name:'isolated-point-test',...fields},reviewed}).shop.point),expected);
});
test('R4 palace prerequisite: recompute exact point boundary, reject invalid fields',()=>{
  const shop={rank:19999,rankingcount:0,profitstock:0,saletoday:0,taxtoday:0,paytoday:0,point:999999};
  assert.equal(calculateSourceShopPoint(shop),19999);
  assert.equal(calculateSourceShopPoint({...shop,rank:20000,point:0}),20000);
  assert.equal(calculateSourceShopPoint({...shop,rank:20001}),20001);
  for(const patch of [{rank:-1},{rankingcount:-1},{saletoday:NaN},{paytoday:1.5},{profitstock:Number.MAX_SAFE_INTEGER}])
    assert.throws(()=>calculateSourceShopPoint({...shop,...patch}),RangeError);
});
