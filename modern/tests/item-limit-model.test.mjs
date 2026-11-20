import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileLiteralItemLimit, compileOrderedItemLimit } from '../src/item-limit-model.mjs';
import { loadStandardStreetModel } from '../src/standard-street-model.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [originalCompiler, itemDsl, rebelDsl] = await Promise.all([
  'modern/tests/original-perl/inc-makeitem.cgi',
  'custom/inc-item-data.cgi',
  'custom/inc-rebel-data.cgi',
].map(file => readFile(path.join(root, file), 'utf8')));
const model = loadStandardStreetModel(itemDsl, rebelDsl);

test('B-01 pinned unmodified Core compiler uses slash to split LIMIT and WSLIMIT', () => {
  assert.match(originalCompiler, /if\(\$line =~ s\/\\sLIMIT\\s\+\(\\S\+\)\\s/);
  assert.ok(originalCompiler.includes('my @val=split(/\\//,$1);'));
  assert.match(originalCompiler, /\$g_item->\{limit\}=GetNumber\(\$val\[0\]\)/);
  assert.match(originalCompiler, /\$g_item->\{wslimit\}=\$g_item->\{limit\} if \$val\[1\]eq''/);
  assert.match(originalCompiler, /\$g_item->\{wslimit\}=GetNumber\(\$val\[1\]\) if \$val\[1\]ne''/);
});

test('B-01 source literal 4000/1000 means warehouse 4000 and wholesale 1000', () => {
  assert.deepEqual(compileLiteralItemLimit('4000/1000'), {
    limit: 4000, wslimit: 1000,
    raw: '4000/1000', mode: 'literal-core-limit-subset',
  });
});

test('B-01 literal 600 without slash copies same number to wholesale', () => {
  assert.deepEqual(compileLiteralItemLimit('600'), {
    limit: 600, wslimit: 600,
    raw: '600', mode: 'literal-core-limit-subset',
  });
});

test('B-01 explicit /0 means zero wholesale cap, not division or fallback', () => {
  assert.deepEqual(compileLiteralItemLimit('10/0'), {
    limit: 10, wslimit: 0,
    raw: '10/0', mode: 'literal-core-limit-subset',
  });
});

test('B-01 confirmed original #1, #40, #79 source limit raw pairs compile exactly', () => {
  const expected = [
    { id: 1, raw: '4000/1000', limit: 4000, wslimit: 1000 },
    { id: 40, raw: '600', limit: 600, wslimit: 600 },
    { id: 79, raw: '10/0', limit: 10, wslimit: 0 },
  ];
  for (const row of expected) {
    const item = model.items.find(x => x.id === row.id);
    const compiled = compileLiteralItemLimit(item.limitRaw);
    assert.equal(compiled.raw, row.raw);
    assert.equal(compiled.limit, row.limit);
    assert.equal(compiled.wslimit, row.wslimit);
    assert.ok(Object.isFrozen(compiled));
  }
});

test('B-01 rejects lvN and symbolic LIMIT expressions rather than interpreting Perl', () => {
  for (const raw of ['lv5', 'lv2/10', 'NewShopLimit', 'MAX_ITEM', '10+3', '10*2']) {
    assert.throws(() => compileLiteralItemLimit(raw), /Unsupported nonliteral/);
  }
});

test('B-01 rejects dangerous Perl or JavaScript snippets without evaluation', () => {
  for (const raw of ['1;exit', 'system("echo bad")', '__proto__', '10/0;die',
    '20/**/30', '10||100', '0xFF', '10/2/1']) {
    assert.throws(() => compileLiteralItemLimit(raw), /Unsupported nonliteral/);
  }
});

test('B-01 rejects unsupported negative, fractional and blank limits', () => {
  for (const raw of ['-1', '-1/3', '1/-1', '3.5', '1/2.5', '', '/100', '1/', ' 10/0 ', '0/0']) {
    assert.throws(() => compileLiteralItemLimit(raw), /Unsupported/);
  }
});

test('B-01 rejects values outside safe integer range', () => {
  for (const raw of ['9007199254740992', '1/9007199254740992']) {
    assert.throws(() => compileLiteralItemLimit(raw), /unsafe/);
  }
});

test('B-01 only source strings are accepted', () => {
  for (const value of [null, undefined, {}, 10, 0, NaN]) {
    assert.throws(() => compileLiteralItemLimit(value), TypeError);
  }
});

test('B-01 returns immutable independent limit pairs', () => {
  const first = compileLiteralItemLimit('10/0');
  const second = compileLiteralItemLimit('10/0');
  assert.notStrictEqual(first, second);
  assert.ok(Object.isFrozen(first));
  assert.throws(() => { first.limit = 100; }, TypeError);
  assert.equal(second.limit, 10);
});

test('B-01 retains explicit limits with large values; no guessed price-based fallback', () => {
  const value = compileLiteralItemLimit('4000');
  assert.equal(value.limit, 4000);
  assert.equal(value.wslimit, 4000);
  assert.equal(compileLiteralItemLimit('00040/0003').wslimit, 3);
});


test('B-01 pinned PRICE compiler derives limit only when no current limit exists', () => {
  assert.match(originalCompiler, /if \(!\$g_item->\{limit\}\)/);
  assert.match(originalCompiler, /\$g_item->\{limit\}=int\(1000000 \/ \$g_item->\{price\}\)/);
  assert.match(originalCompiler, /\$g_item->\{limit\}=1 if \$g_item->\{limit\} < 1/);
  assert.match(originalCompiler, /\$g_item->\{limit\}=2000 if \$g_item->\{limit\} > 2000/);
  assert.match(originalCompiler, /\$g_item->\{limit\}=int\(\$g_item->\{limit\} \/ 10 \+ 0\.5\)\*10 if \$g_item->\{limit\}>100/);
});

test('B-01 pinned lvN multiplies existing limit by N/5 and truncates', () => {
  assert.match(originalCompiler, /\$val\[0\] =~ \/\^lv\(\[\\d\\\.\]\+\)\$\/i/);
  assert.match(originalCompiler, /\$g_item->\{limit\}=int\(\$g_item->\{limit\}\* \$1 \/ 5\)/);
  assert.match(originalCompiler, /\$g_item->\{wslimit\}=\$g_item->\{limit\} if \$val\[1\]eq''/);
});

test('B-01 price-default 1,000,000/price clamps 1..2000', () => {
  for (const [price,expected] of [
    [1,2000], [100,2000], [500,2000], [10000,100],
    [1000000,1], [2000000,1],
  ]) {
    const result=compileOrderedItemLimit({price,priceLine:30});
    assert.deepEqual(result,{limit:expected,wslimit:expected,raw:null,mode:'core-price-default-subset'});
  }
});

test('B-01 price-default rounds to nearest ten only for limit > 100', () => {
  assert.equal(compileOrderedItemLimit({price:749,priceLine:20}).limit,1340);
  assert.equal(compileOrderedItemLimit({price:1200,priceLine:20}).limit,830);
  assert.equal(compileOrderedItemLimit({price:7500,priceLine:20}).limit,130);
  assert.equal(compileOrderedItemLimit({price:9901,priceLine:20}).limit,100);
  assert.equal(compileOrderedItemLimit({price:10000,priceLine:20}).limit,100);
});

test('B-01 lv5 retains default limit, lv2.5 halves, lv7 multiplies', () => {
  const input={price:10000,priceLine:20,limitLine:21};
  for(const [raw,expected] of [['lv5',100],['lv2.5',50],['lv7',140],['lv0',0]]) {
    const actual=compileOrderedItemLimit({...input,limitRaw:raw});
    assert.equal(actual.limit,expected);
    assert.equal(actual.wslimit,expected);
    assert.equal(actual.mode,'core-level-limit-subset');
  }
});

test('B-01 lvN/B sets separate wholesale limit and allows zero wholesale stock', () => {
  const input={price:10000,priceLine:20,limitLine:30};
  const pair=compileOrderedItemLimit({...input,limitRaw:'LV2.5/8'});
  assert.equal(pair.limit,50);
  assert.equal(pair.wslimit,8);
  const noWholesale=compileOrderedItemLimit({...input,limitRaw:'lv2.5/0'});
  assert.equal(noWholesale.limit,50);
  assert.equal(noWholesale.wslimit,0);
});

test('B-01 lv before PRICE does not inherit a future default', () => {
  const actual=compileOrderedItemLimit({price:10000,priceLine:30,limitRaw:'lv2.5/8',limitLine:20});
  assert.deepEqual(actual,{limit:100,wslimit:100,raw:'lv2.5/8',
    mode:'core-price-after-level-fallback-subset'});
});

test('B-01 source ordering: literal LIMIT preceding PRICE is preserved', () => {
  const item=model.items.find(x=>x.id===63);
  assert.equal(item.limitRaw,'1/1');
  assert.ok(item.priceSourceLine>item.limitSourceLine);
  const actual=compileOrderedItemLimit({
    price:item.price,priceLine:item.priceSourceLine,
    limitRaw:item.limitRaw,limitLine:item.limitSourceLine,
  });
  assert.deepEqual(actual,{limit:1,wslimit:1,raw:'1/1',
    mode:'literal-core-limit-subset'});
});

test('B-01 source ordering: reviewed original item #1 has PRICE preceding LIMIT', () => {
  const item=model.items.find(x=>x.id===1);
  assert.ok(item.priceSourceLine<item.limitSourceLine);
  const actual=compileOrderedItemLimit({
    price:item.price,priceLine:item.priceSourceLine,
    limitRaw:item.limitRaw,limitLine:item.limitSourceLine,
  });
  assert.equal(actual.limit,4000);
  assert.equal(actual.wslimit,1000);
});

test('B-01 all 79 pinned Standard Street items declare explicit LIMIT, none uses lvN', () => {
  assert.equal(model.items.length,79);
  assert.equal(model.items.filter(x=>x.limitRaw===null).length,0);
  assert.equal(model.items.filter(x=>/^lv/i.test(x.limitRaw)).length,0);
  for(const item of model.items) {
    assert.ok(Number.isSafeInteger(item.limitSourceLine));
  }
});

test('B-01 ordered compiler refuses missing source line metadata', () => {
  assert.throws(()=>compileOrderedItemLimit({price:10000}), /PRICE source line/);
  assert.throws(()=>compileOrderedItemLimit({price:10000,priceLine:20,limitRaw:'lv5'}), /LIMIT source line/);
  assert.throws(()=>compileOrderedItemLimit({price:10000,priceLine:20,limitLine:22}), /without LIMIT/);
});

test('B-01 ordered compiler refuses zero/negative/noninteger/unsafe prices', () => {
  for(const price of [0,-1,1.5,Infinity,Number.MAX_SAFE_INTEGER+1,'100']) {
    assert.throws(()=>compileOrderedItemLimit({price,priceLine:20}), RangeError);
  }
});

test('B-01 ordered compiler forbids dynamic Perl, malicious expressions and multiple slash segments', () => {
  for(const raw of ['lv2+3','lv5/3/2','lv5/1.5','lv5;die','lvA','lv.5','lv1.','lv-1',
    'lv2/3;system(1)','lvNaN','1/0;exit']) {
    assert.throws(()=>compileOrderedItemLimit({price:10000,priceLine:10,limitRaw:raw,limitLine:20}),
      /Unsupported/);
  }
});

test('B-01 ordered compiler rejects large lvN output and unsafe wholesale overrides', () => {
  for(const raw of ['lv9007199254740991','lv5/9007199254740992']) {
    assert.throws(()=>compileOrderedItemLimit({
      price:10000,priceLine:10,limitRaw:raw,limitLine:20,
    }),/Unsafe|unsafe|Invalid/);
  }
});

test('B-01 ordered compiler always returns immutable object', () => {
  const x=compileOrderedItemLimit({price:10000,priceLine:10,limitRaw:'lv5',limitLine:20});
  assert.ok(Object.isFrozen(x));
  assert.throws(()=>{x.limit=999;},TypeError);
});
