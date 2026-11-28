/** Source phase-zero race closure; pure, no shared commit. */
import {createHash} from 'node:crypto';
const fail=m=>{throw new RangeError('R4 race closure: '+m)};
const id=n=>Number.isSafeInteger(n)&&n>0;
const int=s=>typeof s==='string'&&/^-?(0|[1-9]\d*)$/.test(s)&&Number.isSafeInteger(Number(s));
const town=s=>typeof s==='string'&&/^[A-Za-z][A-Za-z0-9_]*$/.test(s);
const df='no birth fm color name town owner stable race apt sp spp sr srp ag agp pw pwp hl hlp fl flp con wt gr prize sdwin g3win g2win g1win'.split(' ');
const jf='no birth name town owner race ahead back sp sdwin g3win g2win g1win'.split(' ');
const rf='no dr birth fm color name ranch rcname stable stname jock jkname prize strate sp1 sp2 sp3 sp4 pop time str lose'.split(' ');
const textKeys=['name','town','rcname','stname','jkname','lose'];
function readRows(text,fields){
  if(typeof text!=='string'||text!==''&&!text.endsWith('\n'))fail('canonical wire required');const seen=new Set();
  return text.split('\n').slice(0,-1).map(line=>{const f=line.split(','),r=Object.fromEntries(fields.map((k,i)=>[k,f[i]]));
    if(f.length!==fields.length||!int(r.no)||!id(Number(r.no))||seen.has(r.no)||!r.name||fields.some(k=>textKeys.includes(k)?/[,:;\t\r\n<>&\0]/.test(r[k]):r[k]!==''&&(!int(r[k])||(!['sp1','sp2','sp3','sp4','time'].includes(k)&&Number(r[k])<0))))fail('unreviewed source row');
    if(fields.includes('town')&&(!town(r.town)||!id(Number(r.owner))))fail('unreviewed owner');seen.add(r.no);return r;
  });
}
const wire=(rows,fields)=>rows.map(r=>fields.map(k=>r[k]??'').join(',')+'\n').join('');
const configs=new WeakMap();
export function reviewRaceClosureConfig(source){
  if(typeof source!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0').update(source).digest('hex')!=='76bb00f247733630cbcc374a82f693638f653b71')fail('source config drift');
  const matches=[...source.matchAll(/^\s*\[l\("([^"]+)"\),\s*,?(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\],/gm)];
  if(matches.length!==24)fail('unreviewed race table');const config=matches.map(m=>({name:m[1],cap:Number(m[10])}));const token=Object.freeze({committable:false});configs.set(token,[config.slice(0,12),config.slice(12)]);return token;
}
export function projectRaceClosure({review,street,activeShopIds,now,drTime,dragonText,jockeyText,raceByCode,raceLogByCode,draws}){
  if(!configs.has(review)||!town(street)||!Array.isArray(activeShopIds)||activeShopIds.some(n=>!id(n))||new Set(activeShopIds).size!==activeShopIds.length||!id(now)||!Array.isArray(drTime)||drTime.length!==3||drTime.some(n=>!id(n))||now>drTime[0]||!(now>drTime[1]||now>drTime[2])||!Array.isArray(raceByCode)||raceByCode.length!==2||!Array.isArray(raceLogByCode)||raceLogByCode.length!==2||raceLogByCode.some(t=>t!==null&&typeof t!=='string')||!Array.isArray(draws)||draws.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>=1))fail('reviewed due race context required');
  const code=now>drTime[2]?1:0,text=raceByCode[code];if(typeof text!=='string'||text!==''&&!text.endsWith('\n'))fail('canonical race wire required');
  const i=text.indexOf('\n'),header=text===''?['0','0','0']:text.slice(0,i).split(','),entries=readRows(text===''?'':text.slice(i+1),rf);
  if(header.length!==3||header.some(s=>!int(s)||Number(s)<0)||Number(header[0])!==0||Number(header[1])>=12||Number(header[2])>1)fail('not a phase-zero race');
  const config=configs.get(review)[code][Number(header[1])],dragons=readRows(dragonText,df),jockeys=readRows(jockeyText,jf).filter(r=>r.town!==street||activeShopIds.includes(Number(r.owner)));
  const nextTime=[...drTime],nextRace=[...raceByCode],nextLog=[...raceLogByCode],bounds=[],logs=[],rejected=[];let di=0;
  const draw=n=>{if(di>=draws.length)fail('insufficient source draws');bounds.push(n);return Math.trunc(draws[di++]*n);};
  const setRace=(r,status)=>{const d=dragons.find(x=>x.no===r.dr),j=jockeys.find(x=>x.no===r.jock);if(d)d.race=status;if(j)j.race=status;};
  const log=s=>logs.unshift(now+'\t'+(code+1)+'\t'+s+'\n');let selected=[];
  if(entries.length<3){for(const r of entries){setRace(r,1);rejected.push(Number(r.dr));}log(config.name+'は出走竜不足のため開催が見送られました。');nextTime[code+1]+=86400*2;header[1]=(Number(header[1])+1)%12;header[2]=draw(2);}
  else {
    log(config.name+'の出走登録が締め切られました。');
    if(entries.length>config.cap){for(const r of entries){r.rnd=Number(r.prize)*10000+draw(10000);if(!Number.isSafeInteger(r.rnd))fail('source selection overflow');}entries.sort((a,b)=>code?b.rnd-a.rnd:a.rnd-b.rnd);for(const r of entries.slice(config.cap)){setRace(r,1);rejected.push(Number(r.dr));}log('出走竜多数のため，抽選が行われました。');}
    selected=entries.slice(0,config.cap);for(let j=0;j<selected.length;j++){selected[j].no=j+1;setRace(selected[j],3);}nextTime[code+1]+=3600*2;header[0]=1;
  }
  if(di!==draws.length||nextTime.some(n=>!id(n)))fail('unreviewed draw or schedule result');
  nextRace[code]=header.join(',')+'\n'+wire(selected,rf);nextLog[code]=null;
  return {raceCode:code,raceByCode:nextRace,raceLogByCode:nextLog,dragonText:wire(dragons,df),jockeyText:wire(jockeys,jf),drTime:nextTime,drLastText:'@DRTIME=('+nextTime.join(',')+');\n1;\n',newLogText:logs.join(''),drawBounds:bounds,selectedDragonIds:selected.map(r=>Number(r.dr)),rejectedDragonIds:rejected,payments:[],publicationIntent:[...(raceLogByCode[code]!==null?['race-log-live-unlink']:[]),'dragon-stage','jockey-stage','race-stage','dr-last-stage','dragon-log-stage','common-commit','common-unlock'],committable:false,worldStateWritten:false};
}
