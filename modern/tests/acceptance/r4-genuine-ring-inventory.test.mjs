/** Genuine 50-ring inventory on the combined R4 runtime. This is the
 * original palace quantity, without forcing the randomly selected task. */
import test from 'node:test';
import {highForge} from '../support/p3-high-forge.mjs';
test('R4 actual player: fifty #68 rings via source #66/1 and two v2 saves on combined runtime',{timeout:1800000},async t=>highForge(t,66,{missionRingCount:50}));
