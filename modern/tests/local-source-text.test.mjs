import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalizeLocalSourceText} from '../src/local-source-text.mjs';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {
  createMemoryWorld,createMemoryWorldAdapter,executeMemoryCommand,
} from '../src/game-core-contract.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const sourcePaths=[
  'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
  'modern/tests/original-perl/core-inc-admin-func.cgi',
  'modern/tests/original-perl/inc-func.cgi',
  'modern/tests/original-perl/write.cgi',
  'modern/tests/original-perl/inc-turn.cgi',
  'modern/tests/original-perl/whole.cgi',
  '_config.cgi','modern/tests/original-perl/inc-makeitem.cgi',
  'modern/tests/original-perl/buy-s.cgi',
  'modern/tests/original-perl/item.cgi',
  'modern/tests/original-perl/calc.cgi',
];
const sourceKeys=[
  'itemDsl','rebelDsl','originalAdminInitSource',
  'originalDataReadSource','originalDataWriteSource',
  'originalTurnSource','originalWholeSource',
  'originalConfigSource','originalCompilerSource',
  'originalBuySource','originalBuyItemSource','originalBuyCalcSource',
];

test('B-40 Windows CRLF checkout still boots the actual reviewed StreetModule',async()=>{
  const original=await Promise.all(sourcePaths.map(p=>
    readFile(path.join(root,p),'utf8')));
  const windows=original.map(s=>s.replace(/\r?\n/g,'\r\n'));
  assert.ok(windows[2].includes('sub init\r\n'));
  assert.equal(windows[2].includes('sub init\n'),false);
  const loaded=windows.map(normalizeLocalSourceText);
  const unmodified=original.map(normalizeLocalSourceText);
  assert.deepEqual(loaded,unmodified,
    'only working-tree line endings may change; normalized source stays exact');
  assert.ok(loaded[2].includes('sub init\n'));
  assert.ok(!loaded[2].includes('\r'));
  const street=createStandardStreetModule(Object.fromEntries(
    sourceKeys.map((key,index)=>[key,loaded[index]])));
  assert.ok([
    'initialize-source-market','open-shop','reviewed-sparse-all-plus',
    'market-buy',
  ].every(cap=>street.capabilities.includes(cap)));
  const repository=createMemoryWorldAdapter(createMemoryWorld({
    worldId:'b40-windows-crlf-checkout',streetId:street.id,nowSeconds:1000000,
  }));
  const initialized=executeMemoryCommand({repository,streetModule:street,
    command:{kind:'initialize-source-market',expectedRevision:0}});
  assert.ok(initialized.ok,JSON.stringify(initialized.details));
  const opened=executeMemoryCommand({repository,streetModule:street,
    command:{kind:'open-shop',expectedRevision:1,shopId:1,
      ownerName:'Windows測試店主',shopName:'Windows測試店'}});
  assert.ok(opened.ok,JSON.stringify(opened.details));
  assert.equal(opened.world.shops[0].money,100000);
  assert.equal(opened.world.market.originalWholesaleCsv,'');
  assert.equal(opened.world.revision,2);
});

test('B-40 normalization does not mask source drift or malformed CR',async()=>{
  const src=await readFile(path.join(root,sourcePaths[2]),'utf8');
  const decoded=normalizeLocalSourceText(src.replace(/\r?\n/g,'\r\n'));
  assert.equal(decoded,normalizeLocalSourceText(src));
  assert.equal(normalizeLocalSourceText('a\nsecond\n'),'a\nsecond\n');
  assert.equal(normalizeLocalSourceText('a\r\nsecond\r\n'),'a\nsecond\n');
  assert.throws(()=>normalizeLocalSourceText('a\rsecond'),/lone CR/);
  assert.throws(()=>normalizeLocalSourceText('a\r\nsecond\rbad'),/lone CR/);
  assert.throws(()=>normalizeLocalSourceText(null),/UTF-8 text/);
  const sources=await Promise.all(sourcePaths.map(p=>
    readFile(path.join(root,p),'utf8').then(normalizeLocalSourceText)));
  const altered=[...sources];
  altered[2]=altered[2].replace('sub init\n','sub NOTinit\n');
  assert.notEqual(altered[2],sources[2]);
  assert.throws(()=>createStandardStreetModule(Object.fromEntries(
    sourceKeys.map((key,index)=>[key,altered[index]]))),
    /B-34 original world bootstrap: fixed admin init source drift/);
});
