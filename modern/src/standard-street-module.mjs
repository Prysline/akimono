/**
 * B-31 Standard Street MODULE, not shared GameCore rules.
 * Recognized, source-backed subset only:
 * - original Core new.cgi plus reviewed Standard Street FUNCNEW declarations
 * - original Core sc-s.cgi editShowcase behavior from B-01..B-30 models
 *
 * No market lifecycle, sales, Perl callbacks, DSL evaluation, auth, money
 * transfer, persistence, default prices for opaque DSL fields, or CGI.
 */
import {parseDsl} from './parse-dsl.mjs';
import {
  loadStandardStreetModel,
  createStandardStreetShop,
  editShowcase,
} from './standard-street-model.mjs';

export const STANDARD_STREET_ID='standard-street';
const actions=Object.freeze(['open-shop','edit-showcase']);
function bad(message){throw new RangeError('B-31 Standard Street: '+message);}
function ownKeysExact(command,required,optional=[]){
  const allowed=new Set(['kind','expectedRevision',...required,...optional]);
  for(const key of Object.keys(command)){
    if(!allowed.has(key))bad('unsupported action field '+key);
  }
  for(const key of required){
    if(!Object.hasOwn(command,key))bad('missing '+key);
  }
}
function integer(n,name,min=0){
  if(!Number.isSafeInteger(n)||n<min)bad(name);
  return n;
}
function name(v,key){
  if(typeof v!=='string'||!v.trim()||v.length>200)bad(key);
  return v;
}

/**
 * Structured SOURCE METADATA only. Item/USE/EVENT fields are raw original
 * DSL entries, NOT compiled/evaluated behaviors or executable actions.
 */
function structuralCatalog(itemDsl,rebelDsl,model){
  const blocks=[
    parseDsl(itemDsl,'custom/inc-item-data.cgi'),
    parseDsl(rebelDsl,'custom/inc-rebel-data.cgi'),
  ].flatMap(p=>p.blocks);
  const records=kind=>Object.freeze(blocks.filter(x=>x.kind===kind).map(x=>
    Object.freeze({
      kind,sourceFile:x.file,sourceLine:x.startLine,
      ownerItemLine:x.ownerItemLine,
      sourceFields:Object.freeze(Object.fromEntries(
        Object.entries(x.fields).map(([name,rows])=>[
          name,Object.freeze(rows.map(row=>Object.freeze({
            raw:row.value,line:row.line,
          }))),
        ]))),
      runtimeSupported:false,
      sourceMode:'raw-nonexecuting-dsl',
    })));
  return Object.freeze({
    items:Object.freeze(model.items.map(x=>Object.freeze({
      id:x.id,name:x.name,code:x.code,
      priceRaw:x.priceRaw,limitRaw:x.limitRaw,flagRaw:x.flagRaw,
      source:x.source,line:x.line,
      runtimeSupported:false,
    }))),
    uses:records('USE'),
    events:records('EVENT'),
  });
}

/** Only trusted locally supplied original DSL strings; no web fetch. */
export function createStandardStreetModule({itemDsl,rebelDsl}){
  if(typeof itemDsl!=='string'||typeof rebelDsl!=='string')
    bad('original DSL source text');
  const model=loadStandardStreetModel(itemDsl,rebelDsl);
  const catalog=structuralCatalog(itemDsl,rebelDsl,model);
  const metadata=Object.freeze({
    source:'custom/inc-item-data.cgi + custom/inc-rebel-data.cgi',
    compiler:'reviewed-declarative-subset; NO full Perl compiler',
    itemCount:model.items.length,
    modelSourceMode:model.sourceMode,
    opaqueCallbacks:true,
    unsupported:Object.freeze([...model.unsupported,
      'item-use', 'market sales', 'period settlement', 'multiworld runtime']),
  });
  return Object.freeze({
    id:STANDARD_STREET_ID,
    capabilities:actions,
    metadata,
    catalog,
    apply({world,command}){
      if(world.streetId!==STANDARD_STREET_ID)bad('street mismatch');
      if(command.kind==='open-shop'){
        ownKeysExact(command,['shopId','ownerName','shopName'],['icon']);
        integer(command.shopId,'shopId',1);
        name(command.ownerName,'ownerName');
        name(command.shopName,'shopName');
        if(command.icon!==undefined)integer(command.icon,'icon');
        if(world.shops.some(s=>s.id===command.shopId))bad('duplicate shop id');
        const created=createStandardStreetShop(model,{
          now:world.nowSeconds,id:command.shopId,name:command.ownerName,
          shopname:command.shopName,icon:command.icon,
        });
        return {
          shops:[...world.shops,created],
          receipt:{
            action:'open-shop',shopId:created.id,
            money:created.money,remainingTimeSeconds:world.nowSeconds-created.time,
            source:'fixed Core new.cgi + reviewed Standard Street FUNCNEW subset',
          },
        };
      }
      if(command.kind==='edit-showcase'){
        ownKeysExact(command,['shopId','shelf','itemId'],
          ['per','priceOverride']);
        integer(command.shopId,'shopId',1);
        integer(command.shelf,'shelf');
        integer(command.itemId,'itemId');
        const idx=world.shops.findIndex(s=>s.id===command.shopId);
        if(idx<0)bad('unknown shop');
        const before=world.shops[idx];
        const edited=editShowcase(model,before,{
          now:world.nowSeconds,shelf:command.shelf,
          itemId:command.itemId,per:command.per,
          priceOverride:command.priceOverride,
        });
        const shops=[...world.shops];
        shops[idx]=edited;
        return {
          shops,
          receipt:{
            action:'edit-showcase',shopId:edited.id,
            shelf:command.shelf,displayedItemId:edited.showcase[command.shelf],
            unitPrice:edited.price[command.shelf],
            timeAfterSeconds:edited.time,
            source:'fixed Core sc-s.cgi + reviewed Standard Street item projection',
          },
        };
      }
      bad('unreviewed Standard Street action '+command.kind);
    },
  });
}
