/** Read-only original arena sports newspaper (slime mode=info). */
import {createHash} from 'node:crypto';
const pins={info:'5c63865d741f4118659f42590a59ffcc76b9bdec',page:'aa8b04dcec124276cb5b4eeeba650137b4449779',time:'e164091d4dc6de084bb4770e0b9b4bf6005d9f3f',config:'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0'};
const reviews=new WeakSet(),fail=m=>{throw new RangeError('R4 dragon news: '+m)};
export function reviewDragonNews(sources){
  for(const [k,sha] of Object.entries(pins)){
    const s=sources?.[k];if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k);
  }
  const r=Object.freeze({committable:false});reviews.add(r);return r;
}
const popup=[['スケジュール','sche'],['競争竜一覧','dra'],['隠居竜一覧','pr'],['牧場一覧','rc'],['厩舎一覧','st'],['騎手一覧','jk']];
const lines=s=>s?.match(/[^\n]*\n|[^\n]+$/g)??[];
const nat=s=>/^(0|[1-9]\d*)$/.test(s)&&Number.isSafeInteger(Number(s));
function stamp(tm){
  if(!tm)return '--/--';
  const d=new Date((tm+32400)*1000),pad=n=>String(n).padStart(2,'0');
  if(!Number.isFinite(d.getTime()))fail('unsupported timestamp');
  return pad(d.getUTCMonth()+1)+'/'+pad(d.getUTCDate())+' '+pad(d.getUTCHours())+':'+pad(d.getUTCMinutes());
}
export function projectDragonNews({reviewed,log0,log1,mobile,page=0}){
  const text=v=>v===null||typeof v==='string'&&!v.includes('\0');
  if(!reviews.has(reviewed)||!text(log0)||!text(log1)||typeof mobile!=='boolean'||!Number.isSafeInteger(page))fail('reviewed trusted log snapshot required');
  const raw=[...lines(log0),...lines(log1)];
  const empty=raw.length===0;
  if(empty)raw.push('0\t0\t情報はありません\n');
  const perPage=mobile?5:25,max=Math.trunc((raw.length-1)/perPage);
  page=Math.min(max,Math.max(0,page));
  const start=page*perPage,end=Math.min(raw.length-1,start+perPage-1);
  const entries=raw.slice(start,end+1).map(line=>{
    const [tm,mode,message='']=line.split('\t');
    if(!nat(tm)||!nat(mode))fail('unreviewed source log row');
    const type=Number(mode),timestamp=Number(tm);
    // Perl chop removes the last Unicode character, not just a newline.
    const sourceMessage=Array.from(message).slice(0,-1).join('');
    return {timestamp,dateLabel:stamp(timestamp),type,category:type===1?'登竜':type===2?'重賞':null,sourceMessage};
  });
  return {popups:popup.map(([label,mode])=>({label,mode,route:'slime-l',target:'_blank',width:760,height:580})),
    pageParam:'lpg',pageInfo:[page,start,end,(page+1)*perPage<raw.length?page+1:0,page>0?page-1:-1,max],
    entries,empty,committable:false};
}
