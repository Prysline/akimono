/** Original Standard Street menu routes and activity indicator. No auth or writes. */
import {createHash} from 'node:crypto';
const pins={menu:'53e8e64f1b3c1d0eeb67104cc3377b50996c4187',config:'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0',time:'e164091d4dc6de084bb4770e0b9b4bf6005d9f3f'};
const reviews=new WeakSet(),fail=m=>{throw new RangeError('R4 street menu: '+m)};
export function reviewStreetMenu(sources){
  for(const [k,sha] of Object.entries(pins)){
    const s=sources?.[k];if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k);
  }
  const r=Object.freeze({committable:false});reviews.add(r);return r;
}
const id=n=>Number.isSafeInteger(n)&&n>0;
const sec=n=>Number.isSafeInteger(n)&&n>=0&&n<=8640000000000-32400;
const library=['図書館','action.cgi?key=library','_blank'];
const info=[['風景','town'],['新聞','log'],library];
function boardTime(mtime,now){
  if(!mtime)return '--/--';
  const d=new Date((mtime+32400)*1000),pad=n=>String(n).padStart(2,'0');
  return mtime>now-43200||Math.trunc((mtime+32400)/86400)===Math.trunc((now+32400)/86400)
    ?pad(d.getUTCHours())+':'+pad(d.getUTCMinutes()):pad(d.getUTCMonth()+1)+'/'+pad(d.getUTCDate());
}
export function projectStreetMenu({reviewed,viewerKind,actorId=null,nowSeconds,boardMtime,shops,mailboxPresent=false}){
  if(!reviews.has(reviewed)||!['player','guest','admin'].includes(viewerKind)||!sec(nowSeconds)||!sec(boardMtime)||!Array.isArray(shops)||typeof mailboxPresent!=='boolean')fail('reviewed trusted snapshot required');
  const seen=new Set();
  for(const s of shops){
    if(!s||!id(s.id)||seen.has(s.id)||!sec(s.lastlogin)||typeof s.shopname!=='string')fail('ordered source DT required');seen.add(s.id);
  }
  const player=viewerKind==='player';
  if(player?(!id(actorId)||!seen.has(actorId)):(actorId!==null||mailboxPresent))fail('trusted viewer context required');
  const boardLabel=boardTime(boardMtime,nowSeconds);
  const groups=(player?[
    ['自店',[['店内','main'],['倉庫','stock'],['お掃除','sweep'],['収支','balance'],['手続','other'],['LogOut','index.cgi']]],
    ['取引',[['市場','shop-m'],['商店通り','shop-a'],['依頼所','req'],['宮殿','palace']]],
    ['情報',info],
    ['施設',[['領主邸','lord'],['ギルド','gd'],['競技場','slime'],['傭兵所','army'],['住宅地','hometown']]],
    ['交流',[['郵便局','letter'],['宅配便','dwarf'],['掲示板 '+boardLabel,'treebbs'],['wis','wis']]],
  ]:[['街案内',info]]).map(([label,rows])=>({label,links:rows.map(([label,route,target=null])=>({label,route,target}))}));
  let activity=null;
  if(player){
    if(mailboxPresent){
      // Existing projectWisRead supplies the actual mailbox bytes and scoped deletion intent.
      // Presence, not content truthiness, selects the source branch.
      activity={kind:'wis',actorId};
    }else{
      const names=shops.filter(s=>s.lastlogin>=nowSeconds-120).slice(0,4).map(s=>s.shopname);
      const more=names.length===4;
      activity={kind:'active',names,more,sourceText:names.length?names.join('， ')+(more?'ほか':''):'なし'};
    }
  }
  return {groups,activity,boardTimeLabel:player?boardLabel:null,committable:false};
}
