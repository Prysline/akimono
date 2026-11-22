const $=id=>document.getElementById(id);
const money=n=>typeof n==='number'?n.toLocaleString('zh-TW')+' G':'—';
let snapshot=null;
let currentTab='shop';
let currentGroup='self';
let selectedItemId=null;
let selectedUseId=null;
let lastRenderedItemId=null;
const number=n=>Number.isSafeInteger(n)?n.toLocaleString('zh-TW'):'—';
const sourceUpkeep=raw=>{
  if(typeof raw!=='string'||!/^\d+$/.test(raw))return '—';
  const amount=Number(raw);
  return Number.isSafeInteger(amount)?money(amount):'—';
};
const timeText=seconds=>{
  const t=Math.max(0,Math.floor(seconds));
  return Math.floor(t/3600)+' 小時 '+Math.floor(t%3600/60)+' 分鐘';
};
const tabs=[...document.querySelectorAll('[data-tab]')];
const groups=[...document.querySelectorAll('[data-group]')];
const groupNames={self:'自店',trade:'交易',info:'情報',facility:'施設',social:'交流'};
const tabNames={shop:'店內',stock:'倉庫',market:'市場',
  balance:'收支',item:'商品明細',use:'操作明細','use-result':'操作結果'};
function syncStatusVisibility(){
  // The short global owner strip is redundant on the shop and balance pages.
  $('status-summary').hidden=!snapshot?.shop||
    currentTab==='shop'||currentTab==='balance';
}
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
    const selected=tab.dataset.tab===currentTab||
      (['item','use','use-result'].includes(currentTab)&&
        tab.dataset.tab==='stock');
    tab.classList.toggle('selected',selected);
    if(selected)tab.setAttribute('aria-current','page');
    else tab.removeAttribute('aria-current');
    $('tab-'+tab.dataset.tab).hidden=tab.dataset.tab!==currentTab;
  }
  $('tab-item').hidden=currentTab!=='item';
  $('tab-use').hidden=currentTab!=='use';
  $('tab-use-result').hidden=currentTab!=='use-result';
  $('tab-pending').hidden=currentTab!==null;
  if(currentTab===null){
    text('pending-title',groupNames[currentGroup]+'（尚未實作）');
  }
  if(currentTab==='item'&&snapshot)renderItemInfo(snapshot);
  if(currentTab==='use'&&snapshot)renderUseDetail(snapshot);
  text('menu-location',groupNames[currentGroup]+
    (currentTab===null?' > 尚未開放':' > '+tabNames[currentTab]));
  syncStatusVisibility();
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
const toggle=$('dev-toggle');
toggle.addEventListener('click',()=>{
  const enabled=document.body.classList.toggle('dev-mode');
  toggle.setAttribute('aria-pressed',String(enabled));
  toggle.textContent='開發工具：'+(enabled?'開':'關');
});
document.querySelectorAll('[data-go-tab]').forEach(button=>
  button.addEventListener('click',()=>selectTab(button.dataset.goTab)));
$('back-to-stock').addEventListener('click',()=>selectTab('stock'));
$('back-to-item').addEventListener('click',()=>selectTab('item'));
$('result-back-to-item').addEventListener('click',()=>selectTab('item'));
const catalogItem=(data,id)=>(data?.itemCatalog??[]).find(row=>row.itemId===id)??null;
function openItem(itemId){
  if(!Number.isSafeInteger(itemId)||itemId<1)return;
  selectedItemId=itemId;
  selectTab('item');
}
function renderItemInfo(s){
  const item=catalogItem(s,selectedItemId);
  const shop=s.shop;
  text('item-detail-name',item?.name??'請從倉庫選擇商品');
  text('item-detail-owned',shop&&item?number(shop.item[item.itemId-1]):'—');
  text('item-detail-price',item?.basePrice===null||!item?'—':money(item.basePrice));
  text('item-detail-type',item?.type??'—');
  text('item-detail-cost',sourceUpkeep(item?.costRaw));
  text('item-detail-info',item?.info??'—');
  text('item-detail-limit',item?number(item.stockLimit):'—');
  const shelf=shop?.showcase?.[0]===item?.itemId&&item?
    '第 1 架（售價 '+money(shop.price[0])+'）':'未陳列';
  text('item-detail-shelf',item?shelf:'—');
  const sourceShelves=s.showcaseOffers??[];
  const shelfSelect=$('shelf-item');
  const previous=Number(shelfSelect.value);
  const newlyOpened=lastRenderedItemId!==selectedItemId;
  lastRenderedItemId=selectedItemId;
  shelfSelect.replaceChildren();
  const empty=document.createElement('option');
  empty.value='0';empty.textContent='清空展示架';
  shelfSelect.append(empty);
  const offer=sourceShelves.find(x=>x.itemId===selectedItemId);
  if(offer){
    const option=document.createElement('option');
    option.value=String(offer.itemId);
    option.textContent=offer.name+'（原價 '+money(offer.unitPrice)+'）';
    option.disabled=!offer.canShow;
    shelfSelect.append(option);
  }
  shelfSelect.value=offer?.canShow?
    (newlyOpened?String(offer.itemId):
      previous===0?'0':String(offer.itemId)):'0';
  const canEdit=Boolean(item&&shop&&(offer||shop.showcase?.[0]===selectedItemId));
  $('showcase-form').hidden=!canEdit;
  $('set-showcase').disabled=!shop||!canEdit;
  const useList=$('use-offers');
  useList.replaceChildren();
  const useOffers=(s.useOffers??[]).filter(row=>row.itemId===selectedItemId);
  if(!useOffers.length){
    const li=document.createElement('li');
    li.textContent='此商品目前沒有可執行的使用或製作方式';
    useList.append(li);
    return;
  }
  for(const row of useOffers){
    const li=document.createElement('li');
    if(row.canUse){
      const button=document.createElement('button');
      button.type='button';button.className='text-link use-action-link';
      button.dataset.openUse=String(row.useId);
      button.dataset.useItem=String(row.itemId);
      button.textContent=row.useName+(row.firstUseOnly?'（限首次）':'');
      li.append(button);
    }else{
      const label=document.createElement('span');
      label.className='use-unavailable';
      label.textContent=row.useName+(row.firstUseOnly?'（限首次）':'');
      li.append(label);
      const reason=document.createElement('small');
      reason.className='muted';
      reason.textContent='（'+(row.reason??'目前不可執行')+'）';
      li.append(reason);
    }
    useList.append(li);
  }
}
$('use-offers').addEventListener('click',event=>{
  const button=event.target.closest('button[data-open-use]');
  if(!button||button.disabled)return;
  const itemId=Number(button.dataset.useItem);
  const useId=Number(button.dataset.openUse);
  const offer=snapshot?.useOffers?.find(row=>
    row.itemId===itemId&&row.useId===useId);
  if(!offer?.canUse||selectedItemId!==itemId)return;
  selectedUseId=useId;
  $('use-count').value='1';
  selectTab('use');
});
function renderUseDetail(s){
  const offer=(s.useOffers??[]).find(row=>
    row.itemId===selectedItemId&&row.useId===selectedUseId);
  const catalog=s.itemCatalog??[];
  const nameFor=id=>catalog.find(row=>row.itemId===id)?.name??'商品 #'+id;
  text('use-detail-name',offer?.useName??'請返回商品明細選擇操作');
  text('use-detail-item',offer?nameFor(offer.itemId):'—');
  text('use-detail-owned',offer?number(offer.owned):'—');
  text('use-detail-materials',offer?
    (offer.materials?.length?offer.materials.map(row=>
      nameFor(row.itemId)+' × '+number(row.count)+'（持有 '+
      number(s.shop?.item?.[row.itemId-1])+ '）').join('、'):'不需材料'):'—');
  text('use-detail-money',offer?money(offer.moneyPerUse):'—');
  text('use-detail-time',offer?timeText(offer.timePerUseSeconds):'—');
  text('use-detail-limit',offer?
    (offer.firstUseOnly?'僅限首次使用':'可選擇執行次數'):'—');
  const form=$('use-action-form');
  form.hidden=!offer;
  const count=$('use-count');
  count.max=offer?.firstUseOnly?'1':'';
  if(offer?.firstUseOnly)count.value='1';
  $('perform-use').disabled=!offer?.canUse;
  text('use-detail-note',!offer?'沒有可執行的操作':
    offer.canUse?'執行前請確認材料、資金與可用行動時間。':
      (offer.reason??'目前無法執行'));
}
function renderUseResult(data,offer,catalog){
  const nameFor=id=>catalog.find(row=>row.itemId===id)?.name??'商品 #'+id;
  const tuples=rows=>(Array.isArray(rows)?rows:[])
    .filter(row=>Array.isArray(row)&&row.length>=2&&row[1]>0)
    .map(([id,count])=>nameFor(id)+' × '+number(count)).join('、')||'無';
  text('use-result-name',offer.useName);
  text('use-result-count',number(data.effectiveCount));
  text('use-result-money',money(data.moneySpent));
  text('use-result-time',timeText(data.timeSpentSeconds));
  text('use-result-consumed',tuples(data.originalUseItem));
  text('use-result-acquired',tuples(data.originalAddItem));
  text('use-result-message',data.originalResultOk??'操作已完成。');
}
$('inventory').addEventListener('click',event=>{
  const button=event.target.closest('[data-open-item]');
  if(button)openItem(Number(button.dataset.openItem));
});
$('storage-inventory').addEventListener('click',event=>{
  const button=event.target.closest('[data-open-item]');
  if(button)openItem(Number(button.dataset.openItem));
});
function showState(s){
  snapshot=s;
  const w=s.world,shop=s.shop,offers=s.marketOffers??[];
  const catalog=s.itemCatalog??[];
  text('world-id',w?.worldId??'尚未建立');
  text('revision',w?.revision??'—');
  const save=s.save??{available:false,generation:0,recoveryWarning:false};
  text('save-status',save.available?
    (save.recoveryWarning?'已有存檔（備援需要檢查）':'已有存檔'):
    (save.unreadable?'存檔無法載入':'尚未儲存'));
  text('save-generation',number(save.generation));
  $('save-world').disabled=!w;
  $('load-world').disabled=Boolean(w)||!save.available;
  $('reset-world').disabled=!w&&!save.available&&!save.unreadable;
  text('now',w?new Date(w.nowSeconds*1000).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'}):'—');
  const left=s.secondsUntilSettlement;
  text('settlement-status',w?'決算功能尚未開放':'');
  const periodState=w?.period??null;
  text('city-seed',periodState?
    '初始人口 '+periodState.dtPeople.toLocaleString('zh-TW')+
    '（發展 '+periodState.town.develop+'／治安 '+periodState.town.safety+'）':
    (w?'舊版世界（無期別城市資料）':'—'));
  text('period-count',periodState?
    periodState.settledCount+' 期（跨期尚未開放）':'—');
  const evDefs=s.eventDefinitionStatus;
  const eventDefinitionLabel=evDefs?
    '原版 '+evDefs.declared+' 個事件宣告，'+
      evDefs.compilerIncluded+' 個由編譯器納入；效果尚未移植。':'';
  text('event-state',(!periodState?'舊版世界／尚未取得事件資料':
    periodState.eventState===null?
      '未知：時間推進後尚未實作原版 EVENT 回呼':
      '來源新建世界：目前事件清單為空（尚未開始事件時間片）')+
    (eventDefinitionLabel?' '+eventDefinitionLabel:''));
  text('store-name',shop?.shopname??'未開店');
  text('owner-name',shop?.name??'—');
  text('shop-title','店內');
  text('shop-info-name',shop?.shopname??'尚未開店');
  text('shop-info-money',money(shop?.money));
  text('money',money(shop?.money));
  text('rank',number(s.shopSummary?.rankPosition));
  text('shop-points',number(s.shopSummary?.point));
  const actionSeconds=shop?w.nowSeconds-shop.time:null;
  const actionTime=actionSeconds===null?'—':
    actionSeconds<0?'距可行動還有 '+timeText(-actionSeconds):
      timeText(Math.min(actionSeconds,72*3600));
  text('time',actionTime);
  text('shop-info-time',actionTime);
  text('shop-info-popularity',Number.isSafeInteger(shop?.rank)?
    Math.trunc(shop.rank/100)+'%':'—');
  const shelfId=shop?.showcase?.[0]??0;
  const hasShelf=Boolean(shop&&shelfId>0);
  const shelfItem=hasShelf?catalog.find(row=>row.itemId===shelfId):null;
  text('showcase',hasShelf?shelfItem?.name??'商品 #'+shelfId:'目前空架');
  text('shop-shelf-price',hasShelf?money(shop.price[0]):'—');
  text('shop-shelf-base-price',hasShelf?money(shelfItem?.basePrice):'—');
  text('shop-shelf-stock',hasShelf?number(shop.item[shelfId-1]):'—');
  text('shop-shelf-today',hasShelf?number(shop.itemtoday?.[shelfId]??0):'—');
  text('shop-shelf-yesterday',hasShelf&&w?.period?.settledCount>0?
    number(shop.itemyesterday?.[shelfId]??0):'—');
  text('paid',money(shop?.paytoday));
  text('sales',money(shop?.saletoday));
  text('shop-paid',money(shop?.paytoday));
  text('shop-sales',money(shop?.saletoday));
  text('balance-name',shop?.shopname??'—');
  text('balance-owner',shop?.name??'—');
  text('balance-money',money(shop?.money));
  text('balance-time',actionTime);
  text('balance-popularity',Number.isSafeInteger(shop?.rank)?
    Math.trunc(shop.rank/100)+'%':'—');
  text('balance-founded',shop?.foundation!==undefined?
    new Date(shop.foundation*1000).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'}):'—');
  text('balance-cost',money(shop?.costtoday));
  text('balance-tax',money(shop?.taxtoday));
  const hasPriorPeriod=Boolean(w?.period?.settledCount>0);
  text('balance-prev-sales',hasPriorPeriod?money(shop?.saleyesterday):'尚未決算');
  text('balance-prev-paid',hasPriorPeriod?money(shop?.payyesterday):'尚未決算');
  text('market-source',w?.market?.source??'尚未初始化');
  // Prices, shelf and eligibility are derived from the same Registry used by
  // HTTP/GameCore, never a browser-side copied item whitelist.
  const marketBody=$('market-offers');
  marketBody.replaceChildren();
  if(!offers.length){
    const tr=document.createElement('tr'),td=document.createElement('td');
    td.colSpan=5;td.textContent=w?'目前市場沒有商品':'請先建立商店或載入存檔';
    tr.append(td);marketBody.append(tr);
  }else for(const offer of offers){
    const tr=document.createElement('tr');
    tr.dataset.marketItemId=String(offer.itemId);
    const cell=value=>{
      const td=document.createElement('td');
      td.textContent=String(value);tr.append(td);
      return td;
    };
    cell(offer.name);
    cell(offer.price===null?'—':money(offer.price));
    cell(offer.marketStock);
    cell(offer.owned+'／'+offer.limit);
    const tdAction=document.createElement('td');
    const actions=document.createElement('div');
    actions.className='market-actions';
    const count=document.createElement('input');
    count.type='number';count.min='1';count.step='1';count.value='1';
    count.setAttribute('aria-label','#'+offer.itemId+' 購買數量');
    count.dataset.marketCount=String(offer.itemId);
    count.disabled=!offer.canBuy;
    const button=document.createElement('button');
    button.type='button';button.className='primary';
    button.dataset.marketBuy=String(offer.itemId);
    button.textContent=offer.canBuy?'購買':offer.reason?'不支援':'暫不可買';
    button.disabled=!offer.canBuy;
    button.title=offer.reason??(offer.marketStock===0?'市場缺貨':
      !shop?'請先開店':'來源市場或持有上限暫不可交易');
    actions.append(count,button);tdAction.append(actions);tr.append(tdAction);
    marketBody.append(tr);
  }
  // Only the selected item's verified USE actions appear in item details.
  // No action is simulated in the browser.
  text('use-boundary','僅支援來源已審閱 #79 禮物卷交換及 #14 劍市地圖首次使用；未審閱回呼、二次使用及未知事件會拒絕。');
  text('market-boundary',
    '只顯示原版市場當下實際有貨的商品，依來源宣告順序及即時市價排列；未審閱效果仍拒絕交易。');
  $('setup').hidden=Boolean(shop);
  if(!shop)$('setup').open=true;
  $('initialize').disabled=Boolean(w);
  $('open-shop').querySelector('button[type=submit]').disabled=!w||Boolean(shop);
  $('supply').disabled=!shop;
  // Available actions are rendered in the selected original-style item page.
  for(const control of document.querySelectorAll('.quick-time button'))control.disabled=!shop;
  $('advance-time-form').querySelector('button[type=submit]').disabled=!shop;
  const entries=shop?catalog.filter(item=>shop.item[item.itemId-1]>0)
    .map(item=>({...item,count:shop.item[item.itemId-1]})):[];
  const storageBody=$('storage-inventory'),sellingBody=$('inventory');
  storageBody.replaceChildren();sellingBody.replaceChildren();
  const addEmpty=(body,colspan,message)=>{
    const tr=document.createElement('tr'),td=document.createElement('td');
    td.colSpan=colspan;td.textContent=message;tr.append(td);body.append(tr);
  };
  const addName=(tr,item)=>{
    const td=document.createElement('td');
    const link=document.createElement('button');
    link.type='button';link.className='text-link item-link';
    link.dataset.openItem=String(item.itemId);
    link.textContent=item.name;
    td.append(link);tr.append(td);
  };
  const storage=entries.filter(item=>item.flagRaw.includes('s'));
  const selling=entries.filter(item=>!item.flagRaw.includes('s'));
  if(!storage.length)addEmpty(storageBody,4,'目前沒有保管商品');
  for(const item of storage){
    const tr=document.createElement('tr');
    addName(tr,item);
    for(const value of [money(item.basePrice),
      sourceUpkeep(item.costRaw),number(item.count)]){
      const td=document.createElement('td');
      td.textContent=value;tr.append(td);
    }
    storageBody.append(tr);
  }
  if(!selling.length)addEmpty(sellingBody,5,'目前沒有販售商品');
  for(const item of selling){
    const tr=document.createElement('tr');addName(tr,item);
    const values=[money(item.basePrice),sourceUpkeep(item.costRaw),
      number(item.count)+'／'+number(item.stockLimit),
      shop.showcase?.[0]===item.itemId?'第 1 架｜'+money(shop.price[0]):'—'];
    for(const value of values){
      const td=document.createElement('td');td.textContent=value;tr.append(td);
    }
    sellingBody.append(tr);
  }
  renderItemInfo(s);
  syncStatusVisibility();
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
         sourceReceipt:data.details??null},true);
      return false;
    }
    const after=data.state;
    feedback(label+'完成。',
      {sourceReceipt:data.details,
       revision:[before?.world?.revision??null,after.world.revision],
       money:[before?.shop?.money??null,after.shop?.money??null],
       paid:[before?.shop?.paytoday??null,after.shop?.paytoday??null]});
    return true;
  }catch(error){feedback(label+'失敗：'+error.message,null,true);return false;}
}
$('save-world').addEventListener('click',()=>call('/api/save',{
  expectedRevision:snapshot?.world?.revision,
  expectedGeneration:snapshot?.save?.generation,
},'儲存本機世界'));
$('load-world').addEventListener('click',()=>call('/api/load',{},'載入本機磁碟世界'));
$('reset-world').addEventListener('click',async()=>{
  const before=snapshot;
  if(!before?.world&&!before?.save?.available&&!before?.save?.unreadable)return;
  if(!window.confirm('確定要刪除目前店家及整個測試世界嗎？\n'+
    '兩份本機磁碟存檔也會刪除，無法復原。'))return;
  const button=$('reset-world');
  button.disabled=true;
  try{
    const res=await fetch('/api/reset',{method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({
        confirm:'RESET_LOCAL_TEST_WORLD',
        expectedWorldId:before.world?.worldId??null,
        expectedRevision:before.world?.revision??null,
        expectedGeneration:before.save?.generation??0,
      }),
    });
    const data=await res.json();
    if(data.state)showState(data.state);
    if(!res.ok||!data.ok){
      feedback('重置遭拒絕：'+(data.error??data.code??'未知原因'),null,true);
      return;
    }
    selectedItemId=null;
    lastRenderedItemId=null;
    $('setup').open=true;
    selectTab('shop');
    feedback('已重置測試世界（清除 '+data.details.deletedSlots.length+
      ' 份磁碟存檔）。可以重新初始化世界並開店。');
  }catch(error){
    feedback('重置失敗：'+error.message,null,true);
  }finally{
    button.disabled=!snapshot?.world&&!snapshot?.save?.available&&
      !snapshot?.save?.unreadable;
  }
});
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
    itemId,per:Number($('shelf-price-per').value),
  },itemId===0?'清空展示架':'原版來源共用展示架上架 #'+itemId);
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
$('market-offers').addEventListener('click',event=>{
  const button=event.target.closest('button[data-market-buy]');
  if(!button||button.disabled)return;
  const itemId=Number(button.dataset.marketBuy);
  const offer=snapshot?.marketOffers?.find(row=>row.itemId===itemId);
  if(!offer||!offer.canBuy)return;
  const input=button.closest('tr')?.querySelector('input[data-market-count]');
  call('/api/buy',{
    expectedRevision:snapshot.world.revision,itemId,
    requestedCount:Number(input?.value),
    marketShelf:offer.shelf,expectedPrice:offer.price,
  },'來源市場進貨 #'+itemId+' '+offer.name);
});
$('use-offers').addEventListener('click',event=>{
  const button=event.target.closest('button[data-use-item]');
  if(!button||button.disabled)return;
  const itemId=Number(button.dataset.useItem);
  const useId=Number(button.dataset.useId);
  const offer=snapshot?.useOffers?.find(row=>
    row.itemId===itemId&&row.useId===useId);
  if(!offer||!offer.canUse)return;
  const input=button.closest('tr')?.querySelector('input[data-use-count]');
  call('/api/use',{
    expectedRevision:snapshot.world.revision,itemId,useId,
    requestedCount:Number(input?.value),
  },'原版共用 USE #'+itemId+' '+offer.useName);
});
async function refresh(){
  try{const res=await fetch('/api/state',{cache:'no-store'});
    showState(await res.json());}
  catch(error){feedback('無法連線至本機 Node 服務：'+error.message,null,true);}
}
selectTab(currentTab);refresh();
