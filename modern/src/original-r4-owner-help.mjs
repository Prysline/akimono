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
