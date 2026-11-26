const $=id=>document.getElementById(id);
const money=n=>typeof n==='number'?n.toLocaleString('zh-TW')+' G':'—';
let snapshot=null;
let currentTab='shop';
let currentGroup='self';
let selectedItemId=null;
let selectedUseId=null;
let selectedShelfIndex=0;
let lastPricingItemId=null;
let palaceSubmitting=false,armySubmitting=false;
const number=n=>Number.isSafeInteger(n)?n.toLocaleString('zh-TW'):'—';
const sourceProficiency=(shop,itemId)=>{
  if(!shop)return '—';
  const exp=shop.exp?.[String(itemId)]??0;
  return Number.isSafeInteger(exp)&&exp>=0&&exp<=1000?
    (exp/10).toLocaleString('zh-TW')+'%':'—';
};
const sourceUpkeep=raw=>{
  if(typeof raw!=='string'||!/^\d+$/.test(raw))return '—';
  const amount=Number(raw);
  return Number.isSafeInteger(amount)?money(amount):'—';
};
const timeText=seconds=>{
  const t=Math.max(0,Math.floor(seconds));
  return Math.floor(t/3600)+' 小時 '+Math.floor(t%3600/60)+' 分鐘';
};
const conciseTimeText=seconds=>{
  const t=Math.max(0,Math.floor(seconds));
  const hours=Math.floor(t/3600),minutes=Math.floor(t%3600/60),rest=t%60;
  return [hours?hours+' 小時':'',minutes?minutes+' 分鐘':'',
    rest?rest+' 秒':''].filter(Boolean).join(' ')||'0 秒';
};
const tabs=[...document.querySelectorAll('[data-tab]')];
const groups=[...document.querySelectorAll('[data-group]')];
const groupNames={self:'自店',trade:'交易',info:'情報',facility:'施設',social:'交流'};
const tabNames={shop:'店內',stock:'倉庫',market:'市場',palace:'宮殿',army:'傭兵所',
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
  currentGroup=['market','palace'].includes(name)?'trade':'self';
  if(name==='army')currentGroup='facility';
  updateNavigation();
}
function selectGroup(name){
  if(!Object.hasOwn(groupNames,name))return;
  if(name==='self')return selectTab('shop');
  if(name==='trade')return selectTab('market');
  if(name==='facility')return selectTab('army');
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
function showcaseSlotDescription(s,index){
  const shop=s?.shop;
  if(!shop||!Array.isArray(shop.showcase)||
     !Number.isSafeInteger(index)||index<0||
     index>=shop.showcasecount)return '—';
  const itemId=shop.showcase[index]??0;
  return itemId===0?'空架':
    catalogItem(s,itemId)?.name??'未知商品';
}
function openItem(itemId){
  if(!Number.isSafeInteger(itemId)||itemId<1)return;
  selectedItemId=itemId;
  selectedUseId=null;
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
  const displayed=shop&&item?shop.showcase.flatMap((id,index)=>
    id===item.itemId?['第 '+(index+1)+' 架（'+money(shop.price[index])+'）']:[]):[];
  text('item-detail-shelf',item?
    (displayed.join('、')||'未陳列'):'—');
  const shelfPicker=$('showcase-shelf');
  shelfPicker.replaceChildren();
  const shelfCount=Number.isSafeInteger(shop?.showcasecount)?
    Math.min(shop.showcasecount,8):0;
  for(let index=0;index<shelfCount;index++){
    const option=document.createElement('option');
    option.value=String(index);
    const listed=shop.showcase[index]>0?
      '｜'+money(shop.price[index]):'';
    option.textContent='架'+(index+1)+'（'+
      showcaseSlotDescription(s,index)+listed+'）';
    shelfPicker.append(option);
  }
  if(selectedShelfIndex>=shelfCount)selectedShelfIndex=0;
  shelfPicker.value=String(selectedShelfIndex);
  shelfPicker.title=shelfPicker.selectedOptions[0]?.textContent??'';
  if(lastPricingItemId!==selectedItemId){
    lastPricingItemId=selectedItemId;
    $('shelf-price-per').value='100';
    $('shelf-price-custom').value='100';
    syncShelfCustomRatio();
    syncShelfCalculatedPrice();
  }
  text('showcase-time-cost',
    Number.isSafeInteger(s.showcaseEditTimeSeconds)?
      conciseTimeText(s.showcaseEditTimeSeconds):'—');
  // This page already represents the chosen item. The one shelf picker
  // shows occupancy; clearing a shelf is handled in the shop overview.
  const offer=(s.showcaseOffers??[]).find(x=>x.itemId===selectedItemId);
  const canEdit=Boolean(item&&shop&&
    (offer||shop.showcase?.includes(selectedItemId)));
  $('showcase-form').hidden=!canEdit;
  $('set-showcase').disabled=!shop||!canEdit;
  const canDiscard=Boolean(shop&&item&&
    shop.item[item.itemId-1]>0&&
    !item.flagRaw.split('|').includes('notrash'));
  $('discard-form').hidden=!shop||!item;
  $('discard-count').max=String(shop&&item?
    shop.item[item.itemId-1]:0);
  $('discard-submit').disabled=!canDiscard;
  text('discard-note',!canDiscard?
    '此商品不可丟棄或沒有持有數量。':
    '不消耗行動時間；丟棄後無法復原。');
  const useList=$('use-offers');
  useList.replaceChildren();
  const useOffers=(s.useOffers??[]).filter(row=>row.itemId===selectedItemId);
  // Only hide products with no source USE at all. Disabled or
  // material-blocked USEs still show their original eligibility reasons.
  $('use-section').hidden=useOffers.length===0;
  if(!useOffers.length)return;
  for(const row of useOffers){
    const li=document.createElement('li');
    const timeSuffix=Number.isSafeInteger(row.timePerUseSeconds)?
      '（每次 '+conciseTimeText(row.timePerUseSeconds)+'）':'';
    if(row.canUse){
      const button=document.createElement('button');
      button.type='button';button.className='text-link use-action-link';
      button.dataset.openUse=String(row.useId);
      button.dataset.useItem=String(row.itemId);
      button.textContent=row.useName+(row.firstUseOnly?'（限首次）':'')+timeSuffix;
      li.append(button);
    }else{
      const label=document.createElement('span');
      label.className='use-unavailable';
      label.textContent=row.useName+(row.firstUseOnly?'（限首次）':'')+timeSuffix;
      li.append(label);
      const reason=document.createElement('small');
      reason.className='muted';
      reason.textContent='（'+(row.reason??'目前不可執行')+'）';
      li.append(reason);
      for(const route of row.materialRoutes??[]){
        if(route.missing<=0)continue;
        const hint=document.createElement('small');
        hint.className='muted';
        const providerName=provider=>{
          const q=(s.useOffers??[]).find(x=>x.itemId===provider.itemId&&x.useId===provider.useId);
          return q? q.itemName+'／'+q.useName:'商品 #'+provider.itemId+'／操作 '+provider.useId;
        };
        let message;
        if(route.kind==='source-rank-one-prize'){
          message='跨期排行第一名隨機獎品（'+route.rankOnePrize.choices.length+'/'+
            route.rankOnePrize.totalChoices+' 種結果；非保證取得）';
        }else if(route.kind==='registered-use'&&route.provider){
          message='可嘗試 '+providerName(route.provider)+'（產量及成功率依原版規則）';
        }else if(route.kind==='upstream-use-not-ready'){
          message='製作條件未齊：'+route.providerCandidates.map(q=>
            providerName(q)+'：'+(q.reason??'請確認可用次數')).join('；');
        }else if(route.kind==='market-stock'){
          message='市場有貨；請確認實際報價、資金與行動時間';
        }else if(route.kind==='source-plus'){
          message='原版市場補貨週期 '+route.sourcePlus+'；實際到貨依時間與亂數';
        }else{
          message='目前未找到可用的單店取得提示';
        }
        hint.textContent=route.name+'：'+message;
        li.append(hint);
      }
      if(Number.isSafeInteger(row.missingMaterialId)){
        const debug=document.createElement('small');
        debug.className='dev-panel dev-raw-value';
        debug.textContent='缺少材料 ID #'+row.missingMaterialId;
        li.append(debug);
      }
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
  $('use-count').value='';
  $('use-count-presets').value='';
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
  text('use-detail-time',offer?conciseTimeText(offer.timePerUseSeconds):'—');
  const maximum=offer?.maxUseCount??0;
  const limitName=offer?.maxUseCountReason??'可執行上限';
  text('use-detail-limit',offer?
    (maximum>0?'最多 '+number(maximum)+' 次（'+limitName+'）':
      (offer.reason??'目前不可執行')):'—');
  const form=$('use-action-form');
  form.hidden=!offer;
  const presets=$('use-count-presets');
  const previous=Number(presets.value);
  presets.replaceChildren();
  const choices=[1,2,3,5,maximum].filter((n,i,all)=>
    n>0&&n<=maximum&&all.indexOf(n)===i);
  for(const n of choices){
    const option=document.createElement('option');
    option.value=String(n);
    option.textContent=n===maximum&&maximum>1?
      n+'（'+limitName+'）':String(n);
    presets.append(option);
  }
  presets.disabled=!offer?.canUse||!choices.length;
  presets.value=choices.includes(previous)?String(previous):String(choices[0]??'');
  const count=$('use-count');
  count.max=offer?.firstUseOnly?'1':'';
  $('perform-use').disabled=!offer?.canUse||maximum<=0;
  text('use-detail-note',!offer?'沒有可執行的操作':
    offer.canUse?(offer.targetShopId?'目標：'+offer.targetShopName+'（自己的店舖）。仍依原版扣除費用、材料及時間；請確認後執行。':'執行前請確認材料、資金與可用行動時間。'):
      (offer.reason??'目前無法執行'));
  updateUseEstimate();
}
function selectedUseCount(){
  const manual=$('use-count').value.trim();
  return Number(manual!==''?manual:$('use-count-presets').value);
}
function updateUseEstimate(){
  const offer=snapshot?.useOffers?.find(row=>
    row.itemId===selectedItemId&&row.useId===selectedUseId);
  const requested=selectedUseCount();
  if(!offer?.canUse||!Number.isSafeInteger(requested)||requested<1){
    text('use-estimated-time','本次預估行動時間：—');
    return;
  }
  const available=Math.min(requested,offer.maxUseCount??0);
  const seconds=available*offer.timePerUseSeconds;
  if(!Number.isSafeInteger(seconds)||available<=0){
    text('use-estimated-time','本次預估行動時間：—');
    return;
  }
  text('use-estimated-time','本次預估行動時間：'+
    conciseTimeText(seconds)+'（'+number(available)+' 次）'+
    (requested>available?'；超出可執行上限的次數將由來源裁切':''));
}
function renderUseResult(data,offer,catalog){
  const nameFor=id=>catalog.find(row=>row.itemId===id)?.name??'商品 #'+id;
  const tuples=rows=>(Array.isArray(rows)?rows:[])
    .filter(row=>Array.isArray(row)&&row.length>=2&&row[1]>0)
    .map(([id,count])=>nameFor(id)+' × '+number(count)).join('、')||'無';
  text('use-result-name',offer.useName);
  text('use-result-count',number(data.effectiveCount));
  text('use-result-money',money(data.moneySpent));
  text('use-result-time',conciseTimeText(data.timeSpentSeconds));
  text('use-result-consumed',tuples(data.originalUseItem));
  text('use-result-acquired',tuples(data.originalAddItem));
  const resultMessage=(typeof data.originalFunctionReturn==='string'&&data.originalFunctionReturn)||
    data.originalResultOk||'操作已完成。';
  text('use-result-message',Number.isSafeInteger(data.moneyEarned)&&data.moneyEarned>0?
    '收入 '+money(data.moneyEarned)+'；'+resultMessage:resultMessage);
}
$('inventory').addEventListener('click',event=>{
  const button=event.target.closest('[data-open-item]');
  if(button)openItem(Number(button.dataset.openItem));
});
$('storage-inventory').addEventListener('click',event=>{
  const button=event.target.closest('[data-open-item]');
  if(button)openItem(Number(button.dataset.openItem));
});
function renderArmy(s){
  const a=s?.army;
  text('army-status',a?'矮人兵士正在等待僱用。':s?.reviewedCrossPeriod?'請先建立商店。':'傭兵所需已審閱的跨期模式。');
  text('army-dignity',number(a?.dignity));
  text('army-maximum',number(a?.maximum));
  text('army-count',number(a?.count));
  text('army-price',number(a?.unitPrice));
  text('army-riot',a?(a.riot?'反亂':'待機'):'—');
  const reasons={'dignity-capacity':'爵位所允許的僱用上限不足。',funds:'資金不足。',time:'可用時間不足。','no-army':'目前沒有兵士。'};
  for(const [mode,allowed,reason,options,max] of [['hire',a?.canHire,a?.hireReason,a?.hireOptions,a?.hireMaximum],['fire',a?.canFire,a?.fireReason,a?.fireOptions,a?.fireMaximum]]){
    const enabled=allowed===true&&!armySubmitting&&Boolean(s?.world);
    const select=$('army-'+mode+'-options'),previous=select.value;
    select.replaceChildren(new Option('請選擇',''),...(options??[]).map(n=>new Option(number(n),String(n))));
    if((options??[]).some(n=>String(n)===previous))select.value=previous;
    select.disabled=!enabled;
    $('army-'+mode+'-count').disabled=!enabled;
    $('army-'+mode).disabled=!enabled;
    text('army-'+mode+'-reason',allowed?'本次最多 '+number(max)+' 人。':reasons[reason]??'目前不可操作。');
  }
}
function renderPalace(s){
  const p=s?.palace;
  text('palace-point',number(p?.point));
  text('palace-required-point',number(p?.requiredPoint));
  text('palace-dignity',number(p?.dignity));
  const canMeet=p?.canMeet===true;
  $('palace-mission').hidden=!canMeet;
  $('palace-complete').disabled=palaceSubmitting||!s?.world||!canMeet||p?.canComplete!==true;
  if(!s?.reviewedCrossPeriod){
    text('palace-status','宮殿目前僅在已審閱的獨立跨期模式開放。');
  }else if(!p){
    text('palace-status','請先建立商店，再確認面會資格。');
  }else if(!canMeet){
    text('palace-status','大臣：國王目前無法與您面會，請先提升經營點數。');
  }else{
    text('palace-status',p.canComplete===true?'國王：指定商品已備齊，可以繳交。':'國王：請備齊指定商品。');
  }
  // Authority is the returned server quote; never calculate score or a
  // successor mission in the browser. Hide mission details before audience.
  text('palace-message',canMeet?p.message:'');
  text('palace-item',canMeet?(catalogItem(s,p.itemId)?.name??'商品 #'+p.itemId):'—');
  text('palace-stock',canMeet?number(p.owned)+'／'+number(p.count):'—');
}
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
  text('settlement-status',w?(s.reviewedCrossPeriod?'獨立單店跨期決算已啟用':'決算功能尚未開放'):'');
  text('local-mode-note',s.reviewedCrossPeriod?'單機獨立店鋪：跨期決算已啟用，存檔需手動儲存。':'目前為單機測試：存檔需手動儲存；尚未開放跨期決算。');
  const periodState=w?.period??null;
  text('city-seed',periodState?
    (periodState.settledCount?'結算後人口 ':'初始人口 ')+periodState.dtPeople.toLocaleString('zh-TW')+
    '（發展 '+periodState.town.develop+'／治安 '+periodState.town.safety+'）':
    (w?'舊版世界（無期別城市資料）':'—'));
  text('period-count',periodState?
    periodState.settledCount+(s.reviewedCrossPeriod?' 期':' 期（跨期尚未開放）'):'—');
  const evDefs=s.eventDefinitionStatus;
  const eventDefinitionLabel=evDefs?
    '原版 '+evDefs.declared+' 個事件宣告，'+
      evDefs.compilerIncluded+' 個由編譯器納入；'+(s.reviewedTimeMode?'已啟用審閱的獨立店鋪 EVENT。':'效果尚未移植。'):'';
  text('event-state',(!periodState?'舊版世界／尚未取得事件資料':
    periodState.eventState===null?
      '未知：時間推進後尚未實作原版 EVENT 回呼':
      Object.keys(periodState.eventState).length?'目前 EVENT：'+Object.keys(periodState.eventState).join('、'):'目前已知 EVENT 清單為空')+
    (eventDefinitionLabel?' '+eventDefinitionLabel:''));
  text('store-name',shop?.shopname??'未開店');
  text('owner-name',shop?.name??'—');
  text('shop-title','店內');
  text('shop-info-name',shop?.shopname??'尚未開店');
  text('shop-info-money',money(shop?.money));
  text('money',money(shop?.money));
  text('rank',number(s.shopSummary?.rankPosition));
  text('shop-points',number(s.shopSummary?.point));
  renderPalace(s);
  renderArmy(s);
  const actionSeconds=shop?w.nowSeconds-shop.time:null;
  const actionTime=actionSeconds===null?'—':
    actionSeconds<0?'距可行動還有 '+timeText(-actionSeconds):
      timeText(Math.min(actionSeconds,72*3600));
  text('time',actionTime);
  text('shop-info-time',actionTime);
  text('shop-info-popularity',Number.isSafeInteger(shop?.rank)?
    Math.trunc(shop.rank/100)+'%':'—');
  text('dev-popularity-raw',Number.isSafeInteger(shop?.rank)?
    number(shop.rank):'—');
  const shelfBody=$('showcase-shelves');
  shelfBody.replaceChildren();
  const shelfCount=shop?.showcasecount??0;
  const shelfEditSeconds=s.showcaseEditTimeSeconds;
  text('shop-showcase-time',Number.isSafeInteger(shelfEditSeconds)?
    conciseTimeText(shelfEditSeconds):'—');
  const canEditShelf=Boolean(shop&&w.nowSeconds>=shop.time);
  if(!Number.isSafeInteger(shelfCount)||shelfCount<1||shelfCount>8||
     !Array.isArray(shop?.showcase)||shop.showcase.length!==shelfCount||
     !Array.isArray(shop?.price)||shop.price.length!==shelfCount){
    const tr=document.createElement('tr'),td=document.createElement('td');
    td.colSpan=8;td.textContent=shop?'展示架資料不合法':'尚未開店';
    tr.append(td);shelfBody.append(tr);
  }else for(let index=0;index<shelfCount;index++){
    const itemId=shop.showcase[index]??0,hasItem=itemId>0;
    const info=hasItem?catalog.find(row=>row.itemId===itemId):null;
    const tr=document.createElement('tr');
    const cell=value=>{
      const td=document.createElement('td');
      td.textContent=String(value);tr.append(td);return td;
    };
    cell('第 '+(index+1)+' 架');
    cell(hasItem?info?.name??'商品 #'+itemId:'目前空架');
    cell(hasItem?money(shop.price[index]):'—');
    cell(hasItem?money(info?.basePrice):'—');
    cell(hasItem?number(shop.item[itemId-1]):'—');
    cell(hasItem?number(shop.itemtoday?.[itemId]??0):'—');
    cell(hasItem&&w?.period?.settledCount>0?
      number(shop.itemyesterday?.[itemId]??0):'—');
    const td=document.createElement('td');
    const button=document.createElement('button');
    button.type='button';button.className='text-link shelf-action-link';
    button.dataset.shelfIndex=String(index);
    button.dataset.shelfAction=hasItem?'remove':'open';
    button.textContent=hasItem?'下架':'上架';
    button.disabled=hasItem?!canEditShelf:!shop;
    button.title=hasItem?'清空第 '+(index+1)+' 架':'選擇要上架的商品';
    td.append(button);tr.append(td);shelfBody.append(tr);
  }
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
    td.colSpan=6;td.textContent=w?'目前市場沒有商品':'請先建立商店或載入存檔';
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
    cell(Number.isSafeInteger(offer.timeSeconds)?
      conciseTimeText(offer.timeSeconds):'—');
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
  text('use-boundary','已接入來源審閱的禮物卷交換、劍市地圖重複使用與部分製作配方；尚未審閱的回呼、材料取得及存檔來源可能限制其他製作。');
  text('market-boundary',
    '只顯示原版市場當下實際有貨的商品，依來源宣告順序及即時市價排列；未審閱效果仍拒絕交易。');
  $('setup').hidden=Boolean(shop);
  if(!shop)$('setup').open=true;
  $('initialize').disabled=Boolean(w);
  $('open-shop').querySelector('button[type=submit]').disabled=!w||Boolean(shop);
  $('supply').disabled=!shop||snapshot?.reviewedTimeMode===true;
  if(snapshot?.reviewedTimeMode===true)$('supply').closest('details').hidden=true;
  // Available actions are rendered in the selected original-style item page.
  // Frozen R3 handles one source store, with 1..8 genuine indexed shelves.
  // Multi-shelf following any unknown EVENT is not authorized.
  const sourceSaleSupported=Boolean(shop&&
    shop.showcasecount>=1&&shop.showcasecount<=(snapshot?.reviewedTimeMode===true?1:8)&&
    (shop.showcasecount===1||w?.period?.eventState!==null));
  for(const control of document.querySelectorAll('.quick-time button'))
    control.disabled=!sourceSaleSupported;
  $('advance-time-form').querySelector('button[type=submit]').disabled=
    !sourceSaleSupported;
  text('source-shelf-sale-boundary',shop&&shop.showcasecount>1?
    (w?.period?.eventState===null?
      '多架時間片的 EVENT 後繼尚未完成來源驗證，暫停再次快轉。':
      number(shop.showcasecount)+' 架已接入原版來源審閱的首次自然販售，後續仍須通過 EVENT 驗證。'):'');
  const entries=shop?catalog.filter(item=>shop.item[item.itemId-1]>0)
    .map(item=>({...item,count:shop.item[item.itemId-1]})):[];
  const storageBody=$('storage-inventory'),sellingBody=$('inventory');
  storageBody.replaceChildren();sellingBody.replaceChildren();
  const addEmpty=(body,colspan,message)=>{
    const tr=document.createElement('tr'),td=document.createElement('td');
    td.colSpan=colspan;td.textContent=message;tr.append(td);body.append(tr);
  };
  const addCell=(tr,value)=>{
    const td=document.createElement('td');td.textContent=value;
    tr.append(td);return td;
  };
  const addProficiency=(tr,item)=>{
    const td=addCell(tr,sourceProficiency(shop,item.itemId));
    const raw=shop?.exp?.[String(item.itemId)]??0;
    const dev=document.createElement('small');
    dev.className='dev-panel dev-raw-value';
    dev.textContent=Number.isSafeInteger(raw)&&raw>=0&&raw<=1000?
      'EXP '+number(raw)+'/1000':'EXP 不合法';
    td.append(dev);
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
  if(!storage.length)addEmpty(storageBody,5,'目前沒有保管商品');
  for(const item of storage){
    const tr=document.createElement('tr');
    addName(tr,item);
    for(const value of [money(item.basePrice),
      sourceUpkeep(item.costRaw),
      number(item.count)+'／'+number(item.stockLimit)])
      addCell(tr,value);
    addProficiency(tr,item);
    storageBody.append(tr);
  }
  if(!selling.length)addEmpty(sellingBody,6,'目前沒有販售商品');
  for(const item of selling){
    const tr=document.createElement('tr');addName(tr,item);
    for(const value of [money(item.basePrice),sourceUpkeep(item.costRaw),
      number(item.count)+'／'+number(item.stockLimit)])
      addCell(tr,value);
    addProficiency(tr,item);
    const shelves=shop.showcase.flatMap((id,index)=>
      id===item.itemId?['第 '+(index+1)+' 架｜'+money(shop.price[index])]:[]);
    addCell(tr,shelves.join('、')||'—');
    sellingBody.append(tr);
  }
  renderItemInfo(s);
  if(currentTab==='use')renderUseDetail(s);
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
async function call(path,payload={},label='操作',onSuccess=null){
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
    onSuccess?.(data);
    return true;
  }catch(error){feedback(label+'失敗：'+error.message,null,true);return false;}
}
for(const mode of ['hire','fire']){
  $('army-'+mode+'-form').addEventListener('submit',async event=>{
    event.preventDefault();
    const before=snapshot,allowed=mode==='hire'?before?.army?.canHire:before?.army?.canFire;
    if(armySubmitting||!before?.world||allowed!==true)return;
    const raw=$('army-'+mode+'-count').value||$('army-'+mode+'-options').value;
    const requestedCount=Number(raw);
    if(!Number.isSafeInteger(requestedCount)||requestedCount<1){feedback('請輸入正整數人數。',null,true);return;}
    armySubmitting=true;renderArmy(before);
    try{
      await call('/api/army-'+mode,{expectedRevision:before.world.revision,requestedCount},mode==='hire'?'僱用兵士':'解僱兵士',data=>{
        const r=data.details;
        feedback('已'+(mode==='hire'?'僱用':'解僱')+' '+number(r.count)+' 名兵士；現有 '+number(r.armyAfter)+' 名。',r);
        $('army-'+mode+'-count').value='';
      });
    }finally{armySubmitting=false;renderArmy(snapshot);}
  });
}
$('palace-complete').addEventListener('click',async()=>{
  const before=snapshot;
  if(palaceSubmitting||!before?.world||before.palace?.canMeet!==true||before.palace?.canComplete!==true)return;
  palaceSubmitting=true;
  renderPalace(before);
  try{
    await call('/api/palace-complete',{expectedRevision:before.world.revision},'完成國王使命',data=>{
      const receipt=data.details;
      if(receipt?.action==='complete-palace-mission'){
        const name=catalogItem(before,receipt.itemId)?.name??'指定商品';
        feedback('國王使命完成：已繳交 '+number(receipt.consumedCount)+' 件'+name+
          '，爵位經驗值 '+number(receipt.dignityBefore)+' → '+number(receipt.dignityAfter)+'。',receipt);
      }
    });
  }finally{
    palaceSubmitting=false;
    renderPalace(snapshot);
  }
});
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
    selectedUseId=null;
    lastPricingItemId=null;
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
$('showcase-shelves').addEventListener('click',async event=>{
  const button=event.target.closest('button[data-shelf-index]');
  if(!button||button.disabled||!snapshot?.shop||!snapshot?.world)return;
  const shelf=Number(button.dataset.shelfIndex);
  if(!Number.isSafeInteger(shelf)||shelf<0||
     shelf>=snapshot.shop.showcasecount)return;
  if(button.dataset.shelfAction==='open'){
    selectedShelfIndex=shelf;
    selectTab('stock');
    return;
  }
  if(button.dataset.shelfAction==='remove'&&
     snapshot.shop.showcase[shelf]>0)
    await call('/api/showcase',{
      expectedRevision:snapshot.world.revision,itemId:0,per:100,shelf,
    },'第 '+(shelf+1)+' 架下架');
});
$('showcase-shelf').addEventListener('change',()=>{
  selectedShelfIndex=Number($('showcase-shelf').value);
  $('showcase-shelf').title=$('showcase-shelf').selectedOptions[0]?.textContent??'';
});
function selectedShelfRatio(){
  const selector=$('shelf-price-per').value;
  const raw=selector==='custom'?
    $('shelf-price-custom').value:selector;
  if(!/^[0-9]+$/.test(raw))return null;
  const n=Number(raw);
  return Number.isSafeInteger(n)&&n>=1&&n<=200?n:null;
}
function syncShelfCustomRatio(){
  $('shelf-custom-ratio').hidden=$('shelf-price-per').value!=='custom';
}
function syncShelfCalculatedPrice(){
  const base=catalogItem(snapshot,selectedItemId)?.basePrice;
  const ratio=selectedShelfRatio();
  const actual=Number.isSafeInteger(base)&&base>0&&ratio!==null?
    Math.trunc(base*ratio/100):null;
  $('shelf-price-direct').value=Number.isSafeInteger(actual)&&actual>0?
    String(actual):'';
}
$('shelf-price-per').addEventListener('change',()=>{
  syncShelfCustomRatio();
  syncShelfCalculatedPrice();
});
$('shelf-price-custom').addEventListener('input',syncShelfCalculatedPrice);
$('discard-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const itemId=selectedItemId;
  const count=Number($('discard-count').value);
  const item=catalogItem(snapshot,itemId),shop=snapshot?.shop;
  if(!item||!shop||!Number.isSafeInteger(count)||count<1||
    count>shop.item[itemId-1]||item.flagRaw.split('|').includes('notrash')){
    feedback('丟棄數量不正確或此商品不可丟棄。',null,true);
    return;
  }
  if(!confirm('確定丟棄 '+item.name+' × '+number(count)+
    '？丟棄後無法復原，且不消耗行動時間。'))return;
  await call('/api/discard',{
    expectedRevision:snapshot.world.revision,itemId,count,
  },'丟棄商品：'+item.name);
});
$('showcase-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const itemId=selectedItemId;
  if(!Number.isSafeInteger(itemId)||itemId<1||
     !(snapshot?.showcaseOffers??[]).some(x=>x.itemId===itemId)){
    feedback('此商品目前不可陳列。',null,true);
    return;
  }
  const ratio=selectedShelfRatio();
  const listedRaw=$('shelf-price-direct').value;
  const listedPrice=Number(listedRaw);
  const base=catalogItem(snapshot,itemId)?.basePrice;
  if(ratio===null||!/^[0-9]+$/.test(listedRaw)||
     !Number.isSafeInteger(listedPrice)||listedPrice<1||
     !Number.isSafeInteger(base)||base<1){
    feedback('請輸入 1～200 的整數比例，以及有效的整數售價。',null,true);
    return;
  }
  const computed=Math.trunc(base*ratio/100);
  const priceOverride=listedPrice===computed?0:listedPrice;
  await call('/api/showcase',{
    expectedRevision:snapshot?.world?.revision,
    itemId,per:ratio,
    ...(priceOverride?{priceOverride}:{}),
    shelf:Number($('showcase-shelf').value),
  },'陳列：'+(catalogItem(snapshot,itemId)?.name??'商品'));
});
async function advance(minutes){
  await call(snapshot?.reviewedTimeMode===true?'/api/advance-reviewed-time':'/api/advance-time',{
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
$('use-count-presets').addEventListener('change',()=>{
  $('use-count').value='';
  updateUseEstimate();
});
$('use-count').addEventListener('input',updateUseEstimate);
$('use-action-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const before=snapshot;
  const itemId=selectedItemId,useId=selectedUseId;
  const offer=before?.useOffers?.find(row=>
    row.itemId===itemId&&row.useId===useId);
  if(!offer?.canUse||currentTab!=='use'||!before?.world)return;
  const manual=$('use-count').value.trim();
  const requestedCount=Number(manual!==''?manual:$('use-count-presets').value);
  if(!Number.isSafeInteger(requestedCount)||requestedCount<1||
    (offer.firstUseOnly&&requestedCount!==1)){
    feedback('請輸入有效的執行次數。',null,true);
    return;
  }
  const submit=$('perform-use');
  submit.disabled=true;
  try{
    await call('/api/use',{
      expectedRevision:before.world.revision,itemId,useId,requestedCount,
      ...(offer.targetShopId?{targetShopId:offer.targetShopId}:{}),
    },'商品使用／製作：'+offer.useName,data=>{
      if(!data.details||!data.state)return;
      renderUseResult(data.details,offer,before.itemCatalog??[]);
      selectTab('use-result');
    });
  }finally{
    if(currentTab==='use')renderUseDetail(snapshot??before);
  }
});
async function refresh(){
  try{const res=await fetch('/api/state',{cache:'no-store'});
    showState(await res.json());}
  catch(error){feedback('無法連線至本機 Node 服務：'+error.message,null,true);}
}
selectTab(currentTab);refresh();
