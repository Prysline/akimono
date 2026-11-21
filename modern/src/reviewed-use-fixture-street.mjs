/**
 * B-32: explicitly SYNTHETIC street harness for source-executed B-30
 * original Core UseItem -> lostbook -> item::UseItem -> experience.
 *
 * Item A/B/C are artificial B-30 Perl fixtures, NOT the 79 original
 * Standard Street items. This module is NOT a playable StreetModule.
 * It exists to verify stateful WorldState/command transactions without
 * fabricating original item DSL recipes or selling behaviors.
 */
import {createMemoryWorld,validateMemoryWorld}
  from './game-core-contract.mjs';
import {projectOriginalIntegratedUseLostbook}
  from './original-integrated-use-lostbook-model.mjs';

export const SOURCE_USE_FIXTURE_STREET_ID='source-use-fixture-b32';

function bad(msg){throw new RangeError('B-32 source fixture: '+msg);}
function safe(v,label,min=-Number.MAX_SAFE_INTEGER){
  if(!Number.isSafeInteger(v)||v<min)bad(label);
  return v;
}
function fieldsOnly(obj,fields){
  if(!obj||typeof obj!=='object'||Array.isArray(obj))bad('object');
  for(const key of Object.keys(obj))
    if(!fields.includes(key))bad('unsupported field '+key);
}
const EXACT_SHOP_KEYS=[
  'id','item','money','paytoday','time','exp','status',
];
function stockArray(a,label){
  if(!Array.isArray(a)||a.length!==3)bad(label+' three slots');
  return a.map((x,i)=>safe(x,label+' item '+i));
}
function checkShop(shop){
  fieldsOnly(shop,EXACT_SHOP_KEYS);
  safe(shop.id,'id',1);
  safe(shop.money,'money');
  safe(shop.paytoday,'paytoday');
  safe(shop.time,'time');
  safe(shop.exp,'exp');
  safe(shop.status,'status');
  if(shop.status!==0&&shop.status!==1)bad('status flag');
  stockArray(shop.item,'shop stock');
}
function checkWorld(world){
  const w=validateMemoryWorld(world);
  if(w.streetId!==SOURCE_USE_FIXTURE_STREET_ID||
     w.worldId!=='b32-synthetic-source-transactions'||w.shops.length!==2)
    bad('not reviewed synthetic WorldState');
  if(Object.keys(w.shops[0]).sort().join('|')!==
      EXACT_SHOP_KEYS.slice().sort().join('|'))bad('fixture acting shop shape');
  checkShop(w.shops[0]);
  if(w.shops[0].id!==42)bad('acting shop must be synthetic #42');
  const second=w.shops[1];
  fieldsOnly(second,['id','item']);
  if(second.id!==43)bad('other synthetic shop must be #43');
  stockArray(second.item,'other shop stock');
  if(!w.market||Object.keys(w.market).length!==1||
     !Object.hasOwn(w.market,'wholesale'))
    bad('missing synthetic wholesale');
  stockArray(w.market.wholesale,'wholesale');
  if(w.events!==null)bad('unreviewed events');
  return w;
}
export function createReviewedUseFixtureWorld(){
  return createFixtureState({
    nowSeconds:1000,
    stocks:[8,4,3],otherShopStock:[3,4,2],
    wholesale:[4,0,-5],money:70,paytoday:5,
    storedTimeSeconds:950,exp:200,status:1,
  });
}
/** Explicit artificial fixture setup (never an original Standard Street shop). */
export function createFixtureState({
  nowSeconds,stocks,otherShopStock,wholesale,money,paytoday,
  storedTimeSeconds,exp,status,
}){
  return checkWorld({
    ...createMemoryWorld({
      worldId:'b32-synthetic-source-transactions',
      streetId:SOURCE_USE_FIXTURE_STREET_ID,nowSeconds,
    }),
    shops:[
      {id:42,item:stockArray(stocks,'stocks'),money:safe(money,'money'),
        paytoday:safe(paytoday,'paytoday'),
        time:safe(storedTimeSeconds,'storedTimeSeconds'),
        exp:safe(exp,'exp'),status:safe(status,'status')},
      {id:43,item:stockArray(otherShopStock,'otherShopStock')},
    ],
    market:{wholesale:stockArray(wholesale,'wholesale')},
    events:null,
  });
}
/** Perl rand(1000) returns fractional numbers while B-31 WorldState
 * commands intentionally accept safe JSON integers. For reviewed integer
 * param1, floor(Perl rand(1000)) < param1 is EXACTLY equivalent to the
 * original strict comparison. Bucket is observed or synthetic, not JS RNG.
 */
export function createReviewedUseFixtureStreetModule(){
  return Object.freeze({
    id:SOURCE_USE_FIXTURE_STREET_ID,
    capabilities:Object.freeze(['source-fixture-use']),
    metadata:Object.freeze({
      artificialProducts:true,
      originalStreetPlayable:false,
      source:'pinned Core plug/use.cgi, calc.cgi, whole.cgi, inc-item.cgi and reviewed original lostbook',
      random:'explicit floor(observed Perl rand(1000)) or synthetic integer bucket, equivalent for integer param1 only; no JS seed equivalence',
    }),
    apply({world,command}){
      const w=checkWorld(world);
      fieldsOnly(command,[
        'kind','expectedRevision','shopId','requestedCount',
        'param1','perlRandBucket','callback',
      ]);
      if(command.kind!=='source-fixture-use')bad('unreviewed action');
      if(command.shopId!==42)bad('only reviewed synthetic acting shop 42');
      safe(command.requestedCount,'requestedCount',0);
      safe(command.param1,'param1');
      if(command.callback!==undefined&&
         command.callback!==''&&command.callback!=='lostbook')
        bad('unreviewed callback');
      safe(command.perlRandBucket,'Perl rand bucket',0);
      if(command.perlRandBucket>=1000)bad('Perl rand bucket');
      const a=w.shops[0],b=w.shops[1];
      const projected=projectOriginalIntegratedUseLostbook({
        stocks:a.item,otherShopStock:b.item,
        wholesale:w.market.wholesale,
        money:a.money,paytoday:a.paytoday,
        storedTimeSeconds:a.time,nowSeconds:w.nowSeconds,
        exp:a.exp,status:a.status,
        requestedCount:command.requestedCount,
        param1:command.param1,callback:command.callback??'lostbook',
        originalPerlDraw:command.perlRandBucket,
      });
      // Unlike the Perl source, the command layer MUST not commit a world
      // revision for an original zero-count return with no changes.
      if(projected.count===0)bad('original UseItem returned count=0');
      return {
        shops:[
          {...a,item:[...projected.stock],money:projected.money,
            paytoday:projected.paytoday,time:projected.time,exp:projected.exp},
          {...b,item:[...projected.otherShopStock]},
        ],
        market:{wholesale:[...projected.wholesale]},
        receipt:{
          action:'source-fixture-use',
          requestedCount:command.requestedCount,
          effectiveCount:projected.count,
          originalResult:projected.result,
          sourceTrace:projected.trace,
          wholesaleCheckCount:projected.wholeStoreChecks,
          expAtCallback:projected.expAtCallback,
          stockAtCallback:projected.stockAtCallback,
          perlRandBucket:command.perlRandBucket,
          sourceScope:'B-30 exact reviewed original Core synthetic A/B/C fixture only',
        },
      };
    },
  });
}
