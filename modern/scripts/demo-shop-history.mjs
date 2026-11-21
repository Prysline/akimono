/**
 * B-18 source-reviewed history and lazy user map fixture demonstration.
 * Uses synthetic text only; no real game files, Perl AutoVar, authentication,
 * event callbacks, OS lock, backup or world persistence.
 */
import {parseReviewedShopHistoryWorld} from '../src/world-shop-history-model.mjs';
import {parseReviewedOneShopWorld} from '../src/world-one-shop-parser.mjs';

const fields=Array(32).fill('');
Object.assign(fields,{0:'7',1:'0',2:'alice',3:'ShopA',4:'syntheticPass',
  5:'100000',6:'0',7:'0'});
const header=fields.join(',');
const prefix='1700000000\n100000,2,0,10,7\n4,0,3\n\n\n//\n'+header+'\n';
const fixtures=[
  ['reviewed history and two synthetic user map pairs',
    '1,0:50,0:3,0:1,5,3,7:1,2:4,100:alice,1,bob,2'],
  ['history in differing key order',
    '1,0:50,0:3,0:3,7,1,5:1,2:4,100:alice\t1,bob\t2'],
  ['odd history map, Core permits an undefined pair but safe parser rejects',
    '1,0:50,0:3,0:1,5,3:1,2:4,100:alice,1,bob,2'],
  ['duplicate today item ID, Core silently overwrites but safe parser rejects',
    '1,0:50,0:3,0:1,5:1,2,1,9:4,100:alice,1,bob,2'],
  ['odd lazy user map rejected before first AutoVar FETCH',
    '1,0:50,0:3,0:1,5:1,2:4,100:alice,1,bob'],
  ['unexpected user content rejected, never returned',
    '1,0:50,0:3,0:1,5:1,2:4,100:<script>,1'],
];
const cases=fixtures.map(([name,payload])=>{
  const text=prefix+payload+'\n';
  try{
    const result=parseReviewedShopHistoryWorld(text);
    return {
      scenario:name,accepted:true,shopId:result.shop.id,
      yesterday:result.history.itemyesterday,
      today:result.history.itemtoday,
      exp:result.history.exp,
      // Only a count is included. Raw user values and passwords are excluded.
      syntheticUserEntryCount:result.syntheticUserEntryCount,
    };
  }catch(error){
    return {scenario:name,accepted:false,reason:error.message};
  }
});
let oldB17GateRefusesHistory=false;
try{parseReviewedOneShopWorld(prefix+fixtures[0][1]+'\n');}
catch(error){oldB17GateRefusesHistory=/Unreviewed Core shop payload/.test(error.message);}
if(!oldB17GateRefusesHistory)throw Error('B-17 historic strict gate was weakened');
console.log(JSON.stringify({
  mode:'synthetic, source-reviewed B-18 history and user delimiter projection',
  source:'frozen inc-func.cgi DataRead, AutoVar TIESCALAR/FETCH and DataWrite',
  oldB17GateRefusesHistory,cases,
  limitations:[
    'only one synthetic shop and safe item-ID/count history pairs',
    'user names and values never returned, no login or authentication',
    'no real AutoVar execution in this Node demo',
    'no event require, dynamic town, live game files, lock or commit',
  ],
},null,2));
