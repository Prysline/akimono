/**
 * R4 CloseShop archive sink in an isolated test-only directory.
 * A genuine OS append/rotation, not a WorldState transaction or safe
 * substitute for original unguarded logging. Input is the exact result of
 * the existing B-50-compatible CloseShop source projector.
 */
import {createHash} from 'node:crypto';
import {realpath, stat,lstat,rename,appendFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {R4_CLOSE_SHOP_EFFECT_SOURCE} from './original-r4-close-shop-effects.mjs';

export const R4_CLOSE_ARCHIVE_SOURCE='r4-frozen-WriteErrorLog-delete-cgi-file-sandbox';
const PINNED = Object.freeze({
  error:'16b619dffd91a3b67095177b7da464de264f1aa3',
  user:'46fe3b13e68ee83997aa919125ab210372af2822',
});
const fail=msg=>{throw new RangeError('R4 original close archive: '+msg);};
const blob=text=>createHash('sha1').update(
  'blob '+Buffer.byteLength(text,'utf8')+'\0'
).update(text,'utf8').digest('hex');

const archiveReviews=new WeakSet();
export function reviewR4CloseShopArchiveSource({errorSource,userSource}) {
  if(typeof errorSource!=='string'||blob(errorSource)!==PINNED.error ||
     typeof userSource!=='string'||blob(userSource)!==PINNED.user)
    fail('frozen original user/error source blob SHA drift');
  if(!userSource.includes('sub SetUserData\n{\n\t#') ||
     !errorSource.includes('open(ERR,">>:encoding(UTF-8)","$fn") or return;') ||
     !errorSource.includes('if (stat($fn))[7]>$LOG_SIZE_MAX;')) {
    fail('frozen user no-op and error logging behavior changed');
  }
  const reviewed=Object.freeze({
    source:R4_CLOSE_ARCHIVE_SOURCE,committable:false,
    logMaxBytes:30000,file:'delete.cgi',
    setUserDataIsNoop:true,
    actualSandboxLogIO:true,
  });
  archiveReviews.add(reviewed);return reviewed;
}
function validateEffect(reviewed,effect) {
  if(reviewed?.source!==R4_CLOSE_ARCHIVE_SOURCE ||
     reviewed.committable!==false||reviewed.logMaxBytes!==30000||
     reviewed.setUserDataIsNoop!==true||
     effect?.source!==R4_CLOSE_SHOP_EFFECT_SOURCE ||
     effect.committable!==false||effect.closed!==true||
     effect.writeErrorLogCalls?.length!==1 ||
     effect.writeErrorLogCalls[0].file!=='delete' ||
     effect.writeErrorLogCalls[0].content!==effect.archived)
    fail('reviewed noncommittable CloseShop archive effect required');
}
async function sandboxRoot(directory) {
  if(typeof directory!=='string')fail('explicit sandbox directory required');
  const root=await realpath(directory);
  if(path.dirname(root)!==await realpath(os.tmpdir())||
     !['akimono-r4-archive-','akimono-r4-period-disk-'].some(p=>path.basename(root).startsWith(p)))
    fail('only a fresh isolated temporary sandbox is supported');
  return root;
}
function ctx(value,label) {
  if(typeof value!=='string'||/[\r\n\t]/.test(value))fail(label+' explicit safe TSV string required');
  return value;
}

/** Append and optionally rotate real log bytes; errors propagate, no success receipt on failure. */
export async function appendR4CloseShopArchiveSandbox({
  reviewed,effect,sandboxDirectory,
  nowSeconds,scriptName,remoteAddress,remoteHost,trueIp,user,
}) {
  validateEffect(reviewed,effect);
  if(!Number.isSafeInteger(nowSeconds)||nowSeconds<1)fail('source timestamp required');
  const root=await sandboxRoot(sandboxDirectory);
  const logDir=path.join(root,'log');
  const live=path.join(logDir,'delete.cgi');
  const old=path.join(logDir,'delete-old.cgi');
  if(!(await lstat(logDir)).isDirectory())fail('real log directory required');
  for(const p of [live,old]){try{if(!(await lstat(p)).isFile())fail('regular log file required')}catch(e){if(e.code!=='ENOENT')throw e}}
  let rotated=false;
  let size=0;
  try {size=(await stat(live)).size;}
  catch(e){if(e.code!=='ENOENT')throw e;}
  if(size>reviewed.logMaxBytes){
    await rename(live,old);
    rotated=true;
  }
  const row=archiveRow({effect,nowSeconds,scriptName,remoteAddress,remoteHost,trueIp,user});
  await appendFile(live,row,{encoding:'utf8'});
  return Object.freeze({
    source:reviewed.source,archiveFile:'delete.cgi',
    bytesAppended:Buffer.byteLength(row),rotated,
    committable:false,worldStateWritten:false,
  });
}

function archiveRow({effect,nowSeconds,scriptName,remoteAddress,remoteHost,trueIp,user}){
  if(!Number.isSafeInteger(nowSeconds)||nowSeconds<1)fail('source timestamp required');
  return [
    String(nowSeconds),
    ctx(scriptName,'SCRIPT_NAME'),
    ctx(remoteAddress,'REMOTE_ADDR'),
    ctx(remoteHost,'REMOTE_HOST'),
    ctx(trueIp,'GetTrueIP'),
    ctx(user,'USER'),
    effect.archived,
  ].join('\t')+'\n';
 }
/** Pure immutable generation projection. The owner of the local CAS publishes
 * these bytes together with play and log files; no external append occurs. */
export function projectR4CloseShopArchiveGeneration({reviewed,effect,previous=null,previousOld=null,nowSeconds,...context}){
  if(!archiveReviews.has(reviewed))fail('pinned archive review required');
  validateEffect(reviewed,effect);
  for(const entry of [previous,previousOld])if(entry!==null&&(!entry||typeof entry.bytes!=='string'||!Number.isSafeInteger(entry.mtime)||entry.mtime<0||entry.mtime>nowSeconds))fail('prior archive entry required');
  if(previousOld!==null&&previous===null)fail('old archive requires current archive');
  const row=archiveRow({effect,nowSeconds,...context});
  const rotated=previous!==null&&Buffer.byteLength(previous.bytes)>reviewed.logMaxBytes;
  return {live:{bytes:(rotated?'':previous?.bytes??'')+row,mtime:nowSeconds},old:rotated?{...previous}:previousOld,rotated};
}
