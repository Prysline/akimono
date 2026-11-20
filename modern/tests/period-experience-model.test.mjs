import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  REVIEWED_EXP_CONFIG,projectReviewedPeriodHistory,projectReviewedUseExperience,
} from '../src/period-experience-model.mjs';
import {parseReviewedShopHistoryWorld} from '../src/world-shop-history-model.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [period,use,cfg]=await Promise.all([
  'modern/tests/original-perl/period.cgi',
  'modern/tests/original-perl/use.cgi',
  '_config.cgi',
].map(x=>readFile(path.join(root,x),'utf8')));
const row=(itemId,value)=>({itemId,value});
const roll=(o={})=>projectReviewedPeriodHistory({
  itemyesterday:[row(1,99)],
  itemtoday:[row(1,5),row(3,7)],
  exp:[row(1,100),row(2,6),row(3,5),row(4,1),row(5,1000)],
  ...o,
});
const gain=(o={})=>projectReviewedUseExperience({
  exp:[row(1,100)],
  itemId:1,expPerUse:80,count:3,...o,
});

test('B-19 source pins true daily rotation, independent of other period effects',()=>{
  assert.ok(period.includes('$DT->{itemyesterday}=$DT->{itemtoday};'));
  assert.ok(period.includes('$DT->{itemtoday}={};'));
  assert.ok(period.includes('$DT->{exp}{$key}-=int($DT->{exp}{$key}*$EXP_DOWN_RATE/1000) if $EXP_DOWN_RATE;'));
  assert.ok(period.includes('$DT->{exp}{$key}-=$EXP_DOWN_POINT;'));
  assert.ok(period.includes('delete $DT->{exp}{$key} if $DT->{exp}{$key}<=0;'));
});
test('B-19 source pins exact UseItem experience branch, not full use-item transaction',()=>{
  assert.ok(use.includes('if($USE->{exp})'));
  assert.ok(use.includes('my $expplus=$USE->{exp}*$USE->{result}->{count};'));
  assert.ok(use.includes('$expplus=1000-$exp if $exp+$expplus>1000;'));
  assert.ok(use.includes('if($LIMIT_EXP>0 && $expsum>$LIMIT_EXP)'));
  assert.ok(use.includes('my @key=sort { $DT->{exp}{$a} <=> $DT->{exp}{$b} }keys(%{$DT->{exp}});'));
  assert.ok(use.includes('next if $_==$USE->{itemno};'));
  assert.ok(use.includes('my $expdown=int($expsum/$keycnt);'));
});
test('B-19 exact Standard Street exp constants pinned by current config',()=>{
  assert.match(cfg,/\$EXP_DOWN_RATE\s*=\s*60\s*;/);
  assert.match(cfg,/\$EXP_DOWN_POINT\s*=\s*5\s*;/);
  assert.match(cfg,/\$LIMIT_EXP\s*=\s*3600\s*;/);
  assert.deepEqual(REVIEWED_EXP_CONFIG,{
    itemCount:79,perItemCap:1000,limitExp:3600,
    decayRatePerThousand:60,decayFixedPoints:5,
  });
  assert.ok(Object.isFrozen(REVIEWED_EXP_CONFIG));
});
test('B-19 today history copied to yesterday and today reset',()=>{
  const r=roll();
  assert.deepEqual(r.itemyesterday,[row(1,5),row(3,7)]);
  assert.deepEqual(r.itemtoday,[]);
});
test('B-19 source uses proportional int(rate/1000) before fixed 5',()=>{
  const r=roll();
  assert.deepEqual(r.exp,[row(1,89),row(2,1),row(5,935)]);
});
test('B-19 zero or negative after decay deleted instead of left as 0',()=>{
  const r=roll({exp:[row(1,5),row(2,4),row(3,1),row(4,6)]});
  assert.deepEqual(r.exp,[row(4,1)]);
});
test('B-19 integer truncation for exp 17 yields 11 (1+5 decay)',()=>{
  assert.deepEqual(roll({exp:[row(7,17)]}).exp,[row(7,11)]);
});
test('B-19 no exp and empty today/yesterday remains empty',()=>{
  const r=roll({exp:[],itemtoday:[],itemyesterday:[]});
  assert.deepEqual(r.exp,[]);
  assert.deepEqual(r.itemyesterday,[]);
  assert.deepEqual(r.itemtoday,[]);
});
test('B-19 rollover does not leak old yesterday values',()=>{
  const r=roll({itemyesterday:[row(9,999)],itemtoday:[row(7,1)]});
  assert.deepEqual(r.itemyesterday,[row(7,1)]);
});
test('B-19 rollover returns canonically ordered pairs, not Perl hash order',()=>{
  const r=roll({itemtoday:[row(9,1),row(2,3)]});
  assert.deepEqual(r.itemyesterday,[row(2,3),row(9,1)]);
});
test('B-19 use exp awards per-use times successful count',()=>{
  const r=gain();
  assert.deepEqual(r.exp,[row(1,340)]);
  assert.equal(r.previousExp,100);
  assert.equal(r.awardedExp,240);
  assert.equal(r.sourceOverflowBranchEntered,false);
});
test('B-19 use exp clamps single item to source 1000',()=>{
  const r=gain({exp:[row(1,990)],expPerUse:20,count:2});
  assert.equal(r.previousExp,990);
  assert.equal(r.awardedExp,10);
  assert.deepEqual(r.exp,[row(1,1000)]);
});
test('B-19 gain on absent source experience begins at numeric zero',()=>{
  const r=gain({exp:[],itemId:2,expPerUse:10,count:1});
  assert.equal(r.previousExp,0);
  assert.deepEqual(r.exp,[row(2,10)]);
});
test('B-19 use under source total cap does not lower other items',()=>{
  const r=gain({exp:[row(1,800),row(2,300),row(3,200)],
    expPerUse:40,count:1});
  assert.deepEqual(r.exp,[row(1,840),row(2,300),row(3,200)]);
  assert.equal(r.sourceOverflowBranchEntered,false);
});
test('B-19 source total overflow redistributes excess across distinct others',()=>{
  const r=gain({exp:[
    row(1,900),row(2,700),row(3,800),row(4,850),row(5,900),
  ],expPerUse:100,count:1});
  assert.equal(r.sourceOverflowBranchEntered,true);
  assert.deepEqual(r.exp,[
    row(1,1000),row(2,538),row(3,638),row(4,688),row(5,736),
  ]);
  assert.equal(r.exp.reduce((s,x)=>s+x.value,0),3600);
  assert.equal(r.residualExcessAfterSourceLoop,0);
});
test('B-19 selected item never reduced by source overflow loop',()=>{
  const r=gain({exp:[
    row(1,900),row(2,700),row(3,800),row(4,850),row(5,900),
  ],expPerUse:100,count:1});
  assert.equal(r.exp.find(x=>x.itemId===1).value,1000);
});
test('B-19 equal exp among reduction candidates fails closed instead of assuming Perl tie order',()=>{
  assert.throws(()=>gain({exp:[
    row(1,900),row(2,900),row(3,900),row(4,900),row(5,900),
  ],expPerUse:100,count:1}),/Ambiguous equal-exp/);
});
test('B-19 same other-item exp values are safe when no overflow branch runs',()=>{
  const r=gain({exp:[row(1,100),row(2,100),row(3,100)],
    expPerUse:20,count:1});
  assert.deepEqual(r.exp,[row(1,120),row(2,100),row(3,100)]);
});
test('B-19 negative, noninteger and zero requested use counts fail closed',()=>{
  for(const count of [0,-1,0.5,NaN,Infinity,1001]){
    assert.throws(()=>gain({count}),/count/);
  }
});
test('B-19 unsupported use experience coefficients fail closed',()=>{
  for(const expPerUse of [0,-1,1.5,NaN,Infinity,1001]){
    assert.throws(()=>gain({expPerUse}),/expPerUse/);
  }
});
test('B-19 unsupported item IDs fail closed',()=>{
  for(const itemId of [0,80,-1,1.5,NaN]){
    assert.throws(()=>gain({itemId}),/itemId/);
  }
});
test('B-19 existing exp above source 1000 refused rather than negative gain',()=>{
  assert.throws(()=>gain({exp:[row(1,1001)]}),/exp value/);
  assert.throws(()=>roll({exp:[row(1,1001)]}),/exp value/);
});
test('B-19 odd, duplicated or too many history pairs rejected',()=>{
  assert.throws(()=>roll({itemtoday:[row(1,2),row(1,3)]}),/Duplicate/);
  assert.throws(()=>roll({itemtoday:[row(80,2)]}),/itemtoday item ID/);
  assert.throws(()=>roll({itemyesterday:undefined}),/itemyesterday/);
  assert.throws(()=>roll({itemtoday:[{itemId:1}]}),/itemtoday value/);
});
test('B-19 history values must be nonnegative safe integers',()=>{
  for(const value of [-1,NaN,1.5,Number.MAX_SAFE_INTEGER+1]){
    assert.throws(()=>roll({itemtoday:[row(1,value)]}),/itemtoday value/);
  }
});
test('B-19 candidate exp maps cannot contain duplicate item IDs',()=>{
  assert.throws(()=>gain({exp:[row(1,10),row(1,20)]}),/Duplicate/);
});
test('B-19 state transformation never mutates its caller input',()=>{
  const exp=[row(2,700),row(1,900),row(3,800),row(4,850),row(5,900)];
  const snap=structuredClone(exp);
  gain({exp,expPerUse:100,count:1});
  assert.deepEqual(exp,snap);
  const today=[row(2,3),row(1,2)];
  const copy=structuredClone(today);
  roll({itemtoday:today});
  assert.deepEqual(today,copy);
});
test('B-19 outputs and nested records are all frozen',()=>{
  const a=roll(),b=gain();
  assert.ok(Object.isFrozen(a));
  assert.ok(Object.isFrozen(a.exp));
  assert.ok(Object.isFrozen(a.exp[0]));
  assert.ok(Object.isFrozen(b));
  assert.ok(Object.isFrozen(b.exp));
  assert.ok(Object.isFrozen(b.exp[0]));
  assert.throws(()=>{a.exp[0].value=10;},TypeError);
});
test('B-19 B-18 parsed data can feed safe daily review without executing Core',()=>{
  const cells=Array(32).fill('');
  Object.assign(cells,{0:'7',1:'0',2:'alice',3:'ShopA',4:'syntheticPass',
    5:'100000',6:'0',7:'0'});
  const text=[
    '1700000000','100000,2,0,10,7','4,0,3','','','//',
    cells.join(','),'1,0:50,0:3,0:1,5:1,2:4,100:',
  ].join('\n')+'\n';
  const parsed=parseReviewedShopHistoryWorld(text);
  const r=projectReviewedPeriodHistory({
    itemyesterday:parsed.history.itemyesterday,
    itemtoday:parsed.history.itemtoday,
    exp:parsed.history.exp,
  });
  assert.deepEqual(r.itemyesterday,[row(1,2)]);
  assert.deepEqual(r.exp,[row(4,89)]);
});
test('B-19 B-18 history result can feed isolated gain calculation',()=>{
  const initial=roll({exp:[row(4,100)]});
  const r=gain({exp:initial.exp,itemId:4,expPerUse:15,count:2});
  assert.deepEqual(r.exp,[row(4,119)]);
});
test('B-19 model results do not authorize use-item, whole period or persistence',()=>{
  const r=roll(),g=gain();
  assert.equal('commitWorld' in r,false);
  assert.equal('executeUseItem' in g,false);
  assert.equal('applyGuildTaxes' in r,false);
  assert.match(g.scope,/no use-item execution/);
});
