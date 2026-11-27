/** Local owner comment from frozen Core other.cgi / user.cgi / plug/name.cgi.
 * Authentication and multiplayer identity remain outside this local adapter.
 */
import {createHash} from 'node:crypto';
const pins={ownerMainSource:'5cd020011f6676ec4a8a202ab1bb28b90515ce8d',formSource:'2463a62fb4cac2364a7c8c7f8f0823d619396157',submitSource:'8e817c535d4cd17e68d65f0e2f67846a344b5094',nameSource:'ae3b3a862fc78b8775795ed88d5d1911861b3d80',configSource:'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0',readSource:'e7a8add7b0291901e71fe797783b664dff1568a0',logSource:'0f9143c49d1552233f27754e3937e1cdc2740f0a'};
const reviews=new WeakSet();
const fail=m=>{throw new RangeError(m)};
export function reviewOriginalShopComment(sources){
  for(const [k,sha] of Object.entries(pins)){
    const s=sources[k];
    if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('R4 shop comment source drift '+k);
  }
  const match=sources.configSource.match(/@NG_SHOP_NAME\s*=\s*qw\(([^)]+)\);/);
  if(!match)fail('R4 shop comment source name restriction');
  const review=Object.freeze({maxLength:36,forbiddenWords:Object.freeze(match[1].trim().split(/\s+/))});
  reviews.add(review);return review;
}
export function projectOriginalShopComment({reviewed,world,command}){
  if(!reviews.has(reviewed)||command.kind!=='edit-shop-comment'||command.shopId!==1||
    Object.keys(command).sort().join(',')!=='comment,expectedRevision,kind,shopId'||
    world.shops.length!==1||world.shops[0].id!==1||world.shops[0].status!==1)fail('R4 local owner comment command');
  const comment=command.comment;
  if(typeof comment!=='string'||/[\uD800-\uDFFF]/u.test(comment))fail('R4 comment must be Unicode text');
  if(/[,:;\t\r\n<>&]/.test(comment)||reviewed.forbiddenWords.some(word=>comment.includes(word)))fail('評論中包含無法使用的文字。');
  // Perl length() on decoded UTF-8 is a character count, not UTF-16 units.
  if([...comment].length>reviewed.maxLength)fail('評論的字數太多了。');
  const shop=world.shops[0];
  return {shops:[{...shop,comment,lastlogin:world.nowSeconds}],receipt:{
    action:'edit-shop-comment',source:'r4-frozen-user-comment.v1',shopId:1,
    commentBefore:shop.comment??'',commentAfter:comment,message:'評論更新完成。',timeSpentSeconds:0
  }};
}
