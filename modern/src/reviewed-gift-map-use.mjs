/**
 * B-33 reviewed REAL Standard Street rule, NOT synthetic A/B/C:
 * item #79 gift (禮物卷), first USE (zero-based #0):
 * consumes 2 gift; grants 1 item #12, #9, #14, each probability 1000.
 * Source: immutable custom/inc-item-data.cgi + frozen inc-makeitem.cgi.
 * No custom callback, no skill award, no use money, no job/event gate.
 *
 * Market data is NOT known for a real running world: this compiled rule
 * refuses WorldState.market=null, and ONLY accepts clearly marked
 * explicitly-seeded TEST wholesale data. No real market/game is claimed.
 */
import {parseDsl} from './parse-dsl.mjs';
import {compileOrderedItemLimit,compileLiteralItemLimit}
  from './item-limit-model.mjs';

const fail=s=>{throw new RangeError('B-33 reviewed gift map: '+s);};
const integer=(v,n,min=0)=>{
  if(!Number.isSafeInteger(v)||v<min)fail(n);
  return v;
};
function freeze(o){
  if(o&&typeof o==='object'&&!Object.isFrozen(o)){
    Object.values(o).forEach(freeze);Object.freeze(o);
  }
  return o;
}
const first=(block,k)=>block.fields[k]?.[0]?.value;
const checkText=(x,want,label)=>{
  if(x!==want)fail('original DSL drift '+label+': '+String(x));
};
function tokenMaterial(raw,label){
  if(typeof raw!=='string')fail(label+' source');
  const m=/^(\d+)\s+(.+?)(?:\s+(\d+%))?$/.exec(raw);
  if(!m||m[3])fail(label+' unreviewed probability or syntax');
  return {count:integer(Number(m[1]),label+' count',1),itemName:m[2]};
}
/** Source-guarded "one rule" compiler. Rejects drift and unsupported macros. */
export function compileReviewedGiftMapUse({itemDsl,rebelDsl,model}){
  if(typeof itemDsl!=='string'||typeof rebelDsl!=='string'||
     !model||!Array.isArray(model.items))fail('DSL and reviewed item model');
  const parsed=parseDsl(itemDsl,'custom/inc-item-data.cgi');
  const secondary=parseDsl(rebelDsl,'custom/inc-rebel-data.cgi');
  const items=[...parsed.blocks,...secondary.blocks].filter(x=>x.kind==='ITEM');
  if(items.length!==79||model.items.length!==79)fail('79 real items');
  const gift=items.find(x=>Number(first(x,'no'))===79);
  if(!gift)fail('gift missing');
  checkText(first(gift,'code'),'gift','item code');
  checkText(first(gift,'name'),'禮物卷','item name');
  checkText(first(gift,'limit'),'10/0','gift limit');
  const uses=parsed.blocks.filter(x=>x.kind==='USE'&&x.ownerItemLine===gift.startLine);
  if(uses.length!==5)fail('gift USE count');
  const firstUse=uses[0];
  if(!firstUse)fail('first gift USE');
  const expectedFields=['time','action','name','info','okmsg','use','get'];
  if(Object.keys(firstUse.fields).sort().join(',')!==expectedFields.sort().join(','))
    fail('first gift action fields drift or unknown callback');
  checkText(first(firstUse,'time'),'1h','use time');
  checkText(first(firstUse,'action'),'交換','action');
  checkText(first(firstUse,'name'),'交換地圖集','USE name');
  checkText(first(firstUse,'okmsg'),'感謝您的使用','source resultok');
  const define=parsed.blocks.find(x=>x.kind==='DEFINE');
  if(!define||first(define,'itemusetimerate')!=='0.5')
    fail('ItemUseTimeRate 0.5 missing');
  // Frozen compiler GetBuffer(mode=use): time=int(3600*0.5),
  // exptime initialized to same time at TIME when still zero.
  const compiledTime=Math.trunc(3600*0.5);
  const materials=firstUse.fields.use.map((row,i)=>tokenMaterial(row.value,'use '+i));
  const outputs=firstUse.fields.get.map((row,i)=>tokenMaterial(row.value,'get '+i));
  if(materials.length!==1||outputs.length!==3)fail('material/output arity');
  if(materials[0].count!==2||materials[0].itemName!=='禮物卷')
    fail('required gift count drift');
  const expectedNames=['到附近山區的地圖','到附近礦山的地圖','到劍市的地圖'];
  outputs.forEach((v,i)=>{
    if(v.count!==1||v.itemName!==expectedNames[i])
      fail('source map reward drift '+i);
  });
  const lookup=new Map(model.items.map(x=>[x.name,x.id]));
  function toAction(v){
    const id=lookup.get(v.itemName);
    if(!id)fail('unresolved source item '+v.itemName);
    return freeze({
      itemId:id,countPerUse:v.count,probabilityPermille:1000,
      originalName:v.itemName,
    });
  }
  const usesCompiled=materials.map(toAction);
  const createsCompiled=outputs.map(toAction);
  if(usesCompiled[0].itemId!==79||
     createsCompiled.map(x=>x.itemId).join(',')!=='12,9,14')
    fail('real DSL item number resolution drift');
  // All 79 current source ITEMs have one literal price and limit, with
  // PRICE preceding LIMIT. Fail closed if that ceases to hold.
  const limits=items.map(block=>{
    const id=integer(Number(first(block,'no')),'ITEM id',1);
    const priceRows=block.fields.price??[],limitRows=block.fields.limit??[];
    if(priceRows.length!==1||limitRows.length!==1)
      fail('unreviewed repeated PRICE/LIMIT at '+id);
    const modelItem=model.items.find(x=>x.id===id);
    if(!modelItem||modelItem.code!==first(block,'code'))
      fail('mismatched ITEM model '+id);
    if(!/^\d+$/.test(priceRows[0].value)||
       !/^\d+(?:\/\d+(?:\.\d+)?)?$/.test(limitRows[0].value)||
       limitRows[0].line<priceRows[0].line)
      fail('unreviewed PRICE/LIMIT syntax or order at '+id);
    // Frozen GetBuffer only installs a PRICE-based default when PRICE>0.
    // Actual ITEM #13 book-work and #63 edit-showcase have PRICE 0
    // followed by explicit LIMIT 1/1: preserve that source behavior.
    const price=Number(priceRows[0].value);
    const compiled=price===0
      ? compileLiteralItemLimit(limitRows[0].value)
      : compileOrderedItemLimit({
          price,priceLine:priceRows[0].line,
          limitRaw:limitRows[0].value,limitLine:limitRows[0].line,
        });
    return {id,code:modelItem.code,limit:compiled.limit,wslimit:compiled.wslimit};
  });
  limits.sort((a,b)=>a.id-b.id);
  if(limits.some((x,i)=>x.id!==i+1))fail('noncontiguous 79 limits');
  const sourceGiftGrant=model.grants.find(x=>x.id===79);
  if(!sourceGiftGrant||sourceGiftGrant.count!==5)
    fail('initial gift grant must be explicitly reviewed');
  for(const [i,id] of [12,9,14].entries()){
    if(limits[id-1].limit!==3||limits[id-1].wslimit!==3)
      fail('source map limit drift '+id);
  }
  return freeze({
    itemId:79,itemCode:'gift',useNo:0,name:'交換地圖集',
    time:compiledTime,exptime:compiledTime,exp:0,money:0,
    use:usesCompiled,create:createsCompiled,
    resultOk:'感謝您的使用',
    limits:limits.map(x=>freeze({code:true,limit:x.limit,wslimit:x.wslimit})),
    originalItems:freeze({gift:79,maps:[12,9,14]}),
    sourceFile:'custom/inc-item-data.cgi',sourceLine:firstUse.startLine,
    compilerSource:'frozen inc-makeitem.cgi GetBuffer/OutItemData reviewed literal subset',
    limitations:'only gift first USE with non-random outputs and no callbacks; wholesale must be explicitly seeded fixture',
  });
}
