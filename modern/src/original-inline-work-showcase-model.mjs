/**
 * B-27: exactly two Standard Street inline USE bodies, reviewed in the
 * original custom/inc-item-data.cgi at item 13 (book-work) and item 63
 * (edit-showcase). Does not eval local Perl, run item::WriteLog,
 * GetMoneyString services, execute transaction, or persist.
 *
 * Returned logs are calls the original body WOULD make, not committed logs.
 * Synthetic currency prefix/suffix are passed explicitly; Core
 * GetMoneyString itself is isolated in accompanying pinned Perl test.
 */
const fail=name=>{throw new RangeError("Unrepresentable B-27 fixture: "+name);};
const integer=(x,name,min=-Number.MAX_SAFE_INTEGER,max=Number.MAX_SAFE_INTEGER)=>{
  if(typeof x!=="number"||!Number.isSafeInteger(x)||x<min||x>max)fail(name);
  return x;
};
const str=(x,name)=>{
  if(typeof x!=="string"||x.length>300)fail(name);
  return x;
};
function checked(x,name){
  if(!Number.isSafeInteger(x))fail(name);
  return x;
}
function recordLogs(rows){return Object.freeze(rows.map(row=>Object.freeze(row)));}
function freezeArray(a){return Object.freeze(a);}
function sourcePrefix(){
  return "fixed Standard Street inline USE body; synthetic in-memory data, unexecuted logging and no CGI/persistence";
}
/** Exactly original Core GetMoneyString numeric grouping for supported
 * safe integer fixtures. Terms are explicit synthetic display input.
 * Negative values retain source placement: '¥-3,000', not '-¥3,000'.
 */
export function formatOriginalMoneyFixture(value,{
  prefix="¥",suffix="",
}={}){
  integer(value,"display monetary integer");
  str(prefix,"currency prefix");str(suffix,"currency suffix");
  const txt=String(value);
  const sign=txt.startsWith("-")?"-":"";
  const unsigned=sign?txt.slice(1):txt;
  const grouped=unsigned.replace(/\B(?=(\d{3})+(?!\d))/g,",");
  return prefix+sign+grouped+suffix;
}
/**
 * Source:
 *   $DT->{money}+=$USE->{param1}*$count;
 *   my $ret=GetMoneyString($USE->{param1}*$count).'稼ぎました';
 *   WriteLog(0,$DT->{id},"バイトし、$ret");
 *   WriteLog(3,0,$DT->{shopname}."がバイトしたようです");
 *   return $ret;
 *
 * Both 1st source 'func _local_' and 2nd source 'func _local_1'
 * on item13 point to the SAME compiled _local_1 function.
 */
export function projectOriginalBookWorkCallback({
  money,param1,count,shopId,shopName,
  moneyPrefix="¥",moneySuffix="",
}){
  integer(money,"money");
  integer(param1,"param1");
  integer(count,"count");
  integer(shopId,"shopId");
  str(shopName,"shopName");
  const earned=checked(param1*count,"work payment product");
  const moneyAfter=checked(money+earned,"moneyAfter");
  const returned=formatOriginalMoneyFixture(earned,{
    prefix:moneyPrefix,suffix:moneySuffix,
  })+"稼ぎました";
  const logCalls=recordLogs([
    [0,shopId,"バイトし、"+returned],
    [3,0,shopName+"がバイトしたようです"],
  ]);
  return Object.freeze({
    callback:"book-work::_local_1",earned,moneyBefore:money,
    moneyAfter,returned,logCalls,
    sourceUseAliases:Object.freeze([1,2]),
    countsApplied:count,
    inventoryMutation:"none in inline callback body",
    timeMutation:"none in inline callback body",
    experienceMutation:"none in inline callback body",
    scope:sourcePrefix(),
  });
}
/**
 * Source:
 *   my $oldcnt=$DT->{showcasecount};
 *   my $newcnt=$USE->{param1};
 *   $DT->{showcasecount}=$newcnt;
 *   if($oldcnt<$newcnt)
 *     foreach($oldcnt..$newcnt-1) { showcase[$_]=0; price[$_]=0; }
 *   if($oldcnt>$newcnt)
 *     splice(showcase,newcnt); splice(price,newcnt);
 *   WriteLog(...); WriteLog(...); return $ret;
 *
 * All 8 source USE actions on item63 target same compiled _local_1.
 * The 1..8 newCount constraint comes from the eight source-declared
 * actions, not from an invented game-rule boundary check.
 * Missing synthetic slots represent Perl undef (JSON null).
 */
export function projectOriginalShowcaseResizeCallback({
  showcaseCount,showcase,prices,newCount,shopId,shopName,
}){
  integer(showcaseCount,"original showcaseCount",0,8);
  integer(newCount,"declared newCount",1,8);
  integer(shopId,"shopId");str(shopName,"shopName");
  if(!Array.isArray(showcase)||!Array.isArray(prices)||
     showcase.length>16||prices.length>16)fail("showcase/price array");
  const sc=showcase.map((x,i)=>x===null?null:integer(x,"showcase slot "+i));
  const pr=prices.map((x,i)=>x===null?null:integer(x,"price slot "+i));
  if(showcaseCount<newCount){
    for(let i=showcaseCount;i<newCount;i++){
      // Perl ARRAY slots created by indexing past current tail are undef.
      while(sc.length<i)sc.push(null);
      while(pr.length<i)pr.push(null);
      sc[i]=0;pr[i]=0;
    }
  }
  if(showcaseCount>newCount){
    sc.splice(newCount);pr.splice(newCount);
  }
  // Crucially no automatic normalization for equal counts, or any
  // array tail when oldCount < newCount but preexisting tail is longer.
  const returned="展示架已經改成"+newCount+"個了";
  const logCalls=recordLogs([
    [0,shopId,returned],
    [3,0,shopName+"的展示架已經變成"+newCount+"個了"],
  ]);
  return Object.freeze({
    callback:"edit-showcase::_local_1",
    showcaseCountBefore:showcaseCount,
    showcaseCountAfter:newCount,
    showcase:freezeArray(sc),prices:freezeArray(pr),
    returned,logCalls,
    sourceUseAliases:Object.freeze([1,2,3,4,5,6,7,8]),
    inventoryMutation:"none in inline callback body",
    moneyMutation:"none in inline callback body",
    timeMutation:"none in inline callback body",
    experienceMutation:"none in inline callback body",
    scope:sourcePrefix(),
  });
}
