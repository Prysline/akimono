import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  REVIEWED_SHOP_HEADER_FIELDS,parseReviewedOneShopWorld,
} from '../src/world-one-shop-parser.mjs';
import {parseIsolatedWorldReadEnvelope} from '../src/world-read-preflight.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [reader,writer]=await Promise.all([
  'modern/tests/original-perl/inc-func.cgi',
  'modern/tests/original-perl/write.cgi',
].map(p=>readFile(path.join(root,p),'utf8')));
const sourceOrder=reader.match(/@DTindexnamelist=\s*qw\s*\(\s*([\s\S]*?)\s*\);/);
if(!sourceOrder) throw Error('Frozen Core shop header list disappeared');
const fields=sourceOrder[1].trim().split(/\s+/);
const header=(overrides={})=>{
  const x=Array(32).fill('');
  Object.assign(x,{0:'7',1:'0',2:'alice',3:'ShopA',4:'syntheticPass',
    5:'100000',6:'0',7:'0'},overrides);
  return x.join(',');
};
const payload=(sections=['1,0','50,0','3,0','','','',''])=>sections.join(':');
const world=({
  town='',records=[[header(),payload()]],events='',wholesale='4,0,3',
  delim='//',time='1700000000',metadata='100000,2,0,10,7',
  newline='\n',end=true,
}={})=>{
  const rows=[time,metadata,wholesale,events];
  if(town!==null)rows.push(town);
  rows.push(delim);
  for(const rec of records)rows.push(...rec);
  return rows.join(newline)+(end?newline:'');
};

test('B-17 fixed Core source lists exactly 32 ordered shop fields',()=>{
  assert.deepEqual(REVIEWED_SHOP_HEADER_FIELDS,fields);
  assert.equal(fields.length,32);
  assert.deepEqual([fields[0],fields[2],fields[4],fields[29]],
    ['id','name','pass','foundation']);
  assert.ok(Object.isFrozen(REVIEWED_SHOP_HEADER_FIELDS));
});
test('B-17 source DataRead and DataWrite agree on two lines per shop',()=>{
  assert.ok(reader.includes('@DT{@DTindexnamelist}=split(/,/,$DATA[$idx++]);'));
  assert.ok(reader.includes('@list=split(/:/,$DATA[$idx],7);'));
  assert.ok(reader.includes('@DT{qw(showcase price)}=map{[split(/,/,$_)]}@list[0,1];'));
  assert.ok(reader.includes('tie $DT{item},"AutoVar"'));
  assert.ok(reader.includes('$list[6] ? tie($DT{user}'));
  assert.ok(writer.includes('print OUT join(",",map{$DT->{$_}}@DTindexnamelist),"\\n";'));
  assert.ok(writer.includes('print OUT join(",",@{$DT->{showcase}}).":";'));
  assert.ok(writer.includes('print OUT join(",",@{$DT->{price}}).":";'));
  assert.ok(writer.includes('print OUT AutoVar::Get(\\$DT->{item}).":";'));
});
test('B-17 minimal original DataRead preflight still rejects shops',()=>{
  assert.throws(()=>parseIsolatedWorldReadEnvelope(world()),/Dynamic town\/shop/);
});
test('B-17 one synthetic shop with empty town is safely parsed',()=>{
  const r=parseReviewedOneShopWorld(world());
  assert.equal(r.shopCount,1);
  assert.equal(r.delimiterLine,6);
  assert.equal(r.lasttime,1700000000);
  assert.equal(r.metadata.population,100000);
  assert.deepEqual(r.wholesaleStock.slice(0,4),[4,0,3,0]);
  assert.deepEqual({
    id:r.shop.id,name:r.shop.name,shopname:r.shop.shopname,money:r.shop.money,
  },{id:7,name:'alice',shopname:'ShopA',money:100000});
  assert.deepEqual(r.shop.showcase,[1,0]);
  assert.deepEqual(r.shop.prices,[50,0]);
  assert.deepEqual(r.shop.inventory,[3,0]);
  assert.equal(r.sourceHeaderFields.length,32);
});
test('B-17 exact delimiter immediately after events means no town line',()=>{
  const r=parseReviewedOneShopWorld(world({town:null}));
  assert.equal(r.delimiterLine,5);
  assert.equal(r.shopCount,1);
  assert.equal(r.shop.id,7);
});
test('B-17 final LF is optional for the reviewed shop fixture',()=>{
  const r=parseReviewedOneShopWorld(world({end:false}));
  assert.equal(r.shop.name,'alice');
});
test('B-17 sparse world wholesale stock is preserved in read-only result',()=>{
  const r=parseReviewedOneShopWorld(world({wholesale:'4,,3,'}));
  assert.equal(r.originalStockSlots,4);
  assert.equal(r.wholesaleStock[1],0);
  assert.equal(r.wholesaleStock.length,79);
});
test('B-17 input not modified and records are deeply immutable',()=>{
  const input=world();
  const result=parseReviewedOneShopWorld(input);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.metadata));
  assert.ok(Object.isFrozen(result.shop));
  assert.ok(Object.isFrozen(result.shop.inventory));
  assert.ok(Object.isFrozen(result.wholesaleStock));
  assert.throws(()=>{result.shop.id=8},TypeError);
  assert.throws(()=>{result.shop.inventory[0]=99},TypeError);
  assert.equal(input,world());
});
test('B-17 synthetic password field never leaks into returned model',()=>{
  const result=parseReviewedOneShopWorld(world());
  assert.equal('pass' in result.shop,false);
  assert.equal(JSON.stringify(result).includes('syntheticPass'),false);
});
test('B-17 rejects nonempty dynamic event data instead of running require',()=>{
  assert.throws(()=>parseReviewedOneShopWorld(world({events:'eventid,1'})),
    /Dynamic event require/);
});
test('B-17 rejects nonempty town data until AutoVar is reviewed',()=>{
  assert.throws(()=>parseReviewedOneShopWorld(world({town:'city,opaque'})),
    /Dynamic town content/);
});
test('B-17 rejects zero shops and multiple shops',()=>{
  assert.throws(()=>parseReviewedOneShopWorld(world({records:[]})),
    /one two-line shop|Incomplete or multiple/);
  assert.throws(()=>parseReviewedOneShopWorld(world({
    records:[[header(),payload()],[header({0:'8',2:'bob'}),payload()]],
  })),/one two-line shop|Incomplete or multiple/);
});
test('B-17 refuses orphan header, orphan payload and truncated records',()=>{
  assert.throws(()=>parseReviewedOneShopWorld(world({
    records:[[header()]],
  })),/one two-line shop|Incomplete or multiple/);
  assert.throws(()=>parseReviewedOneShopWorld(world({
    records:[[payload()]],
  })),/one two-line shop|Incomplete or multiple/);
  assert.throws(()=>parseReviewedOneShopWorld(world({
    records:[[header(),payload().slice(0,-2)]],
  })),/seven colon sections/);
});
test('B-17 rejects missing or displaced exact delimiter',()=>{
  assert.throws(()=>parseReviewedOneShopWorld(world({delim:'/-'})),
    /Missing exact Core \/\/ separator/);
  assert.throws(()=>parseReviewedOneShopWorld(world({delim:'// '})),
    /Missing exact Core \/\/ separator/);
});
test('B-17 rejects 31 or 33 header CSV fields',()=>{
  const cells=header().split(',');
  for(const h of [cells.slice(0,-1).join(','),header()+',']){
    assert.throws(()=>parseReviewedOneShopWorld(world({records:[[h,payload()]]})),
      /exactly 32 source fields/);
  }
});
test('B-17 only eight reviewed header fields can be nonempty',()=>{
  for(const idx of [8,9,11,14,29,31]){
    const changed=header({[idx]:'1'});
    assert.throws(()=>parseReviewedOneShopWorld(world({
      records:[[changed,payload()]],
    })),/Unreviewed Core shop header field/);
  }
});
test('B-17 numeric id, money and raw time are validated',()=>{
  for(const h of [
    header({0:'0'}),header({0:'-1'}),header({0:'1.5'}),
    header({1:'oops'}),header({5:'9007199254740992'}),header({6:'2e3'}),
    header({7:'-2'}),
  ]){
    assert.throws(()=>parseReviewedOneShopWorld(world({records:[[h,payload()]]})),
      /Reviewed shop ID|Unsupported|Unsafe/);
  }
});
test('B-17 unreviewed credentials or non-ASCII identity are rejected',()=>{
  for(const h of [
    header({2:'<script>'}),header({3:'商店'}),header({4:'p@ssword'}),
    header({2:''}),header({4:''}),
  ]){
    assert.throws(()=>parseReviewedOneShopWorld(world({records:[[h,payload()]]})),
      /Unsupported synthetic/);
  }
});
test('B-17 payload must have exactly seven colon sections',()=>{
  for(const bad of ['1,0:50,0:3,0','1,0:50,0:3,0:::::',
    '1,0:50,0:3,0::::::']){
    assert.throws(()=>parseReviewedOneShopWorld(world({
      records:[[header(),bad]],
    })),/seven colon sections/);
  }
});
test('B-17 user, yesterday, today and exp sections remain blocked',()=>{
  for(const i of [3,4,5,6]){
    const sections=['1,0','50,0','3,0','','','',''];sections[i]='1,2';
    assert.throws(()=>parseReviewedOneShopWorld(world({
      records:[[header(),payload(sections)]],
    })),/Unreviewed Core shop payload section/);
  }
});
test('B-17 inventory, display and price must use safe same-length integer lists',()=>{
  for(const sections of [
    ['1','50,0','3,0','','','',''],
    ['1,0','50,0','3,-1','','','',''],
    ['1,0','50,0','3,1e8','','','',''],
    ['1,0','50,0','3,9007199254740992','','','',''],
    ['','50,0','3,0','','','',''],
  ]){
    assert.throws(()=>parseReviewedOneShopWorld(world({
      records:[[header(),payload(sections)]],
    })),/equal slot counts|Unsupported|Unsafe|Missing/);
  }
});
test('B-17 refuses excessive item slots in a shop payload',()=>{
  const many=Array(80).fill('0').join(',');
  assert.throws(()=>parseReviewedOneShopWorld(world({
    records:[[header(),payload([many,many,many,'','','',''])]],
  })),/slot count/);
});
test('B-17 malformed metadata and wholesale cannot bypass B-16 checks',()=>{
  assert.throws(()=>parseReviewedOneShopWorld(world({metadata:'oops,2,0,10,7'})),
    /Invalid people/);
  assert.throws(()=>parseReviewedOneShopWorld(world({wholesale:'4,garbage,3'})),
    /Unsupported wholesale/);
});
test('B-17 control chars, CRLF and oversized world are rejected',()=>{
  for(const input of [world({newline:'\r\n'}),world().replace('alice','\t'),
    world().replace('alice','\0')]){
    assert.throws(()=>parseReviewedOneShopWorld(input),/control character or CRLF/);
  }
  assert.throws(()=>parseReviewedOneShopWorld('a'.repeat(1024*1024+1)),
    /size limit/);
});
test('B-17 no live-world IO, callbacks or commit privileges are claimed',()=>{
  const result=parseReviewedOneShopWorld(world());
  assert.equal('writeAuthorized' in result,false);
  assert.equal('eventCallbacksExecuted' in result,false);
  assert.equal('AutoVarValidated' in result,false);
  assert.match(result.scope,/no callbacks, I\/O or live-world permission/);
});
