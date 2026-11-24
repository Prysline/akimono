/**
 * R4 staged play.cgi bytes: exact, deliberately narrow frozen DataWrite wire.
 * This is a TEST-SANDBOX file writer, NOT a period settlement transaction.
 * The caller must not pass these bytes to WorldState/CAS or B-43.
 *
 * All four source files are Git-blob pinned. Perl hash iteration order is
 * unknown, so this codec refuses maps containing more than one entry.
 */
import {createHash} from 'node:crypto';
import {writeFile, rename, unlink, mkdir, realpath, readdir, stat} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

export const R4_DATA_WRITE_SOURCE = 'r4-frozen-DataWrite-play-cgi-single-active-shop-sandbox';
const PINNED = Object.freeze({
  write: '203f33b37511e838800a45b84183af98fcf46e4c',
  incFunc: 'e7a8add7b0291901e71fe797783b664dff1568a0',
  detail: '9a83d26fb29edee4032958f1e6de837a250f3384',
  config: '87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0',
});
const fail = message => { throw new RangeError('R4 frozen DataWrite: ' + message); };
const gitBlob = content => createHash('sha1').update(
  'blob ' + Buffer.byteLength(content, 'utf8') + '\0'
).update(content, 'utf8').digest('hex');

export function reviewR4DataWriteFiles({writeSource,incFuncSource,detailSource,configSource}) {
  for (const [name,source] of [
    ['write',writeSource],['incFunc',incFuncSource],
    ['detail',detailSource],['config',configSource],
  ]) if (typeof source !== 'string' || gitBlob(source) !== PINNED[name]) {
    fail('frozen source SHA drift: ' + name);
  }
  const index = /@DTindexnamelist=\s*qw\s*\(([^)]*)\)/.exec(incFuncSource);
  const state = /@STATEnamelist=\s*qw\s*\(([^)]*)\)/.exec(incFuncSource);
  if (!index || !state) fail('source index schema absent');
  const shopFields = index[1].trim().split(/\s+/);
  const stateFields = state[1].trim().split(/\s+/);
  if (shopFields.length !== 32 || stateFields.length !== 11 ||
      !writeSource.includes('SortDT();') ||
      !writeSource.includes('next if !$DT->{status};') ||
      !writeSource.includes('AutoVar::Get(\\$DT->{item})') ||
      !writeSource.includes('DataFilesBackup() if') ||
      !detailSource.includes('@DT=grep($_->{status},@DT);') ||
      !configSource.includes("$DATA_FILE\t\t='play';")) {
    fail('DataWrite schema or ordering drift');
  }
  return Object.freeze({
    source:R4_DATA_WRITE_SOURCE, committable:false,
    actualFileIOCommitted:false, file:'play.cgi',
    shopFields:Object.freeze(shopFields),
    stateFields:Object.freeze(stateFields),
    scope:'one active shop, optional inactive row, up to one hash entry per map, exact staged UTF-8; no lock, guild, backup, CAS or production commit',
  });
}
const checked = reviewed => {
  if (reviewed?.source !== R4_DATA_WRITE_SOURCE ||
      reviewed.committable !== false ||
      reviewed.actualFileIOCommitted !== false ||
      reviewed.shopFields?.length !== 32 ||
      reviewed.stateFields?.length !== 11) fail('source-reviewed noncommittable schema required');
};
const scalar = (value,label) => {
  if (!((typeof value === 'string') ||
        (typeof value === 'number' && Number.isSafeInteger(value)))) {
    fail(label + ' must be explicit string/safe integer');
  }
  const str=String(value);
  if (/[\r\n,\t:]/u.test(str)) fail(label+' contains an unreviewed delimiter');
  return str;
};
const integer = (value,label,min=0) => {
  // Frozen DataRead splits CSV into decimal strings, while first-period
  // in-memory computations may keep real Perl integers. Accept only exact
  // canonical nonnegative decimal spelling; reject floats and coercion.
  const n=typeof value==='string' && /^(?:0|[1-9][0-9]*)$/.test(value)
    ? Number(value) : value;
  if (!Number.isSafeInteger(n) || n < min) fail(label+' must be a safe integer');
  return n;
};
const arrayWire = (a,label,size) => {
  if (!Array.isArray(a) || (size !== undefined && a.length !== size)) {
    fail(label + ' exact source array size required');
  }
  return a.map((v,i)=>scalar(v,label+'['+i+']')).join(',');
};
const mapWire = (value,label) => {
  if (!value || Object.getPrototypeOf(value)!==Object.prototype ||
      Object.keys(value).length > 1) fail(label+' only supports zero/one-key source map');
  return Object.entries(value).map(([k,v])=>[
    scalar(k,label+'.key'),scalar(v,label+'.value'),
  ].join(',')).join(',');
};
const allFields = (obj,fields,label) => {
  if (!obj || typeof obj!=='object' || Array.isArray(obj)) fail(label+' required');
  return fields.map(field=>{
    if (!Object.hasOwn(obj,field)) fail(label+'.'+field+' missing');
    return scalar(obj[field],label+'.'+field);
  }).join(',');
};

/** Source bytes for the supported 1-active-shop subset; no disk or CAS effects. */
export function serializeR4DataWrite({reviewed,world}) {
  checked(reviewed);
  if (!world || typeof world!=='object') fail('world snapshot required');
  integer(world.lasttime,'lasttime',1);
  integer(world.people,'people');
  integer(world.nextid,'nextid',1);
  integer(world.taxRate,'taxRate');
  const active = [];
  if (!Array.isArray(world.shops) || world.shops.length<1 ||
      world.shops.length>2) fail('one shop plus optional closed shop required');
  for (const [i,shop] of world.shops.entries()) {
    integer(shop?.status,'shop status');
    integer(shop?.id,'shop id',1);
    if (![0,1].includes(shop.status)) fail('unreviewed shop status');
    if (shop.status===1) active.push(shop);
    if (shop.status===0 && i===0) fail('closed-only source row not supported');
  }
  if (active.length!==1 || world.shops[0]!==active[0]) {
    fail('exactly one leading active shop required; no source hash/order shortcut');
  }
  const dt = active[0];
  if (integer(dt.foundation,'foundation',1)<1 ||
      integer(dt.money,'money')>1000000000) {
    fail('money cap/foundation mutation branch must be separately reviewed');
  }
  if (dt.showcase?.length !== 1 || dt.price?.length !== 1) {
    fail('one showcase/price required');
  }
  if (world.wholesale?.length !== 79 || dt.item?.length !== 79) {
    fail('79 source ITEM entries required');
  }
  const lines = [
    String(world.lasttime),
    [world.people,world.nextid,scalar(world.blockip,'blockip'),world.taxRate,
      allFields(world.state,reviewed.stateFields,'state').replaceAll(',',':')].join(','),
    arrayWire(world.wholesale,'wholesale',79),
    mapWire(world.events,'events'),
    mapWire(world.town,'town'),
    '//',
    allFields(dt,reviewed.shopFields,'shop'),
    [
      arrayWire(dt.showcase,'showcase',1),
      arrayWire(dt.price,'price',1),
      arrayWire(dt.item,'item',79),
      mapWire(dt.itemyesterday,'itemyesterday'),
      mapWire(dt.itemtoday,'itemtoday'),
      mapWire(dt.exp,'exp'),
      mapWire(dt.user,'user'),
    ].join(':'),
  ];
  return lines.join('\n') + '\n';
}

/**
 * Deliberately restricted OS writer used only inside fresh File::Temp-style
 * sandboxes. Creates a real staged play.cgi, never claims durable gameplay.
 */
async function sandboxRoot(dir) {
  if (typeof dir!=='string') fail('sandboxDirectory required');
  const root=await realpath(dir);
  if (path.dirname(root)!==await realpath(os.tmpdir()) ||
      !path.basename(root).startsWith('akimono-r4-dw-')) {
    fail('only isolated mkdtemp test directories are permitted');
  }
  return root;
}
export async function stageR4DataWriteSandbox({reviewed,world,sandboxDirectory}) {
  const bytes=serializeR4DataWrite({reviewed,world});
  const root=await sandboxRoot(sandboxDirectory);
  const temp=path.join(root,'temp');
  await mkdir(temp,{recursive:true});
  await writeFile(path.join(temp,'play.cgi'),bytes,{encoding:'utf8',flag:'wx'});
  return Object.freeze({staged:true,committable:false,byteLength:Buffer.byteLength(bytes)});
}

/**
 * B-13-inspired *single-file sandbox* commit/recovery. No real game lock,
 * no multi-file atomicity and no fsync guarantee. Filesystem errors propagate.
 * A failed rename retains the marker/staged bytes for explicit recovery.
 */
export async function commitR4DataWriteSandbox({
  reviewed,sandboxDirectory,abort=false,
}) {
  checked(reviewed);
  if (typeof abort!=='boolean') fail('abort must be boolean');
  const root=await sandboxRoot(sandboxDirectory);
  const stage=path.join(root,'temp','play.cgi');
  const live=path.join(root,'play.cgi');
  const marker=path.join(root,'commit.cgi');
  const pending=(await readdir(path.join(root,'temp'))).filter(x=>x.endsWith('.cgi'));
  if (pending.some(x=>x!=='play.cgi')) fail('unreviewed staged files');
  let markerExists=false;
  try { markerExists=(await stat(marker)).isFile(); } catch(e) {
    if(e.code!=='ENOENT') throw e;
  }
  if (pending.length===0) {
    if (markerExists) fail('stale commit marker needs separate recovery evidence');
    return Object.freeze({mode:'no-staged-files',committable:false});
  }
  if (abort && !markerExists) {
    await unlink(stage);
    return Object.freeze({mode:'discard',committable:false});
  }
  if (!abort && !markerExists) await writeFile(marker,'',{flag:'wx'});
  await rename(stage,live);
  await unlink(marker);
  return Object.freeze({mode:abort?'recover':'commit',committable:false});
}
