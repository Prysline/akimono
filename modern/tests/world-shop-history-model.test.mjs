import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseReviewedShopHistoryWorld} from '../src/world-shop-history-model.mjs';
import {parseReviewedOneShopWorld} from '../src/world-one-shop-parser.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [reader,writer]=await Promise.all([
  'modern/tests/original-perl/inc-func.cgi','modern/tests/original-perl/write.cgi',
].map(p=>readFile(path.join(root,p),'utf8')));
const header=()=>{
  const cells=Array(32).fill('');
  Object.assign(cells,{0:'7',1:'0',2:'alice',3:'ShopA',4:'syntheticPass',
    5:'100000',6:'0',7:'0'});
  return cells.join(',');
};
const world=({
  yesterday='1,5,3,7',today='1,2',exp='4,100',users='alice,1,bob,2',
  town='',events='',eol='\n',ending=true,shopHeader=header(),prefix='1,0:50,0:3,0',
}={})=>{
  const lines=['1700000000','100000,2,0,10,7','4,0,3',events];
  if(town!==null)lines.push(town);
  lines.push('//',shopHeader,[prefix,yesterday,today,exp,users].join(':'));
  return lines.join(eol)+(ending?eol:'');
};
const parse=opts=>parseReviewedShopHistoryWorld(world(opts));

test('B-18 pinned Core shop maps use three comma-pair colon slots',()=>{
  assert.ok(reader.includes('@DT{qw(itemyesterday itemtoday exp)}=map{{split(/,/,$_)}}@list[3,4,5];'));
  assert.ok(writer.includes('print OUT AutoVar::Get(\\$DT->{itemtoday}).":";'));
  assert.ok(writer.includes('print OUT AutoVar::Get(\\$DT->{exp}).":";'));
});
test('B-18 pinned Core lazily parses tab or comma separated user pairs',()=>{
  assert.ok(reader.includes('$list[6] ? tie($DT{user},"AutoVar",'));
  assert.ok(reader.includes('"HASH",'));
  assert.ok(reader.includes("'[\\t,]'"));
  assert.ok(reader.includes('my @array=split /$_[0]->[3]/,$_[0]->[1];'));
  assert.ok(reader.includes('sub FETCH'));
});
test('B-18 reviewed synthetic maps are explicit and ordered',()=>{
  const x=parse();
  assert.equal(x.mode,'strict one-shop Core map history');
  assert.deepEqual(x.history.itemyesterday,[{itemId:1,value:5},{itemId:3,value:7}]);
  assert.deepEqual(x.history.itemtoday,[{itemId:1,value:2}]);
  assert.deepEqual(x.history.exp,[{itemId:4,value:100}]);
  assert.equal(x.syntheticUserEntryCount,2);
  assert.deepEqual(x.shop.inventory,[3,0]);
});
test('B-18 B-17 reader remains strict despite separate B-18 model',()=>{
  assert.throws(()=>parseReviewedOneShopWorld(world()),/Unreviewed Core shop payload/);
});
test('B-18 empty optional maps and user are accepted',()=>{
  const x=parse({yesterday:'',today:'',exp:'',users:''});
  assert.deepEqual(x.history.itemyesterday,[]);
  assert.deepEqual(x.history.itemtoday,[]);
  assert.deepEqual(x.history.exp,[]);
  assert.equal(x.syntheticUserEntryCount,0);
});
test('B-18 exact delimiter can appear with no town line',()=>{
  assert.equal(parse({town:null}).shop.id,7);
});
test('B-18 last LF is optional',()=>{
  assert.equal(parse({ending:false}).history.exp[0].value,100);
});
test('B-18 hash order normalized independently of Perl hash iteration',()=>{
  assert.deepEqual(parse({yesterday:'3,7,1,5'}).history.itemyesterday,
    [{itemId:1,value:5},{itemId:3,value:7}]);
});
test('B-18 item IDs 1 and 79 with safe maximum count accepted',()=>{
  assert.deepEqual(parse({yesterday:'79,0,1,9007199254740991'}).history.itemyesterday,
    [{itemId:1,value:Number.MAX_SAFE_INTEGER},{itemId:79,value:0}]);
});
test('B-18 odd history entries are never accepted',()=>{
  for(const name of ['yesterday','today','exp'])
    for(const raw of ['1','1,2,3','1,2,3,4,5'])
      assert.throws(()=>parse({[name]:raw}),/Unpaired or excess/);
});
test('B-18 duplicate item IDs refused rather than silently overwritten',()=>{
  for(const name of ['yesterday','today','exp'])
    assert.throws(()=>parse({[name]:'1,2,1,9'}),/Duplicate/);
});
test('B-18 omitted history keys or values are refused',()=>{
  for(const name of ['yesterday','today','exp'])
    for(const raw of ['1,',',1','1,2,'])
      assert.throws(()=>parse({[name]:raw}),/Unsupported|Unpaired/);
});
test('B-18 invalid numeric history values refused',()=>{
  for(const raw of ['-1,2','0,3','80,2','1.5,3','01,3',
    '1,1e3','1,-2','1,9007199254740992','9007199254740992,2'])
    assert.throws(()=>parse({today:raw}),/Unsupported|Unsafe|Unreviewed/);
});
test('B-18 history with 80 item-key entries fails closed',()=>{
  const raw=Array.from({length:80},(_,i)=>(i+1)+',1').join(',');
  assert.throws(()=>parse({exp:raw}),/Unpaired or excess/);
});
test('B-18 tab and comma allowed in user-only fixture',()=>{
  assert.equal(parse({users:'alice\t1,bob\t2'}).syntheticUserEntryCount,2);
});
test('B-18 never returns user contents or synthetic password',()=>{
  const x=parse({users:'secretname,987654,bob,2'});
  const str=JSON.stringify(x);
  assert.equal(x.syntheticUserEntryCount,2);
  for(const secret of ['secretname','987654','syntheticPass'])
    assert.equal(str.includes(secret),false);
  assert.equal('pass' in x.shop,false);
});
test('B-18 odd user entry list refused',()=>{
  for(const users of ['alice','alice,1,bob','alice,1,bob,2,charlie'])
    assert.throws(()=>parse({users}),/Unpaired or excess user fixture/);
});
test('B-18 duplicate user key refused',()=>{
  assert.throws(()=>parse({users:'alice,1,alice,2'}),/Duplicate user fixture/);
});
test('B-18 unsafe user key refused',()=>{
  for(const users of ['__proto__,1','<script>,1','1alice,2',
    'alice/../../world,1','alice name,2',',1'])
    assert.throws(()=>parse({users}),/Unsafe synthetic user fixture key/);
});
test('B-18 malformed user values refused',()=>{
  for(const users of ['alice,-1','alice,1e4','alice,9007199254740992',
    'alice,1.5','alice,','alice,01'])
    assert.throws(()=>parse({users}),/Unsupported|Unsafe/);
});
test('B-18 user fixture cap of eight entries enforced',()=>{
  const names=['alice','bob','charlie','dave','erin','frank','grace','heidi','ivan'];
  assert.throws(()=>parse({users:names.map((n,i)=>n+','+(i+1)).join(',')}),
    /Unpaired or excess/);
});
test('B-18 event require and dynamic town still rejected',()=>{
  assert.throws(()=>parse({events:'ev,1'}),/Dynamic event require/);
  assert.throws(()=>parse({town:'city,opaque'}),/delimiter|unreviewed town/);
});
test('B-18 malformed header or inventory cannot bypass B-17 checks',()=>{
  assert.throws(()=>parse({shopHeader:header()+',extra'}),/32 source fields/);
  assert.throws(()=>parse({prefix:'1,0:50,0:-1,0'}),/Unsupported/);
});
test('B-18 unreviewed header fields cannot bypass B-17',()=>{
  const h=header().split(',');h[29]='1';
  assert.throws(()=>parse({shopHeader:h.join(',')}),/Unreviewed Core shop header/);
});
test('B-18 tabs outside user section are disallowed',()=>{
  assert.throws(()=>parse({prefix:'1,\t0:50,0:3,0'}),/control character/);
  assert.throws(()=>parse({today:'1\t2'}),/Unsupported|Unpaired or excess/);
});
test('B-18 embedded colon, CRLF, NUL or extra rows are rejected',()=>{
  assert.throws(()=>parse({users:'alice,1:bob,2'}),/seven colon/);
  assert.throws(()=>parse({eol:'\r\n'}),/CRLF/);
  assert.throws(()=>parse({users:'alice,\0'}),/control characters/);
  assert.throws(()=>parseReviewedShopHistoryWorld(world()+'\n'),
    /exactly one two-line shop/);
});
test('B-18 result maps are immutable, original fixture is unchanged',()=>{
  const original=world();const x=parseReviewedShopHistoryWorld(original);
  assert.ok(Object.isFrozen(x));
  assert.ok(Object.isFrozen(x.history));
  assert.ok(Object.isFrozen(x.history.itemyesterday[0]));
  assert.ok(Object.isFrozen(x.shop));
  assert.throws(()=>{x.history.exp[0].value=9;},TypeError);
  assert.equal(original,world());
});
test('B-18 parser does not grant authentication or live writes',()=>{
  const x=parse();
  assert.equal('authGranted' in x,false);
  assert.equal('userData' in x,false);
  assert.equal('writeAllowed' in x,false);
  assert.match(x.scope,/no AutoVar execution, auth, IO or commit/);
});
