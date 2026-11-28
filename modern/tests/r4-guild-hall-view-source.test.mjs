import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { reviewGuildHall, projectGuildHall } from '../src/original-r4-guild-hall-view.mjs';
const dir = new URL('./original-perl/', import.meta.url);
const sources = Object.fromEntries(Object.entries({ hall: 'pinned-gd.cgi', menu: 'pinned-inc-gd.cgi', page: 'pinned-street-shop-page.cgi', time: 'pinned-time.cgi' }).map(([k, n]) => [k, readFileSync(new URL(n, dir), 'utf8')]));
const review = reviewGuildHall(sources);
const detail = { member: '會員', comment: '方針', url: 'https://example.invalid', leadt: 'std', leader: 1, representative: 2 };
const guild = (code, money, d = detail) => ({ code, name: code, money, dealrate: 123, feerate: 34, income: 120, outgo: 51, atk: 1234, def: -35, detail: d });
const base = { street: 'std', guest: false, actorId: 1, shops: [{id:1,shopname:'甲',guild:'a'},{id:2,shopname:'乙',guild:'a'},{id:3,shopname:'丙',guild:'a'},{id:4,shopname:'丁',guild:''},{id:5,shopname:'戊',guild:'pending'}], guilds: [guild('a',100),guild('b',100),guild('c',-10),guild('d',101,null)], now: 1700000000, boardMtime: 1699999000, dominion: 'b', battleEnd: 1700010000, lastTime: 1699999000, mobile:false,page:0 };
function compare(patch) {
  const input = { ...base, ...patch };
  const p = spawnSync('perl', [fileURLToPath(new URL('original-r4-guild-hall-probe.pl', dir))], {input:JSON.stringify(input),encoding:'utf8'});
  assert.equal(p.status,0,p.stderr);
  const original = JSON.parse(p.stdout);
  const guilds = original.order.map(c => input.guilds.find(g => g.code === c));
  const snapshot = {...input,guilds}; const before=JSON.stringify(snapshot);
  const actual = projectGuildHall({...snapshot,review});
  assert.deepEqual(actual.menu,original.menu); assert.equal(actual.mode,original.mode); assert.deepEqual(actual.rows,original.rows);
  assert.deepEqual(actual.pageInfo??[],original.page); assert.equal(actual.commandsVisible,!!original.commands); assert.equal(actual.battleSeconds,original.battle);
  assert.deepEqual(original.writes,actual.repairNeededCodes.length?['Lock','MakeGuildFile','WriteGuildData','DataWrite','RenewLog','DataCommitOrAbort','UnLock']:[]);
  assert.equal(JSON.stringify(snapshot),before); assert.equal(actual.committable,false);return actual;
}
test('guild hall menu guest/nonmember/leader/representative/member/pending and board time',()=>{
  compare({guest:true,actorId:null}); for(const actorId of [1,2,3,4,5])compare({actorId});
  compare({street:'other'}); compare({boardMtime:0}); compare({boardMtime:1699800000});
});
test('guild hall ranked rows, tied treasury source order, missing details only on visible page, and bar bounds',()=>{
  const g=Array.from({length:30},(_,i)=>guild('g'+i,i===29?1000:i,i===29?null:{...detail,url:i%2?'':'https://example.invalid'}));
  for(const mobile of [true,false])for(const page of [-2,0,1,99])compare({actorId:4,guilds:g,mobile,page,battleEnd:0});
  compare({actorId:4,guilds:[],battleEnd:0});
});
test('guild hall rejects source drift, inactive or forged actor and duplicate guild rows',()=>{
  assert.throws(()=>reviewGuildHall({...sources,hall:sources.hall+'\n'}));
  for(const patch of [{review:{}},{actorId:99},{guest:true},{guilds:[...base.guilds,base.guilds[0]]},{page:0.1}])assert.throws(()=>projectGuildHall({...base,review,...patch}));
});
