import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDsl, validateStandardStreet } from '../src/parse-dsl.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sourcePaths = ['custom/inc-item-data.cgi', 'custom/inc-rebel-data.cgi'];

test('USE follows original ITEM ID, not array order', () => {
  const source = '@@ITEM\n no 10\n code tool\n name 工具\n @@USE\n name 製作\n need 1 鑰匙\n use 2 藥草\n get 1 治療劑 80%\n@@END\n';
  const result = parseDsl(source, 'fixture');
  assert.equal(result.counts.items, 1);
  assert.equal(result.counts.uses, 1);
  assert.equal(result.blocks[1].ownerItemLine, 1);
  assert.deepEqual(result.blocks[1].fields.need.map(x => x.value), ['1 鑰匙']);
  assert.deepEqual(result.blocks[1].fields.use.map(x => x.value), ['2 藥草']);
  assert.deepEqual(result.blocks[1].fields.get.map(x => x.value), ['1 治療劑 80%']);
});

test('embedded Perl is preserved as raw text and not evaluated', () => {
  const source = '@@event\n code rebel\n func _local_\n my $x=1;\n _local_\n@@END\n';
  const parsed = parseDsl(source, 'fixture');
  assert.equal(parsed.counts.events, 1);
  assert.equal(parsed.blocks[0].fields.func[0].value, '_local_');
  assert.match(parsed.blocks[0].raw, /my \$x=1;/);
  assert.equal(parsed.blocks[0].fields.my, undefined);
});

test('actual Standard Street source counts and distinct item IDs', async () => {
  const results = await Promise.all(sourcePaths.map(async file =>
    parseDsl(await readFile(path.join(root, file), 'utf8'), file)));
  const audit = validateStandardStreet(results);
  assert.deepEqual(audit.actual, { items: 79, uses: 116, events: 25, functions: 7 });
  assert.deepEqual(audit.issues, []);
  const items = results.flatMap(p => p.blocks.filter(b => b.kind === 'ITEM'));
  assert.deepEqual(items.map(x => Number(x.fields.no[0].value)).sort((a,b)=>a-b),
    Array.from({ length: 79 }, (_,i)=>i+1));
  assert.equal(items[0].fields.no[0].value, '10');
});
