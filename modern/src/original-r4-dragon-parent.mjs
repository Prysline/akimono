/** Reviewed original normal-player retirement and breeding candidate; not a save authority. */
function project({street,activeShopIds,actorId,now,dragonText,parentText,command,draws,ngNames}){
 const fail=m=>{throw new RangeError('R4 parent: '+m)},id=n=>Number.isSafeInteger(n)&&n>0,record=x=>x!==null&&typeof x==='object'&&Object.getPrototypeOf(x)===Object.prototype,town=s=>typeof s==='string'&&/^[A-Za-z][A-Za-z0-9_]*$/.test(s),numeric=s=>typeof s==='string'&&/^(0|[1-9]\d*)$/.test(s)&&Number.isSafeInteger(Number(s)),safe=s=>typeof s==='string'&&s!==''&&!/[,:;\t\r\n<>&\0]/.test(s);
 const DF='no birth fm color name town owner stable race apt sp spp sr srp ag agp pw pwp hl hlp fl flp con wt gr prize sdwin g3win g2win g1win'.split(' '),PF='no birth fm color name town owner apt hr preg sp sr ag pw hl fl prize sdwin g3win g2win g1win'.split(' '),traits=['sp','sr','ag','pw','hl','fl'];
 if(!town(street)||!Array.isArray(activeShopIds)||activeShopIds.some(n=>!id(n))||new Set(activeShopIds).size!==activeShopIds.length||!id(actorId)||!activeShopIds.includes(actorId)||!id(now)||!record(command)||!['retire','preg'].includes(command.kind)||!id(command.dr)||!Array.isArray(draws)||draws.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>=1)||!Array.isArray(ngNames)||ngNames.some(s=>typeof s!=='string'||!s))fail('reviewed context required');
 const allowed=command.kind==='retire'?['kind','dr','check']:['kind','dr','pr','name'];if(Object.keys(command).some(k=>!allowed.includes(k)))fail('unreviewed form field');
 function read(text,keys){if(typeof text!=='string'||text!==''&&!text.endsWith('\n'))fail('canonical wire required');const seen=new Set();return text.split('\n').slice(0,-1).map(line=>{const f=line.split(','),r=Object.fromEntries(keys.map((k,i)=>[k,f[i]]));if(f.length!==keys.length||!numeric(r.no)||!id(Number(r.no))||seen.has(r.no)||!numeric(r.birth)||!id(Number(r.birth))||Number(r.birth)>now||!safe(r.name)||!town(r.town)||!numeric(r.owner)||!id(Number(r.owner))||keys.some(k=>!['name','town'].includes(k)&&r[k]!==''&&!numeric(r[k]))||![0,1].includes(Number(r.fm))||Number(r.color)>4)fail('unreviewed row');seen.add(r.no);return r;});}
 const dragons=read(dragonText,DF),parents=read(parentText,PF).map(r=>r.town===street&&!activeShopIds.includes(Number(r.owner))?null:r);
 const own=r=>r?.town===street&&Number(r.owner)===actorId,wire=(rows,keys)=>rows.filter(Boolean).map(r=>keys.map(k=>r[k]??'').join(',')+'\n').join('');
 const nextNo=rows=>{const no=Number(rows[0]?.no??0)+1;if(!id(no)||rows.some(r=>Number(r?.no)===no))fail('original ID collision');return no;};
 const bounds=[];let di=0,newLogText='',parentChanged=false;
 const draw=n=>{if(!Number.isSafeInteger(n)||n<0||di>=draws.length)fail('unreviewed RNG');bounds.push(n);return draws[di++]*(n||1);};
 if(command.kind==='retire'){
   const i=dragons.findIndex(r=>Number(r.no)===command.dr),d=dragons[i];
   if(!own(d)||Number(d.race)>1||now-Number(d.birth)<=864000||command.check!=='retire')fail('normal retire form or confirmation denied');
   if(Number(d.prize)>=300){
     const p={no:nextNo(parents),birth:d.birth,fm:d.fm,color:d.color,name:d.name,town:street,owner:actorId,apt:d.apt,hr:Math.trunc(draw(95))+5,prize:d.prize,sdwin:d.sdwin,g3win:d.g3win,g2win:d.g2win,g1win:d.g1win};
     for(const k of traits){p[k]=Number(d[k])-Number(d[k+'p']);if(p[k]<0)fail('unreviewed inherited attribute');}
     parents.unshift(p);parentChanged=true;
     // Original call passes raw format plus unused extra arguments to two-arg PushDraLog.
     newLogText=now+'\t0\tドラゴン「%1」が引退し，%2%3竜入りしました。\n';
   }
   dragons.splice(i,1);
 }else{
   if(dragons.filter(own).length>=3)fail('dragon capacity');
   const dam=parents.find(r=>Number(r?.no)===command.dr),sire=parents.find(r=>Number(r?.no)===command.pr);
   if(!own(dam)||Number(dam.fm)!==1||now-Number(dam.preg)<=259200||!id(command.pr)||!sire||Number(sire.fm)!==0)fail('normal breeding form denied');
   const name=command.name;if(!safe(name)||[...name].length<6||[...name].length>20||ngNames.some(s=>name.includes(s)))fail('invalid name');
   if(![dam,sire].every(r=>Number(r.hr)>=5&&Number(r.hr)<=99))fail('unreviewed heredity');
   const d={no:nextNo(dragons),birth:now,fm:Math.trunc(draw(2)),color:Math.trunc(draw(5)),name,town:street,owner:actorId};
   const weight=Number(dam.hr)+Number(sire.hr);
   for(const k of ['apt',...traits]){const weighted=Number(dam[k])*Number(dam.hr)+Number(sire[k])*Number(sire.hr);if(!Number.isSafeInteger(weighted))fail('heredity overflow');let v=Math.trunc(weighted/weight);if(k!=='apt')v=Math.min(100,Math.trunc((v*4+draw(v)*2)/5));d[k]=v;}
   d.apt=Math.trunc((d.apt*100+50)/100);d.con=30+Math.trunc(draw(10));d.wt=43+Math.trunc(draw(3));dragons.unshift(d);dam.preg=now;parentChanged=true;
 }
 if(di!==draws.length)fail('unused source RNG');
 return {dragonText:wire(dragons,DF),parentText:parentChanged?wire(parents,PF):parentText,parentChanged,newLogText,drawBounds:bounds,payments:[],publicationIntent:[...(newLogText?['dragon-log-stage']:[]),...(parentChanged?['parent-stage']:[]),'dragon-stage','common-commit'],committable:false,worldStateWritten:false};
}
export const projectDragonParent=project;
