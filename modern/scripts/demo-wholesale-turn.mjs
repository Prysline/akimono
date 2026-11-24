/**
 * Deterministic single-item wholesale PLUS lifecycle demonstration.
 * Run in modern/: npm run demo:turn-wholesale
 * This is NOT a full inc-turn.cgi or a world file transaction.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStandardStreetModel } from '../src/standard-street-model.mjs';
import {
  listReviewedWholesalePlusItems, projectReviewedWholesaleTurnItem,
} from '../src/wholesale-turn-model.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [itemDsl,rebelDsl,config]=await Promise.all([
  'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi','_config.cgi',
].map(f=>readFile(path.join(root,f),'utf8')));
if (!/\$MAX_USER\s*=\s*50\s*;/.test(config)) {
  throw new Error('Configured MAX_USER differs from reviewed fixture 50');
}
const model=loadStandardStreetModel(itemDsl,rebelDsl);
const empty=()=>Array(model.maxItem).fill(0);
const makeShops=()=>[{item:empty()},{item:empty()}];

function example(itemId,initialStock,held=0) {
  const world=empty();
  world[itemId-1]=initialStock;
  const shops=makeShops();
  shops[0].item[itemId-1]=held;
  const projected=projectReviewedWholesaleTurnItem(model,world,shops,{
    itemId,timespanSeconds:600,population:100000,maxUsers:50,
    random:()=>0, // injected zero for reproducible two-stage Core RNG
  });
  return {
    itemId, initialStock, held,
    newStock:projected.worldStock[itemId-1],
    originalInputsUnchanged:
      world[itemId-1]===initialStock &&
      shops[0].item[itemId-1]===held,
    receipt:projected.receipt,
  };
}

console.log(JSON.stringify({
  mode:'one-item post-settlement wholesale PLUS projection; no CGI or world persistence',
  inputs:{
    timespanSeconds:600,population:100000,maxUsers:50,shopCount:2,
    random:'fixed unit draw 0',
    world:'synthetic per-item initial stock, not automatically generated',
  },
  auditedSourceItems:listReviewedWholesalePlusItems(model),
  examples:[
    example(10,3), // positive PLUS 20m -> 5 after 2 new units
    example(1,5),  // negative PLUS -20m -> 3 after 2 lost units
    example(40,5), // negative PLUS -1h -> 4, uses second RNG draw
    example(10,5,17), // capped at market remainder 3
  ],
  excluded:[
    'automatic sales and callbacks before PLUS',
    'cross-item turn order and random consumption',
    'period settlement, rankings, events',
    'arbitrary PLUS/GetTime macros',
    'world-file writes and real CGI commit',
  ],
},null,2));
