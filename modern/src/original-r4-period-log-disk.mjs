/** B50 original log calls (identity locale/money formatter) and actual RenewLog.
 * Explicit isolated source fixture, not a production logging/commit API.
 */
import {createHash} from 'node:crypto';
import {readFile,writeFile,lstat,realpath,rename} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const pins={log:'0f9143c49d1552233f27754e3937e1cdc2740f0a',period:'6183e88e9dd69a16606a1064c8084e9a1411dbd5',dsl:'7a18185e98b32aee82ca1ce30d6f3c395157dbcb',config:'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0'};
const reviews=new WeakSet();
const fail=m=>{throw new RangeError('R4 period log: '+m)};
export function reviewPeriodLog(sources){
  for(const [k,sha] of Object.entries(pins)){
    const s=sources[k];if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k);
  }
  const scales={};
  for(const block of sources.dsl.split(/^@@ITEM[ \t]*(?:#.*)?\r?\n/mi)){
    const id=block.match(/^\s*no\s+(\d+)\s*(?:#.*)?$/m)?.[1];
    const scale=block.match(/^\s*scale\s+([^\r\n#]+)/m)?.[1]?.trim();
    if(id&&scale)scales[id]=scale;
  }
  const r=Object.freeze({scales:Object.freeze(scales),committable:false});reviews.add(r);return r;
}
function check(r){if(!reviews.has(r))fail('source review required')}
function row(time,mode,id,msg){
  if(!Number.isSafeInteger(time)||time<1||![0,1,2].includes(mode)||!Number.isSafeInteger(id)||id<0||typeof msg!=='string'||/[\r\n\t]/.test(msg))fail('unreviewed log row');
  return [time,mode,id,msg].join('\t')+'\n';
}
/** Exact B50 one-shop/no-leader call order. Formatters are the same explicit
 * identity fixtures as the original probe, not real localization/currency.
 */
export function projectB50PeriodLogRows({reviewed,shop,town,result,nowSeconds,independentPeriod=false}){
  check(reviewed);
  if(result?.source!=='core-original-solo-period-phase-chain-no-world-commit'||result.nonCommittable!==true||shop.id!==1||town.leader!==0||typeof independentPeriod!=='boolean'||(!independentPeriod&&shop.taxtoday!==0)||
     (independentPeriod&&(!Number.isSafeInteger(shop.taxtoday)||shop.taxtoday<0||result.town.in!==shop.taxtoday||result.actualCloseEffect||result.dragonLogs!==undefined)))fail('reviewed B50 state required');
  const count=shop.rankingcount+1,p=result.prize,head='本次優勝';
  const scale=reviewed.scales[p.itemId];if(!scale)fail('source prize scale missing');
  const calls=[
    [1,0,'「今期の優勝店は'+shop.shopname+'さんでした。'+(count===1?'初優勝':count+'度目の優勝')+'おめでとうございます」'],
    [1,0,'「点数は'+result.pointsBefore+'点でした」'],
    [2,0,head+shop.shopname+'收到'+(p.index<5?'禮物卷':p.index===5?'機器人':'慶祝用品')],
    [0,shop.id,head+'作為'+p.itemName+'的獎品，獲得'+p.wanted+scale],
  ];
  if(p.discarded)calls.push([0,shop.id,'但是由於超過了最大持有數量，'+p.discarded+scale+'被丟棄了']);
  if(result.actualCloseEffect)calls.push([1,0,shop.shopname+'が経営者不在のため閉店しました。']);
  calls.push(...(result.dragonLogs??[]));
  if(town.army+town.robina<10000)calls.push([2,0,'街の護衛軍が少ないため，治安が悪化しています。']);
  if(town.money+(independentPeriod?shop.taxtoday:0)-result.town.out<0)calls.push([2,0,'街資金が底をつき，街の護衛軍に給料を支払えないようです。']);
  for(const x of result.postTechLoss?.logs??[])calls.push([x[0],x[1],x[3]]);
  return calls.map(c=>row(nowSeconds,...c));
}
async function regular(p){const s=await lstat(p);if(!s.isFile())fail('regular log file required');return s}
export async function renewPeriodLogDisk({reviewed,directory,rows,nowSeconds}){
  check(reviewed);
  if(!Number.isSafeInteger(nowSeconds)||nowSeconds<1||!Array.isArray(rows)||!rows.length||rows.some(s=>typeof s!=='string'||!/^\d+\t[012]\t\d+\t[^\r\n\t]*\n$/.test(s)))fail('explicit accumulated log rows required');
  const root=await realpath(directory);
  if(path.dirname(root)!==await realpath(os.tmpdir())||!path.basename(root).startsWith('akimono-r4-period-disk-'))fail('isolated sandbox required');
  const stage=path.join(root,'stage');if(!(await lstat(stage)).isDirectory())fail('real stage required');
  for(const n of ['commit.cgi','stage/log0.cgi']){
    try{await lstat(path.join(root,n));fail('pending log or commit')}catch(e){if(e.code!=='ENOENT')throw e}
  }
  const [s0,s1,s2]=[0,1,2].map(n=>path.join(root,'log'+n+'.cgi'));
  await regular(s0);const old=await regular(s1);await regular(s2);
  const rotated=Math.floor(old.mtimeMs/1000)<nowSeconds-129600;
  let bytes=rows.join('');
  if(rotated){
    // Original RenewLog rotates live files BEFORE staging log0.
    await rename(s1,s2);await rename(s0,s1);
  }else bytes+=new TextDecoder('utf-8',{fatal:true}).decode(await readFile(s0));
  await writeFile(path.join(stage,'log0.cgi'),bytes,{flag:'wx'});
  return {bytes,rotated,committable:false};
}

/** Exact chronological calls in a single source command, then unshift as
 * the original PushLog does. No historical locale/hash equivalence. */
export function projectReviewedEventLogRows({reviewed,logs,nowSeconds}){
  check(reviewed);
  return logs.map(call=>{
    if(!Array.isArray(call)||![3,4,5].includes(call.length))fail('unreviewed EVENT log call');
    return row(nowSeconds,call[0],call[1],call.length===5?call[3]:call[2]);
  }).reverse();
}
export function projectCrossPeriodLogRows({reviewed,candidate}){
  check(reviewed);
  if(candidate?.source!=='r4-reviewed-cross-period-candidate.v1'||candidate.committable!==false||![0,1].includes(candidate.evidence.slices[0]?.dateupdate))fail('cross-period candidate required');
  const calls=[];
  for(const slice of candidate.evidence.slices){
    if(slice.dateupdate===1){
      const {periodLogInput,settlement}=slice.preEvent;
      calls.push(...projectB50PeriodLogRows({reviewed,...periodLogInput,result:settlement,nowSeconds:candidate.nowSeconds,independentPeriod:true}));
    }
    for(const call of slice.eventLogs){
      if(!Array.isArray(call)||![3,4,5].includes(call.length))fail('unreviewed EVENT log call');
      calls.push(row(candidate.nowSeconds,call[0],call[1],call.length===5?call[3]:call[2]));
    }
  }
  return calls.reverse();
}
