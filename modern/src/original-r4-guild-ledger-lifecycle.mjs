/** Source lifecycle for sparse/empty ledgers and definition rebuild.
 * Semantic rows only: native Perl hash permutations still belong to shared replay.
 * No file writes, registration, authority or fallback from strict period guards.
 */
import {createHash} from 'node:crypto';
const pins={guild:'6593aa8a3ae4a1695c2418f12a3776f0053454ac',guildsub:'4dee1edeeedf3b482b8786111e1e5d626095f8d5',sub:'33c767f434d7d6f0c5e9e0c9a291472b3a0f3b25',config:'010e43766c1b78c7572cbc0aded2daf03dc07a1e'};
const reviews=new WeakSet();
const fail=m=>{throw new RangeError('R4 guild ledger lifecycle: '+m)};
const record=x=>x!==null&&typeof x==='object'&&Object.getPrototypeOf(x)===Object.prototype;
const code=s=>typeof s==='string'&&/^[A-Za-z][A-Za-z0-9_]*$/.test(s)&&!['constructor','prototype'].includes(s);
const int=Number.isSafeInteger;
const keys=['money','in','out','atk','def'];
const name=s=>typeof s==='string'&&s!==''&&!/['\\\t\r\n\0]/.test(s);
export function reviewGuildLedgerLifecycle(sources){
  for(const [k,sha] of Object.entries(pins)){
    const s=sources?.[k];if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k);
  }
  const review=Object.freeze({committable:false});reviews.add(review);return review;
}
function readRows(text){
  if(text===null||text==='')return {};
  if(typeof text!=='string'||!text.endsWith('\n'))fail('canonical ledger rows required');
  const rows={};
  for(const line of text.split('\n').slice(0,-1)){
    const [id,...pairs]=line.split('\t');
    if(!code(id)||Object.hasOwn(rows,id)||!pairs.length)fail('invalid ledger row');
    const row={};rows[id]=row;
    if(pairs.length===1&&pairs[0]==='')continue;
    if(pairs.length%2)fail('unreviewed ledger fields');
    for(let i=0;i<pairs.length;i+=2){
      const [k,v]=pairs.slice(i,i+2);
      if(Object.hasOwn(row,k))fail('duplicate ledger field');
      if(k==='guild'&&v===id)row[k]=v;
      else if(keys.includes(k)&&/^-?(0|[1-9]\d*)$/.test(v)&&int(Number(v)))row[k]=Number(v);
      else fail('unreviewed ledger value');
    }
  }
  return rows;
}
function rateToken(s){
  if(typeof s!=='string'||!/^[0-9]{1,4}$/.test(s)||Number(s)<10||Number(s)>500)fail('unreviewed common rate');
  if(s[0]==='0'&&/[89]/.test(s))fail('original generated Perl has invalid octal rate');
  return s[0]==='0'?parseInt(s,8):Number(s);
}
export function projectGuildLedgerLifecycle({reviewed,loaded,common,ledgerText,shops,edits=[],rebuild=false}){
  if(!reviews.has(reviewed)||!record(loaded)||!record(common)||!Array.isArray(shops)||!Array.isArray(edits)||typeof rebuild!=='boolean')fail('reviewed lifecycle context required');
  for(const [id,d] of Object.entries(loaded))if(!code(id)||!record(d)||!name(d.shortname)||!int(d.dealrate)||!int(d.feerate))fail('unreviewed loaded definition');
  for(const [id,d] of Object.entries(common))if(!code(id)||!record(d)||!name(d.shortname)||typeof d.dealrate!=='string'||typeof d.feerate!=='string')fail('unreviewed common definition');
  const ids=new Set();for(const shop of shops){if(!record(shop)||!int(shop.id)||shop.id<1||ids.has(shop.id)||!(shop.guild===''||code(shop.guild))||!record(shop.user))fail('unreviewed shop');ids.add(shop.id);}
  const ledger=readRows(ledgerText);
  for(const e of edits){
    if(!record(e)||!code(e.guildId)||!int(e.amount))fail('unreviewed ledger edit');
    // EditGuildMoney copies the missing value to a lexical scalar. No row is inserted.
    if(!Object.hasOwn(ledger,e.guildId))continue;
    const row=ledger[e.guildId];row.money=(row.money??0)+e.amount;
    if(e.amount>0)row.in=(row.in??0)+e.amount;if(e.amount<0)row.out=(row.out??0)-e.amount;
    if(keys.some(k=>Object.hasOwn(row,k)&&!int(row[k])))fail('ledger overflow');
  }
  const next=structuredClone(shops),removed=[],added=[],logs=[];
  let definitions=structuredClone(loaded),generatedRateTokens=null;
  if(rebuild){
    definitions={};generatedRateTokens={};
    for(const [id,d] of Object.entries(common)){
      definitions[id]={shortname:d.shortname,dealrate:rateToken(d.dealrate),feerate:rateToken(d.feerate)};
      generatedRateTokens[id]={dealrate:d.dealrate,feerate:d.feerate};
    }
    for(const id of Object.keys(loaded).filter(id=>!Object.hasOwn(common,id)).sort()){
      removed.push(id);logs.push([1,0,{key:'ギルド「%1」は滅びました。',args:[loaded[id].shortname]},1]);
      for(const shop of next)if(shop.guild===id){shop.guild='';delete shop.user._so_e;}
    }
    for(const id of Object.keys(common).filter(id=>!Object.hasOwn(loaded,id)).sort()){
      added.push(id);logs.push([1,0,{key:'ギルド「%1」が結成されました。',args:[common[id].shortname]},1]);
    }
  }
  // WriteGuildData sees the old in-memory GUILD keys even after MakeGuildFile.
  const stagedLedgerRows=Object.fromEntries(Object.keys(loaded).map(id=>[id,structuredClone(ledger[id]??{})]));
  return {shops:next,ledger,stagedLedgerRows,definitions,generatedRateTokens,removed,added,logCandidates:logs,nativeOrderResolved:false,committable:false,worldStateWritten:false};
}
