/** Source-only stable/jockey producer; authoritative identity, RNG and CAS are caller responsibilities. */
import {createHash} from 'node:crypto';
const pins={stable:'be75e7b69096f1819cf15137b15bd62837e2f484',jockey:'15bdb1c3c6d039cb6de6dbbfdc04bd02b1fe91da',config:'76bb00f247733630cbcc374a82f693638f653b71',reader:'01110533ae1a223f687f13b02f0aaeebd30c3155',writer:'0abc25f24ea6bd06576d5d1ba31eeb82419a2fee',pay:'e60cda027c87de25585ee59bf64a4cb24b9d1476'};
const reviews=new WeakMap();
const fail=m=>{throw new RangeError('R4 dragon facility: '+m)};
const record=x=>x!==null&&typeof x==='object'&&Object.getPrototypeOf(x)===Object.prototype;
const id=n=>Number.isSafeInteger(n)&&n>0;
const town=s=>typeof s==='string'&&/^[A-Za-z][A-Za-z0-9_]*$/.test(s);
const numeric=s=>typeof s==='string'&&/^(0|[1-9]\d*)$/.test(s)&&Number.isSafeInteger(Number(s));
const nameSafe=s=>typeof s==='string'&&s!==''&&!/[,:;\t\r\n<>&\0]/.test(s);
const levels=['sp','sr','ag','pw','hl','fl'];
export function reviewDragonFacilityProducer(sources){
  for(const [k,sha] of Object.entries(pins)){
    const s=sources?.[k];if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k);
  }
  const config={};for(const key of ['ST','JK']){
    const fee=Number(new RegExp('^\\$'+key+'est=(\\d+);$','m').exec(sources.config)?.[1]);
    const max=Number(new RegExp('^\\$'+key+'max=(\\d+);$','m').exec(sources.config)?.[1]);
    const fields=new RegExp('@'+key+'namelist=qw\\(\\s*([\\s\\w]+?)\\s*\\);').exec(sources.config)?.[1].split(/\s+/);
    if(fee!==500000||max!==(key==='ST'?10:20)||!fields)fail('unreviewed config');config[key]={fee,max,fields};
  }
  const review=Object.freeze({committable:false});reviews.set(review,config);return review;
}
export function projectDragonFacility({reviewed,street,shops,actorId,now,facilityText,payoutText,command,draws,checkNGName}){
  if(!reviews.has(reviewed)||!town(street)||!Array.isArray(shops)||!id(actorId)||!id(now)||typeof facilityText!=='string'||facilityText!==''&&!facilityText.endsWith('\n')||typeof payoutText!=='string'||payoutText!==''&&!payoutText.endsWith('\n')||!record(command)||!['stable-new','jockey-new','stable-large'].includes(command.kind)||!Array.isArray(draws)||typeof checkNGName!=='function')fail('reviewed source context required');
  const isStable=command.kind!=='jockey-new',large=command.kind==='stable-large',cfg=reviews.get(reviewed)[isStable?'ST':'JK'];
  const allowed=large?['kind','lar']:isStable?['kind','name','emp']:['kind','name'];
  if(Object.keys(command).some(k=>!allowed.includes(k)))fail('unreviewed command field');
  if(draws.length!==(large?0:isStable?3:2)||draws.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>=1))fail('reviewed RNG draw shape required');
  const ids=new Set();for(const s of shops){if(!record(s)||!id(s.id)||ids.has(s.id)||!Number.isSafeInteger(s.money))fail('invalid active shop');ids.add(s.id);}
  const actor=shops.find(s=>s.id===actorId);if(!actor)fail('actor not active');
  const seen=new Set(),raw=facilityText.split('\n').slice(0,-1).map(line=>{
    const f=line.split(',');if(f.length!==cfg.fields.length||!numeric(f[0])||!id(Number(f[0]))||seen.has(Number(f[0]))||!numeric(f[1])||!id(Number(f[1]))||Number(f[1])>now||!nameSafe(f[2])||!town(f[3])||!numeric(f[4])||!id(Number(f[4]))||f.slice(5).some(s=>s!==''&&!numeric(s)))fail('unreviewed facility row');
    seen.add(Number(f[0]));return Object.fromEntries(cfg.fields.map((k,i)=>[k,f[i]]));
  });
  for(const row of payoutText.split('\n').slice(0,-1)){
    const m=/^([1-9]\d*)\t(-?(?:0|[1-9]\d*))$/.exec(row);if(!m||!id(Number(m[1]))||!Number.isSafeInteger(Number(m[2])))fail('unreviewed prior payout');
  }
  const loaded=raw.map(r=>r.town===street&&!ids.has(Number(r.owner))?null:r);
  const owned=loaded.filter(r=>r?.town===street&&Number(r.owner)===actorId);
  if(owned.length>1)fail('ambiguous facility ownership');
  if(actor.money<cfg.fee)fail('insufficient money');
  let row,logText='';
  if(large){
    if(owned.length!==1)fail('stable not owned');row=owned[0];
    if(!Number.isInteger(command.lar)||command.lar<0||command.lar>=levels.length)fail('unreviewed facility selection');
    if(levels.some(k=>Number(row[k])>3))fail('unreviewed facility level');
    const n=Math.trunc((now-Number(row.birth))/86400/2)+1,cost=levels.reduce((sum,k)=>sum+Number(row[k]),0);
    if(n<cost)fail('too early to enlarge');const k=levels[command.lar];if(Number(row[k])>=3)fail('facility level cap');row[k]=String(Number(row[k])+1);
  }else{
    if(owned.length)fail('facility already owned');if(raw.length>=cfg.max)fail('facility capacity');
    const name=command.name;if(!nameSafe(name)||[...name].length<6||[...name].length>20||checkNGName(name)!==false)fail('invalid or unreviewed name');
    if(isStable&&(!Number.isInteger(command.emp)||command.emp<0||command.emp>=levels.length))fail('unreviewed training selection');
    const no=Number(loaded[0]?.no??0)+1;if(!id(no)||loaded.some(r=>Number(r?.no)===no))fail('original facility ID collision');
    row={no:String(no),birth:String(now),name,town:street,owner:String(actorId)};
    const values=draws.map(n=>Math.floor(n*15));
    if(isStable)Object.assign(row,{emp:command.emp,sp:1,tr:values[0],con:values[1],wt:values[2]});
    else {let [ahead,back]=values;if(ahead>back)ahead+=15;else back+=15;Object.assign(row,{ahead,back});}
    loaded.unshift(row);logText=now+'\t0\t新しい'+(isStable?'厩舎「'+name+'」が設立されました。':'騎手「'+name+'」がデビューしました。')+'\n';
  }
  const payment={sourceAction:command.kind,street,shopId:actorId,facilityNo:Number(row.no),amount:-cfg.fee,bytes:actorId+'\t'+(-cfg.fee)+'\n'};
  return {facilityText:loaded.filter(Boolean).map(r=>cfg.fields.map(k=>r[k]??'').join(',')+'\n').join(''),payoutText:payoutText+payment.bytes,payment,actor:structuredClone(actor),logText,drawBounds:draws.map(()=>15),publicationIntent:['payment-live-append','facility-stage',...(!large?['dragon-log-stage']:[]),'common-commit'],committable:false,worldStateWritten:false};
}
