/** Frozen gd-s.cgi normal guild treasury commands. No auth/CAS/file writes. */
import {createHash} from 'node:crypto';
const pins={handler:'2b743fdab85b897ba6a621f100df656f884ab29b',guild:'6593aa8a3ae4a1695c2418f12a3776f0053454ac',calc:'586354a9a300e26d0e12a4efa512fa25760e3197'};
const reviews=new WeakSet();
const fail=m=>{throw new RangeError('R4 guild command: '+m)};
const record=x=>x!==null&&typeof x==='object'&&Object.getPrototypeOf(x)===Object.prototype;
const signed=n=>Number.isSafeInteger(n);
const nat=n=>signed(n)&&n>=0;
const code=s=>typeof s==='string'&&/^[a-z][a-z0-9_]*$/.test(s);
const own=(x,k)=>Object.hasOwn(x,k)?x[k]:undefined;
const msg=(key,...args)=>({key,args});
const money=n=>({source:'GetMoneyString',amount:n});
export function reviewGuildCommands(sources){
  for(const [k,sha] of Object.entries(pins)){
    const s=sources?.[k];
    if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k);
  }
  const review=Object.freeze({source:'r4-original-guild-commands.v1',committable:false});reviews.add(review);return review;
}
export function projectGuildCommand({reviewed,actor,street,definitions,ledgers,command,nowSeconds,randomDraws=[]}){
  if(!reviews.has(reviewed)||!record(actor)||!nat(actor.id)||!actor.id||actor.status!==1||!code(actor.guild)||typeof actor.shopname!=='string'||
     !signed(actor.money)||!nat(actor.paytoday)||!nat(actor.saletoday)||!signed(actor.time)||!record(actor.user)||
     typeof street!=='string'||!street||!record(definitions)||!record(ledgers)||!record(command)||!['fund','force','break'].includes(command.kind)||
     !nat(nowSeconds)||!Array.isArray(randomDraws)||randomDraws.some(n=>!nat(n)||n>=1000000))fail('reviewed current guild context');
  const keys=Object.keys(definitions).sort();
  if(keys.join(',')!==Object.keys(ledgers).sort().join(','))fail('definition/ledger mismatch');
  for(const k of keys){
    const d=definitions[k],g=ledgers[k];
    if(!code(k)||!record(d)||typeof d.name!=='string'||!record(g)||!signed(g.money)||!nat(g.in)||!nat(g.out)||!signed(g.atk)||!signed(g.def))fail('guild data');
  }
  const def=own(definitions,actor.guild);
  if(!def)fail('member definition unavailable');
  const a=structuredClone(actor),next=structuredClone(ledgers),g=next[a.guild],logCalls=[],definitionRemoval=[],drawRanges=[];
  let receipt,returned=[];
  const edit=(row,amount)=>{if(amount>0)row.in+=amount;if(amount<0)row.out-=amount;row.money+=amount;};
  const log=(...args)=>logCalls.push(args);
  if(command.kind==='fund'){
    if(!nat(command.amount)||randomDraws.length)fail('fund amount or draws');
    const count=Math.min(command.amount,a.money);
    if(count<=0||a.money-count<100000)fail('source donation must leave 100000');
    edit(g,count);a.money-=count;a.paytoday+=count;
    returned=[msg('ギルド「%1」に%2寄付',def.name,money(count))];
    log(0,0,[msg('%1がギルド「%2」に%3寄付しました。',a.shopname,def.name,money(count))]);
    receipt={count,timeSeconds:0};
  }else{
    if(!a.user._so_e||a.user._so_e==='0')fail('source title required');
    if(Math.min(nowSeconds-a.time,259200)<10800)fail('source three hours required');
    a.time=Math.max(a.time,nowSeconds-259200)+10800;
    if(command.kind==='force'){
      if(!(def.leadt===street&&def.leader===a.id||record(def.representatives)&&own(def.representatives,street)===a.id))fail('source leader or representative required');
      if(g.atk>990||randomDraws.length)fail('source upgrade unavailable');
      const amount=Math.trunc(g.money/4);g.money-=amount;g.atk=Math.min(1000,g.atk+Math.trunc(amount/25000));
      returned=[msg('ギルド「%1」が軍備を増強しました。',def.name)];log(0,0,returned);
      receipt={amount,timeSeconds:10800};
    }else{
      const target=command.targetGuild,other=own(next,target),otherDef=own(definitions,target);
      if(!other||!otherDef||other.money<=g.money||randomDraws.length!==1)fail('source richer target and exact draw required');
      drawRanges.push(50);
      const power=g.atk-other.def+Math.trunc(50*randomDraws[0]/1000000);
      const attack=power>0?Math.trunc((other.money+1000000)*power/1600):0;
      g.atk=Math.trunc(g.atk*9/10);other.def=Math.trunc(other.def*4/5);
      returned=[msg('ギルド「%1」のブレイク。',def.name)];
      let income=0,loot=0;
      if(!attack){
        returned.push(msg('しかし「%1」は防御！',otherDef.name));log(2,0,returned);
      }else{
        returned.push(msg('「%1」から%2を奪取！',otherDef.name,money(attack)));
        edit(other,-attack);log(2,0,[...returned]);
        income=Math.trunc(attack/10)+1000;loot=Math.trunc(attack*9/10);
        edit(g,loot);a.money+=income;a.saletoday+=income;
        // Original PushLog reward call has two arguments, not three.
        log(0,[msg('%1ブレイク成功の報奨金として%2入手。',a.id,money(income))]);
        returned.push('<br>',msg('ブレイク成功の報奨金として%1入手。',money(income)));
        if(other.money<0){definitionRemoval.push(target);g.def=Math.min(1000,Math.trunc(g.def*3/2));}
      }
      receipt={power,attack,income,loot,timeSeconds:10800};
    }
  }
  if(![a.money,a.time,a.paytoday,a.saletoday,...Object.values(next).flatMap(x=>[x.money,x.in,x.out,x.atk,x.def])].every(signed))fail('source arithmetic overflow');
  return {actor:a,ledgers:next,receipt,returned,logCalls,drawRanges,definitionRemoval,
    stages:['guild-ledger-stage','renew-log','data-write','commit-request','unlock'],committable:false};
}
