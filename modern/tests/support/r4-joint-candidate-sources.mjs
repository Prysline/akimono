import {readFileSync} from 'node:fs';
import {createJointSourceProjector} from '../../src/r4-joint-source-projection.mjs';
const load=p=>readFileSync(new URL(p,import.meta.url),'utf8');
export const guildSources={
  buy:load('../original-perl/buy-s.cgi'),calc:load('../original-perl/calc.cgi'),
  item:load('../original-perl/item.cgi'),detail:load('../original-perl/core-detail.cgi'),
  guild:load('../original-perl/pinned-guild.cgi'),
  itemDsl:load('../../../custom/inc-item-data.cgi'),rebelDsl:load('../../../custom/inc-rebel-data.cgi'),
};
export const dragonSources={
  drlog:load('../original-perl/pinned-drlog.cgi'),colock:load('../original-perl/pinned-colock.cgi'),
  lock:load('../original-perl/lock.cgi'),period:load('../original-perl/period.cgi'),
};
export const projectorFor=genesis=>createJointSourceProjector({guildSources,dragonSources,genesis});
