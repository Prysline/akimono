/**
 * B-26: source-faithful, in-memory numeric projection of precisely TWO
 * Standard Street @@FUNCITEM shared callback bodies:
 *   lostbook: uses Perl rand(1000); may call an external, UNEXECUTED UseItem
 *   popup: changes shop rank and requests two WriteLog calls.
 *
 * The real callback executes inside package item after CheckWholeStore and
 * before experience award. These projections are NOT general DSL callbacks,
 * nor a substitute for invoking the original UseItem, WriteLog or persistence.
 */
function invalid(name){throw new RangeError('Unrepresentable B-26 shared callback fixture '+name);}
function safe(x,name){
  if(typeof x!=='number'||!Number.isSafeInteger(x))invalid(name);
  return x;
}
function text(x,name){
  if(typeof x!=='string'||x.length>500)invalid(name);
  return x;
}
const frozen=rows=>Object.freeze(rows.map(row=>Object.freeze([...row])));
const share=o=>Object.freeze(o);

/**
 * Original "sub lostbook" in @@FUNCITEM:
 *  my $itemno=$USE->{itemno};
 *  if (rand(1000)<$USE->{param1})
 *    UseItem($itemno,1,$ITEM[$itemno]->{name}.'已經破爛到看不懂，就扔掉了。');
 *  return "";
 *
 * randomDraw must be the observed Perl rand(1000) or explicit controlled
 * synthetic draw, not claimed to be a bit-equivalent JS RNG stream.
 */
export function projectOriginalLostbook({itemId,itemName,param1,randomDraw}){
  safe(itemId,'itemId');
  text(itemName,'itemName');
  safe(param1,'param1');
  if(typeof randomDraw!=='number'||!Number.isFinite(randomDraw)||
     randomDraw<0||randomDraw>=1000)invalid('rand(1000) draw');
  const requested=randomDraw<param1;
  const externalUseItemCalls=requested?frozen([[
    itemId,1,itemName+'已經破爛到看不懂，就扔掉了。',
  ]]):Object.freeze([]);
  return share({
    callback:'lostbook',returned:'',
    randomDraw,randCalls:1,requestedExternalUseItem:requested,
    externalUseItemCalls,
    // The source calls UseItem, not a guaranteed successful inventory
    // subtraction. No stock mutation is asserted here.
    inventoryMutation:'unknown: external UseItem not executed',
    moneyMutation:'not observed in this callback body',
    timeMutation:'not observed in this callback body',
    experienceMutation:'not observed in this callback body',
    scope:'original lostbook branching and call arguments; external UseItem unexecuted',
  });
}
/**
 * Original "sub popup" in @@FUNCITEM:
 *  $up=int($USE->{param1}*(2-$DT->{rank}/5000));
 *  $DT->{rank}+=$up; cap rank at 10000 only from above.
 *  WriteLog(0,id,ret); WriteLog(3,0,shopname." ".param2); return ret.
 */
export function projectOriginalPopup({shopId,shopName,rank,param1,param2}){
  safe(shopId,'shopId');
  text(shopName,'shopName');
  safe(rank,'rank');
  safe(param1,'param1');
  text(param2,'param2');
  const x=param1*(2-rank/5000);
  if(!Number.isFinite(x)||!Number.isSafeInteger(Math.trunc(x)))
    invalid('original int(rank increase)');
  const up=Math.trunc(x);
  const adjusted=rank+up;
  if(!Number.isSafeInteger(adjusted))invalid('rank addition');
  const rankAfter=adjusted>10000?10000:adjusted;
  const msg=param2+'：人氣提升了'+Math.trunc(up/100)+'%';
  const logCalls=frozen([
    [0,shopId,msg],
    [3,0,shopName+' '+param2],
  ]);
  return share({
    callback:'popup',rankBefore:rank,rankAfter:rankAfter,up,
    returned:msg,logCalls,
    inventoryMutation:'none in callback body',
    moneyMutation:'none in callback body',
    timeMutation:'none in callback body',
    experienceMutation:'none in callback body',
    scope:'original popup numeric branch and WriteLog call arguments; no real logging or transaction',
  });
}
