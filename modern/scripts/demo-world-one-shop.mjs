/**
 * B-17 source-reviewed, READ-ONLY synthetic one-shop world demo.
 * No actual world file, original Perl, OS lock, backup, CGI or commit.
 */
import {parseReviewedOneShopWorld} from '../src/world-one-shop-parser.mjs';
import {parseIsolatedWorldReadEnvelope} from '../src/world-read-preflight.mjs';

const header=Array(32).fill('');
Object.assign(header,{0:'7',1:'0',2:'alice',3:'ShopA',4:'syntheticPass',
  5:'100000',6:'0',7:'0'});
const record=header.join(',')+'\n1,0:50,0:3,0::::';
const sourcePrefix='1700000000\n100000,2,0,10,7\n4,0,3\n\n';
const full=sourcePrefix+'\n//\n'+record+'\n'; // reviewed empty town line
const cases=[
  ['one isolated shop, empty town',full],
  ['one isolated shop, no town line',sourcePrefix+'//\n'+record+'\n'],
  ['dynamic event requiring code',full.replace('\n\n\n//','\n8,1\n\n//')],
  ['unknown town fields',full.replace('\n\n//','\ncity,opaque\n//')],
  ['second shop',full+record+'\n'],
  ['truncated shop payload',sourcePrefix+'\n//\n'+header.join(',')+'\n'],
  ['shop user section (unreviewed)',full.replace('3,0::::','3,0:::::user')],
];
let b16Refused=false;
try { parseIsolatedWorldReadEnvelope(full); }
catch(error) { b16Refused=/Dynamic town\/shop/.test(error.message); }
if(!b16Refused) throw Error('Existing five-line B-16 gate was weakened');

const scenarios=cases.map(([name,text])=>{
  try{
    const value=parseReviewedOneShopWorld(text);
    return {
      scenario:name,acceptedInOneShopSubset:true,
      shopCount:value.shopCount,shopId:value.shop.id,
      displayName:value.shop.shopname,
      displaySlots:value.shop.showcase.length,
      stock0:value.shop.inventory[0],
      delimiterLine:value.delimiterLine,
      scope:value.scope,
    };
  }catch(error){
    return {scenario:name,acceptedInOneShopSubset:false,reason:error.message};
  }
});
console.log(JSON.stringify({
  mode:'source-audited synthetic one-shop structure, read-only',
  fixedCore:'inc-func.cgi::DataRead and plug/write.cgi::DataWrite',
  baselineFiveLineParserStillRejectsShop:b16Refused,
  scenarios,
  limitations:[
    'only eight selected nonempty shop header fields and three numeric payload lists',
    'event require, town AutoVar, shop user map and real callbacks not executed',
    'no disk reads, live world, authentication, lock, backup or commit',
    'original Core can accept incomplete and duplicate shop records; safe subset refuses',
  ],
},null,2));
