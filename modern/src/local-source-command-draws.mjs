/**
 * B-54: stable, command-scoped local test-clock entropy for review-mode HTTP.
 *
 * Original Perl uses rand() with a process-dependent stream; its cross-run
 * samples cannot be reconstructed from a saved game. B-41 and B-37 are
 * source-executed math with caller-supplied millionth samples. This adapter
 * supplies repeatable millionth samples for the SAME saved world revision
 * and command, including across Node restarts and B-43 recovery.
 *
 * This is a local migration policy, NOT a claim of Perl's exact RNG stream,
 * not a full original EVENT engine, and not a cryptographic secret. An
 * uncommitted retry is deterministic; a successful CAS moves revision on.
 */
import {createHash} from 'node:crypto';

export const LOCAL_SOURCE_DRAW_POLICY='akimono.local-source-review-draws.v1';
const MAX_SAMPLE=1000000;
const SAMPLE_SPACE=2**48;
const ACCEPT_LIMIT=Math.floor(SAMPLE_SPACE/MAX_SAMPLE)*MAX_SAMPLE;
const fail=x=>{throw new RangeError('B-54 stable source command draws: '+x);};
function integer(x,label,min=0){
  if(!Number.isSafeInteger(x)||x<min)fail(label);
  return x;
}
export function sourceCommandDraws({world,kind,args,count}){
  if(typeof world?.worldId!=='string'||world.worldId.length<1||
     world.worldId.length>200||
     !Number.isSafeInteger(world.revision)||world.revision<0||
     !Number.isSafeInteger(world.nowSeconds)||world.nowSeconds<0)
    fail('valid world identity, revision and clock required');
  if(!['reviewed-sparse-all-plus','advance-source-time','use-item'].includes(kind))
    fail('unsupported source command kind');
  if(args===null||typeof args!=='object'||Array.isArray(args))
    fail('source arguments must be fixed object');
  const names=Object.keys(args).sort();
  const expected=kind==='advance-source-time'?
    ['minutes','shopId']:kind==='use-item'?
    ['itemId','requestedCount','shopId','useId']:['timespanSeconds'];
  if(names.join(',')!==expected.join(','))
    fail('source argument contract changed');
  for(const name of names)
    integer(args[name],name,kind==='use-item'&&name==='useId'?0:1);
  integer(count,'sample count',1);
  if(count>(kind==='use-item'?52:121))
    fail('original source sample budget exceeded');
  // SHA-256 48-bit slices with rejection sampling prevent modulo bias.
  // Domain separation ensures changing a command, world/revision or
  // parameters cannot accidentally reuse a previous stream.
  const prefix=JSON.stringify([
    LOCAL_SOURCE_DRAW_POLICY,world.worldId,world.revision,
    world.nowSeconds,kind,names.map(name=>[name,args[name]]),
  ]);
  const samples=[];
  for(let i=0;i<count;i++){
    let found=false;
    for(let nonce=0;nonce<100;nonce++){
      const bits=createHash('sha256')
        .update(prefix+'|'+i+'|'+nonce).digest().readUIntBE(0,6);
      if(bits>=ACCEPT_LIMIT)continue;
      samples.push(bits%MAX_SAMPLE);
      found=true;
      break;
    }
    if(!found)fail('rejection sampling budget exhausted');
  }
  return Object.freeze(samples);
}
