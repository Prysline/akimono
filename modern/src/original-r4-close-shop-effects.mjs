/**
 * R4 original write.cgi::CloseShop *actual* source mutation and session
 * deletion effect, separate from period.cgi's absent-owner trigger.
 *
 * SetUserData and WriteErrorLog have external implementations; source
 * probes intercept those calls and capture the actual archive payload,
 * without inventing a disk transaction. This remains noncommittable.
 * Hash wire serialization is only deterministic for <=1 key/field here;
 * multi-key Perl hash order MUST fail closed.
 */
export const R4_CLOSE_SHOP_EFFECT_SOURCE='r4-original-write-cgi-CloseShop-source-effects';
const fail=s=>{throw new RangeError('R4 original CloseShop effects: '+s);};
const safe=n=>Number.isSafeInteger(n)&&n>=0;
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function immutable(x){
  if(x&&typeof x==='object'&&!Object.isFrozen(x)){
    for(const value of Object.values(x))immutable(value);
    Object.freeze(x);
  }
  return x;
}
export function reviewR4CloseShopEffects({writeSource,readSource,configSource}){
  if(typeof writeSource!=='string'||typeof readSource!=='string'||
     typeof configSource!=='string')
    fail('frozen original write/read/config sources required');
  const from=writeSource.indexOf('sub CloseShop\n{');
  const to=writeSource.indexOf('\n}\n\n1;',from);
  if(from<0||to<=from)fail('frozen write.cgi original CloseShop moved');
  const block=writeSource.slice(from,to);
  const marks=[
    'return if !defined($id2idx{$id});',
    'my $idx=$id2idx{$id};',
    'my $DT=$DT[$idx];',
    'SetUserData($DT);',
    'join(",",map{$DT->{$_}}@DTindexnamelist)',
    'join(",",@{$DT->{showcase}})',
    'join(",",@{$DT->{price}})',
    'join(",",@{$DT->{item}})',
    'join(",",%{$DT->{itemyesterday}})',
    'join(",",%{$DT->{itemtoday}})',
    'join(",",%{$DT->{exp}})',
    'join(",",%{$DT->{user}})',
    'WriteErrorLog($dtdata,$LOG_DELETESHOP_FILE);',
    '$DT->{status}=0;',
    '$DT->{money}=0;',
    '$DT->{rank}=0;',
    'opendir(SESS,$SUBDATA_DIR);',
    'my @dir=readdir(SESS);',
    'closedir(SESS);',
    'foreach(map{"$SUBDATA_DIR/$_"}grep(/^$DT->{id}\\-.+\\.cgi$/,@dir))',
    'unlink $_;',
  ];
  let last=-1;
  for(const marker of marks){
    const pos=block.indexOf(marker,last+1);
    if(pos<=last)fail('original CloseShop ordered source drift '+marker);
    last=pos;
  }
  const indexMatch=readSource.match(/@DTindexnamelist=\s*qw\(([\s\S]*?)\)\s*;/);
  if(!indexMatch)fail('original ordered shop archive index fields unavailable');
  const archiveFields=indexMatch[1].trim().split(/\s+/);
  if(archiveFields.length!==31||
     archiveFields[0]!=='id'||archiveFields[1]!=='lastlogin'||
     archiveFields.at(-1)!=='icon'||archiveFields.at(-2)!=='job')
    fail('source ordered shop archive index drift');
  if(!/\$LOG_DELETESHOP_FILE\s*=\s*'delete';/.test(configSource)||
     !/\$SUBDATA_DIR\s*=\s*\$DATA_DIR\.'\/subdata';/.test(configSource))
    fail('original delete archive or session directory config drift');
  return immutable({
    source:R4_CLOSE_SHOP_EFFECT_SOURCE,committable:false,
    archiveFile:'delete',archiveFields,
    actualCloseShopSource:true,
    externalUserOrArchiveIOCommitted:false,
    scope:'frozen write.cgi CloseShop status/money/rank, archive payload and exact session deletion selection with real Perl probe; SetUserData/WriteErrorLog external IO recorded only, no WorldState CAS',
  });
}
/**
 * Projects effects of executing the actual source sub CloseShop, but never
 * mutates an input nor deletes an actual disk file. Actual source Perl
 * probe performs its session unlink inside an isolated temporary directory.
 */
export function projectR4CloseShopEffects({
  reviewed,shopId,shop=null,sessionFileNames=[],
  reason='経営者不在',
}){
  if(reviewed?.source!==R4_CLOSE_SHOP_EFFECT_SOURCE||
     reviewed.committable!==false||
     reviewed.actualCloseShopSource!==true||
     reviewed.externalUserOrArchiveIOCommitted!==false||
     reviewed.archiveFile!=='delete'||
     !Array.isArray(reviewed.archiveFields)||
     reviewed.archiveFields.length!==31)
    fail('source-reviewed original write.cgi CloseShop required');
  if(!safe(shopId)||shopId===0||
     typeof reason!=='string'||!reason||reason.includes('\n')||
     !Array.isArray(sessionFileNames)||sessionFileNames.length>100||
     sessionFileNames.some(x=>typeof x!=='string'||!x||
       x.includes('/')||x.includes('\\')||x==='.'||x==='..'||x.length>180)||
     new Set(sessionFileNames).size!==sessionFileNames.length)
    fail('original CloseShop id, reason and session names required');
  if(shop===null)return immutable({
    source:reviewed.source,committable:false,closed:false,shop:null,
    archived:null,setUserDataCalls:[],writeErrorLogCalls:[],
    deletedSessions:[],remainingSessions:[...sessionFileNames],
    scope:reviewed.scope,
  });
  if(!plain(shop)||!safe(shop.id)||shop.id!==shopId||
     !safe(shop.status)||!safe(shop.money)||!safe(shop.rank)||
     !['showcase','price','item'].every(k=>
       Array.isArray(shop[k])&&shop[k].every(x=>typeof x==='string'||safe(x)))||
     !['itemyesterday','itemtoday','exp','user'].every(k=>
       plain(shop[k])&&Object.keys(shop[k]).length<=1&&
       Object.entries(shop[k]).every(([key,value])=>
         !key.includes(',')&&!key.includes(':')&&
         (typeof value==='string'||safe(value))))||
     reviewed.archiveFields.some(k=>shop[k]!==undefined&&
       typeof shop[k]!=='string'&&
       !Number.isSafeInteger(shop[k])))
    fail('exact original shop archive arrays and bounded hash serialization');
  const archiveScalar=reviewed.archiveFields.map(k=>String(shop[k]??'')).join(',');
  const serial=x=>Object.entries(x).flat().join(',');
  const archiveParts=[
    shop.showcase.join(','),shop.price.join(','),shop.item.join(','),
    serial(shop.itemyesterday),serial(shop.itemtoday),
    serial(shop.exp),serial(shop.user),
  ];
  const content=[reason,archiveScalar,archiveParts.join(':')].join('\n');
  const deletedSessions=sessionFileNames.filter(name=>
    new RegExp('^'+shopId+'-.+\\.cgi$').test(name));
  return immutable({
    source:reviewed.source,committable:false,closed:true,
    shop:{...shop,status:0,money:0,rank:0},
    archived:content,
    setUserDataCalls:[{shopId}],
    writeErrorLogCalls:[{file:'delete',content}],
    deletedSessions,
    remainingSessions:sessionFileNames.filter(x=>!deletedSessions.includes(x)),
    scope:reviewed.scope,
  });
}
