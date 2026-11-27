import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {reviewR3ItemCallbackStage,projectR3ItemCallbackStage,reviewR4EmptyStreetItemCallbacks} from '../src/r3-reviewed-item-callback-stage.mjs';

const [itemDsl,rebelDsl,turnSource]=await Promise.all([
  '../../custom/inc-item-data.cgi','../../custom/inc-rebel-data.cgi','./original-perl/inc-turn.cgi',
].map(p=>readFile(new URL(p,import.meta.url),'utf8')));
const reviewed=reviewR3ItemCallbackStage({itemDsl,rebelDsl,turnSource});
const empty=reviewR4EmptyStreetItemCallbacks({itemDsl,turnSource});
test('R4 zero-shop original ITEM #70 FUNCTURN still consumes short-slice RNG',()=>{
  const oracle=JSON.parse(execFileSync('perl',['original-r3-item-callback-stage-probe.pl','--empty-street'],{
    cwd:fileURLToPath(new URL('./original-perl/',import.meta.url)),encoding:'utf8',
  }));
  assert.equal(oracle.cases.length,5);
  for(const row of oracle.cases){
    const args={reviewed,shop:null,spanSeconds:row.span,randomDraws:[row.draw]};
    assert.throws(()=>projectR3ItemCallbackStage(args),/original shop inventory/);
    assert.throws(()=>projectR3ItemCallbackStage({...args,r4EmptyStreetReview:{...empty}}),/reviewed empty street/);
    const got=projectR3ItemCallbackStage({...args,r4EmptyStreetReview:empty});
    assert.equal(row.activeShops,0);assert.equal(got.shop,null);
    assert.equal(got.drawsUsed,row.drawsUsed);
    assert.equal(got.drawsUsed,row.span<86.4?1:0);
    assert.equal(got.itemTurnAffectedShops,0);assert.equal(got.itemSaleCallbackCount,0);
    assert.deepEqual(row.callbackLog,[]);
  }
  assert.throws(()=>projectR3ItemCallbackStage({reviewed,shop:null,spanSeconds:60,
    randomDraws:[],r4EmptyStreetReview:empty}),/missing original #70 rand/);
});
