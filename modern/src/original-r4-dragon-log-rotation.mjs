// Frozen plug/drlog.cgi: source intent only, not a common-file authority.
const KEYS=['dra-log0','dra-log1','dra-log2'];
const fail=m=>{throw new Error('R4 dragon log rotation: '+m)};
const int=x=>Number.isSafeInteger(x)&&x>=0;
const validText=x=>typeof x==='string'&&!x.includes('\0');
const freeze=o=>{if(o&&typeof o==='object'){for(const v of Object.values(o))freeze(v);Object.freeze(o)}return o};
const file=x=>x===null?null:(x&&validText(x.text)&&int(x.mtime)?{text:x.text,mtime:x.mtime}:fail('invalid live file'));
const lines=s=>s.match(/[^\n]*\n|[^\n]+$/g)??[];
export function projectDragonLogRenewal({now,expireSeconds,live,stagedText,queue}){
  if(!int(now)||!int(expireSeconds)||!live||Object.keys(live).length!==3||!KEYS.every(k=>Object.hasOwn(live,k))||!(stagedText===null||validText(stagedText))||!Array.isArray(queue)||!queue.every(validText))fail('invalid source snapshot');
  const nextLive=Object.fromEntries(KEYS.map(k=>[k,file(live[k])]));
  const nextQueue=[...queue],operations=[];
  let nextStage=stagedText,rotated=false;
  if(nextQueue.length){
    // Perl stat(missing)[9] is undef, numerically zero. Equality does not rotate.
    rotated=(nextLive['dra-log1']?.mtime??0)<now-expireSeconds;
    if(rotated){
      for(const [from,to] of [['dra-log1','dra-log2'],['dra-log0','dra-log1']]){
        if(nextLive[from]!==null){operations.push({kind:'rename-live',from,to});nextLive[to]=nextLive[from];nextLive[from]=null;}
      }
    }else{
      const input=stagedText!==null?stagedText:nextLive['dra-log0']?.text;
      // Source failed open on a missing selected live file contributes no lines.
      if(input!==undefined)nextQueue.push(...lines(input));
    }
    nextStage=nextQueue.join('');operations.push({kind:'write-stage',file:'dra-log0',text:nextStage});
  }
  return freeze({live:nextLive,stagedText:nextStage,queue:nextQueue,rotated,operations,committable:false});
}
