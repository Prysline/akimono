/** Original private competition/parent dragon pages; no IO, mutations or authentication authority. */
import {createHash} from 'node:crypto';
const pins={detail:'9a551012de3a3f380288010fe402a14e6ce096c0',pr:'6dd166a653715e3aa24bb303dff399b0299012b1',dragon:'76bb00f247733630cbcc374a82f693638f653b71',readA:'01110533ae1a223f687f13b02f0aaeebd30c3155',readB:'1b13a1a855490c80c88b0fa117676c68b6440753',time:'e164091d4dc6de084bb4770e0b9b4bf6005d9f3f',config:'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0'};
const reviews=new WeakMap(),fail=m=>{throw new RangeError('R4 dragon owner detail view: '+m);};
const nat=n=>Number.isSafeInteger(n)&&n>=0,positive=n=>nat(n)&&n>0;
const n=s=>{if(s===undefined||s==='')return 0;if(typeof s!=='string'||!/^-?\d+$/.test(s)||s.endsWith('\n')||!Number.isSafeInteger(Number(s)))fail('unreviewed numeric source field');return Number(s);};
const val=(a,i)=>a.at(i)??'';
const age=t=>{const h=Math.trunc(t/3600);return h<24?h+'時間':Math.trunc(h/24)+'日';};
const pad=n=>String(n).padStart(2,'0');
function stamp(t){if(!t)return '--/--';const d=new Date((t+32400)*1000);if(!Number.isFinite(d.getTime()))fail('unsupported timestamp');return pad(d.getUTCMonth()+1)+'/'+pad(d.getUTCDate())+' '+pad(d.getUTCHours())+':'+pad(d.getUTCMinutes());}
const apt=r=>Math.max(1200,Math.trunc((n(r.apt)-n(r.fl)*8-150)/10)*10)+'～'+Math.min(3200,Math.trunc((n(r.apt)+n(r.fl)*8+150)/10)*10)+'km';
function strate(r){const sr=n(r.sr),ag=n(r.ag);return sr>ag*3&&sr>80?0:sr>ag*1.2?1:ag>sr*3&&ag>80?3:ag>sr*1.2?2:4;}
const wins=r=>['g1win','g2win','g3win','sdwin'].map(k=>n(r[k])).join(' - ');
const image=(r,old)=>'dragon'+(n(r.fm)+1+(old?2:0))+(n(r.color)+1);
const levels=['sp','sr','ag','pw','hl','fl'];
const EVALUE=['×','△','○','◎','◎'];
const msg=(key,...args)=>({key,args});
const select=(name,options)=>({name,type:'select',options});
const text=(name,size)=>({name,type:'text',size});
const opts=labels=>labels.map((label,value)=>({value,label}));
// Original readers retain undefined slots. A blank source option is observable but never an actionable ID.
function option(r){const raw=r?.no??'';if(raw==='')return {value:null,label:r?.name??'',disabled:true};const value=n(raw);if(!positive(value))fail('invalid source option ID');return {value,label:r.name??''};}
function form(dr,mode,code,titleKey,submitKey,fields,advice){return {route:'slime-s',backRoute:'slime',mode,code,hidden:{dr},titleKey,submitKey,fields,advice};}
function read(s,fields){if(s===null)return [];if(typeof s!=='string'||s.includes('\0'))fail('trusted source file required');return (s.match(/[^\n]*\n|[^\n]+$/g)??[]).map(line=>{const f=Array.from(line).slice(0,-1).join('').split(',');return Object.fromEntries(fields.map((k,i)=>[k,f[i]??'']));});}
export function reviewDragonOwnerDetailView(sources){
  for(const [k,sha] of Object.entries(pins)){const s=sources?.[k];if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k);}
  const fields={},labels={};
  for(const [k,v] of Object.entries({dra:'DR',pr:'PR',st:'ST',jk:'JK'})){const m=sources.dragon.match(new RegExp('@'+v+'namelist=qw\\(([\\s\\S]*?)\\);'));if(!m)fail('source schema missing');fields[k]=m[1].trim().split(/\s+/);}
  for(const k of ['FM','DRCOLOR','STRATE','RACETERM','EMPHA','ONRACE']){const m=sources.dragon.match(new RegExp('@'+k+'=\\(([\\s\\S]*?)\\);'));if(!m)fail('source labels missing');labels[k]=[...m[1].matchAll(/l\(['"]([^'"]+)['"]\)/g)].map(x=>x[1]);}
  const token=Object.freeze({committable:false});reviews.set(token,{fields,labels});return token;
}
// Raw widths are evidence of the original handler, not trusted CSS or an instruction to mutate stats.
function bar(key,parts,label){return {key,segments:parts.filter(([,width])=>width!==0).map(([imageKey,width])=>({imageKey,width,height:12})),label};}
function dragonBar(key,p,u){return bar(key,[['b.gif',p-u],['r.gif',u],['t.gif',100-p]],(p-u)+' + '+u);}
function parentBar(key,p){return bar(key,[['b.gif',p],['t.gif',100-p]],String(p));}
function conBar(key,p,growth=false){p=Math.min(100,p);return bar(key,[['r.gif',p],['t.gif',100-p]],(growth?'':val(EVALUE,Math.trunc(p/100*4))+' ')+p+'%');}
function wtBar(p){const v=(p-40)*5,rank=Math.max(0,3-Math.abs(Math.trunc((p-50)/2)));return bar('体重',[['r.gif',v],['t.gif',100-v]],val(EVALUE,rank)+' '+p+'トン');}
/** D supplies authoritative read snapshot + authenticated actor. dr is an explicit positive target ID. */
export function projectDragonOwnerDetailView({review,mode,now,street,actorId,activeShopIds,dr,files={}}){
  const cfg=reviews.get(review);if(!cfg||!['detail','pr'].includes(mode)||!nat(now)||typeof street!=='string'||!street||!positive(actorId)||!positive(dr)||!Array.isArray(activeShopIds)||!activeShopIds.every(positive)||new Set(activeShopIds).size!==activeShopIds.length||!activeShopIds.includes(actorId)||!files||typeof files!=='object'||Array.isArray(files))fail('trusted reviewed owner snapshot required');
  const {fields,labels:L}=cfg,ids=new Set(activeShopIds.map(String));
  const rows=k=>read(Object.hasOwn(files,k)?files[k]??null:null,fields[k]);
  const active=r=>r.town!==street||ids.has(r.owner);
  const localSlots=k=>rows(k).map(r=>active(r)?r:null);
  const own=r=>r&&r.town===street&&n(r.owner)===actorId;
  const isParent=mode==='pr',raw=rows(isParent?'pr':'dra');
  const target=raw.filter(r=>r.no===String(dr)).at(-1);
  // Unlike Perl's undefined index fallback, an unknown explicit target never aliases slot zero.
  if(!own(target)||(isParent&&(!active(target)||!n(target.fm))))fail('bad request');
  const p=target,elapsed=now-n(p.birth),common=[p.name,age(elapsed)],tail=[val(L.STRATE,strate(p)),apt(p),n(p.prize)+'万',wins(p)];
  const out={mode,committable:false,titleKey:'牧場',summary:null,abilityTitleKey:'能力の詳細',bars:[],forms:[]};
  if(isParent){
    out.summary={columns:['名称','年齢','毛色','脚質','距離適性','現役賞金','現役成績','前回の出産'],cells:[...common,val(L.DRCOLOR,n(p.color)),...tail,stamp(n(p.preg))],imageKey:image(p,true)};
    out.bars=['hr',...levels].map((k,i)=>parentBar(i===0?'遺伝力':L.EMPHA[i-1],n(p[k])));
    const male=localSlots('pr').filter(r=>!n(r?.fm));
    if(male.length&&now-n(p.preg)>3*86400)out.forms.push(form(dr,'predit','preg','種付け','種付けする',[text('name',20),select('pr',male.map(option))],[msg('競争竜がすでに <b>%1</b>頭いるときは，種付けを実行できません。',3),msg('名前は，<b>ひらがな10文字</b>以内です。'),msg('種%1竜の所有者に，種付け料を支払います。',L.FM[0]),msg('出産すると，<b>%1</b>間は次の種付けができません。',age(3*86400))]));
    return out;
  }
  const stable=localSlots('st'),stname=stable.filter(r=>n(r?.no)===n(p.stable)).at(-1)?.name??'';
  // Original $TDB出走 interpolates an undefined variable: nine headers, ten data cells.
  out.summary={columns:['名称','年齢','性別','毛色','預託厩舎','脚質','距離適性','総賞金','成績'],cells:[...common,val(L.FM,n(p.fm)),val(L.DRCOLOR,n(p.color)),stname,...tail,val(L.ONRACE,n(p.race))],imageKey:image(p,false)};
  out.bars=levels.map((k,i)=>dragonBar(L.EMPHA[i],n(p[k]),n(p[k+'p']))).concat(conBar('体調',n(p.con)),wtBar(n(p.wt)),conBar('成長度',n(p.gr),true));
  if(n(p.race)<2){
    if(stable.length)out.forms.push(form(dr,'dredit','ent','厩舎預託','預託',[select('ent',stable.map(option))],[msg('厩舎にドラゴンを預託すると，調教による成長が見込めます。'),msg('預託料が毎日<b>%1</b>かかります。',100000)]));
    const jockey=localSlots('jk').filter(r=>n(r?.race)<=1);
    out.forms.push(form(dr,'dredit','torace','レース出走登録','出走',[select('rcode',opts(L.RACETERM)),select('jock',[{value:0,label:'－－騎手なし－－'},...jockey.map(option)]),select('str',opts(L.STRATE.slice(0,4)))],[msg('定員を超えていると，抽選によって出走できない場合があります。'),msg('出走すると，その間の調教が行われないうえ，体調・体重が減少します。'),msg('レースの距離やハンデ，他の出場竜などを見て，不利にならないか確認しましょう。')]));
    if(elapsed>10*86400)out.forms.push({...form(dr,'predit','retire','引退','引退させる',[{...text('check',10),value:''}],[msg('年齢 <b>%1</b>以上のドラゴンは，引退させることができます。',age(10*86400)),msg('総賞金が <b>%1万</b>以上のドラゴンは，種・繁殖入りします。',300)]),confirmation:{field:'check',value:'retire',hintKey:'retireと入力'}});
  }
  return out;
}
