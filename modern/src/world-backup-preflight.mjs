/**
 * B-15 strict, PURE planning gate for Standard Street world writes.
 *
 * Original source evidence:
 *   plug/write.cgi::CheckLockStatus returns when LOCKED == ''
 *   plug/write.cgi::DataWrite checks backup mtime before staging output
 *   plug/write.cgi::DataFilesBackup uses unchecked open/print/close
 *   _config.cgi BACKUP_TIME=3600 and BACKUP_FILES:
 *     log0,log1,log2,guildbal,play (GetPath appends .cgi).
 *
 * This model intentionally DOES NOT reproduce unsafe original behavior:
 * no lock ownership -> deny; uncertain ownership -> deny; missing or
 * unverified backup -> deny when backup is required.
 *
 * It only evaluates explicitly supplied observations and NEVER opens,
 * writes, checks, renames or backs up an OS file, nor guarantees fsync,
 * concurrency safety, integrity of upstream observations or durability.
 */
export const BACKUP_SOURCE_NAMES = Object.freeze([
  'log0', 'log1', 'log2', 'guildbal', 'play',
]);
export const CORE_BACKUP_INTERVAL_SECONDS = 3600;

function fail(message) { throw new Error(message); }
function safeTime(value,label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(label+' must be a nonnegative safe integer');
  }
  return value;
}
function bool(value,label) {
  if (typeof value !== 'boolean') fail(label+' must be an explicit boolean');
  return value;
}

/**
 * Source mtime condition is backupMtime < NOW_TIME - BACKUP_TIME.
 * Original Perl's undefined missing stat timestamp numerically behaves
 * like zero. We distinguish missing/unknown from a known timestamp.
 *
 * A future mtime is refused by the NEW safe subset (Core would simply skip).
 */
export function reviewWorldBackupAge({nowSeconds,backupMtimeSeconds}) {
  safeTime(nowSeconds,'nowSeconds');
  if (backupMtimeSeconds === null) {
    return Object.freeze({
      needsBackup:true, reason:'missing-or-unknown-backup-mtime',
      sourceThreshold:nowSeconds-CORE_BACKUP_INTERVAL_SECONDS,
      scope:'pure backup age decision, no stat or OS I/O',
    });
  }
  safeTime(backupMtimeSeconds,'backupMtimeSeconds');
  if (backupMtimeSeconds > nowSeconds) {
    return Object.freeze({
      needsBackup:true,reason:'future-backup-mtime-requires-review',
      sourceThreshold:nowSeconds-CORE_BACKUP_INTERVAL_SECONDS,
      scope:'pure backup age decision, no stat or OS I/O',
    });
  }
  const needsBackup=backupMtimeSeconds <
    nowSeconds - CORE_BACKUP_INTERVAL_SECONDS;
  return Object.freeze({
    needsBackup, reason: needsBackup?'backup-older-than-interval':'mtime-not-older',
    sourceThreshold:nowSeconds-CORE_BACKUP_INTERVAL_SECONDS,
    scope:'pure backup age decision, no stat or OS I/O',
  });
}

function reviewedEvidence(backups) {
  if (!Array.isArray(backups)) fail('backupEvidence must be a five-entry array');
  if (backups.length !== BACKUP_SOURCE_NAMES.length) {
    fail('backupEvidence must cover all five configured source files');
  }
  const seen=new Set();
  return Object.freeze(backups.map((record)=>{
    if (!record || typeof record !== 'object' ||
        typeof record.name !== 'string' ||
        !BACKUP_SOURCE_NAMES.includes(record.name) ||
        seen.has(record.name)) fail('Unexpected or duplicate backup source');
    seen.add(record.name);
    bool(record.sourceReadable,'sourceReadable');
    bool(record.destinationWritable,'destinationWritable');
    bool(record.copyVerified,'copyVerified');
    return Object.freeze({
      name:record.name,
      sourceReadable:record.sourceReadable,
      destinationWritable:record.destinationWritable,
      copyVerified:record.copyVerified,
    });
  }).sort((a,b)=>BACKUP_SOURCE_NAMES.indexOf(a.name)-BACKUP_SOURCE_NAMES.indexOf(b.name)));
}

/**
 * Require EXTERNAL lock ownership proof + held path + nested depth +
 * completed recovery before considering any stage write. If backup is
 * required, all five source copies must be explicitly verified.
 *
 * allowNextIsolatedStep does NOT authorize direct live filesystem writes:
 * even successful result is just a record for an isolated subsequent stage.
 */
export function reviewWorldWritePreconditions({
  ownershipVerified,ownedLockPathExists,heldDepth,recoveryComplete,
  nowSeconds,backupMtimeSeconds,backupEvidence,
}) {
  bool(ownershipVerified,'ownershipVerified');
  bool(ownedLockPathExists,'ownedLockPathExists');
  bool(recoveryComplete,'recoveryComplete');
  if (!Number.isSafeInteger(heldDepth) || heldDepth < 0) {
    throw new RangeError('heldDepth must be a nonnegative safe integer');
  }
  const age=reviewWorldBackupAge({nowSeconds,backupMtimeSeconds});
  const ownershipSafe=ownershipVerified && ownedLockPathExists &&
    heldDepth >= 1 && recoveryComplete;
  const evidence = backupEvidence===undefined ? null : reviewedEvidence(backupEvidence);
  const backupVerified= !age.needsBackup ||
    (evidence !== null && evidence.every(e=>
      e.sourceReadable && e.destinationWritable && e.copyVerified));
  let reason='preconditions-reviewed';
  if (!ownershipSafe) reason='lock-ownership-or-recovery-not-proven';
  else if (age.reason==='future-backup-mtime-requires-review')
    reason='future-backup-mtime-requires-review';
  else if (!backupVerified) reason='required-backup-not-verified';
  const allowNextIsolatedStep=ownershipSafe && backupVerified &&
    age.reason!=='future-backup-mtime-requires-review';
  return Object.freeze({
    allowNextIsolatedStep, reason,
    lockSafe:ownershipSafe,
    needsBackup:age.needsBackup, backupVerified,
    backupAgeReason:age.reason,
    sourceBackupNames:BACKUP_SOURCE_NAMES,
    reviewedBackupEvidence:evidence,
    scope:'pure, conservative pre-write review; NO FS IO, lock or durability',
  });
}
