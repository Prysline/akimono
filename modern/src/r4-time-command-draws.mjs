/** Versioned bounded local time-command entropy, shared by live/replay later.
 * Unit-millionth source samples retain reviewed arithmetic; lottery integer
 * draws use the complete source range. No claim of native Perl PRNG identity.
 */
import {createHash} from 'node:crypto';
import {LOTO_RANGE} from './original-b58-loto-startfunc.mjs';
export const R4_TIME_DRAW_POLICY='akimono.r4.time-draws.v1';
// 8 shelves x <=3 draws + stochastic rank + #70 + 59 PLUS x <=2.
export const R4_FULL_PRE_EVENT_DRAWS=144;
export const R4_FULL_CROSS_SLICE_DRAWS=148; // up to four settlement draws
const fail=s=>{throw new RangeError('R4 time RNG: '+s)};
const int=n=>Number.isSafeInteger(n)&&n>=0;
export const R4_CROSS_PERIOD_DRAW_POLICY='akimono.r4.cross-period-draws.v1';
export function createR4TimeDraws(args){
  return createDraws(args,R4_TIME_DRAW_POLICY,args.fullCommerce===true?R4_FULL_PRE_EVENT_DRAWS+100:221);
}
export function createR4CrossPeriodDraws(args){
  return createDraws(args,R4_CROSS_PERIOD_DRAW_POLICY,args.fullCommerce===true?2*(R4_FULL_CROSS_SLICE_DRAWS+100):450);
}
function createDraws({world,minutes},policy,budget){
  if(typeof world?.worldId!=='string'||!world.worldId||world.worldId.length>200||!int(world.revision)||!int(world.nowSeconds)||!int(minutes)||minutes<1||minutes>60)fail('bounded server world/command identity');
  const prefix=JSON.stringify([policy,world.worldId,world.revision,world.nowSeconds,minutes]);
  const sample=(index,range)=>{
    if(!int(index)||index>=budget||![1000000,LOTO_RANGE].includes(range))fail('source draw index or range');
    const limit=Math.floor(2**48/range)*range;
    for(let nonce=0;nonce<100;nonce++){
      const n=createHash('sha256').update(prefix+'|'+index+'|'+range+'|'+nonce).digest().readUIntBE(0,6);
      if(n<limit)return n%range;
    }
    fail('source draw rejection budget exhausted');
  };
  return Object.freeze({policy,
    unit:index=>sample(index,1000000),
    lottery:index=>Object.freeze({range:LOTO_RANGE,result:sample(index,LOTO_RANGE)})});
}
