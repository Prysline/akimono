const $=id=>document.getElementById(id);
const money=n=>typeof n==='number'?n.toLocaleString('zh-TW')+' G':'—';
let snapshot=null;
let currentTab='shop';
let currentGroup='self';
const tabs=[...document.querySelectorAll('[data-tab]')];
const groups=[...document.querySelectorAll('[data-group]')];
const groupNames={self:'自店',trade:'交易',info:'情報',facility:'施設',social:'交流'};
const tabNames={shop:'店內',stock:'倉庫',market:'市場'};
function updateNavigation(){
  for(const group of groups){
    const selected=group.dataset.group===currentGroup;
    group.classList.toggle('selected',selected);
    group.setAttribute('aria-pressed',String(selected));
  }
  for(const submenu of document.querySelectorAll('[data-subgroup]')){
    submenu.hidden=submenu.dataset.subgroup!==currentGroup;
  }
  for(const tab of tabs){
    const selected=tab.dataset.tab===currentTab;
    tab.classList.toggle('selected',selected);
    if(selected)tab.setAttribute('aria-current','page');
    else tab.removeAttribute('aria-current');
    $('tab-'+tab.dataset.tab).hidden=!selected;
  }
  $('tab-pending').hidden=currentTab!==null;
  if(currentTab===null){
    text('pending-title',groupNames[currentGroup]+'（尚未實作）');
  }
  text('menu-location',groupNames[currentGroup]+
    (currentTab===null?' > 尚未開放':' > '+tabNames[currentTab]));
}
function selectTab(name){
  if(!Object.hasOwn(tabNames,name))return;
  currentTab=name;
  currentGroup=name==='market'?'trade':'self';
  updateNavigation();
}
function selectGroup(name){
  if(!Object.hasOwn(groupNames,name))return;
  if(name==='self')return selectTab('shop');
  if(name==='trade')return selectTab('market');
  currentGroup=name;
  currentTab=null;
  updateNavigation();
}
tabs.forEach(tab=>tab.addEventListener('click',()=>selectTab(tab.dataset.tab)));
groups.forEach(group=>group.addEventListener('click',
  ()=>selectGroup(group.dataset.group)));
function text(id,value){$(id).textContent=String(value);}
function showState(s){
  snapshot=s;
  const w=s.world,shop=s.shop,item=s.item10;
  text('world-id',w?.worldId??'尚未建立');
  text('revision',w?.revision??'—');
  const save=s.save??{available:false,generation:0,recoveryWarning:false};
  text('save-status',save.available?
    '已有第 '+save.generation+' 代存檔'+
      (save.recoveryWarning?'（備援世代可用；有一份存檔損毀）':''):
    (save.unreadable?'存檔損毀，無可載入備援':'尚未儲存'));
  $('save-world').disabled=!w;
  $('load-world').disabled=Boolean(w)||!save.available;
  text('now',w?new Date(w.nowSeconds*1000).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'}):'—');
  const left=s.secondsUntilSettlement;
  text('settlement-status',w&&Number.isSafeInteger(left)?
    '距下次決算 '+Math.floor(left/3600)+' 小時 '+
      Math.floor((left%3600)/60)+' 分 '+left%60+' 秒（跨期尚未開放）':
    '下次決算：未開放');
  const periodState=w?.period??null;
  text('city-seed',periodState?
    '初始人口 '+periodState.dtPeople.toLocaleString('zh-TW')+
    '（發展 '+periodState.town.develop+'／治安 '+periodState.town.safety+'）':
    (w?'舊版世界（無期別城市資料）':'—'));
  text('period-count',periodState?
    periodState.settledCount+' 期（跨期尚未開放）':'—');
  text('store-name',shop?.shopname??'未開店');
  text('money',money(shop?.money));text('rank',shop?.rank??'—');
  text('time',shop?Math.max(0,w.nowSeconds-shop.time).toLocaleString('zh-TW')+' 秒':'—');
  text('showcase',shop?(shop.showcase[0]===0?'第 1 架：目前空架':
    '第 1 架：商品 #'+shop.showcase[0]+'，售價 '+money(shop.price[0])):'未開店');
  text('paid',money(shop?.paytoday));text('sales',money(shop?.saletoday));
  text('market-source',w?.market?.source??'尚未初始化');
  text('market-price',money(item?.price));text('market-count',item?.marketStock??'—');
  text('owned',item?item.owned+'／'+item.limit:'—');
  // Collapse setup once after a shop exists, but let the user reopen it.
  if(shop && !$('setup').dataset.autoClosed){
    $('setup').open=false;
    $('setup').dataset.autoClosed='yes';
  }
  $('initialize').disabled=Boolean(w);
  $('open-shop').querySelector('button[type=submit]').disabled=!w||Boolean(shop);
  $('supply').disabled=!shop;
  $('buy').disabled=!shop; // Deliberately permit empty-market click.
  $('set-showcase').disabled=!shop;
  for(const control of document.querySelectorAll('.quick-time button'))control.disabled=!shop;
  $('advance-time-form').querySelector('button[type=submit]').disabled=!shop;
  const entries=shop?[
    {id:10,name:'書本寫作工具',count:shop.item[9],origin:'原版市場進貨'},
    {id:63,name:'展示架擴建拆卸工具',count:shop.item[62],origin:'原版開店贈品'},
    {id:79,name:'禮物卷',count:shop.item[78],origin:'原版開店贈品'},
  ]:[];
  const tbody=$('inventory');tbody.replaceChildren();
  if(!entries.length){
    const tr=document.createElement('tr'),td=document.createElement('td');
    td.colSpan=3;td.textContent='請先建立世界並開店';tr.append(td);tbody.append(tr);
  }else for(const entry of entries){
    const tr=document.createElement('tr');
    for(const value of ['#'+entry.id+' '+entry.name,entry.count,entry.origin]){
      const td=document.createElement('td');td.textContent=value;tr.append(td);
    }
    tbody.append(tr);
  }
}
function feedback(message,receipt=null,failed=false){
  text('feedback',message);
  const panel=document.querySelector('.feedback');panel.classList.toggle('error',failed);
  const pre=$('receipt');
  $('receipt-details').hidden=!receipt;
  pre.hidden=!receipt;
  pre.textContent=receipt?JSON.stringify(receipt,null,2):'';
}
async function call(path,payload={},label='操作'){
  const before=snapshot;
  try{
    const res=await fetch(path,{method:'POST',
      headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
    const data=await res.json();
    if(data.state)showState(data.state);
    if(!res.ok||!data.ok){
      feedback(label+'遭拒絕：'+(data.details?.reason??data.error??data.code??'未知原因'),
        {result:data.code??'拒絕',beforeRevision:before?.world?.revision,
         afterRevision:data.state?.world?.revision,
         moneyBefore:before?.shop?.money,moneyAfter:data.state?.shop?.money,
         stockBefore:before?.shop?.item?.[9],stockAfter:data.state?.shop?.item?.[9],
         marketBefore:before?.item10?.marketStock,
         marketAfter:data.state?.item10?.marketStock},true);
      return false;
    }
    const after=data.state;
    feedback(label+'成功：世界 revision '+after.world.revision,
      {sourceReceipt:data.details,
       revision:[before?.world?.revision??null,after.world.revision],
       money:[before?.shop?.money??null,after.shop?.money??null],
       stock10:[before?.shop?.item?.[9]??null,after.shop?.item?.[9]??null],
       wholesale10:[before?.item10?.marketStock??null,after.item10?.marketStock??null]});
    return true;
  }catch(error){feedback(label+'失敗：'+error.message,null,true);return false;}
}
$('save-world').addEventListener('click',()=>call('/api/save',{
  expectedRevision:snapshot?.world?.revision,
  expectedGeneration:snapshot?.save?.generation,
},'儲存本機世界'));
$('load-world').addEventListener('click',()=>call('/api/load',{},'載入本機磁碟世界'));
$('initialize').addEventListener('click',()=>call('/api/initialize',{},'初始化來源世界'));
$('open-shop').addEventListener('submit',async e=>{
  e.preventDefault();await call('/api/open-shop',{
    expectedRevision:snapshot?.world?.revision,
    ownerName:$('owner').value,shopName:$('shop-name').value,
  },'開店');
});
$('supply').addEventListener('click',()=>call('/api/supply',{
  expectedRevision:snapshot?.world?.revision,
  timespanSeconds:Number($('supply-seconds').value),
},'原版 PLUS 供貨子步驟'));
$('showcase-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const itemId=Number($('shelf-item').value);
  await call('/api/showcase',{
    expectedRevision:snapshot?.world?.revision,
    itemId,priceOverride:itemId===10?5000:0,
  },itemId===10?'原版展示架上架 #10':'清空展示架');
});
async function advance(minutes){
  await call('/api/advance-time',{
    expectedRevision:snapshot?.world?.revision,minutes,
  },'原版自然販售／快轉 '+minutes+' 分鐘');
}
document.querySelectorAll('[data-minutes]').forEach(button=>
  button.addEventListener('click',()=>advance(Number(button.dataset.minutes))));
$('advance-time-form').addEventListener('submit',async event=>{
  event.preventDefault();
  await advance(Number($('advance-minutes').value));
});
$('buy').addEventListener('click',()=>call('/api/buy',{
  expectedRevision:snapshot?.world?.revision,
  requestedCount:Number($('quantity').value),
  marketShelf:snapshot?.item10?.shelf??0,
  expectedPrice:snapshot?.item10?.price,
},'市場進貨 #10'));
async function refresh(){
  try{const res=await fetch('/api/state',{cache:'no-store'});
    showState(await res.json());}
  catch(error){feedback('無法連線至本機 Node 服務：'+error.message,null,true);}
}
selectTab(currentTab);refresh();
