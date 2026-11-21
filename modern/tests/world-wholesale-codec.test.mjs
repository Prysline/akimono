import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseWorldWholesaleLine, serializeWorldWholesaleLine,
  readWorldWholesaleSnapshot, writeWorldWholesaleSnapshot,
} from '../src/world-wholesale-codec.mjs';
import { loadStandardStreetModel } from '../src/standard-street-model.mjs';
import { projectReviewedWholesaleTurnItem } from '../src/wholesale-turn-model.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [reader, writer, itemDsl, rebelDsl]=await Promise.all([
  'modern/tests/original-perl/inc-func.cgi',
  'modern/tests/original-perl/write.cgi',
  'custom/inc-item-data.cgi',
  'custom/inc-rebel-data.cgi',
].map(p=>readFile(path.join(root,p),'utf8')));
const model=loadStandardStreetModel(itemDsl,rebelDsl);
const empty=()=>Array(model.maxItem).fill(0);
const sample=(csv, eol='\n')=>[
  '1700000000', '100000,2,3,10,city:status',csv,'', '//',
  '12,other,shop,opaque', '1:20:0:0:', '',
].join(eol);

test('B-12 original pinned DataRead reads world inventory on third line',()=>{
  assert.ok(reader.includes('$DTlasttime=$DATA[$idx++];'));
  assert.ok(reader.includes('($DTpeople,$DTnextid,$DTblockip,$DTTaxrate,$DTState)=split(/,/,$DATA[$idx++]);'));
  assert.ok(reader.includes('@DTwholestore=split(/,/,$DATA[$idx++],$MAX_ITEM);'));
  assert.ok(reader.includes('%DTevent=split(/,/,$DATA[$idx++]);'));
});

test('B-12 original pinned DataWrite writes third line as comma-joined world inventory',()=>{
  assert.ok(writer.includes('print OUT "$DTlasttime\\n$DTpeople,$DTnextid,$DTblockip,$DTTaxrate,$DTState\\n";'));
  assert.ok(writer.includes('print OUT join(",",@DTwholestore)."\\n";'));
  assert.ok(writer.includes('print OUT join(",",%DTevent)."\\n";'));
  assert.ok(writer.includes('print OUT "//\\n";'));
  assert.ok(writer.includes('OpenAndCheck(GetPath($TEMP_DIR,$DATA_FILE));'));
  assert.ok(writer.includes('RenameAndCheck($TEMP_DIR."/".$_,$DATA_DIR."/".$_);'));
});

test('B-12 complete 79-cell world CSV round-trips canonically',()=>{
  const stock=empty();stock[0]=150;stock[9]=8;stock[39]=20;stock[78]=5;
  const csv=serializeWorldWholesaleLine(stock);
  assert.equal(csv.split(',').length,79);
  assert.deepEqual(parseWorldWholesaleLine(csv).stock,stock);
  assert.deepEqual(readWorldWholesaleSnapshot(sample(csv)).stock,stock);
  assert.equal(writeWorldWholesaleSnapshot(sample(csv),stock),sample(csv));
});

test('B-12 physical line order preserves metadata, event, separator and opaque shops',()=>{
  const stock=empty();stock[9]=4;const raw=sample(serializeWorldWholesaleLine(stock));
  const changed=[...stock];changed[9]=7;changed[0]=2;
  const revised=writeWorldWholesaleSnapshot(raw,changed);
  const before=raw.split('\n');const after=revised.split('\n');
  assert.equal(before.length,after.length);
  assert.equal(before[0],after[0]);assert.equal(before[1],after[1]);
  assert.deepEqual(before.slice(3),after.slice(3));
  assert.equal(after[2],serializeWorldWholesaleLine(changed));
  assert.deepEqual(readWorldWholesaleSnapshot(revised).stock,changed);
  assert.equal(readWorldWholesaleSnapshot(raw).stock[9],4);
});

test('B-12 sparse legacy stock slots read as zero, no-op retains exact spelling',()=>{
  const legacy=sample('4,,3,');
  const parsed=readWorldWholesaleSnapshot(legacy);
  assert.equal(parsed.suppliedSlots,4);
  assert.equal(parsed.stock[0],4);
  assert.equal(parsed.stock[1],0);
  assert.equal(parsed.stock[2],3);
  assert.equal(parsed.stock[3],0);
  assert.equal(parsed.stock[78],0);
  assert.equal(writeWorldWholesaleSnapshot(legacy,parsed.stock),legacy);
  const changed=[...parsed.stock];changed[78]=1;
  const update=writeWorldWholesaleSnapshot(legacy,changed);
  assert.equal(update.split('\n')[2].split(',').length,79);
  assert.deepEqual(readWorldWholesaleSnapshot(update).stock,changed);
});

test('B-12 blank wholesale line is a valid all-zero sparse source, not an invented shop',()=>{
  const text=sample('');
  const stock=readWorldWholesaleSnapshot(text);
  assert.equal(stock.suppliedSlots,0);
  assert.deepEqual(stock.stock,empty());
  assert.equal(writeWorldWholesaleSnapshot(text,stock.stock),text);
});

test('B-12 CRLF source and opaque following world sections survive exact replacement',()=>{
  const stock=empty();stock[0]=10;const old=sample(serializeWorldWholesaleLine(stock),'\r\n');
  const updated=[...stock];updated[0]=3;
  const result=writeWorldWholesaleSnapshot(old,updated);
  assert.ok(result.includes('\r\n'));
  assert.equal(result.replace(/\r\n/g,'\n').split('\n').slice(3).join('\n'),
    old.replace(/\r\n/g,'\n').split('\n').slice(3).join('\n'));
  assert.deepEqual(readWorldWholesaleSnapshot(result).stock,updated);
});

test('B-12 third line with no final LF can round-trip without an invented newline',()=>{
  const input='12\npeople,2,3,4,state\n4,,3';
  const read=readWorldWholesaleSnapshot(input);
  assert.equal(read.stock[0],4);
  assert.equal(writeWorldWholesaleSnapshot(input,read.stock),input);
  const changed=[...read.stock];changed[0]=5;
  const output=writeWorldWholesaleSnapshot(input,changed);
  assert.equal(output.endsWith('\n'),false);
  assert.deepEqual(readWorldWholesaleSnapshot(output).stock,changed);
});

test('B-12 parsed source cannot be modified and rewritten stock is independent',()=>{
  const raw=sample('5,0,2');const read=readWorldWholesaleSnapshot(raw);
  assert.ok(Object.isFrozen(read));assert.ok(Object.isFrozen(read.stock));
  assert.throws(()=>{read.stock[0]=100;},TypeError);
  const next=[...read.stock];next[0]=3;
  const output=writeWorldWholesaleSnapshot(raw,next);
  next[0]=111;
  assert.equal(readWorldWholesaleSnapshot(output).stock[0],3);
  assert.equal(read.stock[0],5);
});

test('B-12 oversized, negative, malformed and unsafe CSV fields reject',()=>{
  const invalid=['-1','1.5','+1',' 1','1 ','001','Infinity','NaN',
    '1e3','9007199254740992','7;exit','1\t2','2/3'];
  for(const field of invalid) {
    assert.throws(()=>parseWorldWholesaleLine(field),/Unsupported|safe integer/);
  }
  assert.throws(()=>parseWorldWholesaleLine(Array(80).fill('0').join(',')),
    /MAX_ITEM slots/);
  assert.throws(()=>parseWorldWholesaleLine('1\n2'),/one line/);
});

test('B-12 valid zero and maximum safe integer slots do not overflow the source subset',()=>{
  const max=Number.MAX_SAFE_INTEGER;
  assert.equal(parseWorldWholesaleLine(String(max)).stock[0],max);
  assert.equal(parseWorldWholesaleLine('0').stock[0],0);
  const csv=serializeWorldWholesaleLine([max,0,5],3);
  assert.deepEqual(parseWorldWholesaleLine(csv,3).stock,[max,0,5]);
});

test('B-12 write rejects any unsafe shape without changing original world text',()=>{
  const world=sample('1,2,3');
  for(const stock of [[0],[1,2,3],Array(79).fill(-1),
    Array(79).fill(0.2),Array(79).fill(NaN),Array(79).fill(undefined)]) {
    assert.throws(()=>writeWorldWholesaleSnapshot(world,stock),
      /79 item slots|nonnegative safe integer/);
  }
  assert.equal(readWorldWholesaleSnapshot(world).stock[0],1);
});

test('B-12 missing headers or wholesale line refuse without fabricating world file',()=>{
  for(const raw of ['', '1', '1\n', '1\n2', '1\n2\n']) {
    assert.throws(()=>readWorldWholesaleSnapshot(raw),/missing/);
  }
});

test('B-12 original text delimiters are not escaped and reject NUL, bare CR and mixed header EOL',()=>{
  for(const raw of ['1\r2\n3\n4','1\0\n2\n4','1\r\n2\n3\n4','1\n2\r\n3\n4']) {
    assert.throws(()=>readWorldWholesaleSnapshot(raw),/NUL|bare CR|Mixed newline/);
  }
});

test('B-12 source parser does not read shop inventory as world inventory',()=>{
  const full=sample('0,1,2');
  const lines=full.split('\n');
  lines[7]='999,999,999,shops';
  const parsed=readWorldWholesaleSnapshot(lines.join('\n'));
  assert.equal(parsed.stock[0],0);
  assert.equal(parsed.stock[1],1);
  assert.equal(parsed.stock[2],2);
});

test('B-12 documented 1-based id 79 uses array index 78 in serialized world data',()=>{
  const s=empty();s[78]=7;const world=sample(serializeWorldWholesaleLine(s));
  const parsed=readWorldWholesaleSnapshot(world);
  assert.equal(parsed.stock[78],7);
  assert.equal(parsed.stock[77],0);
  assert.equal(world.split('\n')[2].split(',')[78],'7');
});

test('B-12 isolated source-to-turn-to-text roundtrip preserves all opaque file data',()=>{
  const original=empty();original[9]=3;
  const world=sample(serializeWorldWholesaleLine(original));
  const snapshot=readWorldWholesaleSnapshot(world);
  const shops=[{item:empty()},{item:empty()}];
  const projected=projectReviewedWholesaleTurnItem(model,snapshot.stock,shops,{
    itemId:10,timespanSeconds:600,population:100000,maxUsers:50,
    random:()=>0,
  });
  const changed=writeWorldWholesaleSnapshot(world,projected.worldStock);
  assert.equal(readWorldWholesaleSnapshot(changed).stock[9],5);
  assert.equal(readWorldWholesaleSnapshot(world).stock[9],3);
  assert.deepEqual(changed.split('\n').slice(3),world.split('\n').slice(3));
  assert.equal(projected.receipt.finalStock,5);
});

test('B-12 partial rewrite is deterministic and idempotent',()=>{
  const raw=sample('1,2,3');
  const arr=[...readWorldWholesaleSnapshot(raw).stock];arr[10]=7;
  const first=writeWorldWholesaleSnapshot(raw,arr);
  const second=writeWorldWholesaleSnapshot(first,arr);
  assert.equal(first,second);
});

test('B-12 intentionally does not perform file system commit or guess events/town parsing',()=>{
  const csv='12,3,4';
  const world='1731111111\n123,2,3,4,city:status\n'+csv+
    '\n21,extra,event\nopaqueTown\n//\nSHOP not real DSL\n';
  const result=writeWorldWholesaleSnapshot(world,
    [...readWorldWholesaleSnapshot(world).stock].map((n,i)=>i===0?20:n));
  assert.ok(result.includes('\n21,extra,event\nopaqueTown\n//\nSHOP not real DSL\n'));
  assert.deepEqual(result.split('\n').slice(3),world.split('\n').slice(3));
});
