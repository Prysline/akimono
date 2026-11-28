/** Source-reviewed guild personnel handler subset. No authentication or publication.
 * Caller must supply the authenticated stable actor and current street snapshot.
 * Translation is represented by the original message keys and arguments, not UI text.
 */
import {createHash} from 'node:crypto';
const pins={personnel:'5580c540934d04316ea4f37f9ea80aa213f2d628',user:'8e817c535d4cd17e68d65f0e2f67846a344b5094'};
const reviews=new WeakSet();
const bad=m=>{throw new RangeError('R4 guild personnel: '+m)};
const id=n=>Number.isSafeInteger(n)&&n>0;
const record=x=>x!==null&&typeof x==='object'&&Object.getPrototypeOf(x)===Object.prototype;
const own=(x,k)=>Object.hasOwn(x,k)?x[k]:undefined;
const guildCode=s=>typeof s==='string'&&(s===''||/^[A-Za-z][A-Za-z0-9_]*$/.test(s));
export function reviewGuildPersonnel(sources){
  for(const [k,sha] of Object.entries(pins)){
    const s=sources?.[k];
    if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)bad('source drift '+k);
  }
  const review=Object.freeze({committable:false});
  reviews.add(review);return review;
}
// Fixture-local rendering of original keys for source differential only.
const msg=(key,...args)=>({key,args});
export function projectGuildPersonnel({reviewed,street,shops,definitions,actorId,command}){
  if(!reviews.has(reviewed)||typeof street!=='string'||!street||!Array.isArray(shops)||!record(definitions)||!id(actorId)||!record(command))bad('reviewed context required');
  const seen=new Set();
  for(const row of shops){
    if(!record(row)||!id(row.id)||seen.has(row.id)||!guildCode(row.guild)||typeof row.shopname!=='string'||!record(row.user))bad('unreviewed active shop row');
    seen.add(row.id);
  }
  for(const [code,g] of Object.entries(definitions)){
    if(!guildCode(code)||!code||!record(g)||typeof g.name!=='string'||typeof g.leadt!=='string'||!id(g.leader)||!record(g.representatives)||Object.values(g.representatives).some(n=>!id(n)))bad('unreviewed guild definition');
  }
  const next=structuredClone(shops),actor=next.find(s=>s.id===actorId);
  if(!actor)bad('actor not found');
  const definition=own(definitions,actor.guild);
  let target=actor,log;
  if(command.kind==='leave'){
    if(command.confirmation!=='leave')bad('confirmation');
    if(!actor.guild)bad('not a member');
    const name=definition?.name||msg('解散したギルド');
    log=[1,0,msg('%1がギルド「%2」から退団しました。',actor.shopname,name)];
    delete actor.user._so_e;actor.guild='';
  }else if(command.kind==='name'||command.kind==='fire'){
    if(!actor.guild||!definition||!(
      definition.leadt===street&&definition.leader===actor.id||
      own(definition.representatives,street)===actor.id))bad('not authorized');
    if(!id(command.targetId))bad('target required');
    target=next.find(s=>s.id===command.targetId);
    if(!target)bad('target not found');
    if(target.guild!==actor.guild)bad('different guild');
    if(command.kind==='name'){
      if(typeof command.title!=='string'||[...command.title].length>20)bad('title length');
      target.user._so_e=command.title;
      log=[2,0,msg('ギルド「%1」は%2',definition.name,msg('%1を「%2」に叙しました。',target.shopname,command.title))];
    }else{
      if(definition.leadt===street&&definition.leader===target.id)bad('cannot expel headquarters leader');
      if(command.confirmation!=='leave')bad('confirmation');
      delete target.user._so_e;target.guild='';
      // gd-e reads the actor's guild AFTER clearing the target, including self.
      log=[1,0,msg('%1がギルド「%2」から除名されました。',target.shopname,own(definitions,actor.guild)?.name??null)];
    }
  }else bad('unknown personnel command');
  return {shops:next,logCalls:[log],actorId,targetId:target.id,committable:false,worldStateWritten:false};
}
