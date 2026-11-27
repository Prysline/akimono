/** Frozen inc-main.cgi HelpMessage + DevelopImage shelf-stock predicate.
 * Only local independent shops: no invented unread-mail count or external authority.
 * Original zh_TW locale a512f6887cee214e66828769a382ad2b18bcd5b3.
 */
import {createHash} from 'node:crypto';
const reviews=new WeakSet();
export function reviewOriginalOwnerHelp(source){
  if(typeof source!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0').update(source).digest('hex')!=='5cd020011f6676ec4a8a202ab1bb28b90515ce8d')
    throw new RangeError('R4 owner help source drift');
  const reviewed=Object.freeze({source:'r4-frozen-owner-help.v1'});reviews.add(reviewed);return reviewed;
}
const safe=n=>Number.isSafeInteger(n)&&n>=0;
export function describeOriginalOwnerHelp({reviewed,world}){
  if(!reviews.has(reviewed))throw new RangeError('R4 owner help review required');
  if(!world||world.shops?.length!==1||world.shops[0].id!==1||world.shops[0].status!==1)return null;
  const s=world.shops[0],trush=s.trush??0;
  // Original new.cgi leaves garbage unset until the first update.
  if(![world.nowSeconds,s.foundation,trush,s.showcasecount].every(safe)||world.nowSeconds<s.foundation||
      s.showcasecount<1||s.showcasecount>8||!Array.isArray(s.showcase)||s.showcase.length!==s.showcasecount||
      !Array.isArray(s.item)||s.item.length!==79||s.item.some(n=>!safe(n))||
      s.showcase.some(n=>!safe(n)||n>79))throw new RangeError('R4 owner help invalid source shop');
  const hasDisplayedStock=s.showcase.some(id=>id>0&&s.item[id-1]>0);
  const common={source:reviewed.source,mailSupported:false,hasDisplayedStock,speaker:'小幫手'};
  // The original's first branch is mail. Mail does not exist in this
  // independent runtime; B/D must wire that branch with actual mail state.
  if(world.nowSeconds-s.foundation<3*3600)return {...common,kind:'new-shop',lines:['很高興見到你，我是店裡的小幫手。','店長，那麼接下來，看過[遊戲遊玩]了嗎？'],libraryChapter:1};
  if(trush>4000000)return {...common,kind:'dirty',lines:['店長您回來了啊。','店裡越來越髒。來打掃一下如何？'],libraryChapter:null};
  if(!hasDisplayedStock)return {...common,kind:'empty',lines:['店長，已經沒有商品可以賣囉。','要馬上補充庫存還是更換商品販售嗎。'],libraryChapter:null};
  return {...common,kind:'normal',lines:['店長您回來了啊。','店裡的營運情況非常順利。'],libraryChapter:null};
}

/** Original DevelopImage + CharaDefine. Pure view; no customer/sale/RNG effect.
 * The original binary scene assets are not in this branch. Keep source sprite
 * indices and placement in the contract, render the actual translated speech
 * as text rather than inventing assets or customers.
 */
const speech=Object.freeze([
  '庫存都賣光了。真是抱歉…','唔哇，什麼都沒有賣呢，真困擾。',
  '好不容易來買東西竟然什麼都沒有…。該怎麼辦呢？','沒辦法呢。你可以再等一下嗎？',
  '大姊姊~ 為什麼這邊東西什麼都沒有啊？','我看看，今天要買啥好呢…',
  '嗯~ 請給我這個。','嗯，這是一家不錯的店，不過...',
  '感覺像是另一種聲音…','這裡真是個好地方。','是啊。這是我也常來的商店。',
]);
export function describeOriginalOwnerScene({reviewed,world}){
  const help=describeOriginalOwnerHelp({reviewed,world});
  if(help===null)return null;
  const s=world.shops[0];
  if(!Number.isSafeInteger(s.money)||!safe(s.rank)||s.rank>10000)throw new RangeError('R4 owner scene invalid source shop');
  const phase=Math.trunc(world.nowSeconds/3600)%3;
  const staffed=help.hasDisplayedStock;
  const ids=!staffed?[[1,null],[null,2,3],[4]][phase]:
    phase===0?[null,5]:phase===1?[6,null]:s.rank<5500?[7,8,null]:[null,9,10];
  const n=Math.trunc(0.9+(s.trush??0)/1000000);
  const garbageRows=n<1?[]:n>3?[Math.min(3,n-3),3]:[n];
  return {source:'r4-frozen-owner-scene.v1',phase,hasDisplayedStock:staffed,
    goldCount:Math.min(6,Math.max(0,Math.trunc(s.money/5000000))),garbageRows,
    displayedItems:s.showcase.filter(id=>id>0&&s.item[id-1]>0),
    // Explicit source image dimensions only; class-based sizing is not guessed.
    assets:{
      gold:{path:'map/c-sg.png',width:24,height:24},
      garbage:{path:'map/c-st.png',sourceClass:'c'},
      news:{path:'map/c-sn.png',width:24,height:26},
      warehouse:{path:'map/shops.png',width:90,height:42},
      helper:{path:'map/c-s0.png',sourceClass:'c'},
      customerSlots:ids.map(id=>id===null?{path:'map/dummy.png',width:64,height:16}:{path:'map/c-s'+id+'.png',sourceClass:'c'}),
    },
    helper:{sprite:0,text:staffed?'歡迎光臨':speech[0]},
    customers:ids.map(id=>id===null?null:{sprite:id,text:speech[id]})};
}
