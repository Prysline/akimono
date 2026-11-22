/**
 * B-58 internal original market purchase for source ITEM #11 lottery tickets.
 * B-40 already audited the fixed buy-s.cgi / whole.cgi / item.cgi / calc.cgi
 * flow; this extension locks ITEM #11 identity, quantities, price and flags.
 * No HTTP/UI route, guild, auth or arbitrary item purchase support.
 */
import {parseDsl} from './parse-dsl.mjs';

export const B58_MARKET11_SOURCE='b58-original-source-market-item11-lottery-purchase';
const fail=s=>{throw new RangeError('B-58 source market ticket: '+s);};

export function reviewOriginalMarketBuy11({reviewedBuy10,model,compiled,itemDsl}){
  if(reviewedBuy10?.itemId!==10||
     reviewedBuy10.unitPrice!==5000||
     reviewedBuy10.marketTimeSeconds!==600)
    fail('fixed original B-40 purchase source prerequisite');
  const item=model?.items?.find(x=>x.id===11);
  if(item?.code!=='loto'||item.name!=='抽獎卷'||
     item.priceRaw!=='2000'||item.price!==2000||
     item.limitRaw!=='50/20'||item.plusRaw!=='10m'||
     item.flagRaw!=='noshowcase|norequest'||item.funcbRaw!==null||
     compiled?.limits?.[10]?.limit!==50||
     compiled?.limits?.[10]?.wslimit!==20)
    fail('actual ITEM #11 compiled DSL/price/limit/flag changed');
  const position=model.items.indexOf(item);
  if(position<=0||!itemDsl)fail('source sort or item DSL missing');
  const items=parseDsl(itemDsl,'custom/inc-item-data.cgi').blocks;
  const block=items.filter(x=>x.kind==='ITEM'&&
    x.fields.no?.[0]?.value==='11');
  if(block.length!==1||block[0].fields.cost?.[0]?.value!=='10'||
     block[0].fields.pop?.[0]?.value!=='0'||
     block[0].fields.pricehalf?.length||
     block[0].fields.funcbuy?.length||
     block[0].fields.funcb?.length)
    fail('ITEM #11 upkeep, nosale, or wholesale price changed');
  return Object.freeze({
    source:B58_MARKET11_SOURCE,itemId:11,
    itemName:'抽獎卷',unitPrice:2000,stockLimit:50,
    wholesaleCapPerShop:20,
    upkeepPerTicket:10,marketTimeSeconds:600,
    sourceOnly:true,position,
    scope:'genuine original ITEM #11 market stock/purchase, protected by B-40 fixed Core; no UI or general market',
  });
}
// B-58 source verification stays for lottery, all buying is common GameCore.
