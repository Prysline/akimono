/** Opt-in single-shop fiscal command adapter. Controller owns provenance and CAS. */
import {createHash} from 'node:crypto';
import {reviewLordInside,projectLordInside} from './original-r4-lord-inside.mjs';
import {reviewLordTaxPolicy,projectLordTaxPolicy} from './original-r4-lord-tax-policy.mjs';
export const LORD_COMMANDS=Object.freeze(['lord-inside','lord-tax-side','lord-tax-reset']);
const fail=m=>{throw new RangeError('R4 independent lord: '+m)};
const rate=n=>Number.isSafeInteger(n)&&n>=0&&n<=40;
const exact=(o,k)=>o&&Object.keys(o).sort().join(',')===k.split(',').sort().join(',');
export function createIndependentLordProjection(sources){
  for(const [k,pin] of Object.entries({lordViewSource:'b96734f54267645c080c86d32aca5e778023b50b',
    lordCommandSource:'8754dabf130a521aa243fc0568910d5f52523362',
    readSource:'e7a8add7b0291901e71fe797783b664dff1568a0',
    logSource:'0f9143c49d1552233f27754e3937e1cdc2740f0a'})){
    const s=sources[k];
    if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==pin)fail('frozen source '+k);
  }
  if(!sources.lordViewSource.includes('$STATE->{leader}!=$DT->{id}')||
     !sources.readSource.includes('$DT->{lastlogin}=$NOW_TIME if !$MASTER_USER;')||
     !sources.logSource.includes('my($mode,$id,$msg)=@_;'))fail('source authority or logging drift');
  const inside=reviewLordInside(sources.lordCommandSource),policy=reviewLordTaxPolicy(sources.lordCommandSource);
  function describe(world){
    const p=world?.period,s=world?.shops?.[0];
    if(p?.state!=='source-reviewed-independent-settlement.v1'||p.settledCount<1||
      p.disk?.source!=='r4-independent-source-disk.v1'||world.shops.length!==1||
      s?.id!==1||s.status!==1||p.town.leader!==s.id||!rate(p.disk.lordTaxRate))return null;
    return {taxRate:p.disk.lordTaxRate,taxMode:s.taxmode??'',devem:p.town.devem,safem:p.town.safem,money:p.town.money};
  }
  function apply(world,command){
    const before=describe(world);
    if(!before||command?.shopId!==1||command.expectedRevision!==world.revision)fail('current lord and exact revision required');
    const s=world.shops[0],p=world.period,{people,...town}=p.town;
    const eventState=p.eventState.rebel?{rebel:p.eventState.rebel}:{};
    const {kind,expectedRevision}=command;
    let nextTown=town,taxRate=before.taxRate,taxMode=before.taxMode,logs;
    if(kind==='lord-inside'){
      if(!exact(command,'kind,expectedRevision,shopId,taxrate,devem,safem'))fail('exact inside command');
      const x=projectLordInside({reviewed:inside,fixture:{revision:world.revision,taxRate,town,
        actor:{id:s.id,name:s.name,money:s.money,time:s.time},eventState},
        command:{kind,expectedRevision,actorId:1,taxrate:command.taxrate,devem:command.devem,safem:command.safem}});
      nextTown=x.fixture.town;taxRate=x.fixture.taxRate;logs=x.receipt.logs;
    }else{
      if(kind==='lord-tax-side'?(!exact(command,'kind,expectedRevision,shopId,targetShopId,mode')||command.targetShopId!==1):
        kind!=='lord-tax-reset'||!exact(command,'kind,expectedRevision,shopId'))fail('exact single-shop policy command');
      const x=projectLordTaxPolicy({reviewed:policy,fixture:{revision:world.revision,leader:town.leader,actorId:1,taxRate,
        shops:[{id:1,name:s.name,shopname:s.shopname,taxmode:s.taxmode}],eventState},
        command:{kind,expectedRevision,actorId:1,...(kind==='lord-tax-side'?{targetId:1,mode:command.mode}:{})}});
      taxMode=x.fixture.shops[0].taxmode??'';logs=x.logs;
    }
    return {shops:[{...s,taxmode:taxMode}],period:{...p,town:{...nextTown,...(people===undefined?{}:{people})}},
      lordTaxRate:taxRate,receipt:{action:kind,source:'r4-independent-lord-fiscal.v1',shopId:1,
        taxRateBefore:before.taxRate,taxRateAfter:taxRate,taxModeBefore:before.taxMode,taxModeAfter:taxMode,
        devem:nextTown.devem,safem:nextTown.safem,originalLogCalls:logs}};
  }
  return Object.freeze({describe,apply});
}
