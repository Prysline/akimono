/** Frozen normal marriage and shared house storage. Pure source effects only. */
import {createHash} from 'node:crypto';
import {loadStandardStreetModel} from './standard-street-model.mjs';
import {compileLiteralItemLimit} from './item-limit-model.mjs';
const pins={wrapper:'18aa0de78bd75eb3c34c2b83139db457af045624',town:'cb1fa718d210d7fae5ef8ee01f9bdc29d276f251',edit:'faed450880743d798c878377fc99ba8755b93fde',form:'ceafe188e2a833f7285582b5562f3df801fb8217',view:'6ad71d5e55f771841fb9d5a6bf0e48bd338f34a5',map:'0c05ed554306830c78262e7f7ce71ee49fd6e671',calc:'586354a9a300e26d0e12a4efa512fa25760e3197',config:'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0',itemDsl:'7a18185e98b32aee82ca1ce30d6f3c395157dbcb',rebelDsl:'923634e58a05beca9ab004515fc7669d53a1ba3a'};
const reviews=new WeakMap(),fail=m=>{throw new RangeError('R4 house: '+m)};
const nat=n=>Number.isSafeInteger(n)&&n>=0,pos=n=>nat(n)&&n>0;
const record=x=>x!==null&&typeof x==='object'&&Object.getPrototypeOf(x)===Object.prototype;
const places=Object.freeze(Array.from({length:10},(_,i)=>101+i));
const fields=['no','tm','mode','ida','idb','stock','cnt','money','place','reform'];
const msg=(key,...args)=>({key,args});
export function reviewSharedHouse(sources){
 for(const [k,sha] of Object.entries(pins)){
   const s=sources?.[k];if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k);
 }
 const model=loadStandardStreetModel(sources.itemDsl,sources.rebelDsl);
 const items=new Map(model.items.map(x=>[x.id,{...x,limit:compileLiteralItemLimit(x.limitRaw).limit,flags:x.flagRaw.split('|')}]));
 const token=Object.freeze({source:'r4-original-shared-house.v1',committable:false,places});reviews.set(token,items);return token;
}
function valid(r){return record(r)&&Object.keys(r).length===10&&fields.every(k=>Object.hasOwn(r,k))&&pos(r.no)&&nat(r.tm)&&[0,1,3,5,7,9].includes(r.mode)&&pos(r.ida)&&pos(r.idb)&&r.ida!==r.idb&&nat(r.money)&&nat(r.place)&&['0','a'].includes(r.reform)&&Array.isArray(r.stock)&&Array.isArray(r.cnt)&&r.stock.length===r.cnt.length&&r.stock.length>=1&&r.stock.length<=Math.max(1,r.mode)&&r.stock.every((id,i)=>nat(id)&&id<=79&&nat(r.cnt[i])&&(id===0)===(r.cnt[i]===0));}
export function parseSharedHouses(bytes){
 if(typeof bytes!=='string'||bytes!==''&&!bytes.endsWith('\n'))fail('canonical bride bytes');
 const rows=bytes===''?[]:bytes.slice(0,-1).split('\n').map(line=>{
   const a=line.split(',');if(a.length!==10||[0,1,2,3,4,7,8].some(i=>!/^(?:0|[1-9][0-9]*)$/.test(a[i]))||[5,6].some(i=>! /^(?:0|[1-9][0-9]*)(?::(?:0|[1-9][0-9]*))*$/.test(a[i])))fail('bride columns');
   const r=Object.fromEntries(fields.map((k,i)=>[k,i===5||i===6?a[i].split(':').map(Number):i===9?a[i]:Number(a[i])]));if(!valid(r))fail('bride row');return r;
 });
 if(new Set(rows.map(r=>r.no)).size!==rows.length)fail('duplicate bride number');
 return rows;
}
export function serializeSharedHouses(rows){
 if(!Array.isArray(rows)||rows.some(r=>!valid(r))||new Set(rows.map(r=>r.no)).size!==rows.length)fail('bride rows');
 return rows.map(r=>fields.map(k=>Array.isArray(r[k])?r[k].join(':'):r[k]).join(',')+'\n').join('');
}
export function projectSharedHouse({reviewed,shops,actorId,brideBytes,nowSeconds,command}){
 const items=reviews.get(reviewed);
 if(!items||!Array.isArray(shops)||!pos(actorId)||!nat(nowSeconds)||!record(command)||!['new','agree','end','dis','con','more','plus','minus','divorce'].includes(command.kind))fail('reviewed normal house context');
 if(shops.some(s=>!record(s)||!pos(s.id)||s.status!==1||!Number.isSafeInteger(s.money)||typeof s.name!=='string'||typeof s.shopname!=='string'||!Array.isArray(s.item)||s.item.length!==79||!s.item.every(nat))||new Set(shops.map(s=>s.id)).size!==shops.length)fail('active shop rows');
 const next=structuredClone(shops),actor=next.find(s=>s.id===actorId),byId=id=>next.find(s=>s.id===id);
 if(!actor)fail('actor not active');
 const raw=parseSharedHouses(brideBytes);let rows=raw.filter(r=>byId(r.ida)&&byId(r.idb));
 const logCalls=[],log=(level,key,...args)=>logCalls.push([level,0,msg(key,...args)]);
 const names=s=>[s.name,s.shopname],member=(r,id)=>r.ida===id||r.idb===id;
 let dataWrite=false,number,count=null;
 if(command.kind==='new'){
   const target=byId(command.targetId);
   if(!target||target===actor||actor.money<5000000||rows.some(r=>member(r,actorId)||member(r,target.id)))fail('source proposal unavailable');
   actor.money-=5000000;dataWrite=true;
   number=(raw[0]&&rows.includes(raw[0])?raw[0].no:0)+1;
   rows.unshift({no:number,tm:nowSeconds,mode:0,ida:actorId,idb:target.id,stock:[0],cnt:[0],money:0,place:0,reform:'0'});
   log(3,'%1 (%2)が %3 (%4)に結婚を申し込みました。',...names(actor),...names(target));
 }else{
   const row=rows.find(r=>r.no===command.no);
   if(!row||!member(row,actorId))fail('normal member house required');
   number=row.no;const a=byId(row.ida),b=byId(row.idb);
   if(['agree','end','dis'].includes(command.kind)){
     if(row.mode!==0||(command.kind==='end'?row.ida!==actorId:row.idb!==actorId))fail('normal proposal action unavailable');
     if(command.kind==='agree'){
       if(actor.money<5000000)fail('source marriage cash');
       actor.money-=5000000;row.tm=nowSeconds;row.mode=1;row.money=10000000;dataWrite=true;
       log(3,'%1 (%2)は %3 (%4)の結婚の申し込みを受けました。',...names(b),...names(a));
       log(1,'%1 (%2)と %3 (%4) が結婚しました。',...names(a),...names(b));
     }else{
       if(command.kind==='end'){actor.money+=5000000;dataWrite=true;log(3,'%1 (%2)は %3 (%4)への結婚の申し込みをとりやめました。',...names(a),...names(b));}
       else log(3,'%1 (%2)は %3 (%4)の結婚の申し込みを断りました。',...names(b),...names(a));
       rows=rows.filter(r=>r!==row);
     }
   }else{
     if(!row.mode)fail('source married house required');
     if(command.kind==='con'){
       if(row.mode!==1||row.place||!places.includes(command.place)||rows.some(r=>r.place===command.place)||row.money<15000000)fail('normal construction unavailable');
       row.money-=15000000;row.place=command.place;row.mode=3;row.reform='a';
       log(2,'%1＆%2夫妻が住宅を建てました。',a.name,b.name);
     }else if(command.kind==='more'){
       if(![3,5].includes(row.mode)||row.money<=row.mode*10000000)fail('normal expansion form unavailable');
       row.money-=row.mode*10000000;row.mode+=2;log(2,'%1＆%2夫妻が住宅を増築しました。',a.name,b.name);
     }else if(command.kind==='divorce'){
       rows=rows.filter(r=>r!==row);log(1,'%1 (%2)と %3 (%4) が離婚しました。',...names(a),...names(b));
     }else{
       if(!nat(command.count))fail('source amount or blank maximum');
       const plus=command.kind==='plus',cash=command.item===-1;
       let available,space,index,item;
       if(cash){available=plus?actor.money:row.money;space=plus?row.mode*20000000-row.money:999999999-actor.money;}
       else if(plus){
         item=items.get(command.item);
         if(!item||item.flags.includes('norequest'))fail('normal store item selection');
         index=row.stock.indexOf(item.id);
         if(index<0){index=Array.from({length:row.mode},(_,i)=>i).find(i=>!row.stock[i]);}
         if(index===undefined||index<0)fail('source storage slot');
         available=actor.item[item.id-1];space=item.limit*5-(row.cnt[index]??0);
       }else{
         index=command.item;if(!nat(index)||index>=row.mode||!row.stock[index])fail('normal stored slot selection');
         item=items.get(row.stock[index]);available=row.cnt[index];space=item.limit-actor.item[item.id-1];
       }
       count=Math.min(command.count||available,available,space);
       if(!pos(count))fail('source stock or cash capacity');
       if(cash){actor.money+=plus?-count:count;row.money+=plus?count:-count;}
       else if(plus){actor.item[item.id-1]-=count;row.stock[index]=item.id;row.cnt[index]=(row.cnt[index]??0)+count;}
       else{actor.item[item.id-1]+=count;row.cnt[index]-=count;if(!row.cnt[index])row.stock[index]=0;}
       dataWrite=true;
     }
   }
 }
 if(next.some(s=>!Number.isSafeInteger(s.money)||!s.item.every(nat)))fail('source arithmetic overflow');
 return {shops:next,brideBytes:serializeSharedHouses(rows),logCalls,receipt:{kind:command.kind,no:number,count},stages:[...(dataWrite?['data-write']:[]),'bride-stage','renew-log','commit-request','unlock'],committable:false};
}
