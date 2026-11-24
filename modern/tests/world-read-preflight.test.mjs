import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  MAX_ISOLATED_WORLD_BYTES,
  parseIsolatedWorldReadEnvelope,reviewIsolatedWorldRead,
} from '../src/world-read-preflight.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const original=await readFile(
  path.join(root,'modern/tests/original-perl/inc-func.cgi'),'utf8'
);
const sample=({
  lasttime='1700000000',metadata='100000,2,0,10,7',
  stock='4,0,3',events='',town=null,shops=[],
  eol='\n',ending=true,
}={})=>{
  const lines=[lasttime,metadata,stock,events];
  if (town!==null) lines.push(town);
  lines.push('//',...shops);
  return lines.join(eol)+(ending?eol:'');
};
const read=(worldText,options={})=>reviewIsolatedWorldRead({
  readSucceeded:true,sourceSizeBytes:Buffer.byteLength(worldText),
  observedBytesRead:Buffer.byteLength(worldText),worldText,...options,
});

test('B-16 frozen Core DataRead source shows unverified read and unbounded // scan',()=>{
  assert.ok(original.includes('sub DataRead'));
  assert.ok(original.includes('open(IN,"<:encoding(UTF-8)",$datafile);'));
  assert.ok(original.includes('read(IN,my $buf,-s $datafile);'));
  assert.ok(original.includes('my @DATA=split(/\\n/,$buf);'));
  assert.ok(original.includes('OutError("no data") if !@DATA;'));
  assert.ok(original.includes('@DTwholestore=split(/,/,$DATA[$idx++],$MAX_ITEM);'));
  assert.ok(original.includes("while($DATA[$idx++] ne '//'){}"));
  assert.ok(original.includes('foreach(keys(%DTevent)){require(GetPath($ITEM_DIR,"event",$_));}'));
});

test('B-16 strict no-event/no-town/no-shop source world is parsed without IO',()=>{
  const v=parseIsolatedWorldReadEnvelope(sample());
  assert.equal(v.mode,'strict no-events/no-town/no-shops Core DataRead subset');
  assert.equal(v.lasttime,1700000000);
  assert.deepEqual(v.metadata,{
    population:100000,nextId:2,blockIp:0,taxRate:10,stateRaw:'7',
  });
  assert.equal(v.worldStock.length,79);
  assert.deepEqual(v.worldStock.slice(0,4),[4,0,3,0]);
  assert.equal(v.originalStockSlots,3);
  assert.equal(v.separatorLine,5);
  assert.ok(Object.isFrozen(v));
  assert.ok(Object.isFrozen(v.worldStock));
});

test('B-16 final LF is optional in exact isolated envelope',()=>{
  const v=parseIsolatedWorldReadEnvelope(sample({ending:false}));
  assert.equal(v.worldStock[2],3);
  assert.equal(v.separatorLine,5);
});

test('B-16 empty/missing/undefined text is always refused',()=>{
  for(const raw of ['',undefined,null,42]){
    assert.throws(()=>parseIsolatedWorldReadEnvelope(raw),/Missing world text|Empty world text/);
  }
});

test('B-16 truncated source without // is refused before original infinite scan',()=>{
  const truncated=sample().replace('//\n','');
  assert.throws(()=>parseIsolatedWorldReadEnvelope(truncated),
    /missing exact \/\/ separator/);
});

test('B-16 wrong or displaced delimiter is refused',()=>{
  for(const raw of [sample().replace('//','/-'),sample().replace('//','// '),
    sample().replace('//','/ /')]){
    assert.throws(()=>parseIsolatedWorldReadEnvelope(raw),/missing exact \/\/ separator/);
  }
});

test('B-16 CRLF or mixed LF/CRLF source cannot reach unbounded Perl separator loop',()=>{
  for(const raw of [sample({eol:'\r\n'}),
    sample().replace('//\n','//\r\n')]){
    assert.throws(()=>parseIsolatedWorldReadEnvelope(raw),/control characters or CRLF/);
  }
});

test('B-16 rejects dynamic events instead of allowing Core to require files',()=>{
  assert.throws(()=>parseIsolatedWorldReadEnvelope(sample({events:'1,2'})),
    /Dynamic event require/);
});

test('B-16 rejects town and shop records until original Core callbacks are reviewed',()=>{
  assert.throws(()=>parseIsolatedWorldReadEnvelope(sample({town:'citydata'})),
    /Dynamic town\/shop/);
  assert.throws(()=>parseIsolatedWorldReadEnvelope(sample({town:''})),
    /Dynamic town\/shop/);
  assert.throws(()=>parseIsolatedWorldReadEnvelope(sample({shops:['1,shop','opaque']})),
    /Dynamic town\/shop/);
});

test('B-16 invalid first timestamp or unsafe overflow is refused',()=>{
  for(const v of ['','0','-1','1e10','hello','01','9007199254740992']){
    assert.throws(()=>parseIsolatedWorldReadEnvelope(sample({lasttime:v})),
      /Invalid lasttime|Unsafe lasttime/);
  }
});

test('B-16 incorrect world metadata field count or invalid numbers is refused',()=>{
  for(const metadata of ['100,2,0,10','100,2,0,10,7,extra',
    'x,2,0,10,7','100,-2,0,10,7','100,2,1.5,10,7']){
    assert.throws(()=>parseIsolatedWorldReadEnvelope(sample({metadata})),
      /World metadata|Invalid people|Invalid nextid|Invalid blockip/);
  }
});

test('B-16 rejects dangerous or unreviewed world state values',()=>{
  for(const metadata of ['100,2,0,10,x','100,2,0,10,7;do',
    '100,2,0,10,','100,2,0,10,7/value']){
    assert.throws(()=>parseIsolatedWorldReadEnvelope(sample({metadata})),
      /state metadata/);
  }
});

test('B-16 original raw split accepts garbage; strict subset rejects stock text',()=>{
  for(const stock of ['4,garbage,3','-1,2','1.5,2','1e3,2',
    '9007199254740992','a:cmd','1,2,,3;bad']){
    assert.throws(()=>parseIsolatedWorldReadEnvelope(sample({stock})),
      /Unsupported wholesale|safe integer/);
  }
});

test('B-16 sparse or completely blank stock is accepted only as zeroed fixture',()=>{
  const sparse=parseIsolatedWorldReadEnvelope(sample({stock:'4,,3,'}));
  assert.equal(sparse.worldStock[1],0);
  assert.equal(sparse.worldStock[78],0);
  const blank=parseIsolatedWorldReadEnvelope(sample({stock:''}));
  assert.deepEqual(blank.worldStock,Array(79).fill(0));
  assert.equal(blank.originalStockSlots,0);
});

test('B-16 rejects more than 79 item slots instead of ignoring excess data',()=>{
  assert.throws(()=>parseIsolatedWorldReadEnvelope(sample({
    stock:Array(80).fill('0').join(','),
  })),/MAX_ITEM slots/);
});

test('B-16 text with NUL, tab and control characters is refused',()=>{
  for(const bad of ['\0','\t','\x1b']){
    assert.throws(()=>parseIsolatedWorldReadEnvelope(sample().replace('4,0,3',bad)),
      /control characters/);
  }
});

test('B-16 input byte size guard is enforced before parsing',()=>{
  assert.equal(MAX_ISOLATED_WORLD_BYTES,1024*1024);
  assert.throws(()=>parseIsolatedWorldReadEnvelope('a'.repeat(MAX_ISOLATED_WORLD_BYTES+1)),
    /size limit/);
});

test('B-16 explicit completed byte-count observations permit isolated inspection only',()=>{
  const worldText=sample();
  const r=read(worldText);
  assert.equal(r.allowIsolatedInspection,true);
  assert.equal(r.envelope.lasttime,1700000000);
  assert.equal(r.envelope.bytes,Buffer.byteLength(worldText));
  assert.equal(r.scope.includes('no open/read lock'),true);
  assert.ok(Object.isFrozen(r));
});

test('B-16 failed reads and partial byte counts cannot certify a world file',()=>{
  const worldText=sample();const length=Buffer.byteLength(worldText);
  assert.throws(()=>read(worldText,{readSucceeded:false}),/read failed/);
  assert.throws(()=>read(worldText,{sourceSizeBytes:length+1}),
    /Incomplete world input read/);
  assert.throws(()=>read(worldText,{observedBytesRead:length-1}),
    /Incomplete world input read/);
});

test('B-16 bytes and supplied string must match, including UTF8 byte length',()=>{
  const worldText=sample().replace('4,0,3','🦆');
  assert.throws(()=>read(worldText,{observedBytesRead:worldText.length,
    sourceSizeBytes:worldText.length}),/byte count differs/);
});

test('B-16 observations must be explicit booleans, nonnegative safe lengths',()=>{
  const worldText=sample();
  for(const bad of [undefined,null,0,1]){
    assert.throws(()=>read(worldText,{readSucceeded:bad}),/readSucceeded/);
  }
  for(const name of ['sourceSizeBytes','observedBytesRead']){
    for(const bad of [-1,NaN,1.25,undefined]){
      assert.throws(()=>read(worldText,{[name]:bad}),
        new RegExp(name));
    }
  }
});

test('B-16 result never claims permission to parse full Core world or write live data',()=>{
  const outcome=read(sample());
  assert.equal('allowLiveWrite' in outcome,false);
  assert.equal('validatedShopCount' in outcome.envelope,false);
  assert.equal('eventsValidated' in outcome.envelope,false);
  assert.equal('backupValid' in outcome,false);
  assert.equal(outcome.envelope.scope.includes('no Perl callbacks'),true);
});
