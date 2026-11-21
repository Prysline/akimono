/**
 * B-45: source-reviewed rank-1 Standard Street prize, exactly the original
 * @@FUNCUPDATE::UpdateTodayPrize tier for the top single shop.
 *
 * Pure source-phase projection, NOT a complete periodic settlement. Source
 * rank determination/territory/callback lifecycle must be executed before
 * any period WorldState commit. No automatic award via a fake standalone API.
 */
import {parseSourceNumber} from './standard-street-model.mjs';
export const B45_PRIZE_SOURCE='standard-street-funcupdate-top1-source-prize';
const fail=msg=>{throw new RangeError('B-45 source prize: '+msg);};
const rewards=Object.freeze([
  ['禮物卷',5],['禮物卷',4],['禮物卷',3],['禮物卷',2],
  ['禮物卷',1],['看門機器人',1],['整隻烤火雞',1],
  ['挑剔的朗姆酒',1],['時髦的靴子',1],
]);
const safe=(n,key,min=0)=>{if(!Number.isSafeInteger(n)||n<min)fail(key);return n;};
export function reviewOriginalTopPrize({itemDsl,model,originalAddItemSource,periodSource}){
  if(typeof itemDsl!=='string'||typeof originalAddItemSource!=='string'||
     typeof periodSource!=='string')fail('all original sources required');
  const pos=itemDsl.indexOf('@@FUNCUPDATE');
  const end=itemDsl.indexOf('sub UpdateResetAfter',pos);
  if(pos<0||end<=pos)fail('Standard Street FUNCUPDATE block missing');
  const segment=itemDsl.slice(pos,end);
  for(const [needle,label] of [
    ['sub UpdateResetBefore','pre-period callback'],
    ['UpdateTodayPrize();','prize callback'],
    ['my @TOP123=(','reward array'],
    ['TopGetItem($DT[0],$TOP123[0],"本次優勝")','rank 1 prize'],
    ['my @list=@{$itemlist};','selection source'],
    ['my @getitem=@{$list[int(rand($#list+1))]};','source 9-option random choice'],
    ['my $cnt=AddItem($DT,$itemnocount[0],$itemnocount[1]);','source item cap via AddItem'],
  ])if(!segment.includes(needle))fail('source drift '+label);
  const topRows=segment.split('\n')
    .map(x=>x.trim()).filter(x=>x.startsWith("['")).slice(0,9);
  if(topRows.length!==rewards.length)fail('top prize count changed');
  const sourceRewards=[];
  for(let i=0;i<rewards.length;i++){
    const [name,amount]=rewards[i];
    const row=topRows[i];
    const pattern=/^\['([^']+)',\s*\[\[@@ITEMNO\s*"([^"]+)",\s*(\d+)\]/;
    const match=pattern.exec(row);
    // The original prize display categories differ from the actual item
    // names: rank-1 position 6 says 機器人, 7..9 say 慶祝用品.
    const sourceLabel=i<5?'禮物卷':i===5?'機器人':'慶祝用品';
    if(!match||match[1]!==sourceLabel||match[2]!==name||
       Number(match[3])!==amount)
      fail('source top prize index '+i+' changed');
    const item=model?.items?.find(it=>it.name===name);
    if(!item||item.id<1||item.id>79)fail('unknown source award item '+name);
    const raw=item.limitRaw?.split('/')[0];
    const limit=raw?parseSourceNumber(raw):null;
    if(!Number.isSafeInteger(limit)||limit<=0)
      fail('source award item cap unavailable');
    sourceRewards.push(Object.freeze({index:i,itemId:item.id,
      itemName:name,count:amount,limit}));
  }
  for(const marker of [
    'sub AddItem',
    '$count=$ITEM[$itemno]->{limit}-$DT->{item}[$itemno-1]',
    '$DT->{item}[$itemno-1]+=$count;',
    'return $count;',
  ])if(!originalAddItemSource.includes(marker))fail('frozen AddItem drift');
  if(!periodSource.includes('$DT[0]->{rankingcount}++;')||
     !periodSource.includes('UpdateResetBefore() if defined(&UpdateResetBefore);'))
    fail('source top rank counter or callback order changed');
  return Object.freeze({
    source:B45_PRIZE_SOURCE,position:1,
    topChoices:Object.freeze(sourceRewards),
    scope:'original single-shop top-1 prize and rankingcount only; no complete period or world writes',
  });
}
/**
 * The original first increments rank 1 winner count, then calls
 * @@FUNCUPDATE UpdateResetBefore/TopGetItem/AddItem. This implements all 9
 * standard first-tier choices, using the same bounded draw as original rand(9).
 */
export function projectOriginalTopPrize({shop,reviewed,drawMillionths}){
  if(reviewed?.source!==B45_PRIZE_SOURCE||
     !Array.isArray(reviewed.topChoices)||reviewed.topChoices.length!==9)
    fail('original source prize review missing');
  safe(drawMillionths,'source random draw');
  if(drawMillionths>=1000000)fail('rand must be below 1');
  if(!shop||shop.id!==1||shop.status!==1||
     !Array.isArray(shop.item)||shop.item.length!==79||
     shop.showcasecount!==1)fail('source one-shop top rank state');
  if(shop.item.some((n,i)=>!Number.isSafeInteger(n)||n<0))
    fail('unreviewed stock');
  const beforeCount=safe(shop.rankingcount??0,'rankingcount');
  const index=Math.trunc(drawMillionths*9/1000000);
  const prize=reviewed.topChoices[index];
  if(prize.index!==index)fail('prize order changed');
  const old=safe(shop.item[prize.itemId-1],'reward item stock');
  if(old>prize.limit)fail('original stock over source cap before award');
  const granted=Math.min(prize.count,prize.limit-old);
  const stock=[...shop.item];
  stock[prize.itemId-1]=old+granted;
  return Object.freeze({
    source:reviewed.source,
    shop:{...shop,item:stock,rankingcount:beforeCount+1},
    prize:Object.freeze({
      index,itemId:prize.itemId,itemName:prize.itemName,
      wanted:prize.count,granted,discarded:prize.count-granted,
      stockBefore:old,stockAfter:stock[prize.itemId-1],
    }),
    scope:reviewed.scope,
  });
}
