/**
 * B-16 isolated, read-only Core DataRead envelope preflight demonstration.
 *
 * All text and byte counts are synthetic. No real game data, disk reads,
 * Perl callbacks, CGI HTTP, store data, locks or writes are performed.
 */
import {
  parseIsolatedWorldReadEnvelope,reviewIsolatedWorldRead,
} from '../src/world-read-preflight.mjs';

const healthy='1700000000\n100000,2,0,10,7\n4,0,3\n\n//\n';
const cases=[
  ['minimal complete world',healthy],
  ['truncated: missing //',healthy.replace('//\n','')],
  ['damaged stock number',healthy.replace('4,0,3','4,bad,3')],
  ['wrong population',healthy.replace('100000,2','unknown,2')],
  ['CRLF sentinel',healthy.replace('//\n','//\r\n')],
  ['unreviewed dynamic event',healthy.replace('\n\n//','\n9,1\n//')],
  ['unreviewed shop records',healthy+'1,shop\nopaque\n'],
];
const scenarios=cases.map(([name,worldText])=>{
  try {
    const bytes=Buffer.byteLength(worldText);
    const result=reviewIsolatedWorldRead({
      readSucceeded:true,sourceSizeBytes:bytes,
      observedBytesRead:bytes,worldText,
    });
    return {
      name,acceptedInIsolatedSubset:result.allowIsolatedInspection,
      items:result.envelope.worldStock.length,
      item1:result.envelope.worldStock[0],
      suppliedStockSlots:result.envelope.originalStockSlots,
      scope:result.scope,
    };
  } catch(err) {
    return {name,acceptedInIsolatedSubset:false,reason:err.message};
  }
});
const partialRead=(()=>{
  try {
    reviewIsolatedWorldRead({
      readSucceeded:true,sourceSizeBytes:Buffer.byteLength(healthy),
      observedBytesRead:Buffer.byteLength(healthy)-1,worldText:healthy,
    });
    throw new Error('Partial input unexpectedly accepted');
  } catch(err) {
    if (/unexpectedly accepted/.test(err.message)) throw err;
    return {acceptedInIsolatedSubset:false,reason:err.message};
  }
})();
console.log(JSON.stringify({
  mode:'synthetic, read-only, five-line original DataRead subset preflight',
  source:'frozen Core inc-func.cgi::DataRead, exact // required',
  scenarios,partialRead,
  limits:[
    'not a full world-file parser and cannot authorize live writes',
    'dynamic events, town data and shop data intentionally rejected',
    'does not execute original Perl, AutoVar, event require or CGI',
    'no real open/read/stat, lock, backup or persistent commit',
  ],
},null,2));
