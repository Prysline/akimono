/** Frozen owner-icon forms and user.cgi::icon. Form RNG is request-local,
 * independent of the persistent commerce RNG. The HTTP boundary restricts
 * the original unrestricted assignment to the 25 safe form values. */
import {createHash} from 'node:crypto';
const pins={formSource:'2463a62fb4cac2364a7c8c7f8f0823d619396157',submitSource:'8e817c535d4cd17e68d65f0e2f67846a344b5094',listSource:'9bd8213168fdb4925de3279d0326997b0a97983e',imagePluginSource:'052f580fdc420c630bb907187d4e2e1382f0c669',configSource:'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0',readSource:'e7a8add7b0291901e71fe797783b664dff1568a0',newSource:'9f0a590a6f1d4e93d2534056a0dc96c4d5c80ba7',newFormSource:'b58cb54e5659a5796352b18fe68dac182767e390',ownerMainSource:'5cd020011f6676ec4a8a202ab1bb28b90515ce8d'};
const reviews=new WeakSet();
export const isOwnerIcon=id=>Number.isSafeInteger(id)&&id>=1&&id<=25;
export function reviewOriginalOwnerIcon(sources){
  for(const [key,sha] of Object.entries(pins)){
    const s=sources[key];
    if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)throw RangeError('R4 owner icon source drift '+key);
  }
  const result=Object.freeze({count:25,width:48,height:48,columns:5});reviews.add(result);return result;
}
export function describeOriginalOwnerIconForm(reviewed,draw){
  if(!reviews.has(reviewed)||typeof draw!=='function')throw RangeError('R4 owner icon review required');
  const value=draw(reviewed.count);
  if(!Number.isSafeInteger(value)||value<0||value>=reviewed.count)throw RangeError('R4 owner icon form draw');
  return {randomIcon:value+1,columns:reviewed.columns,icons:Array.from({length:reviewed.count},(_,i)=>({id:i+1,path:'./image/kao/kao'+(i+1)+'.png',width:48,height:48}))};
}
export function projectOriginalOwnerIcon({reviewed,world,command}){
  if(!reviews.has(reviewed)||command.kind!=='edit-owner-icon'||command.shopId!==1||
    Object.keys(command).sort().join(',')!=='expectedRevision,icon,kind,shopId'||
    !isOwnerIcon(command.icon)||world.shops.length!==1||world.shops[0].id!==1||world.shops[0].status!==1)
    throw RangeError('R4 local owner icon command');
  const shop=world.shops[0];
  return {shops:[{...shop,icon:command.icon,lastlogin:world.nowSeconds}],receipt:{
    action:'edit-owner-icon',source:'r4-frozen-user-icon.v1',shopId:1,iconBefore:shop.icon??null,
    iconAfter:command.icon,message:'店長頭像修改完成',timeSpentSeconds:0}};
}
