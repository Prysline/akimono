/** Frozen Standard Street request board. Pure normal player commands;
 * current actor and town rows must be supplied by D's authoritative adapter. */
import {createHash} from 'node:crypto';
import {loadStandardStreetModel} from './standard-street-model.mjs';
import {compileLiteralItemLimit} from './item-limit-model.mjs';
const pins={handler:'e2fb94dd67755b274d1706de6e2f28087dc121cb',reader:'29de51b7b519fcfcfbd0810a3c180e7357374d34',detail:'b4f509eb0066f03b1b3132f802c4a72cd53ec051',list:'dc0f5308e49bfab09e2dc70efed26070ded7d390',form:'a89dddc8cde614bfc08092327f6f251f287b6d8b',calc:'586354a9a300e26d0e12a4efa512fa25760e3197',config:'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0',itemDsl:'7a18185e98b32aee82ca1ce30d6f3c395157dbcb',rebelDsl:'923634e58a05beca9ab004515fc7669d53a1ba3a',action:'4b75cd5dc0eabcd629b186e82c59e9c5e187614d'};
const reviews=new WeakMap();
const fail=m=>{throw new RangeError('R4 request board: '+m)};
const record=x=>x!==null&&typeof x==='object'&&Object.getPrototypeOf(x)===Object.prototype;
const int=n=>Number.isSafeInteger(n);
const nat=n=>int(n)&&n>=0;
const positive=n=>nat(n)&&n>0;
const fields=['no','tm','id','itemno','num','prn','pr','mode'];
const max=999999999;
export function reviewRequestBoard(sources){
  for(const [k,sha] of Object.entries(pins)){
    const s=sources?.[k];
    if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k);
  }
  const model=loadStandardStreetModel(sources.itemDsl,sources.rebelDsl);
  const items=new Map(model.items.map(x=>[x.id,{...x,limit:compileLiteralItemLimit(x.limitRaw).limit,flags:x.flagRaw.split('|')}]));
  const token=Object.freeze({source:'r4-original-request-board.v1',committable:false});
  reviews.set(token,items);return token;
}
function itemKey(n){return n===-1||positive(n)&&n<=79;}
function rowValid(row){return record(row)&&Object.keys(row).length===8&&fields.every(k=>Object.hasOwn(row,k))&&positive(row.no)&&nat(row.tm)&&positive(row.id)&&itemKey(row.itemno)&&itemKey(row.prn)&&row.itemno!==row.prn&&positive(row.num)&&positive(row.pr)&&nat(row.mode);}
export function parseRequestBoard(bytes){
  if(typeof bytes!=='string'||bytes!==''&&!bytes.endsWith('\n'))fail('canonical request rows required');
  const rows=bytes===''?[]:bytes.slice(0,-1).split('\n').map(line=>{
    const values=line.split(',');if(values.length!==8||values.some(x=>! /^(?:0|-1|[1-9][0-9]*)$/.test(x)))fail('request row format');
    const row=Object.fromEntries(fields.map((k,i)=>[k,Number(values[i])]));if(!rowValid(row))fail('request row fields');return row;
  });
  if(new Set(rows.map(x=>x.no)).size!==rows.length)fail('duplicate request number');
  return rows;
}
export function serializeRequestBoard(rows){
  if(!Array.isArray(rows)||rows.some(r=>!rowValid(r))||new Set(rows.map(r=>r.no)).size!==rows.length)fail('request rows');
  return rows.map(row=>fields.map(k=>row[k]).join(',')+'\n').join('');
}
export function projectRequestBoard({reviewed,shops,actorId,requestBytes,nowSeconds,townTaxRate,command}){
  const items=reviews.get(reviewed);
  if(!items||!Array.isArray(shops)||!positive(actorId)||!nat(nowSeconds)||!nat(townTaxRate)||townTaxRate>40||!record(command)||!['new','plus','end','thank'].includes(command.kind))fail('reviewed current context');
  if(shops.some(s=>!record(s)||!positive(s.id)||s.status!==1||!int(s.money)||!nat(s.paytoday)||!nat(s.saletoday)||!nat(s.taxtoday)||!Array.isArray(s.item)||s.item.length!==79||!s.item.every(nat))||new Set(shops.map(s=>s.id)).size!==shops.length)fail('active shop rows');
  const next=structuredClone(shops),actor=next.find(s=>s.id===actorId);
  if(!actor)fail('actor not active');
  const rows=parseRequestBoard(requestBytes).filter(r=>r.tm>=nowSeconds);
  const active=id=>next.some(s=>s.id===id);
  const give=(kind,count,sale=false)=>{
    if(kind<0){actor.money+=count;if(sale)actor.saletoday+=count;}
    else actor.item[kind-1]=Math.min(items.get(kind).limit,actor.item[kind-1]+count);
  };
  const take=(kind,count)=>{
    if(kind<0){if(actor.money<count)fail('source insufficient cash');actor.money-=count;actor.paytoday+=count;}
    else{if(actor.item[kind-1]<count)fail('source insufficient stock');actor.item[kind-1]-=count;}
  };
  let receipt;
  if(command.kind==='new'){
    const {itemno,prn,unit=false}=command;
    if(!itemKey(itemno)||!itemKey(prn)||itemno===prn||!positive(command.num)||!positive(command.pr)||typeof unit!=='boolean')fail('source offer/request selection');
    if(rows.filter(r=>r.id===actorId).length>=1)fail('source one request per owner');
    let num=Math.min(command.num,max),pr=Math.min(command.pr,max);
    if(unit&&prn<0)pr*=num;
    if(unit&&itemno<0)num*=pr;
    const offered=items.get(itemno),wanted=items.get(prn);
    if(offered?.flags.includes('norequest')||wanted?.flags.some(x=>x==='norequest'||x==='onlysend')||wanted&&pr>wanted.limit)fail('source request flags or limit');
    const v1=offered?offered.price*num:num,v2=wanted?wanted.price*pr:pr;
    if(![num,pr,v1,v2].every(positive)||v1>v2*2||v2>v1*2)fail('source value range');
    take(itemno,num);
    const tax=Math.trunc((itemno<0?num:prn<0?pr:0)*townTaxRate/100);
    if(tax>actor.money)fail('source tax cash');
    actor.money-=tax;actor.taxtoday+=tax;
    const no=(rows[0]?.no??0)+1;
    const row={no,tm:nowSeconds+172800,id:actorId,itemno,num,prn,pr,mode:0};
    rows.unshift(row);receipt={kind:'new',no,tax};
  }else{
    const index=rows.findIndex(r=>r.no===command.no);if(index<0)fail('request unavailable');
    const row=rows[index],completed=active(row.mode);
    if(command.kind==='plus'){
      // Normal req-l form only lets a different shop fulfill a pending row.
      if(row.id===actorId||completed)fail('source normal fulfillment unavailable');
      take(row.prn,row.pr);give(row.itemno,row.num,true);
      // req-s references an unassigned package $id on the cash-reward branch;
      // standard action.cgi/normal request has no active shop for that value.
      row.mode=actorId;
    }else if(command.kind==='end'){
      if(row.id!==actorId||completed)fail('source normal withdrawal unavailable');
      give(row.itemno,row.num);rows.splice(index,1);
    }else{
      // req.cgi offers thank on a nonzero mode for the original owner.
      if(row.id!==actorId||!row.mode)fail('source normal collection unavailable');
      give(row.prn,row.pr,true);rows.splice(index,1);
    }
    receipt={kind:command.kind,no:row.no,tax:0};
  }
  if(next.some(s=>![s.money,s.paytoday,s.saletoday,s.taxtoday,...s.item].every(int)))fail('source arithmetic overflow');
  return {shops:next,requestBytes:serializeRequestBoard(rows),receipt,stages:['request-stage','data-write','commit-request','unlock'],committable:false};
}
