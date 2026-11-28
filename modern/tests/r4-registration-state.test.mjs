import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {normalizeLocalSourceText} from '../src/local-source-text.mjs';
import {reviewRegistrationState,projectRegistrationState} from '../src/original-r4-registration-state.mjs';
const read=p=>normalizeLocalSourceText(readFileSync(new URL(p,import.meta.url),'utf8'));
const sources={read:read('./original-perl/inc-func.cgi'),write:read('./original-perl/write.cgi'),
  register:read('./original-perl/new.cgi'),membership:read('./original-perl/pinned-membership-user.cgi'),
  compiler:read('./original-perl/inc-makeitem.cgi'),detail:read('./original-perl/core-detail.cgi'),
  dsl:read('../../custom/inc-item-data.cgi'),rebel:read('../../custom/inc-rebel-data.cgi')};
const reviewed=reviewRegistrationState(sources);
const textFields=new Set(['name','shopname','pass','comment','remoteaddr','guild','blocklogin','nocheckip','job','rankingyesterday']);
test('R4 registration state reuses initializer and canonical next ID against actual compiled new.cgi re-registration',()=>{
  const runner=fileURLToPath(new URL('./original-perl/original-r4-shop-lifecycle-wrapper.t',import.meta.url));
  const output=execFileSync('perl',[runner],{encoding:'utf8',env:{...process.env,AKIMONO_D_REGISTRATION_WIRE_ORACLE:'1'}});
  const row=output.split('\n').find(s=>s.startsWith('# D_REGISTRATION_WIRE '));
  assert.ok(row,'actual original registration observation required');
  const p=JSON.parse(row.slice('# D_REGISTRATION_WIRE '.length));
  assert.equal(p.credentialPresent,true);
  assert.equal(Object.keys(p.scalars).length,32);
  const input={reviewed,header:p.before,shops:p.priorShops,nowSeconds:p.now,
    identity:{name:p.scalars.name,shopname:p.scalars.shopname,icon:Number(p.scalars.icon),sourceIp:p.scalars.remoteaddr}};
  const before=JSON.stringify(input);
  const got=projectRegistrationState(input);
  const expected=Object.fromEntries(Object.entries(p.scalars).map(([k,v])=>[k,textFields.has(k)?String(v):Number(v)]));
  Object.assign(expected,{status:1,point:p.point,showcase:p.showcase.map(Number),price:p.price.map(Number),
    item:p.item.map(Number),itemyesterday:{},itemtoday:{},exp:{},user:{}});
  assert.deepEqual(p.mapSizes,[0,0,0,0]);
  // new.cgi initializes this runtime-only scalar, but DataRead does not persist it.
  assert.match(sources.register,/\$DT->\{moneystock\}\s*=\s*0\s*;/);
  const fields=sources.read.match(/@DTindexnamelist=\s*qw\(([\s\S]*?)\)\s*;/)[1].trim().split(/\s+/);
  assert.equal(fields.length,32);
  assert.deepEqual(Object.keys(p.scalars).sort(),[...fields].sort());
  assert.ok(!fields.includes('moneystock'));
  const {moneystock,...persistedShop}=got.shop;
  assert.equal(moneystock,0);
  // Compare every remaining field: do not silently filter unknown extra keys.
  assert.deepEqual(persistedShop,expected);
  assert.equal(got.shop.id,p.before.nextid);
  assert.ok(got.shop.id>1,'distinct source replacement identity');
  assert.deepEqual(got.headerEffect.canonicalReloadHeader,p.reload);
  assert.equal(got.shop.item[62],1);assert.equal(got.shop.item[78],5);
  assert.equal(got.shop.pass,'');assert.equal(got.committable,false);assert.equal(got.worldStateWritten,false);
  assert.ok(Object.isFrozen(got.shop.item));
  assert.equal(JSON.stringify(input),before);
  assert.throws(()=>projectRegistrationState({...input,identity:{...input.identity,id:1}}),/registration input/);
  assert.throws(()=>projectRegistrationState({...input,identity:{...input.identity,password:'synthetic'}}),/registration input/);
  assert.throws(()=>projectRegistrationState({...input,shops:[...input.shops,{id:1,status:1,name:input.identity.name,remoteaddr:''}]}),/active owner/);
  assert.throws(()=>projectRegistrationState({...input,header:{...input.header,nextid:1}}),/canonical nextid/);
});
test('R4 registration projection first store uses trusted allocator, not local ID1 and does not grant admission',()=>{
  const got=projectRegistrationState({reviewed,header:{lasttime:50000,nextid:100,blockip:''},shops:[],
    nowSeconds:60000,identity:{name:'owner',shopname:'source shop',icon:3,sourceIp:'192.0.2.6'}});
  assert.equal(got.shop.id,100);assert.equal(got.shop.time,16800);
  assert.deepEqual(got.headerEffect.rawWrittenHeader,{lasttime:60000,nextid:100,blockip:'192.0.2.6'});
  assert.deepEqual(got.headerEffect.canonicalReloadHeader,{lasttime:60000,nextid:101,blockip:'192.0.2.6'});
  assert.equal(got.committable,false);
  assert.throws(()=>reviewRegistrationState({...sources,dsl:sources.dsl+'\n'}),/source drift/);
});
