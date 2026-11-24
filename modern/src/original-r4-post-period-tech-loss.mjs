/**
 * R4 original Standard Street @@FUNCUPDATE::UpdateResetAfter.
 * High post-period experience may erase four held technique items.
 * This runs AFTER source post-period SortDT and territory settlement, not
 * during sales or before exp decay. Never a WorldState commit.
 */
export const R4_TECH_LOSS_SOURCE='r4-frozen-standard-street-post-period-tech-loss';
const fail=s=>{throw new RangeError('R4 original post-period technique: '+s);};
const safe=n=>Number.isSafeInteger(n)&&n>=0;
const names=Object.freeze([
  '鐵匠的技術','魔法的知識','解體屋之魂','行家的精隨',
]);
export function reviewR4PostPeriodTechLoss({itemDsl,model,periodSource}){
  if(typeof itemDsl!=='string'||typeof periodSource!=='string'||
     model?.items?.length!==79)
    fail('frozen original DSL and 79-item source catalog required');
  const start=itemDsl.indexOf('sub UpdateResetAfter');
  const stop=itemDsl.indexOf('@@FUNCNEW',start);
  const code=start<0||stop<=start?'':itemDsl.slice(start,stop);
  for(const token of [
    'UpdateTodayEraseTech();',
    'sub UpdateTodayEraseTech',
    'foreach my $DT (@DT)',
    'foreach(values(%{$DT->{exp}}))',
    'next if $expsum<=4000;',
    '$expsum-=4000;',
    'if($DT->{item}[$itemno-1] && rand(14000)<$expsum)',
    '$DT->{item}[$itemno-1]--;',
    'WriteLog(2,0,0,$msg,1);',
    'WriteLog(0,$DT->{id},0,"失去了".$ITEM[$itemno]->{name},1);',
  ])if(!code.includes(token))
    fail('original UpdateResetAfter source drift '+token);
  const rows=names.map(name=>'@@ITEMNO"'+name+'"');
  const line='foreach my $itemno ('+rows.join(',')+')';
  if(!code.includes(line))fail('four source technique tokens/order drift');
  const items=names.map(name=>{
    const entry=model.items.find(it=>it.name===name);
    if(!entry||!Number.isSafeInteger(entry.id)||entry.id<1||
       entry.id>79||model.items.filter(it=>it.name===name).length!==1)
      fail('unresolved original technology ITEM name '+name);
    return Object.freeze({itemId:entry.id,name});
  });
  if(items.map(e=>e.itemId).join(',')!=='18,19,38,24')
    fail('frozen original technique ITEM IDs drift');
  const markers=[
    'SortDT();',
    '#領土データ調整',
    'UpdateResetAfter() if defined(&UpdateResetAfter);',
    '#データバックアップ',
  ];
  let index=-1;
  for(const marker of markers){
    const n=periodSource.indexOf(marker,index+1);
    if(n<=index)fail('original UpdateResetAfter stage moved '+marker);
    index=n;
  }
  return Object.freeze({
    source:R4_TECH_LOSS_SOURCE,committable:false,
    triggerExperience:4000,drawRange:14000,
    techniques:Object.freeze(items),
    sourceScope:'frozen Standard Street UpdateResetAfter technique loss if decayed post-period EXP sum exceeds 4000; explicit random draw per held source technique, no full period or IO commit',
  });
}
export function projectR4PostPeriodTechLoss({
  reviewed,shop,randomDraws,
}){
  if(reviewed?.source!==R4_TECH_LOSS_SOURCE||
     reviewed.committable!==false||reviewed.triggerExperience!==4000||
     reviewed.drawRange!==14000||reviewed.techniques?.length!==4||
     !shop||typeof shop!=='object'||Array.isArray(shop)||
     !safe(shop.id)||shop.id<1||typeof shop.shopname!=='string'||
     !shop.shopname||!Array.isArray(shop.item)||shop.item.length!==79||
     shop.item.some(n=>!safe(n))||
     !shop.exp||typeof shop.exp!=='object'||Array.isArray(shop.exp)||
     !Array.isArray(randomDraws)||randomDraws.length>4)
    fail('source-reviewed technology item, EXP and random draws required');
  const entries=Object.entries(shop.exp);
  let sum=0;
  for(const [id,value] of entries){
    if(!/^([1-9]|[1-6]\d|7\d)$/.test(id)||!safe(value))
      fail('unreviewed original source EXP fields');
    sum+=value;
  }
  if(!Number.isSafeInteger(sum))fail('original EXP sum overflow');
  const excess=sum-4000,stock=[...shop.item];
  let used=0;const logs=[],lost=[];
  if(excess>0)for(const entry of reviewed.techniques){
    const slot=entry.itemId-1;
    if(!stock[slot])continue;
    if(used>=randomDraws.length)
      fail('missing original post-period technique RNG sample');
    const value=randomDraws[used++];
    if(!safe(value)||value>=1000000)
      fail('invalid original technique RNG sample');
    if(value*14000/1000000<excess){
      stock[slot]--;
      lost.push(entry.itemId);
      logs.push([2,0,0,shop.shopname+'遺忘了初心，失去了'+entry.name,1]);
      logs.push([0,shop.id,0,'失去了'+entry.name,1]);
    }
  }
  if(used!==randomDraws.length)
    fail('unused original technique RNG samples');
  return Object.freeze({
    source:reviewed.source,committable:false,
    experienceSum:sum,excessExperience:Math.max(0,excess),
    shop:Object.freeze({...shop,item:Object.freeze(stock)}),
    lostItemIds:Object.freeze(lost),
    logs:Object.freeze(logs.map(x=>Object.freeze(x))),
    randomDrawRanges:Object.freeze(Array(used).fill(14000)),
    drawsUsed:used,sourceScope:reviewed.sourceScope,
  });
}
