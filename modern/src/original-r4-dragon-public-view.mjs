/** Original slime-l and race status public views. No file IO, dispatch or authority. */
import {createHash} from 'node:crypto';
const pins={list:'a1f615108e614196255097c03aff13ea0f09081f',status:'9694f6c4d704382c56f66e3e9ecb09fc44a3c119',dragon:'76bb00f247733630cbcc374a82f693638f653b71',readA:'01110533ae1a223f687f13b02f0aaeebd30c3155',readB:'1b13a1a855490c80c88b0fa117676c68b6440753',readC:'f363bcdab6022581976b6b99dd5e095b51f5f238',page:'aa8b04dcec124276cb5b4eeeba650137b4449779',time:'e164091d4dc6de084bb4770e0b9b4bf6005d9f3f',config:'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0'};
const reviews=new WeakMap(),fail=m=>{throw new RangeError('R4 dragon public view: '+m)};
const nat=n=>Number.isSafeInteger(n)&&n>=0;
const truth=s=>s!==undefined&&s!==null&&s!==''&&s!=='0'&&s!==0;
const n=s=>{if(s===undefined||s==='')return 0;if(typeof s!=='string'||!/^-?\d+$/.test(s)||s.endsWith('\n')||!Number.isSafeInteger(Number(s)))fail('unreviewed numeric source field');return Number(s);};
const lines=s=>{if(s===null)return [];if(typeof s!=='string'||s.includes('\0'))fail('trusted source file required');return (s.match(/[^\n]*\n|[^\n]+$/g)??[]).map(x=>Array.from(x).slice(0,-1).join(''));};
const val=(a,i)=>a.at(i)??'';
const str=s=>s??'';
const amount=s=>n(s)+'万';
const age=(now,birth)=>{const h=Math.trunc((now-n(birth))/3600);return h<24?h+'時間':Math.trunc(h/24)+'日';};
const pad=n=>String(n).padStart(2,'0');
function stamp(t){if(!t)return '--/--';const d=new Date((t+32400)*1000);if(!Number.isFinite(d.getTime()))fail('unsupported timestamp');return pad(d.getUTCMonth()+1)+'/'+pad(d.getUTCDate())+' '+pad(d.getUTCHours())+':'+pad(d.getUTCMinutes());}
const wins=r=>['g1win','g2win','g3win','sdwin'].map(k=>n(r[k]));
const total=r=>wins(r).reduce((a,b)=>a+b,0);
const result=r=>wins(r).join(' - ');
const grade=(r,k)=>val(['Ｅ','Ｄ','Ｃ','Ｂ','Ａ','Ｓ','Ｓ'],Math.trunc(n(r[k])/100*6));
const effect=['×','△','○','◎','◎'];
const apt=r=>Math.max(1200,Math.trunc((n(r.apt)-n(r.fl)*8-150)/10)*10)+'～'+Math.min(3200,Math.trunc((n(r.apt)+n(r.fl)*8+150)/10)*10);
const image=(r,old=false)=>'dragon'+(n(r.fm)+1+(old?2:0))+(n(r.color)+1);
const cmp=(a,b)=>{const x=Array.from(str(a),s=>s.codePointAt(0)),y=Array.from(str(b),s=>s.codePointAt(0));for(let i=0;i<Math.min(x.length,y.length);i++)if(x[i]!==y[i])return x[i]-y[i];return x.length-y.length;};
const keys={dra:'DR',pr:'PR',rc:'RC',st:'ST',jk:'JK',rd:'RD'};
export function reviewDragonPublicView(sources){
  for(const [k,sha] of Object.entries(pins)){const s=sources?.[k];if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k);}
  const src=sources.dragon,fields={},labels={};
  for(const [k,v] of Object.entries(keys)){const m=src.match(new RegExp('@'+v+'namelist=qw\\(([\\s\\S]*?)\\);'));if(!m)fail('source schema missing');fields[k]=m[1].trim().split(/\s+/);}
  for(const k of ['RACERANK','FIELDTYPE','RACETERM','FM','EMPHA','JKSP','STRATE']){const m=src.match(new RegExp('@'+k+'=\\(([\\s\\S]*?)\\);'));if(!m)fail('source labels missing');labels[k]=[...m[1].matchAll(/l\(['"]([^'"]+)['"]\)/g)].map(x=>x[1]);}
  const matches=[...src.matchAll(/^\s*\[l\("([^"]+)"\),\s*,?(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\],/gm)];
  if(matches.length!==24)fail('source race table missing');const races=matches.map(m=>[m[1],...m.slice(2).map(Number)]);
  const token=Object.freeze({committable:false});reviews.set(token,{fields,labels,races:[races.slice(0,12),races.slice(12)]});return token;
}
function rows(text,fields){return lines(text).map(line=>{const f=line.split(',');return Object.fromEntries(fields.map((k,i)=>[k,f[i]??'']));});}
function row(cells,imageKey=null){return {cells:cells.map(s=>String(s??'')),imageKey};}
function pageInfo(page,count,mobile){const size=mobile?5:25,max=Math.max(0,Math.trunc((count-1)/size));page=Math.min(max,Math.max(0,page));const start=page*size,end=Math.min(count-1,start+size-1);return [page,start,end,(page+1)*size<count?page+1:0,page>0?page-1:-1,max];}
function commonDragon(r,now,L,old=false){return [str(r.name),age(now,r.birth),(old?(truth(r.fm)?'繁殖':'種'):'')+val(L.FM,n(r.fm)),...['sp','sr','ag','pw'].map(k=>grade(r,k)),...(old?[grade(r,'hl'),grade(r,'fl')]:[val(effect,Math.trunc(n(r.con)/100*4)),str(r.wt)]),apt(r)];}
function tableRace(r,L){return row([r[0],L.RACERANK[r[1]],r[2]?r[2]+'万毎':' ',L.FIELDTYPE[r[3]],r[4]?'あり':' ',r[5],r[6]+'万',r[7]+'万',r[8]+'万',r[9]]);}
function readRace(text,fields){const [head,...rest]=lines(text);const h=(head??'0,0,0').split(',');return {phase:n(h[0]),index:n(h[1]),weather:n(h[2]),entries:rest.map(line=>{const f=line.split(',');return Object.fromEntries(fields.map((k,i)=>[k,f[i]??'']));})};}
/** Inputs are an authoritative read snapshot supplied by D, never HTTP body fields. */
export function projectDragonPublicView({review,mode,now,street,activeShopIds,townNames={},files={},mobile=false,page=0,code=0,drTime=null}){
  const cfg=reviews.get(review);if(!cfg||!['sche','dra','pr','rc','st','jk','rd','status'].includes(mode)||!nat(now)||typeof street!=='string'||!street||!Array.isArray(activeShopIds)||activeShopIds.some(id=>!nat(id)||id===0)||typeof mobile!=='boolean'||!Number.isSafeInteger(page)||![0,1].includes(code)||!(drTime===null||Array.isArray(drTime)&&drTime.length===3&&drTime.every(nat)))fail('trusted reviewed snapshot required');
  const {fields,labels:L,races}=cfg,base={mode,committable:false};
  if(mode==='sche')return {...base,clockRows:(drTime??[]).map((t,i)=>row([i?'次の'+L.RACETERM[i-1]+'変動時刻':'次の調教時刻',stamp(t)])),raceGroups:races.map((rr,i)=>({term:L.RACETERM[i],rows:rr.map(r=>tableRace(r,L))}))};
  if(mode==='rd'||mode==='status'){
    const race=readRace(files.race??null,fields.rd);
    if(mode==='rd'){
      const dr=new Map(rows(files.dra??null,fields.dra).map(r=>[r.no,r]));
      return {...base,rows:race.entries.filter(r=>truth(r.name)&&dr.has(r.dr)).map(r=>{const d=dr.get(r.dr);return row(commonDragon(d,now,L),image(d));})};
    }
    const r=races[code][race.index];if(!r)fail('unsupported source race index');
    const clock=stamp(drTime?.[code+1]??0),phase=race.phase>1?'running':race.phase===1?'scheduled':'registration';
    const commentary=files.commentary??null;if(commentary!==null&&(typeof commentary!=='string'||commentary.includes('\0')))fail('trusted commentary required');
    const statusLabel=phase==='running'?'ただいまレースが行われています。':phase==='scheduled'?'出走ドラゴンは以下のとおり決定いたしました。':'ただいま出走登録を受付中です。';
    const nextLabel=(phase==='running'?'次の実況放送は ':phase==='scheduled'?'レース開始時刻は ':'登録締め切りは ')+clock+' です。';
    return {...base,term:L.RACETERM[code],phase,statusLabel,nextTimeLabel:clock,nextLabel,race:{name:r[0],rank:L.RACERANK[r[1]],field:L.FIELDTYPE[r[3]],distance:r[5],capacity:r[9],handicapLabel:r[2]?r[2]+'万毎':'なし',prizeLabel:r.slice(6,9).map(v=>v+'万').join(' - ')},weatherImageKey:'dragonw'+(race.weather+1),detail:{route:'slime-l',mode:'rd',rcode:code,target:'_blank',width:760,height:580},rows:race.entries.filter(r=>truth(r.name)).map(d=>row([d.no,d.name,age(now,d.birth),val(L.FM,n(d.fm)),r[2]?Math.trunc(n(d.prize)/r[2]):0,d.rcname,d.stname,d.jkname,amount(d.prize),val(L.STRATE,n(d.strate)),d.pop,pad(Math.trunc(n(d.time)/60))+'.'+pad(((n(d.time)%60)+60)%60)],image(d))),sourceCommentary:truth(commentary)?commentary:null};
  }
  const ids=new Set(activeShopIds.map(String));
  let all=rows(files[mode]??null,fields[mode]);
  // Original ReadDragon does not filter; other readers undef the slot after their calculation.
  if(mode==='st'||mode==='jk')all=all.map(r=>({...r,win:total(r)}));
  if(mode==='rc')all=all.map(r=>{const divisor=now-n(r.birth)+1;if(!divisor)fail('source division by zero');return {...r,aprize:Math.trunc(n(r.prize)/divisor*86400*2)};});
  if(mode!=='dra')all=all.map(r=>r.town===street&&!ids.has(r.owner)?{}:r);
  if(mode==='dra')all.sort((a,b)=>cmp(a.name,b.name)).sort((a,b)=>n(b.prize)-n(a.prize));
  if(mode==='pr')all.sort((a,b)=>n(b.prize)-n(a.prize)).sort((a,b)=>n(a.fm)-n(b.fm));
  if(mode==='rc')all.sort((a,b)=>(b.aprize??0)-(a.aprize??0));
  if(mode==='st'||mode==='jk')all.sort((a,b)=>(b.win??0)-(a.win??0));
  const pg=pageInfo(page,all.length,mobile),visible=all.slice(pg[1],pg[2]+1).filter(r=>truth(r.name));
  const displayed=visible.map(r=>{
    if(mode==='dra'||mode==='pr')return row([...commonDragon(r,now,L,mode==='pr'),amount(r.prize),result(r)],image(r,mode==='pr'));
    if(mode==='rc')return row([r.name,Object.hasOwn(townNames,r.town)?townNames[r.town]:'',age(now,r.birth),r.aprize+'万',amount(r.prize),result(r)]);
    if(mode==='st')return row([r.name,val(L.EMPHA,n(r.emp)),...['tr','con','wt'].map(k=>grade(r,k)),...['sp','sr','ag','pw','hl','fl'].map(k=>val(effect,n(r[k]))),result(r)]);
    return jockeyRow(r,now,L);
  });
  return {...base,pageParam:'pg',pageInfo:pg,pageControlCopies:pg[5]?(mode==='dra'||mode==='pr'?1:2):0,rows:displayed};
}
function jockeyRow(r,now,L){return row([r.name,age(now,r.birth),grade(r,'ahead'),grade(r,'back'),result(r),val(L.JKSP,n(r.sp)),val(['待機','落選','登録','出走'],n(r.race))]);}
const ownerJockeyReviews=new WeakMap();
/** Private owner view, separate from the public mode allowlist. */
export function reviewDragonOwnerJockey(sources){
  const publicReview=reviewDragonPublicView(sources),s=sources.jock;
  if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!=='c44c99613f637b704bac7b9dd71907bc330536c1')fail('source drift jock');
  const config=k=>{const m=sources.dragon.match(new RegExp('\\$'+k+'=(\\d+);'));if(!m)fail('source config missing '+k);return Number(m[1]);};
  const token=Object.freeze({committable:false});ownerJockeyReviews.set(token,{...reviews.get(publicReview),max:config('JKmax'),cost:config('JKest')});return token;
}
/** D supplies authenticated actor ID and trusted read snapshot; not request body values. */
export function projectDragonOwnerJockey({review,now,street,actorId,activeShopIds,jockeyFile=null}){
  const cfg=ownerJockeyReviews.get(review);
  if(!cfg||!nat(now)||typeof street!=='string'||!street||!nat(actorId)||actorId===0||!Array.isArray(activeShopIds)||activeShopIds.some(id=>!nat(id)||id===0)||!activeShopIds.includes(actorId))fail('authenticated owner snapshot required');
  const all=rows(jockeyFile,cfg.fields.jk),ids=new Set(activeShopIds.map(String));
  // ReadJock retains raw slots, overwrites MYJK on each qualifying own row.
  const mine=all.filter(r=>r.town===street&&ids.has(r.owner)&&n(r.owner)===actorId).at(-1);
  const base={mode:'jock',committable:false};
  if(mine)return {...base,state:'owned',row:jockeyRow(mine,now,cfg.labels),form:null,messages:[]};
  const messages=['騎手を雇っていないんだな。','騎手を雇えば，自分や他人のドラゴンの力をレースで引き出せる。'];
  if(all.length>=cfg.max)return {...base,state:'full',row:null,form:null,messages:[...messages,'定員に達しているため，これ以上雇用できません。']};
  return {...base,state:'available',row:null,messages,form:{route:'slime-s',back:'slime',mode:'jkedit',code:'new',nameSize:20,submit:'雇用',cost:cfg.cost,capacity:cfg.max}};
}
