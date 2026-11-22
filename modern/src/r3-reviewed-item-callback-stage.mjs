/**
 * Reviewed R3 callback stage following original inc-turn.cgi:
 * natural sale -> FUNCTURN -> FUNCSALE -> PLUS.
 * Original #70 FUNCTURN executes even with zero holding stores, and consumes
 * rand(1) at a 60-second timespan before visiting an empty shop list.
 * Unknown or stocked callbacks fail closed; no executable Perl in Node.
 */
import {parseDsl} from './parse-dsl.mjs';
export const R3_ITEM_CALLBACK_STAGE='r3-standard-item-callbacks-source-v1';
const fail=reason=>{throw new RangeError('R3 item callbacks: '+reason);};
const one=(b,k)=>b?.fields[k]?.length===1?b.fields[k][0].value:null;
const markers=[
  '#@@item funct 処理',
  'my @itemt=sort {$a->{no}<=>$b->{no}} grep($_->{functurn},@ITEM);',
  '@item::TURN_DT=grep($_->{item}[$item->{no}-1],@DT);',
  '&$func($item,@item::TURN_DT);',
  '#@@item funcs 処理',
  'my @items=grep($_->{funcsale},@ITEM);',
  '@item::SALE_DT=grep($_->{_sale_count_}{$item->{no}},@DT);',
  "last if 'last' eq &$func($item,$DT,$_sale_count_->{count},$_sale_count_->{price});",
  'foreach(@DT){delete $_->{_sale_count_}}',
  'SortDT();',
  '#市場商品数のUP/DOWN処理',
];
export function reviewR3ItemCallbackStage({itemDsl,rebelDsl,turnSource}){
  if(typeof turnSource!=='string')fail('frozen inc-turn required');
  let before=-1;
  for(const marker of markers){
    const at=turnSource.indexOf(marker,before+1);
    if(at<=before)fail('original callback order/drift: '+marker);
    before=at;
  }
  const p=[parseDsl(itemDsl,'custom/inc-item-data.cgi'),
    parseDsl(rebelDsl,'custom/inc-rebel-data.cgi')];
  if(p.some(x=>x.issues.length))fail('original DSL parse issues');
  const blocks=p.flatMap(x=>x.blocks);
  const global=blocks.filter(b=>['FUNCTURN','FUNCSALE'].includes(b.kind));
  if(global.length)fail('unreviewed global turn/sale callback');
  const items=blocks.filter(b=>b.kind==='ITEM');
  if(items.length!==79)fail('79 original ITEM definitions required');
  const turn=items.filter(b=>b.fields.funct?.length||b.fields.functurn?.length);
  const sale=items.filter(b=>b.fields.funcs?.length||b.fields.funcsale?.length);
  if(turn.length!==1||one(turn[0],'no')!=='70'||
     one(turn[0],'code')!=='sousyoku-nayuta'||
     one(turn[0],'funct')!=='_local_'||sale.length)
    fail('original ITEM callback declarations changed');
  for(const needle of [
    'my $rankup=$TIMESPAN/86.4;',
    '$rankup=$rankup<1 && rand(1)<$rankup ? 1 : int($rankup);',
    'return if !$rankup;',
    'foreach my $DT (@DT)',
    'next if $DT->{showcase}[0]!=$ITEM->{no} || $DT->{price}[0]>$ITEM->{price};',
    '$DT->{rank}+=$rankup;',
  ])if(!turn[0].raw.includes(needle))
    fail('original ITEM #70 callback body drift');
  return Object.freeze({
    source:R3_ITEM_CALLBACK_STAGE,
    turnIds:Object.freeze([70]),saleIds:Object.freeze([]),
    firstRandomThresholdSeconds:86.4,
    itemSource:turn[0].file+':'+turn[0].startLine,
  });
}
export function projectR3ItemCallbackStage({reviewed,shop,spanSeconds,randomDraws}){
  if(reviewed?.source!==R3_ITEM_CALLBACK_STAGE||
     reviewed.turnIds?.join(',')!=='70'||
     reviewed.saleIds?.length!==0||
     reviewed.firstRandomThresholdSeconds!==86.4)
    fail('reviewed ITEM source contract absent');
  if(!shop||!Array.isArray(shop.item)||shop.item.length!==79||
     shop.item.some(x=>!Number.isSafeInteger(x)||x<0))
    fail('original shop inventory');
  if(shop.item[69]>0)fail('stocked ITEM #70 FUNCTURN not yet integrated');
  if(!Number.isSafeInteger(spanSeconds)||spanSeconds<1)
    fail('invalid original time span');
  if(!Array.isArray(randomDraws))fail('original callback random input');
  const needsRandom=spanSeconds<86.4;
  if(needsRandom&&(!Number.isSafeInteger(randomDraws[0])||
      randomDraws[0]<0||randomDraws[0]>=1000000))
    fail('missing original #70 rand(1)');
  // The original invokes #70 with no eligible shops: no state changes.
  // At 1m it still consumes a draw, shifting every later PLUS rand.
  return Object.freeze({
    source:R3_ITEM_CALLBACK_STAGE,
    itemTurnDispatched:Object.freeze([70]),
    itemTurnAffectedShops:0,itemSaleCallbackCount:0,
    drawsUsed:needsRandom?1:0,sideEffects:0,
  });
}
