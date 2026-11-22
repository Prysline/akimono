/**
 * B-40: source-guarded real Standard Street market purchase for ITEM #10 only.
 * Frozen Core buy-s.cgi / plug/whole.cgi / item.cgi / calc.cgi.
 * Prices, stock, time and counters are computed in StreetModule, never UI.
 * No CGI/auth, other items, guilds, callbacks, disk persistence or full turn.
 */

const fail = message => {throw new RangeError('B-40 original market purchase: '+message);};
const requireSource = (source,needle) => {
  if(typeof source!=='string'||!source.includes(needle))
    fail('frozen original source drift: '+needle);
};

export function reviewOriginalMarketBuy10({
  buySource,wholeSource,itemSource,calcSource,compilerSource,
  model,compiled,
}){
  for(const marker of [
    '$num=CheckCount($Q{num1},$Q{num2},0,$ITEM[$itemno]->{limit}-$DT->{item}[$itemno-1]);',
    '$DTS=GetWholeStore();',
    '$num=$DTS->{item}[$itemno-1] if $DTS->{item}[$itemno-1]<$num;',
    '$num=int($DT->{money}/$price) if ($DT->{money}<$num*$price && $price > 0);',
    '$TIME_SEND_ITEM=int($TIME_SEND_ITEM/2) if !$id;',
    'UseTime($usetime);',
    '$DTS->{item}[$itemno-1]-=$num;',
    '$DT->{item}[$itemno-1]+=$num;',
    '$DT->{money}-=$num*$price;',
    '$DT->{paytoday}+=$num*$price;',
    'SetWholeStore($DTS) if $id==0;',
  ]) requireSource(buySource,marker);
  for(const marker of [
    'sub GetWholeStore', 'my @wholelist=grep($DTwholestore[$_],0..$MAX_ITEM-1);',
    'sort {$sortkey[$a]<=>$sortkey[$b]} @wholelist',
    'if($ITEM->{pricehalf})', 'sub SetWholeStore',
    '$DTwholestore[$i]=$DT->{item}[$i];',
  ])requireSource(wholeSource,marker);
  for(const marker of ['sub GetTimeDeal','return int($TIME_SEND_ITEM*$mul);',
    'sub GetSaleTax'])requireSource(itemSource,marker);
  for(const marker of ['sub CheckCount','sub UseTime',
    '$DT->{time}+=$tm;'])requireSource(calcSource,marker);
  requireSource(compilerSource,'foreach(0..$#out_item){$out_item[$_]->{sort}=$_;};');
  const item=model?.items?.find(entry=>entry.id===10);
  if(!item || item.code!=='book-make'||item.name!=='書本寫作工具'||
     item.priceRaw!=='5000'||item.price!==5000||item.limitRaw!=='20/10'||
     item.plusRaw!=='20m'||item.funcbRaw!==null)fail('ITEM #10 DSL drift');
  if(model.items[0]!==item)fail('source item sort order drift');
  if(compiled?.limits?.[9]?.limit!==20||
     compiled.limits[9].wslimit!==10)fail('compiled ITEM #10 limits drift');
  return Object.freeze({
    itemId:10,itemName:item.name,unitPrice:item.price,stockLimit:20,
    wholesaleCapPerShop:10,marketTimeSeconds:600,
    source:'fixed buy-s.cgi + whole.cgi + item.cgi + calc.cgi + DSL ITEM #10',
    scope:'real original source numeric market purchase; item #10 only, single shop, no guild or item buy callback',
  });
}

// B-40 source receipt/quote review remains, while live buying is wholly GameCore.
