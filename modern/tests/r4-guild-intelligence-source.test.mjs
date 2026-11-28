import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { reviewGuildIntelligence, projectGuildIntelligence } from '../src/original-r4-guild-intelligence.mjs';

const dir = new URL('./original-perl/', import.meta.url);
const sources = Object.fromEntries(Object.entries({ handler: 'pinned-gd-i.cgi', page: 'pinned-street-shop-page.cgi', time: 'pinned-time.cgi' }).map(([k, name]) => [k, readFileSync(new URL(name, dir), 'utf8')]));
const review = reviewGuildIntelligence(sources);
const base = { actorId: 10, shops: [{ id: 10, shopname: '甲', guild: 'g' }, { id: 20, shopname: '乙', guild: '' }], guild: { code: 'g', name: '公會', money: 22200000 }, log0: '', log1: '', page: 0, mobile: false };
const records = n => Array.from({ length: n }, (_, i) => `1700000000\t1\t${[10, 20, 99][i % 3]}\t情報${i}\n`).join('');
function compare(changes) {
  const input = { ...base, ...changes };
  const before = JSON.stringify(input);
  const actual = projectGuildIntelligence({ ...input, review });
  const p = spawnSync('perl', [fileURLToPath(new URL('original-r4-guild-intelligence-probe.pl', dir))], { input: JSON.stringify(input), encoding: 'utf8' });
  assert.equal(p.status, 0, p.stderr);
  const original = JSON.parse(p.stdout);
  assert.equal(actual.level, original.level);
  assert.deepEqual(actual.rows, original.rows);
  assert.deepEqual(['page', 'start', 'end', 'next', 'prev', 'max'].map(k => actual.pagination[k]), original.page);
  assert.equal(actual.committable, false);
  assert.equal(JSON.stringify(input), before);
  return actual;
}
test('guild intelligence: original treasury level and actual-count anonymity thresholds', () => {
  for (const money of [-1, 0, 110999, 111000, 221999, 222000, 2220000, 2331000, 22200000, 99999999]) compare({ guild: { ...base.guild, money }, log0: records(205) });
  assert.equal(compare({ log0: records(20) }).rows[0].shopName, '？？？？？？');
  assert.equal(compare({ log0: records(21) }).rows[0].shopName, '甲');
  assert.equal(compare({ log0: records(21) }).rows[2].shopName, '？？？？？？');
});
test('guild intelligence: original file order, filter, chop, empty fallback and pages', () => {
  for (const page of [-2, 0, 1, 2, 99]) for (const mobile of [false, true]) compare({ log0: records(29), log1: records(15), page, mobile });
  compare({ log0: '0\t1\t10\t零\n1700000000\t1\t9\t不顯示\n1700000000\t1\t10\t甲\n1700000000\t1\t20\t末字😀', log1: '1700000001\t1\t99\t<em>opaque</em>\n1700000002\t1\t20\t多欄\t忽略\n' });
  compare({ log0: '1700000000\t1\t9\t不顯示\n' });
  compare({});
});
test('guild intelligence: source pin and trusted membership fail closed', () => {
  assert.throws(() => reviewGuildIntelligence({ ...sources, handler: sources.handler + '\n' }));
  for (const patch of [{ review: {} }, { actorId: 20 }, { actorId: 99 }, { guild: { ...base.guild, code: 'other' } }, { shops: [...base.shops, base.shops[0]] }, { page: 0.5 }]) assert.throws(() => projectGuildIntelligence({ ...base, review, ...patch }));
});
