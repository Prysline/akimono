/** Reviewed common entry file and membership handler subset, no publication. */
import {createHash} from 'node:crypto';
const pins={reader:'b18dd3166709e270e5cb2d525ce404bca80551ca',entry:'f28cdcc1778534cbf1c84195df7ab749519be5a6'};
const reviews=new WeakSet();
const fail=m=>{throw new RangeError('R4 guild entry: '+m)};
const id=n=>Number.isSafeInteger(n)&&n>0;
const code=s=>typeof s==='string'&&/^[A-Za-z][A-Za-z0-9_]*$/.test(s);
const record=x=>x!==null&&typeof x==='object'&&Object.getPrototypeOf(x)===Object.prototype;
const own=(x,k)=>Object.hasOwn(x,k)?x[k]:undefined;
export function reviewGuildEntry(sources){
  for(const [k,sha] of Object.entries(pins)){
    const s=sources?.[k];
    if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k);
  }
  const review=Object.freeze({committable:false});reviews.add(review);return review;
}
function readRows(text){
  if(typeof text!=='string'||text!==''&&!text.endsWith('\n'))fail('canonical existing entry file required');
  return text.split('\n').slice(0,-1).map(line=>{
    const m=/^([1-9]\d*),(0|[1-9]\d*),([A-Za-z][A-Za-z0-9_]*),([1-9]\d*),([A-Za-z][A-Za-z0-9_]*)$/.exec(line);
    if(!m||!id(Number(m[1]))||!Number.isSafeInteger(Number(m[2]))||!id(Number(m[4])))fail('unreviewed entry row');
    return {no:Number(m[1]),tm:Number(m[2]),town:m[3],id:Number(m[4]),guild:m[5]};
  });
}
const writeRows=rows=>rows.map(r=>[r.no,r.tm,r.town,r.id,r.guild].join(',')+'\n').join('');
export function projectGuildEntry({reviewed,street,actor,definitions,townOrder,entryText,now,guildbattle,command}){
  if(!reviews.has(reviewed)||!code(street)||!record(actor)||!id(actor.id)||!(actor.guild===''||code(actor.guild))||typeof actor.shopname!=='string'||!record(definitions)||!Array.isArray(townOrder)||townOrder.some(t=>!code(t))||new Set(townOrder).size!==townOrder.length||!id(now)||typeof guildbattle!=='boolean'||!record(command))fail('reviewed entry context required');
  for(const [k,d] of Object.entries(definitions)){
    if(!code(k)||!record(d)||typeof d.name!=='string'||typeof d.member!=='string'||!code(d.leadt)||!id(d.leader)||!record(d.representatives)||Object.values(d.representatives).some(n=>!id(n)))fail('unreviewed definition');
  }
  const raw=readRows(entryText),active=raw.filter(r=>r.tm>=now),next=structuredClone(actor);
  let rows,logCalls=[],publication;
  if(command.kind==='grant'){
    const d=own(definitions,actor.guild);
    if(!actor.guild||!d||!(d.leadt===street&&d.leader===actor.id||own(d.representatives,street)===actor.id))fail('not authorized');
    if(!record(command.selections)||Object.keys(command.selections).some(t=>!townOrder.includes(t))||Object.values(command.selections).some(n=>n!==0&&!id(n)))fail('unreviewed target selection');
    const town=townOrder.filter(t=>own(command.selections,t)>0).at(-1),target=town&&own(command.selections,town);
    if(!target)fail('target required');
    if(active.some(r=>r.guild===actor.guild&&r.town===town&&r.id===target))fail('duplicate invitation');
    // ReadEntry keeps expired slots in Ecount. The first original slot, not the first surviving row, controls new numbering.
    const no=raw[0]?.tm>=now?raw[0].no+1:1,tm=now+172800;
    if(!id(no)||!id(tm))fail('entry overflow');
    rows=[{no,tm,town,id:target,guild:actor.guild},...active];
    publication=['common-stage','common-commit','common-unlock'];
  }else if(command.kind==='join'){
    if(actor.guild||guildbattle)fail('join refused');
    if(!code(command.guild)||!active.some(r=>r.town===street&&r.id===actor.id&&r.guild===command.guild))fail('no invitation');
    rows=active.filter(r=>r.town!==street||r.id!==actor.id);
    const d=own(definitions,command.guild);
    logCalls=[[1,0,{key:'%1がギルド「%2」の%3となりました。',args:[actor.shopname,d?.name??null,d?.member??null]}]];
    next.guild=command.guild;
    publication=['renew','street-stage','street-commit','street-unlock','common-stage','common-commit','common-unlock'];
  }else fail('unknown entry command');
  return {actor:next,entryText:writeRows(rows),logCalls,publication,committable:false,worldStateWritten:false};
}
