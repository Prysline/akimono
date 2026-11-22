/**
 * Source-bound shared ITEM USE proficiency rules.
 * Frozen plug/calc.cgi::GetItemUseTime and plug/use.cgi::UseItem EXP tail.
 * The Standard Street frozen _config.cgi sets LIMIT_EXP=3600.
 */
const fail=label=>{throw new RangeError('R2 proficiency: '+label);};
const safe=(value,label,min=0)=>{
  if(!Number.isSafeInteger(value)||value<min)fail(label);
  return value;
};
export function originalUseTimeSeconds({time,exptime,experience}){
  safe(time,'source time',1);
  safe(exptime,'source exptime');
  safe(experience,'source EXP');
  if(experience>1000||exptime>time)fail('out of source range');
  const actual=time-Math.trunc((time-exptime)*experience/1000);
  return safe(actual,'computed UseTime',1);
}
/**
 * Apply the ACTUAL effective batch count, not the requested count. Keep
 * non-target EXP and perform the source's lowest-EXP-first redistribution
 * only when LIMIT_EXP is exceeded. Equal-EXP ties are unreviewed Perl hash
 * iteration order; fail closed if redistribution would depend on them.
 */
export function originalUseExperience({records={},itemId,points,count,limit=3600}){
  safe(itemId,'itemId',1);safe(points,'exp per use');
  safe(count,'effective count',1);safe(limit,'LIMIT_EXP');
  if(!records||typeof records!=='object'||Array.isArray(records))
    fail('EXP record');
  const exp={};
  for(const [id,value] of Object.entries(records)){
    if(!/^[1-9]\d*$/.test(id)||Number(id)>79)
      fail('EXP item key');
    safe(value,'EXP value');
    if(value>1000)fail('EXP exceeds item cap');
    exp[id]=value;
  }
  const key=String(itemId);
  const previous=exp[key]??0;
  const rawGain=safe(points*count,'EXP multiplication');
  const gained=Math.min(rawGain,1000-previous);
  exp[key]=previous+gained;
  const total=Object.values(exp).reduce((a,b)=>safe(a+b,'EXP sum'),0);
  const reductions=[];
  if(limit>0&&total>limit){
    let excess=total-limit;
    const keys=Object.keys(exp).sort((a,b)=>exp[a]-exp[b]);
    const eligible=keys.filter(id=>id!==key);
    if(eligible.some((id,i)=>i>0&&exp[eligible[i-1]]===exp[id]))
      fail('ambiguous Perl hash tie in LIMIT_EXP redistribution');
    let remaining=keys.length-1;
    for(const id of keys){
      if(id===key)continue;
      if(remaining<=0)fail('LIMIT_EXP divisor');
      const down=Math.min(exp[id],Math.trunc(excess/remaining));
      exp[id]-=down;
      if(exp[id]===0)delete exp[id];
      reductions.push({itemId:Number(id),amount:down});
      excess-=down;
      remaining--;
    }
  }
  return {exp,gained,previous,reductions};
}

/** Source inc-makeitem.cgi emits _job_use_*_peddle_ from the
 * @@USE job 行腳商人 times/job_peddle_time_rate declaration.
 * The frozen definition specifies rate 1.5, and its emitted code applies
 * Perl int(time/1.5) to BOTH time and exptime before GetItemUseTime.
 */
export function originalSourceUseClock({rule,job='',experience}){
  if(!rule||typeof rule!=='object')fail('source USE clock rule');
  if(job===null||job===undefined)job='';
  if(typeof job!=='string')fail('shop job');
  let time=safe(rule.time,'source use time',1);
  let exptime=safe(rule.exptime,'source trained time');
  const modifier=rule.jobTimeModifier;
  if(modifier){
    if(modifier.job!=='peddle'||modifier.numerator!==2||
       modifier.denominator!==3)fail('unreviewed source job modifier');
    if(job===modifier.job){
      time=Math.trunc(time*modifier.numerator/modifier.denominator);
      exptime=Math.trunc(exptime*modifier.numerator/modifier.denominator);
    }
  }
  return {base:time,trained:exptime,
    seconds:originalUseTimeSeconds({time,exptime,experience})};
}
