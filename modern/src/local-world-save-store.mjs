import {reviewedHistoryLineageCompatible,MAX_REVIEWED_HISTORY_WIRE_BYTES} from './reviewed-world-time-history.mjs';
import {validateCommittedOwnerCredentials} from './r4-owner-credential-record.mjs';
import {isReviewedHistoryCheckpointStore} from './reviewed-history-checkpoint-store.mjs';
/**
 * B-43 local-only WorldState durable saves.
 * Two independent, hashed and fsync'd generations. A failed/torn write never
 * replaces both recovery copies. NOT original Perl save-file compatibility,
 * authentication, a cross-process database, or multiwriter coordination.
 */
import fs,{constants as c} from 'node:fs';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {validateMemoryWorld,encodeMemorySnapshot,decodeMemorySnapshot,
  } from './game-core-contract.mjs';
export const LOCAL_SAVE_FORMAT='akimono.local-world-save.v2';
const MAX_BYTES=2200000;
const slotNames=['world-a.json','world-b.json'];
const accountStores=new WeakSet();
export const isAccountLocalWorldSaveStore=store=>accountStores.has(store);
const fail=message=>{throw new RangeError('B-43 local save: '+message);};
/** The account slot may already contain the successor. This is NOT a
 * transaction rejection or permission to retry. Fence the entire live
 * account authority; recover from authenticated disk with a new instance. */
export class AccountPublicationUncertainError extends Error{
  constructor(attemptedGeneration,attemptedRevision){
    super('Account publication outcome uncertain; recover authenticated generation before serving requests');
    this.name='AccountPublicationUncertainError';
    this.code='ACCOUNT_PUBLICATION_UNCERTAIN';
    this.attemptedGeneration=attemptedGeneration;
    this.attemptedRevision=attemptedRevision;
  }
}
function safeInt(value,label,min=0){
  if(!Number.isSafeInteger(value)||value<min)fail(label);
  return value;
}
const digest=text=>createHash('sha256').update(text,'utf8').digest('hex');
const recordDigest=(generation,world,proof,credentials=null)=>digest(JSON.stringify(credentials===null?
  [LOCAL_SAVE_FORMAT,generation,world,proof]:[LOCAL_SAVE_FORMAT,'account-save.v1',generation,world,proof,credentials]));
function verifiedCheckpoint(raw,historyReplay,proof,generation){
  if(!proof||!['fresh','checkpoint'].includes(proof.anchorKind))fail('新版存檔必須有完整來源歷史；舊開發存檔不支援遷移');
  const world=validateMemoryWorld(raw);
  const verified=historyReplay.verify({world,proof,generation});
  if(encodeMemorySnapshot(verified)!==encodeMemorySnapshot(world))fail('source history returned a different world');
  return world;
}
function sourceFile(dir,name){
  return path.join(dir,name);
}
function ensureFolder(dir){
  fs.mkdirSync(dir,{recursive:true,mode:0o700});
  const st=fs.lstatSync(dir);
  if(!st.isDirectory()||st.isSymbolicLink())
    fail('save directory must be a real directory');
}
function readSlot(dir,slot,historyReplay,verifiedSlots,reuseVerifiedReplay=false,accountMode=false){
  const name=sourceFile(dir,slotNames[slot]);
  let fd;
  try{
    const before=fs.lstatSync(name);
    if(!before.isFile()||before.nlink!==1)fail('save slot is not a bounded regular file');
    fd=fs.openSync(name,c.O_RDONLY|(c.O_NOFOLLOW??0)|(c.O_NONBLOCK??0));
    const st=fs.fstatSync(fd);
    if(!st.isFile()||st.nlink!==1||st.dev!==before.dev||st.ino!==before.ino||st.size>MAX_BYTES||st.size<16||
       (accountMode&&process.platform!=='win32'&&(st.mode&0o077)!==0))
      fail('save slot is not a bounded regular file');
    const serialized=fs.readFileSync(fd,'utf8');
    if(Buffer.byteLength(serialized,'utf8')>MAX_BYTES)
      fail('save record too long');
    const record=JSON.parse(serialized);
    if(record?.format==='akimono.local-world-save.v1')fail('舊開發存檔 v1 已淘汰；不自動遷移或覆寫');
    // Never let a misconfigured legacy reader silently overwrite or reset
    // recognizable account generations, or import a legacy slot into account mode.
    if(record?.format===LOCAL_SAVE_FORMAT&&Object.hasOwn(record,'ownerCredentials')!==accountMode)
      fail('account save mode mismatch');
    const hasProof=record!==null&&typeof record==='object'&&
      Object.hasOwn(record,'careerProof');
    const hasAuth=hasProof&&Object.hasOwn(record,'checkpointAuth');
    const privateWire=accountMode?record?.ownerCredentials:null;
    if(!hasProof||record===null||typeof record!=='object'||Array.isArray(record)||
       Object.keys(record).sort().join(',')!==
         (accountMode?'careerProof,checkpointAuth,format,generation,ownerCredentials,sha256,world':
          (hasProof?(hasAuth?'careerProof,checkpointAuth,format,generation,sha256,world':'careerProof,format,generation,sha256,world'):'format,generation,sha256,world'))||
       record.format!==LOCAL_SAVE_FORMAT||
       !Number.isSafeInteger(record.generation)||record.generation<1||
       (record.generation%2)!==slot||
       typeof record.sha256!=='string'||!/^[0-9a-f]{64}$/.test(record.sha256)||
       typeof record.world!=='string'||record.world.length>2000000)
      fail('invalid save record schema or generation');
    const proofText=hasProof?record.careerProof:null;
    if(hasProof&&(typeof proofText!=='string'||Buffer.byteLength(proofText,'utf8')>MAX_REVIEWED_HISTORY_WIRE_BYTES))
      fail('invalid career proof wire');
    if(accountMode&&(typeof privateWire!=='string'||Buffer.byteLength(privateWire,'utf8')>MAX_BYTES))
      fail('invalid private account wire');
    if(recordDigest(record.generation,record.world,proofText,privateWire)!==record.sha256)
      fail('save content hash mismatch');
    const proof=hasProof?JSON.parse(proofText):null;
    if(hasProof&&(proof===null||JSON.stringify(proof)!==proofText))
      fail('non-canonical career history');
    if(hasAuth!==(accountMode||proof?.anchorKind==='checkpoint'))fail('checkpoint envelope authentication required');
    if(hasAuth){
      if(!historyReplay?.checkpointStore)fail('checkpoint key verifier unavailable');
      if(accountMode)historyReplay.checkpointStore.verifyAccountRecord(record);
      else historyReplay.checkpointStore.verifyRecord(record);
    }
    // Only status() may reuse an exact, previously replayed envelope.
    // Key, full retained lineage and materialized files are still checked on
    // every read. load/save/clear always run the actual source replayer.
    const prior=verifiedSlots[slot];
    const hit=reuseVerifiedReplay&&prior?.serialized===serialized;
    if(hit&&proof?.anchorKind==='checkpoint')historyReplay.checkpointStore.verifyChain(proof,record.generation);
    const world=hit?prior.world:verifiedCheckpoint(decodeMemorySnapshot(record.world),
      historyReplay,proof,record.generation);
    if(historyReplay?.periodDiskStore)historyReplay.periodDiskStore.verify(world);
    // Canonical encoding prevents duplicate-key and scalar wire ambiguity.
    if(encodeMemorySnapshot(world)!==record.world)
      fail('non-canonical WorldState JSON');
    let ownerCredentials=null;
    if(accountMode){
      ownerCredentials=validateCommittedOwnerCredentials({world,records:JSON.parse(privateWire)});
      if(JSON.stringify(ownerCredentials)!==privateWire)fail('non-canonical private account wire');
    }
    verifiedSlots[slot]={serialized,world};
    return {kind:'ok',slot,generation:record.generation,world,proof,ownerCredentials};
  }catch(error){
    verifiedSlots[slot]=null;
    if(fd===undefined&&error?.code==='ENOENT')return {kind:'missing',slot};
    return {kind:'corrupt',slot,reason:error.message};
  }finally{
    if(fd!==undefined)fs.closeSync(fd);
  }
}
export function createLocalWorldSaveStore({directory,historyReplay,accountMode=false}){
  if(typeof directory!=='string'||!directory.trim())fail('save directory');
  if(typeof historyReplay?.verify!=='function'||!historyReplay.checkpointStore)fail('source history verifier and checkpoint store required');
  if(typeof accountMode!=='boolean'||(accountMode&&!isReviewedHistoryCheckpointStore(historyReplay.checkpointStore)))
    fail('trusted account save authority required');
  const compatible=(older,newer)=>reviewedHistoryLineageCompatible(older,newer,historyReplay.checkpointStore)&&
    (!accountMode||older.world.revision!==newer.world.revision||
      (encodeMemorySnapshot(older.world)===encodeMemorySnapshot(newer.world)&&
       JSON.stringify(older.ownerCredentials)===JSON.stringify(newer.ownerCredentials)));
  const dir=path.resolve(directory);
  // Bounded to the two physical slots. Not an authorization cache.
  const verifiedSlots=[null,null];
  // A post-rename error cannot establish that the previous generation is
  // still authoritative. No reads (including auth), preflight or writes on
  // this instance until the owner stops serving and reconstructs authority.
  let uncertain=null;
  function assertAccountPublicationCertain(){
    if(uncertain)throw new AccountPublicationUncertainError(uncertain.generation,uncertain.revision);
  }
  function scan(reuseVerifiedReplay=false){
    assertAccountPublicationCertain();
    if(fs.existsSync(dir)){
      const st=fs.lstatSync(dir);
      if(!st.isDirectory()||st.isSymbolicLink())fail('save path is not a real directory');
      if(accountMode&&process.platform!=='win32'&&(st.mode&0o077)!==0)fail('account save directory is not private');
    }
    const rows=[readSlot(dir,0,historyReplay,verifiedSlots,reuseVerifiedReplay,accountMode),
      readSlot(dir,1,historyReplay,verifiedSlots,reuseVerifiedReplay,accountMode)];
    const valid=rows.filter(x=>x.kind==='ok')
      .sort((a,b)=>b.generation-a.generation);
    const corrupt=rows.filter(x=>x.kind==='corrupt');
    // A newer checksum-valid slot must not drop or replace a still-valid
    // older career history. Preserve the older source checkpoint instead.
    if(valid.length===2&&!compatible(valid[1],valid[0])){
      const rejected=valid.shift();
      corrupt.push({kind:'corrupt',slot:rejected.slot,reason:'career lineage mismatch'});
    }
    const modeMismatch=corrupt.some(row=>row.reason==='B-43 local save: account save mode mismatch');
    const latest=modeMismatch?null:valid[0]??null;
    return {latest,corrupt,modeMismatch};
  }
  function status(){
    const {latest,corrupt}=scan(true);
    return Object.freeze({
      available:Boolean(latest),generation:latest?.generation??0,
      recoveryWarning:corrupt.length>0,
      unreadable:!latest&&corrupt.length>0,
      format:LOCAL_SAVE_FORMAT,
      obsoleteDevelopmentSave:corrupt.some(row=>row.reason?.includes('舊開發存檔 v1')),

    });
  }
  function load(){
    const {latest,corrupt}=scan();
    if(!latest)fail(corrupt.length?
      (corrupt.some(row=>row.reason?.includes('舊開發存檔 v1'))?'舊開發存檔 v1 已淘汰；請使用獨立存檔目錄或明確重置':'存檔損毀，沒有可驗證的備援世代（拒絕偽造世界）'):
      '沒有可載入的存檔');
    return Object.freeze({
      world:latest.world,generation:latest.generation,
      recovered:corrupt.length>0,
      ...(latest.proof===null?{}:{careerProof:latest.proof}),
    });
  }
  // Private reader for the existing committed-credential authenticator.
  // Public load/status/receipt deliberately remain unchanged.
  function loadCommittedAccountState(){
    if(!accountMode)fail('account persistence disabled');
    const {latest}=scan();
    if(!latest)fail('no authenticated account generation');
    return Object.freeze({world:latest.world,ownerCredentials:latest.ownerCredentials,
      generation:latest.generation,careerProof:structuredClone(latest.proof)});
  }
  function loadCommittedSnapshot(){
    const {world,ownerCredentials}=loadCommittedAccountState();
    return Object.freeze({world,ownerCredentials});
  }
  function prepareRecord(world,{generation,careerProof=null,ownerCredentials,signAccount=false}){
    safeInt(generation,'next save generation',1);
    if(!careerProof||!['fresh','checkpoint'].includes(careerProof.anchorKind))fail('新版存檔必須有完整來源歷史');
    const encoded=encodeMemorySnapshot(world);
    const proofText=careerProof===null?null:JSON.stringify(careerProof);
    if(proofText!==null&&Buffer.byteLength(proofText,'utf8')>MAX_REVIEWED_HISTORY_WIRE_BYTES)fail('career history too large');
    if(!accountMode&&ownerCredentials!==undefined)fail('private account persistence disabled');
    const records=accountMode?validateCommittedOwnerCredentials({world,records:ownerCredentials}):null;
    const privateWire=records===null?null:JSON.stringify(records);
    const envelope={format:LOCAL_SAVE_FORMAT,generation,
      sha256:recordDigest(generation,encoded,proofText,privateWire),world:encoded,
      ...(proofText===null?{}:{careerProof:proofText}),
      ...(accountMode?{ownerCredentials:privateWire}:{})};
    if(accountMode){
      if(careerProof.anchorKind==='checkpoint')historyReplay.checkpointStore.verifyChain(careerProof,generation);
      // Preflight checks bounds without creating a signing key or a slot.
      envelope.checkpointAuth=signAccount?historyReplay.checkpointStore.accountRecordAuth(envelope,{create:generation===1}):'0'.repeat(64);
    }else if(careerProof?.anchorKind==='checkpoint'){
      if(!historyReplay?.checkpointStore)fail('checkpoint authenticator unavailable');
      historyReplay.checkpointStore.verifyChain(careerProof,generation);
      envelope.checkpointAuth=historyReplay.checkpointStore.recordAuth(envelope);
    }
    const record=JSON.stringify(envelope)+'\n';
    if(encoded.length>2000000||Buffer.byteLength(record)>MAX_BYTES)fail('save too large');
    return {encoded,proofText,record,privateWire,records};
  }
  function preflight(world,{expectedGeneration,careerProof=null,ownerCredentials}){
    assertAccountPublicationCertain();
    safeInt(expectedGeneration,'expected save generation');
    prepareRecord(world,{generation:expectedGeneration+1,careerProof,ownerCredentials});
    historyReplay?.periodDiskStore?.stage(world);
    return true;
  }
  function save(raw,{expectedGeneration,careerProof=null,ownerCredentials}){
    assertAccountPublicationCertain();
    safeInt(expectedGeneration,'expected save generation');
    const world=verifiedCheckpoint(raw,historyReplay,careerProof,expectedGeneration+1);
    const before=scan();
    if(!before.latest&&before.corrupt.length)
      fail('all existing save records are invalid; refusing overwrite');
    const previous=before.latest;
    const generation=previous?.generation??0;
    if(expectedGeneration!==generation)
      fail('存檔世代衝突，請先重新載入，不能覆寫其他更新');
    if(previous&&previous.world.worldId!==world.worldId)
      fail('已存在不同世界存檔，禁止用新世界覆寫');
    if(previous&&previous.world.revision>world.revision)
      fail('不能以較舊的 WorldState 覆寫新版存檔');
    const nextRecords=accountMode?validateCommittedOwnerCredentials({world,records:ownerCredentials}):null;
    if(previous&&!compatible(previous,{world,proof:careerProof,ownerCredentials:nextRecords}))
      fail(accountMode?'career history prefix, private account revision or legacy anchor mismatch':'career history prefix or legacy anchor mismatch');
    const nextGen=safeInt(generation+1,'next save generation',1);
    const {encoded,proofText,record,privateWire}=prepareRecord(world,{generation:nextGen,careerProof,ownerCredentials:accountMode?nextRecords:ownerCredentials,signAccount:true});
    ensureFolder(dir);
    historyReplay?.periodDiskStore?.stage(world);
    const slot=nextGen%2;
    const dest=sourceFile(dir,slotNames[slot]);
    const temp=sourceFile(dir,'.world-'+randomUUID()+'.tmp');
    let renamed=false;
    try{
      let fd;
      try{
        fd=fs.openSync(temp,c.O_CREAT|c.O_EXCL|c.O_WRONLY|(c.O_NOFOLLOW??0),0o600);
        fs.writeFileSync(fd,record,'utf8');
        fs.fsyncSync(fd);
        fs.closeSync(fd);fd=undefined;
        // Atomic on the same local filesystem; previous generation remains.
        fs.renameSync(temp,dest);
        renamed=true;
        // Windows does not support fsync on directory handles. The save
        // file itself was fsync'd before atomic rename; directory durability
        // is best-effort on Windows rather than falsely reporting a failure.
        if(process.platform!=='win32'){
          const folderFd=fs.openSync(dir,c.O_RDONLY);
          try{fs.fsyncSync(folderFd);}finally{fs.closeSync(folderFd);}
        }
      }finally{
        if(fd!==undefined)fs.closeSync(fd);
        try{fs.unlinkSync(temp);}catch(error){if(error.code!=='ENOENT')throw error;}
      }
      const checked=scan();
      if(checked.latest?.generation!==nextGen||
         encodeMemorySnapshot(checked.latest.world)!==encoded||
         (checked.latest.proof===null?null:JSON.stringify(checked.latest.proof))!==proofText||
         (accountMode&&JSON.stringify(checked.latest.ownerCredentials)!==privateWire))
        fail('post-save integrity re-read failed');
      return Object.freeze({generation:nextGen,revision:world.revision});
    }catch(error){
      // The successful rename is the point after which ordinary rejection
      // is unsafe, even when a later authenticated re-read sees the old slot.
      // Do not roll back by deleting/rewriting either recovery generation.
      // No raw filesystem/replay error (possibly containing private data) is
      // exposed in the typed uncertainty outcome.
      if(accountMode&&renamed){
        uncertain={generation:nextGen,revision:world.revision};
        verifiedSlots.fill(null);
        assertAccountPublicationCertain();
      }
      throw error;
    }
  }
  // Local test-only deletion. Never remove the save directory: it can be
  // configured by AKIMONO_SAVE_DIR and may contain unrelated user files.
  function clear({expectedGeneration}){
    if(accountMode)fail('account generations cannot use local reset');
    safeInt(expectedGeneration,'expected save generation');
    const {latest,modeMismatch}=scan();
    if(modeMismatch)fail('account save mode mismatch; local reset refused');
    if(expectedGeneration!==(latest?.generation??0))
      fail('存檔世代衝突，請重新整理頁面後再確認重置');
    // Preflight BOTH slots before changing anything. Refuse symlinks,
    // directories and special files even if their JSON appears corrupted.
    const removable=[];
    for(const name of slotNames){
      const filename=sourceFile(dir,name);
      let st;
      try{st=fs.lstatSync(filename);}
      catch(error){
        if(error?.code==='ENOENT')continue;
        throw error;
      }
      if(!st.isFile()||st.isSymbolicLink())
        fail('拒絕刪除非一般檔案的存檔槽位：'+name);
      removable.push(filename);
    }
    for(const filename of removable)fs.unlinkSync(filename);
    // Best-effort directory durability on Windows, consistent with save().
    if(removable.length&&process.platform!=='win32'){
      const folderFd=fs.openSync(dir,c.O_RDONLY);
      try{fs.fsyncSync(folderFd);}finally{fs.closeSync(folderFd);}
    }
    const after=scan();
    if(after.latest||after.corrupt.length)
      fail('重置後仍偵測到存檔，請檢查磁碟檔案');
    return Object.freeze({
      deletedSlots:Object.freeze(removable.map(filename=>path.basename(filename))),
      generation:0,
    });
  }
  const api=Object.freeze({status,load,save,clear,preflight,...(accountMode?{loadCommittedSnapshot,loadCommittedAccountState}:{})});
  if(accountMode)accountStores.add(api);
  return api;
}
