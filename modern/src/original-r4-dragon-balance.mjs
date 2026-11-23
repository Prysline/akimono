/**
 * R4 frozen period.cgi DragonBalance() + its original per-shop settlement.
 * Explicit single source file text, never an authorized WorldState update.
 * The Perl source really reads and deletes its sandbox payout file.
 */
export const R4_DRAGON_BALANCE_SOURCE='r4-original-period-dragon-payout-file-and-shop-ledger';
const fail=s=>{throw new RangeError('R4 original DragonBalance: '+s);};
const int=n=>Number.isSafeInteger(n);
function sourceBetween(source,start,end){
  if(typeof source!=='string')fail('frozen period source required');
  const a=source.indexOf(start),b=end?source.indexOf(end,a+start.length):source.length;
  if(a<0||b<=a)fail('original period source block missing '+start);
  return source.slice(a,b);
}
export function reviewR4DragonBalance({periodSource}){
  const fn=sourceBetween(periodSource,'sub DragonBalance\n',null);
  const shop=sourceBetween(periodSource,'#ドラゴンレース清算','#前期の情報を保存');
  for(const token of [
    'my $fn=GetPath($COMMON_DIR,"drapay-".$MYDIR);',
    'open(IN,"<:encoding(UTF-8)",$fn) or return;',
    'my @req=<IN>;',
    'chop $req[$_];',
    'my @buf=split(/\\t/,$req[$_]);',
    'next if !defined($id2idx{$buf[0]});',
    '$DT[$i]->{dragon}+=$buf[1];',
    'unlink $fn;',
  ])if(!fn.includes(token))fail('original payout source drift '+token);
  for(const token of [
    'if ($DT->{dragon})',
    'GetMoneyString($DT->{dragon})',
    '$DT->{money}+=$DT->{dragon};',
    '$DT->{drmoney}+=$DT->{dragon};',
    '$DT->{saletoday}+=$DT->{dragon} if ($DT->{dragon} > 0);',
    '$DT->{paytoday}-=$DT->{dragon} if ($DT->{dragon} < 0);',
  ])if(!shop.includes(token))fail('original shop ledger source drift '+token);
  if(periodSource.indexOf('DragonBalance();')<0||
     periodSource.indexOf('DragonBalance();')>=
     periodSource.indexOf('#ドラゴンレース清算')||
     periodSource.indexOf('#ドラゴンレース清算')>=
     periodSource.indexOf('#前期の情報を保存'))
    fail('original source payout stage must precede per-shop ledger');
  return Object.freeze({
    source:R4_DRAGON_BALANCE_SOURCE,
    committable:false,
    sourceScope:'frozen DragonBalance() file open/chop/split/id2idx/unlink then per-shop dragon revenue/payment; formatter and outer period IO not implemented',
  });
}
export function projectR4DragonBalance({
  reviewed,shops,payoutText,applyShopLedger=true,
}){
  if(reviewed?.source!==R4_DRAGON_BALANCE_SOURCE||
     reviewed.committable!==false||
     !Array.isArray(shops)||!shops.length||shops.length>100||
     !(payoutText===null||typeof payoutText==='string'&&
       payoutText.length<=5000&&
       /^(?:[1-9]\d*\t-?\d+\r?\n)*(?:[1-9]\d*\t-?\d+)?$/.test(payoutText))||
     typeof applyShopLedger!=='boolean')
    fail('source-reviewed original payout text and shops required');
  const ids=new Map(),next=shops.map((s,i)=>{
    if(!s||typeof s!=='object'||Array.isArray(s)||
       !int(s.id)||s.id<=0||ids.has(String(s.id))||
       !['money','dragon','drmoney','saletoday','paytoday'].every(k=>int(s[k])))
      fail('original shop cash and dragon values required');
    ids.set(String(s.id),i);
    return {...s};
  });
  if(payoutText!==null&&payoutText.length){
    // Original file handle reads one newline-terminated record or the final
    // non-newline record. Original 'chop' ALWAYS removes its last character,
    // even when the last line has no newline.
    const lines=payoutText.match(/[^\n]*\n|[^\n]+$/g)??[];
    for(const line of lines){
      const cut=line.slice(0,-1);
      const [key,raw]=cut.split('\t');
      if(!/^-?\d+\r?$/.test(raw??''))
        fail('unreviewed source chop without integer payout');
      const delta=Number(raw),idx=ids.get(key);
      if(!int(delta))fail('unsafe source payout amount');
      if(idx===undefined)continue;
      next[idx].dragon+=delta;
      if(!int(next[idx].dragon))fail('original payout accumulation overflow');
    }
  }
  const settled=applyShopLedger?
    projectR4DragonShopLedger({reviewed,shops:next}):null;
  return Object.freeze({
    source:reviewed.source,committable:false,
    payoutFilePresent:payoutText!==null,
    payoutFileConsumed:payoutText!==null,
    payoutFileOnly:!applyShopLedger,
    shops:settled?settled.shops:Object.freeze(next.map(x=>Object.freeze(x))),
    logs:settled?settled.logs:Object.freeze([]),
    sourceScope:reviewed.sourceScope,
  });
}

/**
 * Run the exact second source stage: per-shop dragon settlement after
 * UpdateResetBefore, before ranking/history ledger. It does NOT read
 * payout files and must not be called in lieu of DragonBalance().
 */
export function projectR4DragonShopLedger({reviewed,shops}){
  if(reviewed?.source!==R4_DRAGON_BALANCE_SOURCE||
     reviewed.committable!==false||!Array.isArray(shops)||
     !shops.length||shops.length>100)
    fail('source-reviewed original dragon shop settlement required');
  const logs=[];
  const next=shops.map(shop=>{
    if(!shop||typeof shop!=='object'||Array.isArray(shop)||
       !int(shop.id)||shop.id<1||
       !['money','dragon','drmoney','saletoday','paytoday'].every(k=>int(shop[k])))
      fail('source dragon shop money, history and id required');
    const s={...shop},n=s.dragon;
    if(n){
      logs.push([0,s.id,'ドラゴンレースの収支 '+String(n)]);
      s.money+=n;
      s.drmoney+=n;
      if(n>0)s.saletoday+=n;
      if(n<0)s.paytoday-=n;
      if(!['money','drmoney','saletoday','paytoday'].every(k=>int(s[k])))
        fail('original dragon ledger arithmetic overflow');
    }
    return Object.freeze(s);
  });
  return Object.freeze({
    source:reviewed.source,committable:false,
    shops:Object.freeze(next),
    logs:Object.freeze(logs.map(x=>Object.freeze(x))),
  });
}

