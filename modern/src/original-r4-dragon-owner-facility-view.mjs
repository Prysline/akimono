/** Private original stable/ranch read projections. No IO, transaction or auth authority. */
import {createHash} from 'node:crypto';
const pins={stable:'bcc6f2fd82cb16c5c67c8b20f1b89365f8ec96d7',ranch:'9880bcc094ff347f4f12b42076c62ac461a59a08',dragon:'76bb00f247733630cbcc374a82f693638f653b71',readA:'01110533ae1a223f687f13b02f0aaeebd30c3155',readB:'1b13a1a855490c80c88b0fa117676c68b6440753',time:'e164091d4dc6de084bb4770e0b9b4bf6005d9f3f'};
const reviews=new WeakMap(),fail=m=>{throw new RangeError('R4 dragon owner facility view: '+m);};
const nat=n=>Number.isSafeInteger(n)&&n>=0,positive=n=>nat(n)&&n>0;
const n=s=>{if(s===undefined||s==='')return 0;if(typeof s!=='string'||!/^-?\d+$/.test(s)||s.endsWith('\n')||!Number.isSafeInteger(Number(s)))fail('unreviewed numeric source field');return Number(s);};
const lines=s=>{if(s===null)return [];if(typeof s!=='string'||s.includes('\0'))fail('trusted source file required');return (s.match(/[^\n]*\n|[^\n]+$/g)??[]).map(x=>Array.from(x).slice(0,-1).join(''));};
const val=(a,i)=>a.at(i)??'';
const VALUE=['Ｅ','Ｄ','Ｃ','Ｂ','Ａ','Ｓ','Ｓ'],EVALUE=['×','△','○','◎','◎'];
const grade=(r,k)=>val(VALUE,Math.trunc(n(r[k])/100*6));
const con=r=>val(EVALUE,Math.trunc(n(r.con)/100*4));
const age=t=>{const h=Math.trunc(t/3600);return h<24?h+'時間':Math.trunc(h/24)+'日';};
const wins=r=>['g1win','g2win','g3win','sdwin'].map(k=>n(r[k])).join(' - ');
const amount=r=>n(r.prize)+'万';
const apt=r=>Math.max(1200,Math.trunc((n(r.apt)-n(r.fl)*8-150)/10)*10)+'～'+Math.min(3200,Math.trunc((n(r.apt)+n(r.fl)*8+150)/10)*10);
const image=(r,old=false)=>'dragon'+(n(r.fm)+1+(old?2:0))+(n(r.color)+1);
const levels=['sp','sr','ag','pw','hl','fl'];
const row=(cells,imageKey=null,link=null)=>({cells:cells.map(s=>String(s??'')),imageKey,link});
const select=(name,labels)=>({name,type:'select',options:labels.map((label,value)=>({value,label}))});
const nameField=()=>({name:'name',type:'text',size:20});
const msg=(key,...args)=>({key,args});
const form=(mode,code,titleKey,submitKey,fields,advice)=>({route:'slime-s',backRoute:'slime',mode,code,titleKey,submitKey,fields,advice});
const table=(key,columns,rows)=>({key,columns,rows});
const keys={st:'ST',rc:'RC',dra:'DR',pr:'PR'};
export function reviewDragonOwnerFacilityView(sources){
  for(const [k,sha] of Object.entries(pins)){const s=sources?.[k];if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k);}
  const fields={},labels={};
  for(const [k,v] of Object.entries(keys)){const m=sources.dragon.match(new RegExp('@'+v+'namelist=qw\\(([\\s\\S]*?)\\);'));if(!m)fail('source schema missing');fields[k]=m[1].trim().split(/\s+/);}
  for(const k of ['FM','EMPHA']){const m=sources.dragon.match(new RegExp('@'+k+'=\\(([\\s\\S]*?)\\);'));if(!m)fail('source labels missing');labels[k]=[...m[1].matchAll(/l\(['"]([^'"]+)['"]\)/g)].map(x=>x[1]);}
  for(const [k,src] of [['LARGE',sources.stable],['dist',sources.ranch]]){const m=src.match(new RegExp('@'+k+'=\\(([\\s\\S]*?)\\);'));if(!m)fail('source options missing');labels[k]=[...m[1].matchAll(/l\(['"]([^'"]+)['"]\)/g)].map(x=>x[1]);}
  if(labels.FM.length!==2||labels.EMPHA.length!==6||labels.LARGE.length!==6||labels.dist.length!==3)fail('source option count');
  const token=Object.freeze({committable:false});reviews.set(token,{fields,labels});return token;
}
function read(text,fields){return lines(text).map(line=>{const f=line.split(',');return Object.fromEntries(fields.map((k,i)=>[k,f[i]??'']));});}
function target(r,mode){const dr=n(r.no);if(!positive(dr))fail('invalid source detail ID');return {route:'slime',mode,dr};}
/** D supplies a revision-consistent authoritative read snapshot; never accept these fields from HTTP bodies. */
export function projectDragonOwnerFacilityView({review,mode,now,street,activeShopIds,actorId,files={}}){
  const cfg=reviews.get(review);if(!cfg||!['stable','ranch'].includes(mode)||!nat(now)||typeof street!=='string'||!street||!positive(actorId)||!Array.isArray(activeShopIds)||!activeShopIds.every(positive)||new Set(activeShopIds).size!==activeShopIds.length||!activeShopIds.includes(actorId)||!files||typeof files!=='object'||Array.isArray(files))fail('trusted reviewed owner snapshot required');
  const {fields,labels:L}=cfg,ids=new Set(activeShopIds.map(String)),rows=k=>read(Object.hasOwn(files,k)?files[k]??null:null,fields[k]);
  const mine=r=>r!==null&&r.town===street&&n(r.owner)===actorId;
  const active=r=>r.town!==street||ids.has(r.owner);
  const out={mode,committable:false,titleKey:mode==='stable'?'厩舎':'牧場',intro:null,tables:[],forms:[],notices:[]};
  if(mode==='stable'){
    const raw=rows('st'),owned=raw.filter(active).filter(mine).at(-1);
    if(!owned){
      out.intro={speakerKey:'ドラゴン調教師',imageKey:'slime3',messages:[msg('自分の厩舎を持っていないようだな。'),msg('厩舎を持てば，自分や他人のドラゴンを調教することができる。')]};
      if(raw.length<10)out.forms.push(form('stedit','new','厩舎設立','設立',[select('emp',L.EMPHA),nameField()],[msg('厩舎を設立するには，資金<b>%1</b>がかかります。',500000),msg('維持費が最低でも毎日<b>%1</b>かかります。',100000),msg('調教方針を選べます。後から変更することはできません。'),msg('厩舎は全体で <b>%1</b>舎の上限があり，満杯になると設立できません。',10)]));
      else out.notices.push({sectionKey:'厩舎設立',message:msg('定数に達しているため，これ以上設立できません。')});
      return out;
    }
    const level=levels.reduce((sum,k)=>sum+n(owned[k]),0),limit=n(owned.birth)+50*86400-now,maintenance=level*100000;
    const summary=row([owned.name,val(L.EMPHA,n(owned.emp)),...['tr','con','wt'].map(k=>grade(owned,k)),...levels.map(k=>val(EVALUE,n(owned[k]))),wins(owned),maintenance,'あと '+(limit>0?age(limit):'わずか')]);
    // Money formatter is delegated to D/F. Numeric amount is not a second quote.
    summary.moneyCells=[{index:12,amount:maintenance}];
    out.tables.push(table('stable',['名称','方針','調教','体調','体重','コース','併竜','坂路','ダート','温泉','繋養','成績','維持費','老朽化'],[summary]));
    const stableNo=n(owned.no);if(!positive(stableNo))fail('invalid source stable ID');
    const boarded=rows('dra').filter(d=>n(d.stable)===stableNo).map(d=>row([d.name,age(now-n(d.birth)),val(L.FM,n(d.fm)),con(d),d.wt,amount(d),wins(d)],image(d)));
    out.tables.push(table('入厩中の竜',['名称','年齢','性別','体調','体重','総賞金','成績'],boarded));
    if(Math.trunc((now-n(owned.birth))/86400/2)+1<level)out.notices.push({sectionKey:'厩舎増築',message:msg('まだこれ以上の増築はできません')});
    else out.forms.push(form('stedit','large','厩舎増築','増築',[select('lar',L.LARGE)],[msg('厩舎を増築するには，資金<b>%1</b>がかかります。',500000),msg('増築すると維持費が多くかかるようになります。'),msg('預託料の収入より維持費が上回ると，赤字になるのでご注意ください。')]));
    return out;
  }
  const ranches=rows('rc').map(r=>{const divisor=now-n(r.birth)+1;if(!divisor)fail('source division by zero');return {...r,aprize:Math.trunc(n(r.prize)/divisor*86400*2)};});
  const ranch=ranches.filter(active).filter(mine).at(-1);
  if(!ranch){
    out.intro={speakerKey:'ドラゴン老師',imageKey:'slime1',messages:[msg('自分の牧場を持っていないようじゃな。'),msg('牧場を持てば，自分のドラゴンを育てることができる。')]};
    out.forms.push(form('rcedit','new','牧場設立','設立',[nameField()],[msg('牧場を設立するには，資金<b>%1</b>がかかります。',1000000),msg('ドラゴンの育成には別途さらに資金がかかるので，余裕があるか考えてください。')]));
    return out;
  }
  out.tables.push(table('ranch',['名称','創立','平均賞金','総賞金','成績'],[row([ranch.name,age(now-n(ranch.birth)),ranch.aprize+'万',amount(ranch),wins(ranch)])]));
  const dragons=rows('dra').filter(mine),parents=rows('pr').filter(active).filter(mine).filter(r=>n(r.fm)!==0);
  if(dragons.length)out.tables.push(table('所有競争竜',['名称','年齢','性別','スピ','勝負','瞬発','パワ','体調','体重','距離適性','総賞金','成績'],dragons.map(d=>row([d.name,age(now-n(d.birth)),val(L.FM,n(d.fm)),...['sp','sr','ag','pw'].map(k=>grade(d,k)),con(d),d.wt,apt(d),amount(d),wins(d)],image(d),target(d,'detail')))));
  else out.notices.push({sectionKey:'所有競争竜',message:msg('所有の競争竜はありません')});
  if(parents.length)out.tables.push({...table('所有繁殖%1竜',['名称','年齢','遺伝','スピ','勝負','瞬発','パワ','健康','柔軟','距離適性','現役賞金','現役成績'],parents.map(d=>row([d.name,age(now-n(d.birth)),...['hr',...levels].map(k=>grade(d,k)),apt(d),amount(d),wins(d)],image(d,true),target(d,'pr')))),titleArgs:[L.FM[1]]});
  if(dragons.length<3)out.forms.push(form('dredit','new','ドラゴン購入','購入',[select('fm',L.FM),select('dist',L.dist),nameField()],[msg('競争竜は，<b>%1</b>頭まで持つことができます。',3),msg('購入するには，資金<b>%1</b>がかかります。',500000),msg('名前は，<b>全角カタカナ10文字</b>以内です。')]));
  return out;
}
