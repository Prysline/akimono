/** Public-state half of original membership/user.cgi repass.
 * CheckUserPass sets lastlogin; Standard Street FUNCINIT only adjusts the
 * transient purchase-time variable. Password, KDF and session are private
 * publisher effects. The command has no secret or client identity fields. */
import {createHash} from 'node:crypto';
const reviewedTokens=new WeakSet();
const fail=()=>{throw new RangeError('R4 repass: exact reviewed active owner command required');};
const blob=s=>typeof s==='string'?createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex'):null;
export function reviewOriginalAccountPasswordChange({membershipSource,readSource,itemDsl}={}){
 if(blob(membershipSource)!=='8e817c535d4cd17e68d65f0e2f67846a344b5094'||
    blob(readSource)!=='e7a8add7b0291901e71fe797783b664dff1568a0'||
    blob(itemDsl)!=='7a18185e98b32aee82ca1ce30d6f3c395157dbcb')fail();
 const token=Object.freeze({});reviewedTokens.add(token);return token;
}
export function projectOriginalAccountPasswordChange({reviewed,world,command}={}){
 if(!reviewedTokens.has(reviewed)||!command||Object.keys(command).sort().join(',')!=='expectedRevision,kind,shopId'||
    command.kind!=='change-owner-password'||command.expectedRevision!==world.revision||
    !Number.isSafeInteger(command.shopId)||command.shopId<1||
    world.shops.length!==1||world.shops[0].id!==command.shopId||world.shops[0].status!==1)fail();
 const shop={...world.shops[0],lastlogin:world.nowSeconds};
 return {shops:[shop],receipt:{action:'change-owner-password',shopId:shop.id}};
}
