import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const script=await readFile(new URL('../local-ui/app.js',import.meta.url),'utf8');
const html=await readFile(new URL('../local-ui/index.html',import.meta.url),'utf8');
const original=await readFile(new URL('./original-perl/buy-s.cgi',import.meta.url),'utf8');
const logic=script.slice(script.indexOf('function showMarketResultActions('),script.indexOf('function feedback('));
const run=(data,currentTab)=>{
 const panel={hidden:true};
 new Function('$','currentTab','data',logic+';showMarketResultActions(data);')(()=>panel,currentTab,data);
 return panel.hidden;
};
test('F4 original market purchase success returns to stock or market, never other-shop endpoint',()=>{
 assert.equal(createHash('sha1').update('blob '+Buffer.byteLength(original)+'\0').update(original).digest('hex'),'6ba8df9a733ed16c490389414cd94934fe1185ca');
 assert.match(original,/DataCommitOrAbort\(\);[\s\S]*?GetMenuTag\('stock',[\s\S]*?\$id==0\) \? GetMenuTag\('shop-m'/);
 assert.match(html,/id="market-result-actions" hidden[\s\S]*?data-go-tab="stock"[\s\S]*?data-go-tab="market"/);
 assert.match(script,/button\.addEventListener\('click',\(\)=>selectTab\(button\.dataset\.goTab\)\)/);
});
test('F4 only accepted rendered market purchase exposes follow-up actions',()=>{
 const state={shop:{}};
 assert.equal(run({ok:true,state},'market'),false);
 assert.equal(run({ok:false,state},'market'),true);
 assert.equal(run({ok:true},'market'),true);
 assert.equal(run({ok:true,state},'stock'),true);
 assert.match(script,/來源市場進貨 #'\+itemId\+' '\+offer\.name,showMarketResultActions/);
 assert.match(script,/function feedback\([^)]*\)\{\s*\$\('market-result-actions'\)\.hidden=true;/);
 assert.match(script,/function updateNavigation\(\)\{\s*\$\('market-result-actions'\)\.hidden=true;/);
 assert.match(script,/if\(!outcome\)\{[\s\S]*?return false;[\s\S]*?onSuccess\?\.\(data\)/);
});
