/**
 * P1: B-43 source-bounded #15 persistence certificate.
 *
 * This is a conservative existential bound over frozen ITEM/USE rules, not a
 * transaction log. In particular, a 20-EXP increment is one effective USE,
 * never permission to mint arbitrary stock. No positive-market acquisition of
 * #30/#32 or direct trade is credited here; those paths need separate review.
 */
const recipes=Object.freeze([
  {need:0,uses:[[1,10]],product:[30,20,800],loss:0},
  {need:200,uses:[[30,10]],product:[31,20,800],loss:25},
  {need:200,uses:[[1,20]],product:[32,20,640],loss:0},
  {need:400,uses:[[32,10]],product:[33,10,900],loss:25},
  {need:600,uses:[[31,10],[33,10]],product:[34,5,1000],loss:50},
]);
function certifiedRule(rule,useId){
  const spec=recipes[useId];
  if(rule?.supported!==true||rule.source!=='original-declarative-use-dsl'||
     rule.sourceFile!=='custom/inc-item-data.cgi'||
     rule.itemId!==15||rule.useId!==useId||
     rule.time!==900||rule.exptime!==300||rule.money!==0||
     rule.needExperience!==spec.need||
     rule.requiresOwnedItem!==true||rule.ownedMaximum!==40||
     rule.experienceCallback?.kind!=='gain-fixed-exp'||
     rule.experienceCallback.points!==20||
     rule.beforeCallback!==undefined||
     rule.uses?.length!==spec.uses.length||
     rule.creates?.length!==1||
     rule.creates[0].itemId!==spec.product[0]||
     rule.creates[0].countPerUse!==spec.product[1]||
     rule.creates[0].probabilityPermille!==spec.product[2])
    return false;
  for(let i=0;i<spec.uses.length;i++){
    if(rule.uses[i].itemId!==spec.uses[i][0]||
       rule.uses[i].countPerUse!==spec.uses[i][1]||
       rule.uses[i].probabilityPermille!==1000)return false;
  }
  if(useId===0){
    if(rule.jobTimeModifier?.job!=='drug'||
       rule.jobTimeModifier.numerator!==2||
       rule.jobTimeModifier.denominator!==3)return false;
  }else if(rule.jobTimeModifier!==undefined)return false;
  return spec.loss?
    rule.afterCallback?.kind==='lostbook'&&
    rule.afterCallback.threshold===spec.loss&&
    rule.afterCallback.consumedCount===1&&
    rule.afterCallback.allowLoss===true:
    rule.afterCallback===undefined;
}
const safeStock=shop=>Array.isArray(shop?.item)&&shop.item.length===79&&
  shop.item.every(x=>Number.isSafeInteger(x)&&x>=0);

/**
 * Only source-possible quantities and proficiency ordering are authorized.
 * A possible sequence must start with ten #15/0 batches before any 200 EXP
 * recipe, have twenty earlier batches before #15/3 and thirty before #15/4.
 * Inventory max GET accounts for ALL upstream ingredients consumed.
 */
export function proveReviewedMedicineSave({shop,useItem,gatherCount12}){
  const rejected=Object.freeze({valid:false,lostBookPossible:false});
  if(!safeStock(shop)||!Number.isSafeInteger(gatherCount12)||
     gatherCount12<0||gatherCount12>50)return rejected;
  const experience=shop.exp?.['15']??0;
  if(!Number.isSafeInteger(experience)||experience<0||
     experience>1000||experience%20!==0)return rejected;
  const runs=experience/20;
  // Source #31, #33 and #34 have negative PLUS; fresh markets cannot mint
  // them. #30 and #32 market-buy paths are not used as source evidence here.
  const [ordinary,high,ether,highEther,erikusa]=
    [29,30,31,32,33].map(i=>shop.item[i]);
  if(runs===0)
    return Object.freeze({valid:high===0&&highEther===0&&erikusa===0,
      lostBookPossible:false});
  if(!recipes.every((_,useId)=>certifiedRule(
    useItem?.getRule?.(15,useId),useId)))return rejected;
  // This bounded source chain cannot infer further USE counts after EXP
  // saturation. Its 50-run model is only a permitted stock upper envelope.
  for(let n4=Math.ceil(erikusa/5);n4<=runs;n4++){
    for(let n3=n4;n3<=runs-n4;n3++){
      if(highEther+10*n4>10*n3)continue;
      for(let n1=n4;n1<=runs-n4-n3;n1++){
        if(high+10*n4>20*n1)continue;
        for(let n2=0;n2<=runs-n4-n3-n1;n2++){
          const n0=runs-n4-n3-n1-n2;
          if((n1+n2+n3+n4>0&&n0<10)||
             (n3>0&&n0+n1+n2<20)||
             (n4>0&&n0+n1+n2+n3<30))continue;
          if(ordinary+10*n1>20*n0||
             ether+10*n3>20*n2||
             shop.item[0]+10*n0+20*n2>80*gatherCount12)continue;
          const lostBookPossible=n1+n3+n4>0;
          if(shop.item[14]===0&&!lostBookPossible)continue;
          return Object.freeze({valid:true,lostBookPossible});
        }
      }
    }
  }
  return rejected;
}
