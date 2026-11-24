/**
 * Pure, source-limited reconstruction of the exact two inline callbacks
 * in frozen custom/inc-item-data.cgi ITEM #25 and ITEM #26 USE #0.
 *
 * The original execution order is GetUseItem/UseItem (money/time/materials,
 * CheckWholeStore), then inline callback, then milk-cow EXP.
 * This model never calls arbitrary source Perl.
 */
const fail=x=>{throw new RangeError('R2 original dairy inline: '+x);};
const number=(x,k,min=0)=>{
  if(!Number.isSafeInteger(x)||x<min)fail(k);
  return x;
};
export function projectOriginalDairyInlineCallback({
  kind,level,shop,count,random,limits,
}){
  if(!['milk-cow','drink-milk'].includes(kind)||
     !shop||!Array.isArray(shop.item)||shop.item.length!==79||
     !Array.isArray(limits)||limits.length!==79||
     typeof random!=='function')
    fail('source inline callback inputs');
  number(count,'effective source count',1);
  number(shop.id,'shopId',1);
  number(shop.rank,'rank');
  if(shop.rank>10000||typeof shop.shopname!=='string')
    fail('original source shop');
  const items=shop.item.map((n,i)=>number(n,'item '+i));
  const logCalls=[],useItems=[],useMessages=[],addItems=[],addMessages=[];
  let returned;
  if(kind==='milk-cow'){
    if(![1,2].includes(level)||items[24]<1||items[24]>20||
       limits[25]?.limit!==2500)
      fail('unreviewed original cow/limit/level');
    const maximum=number(level*count*items[24],'original milk production',1);
    const milk=number(Math.trunc(random()*maximum)+1,'original milk output',1);
    const received=Math.min(milk,Math.max(0,2500-items[25]));
    items[25]+=received;
    // Original Core item::AddItem always appends a pair, even when capped.
    addItems.push([26,received]);
    addMessages.push('精製了米諾牛奶');
    let deaths=0;
    const probability=level*level;
    for(let i=0;i<count;i++)
      if(random()*1000<probability)deaths++;
    if(deaths){
      const removed=Math.min(deaths,items[24]);
      items[24]-=removed;
      useItems.push([25,removed]);
      useMessages.push('米諾陶洛斯♀因為'+
        (level===1?'壽命':'過勞')+'的關係升天了');
    }
    returned='精製了'+milk+'瓶米諾牛乳';
    logCalls.push([0,shop.id,returned]);
  }else{
    if(level!==undefined||items[25]>2500)
      fail('unexpected drinking callback/stock');
    if(count>=30){
      shop.rank=Math.max(0,shop.rank-count*2);
      logCalls.push([2,0,shop.shopname+'的店長被救護車運走了']);
      logCalls.push([2,0,'一下子喝完'+count+'瓶米諾牛乳簡直是瘋了']);
      returned='…醒來時已經在病床上了';
    }else if(count>=10){
      returned='一下子喝完了'+count+'瓶米諾牛乳　肚子要壞掉了';
      logCalls.push([0,shop.id,returned]);
    }else{
      shop.rank=Math.min(10000,shop.rank+
        Math.trunc(random()*(count+1))+count);
      returned='喝了米諾牛乳感覺更健康了';
      logCalls.push([0,shop.id,returned]);
    }
  }
  return Object.freeze({
    items:Object.freeze(items),rank:shop.rank,returned,
    addItems:Object.freeze(addItems.map(x=>Object.freeze(x))),
    addMessages:Object.freeze(addMessages),
    useItems:Object.freeze(useItems.map(x=>Object.freeze(x))),
    useMessages:Object.freeze(useMessages),
    logCalls:Object.freeze(logCalls.map(x=>Object.freeze(x))),
  });
}
