/**
 * Frozen period.cgi BACKUP + expired-session tail, source-reviewed.
 *
 * Projects the exact three-generation rename/copy sequence and the
 * stat(mtime) session expiry selection from an isolated Perl source probe.
 * No actual production filesystem IO or durable GameCore CAS is authorized.
 */
export const R4_PERIOD_BACKUP_SOURCE='r4-frozen-period-backup-rotation-and-session-expiry';
const fail=s=>{throw new RangeError('R4 original period backup: '+s);};
const files=Object.freeze(['log0','log1','log2','guildbal','play']);
const safe=x=>Number.isSafeInteger(x)&&x>=0;
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const copy=x=>({...x});
function requireFiles(value,optional=false){
  if(optional&&value===null)return;
  if(!plain(value)||Object.keys(value).sort().join(',')!==
       [...files].sort().join(',')||
     files.some(k=>typeof value[k]!=='string'||value[k].length>4096))
    fail('exact five original backup files with UTF-8 content required');
}
function freezeAll(x){
  if(x&&typeof x==='object'&&!Object.isFrozen(x)){
    for(const y of Object.values(x))freezeAll(y);
    Object.freeze(x);
  }
  return x;
}
export function reviewR4PeriodBackupTail({periodSource,configSource}){
  if(typeof periodSource!=='string'||typeof configSource!=='string')
    fail('frozen period/config required');
  for(const marker of [
    '$BACKUP\\s*=\\s*3\\s*;',
    '$EXPIRE_TIME\\s*=\\s*3600\\*24\\*7\\s*;',
    '\\$LOG_FILE\\.\'0\'',
    '\\$LOG_FILE\\.\'1\'',
    '\\$LOG_FILE\\.\'2\'',
    '\\$GUILDBAL_FILE',
    '\\$DATA_FILE',
  ])if(!new RegExp(marker).test(configSource))
    fail('original three generations, five files or expiry drift '+marker);
  const start=periodSource.indexOf('#データバックアップ');
  const end=periodSource.indexOf('\n1;',start);
  if(start<0||end<start)fail('original backup/session phase unavailable');
  const source=periodSource.slice(start,end);
  const ordered=[
    'mkdir($BACKUP_DIR.$BACKUP,$DIR_PERMISSION)',
    'rename($BACKUP_DIR.$BACKUP,$BACKUP_DIR."_work");',
    'foreach my $count (reverse(1..$BACKUP-1))',
    'rename($BACKUP_DIR.$count,$BACKUP_DIR.($count+1));',
    'rename($BACKUP_DIR."_work",$BACKUP_DIR."1");',
    'foreach my $filetype (@BACKUP_FILES)',
    'open(IN,"<:encoding(UTF-8)",GetPath($filetype));',
    'open(OUT,">:encoding(UTF-8)",GetPath($BACKUP_DIR."1",$filetype));',
    'while(<IN>){print OUT $_;}',
    '#無効なセッションデータ(期限切れ)を削除',
    'opendir(SESS,$SESSION_DIR);',
    'my $sessiontimeout=$NOW_TIME-$EXPIRE_TIME;',
    'foreach(map{"$SESSION_DIR/$_"}grep(/^.+\\.cgi$/,@dir))',
    'unlink $_ if (stat($_))[9]<$sessiontimeout;',
    'MakeGuildFile();',
  ];
  let position=-1;
  for(const marker of ordered){
    const i=source.indexOf(marker,position+1);
    if(i<=position)fail('original disk backup phase or call order drift '+marker);
    position=i;
  }
  return freezeAll({
    source:R4_PERIOD_BACKUP_SOURCE,committable:false,
    actualFileIOCommitted:false,
    backupGenerations:3,expireSeconds:604800,
    files:[...files],makeGuildFileCallRecorded:true,
    scope:'frozen period.cgi full backup/session tail executed in Perl temporary filesystem; no real guild generation, live backup, atomic storage or period commit',
  });
}
export function projectR4PeriodBackupTail({
  reviewed,nowSeconds,activeFiles,backupGenerations,sessionFiles,
}){
  if(reviewed?.source!==R4_PERIOD_BACKUP_SOURCE||
     reviewed.committable!==false||
     reviewed.actualFileIOCommitted!==false||
     reviewed.backupGenerations!==3||reviewed.expireSeconds!==604800||
     JSON.stringify(reviewed.files)!==JSON.stringify(files))
    fail('source-reviewed original backup tail required');
  if(!safe(nowSeconds)||!Array.isArray(backupGenerations)||
     backupGenerations.length!==3||!Array.isArray(sessionFiles)||
     sessionFiles.length>50)
    fail('source-backed period timestamp and disk input required');
  requireFiles(activeFiles);
  for(const stage of backupGenerations)requireFiles(stage,true);
  const names=new Set();
  for(const entry of sessionFiles){
    if(!plain(entry)||typeof entry.name!=='string'||!entry.name||
       entry.name.length>128||/[/\\]/.test(entry.name)||
       !safe(entry.modifiedSeconds)||names.has(entry.name))
      fail('distinct safe original session name and stat mtime required');
    names.add(entry.name);
  }
  const cutoff=nowSeconds-604800;
  const expired=sessionFiles.filter(e=>
    /^.+\.cgi$/.test(e.name)&&e.modifiedSeconds<cutoff);
  // backup3 <- backup2; backup2 <- backup1; backup1 <- copied originals.
  // Original backup3 is discarded after rotation; missing generation
  // directories are first mkdir'd and rotate as empty directories.
  return freezeAll({
    source:reviewed.source,committable:false,
    backupGenerations:[
      copy(activeFiles),
      backupGenerations[0]===null?null:copy(backupGenerations[0]),
      backupGenerations[1]===null?null:copy(backupGenerations[1]),
    ],
    deletedSessions:expired.map(e=>e.name),
    remainingSessions:sessionFiles.filter(e=>!expired.includes(e))
      .map(e=>({...e})),
    makeGuildFileCalls:1,
    actualGuildFileWritten:false,
    actualFileIOCommitted:false,
    cutoffSeconds:cutoff,
    scope:reviewed.scope,
  });
}
