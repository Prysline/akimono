/** Frozen inc-dr-edit1 training/boarding/maintenance candidate; not a scheduler or commit. */
const fail=m=>{throw new RangeError('R4 dragon training: '+m)};
const record=x=>x!==null&&typeof x==='object'&&Object.getPrototypeOf(x)===Object.prototype;
const id=n=>Number.isSafeInteger(n)&&n>0;
const town=s=>typeof s==='string'&&/^[A-Za-z][A-Za-z0-9_]*$/.test(s)&&s!=='constructor'&&s!=='prototype';
const numeric=s=>typeof s==='string'&&/^(0|[1-9]\d*)$/.test(s)&&Number.isSafeInteger(Number(s));
const fields='no birth fm color name town owner stable race apt sp spp sr srp ag agp pw pwp hl hlp fl flp con wt gr prize sdwin g3win g2win g1win'.split(' ');
const stFields='no birth name town owner emp tr con wt sp sr ag pw hl fl sdwin g3win g2win g1win'.split(' ');
const rcFields='no birth name town owner prize sdwin g3win g2win g1win'.split(' ');
const levels=['sp','sr','ag','pw','hl','fl'];
const day=86400,fee=100000;
function readRows(text,keys,now){
  if(typeof text!=='string'||text!==''&&!text.endsWith('\n'))fail('canonical source file required');
  const seen=new Set();return text.split('\n').slice(0,-1).map(line=>{
    const f=line.split(','),r=Object.fromEntries(keys.map((k,i)=>[k,f[i]]));
    if(f.length!==keys.length||!numeric(r.no)||!id(Number(r.no))||seen.has(r.no)||!numeric(r.birth)||!id(Number(r.birth))||Number(r.birth)>now||typeof r.name!=='string'||!r.name||/[,:;\t\r\n<>&\0]/.test(r.name)||!town(r.town)||!numeric(r.owner)||!id(Number(r.owner))||keys.some(k=>!['name','town'].includes(k)&&r[k]!==''&&!numeric(r[k])))fail('unreviewed source row');
    seen.add(r.no);return r;
  });
}
const wire=(rows,keys)=>rows.filter(Boolean).map(r=>keys.map(k=>r[k]??'').join(',')+'\n').join('');
export function projectDragonTraining(input){return project(input,null);}
/** Approved A. Directory must be authoritative, resolved from the same world revision.
 * Only new invalid source payments are quarantined; existing payout files are not rewritten. */
export function projectDragonTrainingApprovedA(input){
  if(!record(input?.activeByStreet))fail('authoritative street directory required');
  return project(input,input.activeByStreet);
}
function project({street,activeShopIds,now,drTime,dragonText,stableText,ranchText,payoutByStreet,draws},directory){
  if(!town(street)||!Array.isArray(activeShopIds)||activeShopIds.some(n=>!id(n))||new Set(activeShopIds).size!==activeShopIds.length||!id(now)||!Array.isArray(drTime)||drTime.length!==3||drTime.some(n=>!id(n))||now<=drTime[0]||!record(payoutByStreet)||!Array.isArray(draws)||draws.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>=1))fail('reviewed due training context required');
  const dragons=readRows(dragonText,fields,now),stables=readRows(stableText,stFields,now);readRows(ranchText,rcFields,now);
  // ReadStable keeps id2st even when clearing an invalid local owner. Refuse that unresolved source edge, rather than invent a beneficiary.
  const localStale=r=>r.town===street&&!activeShopIds.includes(Number(r.owner));
  if(!directory&&stables.some(localStale))fail('unresolved stale local stable owner');
  if(directory){
    for(const [t,ids] of Object.entries(directory))if(!town(t)||!Array.isArray(ids)||ids.some(n=>!id(n))||new Set(ids).size!==ids.length)fail('invalid authoritative street directory');
    if(!Object.hasOwn(directory,street)||directory[street].length!==activeShopIds.length||activeShopIds.some(n=>!directory[street].includes(n)))fail('trigger street directory mismatch');
    for(const r of [...dragons,...stables])if(!Object.hasOwn(directory,r.town))fail('missing source street directory');
    if(now<=50*day&&stables.some(localStale))fail('unreviewed pre-epoch stale stable');
  }
  const staleSlots=new Map();
  if(directory)for(let i=0;i<stables.length;i++)if(localStale(stables[i])){
    const original=stables[i];staleSlots.set(original.no,{index:i,original});
    // Original id2st survives undef; accesses autovivify a hash with undefined fields.
    stables[i]=Object.fromEntries(stFields.map(k=>[k,'']));
  }
  if(stables.some(r=>Number(r.emp)>5||levels.some(k=>Number(r[k])>3)))fail('unreviewed stable fields');
  const nextPay={};for(const [t,text] of Object.entries(payoutByStreet)){
    if(!town(t)||typeof text!=='string'||text!==''&&!text.endsWith('\n'))fail('canonical payout required');
    for(const line of text.split('\n').slice(0,-1)){const m=/^([1-9]\d*)\t(-?(?:0|[1-9]\d*))$/.exec(line);if(!m||!id(Number(m[1]))||!Number.isSafeInteger(Number(m[2])))fail('unreviewed prior payout');}nextPay[t]=text;
  }
  const payments=[],quarantinedPayments=[],sourcePayments=[],drawBounds=[],logs=[];let di=0,stableChanged=false;
  const rand=bound=>{if(di>=draws.length)fail('insufficient RNG draws');drawBounds.push(bound);return draws[di++]*bound;};
  const pay=(r,amount,sourceAction,sourceNo)=>{
    if(!Number.isSafeInteger(amount))fail('payment overflow');
    const bytes=r.owner+'\t'+amount+'\n',p={street:r.town,shopId:r.owner===''?null:Number(r.owner),sourceAction,sourceNo,amount,bytes};
    if(directory){
      const ordinal=sourcePayments.length;
      const reason=!r.town||!id(p.shopId)?'missing-source-recipient':!directory[r.town]?.includes(p.shopId)?'inactive-source-owner':null;
      const event={...p,ordinal,disposition:reason?'quarantine':'settle'};sourcePayments.push(event);
      if(reason){quarantinedPayments.push({...event,reason});return;}
    }
    payments.push(p);nextPay[r.town]=(nextPay[r.town]??'')+bytes;
  };
  const add=(r,k,n)=>{const value=Number(r[k])+n;if(!Number.isSafeInteger(value)||value<0)fail('attribute overflow');r[k]=String(value);};
  for(let i=0;i<dragons.length;i++){
    const d=dragons[i];if(Number(d.race)===1)d.race='0';if(Number(d.race))continue;
    const age=now-Number(d.birth),hl=Number(d.hl);
    if(age>40*day){logs.unshift(now+'\t0\t'+d.name+'は引退しました。\n');dragons[i]=null;continue;}
    if(age>25*day+hl*day/10)continue;
    d.wt=String(Math.min(62,Math.max(38,Number(d.wt)+Math.trunc(rand(3))-1)));
    d.con=String(Math.min(100,Number(d.con)+Math.trunc(rand(3)+hl/20)+1));
    const s=staleSlots.has(d.stable)?stables[staleSlots.get(d.stable).index]:stables.find(r=>r.no!==''&&r.no===d.stable);if(!s)continue;
    pay(d,-fee,'boarding-expense',Number(d.no));pay(s,fee,'boarding-income',Number(d.no));
    add(d,'con',Math.trunc(Number(s.con)/25)+1);
    if(Number(s.wt)+100>rand(200)){if(Number(d.wt)<50)add(d,'wt',2);if(Number(d.wt)>50)add(d,'wt',-2);}
    add(d,'gr',Math.trunc(Number(s.tr)/10+rand(7)+23));if(Number(d.gr)<100)continue;
    add(d,'gr',-100);
    for(let n=0;n<levels.length;n++){const k=levels[n];let p=0;if(Number(s.emp)===n)p+=2+Math.trunc(rand(4));if(Number(s.tr)+80+Number(s[k])*10>rand(200))p+=1+Math.trunc(rand(4));if(n===0)p=Math.trunc(p/2);if(p){add(d,k,p);add(d,k+'p',p);}}
  }
  for(let i=0;i<stables.length;i++){
    const s=stables[i];if(now-Number(s.birth)>50*day){logs.unshift(now+'\t0\t'+s.name+'は老朽化により閉鎖しました。\n');stables[i]=null;stableChanged=true;continue;}
    const cost=levels.reduce((n,k)=>n+Number(s[k]),0)*fee;pay(s,-cost,'stable-maintenance',Number(s.no));
  }
  if(di!==draws.length)fail('unused RNG draws');
  const next=now+day-((now+9*3600-3*3600)%day);if(!id(next))fail('schedule overflow');
  const nextTime=[next,drTime[1],drTime[2]];
  return {dragonText:wire(dragons,fields),stableText:stableChanged?wire(stables,stFields):stableText,stableChanged,ranchText,payoutByStreet:nextPay,payments,drawBounds,drTime:nextTime,drLastText:'@DRTIME=('+nextTime.join(',')+');\n1;\n',newLogText:logs.join(''),...(directory?{policy:'approved-A',sourcePayments,quarantinedPayments}:{}),publicationIntent:['dragon-stage',...(stableChanged?['stable-stage']:[]),'dr-last-stage',...(logs.length?['dragon-log-stage']:[]),'common-commit','common-unlock'],committable:false,worldStateWritten:false};
}
