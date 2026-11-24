import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  reviewOriginalSparseWorldBootstrap,createOriginalSparseMarket,
  validateSourceSparseMarket,ORIGINAL_SPARSE_MARKET_SOURCE,
} from '../src/original-admin-world-bootstrap.mjs';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {
  createMemoryWorld,createMemoryWorldAdapter,executeMemoryCommand,
  validateMemoryWorld,encodeMemorySnapshot,decodeMemorySnapshot,
} from '../src/game-core-contract.mjs';
import {parseWorldWholesaleLine,readWorldWholesaleSnapshot}
  from '../src/world-wholesale-codec.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const file=async p=>readFile(path.join(root,p),'utf8');
const [itemDsl,rebelDsl,adminSource,readSource,writeSource]=await Promise.all([
  'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
  'modern/tests/original-perl/core-inc-admin-func.cgi',
  'modern/tests/original-perl/inc-func.cgi',
  'modern/tests/original-perl/write.cgi',
].map(file));
const bootstrapInputs={adminSource,readSource,writeSource};
const reviewed=reviewOriginalSparseWorldBootstrap(bootstrapInputs);
const street=createStandardStreetModule({
  itemDsl,rebelDsl,originalAdminInitSource:adminSource,
  originalDataReadSource:readSource,originalDataWriteSource:writeSource,
});
const legacyStreet=createStandardStreetModule({itemDsl,rebelDsl});
const initial=()=>createMemoryWorld({
  worldId:'b34-reviewed-original-admin-init',
  streetId:'standard-street',nowSeconds:1_000_000,
});
const makeCommand=(kind,expectedRevision,args={})=>({
  kind,expectedRevision,...args,
});
const boot=rev=>makeCommand('initialize-source-market',rev);
const open=rev=>makeCommand('open-shop',rev,{
  shopId:42,ownerName:'原版空白市場測試店主',shopName:'來源初始化的標準街商店',
});
const gift=(rev,count=1)=>makeCommand('use-item',rev,{
  shopId:42,itemId:79,useId:0,requestedCount:count,
});
const exec=(adapter,command,mod=street)=>executeMemoryCommand({
  repository:adapter,streetModule:mod,command,
});
function prepared(){
  const repo=createMemoryWorldAdapter(initial());
  const a=exec(repo,boot(0));
  assert.equal(a.code,'COMMITTED',JSON.stringify(a.details));
  const b=exec(repo,open(1));
  assert.equal(b.code,'COMMITTED',JSON.stringify(b.details));
  return {repo,opened:b.world};
}
test('B-34 pinned original admin init owns exact empty WHOLE CSV between metadata and events',()=>{
  assert.ok(adminSource.includes('sub init\n{'));
  assert.ok(adminSource.includes('if(!-e "$DATA_DIR/$DATA_FILE$FILE_EXT")'));
  assert.ok(adminSource.includes('print DATA time()."\\n500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0\\n\\n\\n//\\n";'));
  assert.ok(readSource.includes('@DTwholestore=split(/,/,$DATA[$idx++],$MAX_ITEM);'));
  assert.ok(writeSource.includes('print OUT join(",",@DTwholestore)."\\n";'));
});
test('B-34 original world bootstrap metadata is source verified and distinct from normal shop world',()=>{
  assert.equal(reviewed.source,ORIGINAL_SPARSE_MARKET_SOURCE);
  assert.equal(reviewed.initialMeta,'500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0');
  assert.equal(reviewed.originalWholesaleCsv,'');
  assert.equal(reviewed.initiallyDefinedSlots,0);
  assert.equal(reviewed.maxItem,79);
  assert.ok(Object.isFrozen(reviewed.numericView));
});
test('B-34 Perl empty wholesale CSV yields zero original cells, not 79 written zeros',()=>{
  const decoded=parseWorldWholesaleLine('',79);
  assert.equal(decoded.suppliedSlots,0);
  assert.equal(decoded.originalCsv,'');
  assert.equal(decoded.stock.length,79);
  assert.equal(decoded.stock.every(x=>x===0),true);
  assert.notEqual('0,'.repeat(78)+'0','');
});
test('B-34 source-backed original market retains empty wire and only numeric 79 zero view',()=>{
  const m=createOriginalSparseMarket(reviewed);
  assert.equal(m.originalWholesaleCsv,'');
  assert.deepEqual(m.sparseWrittenSlots,[]);
  assert.equal(m.wholesale.length,79);
  assert.equal(m.wholesale.every(x=>x===0),true);
  assert.equal(validateSourceSparseMarket(m),true);
});
test('B-34 fixed source gate rejects changed original init metadata',()=>{
  assert.throws(()=>reviewOriginalSparseWorldBootstrap({
    ...bootstrapInputs,adminSource:adminSource.replace('500000,100,,0,0:','600000,100,,0,0:'),
  }),/source drift/);
});
test('B-34 fixed source gate rejects DataRead behavior drift',()=>{
  assert.throws(()=>reviewOriginalSparseWorldBootstrap({
    ...bootstrapInputs,readSource:readSource.replace(
      '@DTwholestore=split(/,/,$DATA[$idx++],$MAX_ITEM);',
      '@DTwholestore=();',
    ),
  }),/source drift/);
});
test('B-34 fixed source gate rejects DataWrite wholesale behavior drift',()=>{
  assert.throws(()=>reviewOriginalSparseWorldBootstrap({
    ...bootstrapInputs,writeSource:writeSource.replace(
      'print OUT join(",",@DTwholestore)."\\n";',
      'print OUT "0";',
    ),
  }),/source drift/);
});
test('B-34 safe bootstrap contract only accepts actual 79 Standard Street slots',()=>{
  assert.throws(()=>reviewOriginalSparseWorldBootstrap({
    ...bootstrapInputs,maxItem:3,
  }),/79 ITEM slots/);
});
test('B-34 optional source bootstrap requires complete original admin/read/write texts',()=>{
  assert.throws(()=>createStandardStreetModule({
    itemDsl,rebelDsl,originalAdminInitSource:adminSource,
  }),/incomplete/);
});
test('B-34 legacy module remains unchanged without opt-in original admin source',()=>{
  assert.deepEqual(legacyStreet.capabilities,[
    'open-shop','edit-showcase','discard-item','use-item',
  ]);
  assert.equal(legacyStreet.reviewedBootstrap,null);
  assert.ok(!legacyStreet.capabilities.includes('initialize-source-market'));
});
test('B-34 review-ready Standard Street adds only one opt-in admin bootstrap command',()=>{
  assert.deepEqual(street.capabilities,[
    'open-shop','edit-showcase','discard-item','initialize-source-market','use-item',
  ]);
  assert.equal(street.reviewedBootstrap.source,ORIGINAL_SPARSE_MARKET_SOURCE);
  assert.ok(!street.capabilities.includes('create-wholesale-stock'));
});
test('B-34 first original admin bootstrap can run on empty revision-zero WorldState',()=>{
  const repo=createMemoryWorldAdapter(initial());
  const x=exec(repo,boot(0));
  assert.equal(x.code,'COMMITTED',JSON.stringify(x.details));
  assert.equal(x.world.revision,1);
  assert.deepEqual(x.world.shops,[]);
  assert.equal(x.world.market.source,ORIGINAL_SPARSE_MARKET_SOURCE);
  assert.equal(x.world.market.originalWholesaleCsv,'');
  assert.equal(x.world.events,null);
  assert.equal(x.details.originalSuppliedSlots,0);
});
test('B-34 original bootstrap cannot be replayed on initialized world',()=>{
  const repo=createMemoryWorldAdapter(initial());
  assert.equal(exec(repo,boot(0)).code,'COMMITTED');
  const before=encodeMemorySnapshot(repo.read());
  const x=exec(repo,boot(1));
  assert.equal(x.code,'SOURCE_BOUNDARY_REJECTED');
  assert.equal(encodeMemorySnapshot(repo.read()),before);
});
test('B-34 original bootstrap cannot be inserted after shop already opened',()=>{
  const repo=createMemoryWorldAdapter(initial());
  assert.equal(exec(repo,open(0)).code,'COMMITTED');
  const before=encodeMemorySnapshot(repo.read());
  const x=exec(repo,boot(1));
  assert.equal(x.code,'SOURCE_BOUNDARY_REJECTED');
  assert.equal(encodeMemorySnapshot(repo.read()),before);
});
test('B-34 bootstrap rejects extra fields that could override market numbers',()=>{
  const repo=createMemoryWorldAdapter(initial());
  const x=exec(repo,makeCommand('initialize-source-market',0,{
    wholesale:Array(79).fill(99),
  }));
  assert.equal(x.code,'SOURCE_BOUNDARY_REJECTED');
  assert.equal(repo.read().market,null);
});
test('B-34 bare legacy module has no authority to synthesize original bootstrap',()=>{
  const repo=createMemoryWorldAdapter(initial());
  const x=exec(repo,boot(0),legacyStreet);
  assert.equal(x.code,'UNSUPPORTED_ACTION');
  assert.equal(repo.read().revision,0);
});
test('B-34 truly initialized original sparse market then opens actual Standard Street shop',()=>{
  const {repo,opened}=prepared();
  assert.equal(opened.revision,2);
  assert.equal(opened.market.originalWholesaleCsv,'');
  assert.equal(opened.market.wholesale.length,79);
  assert.equal(opened.shops[0].item[78],5);
  assert.equal(opened.shops[0].item[62],1);
});
test('B-34 real gift exchange after source bootstrap keeps both numeric and sparse wire state',()=>{
  const {repo}=prepared();
  const x=exec(repo,gift(2));
  assert.equal(x.code,'COMMITTED',JSON.stringify(x.details));
  assert.equal(x.world.revision,3);
  assert.equal(x.world.shops[0].item[78],3);
  assert.deepEqual([9,12,14].map(i=>x.world.shops[0].item[i-1]),[1,1,1]);
  assert.deepEqual(x.world.market.sparseWrittenSlots,[78]);
  assert.equal(x.world.market.originalWholesaleCsv,','.repeat(78)+'0');
  assert.equal(x.world.market.wholesale.every(v=>v===0),true);
  assert.equal(validateSourceSparseMarket(x.world.market),true);
});
test('B-34 source-proven sparse original wire is NOT serialized 79 literal zeros',()=>{
  const {repo}=prepared();
  exec(repo,gift(2));
  const m=repo.read().market;
  assert.equal(m.originalWholesaleCsv.startsWith('0,'),false);
  assert.equal(m.originalWholesaleCsv.split(',').length,79);
  assert.equal(m.originalWholesaleCsv.split(',')[0],'');
  assert.equal(m.originalWholesaleCsv.split(',')[78],'0');
});
test('B-34 second gift exchange uses previous sparse source and keeps last material count',()=>{
  const {repo}=prepared();
  assert.equal(exec(repo,gift(2)).code,'COMMITTED');
  const x=exec(repo,gift(3));
  assert.equal(x.code,'COMMITTED');
  assert.equal(x.world.revision,4);
  assert.equal(x.world.shops[0].item[78],1);
  assert.deepEqual([9,12,14].map(i=>x.world.shops[0].item[i-1]),[2,2,2]);
  assert.equal(x.world.market.originalWholesaleCsv,','.repeat(78)+'0');
});
test('B-34 insufficient third exchange does not change original sparse wire',()=>{
  const {repo}=prepared();
  exec(repo,gift(2));exec(repo,gift(3));
  const before=encodeMemorySnapshot(repo.read());
  const x=exec(repo,gift(4));
  assert.equal(x.code,'SOURCE_BOUNDARY_REJECTED');
  assert.equal(encodeMemorySnapshot(repo.read()),before);
});
test('B-34 source gift overflows map holdings and writes map positions before WHOLE cap',()=>{
  const {repo}=prepared();
  const before=repo.read();
  const shop={...before.shops[0],item:[...before.shops[0].item]};
  for(const i of [9,12,14])shop.item[i-1]=3;
  const capped=validateMemoryWorld({...before,shops:[shop]});
  const replay=createMemoryWorldAdapter(capped);
  const x=exec(replay,gift(2));
  assert.equal(x.code,'COMMITTED',JSON.stringify(x.details));
  assert.deepEqual(x.world.market.sparseWrittenSlots,[8,11,13,78]);
  for(const i of [9,12,14])assert.equal(x.world.market.wholesale[i-1],0);
  assert.equal(x.world.shops[0].item[78],3);
  assert.deepEqual(x.details.gainedMaps,[[12,0],[9,0],[14,0]]);
});
test('B-34 malformed sparse source provenance fails closed without WorldState commit',()=>{
  const {repo}=prepared();
  const before=repo.read();
  for(const mutation of [
    {...before.market,originalWholesaleCsv:'0'},
    {...before.market,sparseWrittenSlots:[78],originalWholesaleCsv:''},
    {...before.market,wholesale:[1,...Array(78).fill(0)]},
    {...before.market,originalBootstrapMeta:'invented'},
  ]){
    const dirty=createMemoryWorldAdapter(validateMemoryWorld({...before,market:mutation}));
    const x=exec(dirty,gift(2));
    assert.equal(x.code,'SOURCE_BOUNDARY_REJECTED');
    assert.equal(dirty.read().revision,2);
  }
});
test('B-34 stale expectedRevision rejected after source bootstrap and gift',()=>{
  const {repo}=prepared();
  exec(repo,gift(2));
  const old=encodeMemorySnapshot(repo.read());
  const x=exec(repo,gift(2));
  assert.equal(x.code,'REVISION_CONFLICT');
  assert.equal(encodeMemorySnapshot(repo.read()),old);
});
test('B-34 source-backed initialized world JSON round-trips and remains immutable',()=>{
  const {repo}=prepared();
  exec(repo,gift(2));exec(repo,gift(3));
  const source=encodeMemorySnapshot(repo.read());
  const restored=decodeMemorySnapshot(source);
  assert.equal(encodeMemorySnapshot(restored),source);
  assert.equal(validateSourceSparseMarket(restored.market),true);
  assert.ok(Object.isFrozen(restored.market.sparseWrittenSlots));
  assert.ok(Object.isFrozen(restored.market.wholesale));
});
test('B-34 original writer/read source baseline is preserved for source initialization',()=>{
  const text='1700000000\n'+reviewed.initialMeta+'\n\n\n//\n';
  const parsed=readWorldWholesaleSnapshot(text);
  assert.equal(parsed.suppliedSlots,0);
  assert.equal(parsed.originalCsv,'');
  assert.equal(parsed.stock.length,79);
  assert.equal(parsed.stock.every(x=>x===0),true);
});
test('B-34 direct original Perl source boot print and sparse gift transaction agree with Node',t=>{
  const cwd=path.join(root,'modern/tests/original-perl');
  let stdout;
  try{
    stdout=execFileSync('perl',['original-admin-sparse-market-probe.pl'],{
      cwd,encoding:'utf8',maxBuffer:4*1024*1024,timeout:25000,
    });
  }catch(e){
    if(e?.code==='ENOENT'){t.skip('Perl runtime unavailable');return;}
    throw e;
  }
  const probe=JSON.parse(stdout);
  assert.equal(probe.bootstrap.initialMetadata,reviewed.initialMeta);
  assert.equal(probe.bootstrap.wholesaleCsv,'');
  assert.equal(probe.bootstrap.wholeSlots,0);
  assert.equal(probe.bootstrap.eventCsv,'');
  assert.equal(probe.bootstrap.shopDelimiter,'//');
  const {repo}=prepared();
  for(const [i,part] of ['first','second','third'].entries()){
    const original=probe[part],before=repo.read();
    const applied=exec(repo,gift(before.revision));
    if(original.result.count===0){
      assert.equal(applied.code,'SOURCE_BOUNDARY_REJECTED',part);
      assert.deepEqual(repo.read(),before);
    }else{
      assert.equal(applied.code,'COMMITTED',part);
      const market=applied.world.market;
      assert.equal(market.originalWholesaleCsv,original.wholesaleCsv,part+' sparse CSV');
      assert.deepEqual(market.sparseWrittenSlots,original.wholesaleDefinedSlots,
        part+' original Perl defined slots');
      assert.deepEqual(market.wholesale,original.wholesaleNumeric79,
        part+' 79-cell numeric projection');
      assert.deepEqual(applied.world.shops[0].item,original.stock,part+' inventory');
      assert.equal(applied.world.shops[0].money,original.money,part+' money');
      assert.equal(applied.world.shops[0].time,original.time,part+' time');
    }
  }
  const world=prepared().opened;
  const shop={...world.shops[0],item:probe.cappedInitialStock};
  const capped=validateMemoryWorld({...world,shops:[shop]});
  const result=executeMemoryCommand({
    repository:createMemoryWorldAdapter(capped),streetModule:street,
    command:gift(2),
  });
  assert.equal(result.code,'COMMITTED');
  assert.equal(result.world.market.originalWholesaleCsv,probe.capped.wholesaleCsv);
  assert.deepEqual(result.world.market.sparseWrittenSlots,
    probe.capped.wholesaleDefinedSlots);
  assert.deepEqual(result.world.market.wholesale,probe.capped.wholesaleNumeric79);
  assert.deepEqual(result.world.shops[0].item,probe.capped.stock);
});
