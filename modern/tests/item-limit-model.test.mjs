import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileLiteralItemLimit } from '../src/item-limit-model.mjs';
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
