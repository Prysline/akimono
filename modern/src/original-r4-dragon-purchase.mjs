/** Frozen inc-dras-dredit new operation, pure candidate, not authorization or publication. */
const fail=m=>{throw new RangeError('R4 dragon purchase: '+m)};
const record=x=>x!==null&&typeof x==='object'&&Object.getPrototypeOf(x)===Object.prototype;
const id=n=>Number.isSafeInteger(n)&&n>0;
const town=s=>typeof s==='string'&&/^[A-Za-z][A-Za-z0-9_]*$/.test(s);
const numeric=s=>typeof s==='string'&&/^(0|[1-9]\d*)$/.test(s)&&Number.isSafeInteger(Number(s));
const nameSafe=s=>typeof s==='string'&&s!==''&&!/[,:;\t\r\n<>&\0]/.test(s);
const fields='no birth fm color name town owner stable race apt sp spp sr srp ag agp pw pwp hl hlp fl flp con wt gr prize sdwin g3win g2win g1win'.split(' ');
const ranchFields='no birth name town owner prize sdwin g3win g2win g1win'.split(' ');
const bounds=[5,3,20,20,20,20,40,20,20,3];
function readRows(text,keys,now){
  if(typeof text!=='string'||text!==''&&!text.endsWith('\n'))fail('canonical source file required');
  const seen=new Set();return text.split('\n').slice(0,-1).map(line=>{
    const f=line.split(','),row=Object.fromEntries(keys.map((k,i)=>[k,f[i]]));
    if(f.length!==keys.length||!numeric(row.no)||!id(Number(row.no))||seen.has(row.no)||!numeric(row.birth)||!id(Number(row.birth))||Number(row.birth)>now||!nameSafe(row.name)||!town(row.town)||!numeric(row.owner)||!id(Number(row.owner))||keys.some(k=>!['name','town'].includes(k)&&row[k]!==''&&!numeric(row[k])))fail('unreviewed source row');
    seen.add(row.no);return row;
  });
}
const wire=(rows,keys)=>rows.map(r=>keys.map(k=>r[k]??'').join(',')+'\n').join('');
export function projectDragonPurchase({street,shops,actorId,now,ranchText,dragonText,payoutText,command,draws,ngNames}){
  if(!town(street)||!Array.isArray(shops)||!id(actorId)||!id(now)||now<=432000||!record(command)||command.kind!=='dragon-new'||Object.keys(command).some(k=>!['kind','name','fm','dist'].includes(k))||!Array.isArray(ngNames)||ngNames.some(s=>typeof s!=='string'||!s))fail('reviewed source context required');
  const ids=new Set();for(const s of shops){if(!record(s)||!id(s.id)||ids.has(s.id)||!Number.isSafeInteger(s.money))fail('invalid active shop');ids.add(s.id);}
  const actor=shops.find(s=>s.id===actorId);if(!actor)fail('actor not active');
  const ranches=readRows(ranchText,ranchFields,now),rows=readRows(dragonText,fields,now);
  if(ranches.filter(r=>r.town===street&&Number(r.owner)===actorId).length!==1)fail('one current ranch required');
  if(actor.money<500000)fail('insufficient money');
  if(rows.filter(r=>r.town===street&&Number(r.owner)===actorId).length>=3)fail('dragon capacity');
  const {name,fm,dist}=command;
  if(!nameSafe(name)||[...name].length<6||[...name].length>20||ngNames.some(s=>name.includes(s)))fail('invalid name');
  if(![0,1].includes(fm)||![0,1,2].includes(dist))fail('unreviewed form choice');
  if(!Array.isArray(draws)||draws.length!==bounds.length||draws.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>=1))fail('reviewed RNG draw shape required');
  if(typeof payoutText!=='string'||payoutText!==''&&!payoutText.endsWith('\n'))fail('canonical payout required');
  for(const line of payoutText.split('\n').slice(0,-1)){const m=/^([1-9]\d*)\t(-?(?:0|[1-9]\d*))$/.exec(line);if(!m||!id(Number(m[1]))||!Number.isSafeInteger(Number(m[2])))fail('unreviewed prior payout');}
  const no=Number(rows[0]?.no??0)+1;if(!id(no)||rows.some(r=>Number(r.no)===no))fail('original dragon ID collision');
  const [color,apt,sp,sr,ag,pw,hl,fl,con,wt]=draws.map((n,i)=>Math.floor(n*bounds[i]));
  const row={no,birth:now-5*86400,fm,color,name,town:street,owner:actorId,apt:1400+dist*600+apt*100,sp:10+sp,sr:5+sr,ag:5+ag,pw:10+pw,hl:10+hl,fl:10+fl,con:70+con,wt:49+wt};
  if(row.sr>row.ag)row.sr+=15;else row.ag+=15;
  const payment={sourceAction:'dragon-new',street,shopId:actorId,dragonNo:no,amount:-500000,bytes:actorId+'\t-500000\n'};
  return {dragonText:wire([row,...rows],fields),ranchText,payoutText:payoutText+payment.bytes,actor:structuredClone(actor),payment,drawBounds:[...bounds],publicationIntent:['payment-live-append','dragon-stage','common-commit'],committable:false,worldStateWritten:false};
}
