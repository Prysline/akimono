/**
 * B-32 source-Perl-verified, synthetic A/B/C fixture ONLY.
 * This demonstration does not run real Standard Street item 1/2/3,
 * no CGI, no authorization, no real storage, no disk I/O.
 */
import {
  createMemoryWorldAdapter,executeMemoryCommand,encodeMemorySnapshot,
} from '../src/game-core-contract.mjs';
import {
  createReviewedUseFixtureWorld,createReviewedUseFixtureStreetModule,
} from '../src/reviewed-use-fixture-street.mjs';

const store=createMemoryWorldAdapter(createReviewedUseFixtureWorld());
const module=createReviewedUseFixtureStreetModule();
function use(rev,requestedCount=1,opts={}){
  return executeMemoryCommand({
    repository:store,streetModule:module,
    command:{
      kind:'source-fixture-use',
      expectedRevision:rev,shopId:42,
      requestedCount,param1:1000,
      perlRandBucket:100, // explicitly controlled synthetic integer draw
      ...opts,
    },
  });
}
const first=use(0),second=use(1);
if(!first.ok||!second.ok)
  throw new Error('Unexpected reviewed synthetic Core fixture rejection');
const stale=use(0);
const unsupported=executeMemoryCommand({
  repository:store,streetModule:module,
  command:{kind:'market-sale',expectedRevision:2,shopId:42},
});
const final=store.read();
console.log(JSON.stringify({
  boundary:'synthetic fixture products A/B/C, NOT real original Standard Street items; source-reviewed Core + lostbook, no real CGI, persistence, user auth, random generator, market sale, events or playable UI',
  transactions:[first,second].map(x=>({
    ok:x.ok,code:x.code,revision:x.world.revision,
    money:x.world.shops[0].money,time:x.world.shops[0].time,
    exp:x.world.shops[0].exp,paytoday:x.world.shops[0].paytoday,
    inventory:x.world.shops[0].item,
    wholesale:x.world.market.wholesale,
    sourceTrace:x.details.sourceTrace,
  })),
  stale:{ok:stale.ok,code:stale.code},
  unsupported:{ok:unsupported.ok,code:unsupported.code},
  final:{
    revision:final.revision,stock:final.shops[0].item,
    money:final.shops[0].money,time:final.shops[0].time,
    exp:final.shops[0].exp,paytoday:final.shops[0].paytoday,
    wholesale:final.market.wholesale,
    snapshotBytes:Buffer.byteLength(encodeMemorySnapshot(final),'utf8'),
  },
},null,2));
