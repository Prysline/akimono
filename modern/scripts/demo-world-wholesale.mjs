/**
 * B-12 safe in-memory world wholesale line-3 read/turn/write demonstration.
 * This is NOT Core DataCommitOrAbort or a real-world persistence operation.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStandardStreetModel } from '../src/standard-street-model.mjs';
import {
  readWorldWholesaleSnapshot, writeWorldWholesaleSnapshot,
  serializeWorldWholesaleLine,
} from '../src/world-wholesale-codec.mjs';
import { projectReviewedWholesaleTurnItem } from '../src/wholesale-turn-model.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [items, rebels, config]=await Promise.all([
  'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi','_config.cgi',
].map(p=>readFile(path.join(root,p),'utf8')));
if (!/\$MAX_USER\s*=\s*50\s*;/.test(config)) {
  throw new Error('Source MAX_USER changed; review example');
}
const model=loadStandardStreetModel(items, rebels);
const stock=Array(model.maxItem).fill(0);
stock[9]=3; // reviewed PLUS #10 book-make

// Explicit synthetic world text, not read from the real game.
const original=[
  '1699999999',
  '100000,4,0,10,2',
  serializeWorldWholesaleLine(stock),
  '', 'opaque-town', '//',
  'opaque-shop-metadata', 'opaque-shop-items',
  '',
].join('\n');
const parsed=readWorldWholesaleSnapshot(original);
const shops=[{item:Array(model.maxItem).fill(0)},{item:Array(model.maxItem).fill(0)}];
const projection=projectReviewedWholesaleTurnItem(model,parsed.stock,shops,{
  itemId:10,timespanSeconds:600,population:100000,maxUsers:50,
  random:()=>0,
});
const rewritten=writeWorldWholesaleSnapshot(original,projection.worldStock);
const restored=readWorldWholesaleSnapshot(rewritten);
const outsideStockLinePreserved=original.split('\n').every((line,i)=>
  i===2 || rewritten.split('\n')[i]===line,
);
console.log(JSON.stringify({
  mode:'in-memory original world line-3 CSV subset, no disk files or CGI',
  sourcePosition:'Core DataRead/Write third line after lasttime + metadata',
  originalStock10:parsed.stock[9],
  turnover:projection.receipt,
  restoredStock10:restored.stock[9],
  otherWorldSectionsUnchanged:outsideStockLinePreserved,
  unchangedSourceSnapshot:readWorldWholesaleSnapshot(original).stock[9]===3,
  stockCellCount:rewritten.split('\n')[2].split(',').length,
  restrictions:[
    'synthetic complete world text; never the real world file',
    'all other world data stays opaque and unchanged',
    'no commit/lock/authentication or full DataRead/DataWrite invocation',
  ],
},null,2));
