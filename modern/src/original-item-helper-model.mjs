/**
 * B-29: source-faithful bounded projections of the FOUR exact, SHA-pinned
 * original Core inc-item.cgi helpers and their Standard Street lostbook chain.
 * No original CGI, require, filesystem state, player or world persistence.
 *
 * These count limits and finite safe integer inputs are TEST FIXTURE
 * representation constraints, NOT additional original game rules.
 */
import {projectOriginalLostbook} from './original-shared-use-callback-model.mjs';

function invalid(field){throw new RangeError('Unrepresentable B-29 item-helper fixture: '+field);}
function integer(x,name,min=-Number.MAX_SAFE_INTEGER,max=Number.MAX_SAFE_INTEGER){
  if(typeof x!=='number'||!Number.isSafeInteger(x)||x<min||x>max)invalid(name);
  return x;
}
function string(x,name){
  if(typeof x!=='string'||x.length>500)invalid(name);
  return x;
}
function cloneResult(original){
  if(original===undefined)return {};
  if(original===null||typeof original!=='object'||Array.isArray(original))
    invalid('result object');
  let o;
  try{o=structuredClone(original);}catch{invalid('result clone');}
  if(Object.getPrototypeOf(o)!==Object.prototype)invalid('result shape');
  for(const field of ['useitem','additem']){
    if(o[field]!==undefined){
      if(!Array.isArray(o[field])||o[field].length>32)invalid(field);
      for(const row of o[field]){
        if(!Array.isArray(row)||row.length!==2)invalid(field+' row');
        integer(row[0],field+' item number',1,116);
        integer(row[1],field+' count');
      }
    }
  }
  for(const field of ['usemsg','addmsg']){
    if(o[field]!==undefined){
      if(!Array.isArray(o[field])||o[field].length>32)invalid(field);
      for(const msg of o[field])string(msg,field+' message');
    }
  }
  return o;
}
function deepFreeze(o){
  if(o===null||typeof o!=='object'||Object.isFrozen(o))return o;
  for(const value of Object.values(o))deepFreeze(value);
  return Object.freeze(o);
}
/**
 * Exact source:
 * UseItemSub:
 *   $count=$DT->{item}[$itemno-1] if $DT->{item}[$itemno-1]<$count;
 *   $DT->{item}[$itemno-1]-=$count;
 * AddItemSub:
 *   $count=ITEM[itemno].limit-DT.item[itemno-1]
 *       if ITEM[itemno].limit<DT.item[itemno-1]+count;
 *   DT.item[itemno-1]+=count;
 * Wrappers ALWAYS append the adjusted count plus message to result arrays
 * and return numeric 0, even if adjusted count is zero or negative.
 */
export function projectOriginalItemHelper({
  method,itemNo,stock,count,limit=0,message='',result,
}){
  if(!['UseItem','UseItemSub','AddItem','AddItemSub'].includes(method))
    invalid('approved original method');
  integer(itemNo,'itemNo',1,116);
  integer(stock,'stock');
  integer(count,'requested count');
  integer(limit,'item limit');
  string(message,'message');
  const before=cloneResult(result);
  const isUse=method.startsWith('Use');
  const isSub=method.endsWith('Sub');
  const effective=isUse
    ?(stock<count?stock:count)
    :(limit<stock+count?limit-stock:count);
  integer(effective,'effective count');
  const next=stock+(isUse?-effective:effective);
  integer(next,'stock after helper');
  const changed=before;
  if(!isSub){
    const rows=isUse?'useitem':'additem';
    const msgs=isUse?'usemsg':'addmsg';
    // Original Perl push auto-vivifies these result fields independently.
    if(changed[rows]===undefined)changed[rows]=[];
    if(changed[msgs]===undefined)changed[msgs]=[];
    changed[rows].push([itemNo,effective]);
    changed[msgs].push(message);
  }
  return deepFreeze({
    method,itemNo,requestedCount:count,effectiveCount:effective,
    stockBefore:stock,stockAfter:next,itemLimit:isUse?null:limit,
    returned:isSub?effective:0,
    result:changed,
    // No store/money/time/experience/log operation outside these four
    // exact helper routines is part of this projection.
    scope:'four original Core inc-item.cgi helper bodies; synthetic in-memory item and result, no CGI or persistence',
  });
}
/**
 * Connect the exact Standard Street lostbook branch to its actual original
 * Core item::UseItem -> item::UseItemSub chain, instead of B-26's recording
 * stub. The draw MUST be Perl-observed or explicitly synthetic, not a
 * claim of matching RNG seeds.
 *
 * result.count is the preceding outer UseItem transaction count and is
 * untouched by this nested helper; the helper always requests count=1.
 */
export function projectOriginalLostbookWithCoreItemHelper({
  itemNo,itemName,param1,randomDraw,stock,
  result,
}){
  const call=projectOriginalLostbook({
    itemId:itemNo,itemName,param1,randomDraw,
  });
  integer(stock,'stock');
  const initial=cloneResult(result);
  const nested=call.requestedExternalUseItem
    ?projectOriginalItemHelper({
      method:'UseItem',itemNo,stock,count:1,
      message:call.externalUseItemCalls[0][2],result:initial,
    })
    :null;
  return deepFreeze({
    callback:'lostbook -> original Core item::UseItem -> UseItemSub',
    returned:call.returned,
    randomDraw,requestedNestedUse:call.requestedExternalUseItem,
    originalNestedCallArguments:call.externalUseItemCalls,
    nestedReturn:nested?.returned??null,
    nestedEffectiveCount:nested?.effectiveCount??null,
    stockBefore:stock,stockAfter:nested?.stockAfter??stock,
    result:nested?.result??initial,
    scope:'original Standard Street lostbook and two original Core helper bodies; only synthetic in-memory state; no outer transaction, CGI or persistence',
  });
}
