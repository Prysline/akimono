/** Narrow original rebel commerce context: the existing reviewed BUY/USE
 * registries still own every item, callback and RNG gate. No acquisition
 * authority; the independent disk owner must validate the full wire and
 * authenticated command lineage and reproject each exact CAS successor. */
import {R4_MANUAL_COMMERCE_EVENT_CODES} from './original-r4-manual-commerce-events.mjs';
import {createHash} from 'node:crypto';
import {reviewR4ExternalPreEventItemOverlay,validateR4PreEventPeriod} from './original-r4-pre-event-item-overlay.mjs';
import {independentCandidateWorld,R4_INDEPENDENT_DISK,R4_SETTLED_STATE} from './original-r4-independent-world-disk.mjs';
import {parseArmyFile,serializeArmyFile} from './original-r4-army-files.mjs';
const reviews=new WeakSet();
const pins={detailSource:'9a83d26fb29edee4032958f1e6de837a250f3384',
  buySource:'6ba8df9a733ed16c490389414cd94934fe1185ca',
  useSource:'1bf4537cc41e344c144d840d43175c4c232765bb'};
const fail=m=>{throw new RangeError('R4 rebel ordinary context: '+m)};
export function reviewR4RebelOrdinaryContext(sources,options={}){
  for(const [name,sha] of Object.entries(pins)){
    const s=sources[name];
    if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)
      fail('frozen commerce source '+name);
  }
  // Original GetUserTaxRate returns 0 during rebel, before taxmode.
  // This independent owner persists only DTTaxrate=0 even after victory.
  if(!sources.detailSource.includes('return 0 if ($DTevent{rebel});')||
     !sources.buySource.includes('GetUserTaxRate($DTS,$DTTaxrate)')||
     !sources.useSource.includes('$count=0 if ($USE->{needevent} && !$DTevent{$USE->{needevent}});'))
    fail('source tax/event gate drift');
  const data=reviewR4ExternalPreEventItemOverlay(sources,options);
  const r=Object.freeze({data,committable:false,lordFiscal:options.includeReviewedLordFiscal===true});
  reviews.add(r);return r;
}
export function validateR4RebelOrdinaryContext({reviewed,world}){
  try{
    if(!reviews.has(reviewed)||world?.schema!=='akimono.memory-world.v2'||world.events!==null||
       world.streetId!=='standard-street'||world.shops?.length!==1)return false;
    const p=world.period,shop=world.shops[0],disk=p?.disk;
    if(p?.state!==R4_SETTLED_STATE||p.settledCount<1||disk?.source!==R4_INDEPENDENT_DISK||
       shop.id!==1||shop.status!==1||(reviewed.lordFiscal?!['',0,1,2].includes(shop.taxmode):shop.taxmode!==0)||shop.guild!==''||
       Object.hasOwn(shop,'army')||(!reviewed.lordFiscal&&!Object.hasOwn(p.eventState,'rebel')&&p.town.leader!==1))return false;
    const play=disk.live['play.cgi'].bytes.split('\n');
    const header=play[1].split(',');
    const rate=reviewed.lordFiscal?disk.lordTaxRate:0;
    if(!Number.isSafeInteger(rate)||rate<0||rate>40||header.length!==5||header[3]!==String(rate)||play[3]!==Object.entries(p.eventState).flat().join(','))return false;
    if(Object.hasOwn(p.eventState,'rebel')){
      const armyBytes=disk.live['army.cgi']?.bytes;
      const army=parseArmyFile(armyBytes,[1]);
      if(serializeArmyFile(army,[1])!==armyBytes)return false;
    }
    const order=Object.keys(p.eventState);
    validateR4PreEventPeriod({reviewed:reviewed.data,period:independentCandidateWorld(world).period,
      activeOrder:order,candidateSettled:true,externalCandidate:true});
    // The rebel DSL has no ITEM PARAM. The only supported ordinary ITEM
    // overlays remain the same three previously-reviewed sale/PLUS fields.
    // No additional USE recipes or event-dependent callback is admitted.
    return order.every(code=>code==='happy'||(reviewed.data.manual&&R4_MANUAL_COMMERCE_EVENT_CODES.includes(code))||reviewed.data.params.rules[code].every(r=>['popular','point','plus'].includes(r.field)));
  }catch{return false}
}
