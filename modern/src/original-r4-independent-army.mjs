/** Owner of the source-reviewed personnel candidate in the independent disk.
 * The controller validates full normal EVENT context and command provenance.
 * External rebellion is not yet authorized. An absent file remains absent
 * until a successful WriteArmy. No fixture can grant player assets.
 */
import {reviewR4ArmyPersonnel,projectR4ArmyPersonnel} from './original-r4-army-personnel.mjs';
import {reviewR4ArmyView,describeR4ArmyView} from './original-r4-army-view.mjs';
import {parseArmyFile,serializeArmyFile} from './original-r4-army-files.mjs';
import {reviewR4ArmyConflict,describeR4ArmyConflict,projectR4ArmyConflictCommand} from './original-r4-army-conflict.mjs';
export const CONFLICT_COMMANDS=Object.freeze(['start-rebellion','join-rebellion','dispatch-guard']);
export const ARMY_COMMANDS=Object.freeze(['hire-army','fire-army']);
const fail=m=>{throw new RangeError('R4 independent army: '+m)};
export function createIndependentArmyProjection(sources,{externalRebel=false}={}){
  const reviewed=reviewR4ArmyPersonnel({armyCommand:sources.armyCommandSource,army:sources.armyFileSource,calc:sources.armyCalcSource,config:sources.configSource});
  const view=reviewR4ArmyView({viewSource:sources.armyViewSource,calcSource:sources.armyCalcSource,configSource:sources.configSource});
  const conflict=externalRebel?reviewR4ArmyConflict({armyCommand:sources.armyCommandSource,army:sources.armyFileSource,calc:sources.armyCalcSource,config:sources.configSource,view:sources.armyViewSource}):null;
  const rebelOnly=world=>Object.hasOwn(world.period.eventState,'rebel')?{rebel:world.period.eventState.rebel}:{};
  function validate(world){
    if(!world.period?.eventState||(!externalRebel&&Object.hasOwn(world.period.eventState,'rebel')))fail('external rebel context not authorized');
    const live=world.period?.disk?.live;
    if(!live)fail('source disk required');
    if(world.shops.some(s=>Object.hasOwn(s,'army')))fail('transient army is not a play field');
    if(!Object.hasOwn(live,'army.cgi')){if(Object.hasOwn(world.period.eventState,'rebel'))fail('active rebel requires committed army file');return true;}
    if(world.shops.length!==1||world.shops[0].id!==1)fail('army requires current shop');
    const bytes=live['army.cgi'].bytes,army=parseArmyFile(bytes,[1]);
    if((!externalRebel&&army.riotIds.length)||Object.keys(army.armyById).some(k=>k!=='1')||
       serializeArmyFile(army,[1])!==bytes)fail('canonical independent nonriot army required');
    // Dignity may decay below current army count. No automatic pruning.
    return true;
  }
  const bytes=world=>world.period.disk.live['army.cgi']?.bytes??null;
  function describe(world){
    validate(world);
    if(world.shops.length===0)return null;
    const quote=describeR4ArmyView({reviewed:view,world,armyBytes:bytes(world)});
    return quote;
  }
  function apply(world,command){
    validate(world);
    const quote=describe(world);
    if(!quote||!ARMY_COMMANDS.includes(command?.kind))fail('active army command required');
    // Public facility follows original UI full-time eligibility. The
    // isolated handler still retains its separately tested time-debt path.
    if(command.kind==='hire-army'?!quote.canHire:!quote.canFire)
      fail('facility '+(command.kind==='hire-army'?quote.hireReason:quote.fireReason));
    // The owner already reviewed normal EVENT keys; only rebel affects the
    // original price. Keep the fixture projector's narrower input contract.
    const candidate=projectR4ArmyPersonnel({reviewed,world:{...world,period:{...world.period,eventState:externalRebel?rebelOnly(world):{}}},armyBytes:bytes(world),command});
    if(candidate.committable!==false||candidate.receipt.committable!==false)fail('source candidate required');
    const {committable,...receipt}=candidate.receipt;
    return {shops:candidate.shops,armyBytes:candidate.armyBytes,receipt};
  }
  function conflictInput(world){
    validate(world);
    if(!conflict||world.period.settledCount<1||world.shops.length!==1)fail('settled source conflict runtime required');
    const {people,...town}=world.period.town;
    return {reviewed:conflict,world:{...world,period:{...world.period,town,eventState:rebelOnly(world)}},armyBytes:bytes(world)};
  }
  function describeConflict(world){
    if(!conflict||world.period.settledCount<1||!world.shops.length)return null;
    return describeR4ArmyConflict({...conflictInput(world),shopId:1});
  }
  function applyConflict(world,command){
    const candidate=projectR4ArmyConflictCommand({...conflictInput(world),command,requireFacility:true});
    if(candidate.committable!==false||candidate.receipt.committable!==false)fail('source conflict candidate required');
    const {committable,...receipt}=candidate.receipt;
    // Keep ordinary active keys and their insertion order. Only the source
    // conflict assignment may change rebel; native DataRead orders next time.
    const eventState={...world.period.eventState,...candidate.eventState};
    const period={...world.period,town:{...candidate.town,people:world.period.town.people},eventState};
    return {shops:candidate.shops,period,armyBytes:candidate.armyBytes,receipt};
  }
  return Object.freeze({validate,describe,apply,...(conflict?{describeConflict,applyConflict}:{})});
}
