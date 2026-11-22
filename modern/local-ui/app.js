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
  const w=s.world,shop=s.shop,offers=s.marketOffers??[];
  const catalog=s.itemCatalog??[];
  text('world-id',w?.worldId??'尚未建立');
  text('revision',w?.revision??'—');
  const save=s.save??{available:false,generation:0,recoveryWarning:false};
  text('save-status',save.available?
    '已有第 '+save.generation+' 代存檔'+
      (save.recoveryWarning?'（備援世代可用；有一份存檔損毀）':''):
    (save.unreadable?'存檔損毀，無可載入備援':'尚未儲存'));
  $('save-world').disabled=!w;
  $('load-world').disabled=Boolean(w)||!save.available;
  $('reset-world').disabled=!w&&!save.available&&!save.unreadable;
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
  text('money',money(shop?.money));text('rank',shop?.rank??'—');
  text('time',shop?Math.max(0,w.nowSeconds-shop.time).toLocaleString('zh-TW')+' 秒':'—');
  text('showcase',shop?(shop.showcase[0]===0?'第 1 架：目前空架':
    '第 1 架：商品 #'+shop.showcase[0]+'，售價 '+money(shop.price[0])):'未開店');
  text('paid',money(shop?.paytoday));text('sales',money(shop?.saletoday));
  text('market-source',w?.market?.source??'尚未初始化');
  // Prices, shelf and eligibility are derived from the same Registry used by
  // HTTP/GameCore, never a browser-side copied item whitelist.
  const marketBody=$('market-offers');
  marketBody.replaceChildren();
  if(!offers.length){
    const tr=document.createElement('tr'),td=document.createElement('td');
    td.colSpan=5;td.textContent=w?'目前市場沒有進貨商品':'請先初始化來源市場';
    tr.append(td);marketBody.append(tr);
  }else for(const offer of offers){
    const tr=document.createElement('tr');
    tr.dataset.marketItemId=String(offer.itemId);
    const cell=value=>{
      const td=document.createElement('td');
      td.textContent=String(value);tr.append(td);
      return td;
    };
    cell('#'+offer.itemId+' '+offer.name);
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
  // R2-E: use offers are read-only projections of StreetModule.useItem.
  // The browser never rolls its own MakeAmount, costs, EXP or random draws.
  const useBody=$('use-offers');
  useBody.replaceChildren();
  const useOffers=s.useOffers??[];
  if(!useOffers.length){
    const tr=document.createElement('tr'),td=document.createElement('td');
    td.colSpan=5;td.textContent='尚無已審閱可使用配方';
    tr.append(td);useBody.append(tr);
  }else for(const offer of useOffers){
    const tr=document.createElement('tr');
    tr.dataset.useItemId=String(offer.itemId);
    const cell=value=>{
      const td=document.createElement('td');
      td.textContent=String(value);tr.append(td);return td;
    };
    cell('#'+offer.itemId+' '+offer.itemName+'｜'+offer.useName+
      (offer.firstUseOnly?'（限首次）':''));
    cell('持有 '+offer.owned+'；材料 '+
      offer.materials.map(x=>'#'+x.itemId+' × '+x.count).join('、'));
    cell(money(offer.moneyPerUse)+'／'+offer.timePerUseSeconds+' 秒');
    const tdInput=document.createElement('td');
    const count=document.createElement('input');
    count.type='number';count.min='1';count.step='1';count.value='1';
    if(offer.firstUseOnly)count.max='1';
    count.disabled=!offer.canUse;
    count.dataset.useCount=String(offer.itemId);
    count.setAttribute('aria-label','#'+offer.itemId+' 使用次數');
    tdInput.append(count);tr.append(tdInput);
    const tdButton=document.createElement('td');
    const button=document.createElement('button');
    button.type='button';button.className='primary';
    button.dataset.useItem=String(offer.itemId);
    button.dataset.useId=String(offer.useId);
    button.textContent=offer.canUse?'使用／製作':'不可使用';
    button.disabled=!offer.canUse;
    button.title=offer.reason??'已審閱來源 USE';
    tdButton.append(button);tr.append(tdButton);useBody.append(tr);
  }
  text('use-boundary','僅支援來源已審閱 #79 禮物卷交換及 #14 劍市地圖首次使用；未審閱回呼、二次使用及未知事件會拒絕。');
  text('market-boundary',
    '只顯示原版市場當下實際有貨的商品，依來源宣告順序及即時市價排列；未審閱效果仍拒絕交易。');
  // Collapse setup once after a shop exists, but let the user reopen it.
  if(shop && !$('setup').dataset.autoClosed){
    $('setup').open=false;
    $('setup').dataset.autoClosed='yes';
  }
  $('initialize').disabled=Boolean(w);
  $('open-shop').querySelector('button[type=submit]').disabled=!w||Boolean(shop);
  $('supply').disabled=!shop;
  // Render eligible showcases from the server's source-reviewed ITEM rules.
  // Browser submits a source price but NEVER calculates any sale or demand.
  const shelfSelect=$('shelf-item');
  const former=Number(shelfSelect.value);
  const sourceShelves=s.showcaseOffers??[];
  shelfSelect.replaceChildren();
  const empty=document.createElement('option');
  empty.value='0';empty.textContent='清空展示架';
  shelfSelect.append(empty);
  for(const offer of sourceShelves){
    const option=document.createElement('option');
    option.value=String(offer.itemId);
    option.textContent='#'+offer.itemId+' '+offer.name+
      '（原價 '+money(offer.unitPrice)+'，持有 '+offer.owned+'）';
    option.disabled=!offer.canShow;
    shelfSelect.append(option);
  }
  const preferred=sourceShelves.find(x=>x.itemId===former&&x.canShow)?former:
    sourceShelves.find(x=>x.itemId===shop?.showcase?.[0]&&x.canShow)?.itemId??
    sourceShelves.find(x=>x.canShow)?.itemId??0;
  shelfSelect.value=String(preferred);
  $('set-showcase').disabled=!shop;
  for(const control of document.querySelectorAll('.quick-time button'))control.disabled=!shop;
  $('advance-time-form').querySelector('button[type=submit]').disabled=!shop;
  const entries=shop?catalog.filter(item=>shop.item[item.itemId-1]>0)
    .map(item=>({id:item.itemId,name:item.name,
      count:shop.item[item.itemId-1],origin:'原版商品／實際持有'})):[];
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
         sourceReceipt:data.details??null},true);
      return false;
    }
    const after=data.state;
    feedback(label+'成功：世界 revision '+after.world.revision,
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
  if(!window.confirm('確定要刪除目前店家及整個測試世界嗎？\\n'+
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
    delete $('setup').dataset.autoClosed;
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
