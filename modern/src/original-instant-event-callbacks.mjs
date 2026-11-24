/**
 * B-55: the true frozen Standard Street EVENT STARTFUNC bodies for manbiki
 * and goutou, as verified by a Perl-executed oracle.
 * Source callback effects ONLY: natural EVENT gate/hash order are not run.
 * No public HTTP route and no new period settlement capability.
 */
import {B53_EVENT_CATALOG_SOURCE}
  from './original-event-compiled-catalog.mjs';
import {B41_SOURCE,validateP3Inventory} from './original-b41-playable-sale.mjs';
import {isSourceShowcaseListedPrice} from './shared-showcase-price.mjs';
export const B55_SOURCE='original-instant-manbiki-goutou-startfunc';
const fail=x=>{throw new RangeError('B-55 original EVENT startfunc: '+x);};
const safe=(v,name,min=0)=>{
  if(!Number.isSafeInteger(v)||v<min)fail(name);
  return v;
};
const specs=Object.freeze({
  manbiki:Object.freeze({
    chance:1000,args:'_local_(400,200)',hit:400,break:200,
    markers:Object.freeze([
      'next if rand(1000)>$hitproba;',
      'if($DT->{item}[@@ITEMNO"看門機器人"-1])',
      'if rand(1000)>$breakproba;',
      '$DT->{item}[@@ITEMNO"看門機器人"-1]--;',
      'my $cnt=int($DT->{item}[$itemno-1]/10);',
      '$DT->{item}[$itemno-1]-=$cnt;',
      '$count+=$cnt*$DT->{price}[$idx];',
    ]),
  }),
  goutou:Object.freeze({
    chance:200,args:'_local_(700)',hit:700,break:null,
    markers:Object.freeze([
      'next if rand(1000)>$hitproba;',
      'if($DT->{item}[@@ITEMNO"看門機器人"-1])',
      '$DT->{item}[@@ITEMNO"看門機器人"-1]--;',
      '$DT->{rank}-=int($DT->{rank}/5);',
      'my $cnt=int($DT->{item}[$itemno-1]/4);',
      '$DT->{item}[$itemno-1]-=$cnt;',
      '$count+=$cnt*$DT->{price}[$idx];',
    ]),
  }),
});
function sourceEventBlock(dsl,code){
  if(typeof dsl!=='string')fail('original ITEM DSL missing');
  const blocks=dsl.split(/^@@EVENT[^\r\n]*\r?\n/gmi).slice(1);
  const found=blocks.filter(b=>new RegExp(
    '^\\s*code[ \\t]+'+code+'(?:[ \\t]|$)','m',
  ).test(b));
  if(found.length!==1)fail('source event '+code+' has changed');
  const block=found[0].split(/^@@(?:ITEM|DEFINE|END|FUNC[A-Z]+)[^\r\n]*$/mi)[0];
  if(!block.includes('startfunc'))fail('missing original startfunc '+code);
  return block;
}
export function reviewOriginalInstantEventCallbacks({
  itemDsl,turnSource,compilerSource,compiledCatalog,
}){
  if(compiledCatalog?.source!==B53_EVENT_CATALOG_SOURCE||
     compiledCatalog.compiledCount!==17||
     typeof turnSource!=='string'||
     !turnSource.includes('($ret,$msg)=&$func(split(/[:,]/,$E->{startfuncparam}));')||
     !turnSource.includes('if($ret)')||
     typeof compilerSource!=='string'||
     !compilerSource.includes('$event->{startfunc},'))
    fail('fixed EVENT startfunc call / compiled metadata changed');
  for(const [code,spec] of Object.entries(specs)){
    const entry=compiledCatalog.compiled.find(x=>x.code===code);
    if(entry?.startProba!==spec.chance||
       entry.callbacks?.start!==spec.args||
       entry.baseTimeSeconds!==0||entry.plusTimeSeconds!==0)
      fail('compiler EVENT chance/instant startfunc drift: '+code);
    const block=sourceEventBlock(itemDsl,code);
    const literal=block.match(/^\s*startfunc[ \t]+([^\s#]+)/m)?.[1];
    if(literal!==spec.args)fail('original EVENT '+code+' arguments');
    let last=-1;
    for(const marker of spec.markers){
      const pos=block.indexOf(marker,last+1);
      if(pos<0)fail('source '+code+' callback drift '+marker);
      last=pos;
    }
    if(!block.includes('return 0;')||
       !block.includes('\n\t_local_')||
       !block.includes('foreach my $DT (@DT)')||
       !block.includes('foreach my $idx (0..$DT->{showcasecount}-1)'))
      fail('unreviewed callback loop or return '+code);
  }
  if(!/^@@ITEM[^\r\n]*\r?\n\s*no\s+64(?:\s|#)[\s\S]*?^\s*name\s+看門機器人(?:\s|$)/m.test(itemDsl))
    fail('source robot item #64 identity changed');
  return Object.freeze({
    source:B55_SOURCE,callbackCodes:Object.freeze(['manbiki','goutou']),
    robotItem:64,robotStockIndex:63,
    runtimeMode:'internal-callback-fixture-only',
    eventGateIncluded:false,periodCommittable:false,
  });
}
/**
 * Pure source STARTFUNC effect for ONE reviewed shop.
 * Future full EVENT engine must own start gate, complete random order, log
 * and one atomic world/period commit. No automatic event is implied here.
 */
export function projectOriginalInstantEventCallback({
  reviewed,shop,eventCode,randomDraws,reviewedInventory=null,
}){
  if(reviewed?.source!==B55_SOURCE||reviewed.eventGateIncluded!==false||
     reviewed.robotItem!==64)
    fail('source-reviewed callback contract required');
  const spec=specs[eventCode];
  if(!spec)fail('unsupported source EVENT callback');
  if(reviewedInventory!==null){
    if(reviewedInventory.sale?.source!==B41_SOURCE)fail('reviewed common inventory source required');
    validateP3Inventory(shop,reviewedInventory.compiled,reviewedInventory.sale);
    const id=shop.showcase?.[0],price=shop.price?.[0];
    if(id!==0&&(!Object.hasOwn(reviewedInventory.sale.p3TurnItems.rules,id)||
       !isSourceShowcaseListedPrice(reviewedInventory.sale.p3TurnItems.rules[id].unitPrice,price)))
      fail('reviewed common single shelf required');
    if(id===0&&price!==0)fail('empty shelf price');
  }
  if(!shop||shop.id!==1||shop.status!==1||
     !Array.isArray(shop.item)||shop.item.length!==79||
     shop.item.some(v=>!Number.isSafeInteger(v)||v<0)||
     shop.item[9]>20||shop.item[10]>50||shop.item[63]>1||
     (reviewedInventory===null&&shop.item.some((v,i)=>![9,10,62,63,78].includes(i)&&v!==0))||
     shop.showcasecount!==1||!Array.isArray(shop.showcase)||
     shop.showcase.length!==1||(reviewedInventory===null&&![0,10].includes(shop.showcase[0]))||
     !Array.isArray(shop.price)||shop.price.length!==1||
     (reviewedInventory===null&&shop.showcase[0]===10&&shop.price[0]!==5000)||
     (shop.showcase[0]===0&&shop.price[0]!==0)||
     typeof shop.shopname!=='string'||!shop.shopname||
     !Number.isSafeInteger(shop.rank)||shop.rank<0||shop.rank>10000)
    fail('only reviewed single-shop stock, robot and showcase');
  if(!Array.isArray(randomDraws)||randomDraws.length<1||
    randomDraws.length>2||randomDraws.some(x=>
      !Number.isSafeInteger(x)||x<0||x>=1000000))
    fail('exact source callback rand(1000) draws required');
  let used=0;
  function randThousand(){
    if(used>=randomDraws.length)fail('missing source callback random draw');
    return randomDraws[used++]/1000;
  }
  const items=[...shop.item];
  let rank=shop.rank,message=null;
  if(!(randThousand()>spec.hit)){
    if(items[63]>0){
      if(eventCode==='manbiki'&&randThousand()>spec.break){
        message=shop.shopname+'有人企圖入室行竊，但被制止了。';
      }else{
        items[63]--;
        message=shop.shopname+(eventCode==='manbiki'?
          '有人企圖入室行竊，看門機器人被破壊了。':
          '有強盜闖入，看門機器人被破壞了。');
      }
    }else{
      if(eventCode==='goutou')rank-=Math.trunc(rank/5);
      let value=0;
      const shelfItem=shop.showcase[0];
      if(shelfItem){
        const idx=shelfItem-1;
        const count=Math.trunc(items[idx]/(eventCode==='manbiki'?10:4));
        items[idx]-=count;
        value=safe(count*shop.price[0],'original theft monetary equivalent');
      }
      message=value>0?
        shop.shopname+(eventCode==='manbiki'?
          '被偷了相當於總額':'被搶了相當於總額')+value+'的商品。':
        '闖入'+shop.shopname+(eventCode==='manbiki'?
          '的小偷什麼都沒拿就逃走了。':
          '的強盜什麼都沒拿就逃走了。');
    }
  }
  if(used!==randomDraws.length)
    fail('unused original callback random draws');
  return Object.freeze({
    source:reviewed.source,eventCode,shop:{...shop,item:items,rank},
    returnCode:0,message,randomDrawsUsed:used,
    changed:rank!==shop.rank||items.some((v,i)=>v!==shop.item[i]),
    eventPersisted:false,sourceOnlyCallback:true,
    scope:'one true original startfunc; no natural EVENT gate/hash order, other events, timer, log or complete period',
  });
}
