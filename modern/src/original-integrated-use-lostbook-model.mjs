/**
 * B-30: source-ordered, explicitly bounded SYNTHETIC transaction:
 * SHA-pinned plug/use.cgi::UseItem + MakeAmount + calc/whole Core routines,
 * the reviewed Standard Street lostbook callback, the TRUE original Core
 * item::UseItem / item::UseItemSub helper, then the original experience tail.
 *
 * B-23 supplies original preflight, accounting and one wholesale pass.
 * B-29 supplies reviewed nested helper behavior. This module only supports
 * the inspected one-item experience tail with no total-exp overflow and
 * deterministic material probabilities 0/1000; it NEVER runs an unknown
 * callback, full CGI, world writes or Perl on the Node-side path.
 */
import {projectOriginalUseTransaction} from './original-use-transaction-model.mjs';
import {projectOriginalLostbookWithCoreItemHelper}
  from './original-item-helper-model.mjs';

function fail(s){throw new RangeError('Unrepresentable B-30 integrated fixture '+s);}
function safe(n,name){
  if(typeof n!=='number'||!Number.isSafeInteger(n))fail(name);
  return n;
}
function deepFreeze(o){
  if(o===null||typeof o!=='object'||Object.isFrozen(o))return o;
  for(const v of Object.values(o))deepFreeze(v);
  return Object.freeze(o);
}
const keys=new Set([
  'initialStock','money','status','exp','param1','callback','seed',
  'expPerUse','needExp','experienceOld','requestedCount','emptyActions',
  'duplicateMaterials','originalPerlDraw',
  'stocks','otherShopStock','wholesale','storedTimeSeconds','paytoday','nowSeconds',
]);
const allowedDefaults=Object.freeze({
  initialStock:8,money:70,status:1,exp:200,param1:1000,
  callback:'lostbook',seed:12,expPerUse:30,needExp:100,
  requestedCount:4,emptyActions:false,duplicateMaterials:false,
  storedTimeSeconds:950,paytoday:5,nowSeconds:1000,
});
/** A fixed fixture based on source-executed B-23/B-24 scenarios.
 * "originalPerlDraw" must come from an observed Perl rand(1000), or a
 * deliberately controlled synthetic draw. "seed" is metadata only.
 */
export function projectOriginalIntegratedUseLostbook(input){
  if(!input||typeof input!=='object'||Array.isArray(input))fail('input');
  for(const key of Object.keys(input))if(!keys.has(key))fail('unknown '+key);
  const o={...allowedDefaults,...input};
  for(const key of [
    'initialStock','money','status','exp','param1','seed',
    'expPerUse','needExp','requestedCount',
    'storedTimeSeconds','paytoday','nowSeconds',
  ])safe(o[key],key);
  if(o.status!==0&&o.status!==1)fail('status fixture');
  if(o.callback!=='lostbook'&&o.callback!=='')fail('unreviewed callback');
  if(typeof o.emptyActions!=='boolean'||typeof o.duplicateMaterials!=='boolean'||
    (o.emptyActions&&o.duplicateMaterials))fail('action choice');
  if(o.experienceOld!==undefined&&o.experienceOld!=='')
    safe(o.experienceOld,'experienceOld');
  function threeSlots(value,field,defaults){
    const row=value===undefined?defaults:value;
    if(!Array.isArray(row)||row.length!==3)fail(field+' three stock slots');
    return row.map((x,i)=>safe(x,field+'['+i+']'));
  }
  const startingStocks=threeSlots(o.stocks,'stocks',[o.initialStock,4,3]);
  const otherShopStock=threeSlots(o.otherShopStock,'otherShopStock',[3,4,2]);
  const wholesale=threeSlots(o.wholesale,'wholesale',[4,0,-5]);
  const draw=o.originalPerlDraw;
  if(typeof draw!=='number'||!Number.isFinite(draw)||draw<0||draw>=1000)
    fail('observed original Perl draw');
  // In source fixture every selected/created material is deterministic:
  // MakeAmount(prob 0 or 1000) never advances RNG before lostbook.
  const uses=o.emptyActions?[]:o.duplicateMaterials?[
    {itemId:1,countPerUse:6,probabilityPermille:1000},
    {itemId:1,countPerUse:6,probabilityPermille:1000},
  ]:[
    {itemId:1,countPerUse:2,probabilityPermille:1000},
    {itemId:2,countPerUse:1,probabilityPermille:0},
  ];
  const creates=o.emptyActions||o.duplicateMaterials?[]:[
    {itemId:1,countPerUse:5,probabilityPermille:1000},
    {itemId:2,countPerUse:4,probabilityPermille:1000},
    {itemId:1,countPerUse:2,probabilityPermille:1000},
    {itemId:3,countPerUse:2,probabilityPermille:1000},
  ];
  const useMessages=o.duplicateMaterials?
    ['consume six A','consume six A again']:
    ['consume A','consume B 0'];
  const createMessages=['create A','create B','create A again','create C'];
  const shopExp=o.exp;
  const expold=o.experienceOld===undefined?'':o.experienceOld;
  const transaction=projectOriginalUseTransaction({
    shops:[startingStocks,otherShopStock],actingShopIndex:0,
    items:[
      {code:true,limit:10,wslimit:8},
      {code:true,limit:6,wslimit:-10},
      {code:false,limit:5,wslimit:1},
    ],
    wholesale,uses,creates,
    requestedCount:o.requestedCount,
    experience:shopExp,needExperience:o.needExp,
    experienceOld:expold===''?null:expold,
    job:'worker',needJob:'worker',point:10,needPoint:10,
    rank:20,needPopularity:10,needsEvent:true,eventActive:true,
    money:o.money,costPerUse:20,paytoday:o.paytoday,nowSeconds:o.nowSeconds,
    storedTimeSeconds:o.storedTimeSeconds,baseUseTimeSeconds:20,
    trainedUseTimeSeconds:10,maxStockTimeSeconds:259200,
    shopStatus:!!o.status,
  });
  const steps=[];
  let stocks=[...transaction.shops[0]];
  let exp=shopExp;
  const result={
    count:transaction.count,function_return:null,expold,
    useitem:null,usemsg:null,additem:null,addmsg:null,
  };
  let expAtCallback=null,stockAtCallback=null,wholesaleAtCallback=[];
  let nested=null;
  if(transaction.performed){
    steps.push('use-time');
    result.useitem=[];
    result.additem=[];
    // Original UseItem initializes useitem/additem, but only autovivifies
    // usemsg/addmsg after actual nonzero material/production entries.
    const consumed=transaction.multiItem.samples.filter(s=>s.phase==='consume');
    const created=transaction.multiItem.samples.filter(s=>s.phase==='create');
    for(let i=0;i<consumed.length;i++){
      const sample=consumed[i];
      if(!sample.amount)continue;
      result.useitem.push([sample.itemId,sample.amount]);
      (result.usemsg??=[]).push(useMessages[i]);
    }
    for(let i=0;i<created.length;i++){
      const sample=created[i];
      if(!sample.amount)continue;
      // B-22 correctly returns the RETAINED amount after the cap, not the
      // MakeAmount draw, in "added" source-order rows.
      const actual=transaction.multiItem.added[
        result.additem.length].amount;
      result.additem.push([sample.itemId,actual]);
      (result.addmsg??=[]).push(createMessages[i]);
    }
    steps.push('wholesale','require-common');
    if(o.callback==='lostbook'){
      steps.push('lostbook');
      expAtCallback=exp;
      stockAtCallback=stocks[0];
      wholesaleAtCallback=[...transaction.wholesale];
      nested=projectOriginalLostbookWithCoreItemHelper({
        itemNo:1,itemName:'A',param1:o.param1,
        randomDraw:draw,stock:stocks[0],
        result:Object.fromEntries(
          Object.entries(result).filter(([,value])=>value!==null)),
      });
      stocks[0]=nested.stockAfter;
      // The helper can autovivify usemsg when there were no materials.
      result.useitem=nested.result.useitem??null;
      result.usemsg=nested.result.usemsg??null;
      result.additem=nested.result.additem??null;
      result.addmsg=nested.result.addmsg??null;
      result.function_return=nested.returned;
    }
    // Source exp tail is AFTER callback. The B-30 bounded fixture has a
    // single experience entry and explicitly refuses total-exp overflow.
    if(o.expPerUse){
      result.expold=shopExp;
      const raw=o.expPerUse*transaction.count;
      if(!Number.isSafeInteger(raw))fail('experience multiply');
      let gained=raw;
      if(shopExp+gained>1000)gained=1000-shopExp;
      exp=shopExp+gained;
      if(!Number.isSafeInteger(exp)||exp>3600)
        fail('unreviewed experience overflow');
    }
  }
  return deepFreeze({
    stock:stocks,otherShopStock:[...transaction.shops[1]],
    wholesale:[...transaction.wholesale],money:transaction.money,
    paytoday:transaction.paytoday,time:transaction.storedTimeSeconds,
    exp,expAtCallback,stockAtCallback,wholesaleAtCallback,
    result,trace:steps,originalPerlDraw:draw,
    count:transaction.count,requestedCount:o.requestedCount,
    wholeStoreChecks:transaction.wholeStoreChecks,
    callbackRandomDraws:transaction.performed&&o.callback==='lostbook'?1:0,
    nestedUse:nested?{
      triggered:nested.requestedNestedUse,
      effectiveCount:nested.nestedEffectiveCount,
      returned:nested.nestedReturn,
    }:null,
    scope:'source-ordered synthetic UseItem then original lostbook/Core nested helper then one-entry experience tail; no real CGI, callbacks beyond lostbook, persistence or real world',
  });
}
