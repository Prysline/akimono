import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDsl } from '../src/parse-dsl.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = await readFile(path.join(root, 'custom/inc-item-data.cgi'), 'utf8');
const parsed = parseDsl(source, 'custom/inc-item-data.cgi');
const definitions = parsed.blocks.find(block => block.kind === 'DEFINE');
const newHook = parsed.blocks.find(block => block.kind === 'FUNCNEW');
const items = parsed.blocks.filter(block => block.kind === 'ITEM');

function define(name) {
  const record = (definitions.fields.set ?? [])
    .map(({ value }) => value.trim().split(/\s+/))
    .find(([key]) => key === name);
  assert.ok(record, 'Missing original DSL declaration: ' + name);
  return record.slice(1).join(' ');
}

function idForName(name) {
  const item = items.find(block => block.fields.name?.[0]?.value === name);
  assert.ok(item, 'Missing item from original DSL: ' + name);
  return Number(item.fields.no[0].value);
}

test('B-01 / Standard Street original DSL starting cash and time declarations', () => {
  assert.equal(define('NewShopMoney'), '100000');
  assert.equal(define('NewShopTime'), '12*60*60');
});

test('B-01 / Standard Street original DSL starting items reference actual nonsequential IDs', () => {
  assert.equal(define('NewShopItem'), '展示架擴建拆卸工具:1:禮物卷:5');
  assert.equal(idForName('展示架擴建拆卸工具'), 63);
  assert.equal(idForName('禮物卷'), 79);
});

test('B-01 / original FUNCNEW remains a raw Perl callback and is not treated as executable JS', () => {
  assert.ok(newHook, 'Expected FUNCNEW in source');
  assert.match(newHook.raw, /my %item=split \/:\/,@@VALUE"NewShopItem"/);
  assert.match(newHook.raw, /\$DT->\{item\}\[\$item->\{no\}-1\]\+=\$val/);
});

test('B-03 / original Standard Street showcase edit duration declaration', () => {
  const entry = definitions.fields.timeeditshowcase?.[0]?.value;
  assert.equal(entry, '10m');
});
