/** Real Chromium UI driver for the existing legal-player HTTP career.
 * No route interception, injected state, mocked response or RNG changes.
 * Only lord actions go through the DOM; career preparation remains the
 * existing genuine HTTP workflow and all source/disk assertions remain active.
 */
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright';

export async function openLordBrowser(t,p){
  const browser=await chromium.launch({headless:true});
  t.after(()=>browser.close());
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  page.setDefaultTimeout(20000);
  const errors=[],seen=new Set();
  const directory=process.env.AKIMONO_LORD_BROWSER_ARTIFACTS;
  if(directory)await mkdir(directory,{recursive:true});
  page.on('pageerror',e=>errors.push(e.message));
  let serial=0;
  const evidence=async name=>{
    if(directory)await page.screenshot({path:join(directory,String(++serial).padStart(2,'0')+'-'+name+'.png'),fullPage:true});
  };
  const id=s=>page.locator('#'+s);
  const exact=async(locator,expected)=>assert.equal(await locator.textContent(),expected);
  const money=n=>n.toLocaleString('zh-TW')+' G';
  const number=n=>n.toLocaleString('zh-TW');
  async function open(){
    const pending=page.waitForResponse(r=>r.url()===p.url+'/api/state'&&r.request().method()==='GET');
    await page.goto(p.url+'/',{waitUntil:'load'});
    const response=await pending;
    assert.equal(response.status(),200);
    const data=await response.json();
    assert.deepEqual(data.world,p.state.world,'browser must read the same live player');
    await page.locator('[data-group="facility"]').click();
    // The asynchronous initial state render must finish before checking authority.
    if(data.lord)await page.waitForFunction(()=>!document.getElementById('lord-tab').disabled);
    else await page.waitForFunction(()=>document.getElementById('lord-status').textContent==='目前沒有領主施政資格。');
    assert.deepEqual(errors,[]);
  }
  async function residence(){
    await open();
    assert.ok(p.state.lord);
    await id('lord-tab').click();
    assert.equal(await id('tab-lord').isVisible(),true);
    await quote(p.state.lord);
  }
  async function quote(q){
    await exact(id('lord-money'),money(q.money));
    await exact(id('lord-army-split'),number(q.regularArmy)+'／'+number(q.volunteerArmy));
    await exact(id('lord-upkeep'),money(q.upkeep));
    await exact(id('lord-forecast'),money(q.taxForecast));
    await exact(id('lord-tax-mode'),q.taxMode===1?'免除':q.taxMode===2?'兩倍':'通常');
    assert.equal(await id('lord-taxrate').inputValue(),String(q.taxRate));
    assert.equal(await id('lord-devem').inputValue(),String(q.devem));
    assert.equal(await id('lord-safem').inputValue(),String(q.safem));
  }
  async function assertNonLord(){
    await open();
    assert.equal(p.state.lord,null);
    assert.equal(await id('lord-tab').isDisabled(),true);
    assert.equal(await id('lord-panel').isVisible(),false);
    await evidence('nonlord');
  }
  async function assertExposeUnavailable(){
    await residence();
    assert.equal(p.state.lord.canExposeTarget,false);
    assert.ok(!await id('lord-expose').isVisible()||await id('lord-expose').isDisabled());
    await evidence('expose-gated');
  }
  async function command(route,body){
    await residence();
    const kind=route.slice('/api/lord-'.length);
    const prior=p.state.world.revision;
    let expected={expectedRevision:prior,...body};
    if(kind==='inside'){
      for(const key of ['taxrate','devem','safem'])await id('lord-'+key).fill(String(body[key]));
    }else if(kind==='tax-side'){
      await id('lord-tax-side-mode').selectOption(body.mode);
    }else if(kind==='outside'||kind==='outdel'){
      // Original UI exposes only quoted preset choices. Test a genuine
      // nonzero preset overridden by 1, and custom input for arbitrary counts.
      const options=kind==='outside'?p.state.lord.hireOptions:p.state.lord.fireOptions;
      if(body.cnt2){
        assert.ok(options.length>0);
        expected={expectedRevision:prior,cnt1:options[0].count,cnt2:body.cnt2};
      }else{
        expected={expectedRevision:prior,cnt1:0,cnt2:body.cnt1};
      }
      await id('lord-'+kind+'-options').selectOption(String(expected.cnt1));
      await id('lord-'+kind+'-count').fill(String(expected.cnt2));
    }else if(kind==='expose'){
      assert.equal(p.state.lord.canExposeTarget,true);
      await id('lord-expose-target').selectOption(String(body.targetShopId));
      page.once('dialog',async dialog=>{await dialog.accept();});
    }else assert.equal(kind,'tax-reset');
    const pending=page.waitForResponse(r=>r.url()===p.url+route&&r.request().method()==='POST');
    await id('lord-'+kind).click();
    const response=await pending;
    assert.deepEqual(response.request().postDataJSON(),expected,'actual browser request and revision');
    const result={status:response.status(),...await response.json()};
    assert.equal(result.status,200);
    assert.equal(result.code,'COMMITTED',JSON.stringify(result.details));
    await page.waitForFunction(()=>document.getElementById('feedback').textContent.startsWith('已完成'));
    assert.equal(await page.locator('.feedback').evaluate(el=>el.classList.contains('error')),false);
    assert.deepEqual(JSON.parse(await id('receipt').textContent()),result.details);
    await p.refresh();
    assert.deepEqual(p.state.world,result.state.world,'browser commit must be live');
    assert.equal(p.state.world.revision,prior+1);
    await quote(p.state.lord);
    assert.deepEqual(errors,[]);
    seen.add(kind);
    t.diagnostic('R4 BROWSER ACTION '+JSON.stringify({kind,request:expected,revision:p.state.world.revision,town:p.state.world.period.town,details:result.details}));
    await evidence(kind);
    return result;
  }
  async function finish(){
    assert.deepEqual([...seen].sort(),['expose','inside','outdel','outside','tax-reset','tax-side']);
    assert.deepEqual(errors,[]);
    await residence();
    await evidence('restarted-final');
    t.diagnostic('R4 genuine lord browser ACCEPTED '+JSON.stringify({actions:[...seen],revision:p.state.world.revision}));
  }
  return {assertNonLord,assertExposeUnavailable,command,finish};
}
