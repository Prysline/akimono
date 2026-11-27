/** Original wis one-message mailbox, shared with source lifecycle subdata.
 * No network, direct file access, raw HTML rendering or authentication. */
import {createHash} from 'node:crypto';
const pins={wis:'9cf103e681229dd765c04465a41aa4975d9d7fac',menu:'53e8e64f1b3c1d0eeb67104cc3377b50996c4187',query:'e7a8add7b0291901e71fe797783b664dff1568a0'};
const reviews=new WeakSet(),fail=m=>{throw new RangeError('R4 wis: '+m)};
const id=n=>Number.isSafeInteger(n)&&n>0;
export function reviewWis(sources){
 for(const [k,sha] of Object.entries(pins)){
   const s=sources?.[k];if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k);
 }
 const r=Object.freeze({source:'r4-original-wis.v1',committable:false});reviews.add(r);return r;
}
export function projectWisSend({reviewed,actor,recipientId,activeShopIds,message}){
 if(!reviews.has(reviewed)||!actor||!id(actor.id)||typeof actor.name!=='string'||!id(recipientId)||!Array.isArray(activeShopIds)||!activeShopIds.includes(actor.id)||!activeShopIds.includes(recipientId)||typeof message!=='string')fail('trusted street context');
 const msg=message.replace(/["',]/g,' ').replace(/[\x00-\x1f]/g,'');
 if(!msg||msg==='0'||[...msg].length>72)fail('source nonempty message up to 72 characters');
 const escaped=msg.replace(/&/g,'&amp;').replace(/>/g,'&gt;').replace(/</g,'&lt;');
 return {recipientId,subdataName:recipientId+'-wis.cgi',sourceBytes:'<SPAN>'+actor.name+'</SPAN> > <b>'+escaped+'</b>',message:msg,overwrite:true,committable:false};
}
export function projectWisRead({reviewed,actorId,sourceBytes}){
 if(!reviews.has(reviewed)||!id(actorId)||!(sourceBytes===null||typeof sourceBytes==='string'))fail('trusted actor mailbox required');
 // Source menu WisRead consumes the one mailbox file; D renders safely and
 // combines deletion with its authoritative read/transaction contract.
 return {actorId,subdataName:actorId+'-wis.cgi',sourceBytes,deleteRequired:sourceBytes!==null,committable:false};
}
