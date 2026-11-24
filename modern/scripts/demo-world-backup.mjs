/**
 * B-15 original Core backup/lock preflight demo.
 * Strict source-backed decision ONLY; no filesystem reads/writes,
 * backup copies, locks, commit, or CGI.
 */
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  BACKUP_SOURCE_NAMES,reviewWorldWritePreconditions,
} from '../src/world-backup-preflight.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const config=await readFile(path.join(root,'_config.cgi'),'utf8');
if (!/\$BACKUP_TIME\s*=\s*3600\s*;/.test(config) ||
    !/@BACKUP_FILES\s*=\s*\(/.test(config) ||
    !/\$LOCK_FILE\s*=\s*'lockfile'\s*;/.test(config)) {
  throw new Error('Actual Standard Street backup/lock configuration changed');
}
const allBackups=()=>BACKUP_SOURCE_NAMES.map(name=>({
  name,sourceReadable:true,destinationWritable:true,copyVerified:true,
}));
const base={
  ownershipVerified:true,ownedLockPathExists:true,heldDepth:1,
  recoveryComplete:true,nowSeconds:10000,backupMtimeSeconds:0,
  backupEvidence:allBackups(),
};
const missingSource=allBackups();
missingSource.find(v=>v.name==='log1').sourceReadable=false;
const missingCopy=allBackups();
missingCopy.find(v=>v.name==='play').copyVerified=false;
const scenarios=[
  {name:'complete verified lock and all five copies',args:base},
  {name:'original CheckLockStatus would allow empty LOCKED; safe review denies',
    args:{...base,ownershipVerified:false}},
  {name:'owned lock disappeared',args:{...base,ownedLockPathExists:false}},
  {name:'incomplete marker recovery',args:{...base,recoveryComplete:false}},
  {name:'missing log1 backup source',args:{...base,backupEvidence:missingSource}},
  {name:'unverified play backup',args:{...base,backupEvidence:missingCopy}},
  {name:'fresh backup mtime, still requires verified lock',
    args:{...base,backupMtimeSeconds:9999,backupEvidence:undefined}},
  {name:'future mtime cannot be trusted',
    args:{...base,backupMtimeSeconds:10001}},
];
const records=scenarios.map(s=>({
  scenario:s.name,decision:reviewWorldWritePreconditions(s.args),
}));
console.log(JSON.stringify({
  mode:'strict Core-inspired world preflight, observations only; NO filesystem IO',
  source:'frozen plug/write.cgi, Standard Street _config.cgi',
  sourceBackupFiles:BACKUP_SOURCE_NAMES,
  records,
  caution:[
    'Original Core checks an owned lock path only when LOCKED is nonempty.',
    'Original DataFilesBackup does not check open/print/close success.',
    'An unverified or missing backup should not authorize new writes.',
    'Even an allowed isolated next step is not atomic, fsync, or durable commit.',
    'All scenarios are synthetic; no live game files or backup directories used.',
  ],
},null,2));
