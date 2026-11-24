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
  PERIOD_WORLD_SCHEMA} from './game-core-contract.mjs';
import {validateOriginalPeriodSeed}
  from './original-period-world-seed.mjs';
import {B59_IRON_SOURCE,isReviewedB59EventPeriod}
  from './original-b59-iron-event-lifecycle.mjs';
import {B60_HAPPY_SOURCE,isReviewedB60HappyPeriod}
  from './original-b60-happy-event-nowfunc.mjs';
import {B61_SWORD_SOURCE,isReviewedB61SwordPeriod}
  from './original-b61-sword-demand-event.mjs';
import {validateSourceSparseMarket}
  from './original-admin-world-bootstrap.mjs';
import {isSourceShowcasePercentPrice}
  from './shared-showcase-price.mjs';

import {reviewedHistoryLineageCompatible,MAX_REVIEWED_HISTORY_WIRE_BYTES} from './reviewed-world-time-history.mjs';
export const LOCAL_SAVE_FORMAT='akimono.local-world-save.v1';
const MAX_BYTES=2200000;
const slotNames=['world-a.json','world-b.json'];
const fail=message=>{throw new RangeError('B-43 local save: '+message);};
function safeInt(value,label,min=0){
  if(!Number.isSafeInteger(value)||value<min)fail(label);
  return value;
}
function sourceRegistryRule(registry,index){
  const r=registry?.getRule?.(index+1);
  return r?.itemId===index+1&&r?.shopIndex===index&&
    r?.wholesaleIndex===index&&Number.isSafeInteger(r.stockLimit)&&
    r.stockLimit>0&&Number.isSafeInteger(r.unitPrice)&&r.unitPrice>0?
    r:null;
}
function reviewedPlayableWorld(raw,marketBuyRegistry=null,useItem=null){
  const w=validateMemoryWorld(raw);
  // Local save is a structural checkpoint, not an EVENT compiler. Only
  // the source-reviewed single active iron EVENT may extend the original
  // seed envelope; all unknown/multiple/invalid instances still fail.
  if(w.schema===PERIOD_WORLD_SCHEMA&&
     !validateOriginalPeriodSeed(w.period)&&
     !isReviewedB59EventPeriod({
       period:w.period,nowSeconds:w.nowSeconds,
       reviewed:{source:B59_IRON_SOURCE},
     })&&
     !isReviewedB60HappyPeriod({
       period:w.period,nowSeconds:w.nowSeconds,
       reviewed:{source:B60_HAPPY_SOURCE},
     })&&
     !isReviewedB61SwordPeriod({
       period:w.period,nowSeconds:w.nowSeconds,
       reviewed:{source:B61_SWORD_SOURCE},
     }))
    fail('unreviewed or settled v2 city/period source state');
  if(w.streetId!=='standard-street'||w.events!==null||w.shops.length>1||
     !validateSourceSparseMarket(w.market))
    fail('only source-initialized single-shop Standard Street world is loadable');
  if(w.shops.length){
    const shop=w.shops[0];
    // R2-E opt-in source-certified gift exchange: original starting grant 5
    // minus exactly 2 per successful #79 USE. Unreviewed snapshots do NOT
    // get permissive voucher inventory just by supplying a JSON array.
    const gift=useItem?.getRule?.(79,0);
    const reviewedGift=gift?.supported===true&&gift.itemId===79&&
      gift.useId===0&&gift.money===0&&gift.time===1800&&
      gift.uses?.length===1&&gift.uses[0].itemId===79&&
      gift.uses[0].countPerUse===2&&
      gift.uses[0].probabilityPermille===1000&&
      gift.creates?.length===3&&
      gift.creates.map(row=>row.itemId).join(',')==='12,9,14'&&
      gift.creates.every(row=>row.countPerUse===1&&
        row.probabilityPermille===1000)&&
      !gift.beforeCallback&&!gift.afterCallback;
    const giftSpent=(5-shop.item?.[78])/2;
    const giftInventoryValid=shop.item?.[78]===5||
      Boolean(reviewedGift&&Number.isSafeInteger(giftSpent)&&
        giftSpent>=1&&giftSpent<=2&&
        // #9/#12 maps are not consumed by either reviewed USE.
        shop.item[8]>=giftSpent&&shop.item[11]>=giftSpent);
    // B-43 default remains unchanged. Only a supplied SOURCE-COMPILED
    // Registry may authorize additional item inventories and showcases.
    // Never accept arbitrary 79-slot extra stock merely because it is JSON.
    const extraStockValid=(index,count)=>{
      const r=sourceRegistryRule(marketBuyRegistry,index);
      return r!==null&&count<=r.stockLimit;
    };
    const extraShowcaseValid=()=>{
      const id=shop.showcase?.[0];
      const r=Number.isSafeInteger(id)&&id>0?
        sourceRegistryRule(marketBuyRegistry,id-1):null;
      return r!==null&&shop.item[id-1]>0&&shop.price?.[0]===r.unitPrice;
    };
    if(shop.id!==1||shop.status!==1||
       !Array.isArray(shop.item)||shop.item.length!==79||
       shop.item.some(n=>!Number.isSafeInteger(n)||n<0)||
       shop.item[62]!==1||!giftInventoryValid||
       shop.item.some((n,i)=>!
         [9,10,13,39,40,41,42,43,62,78].includes(i)&&
         n!==0&&!extraStockValid(i,n))||
       shop.item[13]>3||shop.item[39]>600||
       [500,300,100,75].some((limit,i)=>shop.item[40+i]>limit)||
       (shop.exp!==undefined&&(
         shop.exp===null||typeof shop.exp!=='object'||
         Array.isArray(shop.exp)||
         Object.keys(shop.exp).length!==1||
         shop.exp['14']!==20))||
       shop.item[10]>50||
       (![0,10,40,41,42,43,44].includes(shop.showcase?.[0])&&
         !extraShowcaseValid())||
       shop.showcase?.length!==1||shop.price?.length!==1||
       ([10,40,41,42,43,44].includes(shop.showcase[0])&&
          !isSourceShowcasePercentPrice({
            10:5000,40:1200,41:1500,42:3200,43:8000,44:12000,
          }[shop.showcase[0]],shop.price[0]))||
       (shop.showcase[0]===0&&shop.price[0]!==0)||
       !Number.isSafeInteger(shop.money)||shop.money<0||
       !Number.isSafeInteger(shop.paytoday)||shop.paytoday<0||
       !Number.isSafeInteger(shop.saletoday)||shop.saletoday<0||
       !Number.isFinite(shop.costtoday)||shop.costtoday<0||
       !Number.isSafeInteger(shop.rank)||shop.rank<0||shop.rank>10000||
       !Number.isSafeInteger(shop.time)||!Number.isSafeInteger(shop.item[9])||
       shop.item[9]>20||
       !['itemtoday','itemyesterday'].every(field=>{
         const m=shop[field];
         return m!==null&&typeof m==='object'&&!Array.isArray(m)&&
           Object.keys(m).every(k=>['10','40','41','42','43','44'].includes(k)&&
             Number.isSafeInteger(m[k])&&m[k]>=0);
       }))
      fail('saved shop is outside reviewed source #10/#40-44 world');
  }
  return w;
}
const digest=text=>createHash('sha256').update(text,'utf8').digest('hex');
function sourceFile(dir,name){
  return path.join(dir,name);
}
function ensureFolder(dir){
  fs.mkdirSync(dir,{recursive:true,mode:0o700});
  const st=fs.lstatSync(dir);
  if(!st.isDirectory()||st.isSymbolicLink())
    fail('save directory must be a real directory');
}
function verifiedCheckpoint(raw,marketBuyRegistry,useItem,historyReplay,proof,generation=null){
  if(proof===null){
    if(historyReplay?.requireProof===true)fail('source command history required in reviewed time mode');
    return reviewedPlayableWorld(raw,marketBuyRegistry,useItem);
  }
  if(typeof historyReplay?.verify!=='function')fail('source history verifier unavailable');
  const world=validateMemoryWorld(raw);
  const verified=historyReplay.verify({world,proof,generation});
  if(encodeMemorySnapshot(verified)!==encodeMemorySnapshot(world))fail('source history returned a different world');
  return world;
}
const recordDigest=(world,proofText)=>digest(proofText===null?world:JSON.stringify([world,proofText]));
function readSlot(dir,slot,marketBuyRegistry,useItem,historyReplay){
  const name=sourceFile(dir,slotNames[slot]);
  let fd;
  try{
    fd=fs.openSync(name,c.O_RDONLY|(c.O_NOFOLLOW??0));
    const st=fs.fstatSync(fd);
    if(!st.isFile()||st.size>MAX_BYTES||st.size<16)
      fail('save slot is not a bounded regular file');
    const serialized=fs.readFileSync(fd,'utf8');
    if(Buffer.byteLength(serialized,'utf8')>MAX_BYTES)
      fail('save record too long');
    const record=JSON.parse(serialized);
    const hasProof=record!==null&&typeof record==='object'&&Object.hasOwn(record,'careerProof');
    const hasAuth=hasProof&&Object.hasOwn(record,'checkpointAuth');
    if(record===null||typeof record!=='object'||Array.isArray(record)||
       Object.keys(record).sort().join(',')!==(hasProof?
         (hasAuth?'careerProof,checkpointAuth,format,generation,sha256,world':'careerProof,format,generation,sha256,world'):'format,generation,sha256,world')||
       record.format!==LOCAL_SAVE_FORMAT||
       !Number.isSafeInteger(record.generation)||record.generation<1||
       (record.generation%2)!==slot||
       typeof record.sha256!=='string'||!/^[0-9a-f]{64}$/.test(record.sha256)||
       typeof record.world!=='string'||record.world.length>2000000)
      fail('invalid save record schema or generation');
    const proofText=hasProof?record.careerProof:null;
    if(hasProof&&(typeof proofText!=='string'||Buffer.byteLength(proofText,'utf8')>MAX_REVIEWED_HISTORY_WIRE_BYTES))
      fail('invalid bounded source history wire');
    if(recordDigest(record.world,proofText)!==record.sha256)fail('save content hash mismatch');
    const proof=hasProof?JSON.parse(proofText):null;
    if(hasProof&&(!proof||JSON.stringify(proof)!==proofText))fail('noncanonical source history');
    if(hasAuth!==(proof?.anchorKind==='checkpoint'))fail('checkpoint envelope authentication required');
    if(hasAuth){
      if(!historyReplay?.checkpointStore)fail('checkpoint key verifier unavailable');
      historyReplay.checkpointStore.verifyRecord(record);
    }
    const world=verifiedCheckpoint(decodeMemorySnapshot(record.world),
      marketBuyRegistry,useItem,historyReplay,proof,record.generation);
    // Canonical encoding prevents duplicate-key and scalar wire ambiguity.
    if(encodeMemorySnapshot(world)!==record.world)
      fail('non-canonical WorldState JSON');
    return {kind:'ok',slot,generation:record.generation,world,proof};
  }catch(error){
    if(error?.code==='ENOENT')return {kind:'missing',slot};
    return {kind:'corrupt',slot,reason:error.message};
  }finally{
    if(fd!==undefined)fs.closeSync(fd);
  }
}
export function createLocalWorldSaveStore({directory,marketBuyRegistry=null,
  useItem=null,historyReplay=null}){
  if(typeof directory!=='string'||!directory.trim())fail('save directory');
  if(historyReplay!==null&&(typeof historyReplay.verify!=='function'||typeof historyReplay.requireProof!=='boolean'))fail('source history verifier contract');
  const dir=path.resolve(directory);
  function scan(){
    if(fs.existsSync(dir)){
      const st=fs.lstatSync(dir);
      if(!st.isDirectory()||st.isSymbolicLink())
        fail('save path is not a real directory');
    }
    const rows=[readSlot(dir,0,marketBuyRegistry,useItem,historyReplay),
      readSlot(dir,1,marketBuyRegistry,useItem,historyReplay)];
    const valid=rows.filter(x=>x.kind==='ok')
      .sort((a,b)=>b.generation-a.generation);
    const corrupt=rows.filter(x=>x.kind==='corrupt');
    if(valid.length===2&&(valid[0].proof||valid[1].proof)&&
       !reviewedHistoryLineageCompatible(valid[1],valid[0],historyReplay?.checkpointStore)){
      const rejected=valid.shift();
      corrupt.push({kind:'corrupt',slot:rejected.slot,reason:'source history lineage mismatch'});
    }
    const latest=valid[0]??null;
    return {latest,corrupt};
  }
  function status(){
    const {latest,corrupt}=scan();
    return Object.freeze({
      available:Boolean(latest),generation:latest?.generation??0,
      recoveryWarning:corrupt.length>0,
      unreadable:!latest&&corrupt.length>0,
    });
  }
  function load(){
    const {latest,corrupt}=scan();
    if(!latest)fail(corrupt.length?
      '存檔損毀，沒有可驗證的備援世代（拒絕偽造世界）':
      '沒有可載入的存檔');
    return Object.freeze({
      world:latest.world,generation:latest.generation,
      recovered:corrupt.length>0,
      ...(latest.proof===null?{}:{careerProof:structuredClone(latest.proof)}),
    });
  }
  // Same canonical wire and exact capacity check used before memory CAS.
  // This does not publish a new disk generation or bypass source replay.
  function prepareRecord(world,{generation,careerProof=null}){
    safeInt(generation,'next save generation',1);
    const proofText=careerProof===null?null:JSON.stringify(careerProof);
    if(proofText!==null&&Buffer.byteLength(proofText,'utf8')>MAX_REVIEWED_HISTORY_WIRE_BYTES)fail('source history too large');
    const encoded=encodeMemorySnapshot(world);
    const envelope={
      format:LOCAL_SAVE_FORMAT,generation,sha256:recordDigest(encoded,proofText),world:encoded,
      ...(proofText===null?{}:{careerProof:proofText}),
    };
    if(careerProof?.anchorKind==='checkpoint'){
      if(!historyReplay?.checkpointStore)fail('checkpoint authenticator unavailable');
      historyReplay.checkpointStore.openPrefix(careerProof,generation);
      envelope.checkpointAuth=historyReplay.checkpointStore.recordAuth(envelope);
    }
    const record=JSON.stringify(envelope)+'\n';
    if(encoded.length>2000000||Buffer.byteLength(record)>MAX_BYTES)fail('save too large');
    return {encoded,proofText,record};
  }
  function preflight(world,{expectedGeneration,careerProof=null}){
    safeInt(expectedGeneration,'expected save generation');
    prepareRecord(world,{generation:expectedGeneration+1,careerProof});
    return true;
  }
  function save(raw,{expectedGeneration,careerProof=null}){
    safeInt(expectedGeneration,'expected save generation');
    const world=verifiedCheckpoint(raw,marketBuyRegistry,useItem,historyReplay,careerProof,expectedGeneration+1);
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
    if(careerProof?.anchorKind==='legacy'&&(!previous||(!previous.proof&&careerProof.anchor!==encodeMemorySnapshot(previous.world))))fail('legacy history requires prior validated checkpoint');
    if(previous&&(previous.proof||careerProof)&&!reviewedHistoryLineageCompatible(previous,{world,proof:careerProof},historyReplay?.checkpointStore))fail('source history prefix or anchor mismatch');
    const nextGen=safeInt(generation+1,'next save generation',1);
    const {encoded,proofText,record}=prepareRecord(world,{generation:nextGen,careerProof});
    ensureFolder(dir);
    const slot=nextGen%2;
    const dest=sourceFile(dir,slotNames[slot]);
    const temp=sourceFile(dir,'.world-'+randomUUID()+'.tmp');
    let fd;
    try{
      fd=fs.openSync(temp,c.O_CREAT|c.O_EXCL|c.O_WRONLY|(c.O_NOFOLLOW??0),0o600);
      fs.writeFileSync(fd,record,'utf8');
      fs.fsyncSync(fd);
      fs.closeSync(fd);fd=undefined;
      // Atomic on the same local filesystem; previous generation remains.
      fs.renameSync(temp,dest);
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
       (checked.latest.proof===null?null:JSON.stringify(checked.latest.proof))!==proofText)
      fail('post-save integrity re-read failed');
    return Object.freeze({generation:nextGen,revision:world.revision});
  }
  // Local test-only deletion. Never remove the save directory: it can be
  // configured by AKIMONO_SAVE_DIR and may contain unrelated user files.
  function clear({expectedGeneration}){
    safeInt(expectedGeneration,'expected save generation');
    const {latest}=scan();
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
  return Object.freeze({status,load,save,clear,preflight});
}
