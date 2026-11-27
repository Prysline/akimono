/** Original local-street dwarf parcel delivery, without optional host trade.
 * Source-only effects. D resolves stable actors, recipients and locale. */
import {createHash} from 'node:crypto';
import {loadStandardStreetModel} from './standard-street-model.mjs';
import {compileLiteralItemLimit} from './item-limit-model.mjs';
import {reviewLetterBox,projectDwarfNotice} from './original-r4-letter-box.mjs';
const pins={wrapper:'fb5bf73f2064647eb6df8759e33aaae4909bb4c9',edit:'1903e3099c9973bb645e0e2ab2bc1aebbff83ca7',form:'713fb99d8fa7dd934c2dd47517c5547a37d3010b',view:'8e8326b53a02805edca2043b0113af3c27837575',calc:'586354a9a300e26d0e12a4efa512fa25760e3197',config:'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0',itemDsl:'7a18185e98b32aee82ca1ce30d6f3c395157dbcb',rebelDsl:'923634e58a05beca9ab004515fc7669d53a1ba3a'};
const reviews=new WeakMap();
const fail=m=>{throw new RangeError('R4 dwarf delivery: '+m)};
const nat=n=>Number.isSafeInteger(n)&&n>=0;
const pos=n=>nat(n)&&n>0;
const signed=n=>Number.isSafeInteger(n);
const record=x=>x!==null&&typeof x==='object'&&Object.getPrototypeOf(x)===Object.prototype;
const fields=['no','tm','from','to','item','num','price','mode','trade'];
export function reviewDwarfDelivery(sources){
 for(const [k,sha] of Object.entries(pins)){
   const s=sources?.[k];if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k);
 }
 const model=loadStandardStreetModel(sources.itemDsl,sources.rebelDsl);
 const items=new Map(model.items.map(x=>[x.id,{...x,limit:compileLiteralItemLimit(x.limitRaw).limit,flags:x.flagRaw.split('|')}]));
 const letter=reviewLetterBox(sources.letterSources);
 const token=Object.freeze({source:'r4-original-local-dwarf-delivery.v1',committable:false});
 reviews.set(token,{items,letter});return token;
}
function valid(r){return record(r)&&Object.keys(r).length===9&&fields.every(k=>Object.hasOwn(r,k))&&pos(r.no)&&nat(r.tm)&&pos(r.from)&&r.from!==99&&pos(r.to)&&r.to!==99&&r.to!==r.from&&pos(r.item)&&r.item<=79&&pos(r.num)&&pos(r.price)&&[1,2,3].includes(r.mode)&&r.trade==='';}
export function parseDwarfDelivery(bytes){
 if(typeof bytes!=='string'||bytes!==''&&!bytes.endsWith('\n'))fail('canonical parcel bytes');
 const rows=bytes===''?[]:bytes.slice(0,-1).split('\n').map(l=>{
   const a=l.split(',');if(a.length!==9||a[8]!==''||a.slice(0,8).some(v=>!/^(?:0|[1-9][0-9]*)$/.test(v)))fail('local parcel row format');
   const r=Object.fromEntries(fields.map((k,i)=>[k,i===8?a[i]:Number(a[i])]));if(!valid(r))fail('local parcel row');return r;
 });
 if(new Set(rows.map(r=>r.no)).size!==rows.length)fail('duplicate parcel number');
 return rows;
}
export function serializeDwarfDelivery(rows){
 if(!Array.isArray(rows)||rows.some(r=>!valid(r))||new Set(rows.map(r=>r.no)).size!==rows.length)fail('local parcel rows');
 return rows.map(r=>fields.map(k=>r[k]).join(',')+'\n').join('');
}
export function projectDwarfDelivery({reviewed,shops,actorId,street,dwarfBytes,letterBytes,nowSeconds,townTaxRate,command,localize}){
 const review=reviews.get(reviewed);
 if(!review||!Array.isArray(shops)||!pos(actorId)||typeof street!=='string'||!street||!nat(nowSeconds)||!nat(townTaxRate)||townTaxRate>40||!record(command)||!['new','receive','reject','delete'].includes(command.kind)||typeof letterBytes!=='string')fail('reviewed current context');
 if(shops.some(s=>!record(s)||!pos(s.id)||s.id===99||s.status!==1||typeof s.shopname!=='string'||!signed(s.money)||!nat(s.paytoday)||!nat(s.saletoday)||!nat(s.taxtoday)||!Array.isArray(s.item)||s.item.length!==79||!s.item.every(nat))||new Set(shops.map(s=>s.id)).size!==shops.length)fail('active shop rows');
 const next=structuredClone(shops),actor=next.find(s=>s.id===actorId);
 if(!actor)fail('actor not active');
 let rows=parseDwarfDelivery(dwarfBytes).filter(r=>r.tm+172800>=nowSeconds);
 let letterAfter=letterBytes,noticeNo=null,dataWrite=false,receipt;
 const add=(s,item,num)=>{s.item[item-1]=Math.min(review.items.get(item).limit,s.item[item-1]+num);};
 const stages=[];
 if(command.kind==='new'){
   const {toId,itemId,unit=false,notice}=command,item=review.items.get(itemId);
   if(!pos(toId)||toId===99||toId===actorId||!next.some(s=>s.id===toId)||!item||item.flags.includes('norequest')||!nat(command.count)||!pos(command.price)||typeof unit!=='boolean'||typeof notice!=='boolean')fail('source normal recipient or goods');
   if(rows.filter(r=>r.from===actorId).length>=5)fail('source outgoing capacity');
   const num=Math.min(command.count||actor.item[itemId-1],actor.item[itemId-1]);
   let price=Math.min(command.price,999999999);if(unit)price*=num;
   const value=item.price*num;
   if(![num,price,value].every(pos)||price>value*2||value>price*2)fail('source price range or stock');
   const tax=Math.trunc(price*townTaxRate/100);
   if(tax>actor.money)fail('source tax cash');
   if(notice){
     const p=projectDwarfNotice({reviewed:review.letter,letterBytes,nowSeconds,street,actor,toId,localize});
     letterAfter=p.letterBytes;noticeNo=p.letterNo;
     stages.push('letter-stage','common-commit','common-unlock');
   }
   const row={no:(rows[0]?.no??0)+1,tm:nowSeconds,from:actorId,to:toId,item:itemId,num,price,mode:1,trade:''};
   rows.unshift(row);actor.item[itemId-1]-=num;actor.taxtoday+=tax;actor.money-=tax;
   dataWrite=true;receipt={kind:'new',no:row.no,tax,noticeNo};
 }else{
   const numbers=command.numbers;
   if(!Array.isArray(numbers)||!numbers.length||numbers.some(n=>!pos(n))||new Set(numbers).size!==numbers.length)fail('source selected parcel numbers');
   const selected=rows.filter(r=>numbers.includes(r.no));
   if(selected.length!==numbers.length||selected.some(r=>command.kind==='delete'?r.from!==actorId:r.to!==actorId||r.mode!==1))fail('source normal mailbox selection');
   for(const row of selected){
     if(command.kind==='reject')row.mode=3;
     else if(command.kind==='receive'){
       const sender=next.find(s=>s.id===row.from);
       // Unknown stable recipient is a data integrity refusal, not a new game rule.
       if(!sender)fail('source sender identity unavailable');
       actor.paytoday+=row.price;actor.money-=row.price;sender.money+=row.price;sender.saletoday+=row.price;
       add(actor,row.item,row.num);row.mode=2;dataWrite=true;
     }else if(row.mode!==2){add(actor,row.item,row.num);dataWrite=true;}
   }
   if(command.kind==='receive'&&actor.money<0)fail('source insufficient receipt cash');
   if(command.kind==='delete')rows=rows.filter(r=>!numbers.includes(r.no));
   receipt={kind:command.kind,numbers:selected.map(r=>r.no)};
 }
 if(next.some(s=>![s.money,s.paytoday,s.saletoday,s.taxtoday,...s.item].every(signed)))fail('source arithmetic overflow');
 if(dataWrite)stages.push('data-write');stages.push('dwarf-stage','commit-request','unlock');
 return {shops:next,dwarfBytes:serializeDwarfDelivery(rows),letterBytes:letterAfter,receipt,stages,committable:false};
}
