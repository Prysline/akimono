/** Reviewed ranch-new operation and its real source payment suffix; no receipt or commit. */
import {createHash} from 'node:crypto';
const pins={handler:'f6a3c3097bcd32cce74d0405c285c521c399668b',config:'76bb00f247733630cbcc374a82f693638f653b71',reader:'1b13a1a855490c80c88b0fa117676c68b6440753',writer:'0abc25f24ea6bd06576d5d1ba31eeb82419a2fee',pay:'e60cda027c87de25585ee59bf64a4cb24b9d1476'};
const reviews=new WeakMap();
const fail=m=>{throw new RangeError('R4 dragon ranch: '+m)};
const record=x=>x!==null&&typeof x==='object'&&Object.getPrototypeOf(x)===Object.prototype;
const id=n=>Number.isSafeInteger(n)&&n>0;
const town=s=>typeof s==='string'&&/^[A-Za-z][A-Za-z0-9_]*$/.test(s);
const digits=s=>/^[1-9]\d*$/.test(s)&&id(Number(s));
const nameSafe=s=>typeof s==='string'&&s!==''&&!/[,:;\t\r\n<>&\0]/.test(s);
export function reviewDragonRanchProducer(sources){
  for(const [k,sha] of Object.entries(pins)){
    const s=sources?.[k];if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k);
  }
  const fee=Number(/^\$RCest=(\d+);$/m.exec(sources.config)?.[1]);
  const fields=/@RCnamelist=qw\(\s*([\s\w]+?)\s*\);/.exec(sources.config)?.[1].split(/\s+/);
  if(fee!==1000000||fields?.join(',')!=='no,birth,name,town,owner,prize,sdwin,g3win,g2win,g1win')fail('unreviewed config');
  const review=Object.freeze({committable:false});reviews.set(review,fee);return review;
}
export function projectDragonRanchNew({reviewed,street,shops,actorId,now,ranchText,payoutText,command,checkNGName}){
  if(!reviews.has(reviewed)||!town(street)||!Array.isArray(shops)||!id(actorId)||!id(now)||typeof ranchText!=='string'||ranchText!==''&&!ranchText.endsWith('\n')||typeof payoutText!=='string'||payoutText!==''&&!payoutText.endsWith('\n')||!record(command)||command.kind!=='ranch-new'||Object.keys(command).some(k=>!['kind','name'].includes(k))||typeof checkNGName!=='function')fail('reviewed source context required');
  const ids=new Set();for(const s of shops){if(!record(s)||!id(s.id)||ids.has(s.id)||!Number.isSafeInteger(s.money))fail('invalid active shop');ids.add(s.id);}
  const actor=shops.find(s=>s.id===actorId);if(!actor)fail('actor not active');
  const seen=new Set(),raw=ranchText.split('\n').slice(0,-1).map(line=>{
    const f=line.split(',');if(f.length!==10||!digits(f[0])||seen.has(Number(f[0]))||!digits(f[1])||Number(f[1])>now||!nameSafe(f[2])||!town(f[3])||!digits(f[4])||f.slice(5).some(s=>s!==''&&(!/^(0|[1-9]\d*)$/.test(s)||!Number.isSafeInteger(Number(s)))))fail('unreviewed ranch row');
    seen.add(Number(f[0]));return {no:Number(f[0]),town:f[3],owner:Number(f[4]),line};
  });
  for(const row of payoutText.split('\n').slice(0,-1)){
    const m=/^([1-9]\d*)\t(-?(?:0|[1-9]\d*))$/.exec(row);if(!m||!id(Number(m[1]))||!Number.isSafeInteger(Number(m[2])))fail('unreviewed prior payout');
  }
  // ReadRanch keeps the raw slot count even when local stale owners are cleared.
  const loaded=raw.map(r=>r.town===street&&!ids.has(r.owner)?null:r);
  if(loaded.some(r=>r?.town===street&&r.owner===actorId))fail('ranch already owned');
  const fee=reviews.get(reviewed);if(actor.money<fee)fail('insufficient money');
  const name=command.name;if(!nameSafe(name)||[...name].length<6||[...name].length>20||checkNGName(name)!==false)fail('invalid or unreviewed name');
  const no=(loaded[0]?.no??0)+1;
  // Original first-slot allocation can collide after stale owner removal. Do not publish ambiguous IDs.
  if(!id(no)||loaded.some(r=>r?.no===no))fail('original ranch ID collision');
  const newRow=[no,now,name,street,actorId,'','','','',''].join(',')+'\n';
  const payment={sourceAction:'ranch-new',street,shopId:actorId,ranchNo:no,amount:-fee,bytes:actorId+'\t'+(-fee)+'\n'};
  return {ranchText:newRow+loaded.filter(Boolean).map(r=>r.line+'\n').join(''),payoutText:payoutText+payment.bytes,payment,actor:structuredClone(actor),logText:now+'\t0\t新しい牧場「'+name+'」が設立されました。\n',publicationIntent:['payment-live-append','ranch-stage','dragon-log-stage','common-commit'],committable:false,worldStateWritten:false};
}
