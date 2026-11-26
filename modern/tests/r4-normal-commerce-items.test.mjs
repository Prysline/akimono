import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewNormalCommerceItems} from '../src/reviewed-normal-commerce-items.mjs';
import {projectSharedNaturalSale} from '../src/shared-natural-sale-core.mjs';
import {reviewManualCommerceEvents,reviewedManualSaleRule} from '../src/original-r4-manual-commerce-events.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const paths={itemDsl:'custom/inc-item-data.cgi',
  compilerSource:'modern/tests/original-perl/inc-makeitem.cgi',
  showcaseSource:'modern/tests/original-perl/sc-s.cgi',
  turnSource:'modern/tests/original-perl/inc-turn.cgi'};
const sources=Object.fromEntries(await Promise.all(Object.entries(paths).map(
  async ([key,p])=>[key,await readFile(path.join(root,p),'utf8')])));
const review=reviewNormalCommerceItems(sources);
const perl=(name,...args)=>JSON.parse(execFileSync('perl',[name,...args],{
  cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
}));
test('R4 full commerce ITEM compiler matches frozen Perl PRICE/POP/POINT/COST/TYPE/FLAG for all 79',()=>{
  assert.deepEqual(review.items,perl('original-normal-commerce-item-compiler.pl'));
  assert.equal(Object.keys(review.upkeepCosts).length,79);
  assert.equal(Object.keys(review.saleRules).length,67);
  assert.equal(Object.values(review.saleRules).filter(r=>r.popularSeconds>0).length,66);
  assert.equal(review.saleRules[64],undefined);
  assert.equal(review.saleRules[65].popularSeconds,0);
  assert.equal(review.saleRules[65].zeroPopularReviewed,true);
  assert.equal(review.saleRules[77].popularSeconds,1440000);
  assert.equal(review.saleRules[79].popularSeconds,72000);
  for(const key of Object.keys(sources))
    assert.throws(()=>reviewNormalCommerceItems({...sources,[key]:sources[key]+'\n'}),/source drift/);
});
test('R4 original natural-sale arithmetic for all source-listable ITEMs and mixed zero-POP shelves (isolated)',()=>{
  const rows=perl('original-normal-commerce-natural-probe.pl');
  assert.equal(rows.length,69);
  assert.deepEqual(rows.slice(0,67).map(x=>Number(x.name.slice(5))),
    Object.keys(review.saleRules).map(Number));
  for(const row of rows){
    const shop=row.input,prior=JSON.stringify(shop);
    const rule=shop.showcasecount===1?review.saleRules[shop.showcase[0]]:null;
    const args={shop,rule,
      saleRules:shop.showcasecount>1?review.saleRules:null,
      upkeepCosts:review.upkeepCosts,spanSeconds:3600,randomDraws:row.draws};
    const actual=projectSharedNaturalSale({...args,recordShelfSales:true});
    const {shelfSales,...withoutReceipt}=actual;
    assert.deepEqual(withoutReceipt,projectSharedNaturalSale(args),row.name+' evidence does not alter source transaction');
    const aggregate={},remaining=new Map();
    let gross=0,tax=0,count=0,previousShelf=-1;
    for(const entry of shelfSales){
      assert.ok(entry.shelf>previousShelf,row.name+' original shelf traversal order');
      previousShelf=entry.shelf;
      assert.equal(entry.itemId,shop.showcase[entry.shelf]);
      assert.equal(entry.unitPrice,shop.price[entry.shelf]);
      assert.equal(entry.stockBefore,remaining.get(entry.itemId)??shop.item[entry.itemId-1]);
      assert.equal(entry.stockAfter,entry.stockBefore-entry.count);
      assert.equal(entry.gross,entry.count*entry.unitPrice);
      assert.equal(entry.effectivePoint,review.saleRules[entry.itemId].point);
      assert.equal(typeof entry.rankContribution,'string');
      assert.ok(Number.isFinite(Number(entry.rankContribution)));
      assert.equal(String(Number(entry.rankContribution)),entry.rankContribution);
      assert.ok(Number(entry.rankContribution)>=0);
      remaining.set(entry.itemId,entry.stockAfter);
      aggregate[entry.itemId]=(aggregate[entry.itemId]??0)+entry.count;
      count+=entry.count;gross+=entry.gross;tax+=entry.tax;
    }
    assert.deepEqual(aggregate,actual.soldByItem);
    assert.equal(count,actual.sold);
    assert.equal(gross,actual.shop.saletoday-shop.saletoday);
    assert.equal(tax,actual.shop.taxtoday-(shop.taxtoday??0));
    assert.equal(actual.shop.money-shop.money,gross-tax);
    assert.equal(JSON.stringify(shop),prior,row.name+' pure projection');
    assert.equal(actual.drawsUsed,row.used,row.name+' source draws');
    for(const k of ['item','itemtoday','_sale_count_','money','rank','temprank','trush','saletoday','taxtoday'])
      assert.deepEqual(actual.shop[k],row.output[k],row.name+' '+k);
    assert.ok(Math.abs(actual.shop.costtoday-row.output.costtoday)<1e-8,row.name+' upkeep');
    if(shop.showcase.includes(65)){
      assert.equal(actual.shop.item[64],1);
      assert.equal(actual.soldByItem[65],undefined);
    }
  }
  const shop=rows.find(x=>x.name==='item-65').input;
  assert.throws(()=>projectSharedNaturalSale({shop,rule:{...review.saleRules[65],zeroPopularReviewed:false},
    upkeepCosts:review.upkeepCosts,spanSeconds:3600,randomDraws:[500000]}),/source reviewed/);
});

test('R4 opt-in shelf receipt cannot change sales, signed cash, inventory or RNG for 1–8 shelves (isolated)',()=>{
  for(let count=1;count<=8;count++)for(const sample of [10000,500000,990000]){
    const showcase=[30,32,30,10,32,10,30,32].slice(0,count);
    const price=showcase.map((id,i)=>id===30?(i===0?200:150):id===32?250:500);
    const item=Array(79).fill(0);item[29]=100;item[31]=30;item[9]=5;
    const shop={item,showcase,price,showcasecount:count,rank:5000,money:-500,
      costtoday:0,trush:0,saletoday:0,taxtoday:0,itemtoday:{}};
    const args={shop,rule:count===1?review.saleRules[30]:null,
      saleRules:count===1?null:review.saleRules,upkeepCosts:review.upkeepCosts,
      spanSeconds:3600,randomDraws:Array(121).fill(sample),reviewedSignedCash:true};
    const old=projectSharedNaturalSale(args);
    const {shelfSales,...state}=projectSharedNaturalSale({...args,recordShelfSales:true});
    assert.deepEqual(state,old);
    assert.equal(shelfSales.reduce((n,r)=>n+r.count,0),old.sold);
    assert.equal(shelfSales.reduce((n,r)=>n+r.gross,0),old.shop.saletoday);
    assert.equal(shelfSales.reduce((n,r)=>n+r.tax,0),old.shop.taxtoday);
  }
});

test('R4 four original manual EVENTs change actual natural-sale POINT and rank, not inventory or proceeds (isolated)',async()=>{
  const manual=reviewManualCommerceEvents({...sources,
    rebelDsl:await readFile(path.join(root,'custom/inc-rebel-data.cgi'),'utf8'),
    readSource:await readFile(path.join(root,'modern/tests/original-perl/inc-func.cgi'),'utf8')});
  const rows=perl('original-normal-commerce-natural-probe.pl','--manual-events');
  assert.equal(rows.length,8);
  const beforeByCode=new Map();
  for(const row of rows){
    const shop=row.input,id=shop.showcase[0],base=review.saleRules[id];
    const point=row.active?manual.rules[row.manualCode].find(x=>x.itemId===id).point:base.point;
    const rule=row.active?reviewedManualSaleRule({reviewed:manual,rule:{...base,point},activeOrder:[row.manualCode]}):base;
    const args={shop,rule,upkeepCosts:review.upkeepCosts,spanSeconds:3600,randomDraws:row.draws};
    const actual=projectSharedNaturalSale({...args,recordShelfSales:true});
    const {shelfSales,...withoutEvidence}=actual;
    assert.deepEqual(withoutEvidence,projectSharedNaturalSale(args));
    assert.equal(actual.drawsUsed,row.used,row.name);
    for(const key of ['item','itemtoday','_sale_count_','money','rank','trush','saletoday','taxtoday'])
      assert.deepEqual(actual.shop[key],row.output[key],row.name+' '+key);
    assert.equal(shelfSales.length,1,row.name+' actual original sale');
    assert.equal(shelfSales[0].effectivePoint,point);
    assert.equal(typeof shelfSales[0].rankContribution,'string');
    const rankContribution=Number(shelfSales[0].rankContribution);
    assert.ok(Number.isFinite(rankContribution));
    if(!row.active){
      assert.ok(rankContribution>0);
      beforeByCode.set(row.manualCode,actual);
    }else{
      const before=beforeByCode.get(row.manualCode);
      assert.ok(before&&point===-100&&rankContribution<0);
      assert.ok(actual.shop.rank<before.shop.rank);
      assert.deepEqual(actual.soldByItem,before.soldByItem);
      assert.equal(actual.shop.money,before.shop.money);
    }
  }
  assert.equal(beforeByCode.size,4);
});
