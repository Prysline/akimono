/**
 * B-31: one reproducible memory-only WorldState command sequence.
 * This is a contract sample, NOT a game with persistence, auth, events,
 * shops interacting or a playable browser interface.
 */
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {
  createMemoryWorld,createMemoryWorldAdapter,
  executeMemoryCommand,encodeMemorySnapshot,
} from '../src/game-core-contract.mjs';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [itemDsl,rebelDsl]=await Promise.all([
  'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
].map(p=>readFile(path.join(root,p),'utf8')));
const streetModule=createStandardStreetModule({itemDsl,rebelDsl});
const repository=createMemoryWorldAdapter(createMemoryWorld({
  worldId:'synthetic-b31-world',streetId:'standard-street',nowSeconds:1000000,
}));
const created=executeMemoryCommand({
  repository,streetModule,
  command:{
    kind:'open-shop',expectedRevision:0,shopId:1,
    ownerName:'示範店主',shopName:'標準街記憶體測試店',
  },
});
if(!created.ok)throw new Error('Unexpected fixture open-shop rejection');
const showcased=executeMemoryCommand({
  repository,streetModule,
  command:{kind:'edit-showcase',expectedRevision:1,shopId:1,
    shelf:0,itemId:79,per:100},
});
if(!showcased.ok)throw new Error('Unexpected fixture showcase rejection');
const notImplemented=executeMemoryCommand({
  repository,streetModule,
  command:{kind:'market-sale',expectedRevision:2,shopId:1},
});
const stale=executeMemoryCommand({
  repository,streetModule,
  command:{kind:'edit-showcase',expectedRevision:0,shopId:1,
    shelf:0,itemId:79},
});
const final=repository.read();
console.log(JSON.stringify({
  source:'Source-reviewed Core new.cgi/sc-s.cgi and frozen Standard Street DSL subset',
  scope:'synthetic in-memory contract only; market/events NULL; no real storage, HTTP, auth, callback compilation, market sale, periods or player trade',
  supported:streetModule.capabilities,
  actions:[
    {ok:created.ok,code:created.code,receipt:created.details},
    {ok:showcased.ok,code:showcased.code,receipt:showcased.details},
    {ok:notImplemented.ok,code:notImplemented.code},
    {ok:stale.ok,code:stale.code},
  ],
  final:{
    schema:final.schema,revision:final.revision,worldId:final.worldId,
    shopCount:final.shops.length,
    money:final.shops[0].money,
    time:final.shops[0].time,
    remainingTimeSeconds:final.nowSeconds-final.shops[0].time,
    showcase:final.shops[0].showcase,price:final.shops[0].price,
    market:final.market,events:final.events,
    snapshotBytes:Buffer.byteLength(encodeMemorySnapshot(final),'utf8'),
  },
},null,2));
