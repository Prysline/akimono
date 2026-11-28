/** Original common letter box and normal player postal commands.
 * Locale resolver and stable recipient directory are server-side context.
 * No I/O, HTML rendering, authentication, or publication authority. */
import {createHash} from 'node:crypto';
const pins={wrapper:'85f616d09a3bf5a76e36169152eff4245e626565',edit:'a0ac79de67a027fc915bba2d1af9cd7031c76c45',form:'7293ab673685b0fa9545f43fb2924fb84ebebc9a',view:'89a5f523c47d9a4c6659a91ebf310dfac662af07',helper:'53c33a03bfa8023b259ddb822d6ae238c6e1fee4',sub:'33c767f434d7d6f0c5e9e0c9a291472b3a0f3b25',query:'e7a8add7b0291901e71fe797783b664dff1568a0',config:'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0'};
const reviews=new WeakSet();
const fail=m=>{throw new RangeError('R4 letter box: '+m)};
const nat=n=>Number.isSafeInteger(n)&&n>=0;
const id=n=>nat(n)&&n>0;
const town=s=>typeof s==='string'&&/^[A-Za-z0-9_]+$/.test(s);
const safeText=s=>typeof s==='string'&&!/[,\r\n\0]/.test(s);
const fields=['no','time','fromt','fromid','tot','toid','title','msg','mode','other'];
const life=172800;
export function reviewLetterBox(sources){
 for(const [k,sha] of Object.entries(pins)){
   const s=sources?.[k];if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k);
 }
 const review=Object.freeze({source:'r4-original-letter-box.v1',committable:false});reviews.add(review);return review;
}
function valid(r){return r&&Object.keys(r).length===10&&fields.every(k=>Object.hasOwn(r,k))&&id(r.no)&&nat(r.time)&&town(r.fromt)&&id(r.fromid)&&town(r.tot)&&id(r.toid)&&safeText(r.title)&&safeText(r.msg)&&[0,1,2].includes(r.mode)&&safeText(r.other);}
export function parseLetterBox(bytes){
 if(typeof bytes!=='string'||bytes!==''&&!bytes.endsWith('\n'))fail('canonical common box bytes');
 const rows=bytes===''?[]:bytes.slice(0,-1).split('\n').map(l=>{
   const a=l.split(',');if(a.length!==10)fail('common box columns');
   for(const i of [0,1,3,5,8])if(!/^(?:0|[1-9][0-9]*)$/.test(a[i]))fail('common box numeric column');
   const r=Object.fromEntries(fields.map((k,i)=>[k,[0,1,3,5,8].includes(i)?Number(a[i]):a[i]]));
   if(!valid(r))fail('common box row');return r;
 });
 if(new Set(rows.map(r=>r.no)).size!==rows.length)fail('duplicate letter number');
 return rows;
}
export function serializeLetterBox(rows){
 if(!Array.isArray(rows)||rows.some(r=>!valid(r))||new Set(rows.map(r=>r.no)).size!==rows.length)fail('common box rows');
 return rows.filter(r=>r.mode!==2).map(r=>fields.map(k=>r[k]).join(',')+'\n').join('');
}
function readRows(bytes,now){
 return parseLetterBox(bytes).map(r=>now-r.time>life?{...r,mode:2}:r);
}
const sourceQueryText=s=>{
 if(typeof s!=='string')fail('letter text');
 return s.replace(/["',]/g,' ').replace(/[\x00-\x1f]/g,'');
};
function cut(s,n){
 if([...s].length<n)return s;
 let v=[...s].slice(0,n).join('');
 if(/^(?:(?:[\x81-\x9F|\xE0-\xEF][\x40-\x7E|\x80-\xFC])|(?:[\x20-\x7E\xA0-\xDF]))*[\x81-\x9F|\xE0-\xEF]$/.test(v))v=v.slice(0,-1);
 return v;
}
function context({reviewed,letterBytes,nowSeconds,street,actor}){
 if(!reviews.has(reviewed)||!nat(nowSeconds)||!town(street)||!actor||!id(actor.id)||!safeText(actor.shopname))fail('reviewed common context');
 return readRows(letterBytes,nowSeconds);
}
function add(rows,{nowSeconds,street,actor,toTown,toId,title,msg,fromId=actor.id}){
 const row={no:(rows[0]?.no??0)+1,time:nowSeconds,fromt:street,fromid:fromId,tot:toTown,toid:toId,title,msg,mode:1,other:actor.shopname};
 if(!valid(row))fail('source letter row');
 rows.unshift(row);return row.no;
}
export function projectLetterBox(input){
 const {nowSeconds,street,actor,command,directory,localize}=input;
 const rows=context(input);
 if(!command||!['send','read','delete'].includes(command.kind))fail('normal postal command');
 const incoming=r=>r.mode!==2&&r.tot===street&&r.toid===actor.id;
 const outgoing=r=>r.mode!==2&&r.fromt===street&&r.fromid===actor.id;
 let writeRequired=false,letterNo=null,visible=[];
 if(command.kind==='send'){
   const {toTown,toId}=command;
   if(!town(toTown)||!id(toId)||!directory||!Object.hasOwn(directory,toTown)||!Array.isArray(directory[toTown])||!directory[toTown].includes(toId))fail('recipient directory');
   if(rows.filter(outgoing).length>=5)fail('source outgoing capacity');
   let title=sourceQueryText(command.title),msg=sourceQueryText(command.msg);
   if(!msg||msg==='0'||[...title].length>40||[...msg].length>400)fail('source form text length or content');
   title=cut(title,40);msg=cut(msg,400);
   if(!title||title==='0'){if(typeof localize!=='function')fail('trusted locale resolver required');title=localize('（無題）');}
   letterNo=add(rows,{nowSeconds,street,actor,toTown,toId,title,msg});
   writeRequired=true;
 }else if(command.kind==='delete'){
   if(!Array.isArray(command.numbers)||command.numbers.some(n=>!id(n))||new Set(command.numbers).size!==command.numbers.length||command.numbers.some(n=>!rows.some(r=>r.no===n&&(incoming(r)||outgoing(r)))))fail('normal selected mailbox rows');
   for(const r of rows)if(command.numbers.includes(r.no))r.mode=2;
   writeRequired=true;
 }else{
   visible=structuredClone(rows.filter(incoming));
   for(const r of rows)if(incoming(r)){
     if(r.mode===1){r.mode=0;writeRequired=true;}
     if(r.fromid===1)r.mode=2;
   }
 }
 return {letterBytes:writeRequired?serializeLetterBox(rows):input.letterBytes,writeRequired,letterNo,visible,committable:false};
}
/** Normal parcel notice invokes the common source writer before street data.
 * It does not apply the player outgoing capacity to the system sender. */
export function projectDwarfNotice(input){
 const {nowSeconds,street,actor,toId,localize}=input;
 const rows=context(input);
 if(!id(toId)||typeof localize!=='function')fail('trusted notice context');
 const letterNo=add(rows,{nowSeconds,street,actor,toTown:street,toId,fromId:1,
   title:localize('宅配便到着のお知らせ'),
   msg:localize('こちらドワーフ宅配便です。%1さんより，小包が届けられましたので，ご確認をお願いいたします。',actor.shopname)});
 return {letterBytes:serializeLetterBox(rows),letterNo,writeRequired:true,committable:false};
}
