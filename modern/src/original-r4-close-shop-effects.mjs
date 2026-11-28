/**
 * R4 original write.cgi::CloseShop *actual* source mutation and session
 * deletion effect, separate from period.cgi's absent-owner trigger.
 *
 * SetUserData and WriteErrorLog have external implementations; source
 * probes intercept those calls and capture the actual archive payload,
 * without inventing a disk transaction. This remains noncommittable.
 * Legacy hash wire serialization is deterministic only for <=1 key.
 * The full-commerce oracle opt-in accepts an exact observed native order
 * for each map; it grants no caller-selected runtime serialization or CAS.
 */
import {execFileSync} from 'node:child_process';
export const R4_CLOSE_SHOP_EFFECT_SOURCE='r4-original-write-cgi-CloseShop-source-effects';
const fail=s=>{throw new RangeError('R4 original CloseShop effects: '+s);};
const safe=n=>Number.isSafeInteger(n)&&n>=0;
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const fullCommerceReviews=new WeakSet();
const archiveMaps=['itemyesterday','itemtoday','exp','user'];
function immutable(x){
  if(x&&typeof x==='object'&&!Object.isFrozen(x)){
    for(const value of Object.values(x))immutable(value);
    Object.freeze(x);
  }
  return x;
}
export function reviewR4CloseShopEffects({writeSource,readSource,configSource},{fullCommerce=false}={}){
  if(typeof fullCommerce!=='boolean')fail('explicit full commerce archive review');
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
  if(archiveFields.length!==32||
     archiveFields[0]!=='id'||archiveFields[1]!=='lastlogin'||
     archiveFields.at(-1)!=='icon'||archiveFields.at(-2)!=='job')
    fail('source ordered shop archive index drift');
  if(!/\$LOG_DELETESHOP_FILE\s*=\s*'delete';/.test(configSource)||
     !/\$SUBDATA_DIR\s*=\s*\$DATA_DIR\.'\/subdata';/.test(configSource))
    fail('original delete archive or session directory config drift');
  const review=immutable({
    source:R4_CLOSE_SHOP_EFFECT_SOURCE,committable:false,
    archiveFile:'delete',archiveFields,
    ...(fullCommerce?{fullCommerceArchive:true}:{}),
    actualCloseShopSource:true,
    externalUserOrArchiveIOCommitted:false,
    scope:'frozen write.cgi CloseShop status/money/rank, archive payload and exact session deletion selection with real Perl probe; SetUserData/WriteErrorLog external IO recorded only, no WorldState CAS',
  });
  if(fullCommerce)fullCommerceReviews.add(review);
  return review;
}
/**
 * Projects effects of executing the actual source sub CloseShop, but never
 * mutates an input nor deletes an actual disk file. Actual source Perl
 * probe performs its session unlink inside an isolated temporary directory.
 */
export function projectR4CloseShopEffects({
  reviewed,shopId,shop=null,sessionFileNames=[],
  reason='経営者不在',archiveHashOrders=null,
}){
  if(reviewed?.source!==R4_CLOSE_SHOP_EFFECT_SOURCE||
     reviewed.committable!==false||
     reviewed.actualCloseShopSource!==true||
     reviewed.externalUserOrArchiveIOCommitted!==false||
     reviewed.archiveFile!=='delete'||
     !Array.isArray(reviewed.archiveFields)||
     reviewed.archiveFields.length!==32)
    fail('source-reviewed original write.cgi CloseShop required');
  const fullCommerce=fullCommerceReviews.has(reviewed);
  if(Boolean(reviewed.fullCommerceArchive)!==fullCommerce||
     (!fullCommerce&&archiveHashOrders!==null))
    fail('source-reviewed full commerce archive order required');
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
     !safe(shop.status)||!(fullCommerce?Number.isSafeInteger(shop.money):safe(shop.money))||!safe(shop.rank)||
     !['showcase','price','item'].every(k=>
       Array.isArray(shop[k])&&shop[k].every(x=>typeof x==='string'||safe(x)))||
     !archiveMaps.every(k=>
       plain(shop[k])&&Object.keys(shop[k]).length<=(fullCommerce?79:1)&&
       Object.entries(shop[k]).every(([key,value])=>
         !key.includes(',')&&!key.includes(':')&&
         (typeof value==='string'||safe(value))))||
     reviewed.archiveFields.some(k=>shop[k]!==undefined&&
       typeof shop[k]!=='string'&&
       !(k==='costtoday'&&typeof shop[k]==='number'&&
         Number.isFinite(shop[k]))&&
       !Number.isSafeInteger(shop[k])))
    fail('exact original shop archive arrays and bounded hash serialization');
  if(fullCommerce){
    if(!safe(shop.showcasecount)||shop.showcasecount<1||shop.showcasecount>8||
       shop.showcase.length!==shop.showcasecount||shop.price.length!==shop.showcasecount||
       shop.item.length!==79||!shop.item.every(safe)||
       !shop.showcase.every(x=>safe(x)&&x<=79)||!shop.price.every(safe)||
       !plain(archiveHashOrders)||Object.keys(archiveHashOrders).length!==archiveMaps.length||
       archiveMaps.some(k=>{
         const keys=Object.keys(shop[k]),order=archiveHashOrders[k];
         return !Array.isArray(order)||order.length!==keys.length||new Set(order).size!==keys.length||
           order.some(id=>typeof id!=='string'||!Object.hasOwn(shop[k],id))||
           keys.some(id=>k==='user'?(!id||/[\r\n\t,:]/.test(id)||typeof shop[k][id]!=='string'||/[\r\n\t,:]/.test(shop[k][id])):
             !/^[1-9]\d*$/.test(id)||Number(id)>79||!safe(shop[k][id]));
       }))fail('exact full commerce archive map order and shelf shape required');
  }
  // Original CloseShop joins numeric Perl NV scalars. JS Number.toString
  // uses a different round-trip precision for fractional upkeep; do not
  // serialize that value with the JS formatter in the full archive path.
  let costWire=null;
  if(fullCommerce&&typeof shop.costtoday==='number'&&!Number.isInteger(shop.costtoday)){
    try{
      const env={...process.env};
      for(const k of ['PERL5OPT','PERL5LIB','PERLLIB','PERL_LOCAL_LIB_ROOT','PERL_MB_OPT','PERL_MM_OPT','PERL_HASH_SEED_DEBUG','PERL_UNICODE'])delete env[k];
      costWire=execFileSync('perl',['-e','print 0+$ARGV[0]','--',String(shop.costtoday)],{
        encoding:'utf8',env,timeout:3000,maxBuffer:256,stdio:['pipe','pipe','pipe'],
      });
    }catch{fail('native original fractional archive scalar unavailable')}
    if(!/^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(costWire)||!Number.isFinite(Number(costWire)))
      fail('invalid native original fractional archive scalar');
  }
  const archiveScalar=reviewed.archiveFields.map(k=>k==='costtoday'&&costWire!==null?costWire:String(shop[k]??'')).join(',');
  const serial=k=>(fullCommerce?archiveHashOrders[k].flatMap(id=>[id,shop[k][id]]):Object.entries(shop[k]).flat()).join(',');
  const archiveParts=[
    shop.showcase.join(','),shop.price.join(','),shop.item.join(','),
    serial('itemyesterday'),serial('itemtoday'),
    serial('exp'),serial('user'),
  ];
  const content=[reason,archiveScalar,archiveParts.join(':')].join('\n');
  const deletedSessions=sessionFileNames.filter(name=>
    new RegExp('^'+shopId+'-.+\\.cgi$').test(name));
  return immutable({
    source:reviewed.source,committable:false,closed:true,
    shop:{...(fullCommerce?structuredClone(shop):shop),status:0,money:0,rank:0},
    archived:content,
    setUserDataCalls:[{shopId}],
    writeErrorLogCalls:[{file:'delete',content}],
    deletedSessions,
    remainingSessions:sessionFileNames.filter(x=>!deletedSessions.includes(x)),
    scope:reviewed.scope,
  });
}


export const R4_CLOSED_STORE_PRUNE_SOURCE=
  'r4-frozen-SortDT-and-DataWrite-closed-shop-omission';
/**
 * After the *real* CloseShop changes status=0, frozen SortDT drops the
 * inactive store and its id/name index. Frozen DataWrite also skips
 * status=0 stores. This is a source REVIEW and memory projection only;
 * it does NOT invoke DataWrite, commit external files, or delete user data.
 */
export function reviewR4ClosedShopPrune({
  detailSource,writeSource,reviewedClose,
}){
  if(reviewedClose?.source!==R4_CLOSE_SHOP_EFFECT_SOURCE||
     reviewedClose.committable!==false||
     reviewedClose.externalUserOrArchiveIOCommitted!==false||
     typeof detailSource!=='string'||typeof writeSource!=='string')
    fail('uncommittable full original CloseShop and SortDT source required');
  const start=detailSource.indexOf('sub SortDT\n{');
  const stop=detailSource.indexOf('\n}\n\nsub GetRankMessage',start);
  const code=start<0||stop<=start?'':detailSource.slice(start,stop);
  const markers=[
    '@DT=grep($_->{status},@DT);',
    'foreach(@DT){$_->{point}=GetDTPoint($_);}',
    '@DT=sort{(!$a->{rankingyesterday})<=>(!$b->{rankingyesterday}) or $b->{point}<=>$a->{point}}@DT;',
    '%id2idx  =map{($DT[$_]->{id},$_)}(0..$#DT);',
    '%name2idx=map{($DT[$_]->{name},$_)}(0..$#DT);',
  ];
  let last=-1;
  for(const marker of markers){
    const i=code.indexOf(marker,last+1);
    if(i<=last)fail('original SortDT closed shop pruning source drift '+marker);
    last=i;
  }
  const dataStart=writeSource.indexOf('sub DataWrite\n{');
  const dataEnd=writeSource.indexOf('\n}\n\nsub DataFilesBackup',dataStart);
  const data=dataStart<0||dataEnd<=dataStart?'':writeSource.slice(dataStart,dataEnd);
  if(!data.includes('for($cnt=0; $cnt<=$#DT; $cnt++)')||
     !data.includes('next if !$DT->{status};')||
     data.indexOf('next if !$DT->{status};')<
       data.indexOf('for($cnt=0; $cnt<=$#DT; $cnt++)'))
    fail('original DataWrite inactive shop filter source drift');
  return immutable({
    source:R4_CLOSED_STORE_PRUNE_SOURCE,committable:false,
    closeSource:R4_CLOSE_SHOP_EFFECT_SOURCE,
    actualDataWriteInvoked:false,
    scope:'true frozen SortDT status=0 removal + frozen DataWrite inactive-filter review after CloseShop; no actual save, backup, disk commit or original SetUserData',
  });
}
export function projectR4ClosedShopPrune({reviewed,closeEffect}){
  if(reviewed?.source!==R4_CLOSED_STORE_PRUNE_SOURCE||
     reviewed.committable!==false||
     reviewed.actualDataWriteInvoked!==false||
     reviewed.closeSource!==R4_CLOSE_SHOP_EFFECT_SOURCE||
     closeEffect?.source!==R4_CLOSE_SHOP_EFFECT_SOURCE||
     closeEffect.committable!==false||
     closeEffect.closed!==true||
     closeEffect.shop?.status!==0)
    fail('source-reviewed closed shop result and SortDT exclusion required');
  return immutable({
    source:reviewed.source,committable:false,
    activeShops:[],idToIndex:{},nameToIndex:{},
    dataWriteActiveShopRows:[],
    actualDataWriteInvoked:false,
    scope:reviewed.scope,
  });
}
