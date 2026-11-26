/** Owner of the source-reviewed personnel candidate in the independent disk.
 * The controller validates full normal EVENT context and command provenance.
 * External rebellion is not yet authorized. An absent file remains absent
 * until a successful WriteArmy. No fixture can grant player assets.
 */
import {reviewR4ArmyPersonnel,projectR4ArmyPersonnel} from './original-r4-army-personnel.mjs';
import {reviewR4ArmyView,describeR4ArmyView} from './original-r4-army-view.mjs';
import {parseArmyFile,serializeArmyFile} from './original-r4-army-files.mjs';
export const ARMY_COMMANDS=Object.freeze(['hire-army','fire-army']);
const fail=m=>{throw new RangeError('R4 independent army: '+m)};
export function createIndependentArmyProjection(sources){
  const reviewed=reviewR4ArmyPersonnel({armyCommand:sources.armyCommandSource,army:sources.armyFileSource,calc:sources.armyCalcSource,config:sources.configSource});
  const view=reviewR4ArmyView({viewSource:sources.armyViewSource,calcSource:sources.armyCalcSource,configSource:sources.configSource});
  function validate(world){
    if(!world.period?.eventState||Object.hasOwn(world.period.eventState,'rebel'))fail('external rebel context not authorized');
    const live=world.period?.disk?.live;
    if(!live)fail('source disk required');
    if(!Object.hasOwn(live,'army.cgi'))return true;
    if(world.shops.length!==1||world.shops[0].id!==1)fail('army requires current shop');
    const bytes=live['army.cgi'].bytes,army=parseArmyFile(bytes,[1]);
    if(army.riotIds.length||Object.keys(army.armyById).some(k=>k!=='1')||
       serializeArmyFile(army,[1])!==bytes)fail('canonical independent nonriot army required');
    // Dignity may decay below current army count. No automatic pruning.
    return true;
  }
  const bytes=world=>world.period.disk.live['army.cgi']?.bytes??null;
  function describe(world){
    validate(world);
    if(world.shops.length===0)return null;
    return describeR4ArmyView({reviewed:view,world,armyBytes:bytes(world)});
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
    const candidate=projectR4ArmyPersonnel({reviewed,world:{...world,period:{...world.period,eventState:{}}},armyBytes:bytes(world),command});
    if(candidate.committable!==false||candidate.receipt.committable!==false)fail('source candidate required');
    const {committable,...receipt}=candidate.receipt;
    return {shops:candidate.shops,armyBytes:candidate.armyBytes,receipt};
  }
  return Object.freeze({validate,describe,apply});
}
