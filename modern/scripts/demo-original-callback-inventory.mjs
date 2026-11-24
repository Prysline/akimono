import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditOriginalStandardCallbackDeclarations}
  from '../src/original-standard-callback-inventory.mjs';
import {projectOriginalLostbook,projectOriginalPopup}
  from '../src/original-shared-use-callback-model.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [itemDsl,rebelDsl,compilerSource]=await Promise.all([
  'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
  'modern/tests/original-perl/inc-makeitem.cgi',
].map(file=>readFile(path.join(root,file),'utf8')));
const inventory=auditOriginalStandardCallbackDeclarations({
  itemDsl,rebelDsl,compilerSource,
});
const book=projectOriginalLostbook({
  itemId:1,itemName:'書本甲',param1:1000,randomDraw:123,
});
const popup=projectOriginalPopup({
  shopId:42,shopName:'原版店',rank:5000,param1:1000,param2:'開了派對',
});
console.log(JSON.stringify({
  source:'fixed original Standard Street DSL declarations, no compiled Perl executed',
  declarations:inventory.summary,
  affectedItemGroups:inventory.groups,
  sharedFunctions:inventory.sharedDefinitions,
  syntheticOriginalLostbook:{
    returnValue:book.returned,
    intendedButNotExecutedUseItemCalls:book.externalUseItemCalls,
    randomDraw:book.randomDraw,
  },
  syntheticOriginalPopup:{
    rankBefore:popup.rankBefore,rankAfter:popup.rankAfter,
    returnValue:popup.returned,
    intendedButNotWrittenLogCalls:popup.logCalls,
  },
  boundary:'No true dynamic item callbacks, Perl compiler, external UseItem, real logs, CGI or persistence',
},null,2));
