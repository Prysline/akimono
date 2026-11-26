/** User-approved normal player flow (A), separate from raw CGI projections.
 * Context MUST come from authenticated server state inside the real CAS.
 * This pure guard is not authentication, a CAS implementation or publication.
 */
const record=x=>x!==null&&typeof x==='object'&&Object.getPrototypeOf(x)===Object.prototype;
const id=n=>Number.isSafeInteger(n)&&n>0;
const code=s=>typeof s==='string'&&/^[A-Za-z][A-Za-z0-9_]*$/.test(s);
const own=(x,k)=>Object.hasOwn(x,k)?x[k]:undefined;
const refuse=m=>{throw new RangeError('R4 guild player policy: '+m)};
const kinds=['make','edit','grant','join','leave','name','fire'];
export function authorizeGuildPlayerAction({snapshot,actorRef,expectedRevision,command}){
  if(!record(snapshot)||!Number.isSafeInteger(snapshot.revision)||snapshot.revision<0||!Number.isSafeInteger(expectedRevision)||expectedRevision!==snapshot.revision)refuse('stale or invalid revision');
  const {street,shops,definitions,guildbattle,directory}=snapshot;
  if(!code(street)||!Array.isArray(shops)||!record(definitions)||typeof guildbattle!=='boolean'||!record(directory)||!record(actorRef)||actorRef.street!==street||!id(actorRef.shopId)||!record(command)||!kinds.includes(command.kind))refuse('trusted current context required');
  const seen=new Set();
  for(const row of shops){
    if(!record(row)||!id(row.id)||seen.has(row.id)||!(row.guild===''||code(row.guild))||!Number.isSafeInteger(row.dignity)||row.dignity<0)refuse('invalid active shop row');
    seen.add(row.id);
  }
  const actor=shops.find(row=>row.id===actorRef.shopId);
  if(!actor)refuse('actor not active');
  const definition=own(definitions,actor.guild);
  if(definition!==undefined&&(!record(definition)||!code(definition.leadt)||!id(definition.leader)||!record(definition.representatives)))refuse('unreviewed current definition');
  const leader=!!actor.guild&&definition?.leadt===street&&definition.leader===actor.id;
  const representative=!!actor.guild&&!!definition&&own(definition.representatives,street)===actor.id;
  const directoryHas=(town,shopId)=>{
    const rows=own(directory,town);
    return code(town)&&id(shopId)&&Array.isArray(rows)&&rows.every(id)&&new Set(rows).size===rows.length&&rows.includes(shopId);
  };
  switch(command.kind){
    case 'make':
      if(actor.guild||actor.dignity<16)refuse('establishment requires unaffiliated shop and dignity 16');
      // The normal make form has no representative selectors (gd-f).
      if(!record(command.representatives)||Object.values(command.representatives).some(n=>n!==''))refuse('make form has no representative appointment');
      break;
    case 'edit':
      if(!leader||command.code!==actor.guild)refuse('headquarters leader may edit only own guild');
      if(!record(command.representatives)||Object.entries(command.representatives).some(([town,n])=>!Array.isArray(own(directory,town))||n!==''&&!directoryHas(town,n)))refuse('representative not in current directory');
      break;
    case 'grant': {
      if(!leader&&!representative)refuse('invitation requires leader or local representative');
      if(guildbattle)refuse('invitation during guild battle');
      if(!record(command.selections)||Object.entries(command.selections).some(([town,n])=>!Array.isArray(own(directory,town))||n!==0&&!directoryHas(town,n)))refuse('invitation target not in current directory');
      if(Object.values(command.selections).filter(n=>n!==0).length!==1)refuse('select one invitation recipient');
      break;
    }
    case 'join':
      if(actor.guild||guildbattle)refuse('join during guild battle or while affiliated');
      // Missing common definition is an integrity refusal, not an extra source game rule.
      if(!code(command.guild)||!record(own(definitions,command.guild)))refuse('invited guild definition unavailable');
      break;
    case 'leave':
      if(!actor.guild||leader||guildbattle)refuse('voluntary leave unavailable');
      break;
    case 'name':
    case 'fire': {
      if(!leader&&!representative)refuse('personnel requires leader or local representative');
      const target=shops.find(row=>row.id===command.targetId);
      if(!target||target.guild!==actor.guild)refuse('target must be current same-street guild member');
      if(command.kind==='fire'&&definition.leadt===street&&definition.leader===target.id)refuse('cannot expel headquarters leader');
      break;
    }
  }
  return Object.freeze({street,actorId:actor.id,kind:command.kind,revision:snapshot.revision,committable:false});
}
