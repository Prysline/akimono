/** Frozen log.cgi + ReadLog and inc-html-log.cgi independent owner view.
 * Only existing live log0/log1 and current source EVENT INFO are projected.
 * No new public/private authorization, disk mutation, or multi-shop ranking. */
import {createHash} from 'node:crypto';
import {parseDsl} from './parse-dsl.mjs';
const pins={newsViewSource:'d499068d1e8df00abbab71e7bcdbb0b1290daaf2',newsHtmlSource:'830196aa4a1b10f26934ec34675a239b19d822f8',newsPageSource:'aa8b04dcec124276cb5b4eeeba650137b4449779',newsTimeSource:'e164091d4dc6de084bb4770e0b9b4bf6005d9f3f',logSource:'0f9143c49d1552233f27754e3937e1cdc2740f0a',configSource:'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0',itemDsl:'7a18185e98b32aee82ca1ce30d6f3c395157dbcb',rebelDsl:'923634e58a05beca9ab004515fc7669d53a1ba3a',compilerSource:'1da8cce1e76ad6159325a37faec68efaa82c7f69'};
const reviews=new WeakSet();
const fail=m=>{throw new RangeError('R4 original news: '+m)};
export function reviewOriginalNews(sources){
 for(const [key,sha] of Object.entries(pins)){
  const s=sources[key];if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+key);
 }
 if(!/\$LIST_PAGE_ROWS_PC\s*=25\s*;/.test(sources.configSource)||!/\$TZ_JST\s*=60\*60\*9\s*;/.test(sources.configSource))fail('source paging or time config');
 const declarations=[...parseDsl(sources.itemDsl,'custom/inc-item-data.cgi').blocks,...parseDsl(sources.rebelDsl,'custom/inc-rebel-data.cgi').blocks].filter(b=>b.kind==='EVENT');
 const infos=Object.freeze(Object.fromEntries(declarations.map(b=>[b.fields.code[0].value,b.fields.info?.[0]?.value??''])));
 if(Object.keys(infos).length!==25)fail('original EVENT info set');
 const reviewed=Object.freeze({infos,pageRows:25,timezoneSeconds:9*3600});reviews.add(reviewed);return reviewed;
}
function timeLabel(seconds,timezoneSeconds){
 if(!seconds)return '--/--';
 const d=new Date((seconds+timezoneSeconds)*1000);
 if(!Number.isFinite(d.getTime()))fail('source timestamp');
 const pad=n=>String(n).padStart(2,'0');
 return pad(d.getUTCMonth()+1)+'/'+pad(d.getUTCDate())+' '+pad(d.getUTCHours())+':'+pad(d.getUTCMinutes());
}
export function describeOriginalNews({reviewed,world}){
 if(!reviews.has(reviewed)||world?.shops?.length!==1||world.shops[0].id!==1||world.shops[0].status!==1)fail('local owner required');
 const shop=world.shops[0],live=world.period?.disk?.live;
 if(!live||typeof live['log0.cgi']?.bytes!=='string'||typeof live['log1.cgi']?.bytes!=='string')fail('source live log files');
 const rows=[];
 for(const name of ['log0.cgi','log1.cgi']){
  for(const wire of live[name].bytes.split('\n')){
   if(!wire)continue;
   const m=/^(\d+)\t(\d+)\t(\d+)\t([^\r\n\t]*)$/.exec(wire);
   if(!m)fail('source log row');
   const [timestamp,mode,id]=m.slice(1,4).map(Number);
   if(![timestamp,mode,id].every(Number.isSafeInteger)||timestamp>world.nowSeconds)fail('source log values');
   if(id!==0&&id!==shop.id)continue;
   rows.push({timestamp,mode,id,private:id===shop.id,message:m[4],wire,timeLabel:timeLabel(timestamp,reviewed.timezoneSeconds)});
  }
 }
 const eventMessages=[];
 for(const code of Object.keys(world.period.eventState)){
  if(!Object.hasOwn(reviewed.infos,code))fail('unknown active EVENT');
  if(reviewed.infos[code])eventMessages.push(reviewed.infos[code]);
 }
 eventMessages.sort();
 return {source:'r4-frozen-news-owner.v1',pageRows:reviewed.pageRows,targets:[shop.shopname],eventMessages,rows};
}
