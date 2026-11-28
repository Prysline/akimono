/** Phase four source candidate, with valid settlement projection and quarantined source evidence. */
import {createHash} from 'node:crypto';
function parseConfig(source){
  const matches=[...source.matchAll(/^\s*\[l\("([^"]+)"\),\s*,?(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\],/gm)];
  if(matches.length!==24)throw new RangeError('unreviewed race table');return [matches.slice(0,12),matches.slice(12)].map(a=>a.map(m=>[m[1],...m.slice(2).map(Number)]));
}
function finish(races,{street,activeByStreet,now,drTime,raceByCode,raceLogByCode,dragonText,jockeyText,ranchText,stableText,payoutByStreet,draws,translate,imageURL='./image',imageExt='.png'}){
  const fail=m=>{throw new RangeError('R4 race finish: '+m)};
  const id=n=>Number.isSafeInteger(n)&&n>0,rec=x=>x!==null&&typeof x==='object'&&Object.getPrototypeOf(x)===Object.prototype,town=s=>typeof s==='string'&&/^[A-Za-z][A-Za-z0-9_]*$/.test(s)&&!['constructor','prototype'].includes(s),integer=s=>typeof s==='string'&&/^-?(0|[1-9]\d*)$/.test(s)&&Number.isSafeInteger(Number(s));
  const DF='no birth fm color name town owner stable race apt sp spp sr srp ag agp pw pwp hl hlp fl flp con wt gr prize sdwin g3win g2win g1win'.split(' '),JF='no birth name town owner race ahead back sp sdwin g3win g2win g1win'.split(' '),SF='no birth name town owner emp tr con wt sp sr ag pw hl fl sdwin g3win g2win g1win'.split(' '),RC='no birth name town owner prize sdwin g3win g2win g1win'.split(' '),RD='no dr birth fm color name ranch rcname stable stname jock jkname prize strate sp1 sp2 sp3 sp4 pop time str lose'.split(' ');
  const texts=['name','town','rcname','stname','jkname','lose'];
  if(!town(street)||!rec(activeByStreet)||!Object.hasOwn(activeByStreet,street)||!id(now)||!Array.isArray(drTime)||drTime.length!==3||drTime.some(n=>!id(n))||now>drTime[0]||!(now>drTime[1]||now>drTime[2])||!Array.isArray(raceByCode)||raceByCode.length!==2||!Array.isArray(raceLogByCode)||raceLogByCode.length!==2||raceLogByCode.some(x=>x!==null&&typeof x!=='string')||!rec(payoutByStreet)||!Array.isArray(draws)||draws.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>=1)||translate!==undefined&&typeof translate!=='function'||typeof imageURL!=='string'||typeof imageExt!=='string'||/["<>\r\n]/.test(imageURL+imageExt))fail('reviewed due world context required');
  for(const [t,ids] of Object.entries(activeByStreet))if(!town(t)||!Array.isArray(ids)||ids.some(n=>!id(n))||new Set(ids).size!==ids.length)fail('invalid directory');
  const code=now>drTime[2]?1:0,text=raceByCode[code];if(typeof text!=='string'||!text.endsWith('\n'))fail('canonical race file required');
  const at=text.indexOf('\n'),h=text.slice(0,at).split(','),[phase,index,weather]=h.map(Number);
  if(h.length!==3||h.some(s=>!integer(s))||phase!==4||index<0||index>=12||![0,1].includes(weather))fail('not a reviewed final phase');
  const R=races[code][index];
  function read(s,fields,clear=false){
    if(typeof s!=='string'||s!==''&&!s.endsWith('\n'))fail('canonical wire required');const map=new Map(),rows=[];
    for(const line of s.split('\n').slice(0,-1)){
      const f=line.split(','),r=Object.fromEntries(fields.map((k,i)=>[k,f[i]]));
      if(f.length!==fields.length||!integer(r.no)||!id(Number(r.no))||map.has(Number(r.no))||!r.name||fields.some(k=>texts.includes(k)?/[,:;\t\r\n<>&\0]/.test(r[k]):r[k]!==''&&(!integer(r[k])||(!['sp1','sp2','sp3','sp4','time'].includes(k)&&Number(r[k])<0))))fail('unreviewed row');
      if(fields.includes('town')&&(!town(r.town)||!id(Number(r.owner))||!Object.hasOwn(activeByStreet,r.town)))fail('missing source owner directory');
      // ReadJock/Ranch/Stable retain ID index after clearing local inactive rows.
      const v=clear&&r.town===street&&!activeByStreet[street].includes(Number(r.owner))?Object.fromEntries(fields.map(k=>[k,''])):r;
      map.set(Number(r.no),v);rows.push(v);
    }
    return {map,rows,fields};
  }
  const d=read(dragonText,DF),j=read(jockeyText,JF,true),r=read(ranchText,RC,true),s=read(stableText,SF,true),entries=read(text.slice(at+1),RD).rows;
  if(entries.length<3||entries.length>R[9]||new Set(entries.map(e=>e.dr)).size!==entries.length||entries.some(e=>!id(Number(e.dr))||![0,1].includes(Number(e.fm))||Number(e.color)>4||Number(e.str)>3))fail('unreviewed entries');
  const payout={},sourcePayments=[],payments=[],quarantinedPayments=[],bounds=[];let di=0,log='';
  for(const [t,v] of Object.entries(payoutByStreet)){if(!town(t)||typeof v!=='string'||v!==''&&!v.endsWith('\n'))fail('canonical payout required');for(const line of v.split('\n').slice(0,-1)){const m=/^([1-9]\d*)\t(-?(?:0|[1-9]\d*))$/.exec(line);if(!m||!id(Number(m[1]))||!Number.isSafeInteger(Number(m[2])))fail('unreviewed payout row');}payout[t]=v;}
  const draw=n=>{if(di>=draws.length)fail('missing source RNG');bounds.push(n);return Math.trunc(draws[di++]*n);};
  const put=(x,k,v)=>{if(!Number.isSafeInteger(v)||v<0)fail('unreviewed attribute result');x[k]=String(v);};
  const add=(x,k,v)=>put(x,k,Number(x[k])+v);
  const l=(str,...args)=>{const v=translate?translate(str,...args):str.replace(/%([1-9]\d*)/g,(_,n)=>String(args[Number(n)-1]??''));if(typeof v!=='string')fail('invalid translation');return v;};
  const line=(str,...args)=>{log+=l(str,...args)+'<br>\n';};
  const img=e=>'<IMG class="i" SRC="'+imageURL+'/dragon'+(Number(e.fm)+1)+(Number(e.color)+1)+imageExt+'">';
  const prior=entries[0].no;for(const e of entries){if(!Number(e.sp4))fail('source division by zero');e.time=Number(e.time)+Math.trunc(R[5]*1000/4/Number(e.sp4));if(!Number.isSafeInteger(e.time))fail('time overflow');}entries.sort((a,b)=>a.time-b.time);
  const a=img(entries[0])+'<b>'+entries[0].name+'</b>',b=img(entries[1])+'<b>'+entries[1].name+'</b>',close=entries[1].time-entries[0].time<15;
  line('最後のコーナーをまわって 直線に入ります');
  if(prior===entries[0].no){
    log+=l('さあ どうか');line('%1 が追い上げる',b);line('%1 が逃げる このまま逃げ切るか',a);
    if(close){line('%1 が迫る！ しかし %2 も粘る！',b,a);line('%1 だ！ 逃げ切りました！ 勝ったのは %1！',a);}
    else{line('%1 差を広げる！',a);line('%1！ この竜は強い！ 勝ったのは %1！',a);}
  }else{
    if(prior===entries[1].no){log+='さあ どうか';line('%1 が追い上げる',a);line('%1 が逃げる このまま逃げ切るか',b);}
    else{log+=l('さあ どうか');line('%1 が差した！',b);line('さらに <b>%1</b> が後に続く！',a);}
    if(close){line('%1 が迫る！ %2 が粘る！',a,b);line('%1 が差した！',a);line('%1 一歩及ばず！ 勝ったのは %2！',b,a);}
    else{line(prior===entries[1].no?'%1 が差した！':'%1 が一気に差した！',a);line('%1 さらに差を広げる！',a);line('%1！ この竜は強い！ 勝ったのは %1！',a);}
  }
  const winner=entries[0],winKey=R[1]>2?'sdwin':R[1]===2?'g3win':R[1]===1?'g2win':'g1win';
  const award=(e,rank)=>{
    const dragon=d.map.get(Number(e.dr));if(dragon){
      add(dragon,'gr',[80,40,20][rank]);add(dragon,'prize',R[6+rank]);const amount=R[6+rank]*10000;
      const p={ordinal:sourcePayments.length,sourceAction:'race-prize',sourceNo:Number(e.dr),place:rank+1,street:dragon.town,shopId:Number(dragon.owner),amount,bytes:dragon.owner+'\t'+amount+'\n'};
      const valid=activeByStreet[p.street].includes(p.shopId);const event={...p,disposition:valid?'settle':'quarantine'};sourcePayments.push(event);
      if(valid){payments.push(event);payout[p.street]=(payout[p.street]??'')+p.bytes;}else quarantinedPayments.push({...event,reason:'inactive-source-owner'});
      if(rank===0)add(dragon,winKey,1);
    }
  };
  const ranchAward=(e,rank)=>{const x=r.map.get(Number(e.ranch));if(x){add(x,'prize',R[6+rank]);if(rank===0)add(x,winKey,1);}};
  award(winner,0);
  const jk=j.map.get(Number(winner.jock));if(jk){if(!Number(jk.sp))put(jk,'sp',draw(8));const k=Number(winner.str)>1?'back':'ahead';put(jk,k,Math.min(100,Number(jk[k])+15));add(jk,winKey,1);}
  ranchAward(winner,0);
  const st=s.map.get(Number(winner.stable));if(st){for(const k of ['tr','con','wt'])put(st,k,Math.min(100,Number(st[k])+draw(20)));add(st,winKey,1);}
  for(let i=1;i<=2;i++){award(entries[i],i);ranchAward(entries[i],i);}
  const pad=n=>n<0?String(n):String(n).padStart(2,'0'),tm=v=>pad(Math.trunc(v/60))+'.'+pad(((v%60)+60)%60),strate=['逃げ','先行','差し','追込','自在'].map(x=>l(x));
  log+='<br>';for(let i=0;i<entries.length;i++){const e=entries[i];log+=l('%1着 %2',i+1,tm(e.time))+' '+strate[Number(e.str)]+' '+img(e)+e.name+(i?' <small>('+e.lose+')</small>':'')+'<br>';const x=d.map.get(Number(e.dr));if(x){put(x,'race',0);put(x,'con',Math.max(0,Number(x.con)-40));put(x,'wt',Math.max(38,Number(x.wt)-4));}const y=j.map.get(Number(e.jock));if(y)put(y,'race',0);}
  const next=[...drTime];next[code+1]=now+86400-((now+32400-(code===0?23:22)*3600)%86400+86400)%86400;if(!id(next[code+1]))fail('schedule overflow');
  const nextRace=[...raceByCode],nextLog=[...raceLogByCode];nextRace[code]=[0,(index+1)%12,draw(2)].join(',')+'\n';nextLog[code]=(nextLog[code]??'')+log;
  if(di!==draws.length)fail('unused source RNG');
  const wire=x=>x.rows.filter(v=>v.name).map(v=>x.fields.map(k=>v[k]??'').join(',')+'\n').join('');
  return {raceCode:code,rankedDragonIds:entries.map(e=>Number(e.dr)),raceByCode:nextRace,raceLogByCode:nextLog,commentaryAppend:log,dragonText:wire(d),jockeyText:wire(j),ranchText:wire(r),stableText:wire(s),payoutByStreet:payout,sourcePayments,payments,quarantinedPayments,drawBounds:bounds,drTime:next,drLastText:'@DRTIME=('+next.join(',')+');\n1;\n',newLogText:now+'\t'+(code+1)+'\t'+l('%1で「%2」が勝ちました。',l(R[0]),winner.name)+'\n',publicationIntent:['source-pay-attempts','dragon-stage','jockey-stage','ranch-stage','stable-stage','race-log-live-append','race-stage','dr-last-stage','dragon-log-stage','common-commit','common-unlock'],committable:false,worldStateWritten:false};
}
const reviews=new WeakMap();
export function reviewRaceFinishConfig(source){
  if(typeof source!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0').update(source).digest('hex')!=='76bb00f247733630cbcc374a82f693638f653b71')throw new RangeError('source config drift');
  const token=Object.freeze({committable:false});reviews.set(token,parseConfig(source));return token;
}
export function projectRaceFinish({review,...input}){if(!reviews.has(review))throw new RangeError('reviewed source config required');return finish(reviews.get(review),input);}
