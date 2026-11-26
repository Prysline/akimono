/** Reviewed gd-b CGI handler projection, not public authorization or publication. */
import {createHash} from 'node:crypto';
const pins={handler:'712cacab0ce4accdff2f6fc6ff4b5cb71f1678c5',sub:'33c767f434d7d6f0c5e9e0c9a291472b3a0f3b25',config:'010e43766c1b78c7572cbc0aded2daf03dc07a1e'};
const reviews=new WeakSet();
const fail=m=>{throw new RangeError('R4 guild establishment: '+m)};
const record=x=>x!==null&&typeof x==='object'&&Object.getPrototypeOf(x)===Object.prototype;
const safeId=n=>Number.isSafeInteger(n)&&n>0;
const town=s=>typeof s==='string'&&/^[A-Za-z][A-Za-z0-9_]*$/.test(s);
const field=s=>typeof s==='string'&&!/[\r\n\0]/.test(s);
const truth=s=>s!==''&&s!=='0';
const fields=['name','shortname','dealrate','feerate','member','comment','appeal','needed','leadt','leader','url'];
const limits=[30,12,4,4,6,30,120,120,10,10,60];
export function reviewGuildEstablishment(sources){
  for(const [key,sha] of Object.entries(pins)){
    const s=sources?.[key];
    if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+key);
  }
  const review=Object.freeze({committable:false});reviews.add(review);return review;
}
function cut(s,size){
  if([...s].length<size)return s;
  const t=[...s].slice(0,size).join('');
  // Preserve the legacy CutStr trailing lead-byte pattern even on decoded text.
  return /^(?:(?:[\x81-\x9F|\xE0-\xEF][\x40-\x7E|\x80-\xFC])|(?:[\x20-\x7E\xA0-\xDF]))*[\x81-\x9F|\xE0-\xEF]$/.test(t)?[...t].slice(0,-1).join(''):t;
}
const escape=s=>s.replaceAll('&','&amp;').replaceAll('>','&gt;').replaceAll('<','&lt;');
const image=s=>s===null||typeof s==='string'&&s!==''&&Buffer.from(s,'base64').toString('base64')===s;
function readDefinition(text){
  const entries=[];
  for(const line of text.split('\n').slice(0,-1)){
    const s=line.replace(/#.*$/,'').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
    const m=/^\s*(.+?)\s*=\s*(.+?)\s*$/.exec(s);if(m)entries.push([m[1],m[2]]);
  }
  return Object.fromEntries(entries);
}
export function projectGuildEstablishment({reviewed,street,actor,townOrder,existing,command}){
  if(!reviews.has(reviewed)||!town(street)||!record(actor)||!safeId(actor.id)||!record(existing)||!(existing.definitionText===null||typeof existing.definitionText==='string')||!image(existing.imageBase64)||!Array.isArray(townOrder)||townOrder.some(t=>!town(t)||fields.includes(t))||new Set(townOrder).size!==townOrder.length||!record(command)||!['make','edit'].includes(command.mode)||typeof command.code!=='string'||!/^[a-z]+$/.test(command.code)||!record(command.fields)||!record(command.representatives)||!image(command.imageBase64)||typeof command.mime!=='string')fail('reviewed establishment context required');
  if(Object.keys(command.representatives).some(t=>!townOrder.includes(t))||Object.values(command.representatives).some(n=>n!==''&&!safeId(n)))fail('reviewed representative selections required');
  const q={...command.fields,leadt:street,leader:String(actor.id)};
  if(q.url==='')q.url='http://';
  for(let i=0;i<fields.length;i++){
    const key=fields[i];if(!field(q[key])||!truth(q[key]))fail('required field '+key);
    q[key]=escape(cut(q[key],limits[i]));
  }
  if(q.url==='http://')q.url='';
  for(const k of ['dealrate','feerate'])if(!/^\d+$/.test(q[k])||Number(q[k])<10||Number(q[k])>500)fail('invalid rate '+k);
  const upload=command.imageBase64!==null&&Buffer.from(command.imageBase64,'base64').toString('latin1')!=='0';
  if(command.mode!=='edit'&&!upload)fail('image required');
  if(command.mode!=='edit'&&existing.definitionText!==null)fail('duplicate code');
  if(upload&&!/gif/i.test(command.mime))fail('image MIME');
  const definitionText=fields.map(k=>k+'='+q[k]+'\n').concat(townOrder.map(t=>t+'='+(Object.hasOwn(command.representatives,t)?command.representatives[t]:'')+'\n')).join('');
  const next=structuredClone(actor);if(command.mode!=='edit')next.guild=command.code;
  return {actor:next,definitionText,definition:readDefinition(definitionText),imageBase64:upload?command.imageBase64:existing.imageBase64,
    publication:['common-lock','read','auth',...(upload?['image-live-write']:[]),'definition-live-write','common-unlock',...(command.mode!=='edit'?['street-lock','read','auth','street-stage','street-commit','street-unlock']:[])],committable:false,worldStateWritten:false};
}
