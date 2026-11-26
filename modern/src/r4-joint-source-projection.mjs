/**
 * R4 isolated joint-source publication candidate, NOT WorldState authority.
 * Producer identities are explicit sandbox inputs until genuine producer replay
 * exists. Dragon consumption is only the original pre-UpdateResetBefore
 * accumulation stage, not a completed period or cash settlement.
 */
import {createHash} from 'node:crypto';
import {reviewGuildPeerPurchase,projectGuildPeerPurchase} from './original-r4-guild-peer-purchase.mjs';
import {reviewR4DragonBalance,projectR4DragonBalance} from './original-r4-dragon-balance.mjs';
const fail=s=>{throw new RangeError('R4 joint candidate: '+s)};
const plain=x=>x!==null&&typeof x==='object'&&Object.getPrototypeOf(x)===Object.prototype;
const int=x=>Number.isSafeInteger(x);
const name=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(x)&&!['constructor','prototype','__proto__'].includes(x);
const exact=(x,keys)=>plain(x)&&Object.keys(x).sort().join(',')===[...keys].sort().join(',');
const text=x=>typeof x==='string'&&Buffer.byteLength(x)<=100000;
const pins={drlog:'e60cda027c87de25585ee59bf64a4cb24b9d1476',colock:'99ff12db08135879e1a570cef1424f6dd5bec151',lock:'84382170f1b7f70348c4e2a91bf30b1d1043b964',period:'6183e88e9dd69a16606a1064c8084e9a1411dbd5'};
const producerKinds=new Set(['training','boarding','maintenance','race-prize','dragon-purchase','rider-creation','pasture-creation','stable-creation']);
export function jointCanonical(x){
  if(x===null||typeof x==='boolean'||typeof x==='string'||int(x))return JSON.stringify(x);
  if(Array.isArray(x))return '['+x.map(jointCanonical).join(',')+']';
  if(plain(x))return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+jointCanonical(x[k])).join(',')+'}';
  fail('canonical JSON values required');
}
export const jointDigest=x=>createHash('sha256').update(jointCanonical(x)).digest('hex');
const clone=x=>JSON.parse(jointCanonical(x));
export function createJointSourceProjector({guildSources,dragonSources,genesis}){
  if(!exact(dragonSources,Object.keys(pins)))fail('exact original dragon source set');
  for(const [k,sha] of Object.entries(pins)){
    const s=dragonSources[k];
    if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0'+s).digest('hex')!==sha)fail('dragon source drift '+k);
  }
  const guild=reviewGuildPeerPurchase(guildSources),dragon=reviewR4DragonBalance({periodSource:dragonSources.period});
  if(!exact(genesis,['lineage','commonBytes','streets'])||!name(genesis.lineage)||!text(genesis.commonBytes)||!plain(genesis.streets)||!Object.keys(genesis.streets).length)fail('explicit sandbox genesis');
  for(const [street,s] of Object.entries(genesis.streets)){
    if(!name(street)||!exact(s,['shops','definitions','ledgers'])||!Array.isArray(s.shops)||!s.shops.length||
       s.shops.length>100||!plain(s.definitions)||!plain(s.ledgers)||Object.keys(s.definitions).sort().join(',')!==Object.keys(s.ledgers).sort().join(','))fail('street definition/ledger mismatch');
    const ids=new Set();
    for(const shop of s.shops){
      if(!plain(shop)||!int(shop.id)||shop.id<=0||ids.has(shop.id)||!['money','dragon','drmoney','saletoday','paytoday'].every(k=>int(shop[k]))||
         typeof shop.guild!=='string'||shop.guild&&!Object.hasOwn(s.definitions,shop.guild))fail('explicit street shop and membership');
      ids.add(shop.id);
    }
  }
  const initial=clone({...genesis,revision:0,receipts:[],payments:[]});
  const getStreet=(s,id)=>{if(!name(id)||!Object.hasOwn(s.streets,id))fail('unknown street');return s.streets[id]};
  function getShop(s,street,id){
    if(!int(id)||id<1)fail('invalid shop ID');
    const shop=getStreet(s,street).shops.find(x=>x.id===id);if(!shop)fail('unknown street/shop');return shop;
  }
  function operationKey(c){
    if(c?.lineage!==initial.lineage||!name(c.id)||!int(c.expectedRevision)||c.expectedRevision<0)fail('operation lineage/identity/revision required');
    if(c.kind==='dragon-produce'){
      if(!exact(c,['kind','lineage','id','expectedRevision','sourceKind','sourceAction','batch','commonBefore','commonAfter','rows'])||
         !producerKinds.has(c.sourceKind)||!name(c.sourceAction)||!int(c.batch)||c.batch<0)fail('producer origin required');
      // Producer identity binds the source action + batch, never payout bytes.
      return jointCanonical([c.lineage,c.kind,c.sourceKind,c.sourceAction,c.batch]);
    }
    if(c.kind==='dragon-consume'){
      if(!exact(c,['kind','lineage','id','expectedRevision','street','settlementId'])||!name(c.street)||!name(c.settlementId))fail('consumer identity required');
      return jointCanonical([c.lineage,c.kind,c.street,c.settlementId]);
    }
    if(c.kind==='guild-buy'){
      if(!exact(c,['kind','lineage','id','expectedRevision','street','buyerId','sellerId','command','nowSeconds','townTaxRate','sendItemTime','rankDraws']))fail('guild operation shape');
      return jointCanonical([c.lineage,c.kind,c.street,c.id]);
    }
    fail('unreviewed operation');
  }
  function project(state,command){
    const c=clone(command),key=operationKey(c),digest=jointDigest(c);
    const old=state.receipts.find(x=>x.key===key);
    if(old){
      if(old.commandDigest!==digest)fail('operation identity reused with different command');
      return {mode:'replay',state:clone(state),receipt:clone(old.receipt),committable:false};
    }
    if(state.receipts.some(x=>x.id===c.id))fail('duplicate operation ID');
    if(c.expectedRevision!==state.revision)return {mode:'conflict',state:clone(state),committable:false};
    if(state.revision>=256)fail('sandbox journal bound');
    const next=clone(state);let details;
    if(c.kind==='guild-buy'){
      const s=getStreet(next,c.street),buyer=getShop(next,c.street,c.buyerId),seller=getShop(next,c.street,c.sellerId);
      const p=projectGuildPeerPurchase({reviewed:guild,before:{buyer,seller,ledgers:s.ledgers},definitions:s.definitions,
        command:c.command,nowSeconds:c.nowSeconds,townTaxRate:c.townTaxRate,sendItemTime:c.sendItemTime,rankDraws:c.rankDraws});
      if(!p.ok)return {mode:'refused',reason:p.reason,state:clone(state),committable:false};
      s.shops=s.shops.map(x=>x.id===buyer.id?p.after.buyer:x.id===seller.id?p.after.seller:x);
      s.ledgers=p.after.ledgers;
      details={street:c.street,buyerId:c.buyerId,sellerId:c.sellerId,purchase:p.receipt,stages:p.stages,rankRanges:p.rankRanges};
    }else if(c.kind==='dragon-produce'){
      if(c.commonBefore!==jointDigest(state.commonBytes)||!text(c.commonAfter)||!Array.isArray(c.rows)||!c.rows.length||c.rows.length>100)fail('producer common lineage or rows');
      const rows=c.rows.map((row,index)=>{
        if(!exact(row,['street','shopId','amount'])||!int(row.amount))fail('payout row');
        getShop(next,row.street,row.shopId);
        // Row index disambiguates identical amounts in one batch. Street and
        // shop are part of identity even if separate streets reuse shop IDs.
        return {...row,paymentId:jointCanonical([key,index,row.street,row.shopId]),consumedBy:null};
      });
      if(next.payments.length+rows.length>1000)fail('payment journal bound');
      next.commonBytes=c.commonAfter;next.payments.push(...rows);
      details={sourceKind:c.sourceKind,sourceAction:c.sourceAction,batch:c.batch,paymentIds:rows.map(x=>x.paymentId),commonAfter:jointDigest(next.commonBytes)};
    }else{
      const s=getStreet(next,c.street);
      // Until the full period/reset chain is integrated, this proof permits
      // one consumer stage per street; never settle a previous dragon twice.
      if(state.receipts.some(x=>x.kind==='dragon-consume'&&x.receipt.details.street===c.street))fail('subsequent period chain not reviewed');
      const rows=next.payments.filter(x=>x.street===c.street&&x.consumedBy===null);
      for(const row of rows)getShop(next,row.street,row.shopId);
      const payoutText=rows.map(x=>x.shopId+'\t'+x.amount+'\n').join('');
      const p=projectR4DragonBalance({reviewed:dragon,shops:s.shops,payoutText,applyShopLedger:false});
      s.shops=p.shops.map(x=>({...x}));
      for(const row of rows)row.consumedBy=key;
      details={street:c.street,settlementId:c.settlementId,paymentIds:rows.map(x=>x.paymentId),payoutText,phase:'DragonBalance-before-UpdateResetBefore'};
    }
    next.revision++;
    const receipt={key,id:c.id,revision:next.revision,kind:c.kind,details};
    next.receipts.push({key,id:c.id,kind:c.kind,commandDigest:digest,receipt});
    return {mode:'published-candidate',state:clone(next),receipt:clone(receipt),committable:false};
  }
  return Object.freeze({initial:()=>clone(initial),project,committable:false});
}
