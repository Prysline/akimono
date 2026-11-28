import { createHash } from 'node:crypto';
const pins = { hall: '8eea04ea3109a3751186c505e70561dec099c1ff', menu: 'fc29abc74d79ee282b86a05a5fa56d9ffd35aa2c', page: 'aa8b04dcec124276cb5b4eeeba650137b4449779', time: 'e164091d4dc6de084bb4770e0b9b4bf6005d9f3f' };
const reviews = new WeakSet(), int = Number.isSafeInteger;
const fail = () => { throw new Error('unreviewed guild hall snapshot'); };
export function reviewGuildHall(sources) {
  for (const [k, sha] of Object.entries(pins)) {
    const s = sources?.[k];
    if (typeof s !== 'string' || createHash('sha1').update('blob ' + Buffer.byteLength(s) + '\0').update(s).digest('hex') !== sha) fail();
  }
  const review = Object.freeze({ committable: false }); reviews.add(review); return review;
}
const code = s => typeof s === 'string' && /^[A-Za-z][A-Za-z0-9_]*$/.test(s);
const text = s => typeof s === 'string';
const id = n => int(n) && n > 0;
const sec = n => int(n) && n >= 0 && n <= 8640000000000 - 32400;
const perlTrue = s => !!s && s !== '0';
function shortTime(mtime, now) {
  if (!mtime) return '--/--';
  const d = new Date((mtime + 32400) * 1000), two = n => String(n).padStart(2, '0');
  return mtime > now - 43200 || Math.trunc((mtime + 32400) / 86400) === Math.trunc((now + 32400) / 86400)
    ? two(d.getUTCHours()) + ':' + two(d.getUTCMinutes()) : two(d.getUTCMonth() + 1) + '/' + two(d.getUTCDate());
}
const bar = value => Math.min(100, Math.trunc(value / 10));
// guilds order is the source-observed definition iteration order for equal-money rows.
export function projectGuildHall({ review, street, guest, actorId = null, shops, guilds, now, boardMtime = 0, dominion = '', battleEnd = 0, lastTime = 0, mobile = false, page = 0 }) {
  if (!reviews.has(review) || !code(street) || typeof guest !== 'boolean' || !Array.isArray(shops) || !Array.isArray(guilds) || !sec(now) || !sec(boardMtime) || !sec(battleEnd) || !sec(lastTime) || !int(page) || typeof mobile !== 'boolean' || !(dominion === '' || code(dominion))) fail();
  const active = new Map(), definitions = new Map(), counts = new Map();
  for (const s of shops) {
    if (!id(s?.id) || active.has(s.id) || !text(s.shopname) || !(s.guild === '' || code(s.guild))) fail();
    active.set(s.id, s); counts.set(s.guild, (counts.get(s.guild) ?? 0) + 1);
  }
  for (const g of guilds) {
    if (!code(g?.code) || definitions.has(g.code) || !text(g.name) || ![g.dealrate, g.feerate, g.money, g.income, g.outgo, g.atk, g.def].every(int)) fail();
    const d = g.detail;
    if (d !== null && (!d || ![d.member, d.comment, d.url, d.leadt].every(text) || !int(d.leader) || !int(d.representative))) fail();
    definitions.set(g.code, g);
  }
  if (guest ? actorId !== null : !id(actorId) || !active.has(actorId)) fail();
  const actor = guest ? null : active.get(actorId), own = actor?.guild ? definitions.get(actor.guild) : null;
  const menu = [], link = (route, label, query = '') => menu.push({ route, label: '[' + label + ']', query });
  link('gd', 'ギルド一覧');
  if (!guest && !actor.guild) { link('gd-m', '入団手続'); link('gd-f', '結成宣言'); }
  if (actor?.guild) {
    link('gd-bbs', '作戦室 ' + shortTime(boardMtime, now)); link('gd-i', '探偵室', '&cmd=info');
    const leader = own?.detail?.leadt === street && own.detail.leader === actor.id;
    const representative = own?.detail?.representative === actor.id;
    if (leader) link('gd-f', '執務室');
    if (leader || representative) { link('gd-e', '人事室', '&mode=submit'); link('gd-m', '入団許可', '&mode=submit'); }
    if (!leader) link('gd-e', '退団手続', '&mode=leave');
  }
  const mode = !actor?.guild ? 'list' : perlTrue(own?.name) ? 'headquarters' : 'forming';
  if (mode === 'forming') return { committable: false, mode, menu, actorShopName: actor.shopname, guildName: null, battleSeconds: null, pageInfo: null, rows: [], repairNeededCodes: [], commandsVisible: false };
  const ordered = [...guilds].sort((a, b) => b.money - a.money);
  const count = ordered.length, size = mobile ? 5 : 25, max = Math.trunc((count - 1) / size) || 0;
  page = Math.min(max, Math.max(0, page));
  const start = page * size, end = Math.min(start + size, count) - 1;
  const pageInfo = [page, start, end, (page + 1) * size < count ? page + 1 : 0, page > 0 ? page - 1 : -1, max];
  const rows = [], repairNeededCodes = []; let rank = start + 1;
  for (const g of ordered.slice(start, end + 1)) {
    if (g.detail === null) { repairNeededCodes.push(g.code); continue; }
    rows.push({ rank: rank++, code: g.code, name: g.name, dominion: g.code === dominion, money: g.money, deficit: g.money < 0,
      attackWidth: bar(g.atk), defenseWidth: bar(g.def), income: g.income, outgo: g.outgo, dealPercent: g.dealrate / 10, feePercent: g.feerate / 10,
      member: g.detail.member, memberCount: counts.get(g.code) ?? 0, homepage: perlTrue(g.detail.url), comment: g.detail.comment });
  }
  return { committable: false, mode, menu, actorShopName: null, guildName: mode === 'headquarters' ? own.name : null,
    battleSeconds: battleEnd ? battleEnd - lastTime : null, pageInfo, rows, repairNeededCodes, commandsVisible: mode === 'headquarters' };
}
