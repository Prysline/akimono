/**
 * B-28: source-contract projection of in-memory Perl require dynamics for
 * two reviewed Standard Street generated item modules.
 *
 * This is a synthetic SINGLE-INTERPRETER sequence. It does not claim the
 * original CGI processes several item entrypoints in one request. Real CGI
 * item.cgi/item-m.cgi/item-s.cgi each requires $itemcode selected by
 * GetPath($ITEM_DIR,"use", ITEM[itemno].code).
 *
 * Original compiler emits per-product package item; @USE[index] assignments
 * and identically-named sub _local_1. Perl %INC caches loaded PATHS, but
 * named subroutines share package item, so a second different path
 * redefines item::_local_1. No real CGI or compiled DSL is run.
 */
import {
  projectOriginalBookWorkCallback,
  projectOriginalShowcaseResizeCallback,
} from './original-inline-work-showcase-model.mjs';

const specs=Object.freeze({
  'book-work':Object.freeze({count:2,itemNo:13}),
  'edit-showcase':Object.freeze({count:8,itemNo:63}),
});
function fail(message){throw new RangeError('B-28 virtual item loader fixture: '+message);}
export function projectOriginalVirtualItemLoadSequence({sequence}){
  if(!Array.isArray(sequence)||sequence.length<1||sequence.length>12)
    fail('require sequence must contain 1..12 approved source codes');
  const loaded=new Set(),rows=[null],steps=[];
  let active=null;
  for(const sourceCode of sequence){
    if(!Object.hasOwn(specs,sourceCode))fail('not a reviewed source code');
    const path='b28/use/'+sourceCode+'.cgi';
    const loadedNow=!loaded.has(path);
    if(loadedNow){
      loaded.add(path);
      active=sourceCode;
      const count=specs[sourceCode].count;
      for(let i=1;i<=count;i++)rows[i]=sourceCode;
      // No clearing of slots 3..8 when a shorter product is loaded.
    }
    const result=active==='book-work'
      ?projectOriginalBookWorkCallback({
        money:100,param1:2,count:2,shopId:42,shopName:'原版店',
        moneyPrefix:'¥',moneySuffix:'',
      })
      :projectOriginalShowcaseResizeCallback({
        showcaseCount:1,showcase:[9],prices:[90],newCount:2,
        shopId:42,shopName:'原版店',
      });
    steps.push(Object.freeze({
      requestedCode:sourceCode,virtualPath:path,requireCacheHit:!loadedNow,
      activeFunctionOwner:active,activeFunctionName:'item::_local_1',
      returned:result.returned,
      moneyAfter:active==='book-work'?result.moneyAfter:100,
      showcaseCountAfter:active==='edit-showcase'?result.showcaseCountAfter:1,
      showcase:active==='edit-showcase'?result.showcase:Object.freeze([9]),
      prices:active==='edit-showcase'?result.prices:Object.freeze([90]),
      logCalls:result.logCalls,
      useOwners:Object.freeze(rows.slice(1).map(x=>x??null)),
    }));
  }
  return Object.freeze({
    steps:Object.freeze(steps),
    loadedPaths:Object.freeze([...loaded]),
    hookRequests:Object.freeze([...loaded]),
    scope:'synthetic single Perl interpreter, original require/operator semantics; no disk writes, real CGI, dynamic compiler or persistence',
  });
}
