/**
 * Source-exact bounded reimplementation of Standard Street #78 _local_1.
 * Not general Perl execution. The comparison "$exps==$exp1" in the frozen
 * source intentionally compares donor ITEM NUMBER with target EXP VALUE.
 * Correcting it to donor==target would alter original game behavior.
 */
const fail=x=>{throw new RangeError('R2 original career callback: '+x);};
const integer=(x,name,min=0,max=Number.MAX_SAFE_INTEGER)=>{
  if(!Number.isSafeInteger(x)||x<min||x>max)fail(name);
  return x;
};
export function projectOriginalCareerChange({rule,shop,sourceItemNames}){
  const spec=rule?.inlineCallback;
  if(rule?.itemId!==78||spec?.kind!=='career-change'||
     !Number.isSafeInteger(rule.useId)||rule.useId<0||rule.useId>13||
     !shop||!Array.isArray(shop.item)||shop.item.length!==79||
     !Array.isArray(sourceItemNames)||sourceItemNames.length!==79||
     !Number.isSafeInteger(shop.id)||shop.id<1||
     typeof spec.job!=='string'||typeof spec.jobName!=='string')
    fail('unreviewed source or world input');
  const exp={};
  for(const [key,value] of Object.entries(shop.exp??{})){
    if(!/^[1-9]\d*$/.test(key)||Number(key)>79)
      fail('EXP item key');
    exp[key]=integer(value,'EXP point',0,1000);
  }
  const target=integer(spec.targetItemId,'target item',0,79);
  const donors=spec.donorItemIds;
  if(!Array.isArray(donors)||donors.length!==(target?13:0)||
     donors.some(n=>!Number.isSafeInteger(n)||n<1||n>79)||
     spec.numerator!==(target?1:0)||
     spec.denominator!==(target?2:1)||
     typeof sourceItemNames[target?target-1:0]!=='string')
    fail('unreviewed transfer source parameters');
  const logs=[];
  let returned='';
  if(target){
    // Store original target EXP once; the frozen routine later examines
    // this VALUE when determining which donor entries to skip.
    const exp1=exp[String(target)]??0;
    let exp2=0;
    for(const donor of donors){
      const key=String(donor);
      const value=exp[key]??0;
      // Intentional original Perl bug, not a typo in the JS model:
      // next if !$exp || $exps==$exp1;
      if(!value||donor===exp1)continue;
      exp2+=value;
      delete exp[key];
      const name=sourceItemNames[donor-1];
      if(typeof name!=='string'||!name)
        fail('missing frozen ITEM name '+donor);
      const msg=name+'的熟練度從 '+Math.trunc(value/10)+
        '% 變成 0% 了';
      returned+=msg+'<br>';
      logs.push([0,shop.id,msg]);
    }
    const amount=Math.trunc(exp2*spec.numerator/spec.denominator);
    const next=Math.min(1000,exp1+amount);
    const itemName=sourceItemNames[target-1];
    if(!itemName)fail('target source ITEM name');
    const msg=itemName+'的熟練度從 '+Math.trunc((exp[target]??0)/10)+
      '% 變成 '+Math.trunc(next/10)+'% 了';
    returned+=msg+'<br>';
    logs.push([0,shop.id,msg]);
    exp[String(target)]=next;
  }
  if(spec.job&&spec.job!=='_default_')
    returned+='職業變成「'+spec.jobName+'」了';
  else if(spec.job==='')
    returned+='職業變成「不定」了';
  else fail('unknown career designation');
  return Object.freeze({
    exp:Object.freeze(exp),
    job:spec.job,
    returned,
    logCalls:Object.freeze(logs.map(x=>Object.freeze(x))),
  });
}
