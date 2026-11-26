/** Frozen layered zh_TW dictionary for source commerce log messages.
 * Actual original custom/inc-locale.cgi loads program/locale then
 * akimono/locale. This reviewer grants no locale or command authority. */
import {createHash} from 'node:crypto';
const pins={coreLocaleSource:'a512f6887cee214e66828769a382ad2b18bcd5b3',
  localLocaleSource:'0504de7384a45b3fcf11003e0c5b984e638846b4',
  localeLoaderSource:'07bb5811272d6243ba1c8f5317a44fe234f7ad36'};
const reviews=new WeakSet();
const fail=s=>{throw new RangeError('R4 commerce locale: '+s)};
export const isReviewedCommerceLocale=r=>reviews.has(r);
export function reviewOriginalCommerceLocale(sources){
  for(const [key,sha] of Object.entries(pins)){
    const s=sources[key];
    if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+key);
  }
  const keys={
    '%1より%2を%3@%4(計%5)':'購買%1的%2%3@%4(合計%5)',
    'にて仕入れました':'購買於','にて雇いました':'雇用於','%1消費':'消費時間%1',
    '時間':'小時','市場':'市場','分':'分','秒':'秒','日':'日',
    '棚%1に%2を%3で陳列しました。':'將%2%3陳列在展示架%1上了。',
    '棚%1への陳列をやめました。':'從展示架%1下架了。',
  };
  for(const [id,value] of Object.entries(keys)){
    const marker='msgid '+JSON.stringify(id)+'\n';
    const expected=marker+'msgstr '+JSON.stringify(value)+'\n';
    if(!sources.coreLocaleSource.includes(expected)||
       sources.localLocaleSource.includes(marker)&&!sources.localLocaleSource.includes(expected))
      fail('source translation drift '+id);
  }
  const review=Object.freeze({source:'r4-original-layered-zh-TW-commerce-log.v1',committable:false});
  reviews.add(review);return review;
}
