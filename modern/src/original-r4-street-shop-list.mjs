/** Standard Street original shop-a / shop-b read-only source list projections. */
import {createHash} from 'node:crypto';
const pins={product:'31bddddcfacfd91f7d778c3341b8b7f63d1aa6eb',shop:'82ee6a3794393608dd99a761f1cbe3b5d99bca33',page:'aa8b04dcec124276cb5b4eeeba650137b4449779',config:'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0'};
const reviews=new WeakSet();
const fail=m=>{throw new RangeError('R4 street shop list: '+m)};
const nat=x=>Number.isSafeInteger(x)&&x>=0;
export function reviewStreetShopLists(sources){
  for(const [k,sha] of Object.entries(pins)){
    const s=sources?.[k];
    if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k);
  }
  const r=Object.freeze({committable:false});reviews.add(r);return r;
}
function paginate(page,lines,count){
  const max=Math.trunc((count-1)/lines)||0;
  page=Math.min(max,Math.max(0,page));
  const start=page*lines,end=Math.min(count-1,start+lines-1);
  return [page,start,end,(page+1)*lines<count?page+1:0,page>0?page-1:-1,max];
}
export function projectStreetShopList({reviewed,mode,shops,catalog,viewerId,guest,mobile,page=0,tp=0,itn=0,ds=0,sendItem=0}){
  if(!reviews.has(reviewed))fail('source review required');
  if(!['product','shop'].includes(mode)||!Array.isArray(shops)||!Array.isArray(catalog)||
     ![viewerId,tp,itn,ds,sendItem].every(nat)||!Number.isSafeInteger(page)||
     typeof guest!=='boolean'||typeof mobile!=='boolean')fail('trusted list inputs required');
  const items=new Map(),sorts=new Set();
  for(const i of catalog){
    if(!i||!nat(i.no)||!nat(i.type)||!nat(i.sort)||items.has(i.no)||sorts.has(i.sort)||
       typeof i.name!=='string'||typeof i.scale!=='string')fail('original compiled catalog required');
    items.set(i.no,i);sorts.add(i.sort);
  }
  if(!items.has(0))fail('original item zero required');
  const ids=new Set(),all=[],seen=new Set(),groups=[];
  for(let j=0;j<shops.length;j++){
    const s=shops[j],rank=j+1;
    if(!s||!nat(s.id)||s.id===0||ids.has(s.id)||typeof s.shopname!=='string'||typeof s.guild!=='string'||
       !nat(s.status)||!nat(s.showcasecount)||!Array.isArray(s.showcase)||!Array.isArray(s.price)||!Array.isArray(s.item))fail('ordered original DT required');
    ids.add(s.id);
    const rows=[];let itemType=-1;
    // The original list and selectors scan 0..showcasecount inclusive.
    // shop-b display below separately excludes the extra slot.
    for(let slot=0;slot<=s.showcasecount;slot++){
      const no=s.showcase[slot]??0;
      if(!nat(no))fail('invalid showcase item');
      if(!no)continue;
      const i=items.get(no),price=s.price[slot],stock=s.item[no-1]??0,sold=s.itemtoday?.[no]??0;
      if(!i||!nat(price)||!nat(stock)||!nat(sold))fail('invalid source listing');
      itemType=itemType!==-1&&i.type!==itemType?0:i.type;
      const row={shopId:s.id,shopname:s.shopname,guild:s.guild,rank,slot,itemId:no,name:i.name,scale:i.scale,price,stock,sold};
      if(mode==='shop'||!tp||i.type===tp)seen.add(no);
      if(mode==='product'&&(!tp||i.type===tp)&&(!itn||itn===no)){
        const sort=price*shops.length+shops.length-rank;
        if(!Number.isSafeInteger(sort))fail('unreviewed source sort range');
        all.push({row,sort});
      }
      if(slot<s.showcasecount)rows.push(row);
    }
    for(const entry of all)if(entry.row.shopId===s.id)entry.row.itemType=itemType;
    groups.push({shopId:s.id,shopname:s.shopname,guild:s.guild,rank,status:s.status,rows});
  }
  const shopOptions=shops.filter(s=>s.id!==viewerId).map(s=>({id:s.id,selected:s.id===sendItem}));
  const itemOptions=mode==='product'&&mobile&&!tp?null:[0,...[...seen].sort((a,b)=>items.get(a).sort-items.get(b).sort)];
  const withLink=(row,p)=>{
    const buy=row.stock&&!guest?{buy:[row.shopId,row.slot,row.itemId].join('!'),bk:mode==='product'?'p2!'+p+'!'+itn:'p!'+p}:null;
    return {...row,buy};
  };
  if(mode==='product'){
    const info=paginate(page,mobile?5:25,all.length);
    all.sort((a,b)=>a.sort-b.sort); // original equal-price ordering, stable same-shop slot order
    return {pageInfo:info,itemOptions,shopOptions,rows:all.slice(info[1],info[2]+1).map(x=>withLink(x.row,info[0])),committable:false};
  }
  const index=ds?shops.findIndex(s=>s.id===ds):-1;
  if(ds&&index<0)fail('unresolved shop selection');
  const info=ds?[0,index,index,0,0,0]:paginate(page,5,shops.length);
  return {pageInfo:info,itemOptions,shopOptions,groups:groups.slice(info[1],info[2]+1).filter(s=>s.status).map(({status,rows,...s})=>({...s,rows:rows.map(r=>withLink(r,info[0]))})),committable:false};
}
