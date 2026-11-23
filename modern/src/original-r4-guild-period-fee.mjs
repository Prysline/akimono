/**
 * R4 original period.cgi guild membership fee, attacker/defender attrition.
 * Source-backed call effects only. EditGuildMoney is an external IO call and
 * is NOT assumed to update durable guild files or current guild treasury.
 */
export const R4_GUILD_FEE_SOURCE='r4-frozen-period-guild-fee-and-combat-attrition';
const fail=s=>{throw new RangeError('R4 original period guild dues: '+s);};
const safe=n=>Number.isSafeInteger(n)&&n>=0;
export function reviewR4GuildFee({periodSource}){
  if(typeof periodSource!=='string')
    fail('source period code missing');
  const start=periodSource.indexOf('#ギルド会費');
  const end=periodSource.indexOf('$DT->{costyesterday}=$cost;',start);
  if(start<0||end<=start)fail('original guild dues source moved');
  const block=periodSource.slice(start,end);
  for(const marker of [
    "if($DT->{guild} ne '')",
    'my $money=int($DT->{saleyesterday}*$GUILD{$DT->{guild}}->[$GUILDIDX_feerate]/1000);',
    'EditGuildMoney($DT->{guild},$money);',
    '$DT->{money}-=$money;',
    '$GUILD_DATA{$DT->{guild}}->{atk}=int($GUILD_DATA{$DT->{guild}}->{atk} *24 /25);',
    '$GUILD_DATA{$DT->{guild}}->{def}=int($GUILD_DATA{$DT->{guild}}->{def} *9 /10);',
    '$GUILD_DATA{$DT->{guild}}->{def}+=int($money/800);',
    '$GUILD_DATA{$DT->{guild}}->{def}=1000 if ($GUILD_DATA{$DT->{guild}}->{def}>1000);',
  ])if(!block.includes(marker))
    fail('original guild period source drift '+marker);
  const phase=[
    'UpdateResetBefore() if defined(&UpdateResetBefore);',
    '#前期の情報を保存',
    '$DT->{saleyesterday}=$DT->{saletoday};',
    '#ギルド会費',
    '$DT->{costyesterday}=$cost;',
    '#爵位ポイント自然減少',
  ];
  let n=-1;
  for(const marker of phase){
    const i=periodSource.indexOf(marker,n+1);
    if(i<=n)fail('source guild bookkeeping order drift '+marker);
    n=i;
  }
  return Object.freeze({
    source:R4_GUILD_FEE_SOURCE,committable:false,
    feeDivisor:1000,attackNumerator:24,attackDenominator:25,
    defenseNumerator:9,defenseDenominator:10,defenseCap:1000,
    sourceScope:'original per-shop guild membership fee and atk/def decay, EditGuildMoney external IO represented only as an explicit call; no guild durable ledger or whole period',
  });
}
export function projectR4GuildFee({reviewed,shop,guild=null}){
  if(reviewed?.source!==R4_GUILD_FEE_SOURCE||
     reviewed.committable!==false||reviewed.feeDivisor!==1000||
     reviewed.attackNumerator!==24||reviewed.attackDenominator!==25||
     reviewed.defenseNumerator!==9||reviewed.defenseDenominator!==10||
     reviewed.defenseCap!==1000||
     !shop||typeof shop!=='object'||Array.isArray(shop)||
     typeof shop.guild!=='string'||!safe(shop.money)||
     !safe(shop.saleyesterday))
    fail('source-reviewed guild data and shop ledger required');
  if(shop.guild===''){
    if(guild!==null)fail('unreviewed guild attachment to independent shop');
    return Object.freeze({
      source:reviewed.source,committable:false,
      shop:Object.freeze({...shop}),guild:null,
      editGuildMoneyCalls:Object.freeze([]),
    });
  }
  if(!guild||typeof guild!=='object'||Array.isArray(guild)||
     Object.keys(guild).sort().join(',')!=='atk,def,feeRate,id'||
     guild.id!==shop.guild||
     !safe(guild.feeRate)||guild.feeRate>1000||
     !safe(guild.atk)||!safe(guild.def))
    fail('original source guild membership, rate and combat fields');
  const amount=Math.trunc(shop.saleyesterday*guild.feeRate/1000);
  const money=shop.money-amount;
  const atk=Math.trunc(guild.atk*24/25);
  const def=Math.min(1000,Math.trunc(guild.def*9/10)+
    Math.trunc(amount/800));
  if(!Number.isSafeInteger(amount)||!Number.isSafeInteger(money)||
     !Number.isSafeInteger(atk)||!Number.isSafeInteger(def))
    fail('original guild fee integer result overflow');
  return Object.freeze({
    source:reviewed.source,committable:false,
    shop:Object.freeze({...shop,money}),
    guild:Object.freeze({id:guild.id,feeRate:guild.feeRate,atk,def}),
    editGuildMoneyCalls:Object.freeze([
      Object.freeze({guildId:guild.id,amount}),
    ]),
    sourceScope:reviewed.sourceScope,
  });
}
