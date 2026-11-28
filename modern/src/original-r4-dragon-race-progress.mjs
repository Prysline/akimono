/** Candidate for original Race1..3 only. Source commentary context is trusted, not a player parameter. */
import {createHash} from 'node:crypto';
function parseConfig(source){
  const matches=[...source.matchAll(/^\s*\[l\("([^"]+)"\),\s*,?(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\],/gm)];
  if(matches.length!==24)throw new RangeError('unreviewed race table');return [matches.slice(0,12),matches.slice(12)].map(a=>a.map(m=>[m[1],...m.slice(2).map(Number)]));
}
function project(races,{now,drTime,raceByCode,raceLogByCode,draws,sourceGlobalIndex=0,translate=undefined,imageURL='./image',imageExt='.png'}){
  const fail=m=>{throw new RangeError('R4 race progress: '+m)};
  const id=n=>Number.isSafeInteger(n)&&n>0;
  const integer=s=>typeof s==='string'&&/^-?(0|[1-9]\d*)$/.test(s)&&Number.isSafeInteger(Number(s));
  const keys='no dr birth fm color name ranch rcname stable stname jock jkname prize strate sp1 sp2 sp3 sp4 pop time str lose'.split(' ');
  const texts=['name','rcname','stname','jkname','lose'];
  if(!id(now)||!Array.isArray(drTime)||drTime.length!==3||drTime.some(n=>!id(n))||now>drTime[0]||!(now>drTime[1]||now>drTime[2])||!Array.isArray(raceByCode)||raceByCode.length!==2||!Array.isArray(raceLogByCode)||raceLogByCode.length!==2||raceLogByCode.some(t=>t!==null&&typeof t!=='string')||!Array.isArray(draws)||draws.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>=1)||!Number.isSafeInteger(sourceGlobalIndex)||sourceGlobalIndex<0||typeof imageURL!=='string'||typeof imageExt!=='string'||/["<>\r\n]/.test(imageURL+imageExt)||translate!==undefined&&typeof translate!=='function')fail('reviewed due race context required');
  const code=now>drTime[2]?1:0,text=raceByCode[code];
  if(typeof text!=='string'||!text.endsWith('\n'))fail('canonical race file required');
  const [head,...lines]=text.slice(0,-1).split('\n'),header=head.split(','),[phase,index,weather]=header.map(Number);
  if(header.length!==3||header.some(s=>!integer(s))||![1,2,3].includes(phase)||index<0||index>=12||![0,1].includes(weather))fail('unreviewed race phase');
  const R=races[code][index],seen=new Set(),drSeen=new Set();
  if(lines.length<3||lines.length>R[9]||((phase===1||phase===2)&&sourceGlobalIndex>=lines.length))fail('unreviewed source rows or global index');
  const rows=lines.map(line=>{const f=line.split(','),r=Object.fromEntries(keys.map((k,i)=>[k,f[i]]));
    if(f.length!==keys.length||!r.name||!id(Number(r.no))||!id(Number(r.dr))||seen.has(r.no)||drSeen.has(r.dr)||keys.some(k=>texts.includes(k)?/[,:;\t\r\n<>&\0]/.test(r[k]):r[k]!==''&&(!integer(r[k])||(!['sp1','sp2','sp3','sp4','time'].includes(k)&&Number(r[k])<0)))||![0,1].includes(Number(r.fm))||Number(r.color)>4||Number(r.strate)>4||Number(r.str)>3)fail('unreviewed source row');
    seen.add(r.no);drSeen.add(r.dr);return r;
  });
  const bounds=[],nextTime=[...drTime],nextRace=[...raceByCode],nextLog=[...raceLogByCode];let di=0;
  const draw=n=>{if(di>=draws.length)fail('missing source RNG');bounds.push(n);return Math.trunc(draws[di++]*n);};
  const l=(s,...args)=>{const value=translate?translate(s,...args):s.replace(/%([1-9]\d*)/g,(_,n)=>String(args[Number(n)-1]??''));if(typeof value!=='string')fail('invalid translation result');return value;};
  const name= l(R[0]),img=r=>'<IMG class="i" SRC="'+imageURL+'/dragon'+(Number(r.fm)+1)+(Number(r.color)+1)+imageExt+'">';
  const prior=rows[0].no;let log='';
  const add=(s,...args)=>{log+=l(s,...args);},line=(s,...args)=>{add(s,...args);log+='<br>\n';};
  if(phase===1){
    for(const r of rows){r.sumsp=Number(r.prize)*100+draw(100);if(!Number.isSafeInteger(r.sumsp))fail('popularity overflow');}
    rows.sort((a,b)=>b.sumsp-a.sumsp);rows.forEach((r,i)=>r.pop=i+1);
  }
  for(const r of rows){const speed=Number(r['sp'+phase]);if(speed===0)fail('source division by zero');r.time=Number(r.time)+Math.trunc(R[5]*1000/4/speed);if(!Number.isSafeInteger(r.time))fail('time overflow');}
  rows.sort((a,b)=>a.time-b.time);
  const first=rows[0],global=rows[sourceGlobalIndex];
  if(phase===1){
    line('それでは <b>%1</b>の出走です',name);
    if(R[1]===5)line('初々しい竜たちが勢ぞろい');
    if(R[1]===0)line('栄冠を手にするのは 果たしてどの竜なのか');
    if(R[4])line('このコースの終盤は坂になっています 一波乱あるかもしれません');
    line('いま スタートです');
    if(Number(first.strate)<2){line('トップに立ったのは <b>%1%2</b>',img(global),global.name);line('大方の予想通りといったところでしょうか');}
    else {line('なんと <b>%1%2</b> がいきなりトップに立ちました',img(global),global.name);line('これは 作戦なのか');}
    const i=draw(rows.length-1)+1,r=rows[i];
    line('現在 %1番目を走っているのは %2枠 <b>%3%4</b>',i+1,r.no,img(r),r.name);
    if(Number(r.pop)<4)line('%1番人気の期待を受け この位置から勝利を狙います',r.pop);else line('人気は %1番となりましたが 果たしてこの竜は伏兵となるでしょうか',r.pop);
  }else if(phase===2){
    line('最初のコーナーを回りました');
    if(prior===first.no){line('現在 トップは変わらず <b>%1%2</b>',img(global),global.name);line('この勢いは 最後まで続くのか');}
    else {add('ここで トップが変わる ');line('トップは <b>%1%2</b>',img(global),global.name);}
    const pad=n=>String(n).padStart(2,'0'),tm=pad(Math.trunc(first.time/60))+'.'+pad(((first.time%60)+60)%60);
    line('中間%1kmの通過タイムは %2',R[5]/2,tm);line('ほぼ 平常どおりといえるでしょう 展開にさほど影響はなさそうです');
    let i=draw(rows.length-1)+1;for(let j=1;j<rows.length;j++)if([2,3].includes(Number(rows[j].strate))){i=j;break;}
    line('<b>%1%2</b> いい位置だ ここから トップを狙うのか',img(rows[i]),rows[i].name);
  }else{
    line('後続竜が差を詰めていきます');
    if(prior===first.no){add('さあ どうか');log+='</b> ';line('トップは変わらず <b>%1%2</b>',img(first),first.name);add('このまま 逃げ切れるのか');log+=' ';}
    else {line('<b>%1%2</b> が差した！',img(first),first.name);add('さあ どうか');log+='</b> ';}
    line('後を追うのは <b>%1%2</b>',img(rows[1]),rows[1].name);
    let i=draw(rows.length-1)+1;for(let j=2;j<rows.length;j++)if([2,3].includes(Number(rows[j].strate))){i=j;break;}
    line('<b>%1%2</b> いい足取りだが どうか',img(rows[i]),rows[i].name);
  }
  if(di!==draws.length)fail('unused source draws');
  nextTime[code+1]+=(phase===3?6:8)*3600;if(!id(nextTime[code+1]))fail('schedule overflow');
  header[0]=String(phase+1);nextRace[code]=header.join(',')+'\n'+rows.map(r=>keys.map(k=>r[k]??'').join(',')+'\n').join('');
  nextLog[code]=(nextLog[code]??'')+log;
  return {raceCode:code,phase,rankedDragonIds:rows.map(r=>Number(r.dr)),raceByCode:nextRace,raceLogByCode:nextLog,commentaryAppend:log,drTime:nextTime,drLastText:'@DRTIME=('+nextTime.join(',')+');\n1;\n',drawBounds:bounds,payments:[],publicationIntent:['race-log-live-append','race-stage','dr-last-stage','common-commit','common-unlock'],committable:false,worldStateWritten:false};
}
const reviews=new WeakMap();
export function reviewRaceProgressConfig(source){
  if(typeof source!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0').update(source).digest('hex')!=='76bb00f247733630cbcc374a82f693638f653b71')throw new RangeError('source config drift');
  const token=Object.freeze({committable:false});reviews.set(token,parseConfig(source));return token;
}
export function projectRaceProgress({review,...input}){if(!reviews.has(review))throw new RangeError('reviewed source config required');return project(reviews.get(review),input);}
