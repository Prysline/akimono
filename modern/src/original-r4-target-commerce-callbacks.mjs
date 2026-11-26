/** Source callback-only #62/2 and #65/0..2. No multi-shop authority,
 * target selector, USE consumption, persistence or event commit is implied.
 * Inputs describe the already-consumed source callback state. */
import {createHash} from 'node:crypto';
import {parseDsl} from './parse-dsl.mjs';
import {loadStandardStreetModel,parseSourceNumber} from './standard-street-model.mjs';
import {compileReviewedGiftMapUse} from './reviewed-gift-map-use.mjs';
import {reviewNormalCommerceItems,validateNormalCommerceInventory} from './reviewed-normal-commerce-items.mjs';
const fail=s=>{throw new RangeError('R4 target commerce callback: '+s)};
const reviews=new WeakSet();
const pin=(s,sha)=>typeof s==='string'&&createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')===sha;
const one=(b,k)=>b.fields[k]?.[0]?.value;
const int=(n,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const copy=x=>structuredClone(x);
export function reviewTargetCommerceCallbacks(sources){
  const items=reviewNormalCommerceItems(sources);
  if(!pin(sources.readSource,'e7a8add7b0291901e71fe797783b664dff1568a0')||
     !pin(sources.configSource,'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0')||
     !pin(sources.rebelDsl,'923634e58a05beca9ab004515fc7669d53a1ba3a'))fail('frozen auxiliary source drift');
  const p=parseDsl(sources.itemDsl,'custom/inc-item-data.cgi');
  const def=p.blocks.find(b=>b.kind==='DEFINE'),model=loadStandardStreetModel(sources.itemDsl,sources.rebelDsl);
  const compiled=compileReviewedGiftMapUse({itemDsl:sources.itemDsl,rebelDsl:sources.rebelDsl,model});
  const types=Object.freeze(Array.from({length:11},(_,i)=>one(def,'type'+i)));
  if(one(def,'itemusetimerate')!=='0.5'||types.slice(4,8).join(',')!=='劍,鎧,盾,杖')fail('type or time source');
  const rules={};
  for(const [itemId,useIds] of [[62,[2]],[65,[0,1,2]]]){
    const item=p.blocks.find(b=>b.kind==='ITEM'&&one(b,'no')===String(itemId));
    const uses=p.blocks.filter(b=>b.kind==='USE'&&b.ownerItemLine===item.startLine);
    for(const useId of useIds){
      const b=uses[useId],fields=b.fields;
      if(!b||one(b,'func')!=='_local_'||one(b,'arg')!==(itemId===65?'target|nocount':'nocount')||
         one(b,'use')?.replace(/\s+/g,' ')!=='1 '+one(item,'name'))fail('USE source row');
      rules[itemId+':'+useId]=Object.freeze({itemId,useId,time:parseSourceNumber(one(b,'time'))/2,
        exptime:parseSourceNumber(one(b,'exptime')??one(b,'time'))/2,
        money:parseSourceNumber(fields.price?.at(-1)?.value??'0'),
        exp:parseSourceNumber(one(b,'exp')??'0'),needPoint:parseSourceNumber(one(b,'needpoint')??'0'),
        sourceLine:b.startLine,requiresTarget:itemId===65});
    }
  }
  // PRICE is last-wins in GetBuffer, including the two declarations #65/0.
  const expected=[[62,2,28800,28800,0,0,0],[65,0,18000,14400,0,200,20000],
    [65,1,18000,14400,50000,250,20000],[65,2,28800,25200,50000,50,20000]];
  for(const [id,u,time,exptime,money,exp,needPoint] of expected){
    const q=rules[id+':'+u];
    if([q.time,q.exptime,q.money,q.exp,q.needPoint].join(',')!==[time,exptime,money,exp,needPoint].join(','))fail('compiled USE metadata drift '+id+'/'+u);
  }
  const r=Object.freeze({source:'r4-original-target-commerce-callbacks.v1',committable:false,items,compiled,types,rules:Object.freeze(rules)});
  reviews.add(r);return r;
}
const moneyString=n=>'\\'+String(n).replace(/\B(?=(\d{3})+(?!\d))/g,',');
export function projectTargetCommerceCallback({reviewed,itemId,useId,shops,actorIndex,targetIndex=null,town,events,nowSeconds,guildNames={},randomDraws}){
  if(!reviews.has(reviewed)||!Object.hasOwn(reviewed.rules,itemId+':'+useId)||!Array.isArray(shops)||shops.length<1||shops.length>12||
     !int(actorIndex,0,shops.length-1)||!int(nowSeconds)||!plain(town)||!int(town.safety)||!plain(events)||
     Object.values(events).some(v=>!int(v))||!plain(guildNames)||!Array.isArray(randomDraws)||
     randomDraws.length>1||randomDraws.some(n=>!int(n,0,999999)))fail('bounded callback inputs');
  if(new Set(shops.map(s=>s.id)).size!==shops.length)fail('shop identity');
  for(const s of shops){
    validateNormalCommerceInventory(s,reviewed.compiled,reviewed.items);
    if(!int(s.id,1)||s.status!==1||typeof s.shopname!=='string'||!s.shopname||typeof s.guild!=='string'||
       !int(s.rank,0,10000)||!int(s.point)||!int(s.money,-Number.MAX_SAFE_INTEGER)||!int(s.paytoday)||!int(s.saletoday))fail('source shop fields');
  }
  const rule=reviewed.rules[itemId+':'+useId];
  if(shops[actorIndex].item[itemId-1]!==0||shops[actorIndex].point<rule.needPoint)fail('post-consumption or point gate');
  if(rule.requiresTarget?!int(targetIndex,0,shops.length-1):targetIndex!==null)fail('target shape');
  const next=copy(shops),state=copy(town),active=copy(events),actor=next[actorIndex],target=next[targetIndex];
  const logs=[],ranges=[];
  let used=0,returned;
  const log=(level,id,message)=>logs.push([level,id,message]);
  const rand=range=>{if(used>=randomDraws.length)fail('missing exact source draw');ranges.push(range);return range*randomDraws[used++]/1000000;};
  const adjust=(s,delta)=>{s.rank+=delta;};
  if(itemId===62){
    if(!actor.guild)returned='沒有加入商會無法進行商會廣告';
    else{
      if(typeof guildNames[actor.guild]!=='string'||!guildNames[actor.guild])fail('explicit reviewed guild name context');
      log(3,0,actor.shopname+'的商會「'+guildNames[actor.guild]+'」進行了廣告宣傳');
      for(const member of next){
        if(member.guild!==actor.guild)continue;
        const up=Math.trunc(500*(2-member.rank/5000));
        member.rank=Math.min(10000,member.rank+up);
        log(0,actor.id,'進行商會廣告後，'+member.shopname+'的人氣上升了'+Math.trunc(up/100)+'%');
      }
      returned='進行商會廣告';
    }
  }else if(useId===0){
    if(rand(1000)<800&&!target.exp?.[62]){
      adjust(target,-Math.trunc(target.rank/3));
      returned='散佈'+target.shopname+'謠言的作戰成功了。';
      log(0,actor.id,returned);log(2,0,target.shopname+'因為謠言的關係人氣下降了。');
    }else{
      target.exp={...target.exp,62:Math.max(0,(target.exp?.[62]??0)-100)};
      adjust(actor,-Math.trunc(actor.rank/4));
      returned='散佈'+target.shopname+'謠言的作戰失敗了。';
      log(0,actor.id,returned);log(3,0,actor.shopname+'的策畫散佈'+target.shopname+'的謠言。');
    }
  }else if(useId===1){
    if(actor===target)returned='無法從自己店裡偷東西。偷竊失敗了。';
    else{
      const robot=target.item[63]>0;
      if(robot||rand(1000)>900){
        if(robot)target.item[63]--;
        adjust(actor,-Math.trunc(actor.rank/4));
        target.money+=500000;target.saletoday+=500000;actor.money-=500000;actor.paytoday+=500000;
        returned='偷竊失敗了。賠償金'+moneyString(500000)+'已經被扣留。';
        log(3,0,actor.shopname+'曾經向'+target.shopname+(robot?'進行偷竊，但破壞了看門機器人時被捉到了。':'進行偷竊但失敗了。'));
        log(3,0,actor.shopname+'向'+target.shopname+'支付了賠償金'+moneyString(500000)+'。');
        log(0,actor.id,returned);
      }else{
        let value=0;
        for(let shelf=0;shelf<target.showcasecount;shelf++){
          const id=target.showcase[shelf];if(!id)continue;
          const i=id-1,n=Math.min(Math.trunc(target.item[i]*3/4),reviewed.compiled.limits[i].limit-actor.item[i]);
          target.item[i]-=n;actor.item[i]+=n;value+=n*target.price[shelf];
        }
        if(!int(value))fail('source theft value');
        state.safety=Math.trunc(state.safety*18/19);
        returned='偷竊成功了';
        log(2,0,value?target.shopname+'被偷了總價大概'+moneyString(value)+'的損失':'闖進'+target.shopname+'的小偷什麼都沒拿就逃走了。');
        log(0,actor.id,returned);
      }
    }
  }else{
    const id=target.showcase[Math.trunc(rand(target.showcasecount))];
    const type=id?reviewed.items.items[id-1].type:0;
    const category={4:'ken',5:'yoroi',6:'tate',7:'tue'}[type];
    const key='kill-'+category;
    if(!category||Object.hasOwn(active,key))returned='造謠失敗了';
    else{
      const end=nowSeconds+8*60*60;if(!int(end))fail('source EVENT expiry');
      active[key]=end;
      returned='散佈有關'+reviewed.types[type]+'市場的謠言';
      log(0,actor.id,returned);log(2,0,'有關'+reviewed.types[type]+'市場的謠言似乎正在流傳。');
    }
  }
  if(used!==randomDraws.length)fail('unused exact source draw');
  for(const s of next){
    validateNormalCommerceInventory(s,reviewed.compiled,reviewed.items);
    if(!int(s.money,-Number.MAX_SAFE_INTEGER)||!int(s.paytoday)||!int(s.saletoday))fail('source callback arithmetic');
  }
  return Object.freeze({source:reviewed.source,committable:false,shops:next,town:state,events:active,returned,logs,drawRanges:ranges});
}
