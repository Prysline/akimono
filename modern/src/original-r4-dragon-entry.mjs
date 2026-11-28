/** Reviewed normal-player boarding and race entry from inc-dras-dredit; no publication. */
import {createHash} from 'node:crypto';
const fail=m=>{throw new RangeError('R4 dragon entry: '+m)};
const record=x=>x!==null&&typeof x==='object'&&Object.getPrototypeOf(x)===Object.prototype;
const id=n=>Number.isSafeInteger(n)&&n>0;
const town=s=>typeof s==='string'&&/^[A-Za-z][A-Za-z0-9_]*$/.test(s);
const integer=s=>typeof s==='string'&&/^-?(0|[1-9]\d*)$/.test(s)&&Number.isSafeInteger(Number(s));
const safeText=s=>typeof s==='string'&&!/[,:;\t\r\n<>&\0]/.test(s);
const fields='no birth fm color name town owner stable race apt sp spp sr srp ag agp pw pwp hl hlp fl flp con wt gr prize sdwin g3win g2win g1win'.split(' ');
const sf='no birth name town owner emp tr con wt sp sr ag pw hl fl sdwin g3win g2win g1win'.split(' ');
const jf='no birth name town owner race ahead back sp sdwin g3win g2win g1win'.split(' ');
const rf='no birth name town owner prize sdwin g3win g2win g1win'.split(' ');
const rd='no dr birth fm color name ranch rcname stable stname jock jkname prize strate sp1 sp2 sp3 sp4 pop time str lose'.split(' ');
const textFields=['name','town','rcname','stname','jkname','lose'];
const reviewed=new WeakMap();
export function reviewDragonEntryConfig(source){
  if(typeof source!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0').update(source).digest('hex')!=='76bb00f247733630cbcc374a82f693638f653b71')fail('source config drift');
  const matches=[...source.matchAll(/^\s*\[l\("([^"]+)"\),\s*,?(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\],/gm)];
  if(matches.length!==24)fail('unreviewed race table');const races=matches.map(m=>[m[1],...m.slice(2).map(Number)]);
  const token=Object.freeze({committable:false});reviewed.set(token,[races.slice(0,12),races.slice(12)]);return token;
}
function readRows(text,keys){
  if(typeof text!=='string'||text!==''&&!text.endsWith('\n'))fail('canonical source file required');
  const seen=new Set();return text.split('\n').slice(0,-1).map(line=>{
    const f=line.split(','),r=Object.fromEntries(keys.map((k,i)=>[k,f[i]]));
    if(f.length!==keys.length||!integer(r.no)||!id(Number(r.no))||seen.has(r.no)||!r.name||keys.some(k=>textFields.includes(k)?!safeText(r[k]):r[k]!==''&&(!integer(r[k])||(!['sp1','sp2','sp3','sp4'].includes(k)&&Number(r[k])<0))))fail('unreviewed source row');
    if(keys.includes('town')&&(!town(r.town)||!id(Number(r.owner))))fail('unreviewed owner');
    seen.add(r.no);return r;
  });
}
const wire=(rows,keys)=>rows.map(r=>keys.map(k=>r[k]??'').join(',')+'\n').join('');
const strategy=(sr,ag)=>sr>ag*3&&sr>80?0:sr>ag*1.2?1:ag>sr*3&&ag>80?3:ag>sr*1.2?2:4;
export function projectDragonEntry({review,street,activeShopIds,actorId,dragonText,stableText,ranchText,jockeyText,raceText,command}){
  if(!reviewed.has(review)||!town(street)||!id(actorId)||!Array.isArray(activeShopIds)||activeShopIds.some(n=>!id(n))||new Set(activeShopIds).size!==activeShopIds.length||!activeShopIds.includes(actorId)||!record(command)||!['ent','torace'].includes(command.kind)||!id(command.dr))fail('trusted current actor and command required');
  const allowed=command.kind==='ent'?['kind','dr','ent']:['kind','dr','rcode','jock','str'];if(Object.keys(command).some(k=>!allowed.includes(k)))fail('unreviewed form field');
  const dragons=readRows(dragonText,fields),d=dragons.find(r=>Number(r.no)===command.dr);
  if(!d||d.town!==street||Number(d.owner)!==actorId)fail('dragon not owned');
  if(Number(d.race)>1)fail('dragon currently racing');
  const visible=r=>r.town!==street||activeShopIds.includes(Number(r.owner));
  const stables=readRows(stableText,sf).filter(visible);
  const result={stableText,ranchText,jockeyText,raceText,drawBounds:[],payments:[],committable:false,worldStateWritten:false};
  if(command.kind==='ent'){
    if(!id(command.ent)||!stables.some(s=>Number(s.no)===command.ent))fail('stable not in current source form');
    d.stable=command.ent;return {...result,dragonText:wire(dragons,fields),publicationIntent:['dragon-stage','common-commit']};
  }
  if(![0,1].includes(command.rcode)||!Number.isSafeInteger(command.jock)||command.jock<0||![0,1,2,3].includes(command.str))fail('unreviewed race selection');
  const ranches=readRows(ranchText,rf).filter(r=>r.town===street&&Number(r.owner)===actorId);if(ranches.length!==1)fail('one current ranch required');const ranch=ranches[0];
  if(typeof raceText!=='string'||raceText!==''&&!raceText.endsWith('\n'))fail('canonical race file required');
  const first=raceText.indexOf('\n'),header=raceText===''?['0','0','0']:raceText.slice(0,first).split(','),entries=readRows(raceText===''?'':raceText.slice(first+1),rd);
  if(header.length!==3||header.some(s=>!integer(s)||Number(s)<0)||Number(header[0])!==0||Number(header[1])>=12||Number(header[2])>1)fail('race closed or unreviewed header');
  const R=reviewed.get(review)[command.rcode][Number(header[1])];if(R[1]===5&&Number(d.prize)>0)fail('unwon race requires no prior prize');
  if(entries.some(r=>Number(r.dr)===command.dr))fail('duplicate race entry');
  const st=stables.find(r=>r.no===d.stable),sr=Number(d.sr),ag=Number(d.ag),pw=Number(d.pw);let sp=Number(d.sp),lose='実力不足';
  const pwp=R[3]*4+Number(header[2])*3+1;if(pwp>1&&sp<pw)lose='パワー不足';sp=Math.trunc((sp*(10-pwp)+pw*pwp)/10);
  sp-=Math.trunc(sp*(100-Number(d.con))/200);if(Number(d.con)<60)lose='体調不調';
  let wt=Math.abs(Number(d.wt)-50);if(R[2])wt+=Math.trunc(Number(d.prize)/R[2]);sp-=Math.trunc(sp*wt/20);if(wt>2)lose='重量調整失敗';
  let s1=sp*6+1000,s2=s1,s3=s1,s4=R[4]?sp*4+pw*2+950:s1;
  switch(command.str){case 0:s1+=sr*6-ag*4+40;s2+=sr*2+50;s1=Math.max(s1,s2);break;case 1:s1+=sr*2+50;s2+=sr*4+100;break;case 2:s3+=ag*4+100;s4+=ag*2+50;break;case 3:s3+=ag*2+50;s4+=ag*6-sr*4+40;s4=Math.max(s4,s3);break;}
  const min=Math.max(1200,Math.trunc((Number(d.apt)-Number(d.fl)*8-150)/10)*10),max=Math.min(3200,Math.trunc((Number(d.apt)+Number(d.fl)*8+150)/10)*10);
  let m=R[5]<min?min-R[5]:R[5]>max?max-R[5]:0;
  if(m>0){lose='距離短すぎ';m=Math.min(300,m);s1-=m*2;s2-=m;}else if(m<0){lose='距離長すぎ';m=Math.max(-300,m);s1+=m*2;s2+=m;}
  let jkname='',jockeyChanged=false;
  if(command.jock){const jockeys=readRows(jockeyText,jf).filter(visible),j=jockeys.find(r=>Number(r.no)===command.jock);if(!j||Number(j.race)>1)fail('jockey not in current source form');jkname=j.name;j.race=2;s1+=Math.trunc(s1*Number(j.ahead)/20/100);s2+=Math.trunc(s2*Number(j.ahead)/20/100);s3+=Math.trunc(s3*Number(j.back)/20/100);s4+=Math.trunc(s4*Number(j.back)/20/100);result.jockeyText=wire(jockeys,jf);jockeyChanged=true;}
  const no=Number(entries.at(-1)?.no??0)+1;if(!id(no)||entries.some(r=>Number(r.no)===no)||[s1,s2,s3,s4].some(v=>!Number.isSafeInteger(v)))fail('unreviewed race entry result');
  const strate=strategy(sr,ag);if(command.str!==strate)lose='作戦ミス';
  entries.push({no,dr:command.dr,birth:d.birth,fm:d.fm,color:d.color,name:d.name,ranch:ranch.no,rcname:ranch.name,stable:d.stable,stname:st?.name??'',jock:command.jock,jkname,prize:d.prize,strate,sp1:s1,sp2:s2,sp3:s3,sp4:s4,str:command.str,lose});d.race=2;
  return {...result,dragonText:wire(dragons,fields),raceText:header.join(',')+'\n'+wire(entries,rd),publicationIntent:[...(jockeyChanged?['jockey-stage']:[]),'race-stage','dragon-stage','common-commit']};
}
