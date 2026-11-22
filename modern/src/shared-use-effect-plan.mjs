/**
 * Source USE effect-plan interpreter for common material / production / EXP.
 * An effect plan is declarative data; GameCore still owns the single
 * original transaction and commits atomically. Unknown phases fail closed.
 */
const fail=x=>{throw new RangeError('R2 USE effects: '+x);};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function readCommonUseEffectPlan(rule){
  if(!rule||!Array.isArray(rule.uses)||!Array.isArray(rule.creates))
    fail('missing source USE materials/outputs');
  if(rule.effectPlan===undefined)
    return {uses:rule.uses,creates:rule.creates,
      expPoints:rule.experienceCallback?.points??0};
  const ops=rule.effectPlan;
  if(!Array.isArray(ops)||ops.length<2||ops.length>3)
    fail('unsupported effect count');
  const [material,creation,experience]=ops;
  if(material?.type!=='source-materials'||material.phase!=='materials'||
     !equal(material.actions,rule.uses))
    fail('nonmatching material effect');
  if(creation?.type!=='source-production'||creation.phase!=='make-amount'||
     !equal(creation.actions,rule.creates))
    fail('nonmatching creation effect');
  const points=rule.experienceCallback?.points??0;
  if(points){
    if(ops.length!==3||experience?.type!=='source-proficiency'||
       experience.phase!=='experience'||experience.points!==points)
      fail('nonmatching proficiency effect');
  }else if(ops.length!==2)fail('unexpected proficiency effect');
  return {uses:material.actions,creates:creation.actions,expPoints:points};
}
