import { createHash } from 'node:crypto';

const pins = Object.freeze({
  handler: '168849940254c5e4939a3bef0f7af84c24a5c9ee',
  page: 'aa8b04dcec124276cb5b4eeeba650137b4449779',
  time: 'e164091d4dc6de084bb4770e0b9b4bf6005d9f3f',
});
const reviews = new WeakSet();
const fail = () => { throw new Error('unreviewed guild intelligence input'); };
const integer = Number.isSafeInteger;
export function reviewGuildIntelligence(sources) {
  for (const [key, sha] of Object.entries(pins)) {
    if (typeof sources?.[key] !== 'string') fail();
    const bytes = Buffer.from(sources[key], 'utf8');
    if (createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex') !== sha) fail();
  }
  const token = Object.freeze({ committable: false });
  reviews.add(token);
  return token;
}
function timeLabel(raw) {
  if (!raw || raw === '0') return '--/--';
  const tm = Number.parseInt(raw, 10);
  if (!integer(tm)) fail();
  const date = new Date((tm + 32400) * 1000);
  if (!Number.isFinite(date.getTime())) fail();
  const two = n => String(n).padStart(2, '0');
  return `${two(date.getUTCMonth() + 1)}/${two(date.getUTCDate())} ${two(date.getUTCHours())}:${two(date.getUTCMinutes())}`;
}
// The entire snapshot is supplied by D, never by the browser. Source log fields are opaque text.
export function projectGuildIntelligence({ review, actorId, shops, guild, log0 = '', log1 = '', mobile = false, page = 0 }) {
  if (!reviews.has(review) || !integer(actorId) || actorId <= 0 || !Array.isArray(shops) ||
      !integer(page) || typeof mobile !== 'boolean' || typeof log0 !== 'string' || typeof log1 !== 'string') fail();
  const active = new Map();
  for (const shop of shops) {
    if (!integer(shop?.id) || shop.id <= 0 || active.has(String(shop.id)) || typeof shop.shopname !== 'string' || typeof shop.guild !== 'string') fail();
    active.set(String(shop.id), shop);
  }
  const actor = active.get(String(actorId));
  if (!actor?.guild || guild?.code !== actor.guild || typeof guild.name !== 'string' || !integer(guild.money)) fail();
  const level = Math.min(200, Math.max(1, Math.trunc(guild.money / 111000)));
  // Perl reads each file separately, retains line endings and filters on at least two ID digits.
  const entries = [log0, log1].flatMap(s => s.match(/[^\n]*\n|[^\n]+$/g) ?? [])
    .filter(s => /^\d+\t\d+\t\d{2,}\t/.test(s));
  const fallback = entries.length === 0;
  const count = Math.min(level, fallback ? 1 : entries.length);
  const size = mobile ? 5 : 25;
  const max = Math.trunc((count - 1) / size);
  page = Math.min(max, Math.max(0, page));
  const start = page * size, end = Math.min(start + size, count) - 1;
  const next = (page + 1) * size < count ? page + 1 : 0, prev = page > 0 ? page - 1 : -1;
  const rows = fallback ? [{ time: '01/01 09:00', shopName: '？？？？？？', message: '' }] : entries.slice(start, end + 1).map(line => {
    const [tm, , id, message = ''] = line.split('\t');
    return { time: timeLabel(tm), shopName: count > 20 && active.has(id) ? active.get(id).shopname : '？？？？？？',
      message: Array.from(message).slice(0, -1).join('') };
  });
  return { committable: false, guildName: guild.name, level, count, rows,
    pagination: { page, start, end, next, prev, max, size, field: 'lpg', query: { cmd: 'info' } } };
}
