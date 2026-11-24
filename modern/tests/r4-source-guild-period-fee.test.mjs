import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  reviewR4GuildFee,projectR4GuildFee,R4_GUILD_FEE_SOURCE,
} from '../src/original-r4-guild-period-fee.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const source=await readFile(
  path.join(root,'modern/tests/original-perl/period.cgi'),'utf8');
const reviewed=reviewR4GuildFee({periodSource:source});
const original=()=>JSON.parse(execFileSync('perl',
  ['original-r4-guild-period-fee-probe.pl'],{
    cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
  }));

test('R4 real frozen Perl guild dues and atk/def source projection agrees with explicit IO call log',()=>{
  assert.equal(reviewed.source,R4_GUILD_FEE_SOURCE);
  assert.equal(reviewed.committable,false);
  const oracle=original();
  assert.equal(oracle.cases.length,7);
  for(const row of oracle.cases){
    const before=JSON.stringify(row.input);
    const got=projectR4GuildFee({reviewed,...row.input});
    assert.deepEqual(got.shop,row.output.shop,row.name+' exact source shop');
    assert.deepEqual(got.guild,row.output.guild,row.name+' original combat fields');
    assert.deepEqual(got.editGuildMoneyCalls,row.output.editGuildMoneyCalls,
      row.name+' exact external IO call, not pretend durable write');
    assert.equal(got.committable,false);
    assert.equal(JSON.stringify(row.input),before,'no input mutation');
  }
  assert.equal(oracle.cases[3].output.editGuildMoneyCalls[0].amount,456,
    'frozen Perl int() truncates sales/1000 fee');
  assert.equal(oracle.cases[4].output.guild.def,1000,
    'original defense can be capped at 1000');
  assert.ok(oracle.cases[6].output.shop.money<0,
    'original fee may exceed shop money; do not silently clamp');
});

test('R4 exact guild source can be observed from independent Perl source processes',()=>{
  for(let k=0;k<2;k++)for(const row of original().cases){
    const got=projectR4GuildFee({reviewed,...row.input});
    assert.deepEqual(got.shop,row.output.shop);
    assert.deepEqual(got.guild,row.output.guild);
    assert.deepEqual(got.editGuildMoneyCalls,row.output.editGuildMoneyCalls);
  }
});

test('R4 source guild IO requires a matching explicit membership and fails closed',()=>{
  const input=original().cases[2].input;
  const before=JSON.stringify(input);
  assert.throws(()=>reviewR4GuildFee({
    periodSource:source.replace(
      'EditGuildMoney($DT->{guild},$money);',
      'EditGuildMoney($DT->{guild},0);',
    ),
  }),/original guild period source drift/);
  assert.throws(()=>projectR4GuildFee({
    reviewed,...input,guild:null,
  }),/source guild membership/);
  assert.throws(()=>projectR4GuildFee({
    reviewed,...input,guild:{...input.guild,id:'other'},
  }),/source guild membership/);
  assert.throws(()=>projectR4GuildFee({
    reviewed,...input,guild:{...input.guild,feeRate:1001},
  }),/source guild membership/);
  assert.throws(()=>projectR4GuildFee({
    reviewed,...input,shop:{...input.shop,money:NaN},
  }),/source-reviewed guild data/);
  assert.throws(()=>projectR4GuildFee({
    reviewed,shop:{...input.shop,guild:''},guild:input.guild,
  }),/unreviewed guild attachment/);
  assert.equal(JSON.stringify(input),before);
});
