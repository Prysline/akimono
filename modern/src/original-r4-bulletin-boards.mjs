/** Normal player guild and street bulletin boards from frozen Standard Street.
 * Source wire bytes are private storage data, never raw DOM or public IP data.
 * D supplies authoritative actor/town/guild and server metadata. */
import {createHash} from 'node:crypto';
const pins={guildView:'976e620a6370d752d98502d64eeb11273e4a1ada',guildEdit:'739f18dc9ca645d3f53da9555496b71c5e95575a',street:'aec953b1c482972d8c524999f3d3043bb87dcb4b',streetConfig:'6fa25ce01d7ada4f9b7135780c52bcd67733d90b',streetEdit:'406b388c0c2f9a45b2d68dfbdfbe0a660dc9603c',streetView:'5b76a9fed1ea370c8873ca7747580e8cf5266563',decoder:'af3f9ef6bd7123d9667675843b68678c181cabee',sub:'33c767f434d7d6f0c5e9e0c9a291472b3a0f3b25',query:'e7a8add7b0291901e71fe797783b664dff1568a0',config:'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0'};
const reviews=new WeakSet(),fail=m=>{throw new RangeError('R4 bulletin board: '+m)};
const nat=n=>Number.isSafeInteger(n)&&n>=0,pos=n=>nat(n)&&n>0;
const clean=s=>typeof s==='string'&&!/[\r\n\0]/.test(s);
const csv=s=>clean(s)&&!/[,\t]/.test(s);
const treeText=s=>clean(s)&&!s.includes('<>');
const esc=s=>s.replace(/&/g,'&amp;').replace(/>/g,'&gt;').replace(/</g,'&lt;');
function cut(s,n){if([...s].length<n)return s;let v=[...s].slice(0,n).join('');if(/^(?:(?:[\x81-\x9F|\xE0-\xEF][\x40-\x7E|\x80-\xFC])|(?:[\x20-\x7E\xA0-\xDF]))*[\x81-\x9F|\xE0-\xEF]$/.test(v))v=v.slice(0,-1);return v;}
export function reviewBulletinBoards(sources){
 for(const [k,sha] of Object.entries(pins)){
  const s=sources?.[k];if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k);
 }
 const token=Object.freeze({source:'r4-original-bulletin-boards.v1',committable:false});reviews.add(token);return token;
}
function lines(bytes){if(typeof bytes!=='string'||bytes!==''&&!bytes.endsWith('\n'))fail('canonical board bytes');return bytes===''?[]:bytes.slice(0,-1).split('\n');}
function number(s){if(!/^(?:0|[1-9][0-9]*)$/.test(s)||!nat(Number(s)))fail('board numeric field');return Number(s);}
export function projectGuildBoardPost({reviewed,actor,definition,boardBytes,nowSeconds,townTitle,message}){
 if(!reviews.has(reviewed)||!actor||!pos(actor.id)||!nat(actor.icon)||!csv(actor.name)||!csv(actor.shopname)||!csv(townTitle)||typeof actor.guild!=='string'||!actor.guild||definition?.code!==actor.guild||!nat(nowSeconds)||typeof message!=='string')fail('trusted member and guild context');
 let text=message.replace(/["',]/g,' ').replace(/[\x00-\x1f]/g,'');
 if(!text||text==='0'||[...text].length>180)fail('source message length');
 text=esc(cut(text,180));
 const data=lines(boardBytes);
 for(const l of data){
  const a=l.split(',');if(a.length!==6)fail('guild board row');
  const tm=number(a[0]),id=number(a[3]);
  if(id===actor.id&&tm>nowSeconds-900&&a[4].split('\t')[0]===text)fail('source duplicate post');
 }
 // Standard Street has no SECURE_MODE_BBS/MAX_BBS_MESSAGE assignment:
 // the source uses the default twenty records and no optional throttle.
 let no=data.length?number(data[0].split(',')[5])+1:1;if(no>data.length*2)no=1;
 const row=[nowSeconds,actor.icon,townTitle,actor.id,text+'\t'+actor.shopname+'\t'+actor.name,no].join(',');
 return {boardBytes:[row,...data].slice(0,20).map(x=>x+'\n').join(''),number:no,guild:actor.guild,committable:false};
}
const fields=['no','reno','lx','sub','town','name','message','tm','host','oya','smail','res'];
function parseTree(bytes){
 const data=lines(bytes);if(!data.length)return {count:0,rows:[]};
 const top=data.shift().split('<>');if(top.length!==4||top[3]!==''||!treeText(top[1]))fail('street header');
 const rows=data.map(line=>{
  const a=line.split('<>');if(a.length!==13||a[12]!=='')fail('street board row');
  const r=Object.fromEntries(fields.map((k,i)=>[k,[0,2,7,9,10,11].includes(i)?number(a[i]):i===1&&a[i]!=='no'?number(a[i]):a[i]]));return r;
 });
 return {count:number(top[0]),rows};
}
function wire(r){return fields.map(k=>r[k]).join('<>')+'<>\n';}
export function projectStreetBoardPost({reviewed,actor,boardBytes,nowSeconds,townTitle,serverMetadata,command}){
 if(!reviews.has(reviewed)||!actor||!pos(actor.id)||!treeText(actor.shopname)||!treeText(townTitle)||!nat(nowSeconds)||!treeText(serverMetadata?.addr)||!treeText(serverMetadata?.host)||!command||!['new','reply'].includes(command.kind)||typeof command.subject!=='string'||typeof command.message!=='string'||!nat(command.category)||command.category>10)fail('trusted street post context');
 const encode=s=>esc(s).replace(/"/g,'&quot;').replace(/\r\n|\r|\n/g,'<br>');
 const sub=encode(command.subject),message=encode(command.message).replace(/(?:<br>)+$/g,'');
 if(!sub||/^(?:\x81\x40|\s)+$/.test(sub)||!message||/^(?:\x81\x40|\s|<br>)+$/.test(message))fail('source subject/message required');
 // The original multipart transport has a 10,240-byte body gate. D owns
 // actual transport size; this pure callback accepts already parsed content.
 const {count,rows}=parseTree(boardBytes),no=count%9999?count+1:1;
 let next;
 const row={no,reno:'no',lx:0,sub,town:townTitle,name:actor.shopname,message,tm:nowSeconds,host:serverMetadata.host,oya:no,smail:command.category,res:0};
 if(command.kind==='new')next=[row,...rows];
 else{
  const parent=rows.find(r=>r.no===command.parentNo);
  if(!parent||!pos(command.parentNo)||parent.oya!==command.rootNo)fail('source selected thread');
  row.reno=parent.no;row.lx=parent.lx+1;row.oya=parent.oya;
  const thread=rows.filter(r=>r.oya===parent.oya),rest=rows.filter(r=>r.oya!==parent.oya);
  parent.res++;
  let i=thread.indexOf(parent)+1;
  // Source inserts before the next shallower node (strict >), otherwise
  // after the rest of the current thread; then bumps the entire thread.
  while(i<thread.length&&thread[i].lx>=row.lx)i++;
  thread.splice(i,0,row);next=[...thread,...rest];
 }
 if(next.length>50){while(next.length){const last=next.pop();if(next.length<=50&&last.reno==='no')break;}}
 return {boardBytes:no+'<>'+serverMetadata.addr+'<>'+nowSeconds+'<>\n'+next.map(wire).join(''),number:no,committable:false};
}
/** Public content projection never exposes raw host or address columns. */
export function listStreetBoardPosts(bytes){
 return parseTree(bytes).rows.map(({host,...r})=>r);
}
