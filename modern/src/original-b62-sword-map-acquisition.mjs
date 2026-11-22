/**
 * B-62. Original sword market has NO natural wholesale supply: ITEM #40
 * PLUS=-1h, so a fresh market cannot honestly sell #40. Source-valid path:
 * buy the genuine ITEM #14 sword-market map (PLUS=1h) through frozen
 * buy-s.cgi; execute a STRICTLY REVIEWED original #14 USE branch which
 * produces only wood swords, not phantom wholesale or unreviewed goods.
 *
 * The original USE has five probabilistic sword outputs and two callbacks.
 * B-62 accepts only the reviewed non-doubling, non-destroying map branch and
 * only wood-sword output, rejecting all other results atomically. Original
 * event / 36h / unknown item callback behavior is still fail-closed.
 */
import {parseDsl} from './parse-dsl.mjs';

export const B62_MAP_SOURCE='b62-original-real-sword-map-market-and-bounded-use';
const fail=s=>{throw new RangeError('B-62 actual sword map: '+s);};
const safe=(n,k,min=0)=>{if(!Number.isSafeInteger(n)||n<min)fail(k);return n;};
const val=(b,k)=>b?.fields?.[k]?.map(x=>x.value)??[];
const first=(b,k)=>val(b,k)[0];
const mkItemIds=[40,41,42,43,44];
const chance=[400,350,150,60,30];

export function reviewOriginalB62SwordMap({
  itemDsl,model,compiled,reviewedMarket10,
  buySource,wholeSource,calcSource,itemSource,
  compilerSource,useSource,readSource,
}){
  if(reviewedMarket10?.itemId!==10||
     reviewedMarket10.marketTimeSeconds!==600||!itemDsl)
    fail('B-40 reviewed original buy prerequisite');
  const parsed=parseDsl(itemDsl,'custom/inc-item-data.cgi');
  if(parsed.issues.length)fail('source DSL error');
  const items=parsed.blocks.filter(x=>x.kind==='ITEM');
  const map=items.find(x=>first(x,'no')==='14');
  const wood=items.find(x=>first(x,'no')==='40');
  const mapModel=model?.items?.find(x=>x.id===14);
  if(!map||!wood||!mapModel||mapModel.code!=='shiire-ken'||
     mapModel.name!=='到劍市的地圖'||mapModel.price!==10000||
     mapModel.priceRaw!=='10000'||mapModel.plusRaw!=='1h'||
     mapModel.limitRaw!=='3/3'||mapModel.flagRaw!=='noshowcase'||
     mapModel.funcbRaw!==null||
     compiled?.limits?.[13]?.limit!==3||
     compiled.limits[13].wslimit!==3||
     first(wood,'plus')!=='-1h'||first(wood,'pop')!=='3h'||
     first(wood,'price')!=='1200'||first(wood,'limit')!=='600'||
     compiled.limits[39]?.limit!==600||
     compiled.limits[39]?.wslimit!==600)
    fail('original source #14 map/#40 wood-sword item drift');
  const uses=parsed.blocks.filter(b=>b.kind==='USE'&&
    b.ownerItemLine===map.startLine);
  if(uses.length!==1)fail('original sword map USE not unique');
  const use=uses[0];
  for(const [k,expected]of [
    ['time','4h'],['exptime','2h'],['exp','2%'],['price','12000'],
    ['func','lostbook'],['param','100'],['funcb','_local_'],
    ['name','去劍的市場收購'],['action','購買'],
  ]){
    if(val(use,k).length!==1||first(use,k)!==expected)
      fail('original map USE '+k+' source drift');
  }
  if(val(use,'use').length||val(use,'get').length!==5||
     val(use,'needexp').length||val(use,'need').length||
     val(use,'needpoint').length||val(use,'needevent').length)
    fail('source map material/need/output changed');
  for(let i=0;i<5;i++){
    const n=model.items.find(x=>x.id===mkItemIds[i]);
    const tokens=val(use,'get')[i].trim().split(/\s+/);
    const expectedExtras=i===3?['秘銀劍很便宜']:
      i===4?['發現便宜的奧利哈鋼劍了!']:[];
    if(tokens?.[0]!=='10'||tokens[1]!==n.name||
       tokens[2]!==[40,35,15,6,3][i]+'%'||
       tokens.slice(3).join(' ')!==expectedExtras.join(' '))
      fail('source original map GET reward #'+n.id);
  }
  for(const [source,needle]of [
    [buySource,'$DTS=GetWholeStore();'],
    [buySource,'$DT->{item}[$itemno-1]+=$num;'],
    [buySource,'$DT->{paytoday}+=$num*$price;'],
    [wholeSource,'sub GetWholeStore'],
    [wholeSource,'sub CheckWholeStore'],
    [calcSource,'sub GetItemUseTime'],
    [calcSource,'sub UseTime'],
    [itemSource,'sub GetTimeDeal'],
    [useSource,'sub UseItem'],
    [useSource,'sub MakeAmount'],
    [useSource,'$itemcount=MakeAmount($item->{count}*$count,$item->{proba});'],
    [useSource,'CheckWholeStore();'],
    [useSource,'$USE->{result}->{function_return}=&$itemfunc();'],
    [useSource,'$DT->{exp}->{$USE->{itemno}}+=$expplus;'],
    [compilerSource,'if($2 eq \'%\'){$num*=10;}'],
    [readSource,'foreach(keys(%DTevent)){require(GetPath($ITEM_DIR,"event",$_));}'],
  ])if(typeof source!=='string'||!source.includes(needle))
    fail('original fixed Core compiler/source drift '+needle);
  // Original pre-callback doubles create counts, before source UseItem.
  if(!use.raw.includes('return 0 if rand(1000)>100;')||
     !use.raw.includes('$_->{count}*=2;')||
     !use.raw.includes('foreach(@{$USE->{result}->{create}})')||
     !use.raw.includes(
       "$USE->{result}->{message}->{resultok}='這次我們收穫的比平時多。';"))
    fail('original sword map funcb source changed');
  const position=model.items.indexOf(mapModel);
  if(position<0||!Number.isSafeInteger(position))fail('source market sort');
  return Object.freeze({
    source:B62_MAP_SOURCE,mapItemId:14,swordItemId:40,position,
    mapPrice:10000,mapStockLimit:3,mapWholesaleLimit:3,
    mapBuyTimeSeconds:600,woodPrice:1200,woodStockLimit:600,
    mapUsePrice:12000,mapUseTimeSeconds:7200,
    mapUseExp:20,callbackChance:100,
    outputs:Object.freeze(mkItemIds.map((itemId,i)=>Object.freeze({
      itemId,probabilityPermille:chance[i],count:10,
    }))),
    scope:'original map market purchase + strictly reviewed map-use branch yielding only #40, exp accounting and no callback side effects; not all source USE outcomes',
    publicGameplay:false,
  });
}
